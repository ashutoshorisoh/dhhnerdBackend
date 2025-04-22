const express = require('express');
const { login, register, resetPassword, forgotPassword, verifyResetToken } = require('../controllers/authController');

const router = express.Router();

// POST /login
router.post('/login', login);

// POST /register
router.post('/register', register);

// POST /resetpassword
router.post('/resetpassword', resetPassword);

// GET /verify-reset-token/:token
router.get('/verify-reset-token/:token', verifyResetToken);

// POST /forgotpassword - use the controller directly
router.post('/forgotpassword', forgotPassword);

module.exports = router;