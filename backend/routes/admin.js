const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const clientsFilePath = path.join(__dirname, '../config/clients.js');
// Helper function to read clients
const getClients = () => {
  try {
    // Clear the require cache to get the latest version
    delete require.cache[require.resolve('../config/clients')];
    const clients = require('../config/clients');
    return clients;
  } catch (error) {
    console.error('Error reading clients:', error);
    return [];
  }
};
// Helper function to write clients to file
const writeClientsToFile = (clients) => {
  const clientsContent = `module.exports = ${JSON.stringify(clients, null, 4)};`;
  fs.writeFileSync(clientsFilePath, clientsContent, 'utf8');
};
// Add a new client
router.post('/clients', (req, res) => {
  try {
    const { name, url, description } = req.body;
    
    // Basic validation
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Name and URL are required' });
    }   
    const clients = getClients();    
    // Generate a new ID
    const newId = clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1;    
    // Create new client
    const newClient = { id: newId, name, url, description: description || '' };   
    // Add to array and write to file
    clients.push(newClient);
    writeClientsToFile(clients);   
    res.status(201).json({ success: true, client: newClient });
  } catch (error) {
    console.error('Error adding client:', error);
    res.status(500).json({ success: false, message: 'Failed to add client' });
  }
});

// Update a client
router.put('/clients/:id', (req, res) => {
  try {
    const { name, url, description } = req.body;
    const clientId = parseInt(req.params.id);   
    // Basic validation
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Name and URL are required' });
    }  
    const clients = getClients();
    const clientIndex = clients.findIndex(c => c.id === clientId); 
    if (clientIndex === -1) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    } 
    // Update client
    clients[clientIndex] = { 
      ...clients[clientIndex],
      name, 
      url, 
      description: description || clients[clientIndex].description 
    }; 
    // Write updated clients to file
    writeClientsToFile(clients); 
    res.json({ success: true, client: clients[clientIndex] });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

// Delete a client
router.delete('/clients/:id', (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const clients = getClients();
    const filteredClients = clients.filter(c => c.id !== clientId); 
    if (filteredClients.length === clients.length) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    // Write updated clients to file
    writeClientsToFile(filteredClients); 
    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ success: false, message: 'Failed to delete client' });
  }
});
module.exports = router;