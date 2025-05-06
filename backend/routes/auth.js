const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    // Create JWT token
    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // Token expires in 8 hours
    );
    
    // Set HTTP-only cookie with the token
    res.cookie('token', token, {
      httpOnly: true, // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours in milliseconds
    });
    
    res.json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: "Logout successful" });
});

// Check authentication status
router.get('/check', (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.json({ authenticated: false });
  }
  
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true });
  } catch (error) {
    res.clearCookie('token');
    res.json({ authenticated: false });
  }
});

module.exports = router;