const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { authMiddleware, adminAuthMiddleware, superAdminAuthMiddleware } = require('../middleware/auth');
const clientsFilePath = path.join(__dirname, '../config/clients.js');

const getClients = () => {
  try {
    delete require.cache[require.resolve('../config/clients')];
    return require('../config/clients');
  } catch (error) {
    console.error('Error reading clients:', error);
    return [];
  }
};

const writeClientsToFile = (clients) => {
  const clientsContent = `module.exports = ${JSON.stringify(clients, null, 4)};`;
  fs.writeFileSync(clientsFilePath, clientsContent, 'utf8');
};

router.post('/clients', [authMiddleware, adminAuthMiddleware], (req, res) => {
  try {
    const { name, url, description, graylog, logApi } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Name and URL are required' });
    }
    
    const clients = getClients();
    const newId = clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1;
    
    const newClient = { 
      id: newId, 
      name, 
      url, 
      description: description || '',
      graylog: graylog || null,
      logApi: logApi || null,
      adminId: req.user.username // Associate client with the admin
    };
    
    clients.push(newClient);
    writeClientsToFile(clients);
    res.status(201).json({ success: true, client: newClient });
  } catch (error) {
    console.error('Error adding client:', error);
    res.status(500).json({ success: false, message: 'Failed to add client' });
  }
});

router.put('/clients/:id', [authMiddleware, adminAuthMiddleware], (req, res) => {
  try {
    const { name, url, description, graylog, logApi } = req.body;
    const clientId = parseInt(req.params.id);
    
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Name and URL are required' });
    }
    
    const clients = getClients();
    const clientIndex = clients.findIndex(c => c.id === clientId);
    
    if (clientIndex === -1) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    clients[clientIndex] = { 
      ...clients[clientIndex],
      name, 
      url, 
      description: description || clients[clientIndex].description,
      graylog: graylog || clients[clientIndex].graylog || null,
      logApi: logApi || clients[clientIndex].logApi || null
    };
    
    writeClientsToFile(clients);
    res.json({ success: true, client: clients[clientIndex] });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

router.delete('/clients/:id', [authMiddleware, adminAuthMiddleware], (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const clients = getClients();
    const filteredClients = clients.filter(c => c.id !== clientId);
    
    if (filteredClients.length === clients.length) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    writeClientsToFile(filteredClients);
    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ success: false, message: 'Failed to delete client' });
  }
});

router.get('/admins', [authMiddleware, superAdminAuthMiddleware], (req, res) => {
  try {
    const clients = getClients();
    const admins = [...new Set(clients.map(client => ({
      adminId: client.adminId,
      username: client.adminId
    })))];
    
    // Fetch admin credentials from .env
    const dotenv = require('dotenv');
    dotenv.config();
    const adminsWithCredentials = admins.map(admin => {
      return {
        adminId: admin.adminId,
        clients: clients.filter(client => client.adminId === admin.adminId),
        username: process.env[`ADMIN_USERNAME_${admin.adminId}`] || '',
        password: process.env[`ADMIN_PASSWORD_${admin.adminId}`] || ''
      };
    });
    
    res.json(adminsWithCredentials);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
});

router.get('/admins/:adminId/clients', [authMiddleware, superAdminAuthMiddleware], (req, res) => {
  try {
    const { adminId } = req.params;
    const clients = getClients();
    const adminClients = clients.filter(client => client.adminId === adminId);
    
    res.json(adminClients);
  } catch (error) {
    console.error('Error fetching admin clients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin clients' });
  }
});

router.post('/admins', [authMiddleware, superAdminAuthMiddleware], (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    // Add new admin credentials to .env
    const fs = require('fs');
    const dotenv = require('dotenv');
    const envPath = path.join(__dirname, '../.env');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    
    // Check if admin already exists
    for (const key in envConfig) {
      if (key === `ADMIN_USERNAME_${username}` || key === `ADMIN_PASSWORD_${username}`) {
        return res.status(400).json({ success: false, message: 'Admin already exists' });
      }
    }
    
    // Create new admin keys
    const newEnvContent = `
ADMIN_USERNAME_${username}=${username}
ADMIN_PASSWORD_${username}=${password}
    `;
    
    fs.appendFileSync(envPath, newEnvContent, 'utf8');
    dotenv.config();
    
    res.status(201).json({ success: true, message: 'Admin created successfully' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
});

module.exports = router;