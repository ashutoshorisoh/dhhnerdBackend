import Post from '../models/post.model.js';  // Make sure your model export is correct

// Create a new Post
export const createPost = async (req, res) => {
  try {
    const { caption, imageUrl } = req.body;
    const userId = req.user._id;  // Assuming you have user authentication middleware

    const newPost = new Post({
      caption,
      imageUrl,
      createdBy: userId,
    });

    await newPost.save();

    res.status(201).json({ message: 'Post created successfully', post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Like a post
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Prevent duplicate likes
    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      await post.save();
    }

    res.status(200).json({ message: 'Post liked' });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Comment on a post
export const commentPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({
      text,
      commentedBy: userId,
    });

    await post.save();

    res.status(200).json({ message: 'Comment added', post });
  } catch (error) {
    console.error('Error commenting on post:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Fetch all posts
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('createdBy', 'username')  // Populating createdBy user field
      .populate('likes', 'username')      // Populating likes
      .populate('comments.commentedBy', 'username') // Populating comments
      .sort({ createdAt: -1 }); // Latest posts first

    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
