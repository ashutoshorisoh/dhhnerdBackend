const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
    track_name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['album', 'single', 'ep', 'mixtape'],
        required: true
    },
    image_link: String,
    spotify_link: {
        type: String,
        required: true,
        unique: true // To prevent duplicates
    },
    main_artist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'artist',
        required: true
    },
    featured_artists: [{
        artist: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'artist'
        },
        name: String,
        spotify_id: String
    }],
    release_date: {
        type: Date,
        required: true
    },
    ratings: {
        average: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        },
        by_users: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user'
            },
            rating: Number
        }]
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        },
        text: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    last_updated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add compound index to prevent duplicates based on track name, artist, and release date
trackSchema.index(
    { 
        track_name: 1, 
        main_artist: 1, 
        release_date: 1 
    }, 
    { 
        unique: true,
        name: 'unique_track_constraint'
    }
);

module.exports = mongoose.model('track', trackSchema); 