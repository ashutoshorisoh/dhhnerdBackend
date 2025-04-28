const Artist = require('../models/artists.model.js');
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
  const token = await getSpotifyToken(); // Get valid Bearer token

  const tracksPerRequest = 50; // Max allowed in one request
  const batchedRequests = [];

  // Batch artist IDs into groups of 50
  for (let i = 0; i < artistIds.length; i += tracksPerRequest) {
    const batch = artistIds.slice(i, i + tracksPerRequest);
    batchedRequests.push(batch);
  }

  let allTracks = []; // To store all fetched tracks

  // Loop through each batch and fetch data
  for (const batch of batchedRequests) {
    try {
      const response = await axios.get(`https://api.spotify.com/v1/artists/${batch.join(',')}/top-tracks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          country: 'US', // You can change this based on your requirement
        }
      });

      // Push the tracks to the allTracks array
      allTracks = allTracks.concat(response.data.tracks);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  }

  return allTracks;
}

// Route handler to fetch artist data (latest tracks)
exports.getArtistTracks = async (req, res) => {
  try {
    // Get artist IDs from MongoDB
    const artists = await Artist.find({}); // Fetch all artists (or add conditions as needed)
    const artistIds = artists.map(artist => artist.spotify_id); // Extract Spotify IDs

    // Fetch Spotify data for the artists
    const tracks = await fetchSpotifyData(artistIds);

    // Send the tracks in the response
    res.status(200).json({
      message: 'Fetched artist tracks successfully',
      tracks
    });
  } catch (error) {
    console.error('Error fetching artist tracks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
