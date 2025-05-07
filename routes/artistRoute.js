// routes/artist.routes.js
const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artist.controller.js');

// POST /api/artists → Add a new artist
router.post('/create', artistController.createArtist);

router.get('/tracks', artistController.getArtistTracks);

// Route for fetching artist details
router.get('/details', artistController.getArtistDetails);

// Route to keep only Divine
router.get('/keep-only-divine', artistController.keepOnlyDivine);

// Route to clear tracks database
router.post('/clear-tracks', artistController.clearTracks);

// Route to get newly added tracks
router.get('/new-tracks', artistController.getNewTracks);

// Route to search tracks by artist name
router.get('/search-tracks', artistController.searchTracksByArtist);

// Route to manually trigger track update
router.post('/trigger-update', artistController.triggerTrackUpdate);

// Routes for ratings and reviews
router.post('/track/rate', artistController.addRatingAndReview);
router.get('/track/:trackId/ratings', artistController.getTrackRatingsAndReviews);

module.exports = router;
