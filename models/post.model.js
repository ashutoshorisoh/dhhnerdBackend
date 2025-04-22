const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  caption: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String, // Optional: Only if your posts have images
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',   // Assuming you have a User model
    required: true,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // List of Users who liked the post
    }
  ],
  comments: [
    {
      text: {
        type: String,
        required: true,
      },
      commentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Who commented
        required: true,
      },
      commentedAt: {
        type: Date,
        default: Date.now,
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Post', postSchema);
