const cron = require('node-cron');
const Artist = require('../models/artists.model');
const Track = require('../models/track.model');
const axios = require('axios');
const getSpotifyToken = require('../spotify-app/getSpotifytoken.js');

// Function to chunk array into groups of n
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

// Function to fetch tracks for a group of artists
async function fetchTracksForArtists(artistIds) {
    try {
        console.log('Getting Spotify token...');
        const token = await getSpotifyToken();
        console.log('Spotify token received successfully');
        let newlyAddedTracks = [];

        for (const artistId of artistIds) {
            try {
                console.log(`\nProcessing artist ID: ${artistId}`);
                const artist = await Artist.findOne({ spotify_id: artistId });
                if (!artist) {
                    console.log(`Artist not found in database: ${artistId}`);
                    continue;
                }

                console.log(`Found artist in database: ${artist.name} (${artistId})`);

                // Get artist's albums from Spotify
                console.log(`Fetching albums from Spotify for ${artist.name}...`);
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

                    for (const item of albumsResponse.data.items) {
                        console.log(`\nProcessing item: ${item.name} (${item.album_type})`);
                        
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
                                        let dbArtist = await Artist.findOne({ spotify_id: featArtist.id });
                                        
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
                        }
                    }
                } else {
                    console.log(`No items found for artist ${artist.name}`);
                }
            } catch (error) {
                console.error(`Error processing artist ${artistId}:`, error.message);
                if (error.response) {
                    console.error('Spotify API Response:', error.response.data);
                }
                continue;
            }
        }

        console.log(`\nTotal newly added tracks: ${newlyAddedTracks.length}`);
        return newlyAddedTracks;
    } catch (error) {
        console.error('Error in fetchTracksForArtists:', error);
        throw error;
    }
}

// Function to update all artists' tracks
async function updateAllArtistsTracks() {
    try {
        console.log('\n=== Starting daily track update ===');
        
        // Get all artists
        const artists = await Artist.find({});
        console.log(`Found ${artists.length} artists in database`);
        
        if (!artists || artists.length === 0) {
            console.log('No artists found in database');
            return;
        }

        // Get all artist IDs
        const artistIds = artists.map(artist => artist.spotify_id);
        console.log('Artist IDs:', artistIds);
        
        // Split into chunks of 50
        const artistChunks = chunkArray(artistIds, 50);
        console.log(`Split into ${artistChunks.length} chunks`);
        
        // Process each chunk
        for (const chunk of artistChunks) {
            console.log(`\nProcessing chunk of ${chunk.length} artists...`);
            await fetchTracksForArtists(chunk);
        }

        console.log('\n=== Daily track update completed successfully ===');
    } catch (error) {
        console.error('Error in updateAllArtistsTracks:', error);
    }
}

// Schedule the task to run at 00:05 AM every day
cron.schedule('5 0 * * *', async () => {
    console.log('\n=== Running scheduled track update ===');
    await updateAllArtistsTracks();
});

// Export the update function for manual triggering if needed
module.exports = {
    updateAllArtistsTracks
}; 