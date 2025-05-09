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

///////////////////////////////////////

const axios = require('axios');


app.use(express.json());

// API Route: Fetch log count from Graylog
app.get('/api/log-count', async (req, res) => {
    try {
        // Graylog server configuration
        const graylogUrl = "http://192.168.1.68:9000/api/search/universal/absolute";

        // Generate timestamps for the last 10 seconds
        const now = new Date();
        const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
        const tenSecondsAgo = new Date(fiveHoursAgo.getTime() + 10 * 1000); // 10 seconds after 5 hours ago

        const from = fiveHoursAgo.toISOString(); // From 5 hours ago
        const to = now.toISOString(); // To current time

        // Query parameters
        const queryParams = {
            query: "*",
            from: from,
            to: to,
            limit: 0, // Only fetch the total count
            filter: "streams:67c7e72cb78cd271d6481222"
        };

        console.log("Fetching logs with parameters:", queryParams);

        // Make the request to Graylog
        const response = await axios.get(graylogUrl, {
            auth: { username: "admin", password: "Virtual%09" }, // Update with correct credentials
            params: queryParams,
            headers: { Accept: "application/json" }
        });

        // Extract total log count
        const totalLogCount = response.data.total_results || 0;
        res.json({ totalLogCount }); // Return total log count as JSON
    } catch (error) {
        console.error("Error fetching logs:", error.message);

        if (error.response) {
            console.error("Response Status:", error.response.status);
            console.error("Response Headers:", error.response.headers);
            console.error("Response Data:", error.response.data);
        } else {
            console.error("No response received from Graylog.");
        }

        res.status(500).json({ error: "Failed to fetch logs" }); // Ensure error response is JSON
    }
});

// Serve static files from the frontend directory
app.use(express.static('frontend'));


/////////////////////////////////////
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