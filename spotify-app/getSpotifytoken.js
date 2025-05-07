// getSpotifyToken.js
const axios = require('axios');
const qs = require('qs');

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

// Debug log to check if credentials are loaded
console.log('Spotify Credentials Check:', {
  client_id_exists: !!client_id,
  client_secret_exists: !!client_secret,
  client_id_length: client_id?.length,
  client_secret_length: client_secret?.length
});

let spotifyToken = null;
let tokenExpiryTime = null;

// Private: fetch a new token
async function fetchNewSpotifyToken() {
  try {
    console.log('Attempting to fetch new Spotify token...');
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const headers = {
      'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    const data = qs.stringify({ grant_type: 'client_credentials' });

    console.log('Making token request with headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': headers['Authorization'].substring(0, 20) + '...' // Log partial auth header for security
    });

    const response = await axios.post(tokenUrl, data, { headers });
    console.log('Token request successful');

    spotifyToken = response.data.access_token;
    const expiresIn = response.data.expires_in; // in seconds
    tokenExpiryTime = Date.now() + (expiresIn * 1000) - (60 * 1000); // 1 min earlier
    
    return spotifyToken;
  } catch (error) {
    console.error('Error fetching Spotify token:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
}

// Public: get token (reusing or fetching new)
async function getSpotifyToken() {
  try {
    if (!spotifyToken || Date.now() >= tokenExpiryTime) {
      console.log('Token expired or not present, fetching new token...');
      await fetchNewSpotifyToken();
    } else {
      console.log('Using existing token');
    }
    return spotifyToken;
  } catch (error) {
    console.error('Error in getSpotifyToken:', error);
    throw error;
  }
}

module.exports = getSpotifyToken;
