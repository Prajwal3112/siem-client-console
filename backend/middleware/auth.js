const jwt = require('jsonwebtoken');
require('dotenv').config();
const authMiddleware = (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies.token;    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;    
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid authentication' });
  }
};
module.exports = { authMiddleware };