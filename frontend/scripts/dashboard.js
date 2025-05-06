// Self-executing function to hide implementation details
(function() {
    document.addEventListener('DOMContentLoaded', async () => {
        // Check authentication first
        const authenticated = await window.__auth.checkAuth();
        if (!authenticated) {
            window.location.href = '/login.html';
            return;
        }
        
        // Initialize UI components
        initializeUI();
        
        // Load clients
        await loadClients();
        
        // Add event listeners for client management
        document.getElementById('addClientForm')?.addEventListener('submit', handleAddClient);
        document.getElementById('logoutButton')?.addEventListener('click', window.__auth.logout);
    });
    
    function initializeUI() {
        // Setup tabs if they exist
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // Hide all tab contents
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Show the selected tab content and mark tab as active
                document.getElementById(tabId).style.display = 'block';
                this.classList.add('active');
            });
        });
        
        // Show the first tab by default
        if (tabs.length > 0) {
            tabs[0].click();
        }
    }
    
    async function loadClients() {
        const clientsList = document.getElementById('clientsList');
        const clientsManagement = document.getElementById('clientsManagement');
        
        if (!clientsList) return;
        
        clientsList.innerHTML = '<p>Loading clients...</p>';
        
        try {
            const response = await fetch('/api/clients', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load clients');
            }
            
            const clients = await response.json();
            
            if (clients.length === 0) {
                clientsList.innerHTML = '<p>No clients found. Add a client to get started.</p>';
                return;
            }
            
            // Display clients for viewing
            clientsList.innerHTML = '';
            clients.forEach(client => {
                const clientDiv = document.createElement('div');
                clientDiv.className = 'client-card';
                clientDiv.innerHTML = `
                    <h3>${escapeHtml(client.name)}</h3>
                    <p>${escapeHtml(client.description || '')}</p>
                    <a href="${escapeHtml(client.url)}" target="_blank" rel="noopener noreferrer">Access Dashboard</a>
                `;
                clientsList.appendChild(clientDiv);
            });
            
            // Display clients for management if the element exists
            if (clientsManagement) {
                clientsManagement.innerHTML = '';
                
                clients.forEach(client => {
                    const clientRow = document.createElement('div');
                    clientRow.className = 'client-row';
                    clientRow.innerHTML = `
                        <div class="client-info">
                            <h4>${escapeHtml(client.name)}</h4>
                            <p>${escapeHtml(client.description || '')}</p>
                            <p><small>${escapeHtml(client.url)}</small></p>
                        </div>
                        <div class="client-actions">
                            <button class="edit-btn" data-id="${client.id}">Edit</button>
                            <button class="delete-btn" data-id="${client.id}">Delete</button>
                        </div>
                    `;
                    clientsManagement.appendChild(clientRow);
                    
                    // Add event listeners
                    clientRow.querySelector('.edit-btn').addEventListener('click', () => editClient(client));
                    clientRow.querySelector('.delete-btn').addEventListener('click', () => deleteClient(client.id));
                });
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            clientsList.innerHTML = '<p>Error loading clients. Please try again.</p>';
        }
    }
    
    async function handleAddClient(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('clientName');
        const urlInput = document.getElementById('clientUrl');
        const descInput = document.getElementById('clientDescription');
        
        const clientData = {
            name: nameInput.value.trim(),
            url: urlInput.value.trim(),
            description: descInput.value.trim()
        };
        
        if (!clientData.name || !clientData.url) {
            showMessage('Please enter a name and URL', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(clientData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('Client added successfully', 'success');
                nameInput.value = '';
                urlInput.value = '';
                descInput.value = '';
                await loadClients();
            } else {
                showMessage(data.message || 'Failed to add client', 'error');
            }
        } catch (error) {
            console.error('Error adding client:', error);
            showMessage('Error adding client', 'error');
        }
    }
    
    function editClient(client) {
        const modal = document.getElementById('editClientModal');
        const editForm = document.getElementById('editClientForm');
        const editNameInput = document.getElementById('editClientName');
        const editUrlInput = document.getElementById('editClientUrl');
        const editDescInput = document.getElementById('editClientDescription');
        const editIdInput = document.getElementById('editClientId');
        
        // Fill the form with client data
        editNameInput.value = client.name;
        editUrlInput.value = client.url;
        editDescInput.value = client.description || '';
        editIdInput.value = client.id;
        
        // Show the modal
        modal.classList.remove('hidden');
        
        // Add close button listener
        document.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // Handle form submission
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(`/api/admin/clients/${editIdInput.value}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: editNameInput.value.trim(),
                        url: editUrlInput.value.trim(),
                        description: editDescInput.value.trim()
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    modal.classList.add('hidden');
                    showMessage('Client updated successfully', 'success');
                    await loadClients();
                } else {
                    showMessage(data.message || 'Failed to update client', 'error');
                }
            } catch (error) {
                console.error('Error updating client:', error);
                showMessage('Error updating client', 'error');
            }
        };
    }
    
    async function handleEditClient(e) {
        e.preventDefault();
        
        const editIdInput = document.getElementById('editClientId');
        const editNameInput = document.getElementById('editClientName');
        const editUrlInput = document.getElementById('editClientUrl');
        const editDescInput = document.getElementById('editClientDescription');
        
        const clientData = {
            name: editNameInput.value.trim(),
            url: editUrlInput.value.trim(),
            description: editDescInput.value.trim()
        };
        
        if (!clientData.name || !clientData.url) {
            showMessage('Please enter a name and URL', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/clients/${editIdInput.value}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(clientData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                const modal = document.getElementById('editClientModal');
                modal.style.display = 'none';
                modal.classList.add('hidden');
                showMessage('Client updated successfully', 'success');
                await loadClients();
            } else {
                showMessage(data.message || 'Failed to update client', 'error');
            }
        } catch (error) {
            console.error('Error updating client:', error);
            showMessage('Error updating client', 'error');
        }
    }
    
    async function deleteClient(clientId) {
        if (!confirm('Are you sure you want to delete this client?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/clients/${clientId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('Client deleted successfully', 'success');
                await loadClients();
            } else {
                showMessage(data.message || 'Failed to delete client', 'error');
            }
        } catch (error) {
            console.error('Error deleting client:', error);
            showMessage('Error deleting client', 'error');
        }
    }
    
    function showMessage(message, type = 'info') {
        const messageElement = document.getElementById('message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `message ${type}`;
            messageElement.style.display = 'block';
            
            // Hide after 3 seconds
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }
    
    // Helper function to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
})();