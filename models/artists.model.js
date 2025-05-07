const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    spotify_id: {
        type: String,
        required: true
    },
    tracks: [{
        track_name: String,
        category: String, // album, single, or ep
        image_link: String,
        spotify_link: String,
        featured_artists: [{
            name: String,
            spotify_id: String
        }],
        release_date: String
    }]
});

module.exports = mongoose.model('artist', artistSchema);
