const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const adminRoutes = require('./routes/admin');
const { authMiddleware } = require('./middleware/auth');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 7000;
// Security middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:7000', // Restrict to your domain
  credentials: true // Allow cookies to be sent
}));
// Parse JSON bodies and cookies
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes); // Protected route
app.use('/api/admin', authMiddleware, adminRoutes); // Protected route for client management
// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/scripts', express.static(path.join(__dirname, '../frontend/scripts')));
app.use('/styles', express.static(path.join(__dirname, '../frontend/styles')));
// Route all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;