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

    // Load clients for desktop view
    await loadClients();

    // Start updating log counts for each client periodically
    updateLogCountsEvery10Seconds();
});

function initializeUI() {
    // Add event listeners for navigation and action buttons
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

    // Close modals when clicking the close button
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
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

    // Remove existing client icons
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
        loadingIndicator.remove();

        if (clients.length === 0) {
            const noClientsMessage = document.createElement('div');
            noClientsMessage.className = 'no-clients';
            noClientsMessage.textContent = 'No clients found. Click "Manage Clients" to add clients.';
            desktopView.appendChild(noClientsMessage);
            return;
        }

        // Create client icons
        clients.forEach(client => {
            const clientIcon = document.createElement('div');
            clientIcon.className = 'desktop-icon';
            clientIcon.id = `client-${client.id}`;
            clientIcon.innerHTML = `
                <img src="user.png" alt="${escapeHtml(client.name)}">
                <span>${escapeHtml(client.name)}</span>
                <div class="log-count">Logs: --</div>
            `;
            clientIcon.addEventListener('click', () => openClientDashboard(client));
            desktopView.appendChild(clientIcon);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
        loadingIndicator.remove();

        const errorMessage = document.createElement('div');
        errorMessage.className = 'error';
        errorMessage.textContent = 'Error loading clients. Click Refresh to try again.';
        desktopView.appendChild(errorMessage);
    }
}

function openClientDashboard(client) {
    // Open the client's dashboard in a new tab
    window.open(client.url, '_blank');
}

async function fetchLogCounts() {
    try {
        const response = await fetch('/api/log-counts', { credentials: 'include' });
        if (!response.ok) {
            console.error(`Failed to fetch log counts. Status: ${response.status}`);
            return [];
        }

        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Unexpected response format. Expected JSON.');
            console.error('Response received:', await response.text()); // Log the raw response
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching log counts:', error);
        return [];
    }
}


async function updateLogCountsEvery10Seconds() {
    async function refreshLogCounts() {
        const logCounts = await fetchLogCounts();
        logCounts.forEach(({ clientId, totalLogCount }) => {
            const logCountElement = document.querySelector(`#client-${clientId} .log-count`);
            if (logCountElement) {
                logCountElement.textContent = `Logs: ${totalLogCount}`;
            }
        });
    }

    // Refresh log counts immediately and every 10 seconds
    await refreshLogCounts();
    setInterval(refreshLogCounts, 10000);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showAddClientModal() {
    const modal = document.getElementById('addClientModal');
    if (!modal) {
        console.error("Add Client Modal not found in DOM");
        return;
    }

    // Reset the form inside the modal if it exists
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }

    // Display the modal
    modal.classList.remove('hidden');
}

function showEditClientModal(client) {
    const modal = document.getElementById('editClientModal');
    document.getElementById('editClientId').value = client.id;
    document.getElementById('editClientName').value = client.name;
    document.getElementById('editClientUrl').value = client.url;
    document.getElementById('editClientDescription').value = client.description || '';
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
            await loadClients();
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
        messageElement.classList.remove('hidden');

        // Hide after 3 seconds
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 3000);
    } else {
        alert(message);
    }
}