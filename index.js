// Load environment variables first
require('dotenv').config();

// Debug log to check environment variables
console.log('Environment Variables Check:', {
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'exists' : 'missing',
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'exists' : 'missing',
  MONGO_URI: process.env.MONGO_URI ? 'exists' : 'missing',
  PORT: process.env.PORT || '5000 (default)'
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');  // For cross-origin requests
const authRoutes = require('./routes/authRoutes.js'); // Fixed import
const postRoutes = require('./routes/postRoute')
const artistRoutes = require('./routes/artistRoute.js')
require('./utils/scheduler'); // Import the scheduler

const app = express();

// Middleware to parse JSON data from the request body
app.use(express.json());

// Enable CORS (if needed, adjust based on your use case)
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.log('MongoDB connection error: ', err));

// Use routes (add the necessary route files)
app.use('/auth', authRoutes); // Auth routes (login, register, etc.)

app.use('/post', postRoutes)

app.use('/artist', artistRoutes);

// Example of another route (you will add more later as needed)
app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// Define a port and start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
