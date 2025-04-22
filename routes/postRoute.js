const express = require('express');
const { createPost, likePost, commentPost, getAllPosts } = require('../controllers/postController');
const { verifyToken } = require('../middlewares/authMiddleware');
const router = express.Router();

// Routes
router.post('/create', verifyToken, createPost);
router.post('/like/:postId', verifyToken, likePost);
router.post('/comment/:postId', verifyToken, commentPost);
router.get('/', getAllPosts);

module.exports = router;
