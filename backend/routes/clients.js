const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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

module.exports = router;