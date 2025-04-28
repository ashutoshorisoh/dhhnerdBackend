const axios = require('axios');
const getSpotifyToken = require('./getSpotifytoken.js'); // Importing the token function
const mongoose = require('mongoose');
const Artist = require('../models/artists.model.js'); // Import the Artist model

// Function to fetch the latest tracks for an artist
async function fetchSpotifyData() {
  const token = await getSpotifyToken(); // Get valid Bearer token

  // Get artist IDs from MongoDB
  const artists = await Artist.find({}); // Fetch all artists (or add conditions as needed)
  const artistIds = artists.map(artist => artist.spotify_id); // Extract Spotify IDs

  const tracksPerRequest = 50; // Max allowed in one request
  const batchedRequests = [];

  // Batch artist IDs into groups of 50
  for (let i = 0; i < artistIds.length; i += tracksPerRequest) {
    const batch = artistIds.slice(i, i + tracksPerRequest);
    batchedRequests.push(batch);
  }

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

      // Log the response or the latest tracks for each artist
      console.log('Fetched tracks:', response.data);
      
      // For example, if you just want to see the track names:
      response.data.tracks.forEach(track => {
        console.log(`Track: ${track.name}`);
      });
      
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  }
}

// Call the function to fetch and log artist tracks
fetchSpotifyData();
