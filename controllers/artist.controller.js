const Artist = require('../models/artists.model');
const Track = require('../models/track.model');
const User = require('../models/user.model');
const axios = require('axios');
const getSpotifyToken = require('../spotify-app/getSpotifytoken.js'); // Importing the token function

// Create new artist
exports.createArtist = async (req, res) => {
  try {
    let { name, spotify_id } = req.body;

    if (!name || !spotify_id) {
      return res.status(400).json({ message: 'Name and Spotify ID are required.' });
    }

    // Check if the spotify_id is a URL and extract the actual ID
    const spotifyIdRegex = /^https:\/\/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)$/;
    const match = spotify_id.match(spotifyIdRegex);

    if (match) {
      // If it's a URL, extract the actual Spotify ID
      spotify_id = match[1];
    }

    // Now proceed to create the artist
    const newArtist = new Artist({
      name,
      spotify_id
    });

    await newArtist.save();

    res.status(201).json({ message: 'Artist created successfully', artist: newArtist });
  } catch (error) {
    console.error('Error creating artist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Function to fetch Spotify data for artists (latest tracks)
async function fetchSpotifyData(artistIds) {
  try {
    console.log('Getting Spotify token...');
    const token = await getSpotifyToken(); // Get valid Bearer token
    console.log('Spotify token received');
    
    let allTracks = []; // To store all fetched tracks

    // Process each artist individually
    for (const artistId of artistIds) {
      try {
        console.log(`Fetching tracks for artist ID: ${artistId}`);
        const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          params: {
            country: 'US',
          }
        });

        if (response.data && response.data.tracks) {
          // Add artist ID to each track for reference
          const tracksWithArtist = response.data.tracks.map(track => ({
            ...track,
            artist_id: artistId
          }));
          allTracks = allTracks.concat(tracksWithArtist);
          console.log(`Successfully fetched ${tracksWithArtist.length} tracks for artist ${artistId}`);
        }
      } catch (error) {
        console.error(`Error fetching tracks for artist ${artistId}:`, {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        // Continue with next artist even if one fails
        continue;
      }
    }

    return allTracks;
  } catch (error) {
    console.error('Error in fetchSpotifyData:', {
      message: error.message,
      stack: error.stack
    });
    throw error; // Re-throw to be caught by the main try-catch
  }
}

// Route handler to fetch artist data (latest tracks)
exports.getArtistTracks = async (req, res) => {
  try {
    console.log('Starting to fetch artist tracks...');
    
    // Get artist IDs from MongoDB
    const artists = await Artist.find({});
    console.log('Found artists in DB:', artists);
    
    if (!artists || artists.length === 0) {
      return res.status(404).json({ message: 'No artists found in database' });
    }

    const artistIds = artists.map(artist => artist.spotify_id);
    console.log('Artist IDs to fetch:', artistIds);
    
    // Fetch Spotify data for the artists
    console.log('Attempting to fetch Spotify data...');
    const tracks = await fetchSpotifyData(artistIds);
    console.log('Spotify data fetched successfully');

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ message: 'No tracks found for the artists' });
    }

    // Send the tracks in the response
    res.status(200).json({
      message: 'Fetched artist tracks successfully',
      tracks
    });
  } catch (error) {
    console.error('Detailed error in getArtistTracks:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
};

// Function to fetch detailed artist data including albums, singles, and EPs
async function fetchArtistDetails(artistIds) {
  try {
    const token = await getSpotifyToken();
    let newlyAddedTracks = []; // Track only newly added tracks

    for (const artistId of artistIds) {
      try {
        // Get artist from database
        const artist = await Artist.findOne({ spotify_id: artistId });
        if (!artist) {
          console.log(`Artist not found in database: ${artistId}`);
          continue;
        }

        console.log(`Processing artist: ${artist.name} (${artistId})`);

        // Get the latest track date for this artist from database
        const latestTrack = await Track.findOne({ main_artist: artist._id })
          .sort({ release_date: -1 })
          .select('release_date');

        // Get artist's albums from Spotify
        const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          params: {
            limit: 50,
            include_groups: 'album,single,ep',
            market: 'US'
          }
        });

        if (albumsResponse.data && albumsResponse.data.items) {
          console.log(`Found ${albumsResponse.data.items.length} items for artist ${artist.name}`);
          
          // Sort items by release date (newest first)
          const sortedItems = albumsResponse.data.items.sort((a, b) => 
            new Date(b.release_date) - new Date(a.release_date)
          );

          // Filter items based on latest track date
          const filteredItems = latestTrack 
            ? sortedItems.filter(item => new Date(item.release_date) > new Date(latestTrack.release_date))
            : sortedItems;

          console.log(`Processing ${filteredItems.length} new items for artist ${artist.name}`);

          for (const item of filteredItems) {
            console.log(`Processing item: ${item.name} (${item.album_type})`);
            
            // Check if track already exists
            const existingTrack = await Track.findOne({ 
              spotify_link: item.external_urls.spotify 
            });
            
            if (!existingTrack) {
              console.log(`Creating new track: ${item.name}`);
              
              // Process featured artists
              const featuredArtists = await Promise.all(
                item.artists
                  .filter(artist => artist.id !== artistId)
                  .map(async (featArtist) => {
                    // Check if featured artist exists in database
                    let dbArtist = await Artist.findOne({ spotify_id: featArtist.id });
                    
                    // If not, create new artist entry
                    if (!dbArtist) {
                      console.log(`Creating new featured artist: ${featArtist.name}`);
                      dbArtist = await Artist.create({
                        name: featArtist.name,
                        spotify_id: featArtist.id
                      });
                    }

                    return {
                      artist: dbArtist._id,
                      name: featArtist.name,
                      spotify_id: featArtist.id
                    };
                  })
              );

              try {
                // Create new track
                const newTrack = await Track.create({
                  track_name: item.name,
                  category: item.album_type,
                  image_link: item.images[0]?.url || null,
                  spotify_link: item.external_urls.spotify,
                  main_artist: artist._id,
                  featured_artists: featuredArtists,
                  release_date: item.release_date,
                  ratings: {
                    average: 0,
                    count: 0,
                    by_users: []
                  },
                  reviews: []
                });
                console.log(`Successfully created track: ${newTrack.track_name}`);
                newlyAddedTracks.push(newTrack);
              } catch (error) {
                console.error(`Error creating track ${item.name}:`, error);
              }
            } else {
              console.log(`Track already exists: ${item.name}`);
              // Check if the release date is newer than what we have in DB
              const existingReleaseDate = new Date(existingTrack.release_date);
              const newReleaseDate = new Date(item.release_date);
              
              if (newReleaseDate > existingReleaseDate) {
                console.log(`Updating existing track: ${item.name}`);
                // Update the existing track with new information
                existingTrack.track_name = item.name;
                existingTrack.category = item.album_type;
                existingTrack.image_link = item.images[0]?.url || null;
                existingTrack.release_date = item.release_date;
                await existingTrack.save();
                
                newlyAddedTracks.push(existingTrack);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching details for artist ${artistId}:`, error.message);
        continue;
      }
    }

    console.log(`Total newly added/updated tracks: ${newlyAddedTracks.length}`);
    return newlyAddedTracks;
  } catch (error) {
    console.error('Error in fetchArtistDetails:', error);
    throw error;
  }
}

// New endpoint to fetch artist details
exports.getArtistDetails = async (req, res) => {
  try {
    console.log('Starting to fetch artist details...');
    
    // Get all artists from the database
    const artists = await Artist.find({});
    console.log('Found artists in database:', artists);
    
    if (!artists || artists.length === 0) {
      console.log('No artists found in database');
      return res.status(404).json({ 
        message: 'No artists found in database. Please add artists first using the /artist/create endpoint.' 
      });
    }

    // Test track creation to ensure collection exists
    try {
      const testTrack = await Track.create({
        track_name: "Test Track",
        category: "single",
        spotify_link: "https://open.spotify.com/test",
        main_artist: artists[0]._id,
        release_date: new Date().toISOString().split('T')[0],
        ratings: {
          average: 0,
          count: 0,
          by_users: []
        },
        reviews: []
      });
      console.log('Test track created successfully:', testTrack);
      // Delete the test track
      await Track.deleteOne({ _id: testTrack._id });
    } catch (error) {
      console.error('Error creating test track:', error);
      return res.status(500).json({
        message: 'Error creating track collection',
        error: error.message
      });
    }

    // Extract Spotify IDs from artists
    const artistIds = artists.map(artist => artist.spotify_id);
    console.log('Extracted artist IDs:', artistIds);
    
    // Limit to 50 artists if more are found
    const limitedArtistIds = artistIds.slice(0, 50);
    console.log('Limited artist IDs:', limitedArtistIds);

    const newlyAddedTracks = await fetchArtistDetails(limitedArtistIds);
    console.log('Newly added tracks:', newlyAddedTracks);

    // Populate artist information for the newly added tracks
    const populatedTracks = await Track.populate(newlyAddedTracks, [
      { path: 'main_artist', select: 'name spotify_id' },
      { path: 'featured_artists.artist', select: 'name spotify_id' }
    ]);

    res.status(200).json({
      message: newlyAddedTracks.length > 0 ? 'New tracks added successfully' : 'No new tracks found',
      data: populatedTracks
    });
  } catch (error) {
    console.error('Error in getArtistDetails:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Function to keep only Divine and remove other artists
exports.keepOnlyDivine = async (req, res) => {
  try {
    // First, find Divine
    const divine = await Artist.findOne({ name: { $regex: /divine/i } });
    
    if (!divine) {
      return res.status(404).json({ message: 'Divine not found in database' });
    }

    // Delete all artists except Divine
    const result = await Artist.deleteMany({ _id: { $ne: divine._id } });
    
    // Delete all tracks except Divine's
    await Track.deleteMany({ main_artist: { $ne: divine._id } });

    res.status(200).json({
      message: 'Kept only Divine and removed other artists',
      divine: divine,
      deletedArtists: result.deletedCount
    });
  } catch (error) {
    console.error('Error in keepOnlyDivine:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Function to clear tracks database
exports.clearTracks = async (req, res) => {
  try {
    // Delete all tracks
    const result = await Track.deleteMany({});
    
    res.status(200).json({
      message: 'Tracks database cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error in clearTracks:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Function to get newly added tracks
exports.getNewTracks = async (req, res) => {
  try {
    const lastCheck = req.query.lastCheck ? new Date(req.query.lastCheck) : new Date(0);
    
    // Get tracks updated since last check
    const newTracks = await Track.find({
      last_updated: { $gt: lastCheck }
    })
    .populate('main_artist', 'name spotify_id')
    .populate('featured_artists.artist', 'name spotify_id')
    .sort({ last_updated: -1 })
    .limit(50);

    res.status(200).json({
      success: true,
      data: newTracks,
      lastCheck: new Date()
    });
  } catch (error) {
    console.error('Error in getNewTracks:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Function to search tracks by artist name
exports.searchTracksByArtist = async (req, res) => {
  try {
    const { artistName } = req.query;
    
    if (!artistName) {
      return res.status(400).json({
        success: false,
        message: 'Artist name is required'
      });
    }

    // Normalize the search query
    const normalizedSearch = artistName.toLowerCase().replace(/\s+/g, '');

    // Find artist by normalized name
    const artist = await Artist.findOne({
      $expr: {
        $eq: [
          { $toLower: { $replaceAll: { input: "$name", find: " ", replacement: "" } } },
          normalizedSearch
        ]
      }
    });

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Find all tracks by this artist (both as main and featured)
    const tracks = await Track.find({
      $or: [
        { main_artist: artist._id },
        { 'featured_artists.artist': artist._id }
      ]
    })
    .populate('main_artist', 'name spotify_id')
    .populate('featured_artists.artist', 'name spotify_id')
    .sort({ release_date: -1 });

    res.status(200).json({
      success: true,
      data: {
        artist: {
          name: artist.name,
          spotify_id: artist.spotify_id
        },
        tracks
      }
    });
  } catch (error) {
    console.error('Error in searchTracksByArtist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Function to manually trigger track update
exports.triggerTrackUpdate = async (req, res) => {
    try {
        console.log('Trigger update endpoint hit');
        const { updateAllArtistsTracks } = require('../utils/scheduler');
        console.log('Manually triggering track update...');
        await updateAllArtistsTracks();
        console.log('Track update completed');
        res.status(200).json({
            success: true,
            message: 'Track update triggered successfully'
        });
    } catch (error) {
        console.error('Error in triggerTrackUpdate:', error);
        res.status(500).json({
            success: false,
            message: 'Error triggering track update',
            error: error.message
        });
    }
};

// Add rating and review to a track
exports.addRatingAndReview = async (req, res) => {
  try {
    const { trackId, userId, rating, review } = req.body;

    // Validate input
    if (!trackId || !userId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Track ID, User ID, and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if track exists
    const track = await Track.findById(trackId);
    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize ratings object if it doesn't exist
    if (!track.ratings) {
      track.ratings = {
        average: 0,
        count: 0,
        by_users: []
      };
    }

    // Check if user has already rated
    const existingRatingIndex = track.ratings.by_users.findIndex(
      r => r.user.toString() === userId
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      track.ratings.by_users[existingRatingIndex].rating = rating;
      if (review) {
        track.ratings.by_users[existingRatingIndex].review = review;
      }
    } else {
      // Add new rating
      track.ratings.by_users.push({
        user: userId,
        rating,
        review: review || '',
        date: new Date()
      });
    }

    // Calculate new average rating
    const totalRatings = track.ratings.by_users.reduce((sum, r) => sum + r.rating, 0);
    track.ratings.average = totalRatings / track.ratings.by_users.length;
    track.ratings.count = track.ratings.by_users.length;

    // Save the track
    await track.save();

    res.status(200).json({
      success: true,
      message: 'Rating and review updated successfully',
      data: {
        track: {
          id: track._id,
          name: track.track_name,
          average_rating: track.ratings.average,
          total_ratings: track.ratings.count,
          user_rating: rating,
          user_review: review
        }
      }
    });
  } catch (error) {
    console.error('Error in addRatingAndReview:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating rating and review',
      error: error.message
    });
  }
};

// Get track ratings and reviews
exports.getTrackRatingsAndReviews = async (req, res) => {
  try {
    const { trackId } = req.params;

    const track = await Track.findById(trackId)
      .populate('ratings.by_users.user', 'username');

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        track_name: track.track_name,
        main_artist: track.main_artist,
        featured_artists: track.featured_artists,
        average_rating: track.ratings?.average || 0,
        total_ratings: track.ratings?.count || 0,
        ratings: track.ratings?.by_users || []
      }
    });
  } catch (error) {
    console.error('Error in getTrackRatingsAndReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ratings and reviews',
      error: error.message
    });
  }
};
