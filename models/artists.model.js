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
    songs: {
        type: String
    }

});

module.exports = mongoose.model('artist', artistSchema);
