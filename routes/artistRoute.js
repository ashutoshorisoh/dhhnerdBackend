// routes/artist.routes.js
const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artist.controller.js');

// POST /api/artists → Add a new artist
router.post('/create', artistController.createArtist);

router.get('/tracks', artistController.getArtistTracks);

module.exports = router;
