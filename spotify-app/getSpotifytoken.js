// getSpotifyToken.js
const axios = require('axios');
const qs = require('qs');

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

let spotifyToken = null;
let tokenExpiryTime = null;

// Private: fetch a new token
async function fetchNewSpotifyToken() {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  const data = qs.stringify({ grant_type: 'client_credentials' });

  const response = await axios.post(tokenUrl, data, { headers });

  spotifyToken = response.data.access_token;
  const expiresIn = response.data.expires_in; // in seconds
  tokenExpiryTime = Date.now() + (expiresIn * 1000) - (60 * 1000); // 1 min earlier
}

// Public: get token (reusing or fetching new)
async function getSpotifyToken() {
  if (!spotifyToken || Date.now() >= tokenExpiryTime) {
    await fetchNewSpotifyToken();
  }
  return spotifyToken;
}

module.exports = getSpotifyToken;
