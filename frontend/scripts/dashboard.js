document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const authenticated = await window.__auth.checkAuth();
    if (!authenticated) {
        window.location.href = '/login.html';
        return;
    }

    // Initialize UI elements
    initializeUI();
    
    // Set up modal close handlers
    setupModalCloseHandlers();
    
    // Set up form submission handlers
    setupFormHandlers();
    
    // Add log count display before loading clients
    addLogCountDisplay();
    
    // Load clients for desktop view
    await loadClients();

    // Start updating log count periodically
    updateLogCountEvery10Seconds();
});

// Function to add log count display to the DOM
function addLogCountDisplay() {
    const desktopView = document.getElementById('desktopView');
    
    // Create log count display element
    const logCountDisplay = document.createElement('div');
    logCountDisplay.id = 'logCountDisplay';
    logCountDisplay.className = 'log-count-container';
    logCountDisplay.innerHTML = '<div class="loading">Fetching log count...</div>';
    
    // Make sure the desktop view has position relative to maintain the grid layout
    if (window.getComputedStyle(desktopView).position === 'static') {
        desktopView.style.position = 'relative';
    }
    
    // Insert at the beginning of desktopView
    desktopView.insertBefore(logCountDisplay, desktopView.firstChild);
}

function initializeUI() {
    // Navigation and action buttons
    document.getElementById('logoutButton').addEventListener('click', window.__auth.logout);
    document.getElementById('refreshBtn').addEventListener('click', () => window.location.reload());
    document.getElementById('manageClientsBtn').addEventListener('click', toggleManagementView);
    document.getElementById('addClientBtn').addEventListener('click', showAddClientModal);
}

function toggleManagementView() {
    const desktopView = document.getElementById('desktopView');
    const managementView = document.getElementById('managementView');
    
    if (desktopView.classList.contains('hidden')) {
        // Switch to desktop view
        managementView.classList.add('hidden');
        desktopView.classList.remove('hidden');
        document.getElementById('manageClientsBtn').innerHTML = '<span>⚙</span> Manage Clients';
    } else {
        // Switch to management view
        desktopView.classList.add('hidden');
        managementView.classList.remove('hidden');
        document.getElementById('manageClientsBtn').innerHTML = '<span>⌂</span> Desktop View';
        
        // Load clients for management table
        loadClientsTable();
    }
}

function setupModalCloseHandlers() {
    // Close modals when clicking outside content
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // Close modals when clicking X
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').classList.add('hidden');
        });
    });
}

function setupFormHandlers() {
    // Add client form handler
    const addClientForm = document.getElementById('addClientForm');
    if (addClientForm) {
        addClientForm.addEventListener('submit', addClientSubmitHandler);
    }

    // Edit client form handler
    const editClientForm = document.getElementById('editClientForm');
    if (editClientForm) {
        editClientForm.addEventListener('submit', editClientSubmitHandler);
    }
}

async function loadClients() {
    const desktopView = document.getElementById('desktopView');
    if (!desktopView) return;
    
    // Check if there are any existing client icons to remove (excluding the log count display)
    const existingClients = desktopView.querySelectorAll('.desktop-icon, .loading, .no-clients, .error');
    existingClients.forEach(element => element.remove());
    
    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading';
    loadingIndicator.textContent = 'Loading clients...';
    desktopView.appendChild(loadingIndicator);

    try {
        const response = await fetch('/api/clients', { credentials: 'include' });
        
        if (!response.ok) throw new Error('Failed to load clients');
        
        const clients = await response.json();

        // Remove loading indicator
        loadingIndicator.remove();

        if (clients.length === 0) {
            const noClientsMessage = document.createElement('div');
            noClientsMessage.className = 'no-clients';
            noClientsMessage.textContent = 'No clients found. Click "Manage Clients" to add clients.';
            desktopView.appendChild(noClientsMessage);
            return;
        }

        // Create client icons in the same grid structure as before
        clients.forEach(client => {
            const clientIcon = document.createElement('div');
            clientIcon.className = 'desktop-icon';
            clientIcon.innerHTML = `
                <img src="user.png" alt="${escapeHtml(client.name)}">
                <span>${escapeHtml(client.name)}</span>
            `;
            clientIcon.addEventListener('click', () => openClientDashboard(client));
            desktopView.appendChild(clientIcon);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
        
        // Remove loading indicator
        loadingIndicator.remove();
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error';
        errorMessage.textContent = 'Error loading clients. Click Refresh to try again.';
        desktopView.appendChild(errorMessage);
    }
}

function openClientDashboard(client) {
    // Directly open the client's dashboard in a new tab
    window.open(client.url, '_blank');
}

async function loadClientsTable() {
    const tableBody = document.getElementById('clientsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4">Loading clients...</td></tr>';

    try {
        const response = await fetch('/api/clients', { credentials: 'include' });
        
        if (!response.ok) throw new Error('Failed to load clients');
        
        const clients = await response.json();

        if (clients.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No clients found. Click "Add New Client" to add clients.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        clients.forEach(client => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(client.name)}</td>
                <td>${escapeHtml(client.url)}</td>
                <td>${escapeHtml(client.description || '')}</td>
                <td class="table-actions">
                    <button class="table-btn view-btn" data-id="${client.id}">View</button>
                    <button class="table-btn edit-btn" data-id="${client.id}">Edit</button>
                    <button class="table-btn delete-btn" data-id="${client.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
            
            // Add event listeners for action buttons
            const viewBtn = row.querySelector('.view-btn');
            const editBtn = row.querySelector('.edit-btn');
            const deleteBtn = row.querySelector('.delete-btn');
            
            viewBtn.addEventListener('click', () => window.open(client.url, '_blank'));
            editBtn.addEventListener('click', () => showEditClientModal(client));
            deleteBtn.addEventListener('click', () => deleteClient(client.id));
        });
    } catch (error) {
        console.error('Error loading clients:', error);
        tableBody.innerHTML = '<tr><td colspan="4">Error loading clients. Try refreshing the page.</td></tr>';
    }
}

function showAddClientModal() {
    const modal = document.getElementById('addClientModal');
    const form = document.getElementById('addClientForm');
    
    // Reset form
    form.reset();
    
    // Show modal
    modal.classList.remove('hidden');
}

function showEditClientModal(client) {
    const modal = document.getElementById('editClientModal');
    
    // Fill the form with client data
    document.getElementById('editClientId').value = client.id;
    document.getElementById('editClientName').value = client.name;
    document.getElementById('editClientUrl').value = client.url;
    document.getElementById('editClientDescription').value = client.description || '';
    
    // Show the modal
    modal.classList.remove('hidden');
}

async function addClientSubmitHandler(e) {
    e.preventDefault();
    const name = document.getElementById('clientName').value.trim();
    const url = document.getElementById('clientUrl').value.trim();
    const description = document.getElementById('clientDescription').value.trim();
    
    if (!name || !url) {
        showMessage('Name and URL are required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, url, description })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage('Client added successfully', 'success');
            document.getElementById('addClientModal').classList.add('hidden');
            
            // Refresh both views
            await loadClients();
            
            // Also refresh the table if in management view
            if (document.getElementById('managementView').classList.contains('hidden') === false) {
                await loadClientsTable();
            }
        } else {
            showMessage(data.message || 'Failed to add client', 'error');
        }
    } catch (error) {
        console.error('Error adding client:', error);
        showMessage('Error adding client', 'error');
    }
}

async function editClientSubmitHandler(e) {
    e.preventDefault();
    const id = document.getElementById('editClientId').value;
    const name = document.getElementById('editClientName').value.trim();
    const url = document.getElementById('editClientUrl').value.trim();
    const description = document.getElementById('editClientDescription').value.trim();
    
    if (!name || !url) {
        showMessage('Name and URL are required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, url, description })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage('Client updated successfully', 'success');
            document.getElementById('editClientModal').classList.add('hidden');
            
            // Refresh both views
            await loadClients();
            
            // Also refresh the table if in management view
            if (document.getElementById('managementView').classList.contains('hidden') === false) {
                await loadClientsTable();
            }
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
            
            // Refresh both views
            await loadClients();
            
            // Also refresh the table if in management view
            if (document.getElementById('managementView').classList.contains('hidden') === false) {
                await loadClientsTable();
            }
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
        messageElement.classList.remove('hidden');

        // Hide after 3 seconds
        setTimeout(() => {
            messageElement.classList.add('hidden');
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

// Function to fetch log count from backend
async function fetchLogCount() {
    try {
        console.log("Fetching log count...");
        const response = await fetch('/api/log-count');

        if (!response.ok) {
            console.error(`Failed to fetch log count. Status: ${response.status}`);
            return 0;
        }

        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error("Unexpected response format. Expected JSON.");
            console.error("Response received:", await response.text());
            return 0;
        }

        const data = await response.json();
        console.log("Log count received:", data.totalLogCount);
        return data.totalLogCount || 0;
    } catch (error) {
        console.error("Error fetching log count:", error);
        return 0;
    }
}

// Function to update log count in the UI every 10 seconds
function updateLogCountEvery10Seconds() {
    const logCountDisplay = document.getElementById('logCountDisplay');
    if (!logCountDisplay) return;
    
    // Apply styles to make it stand out but not interfere with grid layout
    logCountDisplay.style.width = '100%';
    logCountDisplay.style.padding = '10px';
    logCountDisplay.style.marginBottom = '15px';
    
    async function refreshLogCount() {
        const logCount = await fetchLogCount();
        logCountDisplay.innerHTML = `
            <div class="log-count-info" style="
                background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
                border-radius: 12px;
                padding: 15px 20px;
                color: white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            ">
                <h3 style="margin: 0; padding: 0; font-size: 1.5rem;">System Status</h3>
                <p style="margin: 5px 0 0 0; font-size: 1.2rem; font-weight: 500;">Total Logs In last 10s: ${logCount}</p>
            </div>
        `;
    }

    // Refresh log count immediately and every 10 seconds
    refreshLogCount();
    setInterval(refreshLogCount, 10000);
}