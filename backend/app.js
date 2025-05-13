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
app.get('/api/log-counts', async (req, res) => {
    try {
        const now = new Date();
        const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
        const tenSecondsAgo = new Date(fiveHoursAgo.getTime() + 10 * 1000); // 10 seconds after 5 hours ago

        const from = fiveHoursAgo.toISOString(); // From 5 hours ago
        const to = now.toISOString(); // To current time

        const logCounts = await Promise.all(
            clients.map(async (client) => {
                const { graylogConfig } = client;

                if (!graylogConfig) {
                    return { clientId: client.id, totalLogCount: 0, error: "Graylog configuration missing" };
                }

                try {
                    const response = await axios.get(graylogConfig.url, {
                        auth: { username: graylogConfig.username, password: graylogConfig.password },
                        params: {
                            query: graylogConfig.query,
                            from: from,
                            to: to,
                            limit: 0, // Only fetch the total count
                            filter: `streams:${graylogConfig.streamId}`
                        },
                        headers: { Accept: "application/json" }
                    });

                    return { clientId: client.id, totalLogCount: response.data.total_results || 0 };
                } catch (error) {
                    console.error(`Error fetching logs for client ${client.name}:`, error.message);
                    return { clientId: client.id, totalLogCount: 0, error: error.message };
                }
            })
        );

        res.json(logCounts);
    } catch (error) {
        console.error("Error fetching log counts:", error.message);
        res.status(500).json({ error: "Failed to fetch log counts" });
    }
});

// Serve static files from the frontend directory
app.use(express.static('frontend'));


/////////////////////////////////////
// Security middleware
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: 'http://localhost:7000', credentials: true }));
app.use(cookieParser(process.env.SESSION_SECRET));

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