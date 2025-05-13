const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Get clients from file
const getClients = () => {
  try {
    const clients = require('../config/clients');
    return clients;
  } catch (error) {
    console.error('Error reading clients:', error);
    return [];
  }
};

// GET all clients - this endpoint is protected by the auth middleware
router.get('/', (req, res) => {
  try {
    const clients = getClients();
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clients' });
  }
});

// GET a specific client by ID
router.get('/:id', (req, res) => {
  try {
    const clients = getClients();
    const client = clients.find(c => c.id === parseInt(req.params.id));   
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }   
    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch client' });
  }
});

// New endpoint to get Graylog logs count for a client
router.get('/:id/logs', async (req, res) => {
  try {
    const clients = getClients();
    const client = clients.find(c => c.id === parseInt(req.params.id));
    
    if (!client || !client.graylog) {
      return res.status(404).json({ success: false, message: 'Client or Graylog config not found' });
    }
    
    const graylog = client.graylog;
    const fromDate = new Date();
    fromDate.setSeconds(fromDate.getSeconds() - 10); // 10 seconds ago
    
    const toDate = new Date(); // now
    
    // Format dates for Graylog API
    const fromFormatted = fromDate.toISOString();
    const toFormatted = toDate.toISOString();
    
    // Build URL for Graylog API request
    const apiUrl = `http://${graylog.host}/api/search/universal/absolute?query=*&from=${fromFormatted}&to=${toFormatted}&limit=0&filter=streams:${graylog.streamId}`;
    
    // Create auth header
    const auth = Buffer.from(`${graylog.username}:${graylog.password}`).toString('base64');
    
    // Make the HTTP request to Graylog
    const requestOptions = {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    };
    
    // Promise wrapper for HTTP request
    const fetchGraylogData = () => {
      return new Promise((resolve, reject) => {
        const req = http.get(apiUrl, requestOptions, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse Graylog response'));
            }
          });
        });
        
        req.on('error', (err) => {
          reject(err);
        });
        
        req.end();
      });
    };
    
    const graylogResponse = await fetchGraylogData();
    
    res.json({
      success: true,
      clientId: client.id,
      clientName: client.name,
      logCount: graylogResponse.total_results || 0,
      timeRange: {
        from: fromFormatted,
        to: toFormatted
      }
    });
    
  } catch (error) {
    console.error('Error fetching Graylog data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch log data' });
  }
});

module.exports = router;