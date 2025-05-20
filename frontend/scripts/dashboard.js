const clientHistory = {};
const clientStats = {};
const clientTokens = {};
const clientTokenExpiry = {};
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
});
function initializeUI() {
    // Navigation and action buttons
    document.getElementById('logoutButton').addEventListener('click', window.__auth.logout);
    document.getElementById('refreshBtn').addEventListener('click', () => window.location.reload());
    document.getElementById('manageClientsBtn').addEventListener('click', toggleManagementView);
    document.getElementById('addClientBtn').addEventListener('click', showAddClientModal);
}

function toggleManagementView() {
    const desktopView = document.getElementById('dashboardView');
    const managementView = document.getElementById('managementView');
    if (desktopView.classList.contains('hidden')) {
        // Switch to desktop view
        managementView.classList.add('hidden');
        desktopView.classList.remove('hidden');
        document.getElementById('manageClientsBtn').innerHTML = '<span>⚙</span> Manage Clients';
    } else {
        desktopView.classList.add('hidden');
        managementView.classList.remove('hidden');
        document.getElementById('manageClientsBtn').innerHTML = '<span>⌂</span> Desktop View';
        loadClientsTable();
    }
}
function setupModalCloseHandlers() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            this.closest('.modal').classList.add('hidden');
        });
    });
}
function setupFormHandlers() {
    const addClientForm = document.getElementById('addClientForm');
    if (addClientForm) {
        addClientForm.addEventListener('submit', addClientSubmitHandler);
    }
    const editClientForm = document.getElementById('editClientForm');
    if (editClientForm) {
        editClientForm.addEventListener('submit', editClientSubmitHandler);
    }
}

async function fetchClientDetailedStats(clientId) {
    try {
        const response = await fetch(`/api/clients/${clientId}/detailed-stats`, { 
            credentials: 'include' 
        });
        
        if (!response.ok) throw new Error(`Failed to load detailed stats for client ${clientId}`);
        
        const data = await response.json();
        if (data.success && data.stats) {
            const clientCard = document.querySelector(`.client-card[data-client-id="${clientId}"]`);
            if (clientCard) {
                // Store the stats data
                clientStats[clientId] = data.stats;
                
                // Update the detailed stats display
                updateDetailedStatsDisplay(clientId, clientCard, data.stats);
            }
        }
    } catch (error) {
        console.error(`Error fetching detailed stats for client ${clientId}:`, error);
        const clientCard = document.querySelector(`.client-card[data-client-id="${clientId}"]`);
        if (clientCard) {
            const detailedStatsElement = clientCard.querySelector('.detailed-stats');
            if (detailedStatsElement) {
                detailedStatsElement.innerHTML = '<div class="stats-error">Error loading detailed stats</div>';
            }
        }
    }
}

// Function to update the detailed stats display
function updateDetailedStatsDisplay(clientId, clientCard, stats) {
    let detailedStatsElement = clientCard.querySelector('.detailed-stats');
    
    if (!detailedStatsElement) {
        detailedStatsElement = document.createElement('div');
        detailedStatsElement.className = 'detailed-stats';
        
        // Insert detailed stats section after the history graph
        const historyGraph = clientCard.querySelector('.history-graph');
        if (historyGraph) {
            historyGraph.insertAdjacentElement('afterend', detailedStatsElement);
        } else {
            clientCard.appendChild(detailedStatsElement);
        }
    }
    
    // Calculate severity percentages
    const totalLogs = stats.total || 0;
    const majorLogs = stats.major || 0;
    const normalLogs = stats.normal || 0;
    
    const majorPercentage = totalLogs > 0 ? ((majorLogs / totalLogs) * 100).toFixed(1) : 0;
    const normalPercentage = totalLogs > 0 ? ((normalLogs / totalLogs) * 100).toFixed(1) : 0;
    
    // Format rule levels for display (top 3 by count)
    let ruleLevelsHtml = '';
    if (stats.ruleLevels && stats.ruleLevels.length > 0) {
        // Sort rule levels by count (descending)
        const sortedLevels = [...stats.ruleLevels].sort((a, b) => b.count - a.count).slice(0, 3);
        
        ruleLevelsHtml = `
            <div class="rule-levels">
                <h4>Top Rule Levels</h4>
                <div class="rule-levels-chart">
                    ${sortedLevels.map(level => {
                        const levelPercentage = totalLogs > 0 ? ((level.count / totalLogs) * 100).toFixed(1) : 0;
                        return `
                            <div class="rule-level">
                                <div class="rule-level-label">Level ${level.level}</div>
                                <div class="rule-level-bar-container">
                                    <div class="rule-level-bar" style="width: ${levelPercentage}%"></div>
                                </div>
                                <div class="rule-level-count">${level.count} (${levelPercentage}%)</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // Generate daily logs display
    let dailyLogsHtml = '';
    if (stats.dailyLogs && stats.dailyLogs.length > 0) {
        dailyLogsHtml = `
            <div class="daily-logs">
                <h4>Daily Logs</h4>
                <div class="daily-logs-list">
                    ${stats.dailyLogs.map(day => {
                        const date = new Date(day.date);
                        return `
                            <div class="daily-log-item">
                                <div class="daily-log-date">${date.toLocaleDateString()}</div>
                                <div class="daily-log-count">${day.count} logs</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // Update the detailed stats content
    detailedStatsElement.innerHTML = `
        <div class="stats-header">
            <h3>Detailed Stats (24h)</h3>
        </div>
        <div class="stats-summary">
            <div class="stats-item">
                <div class="stats-label">Total Logs</div>
                <div class="stats-value">${totalLogs}</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">Major</div>
                <div class="stats-value">${majorLogs} (${majorPercentage}%)</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">Normal</div>
                <div class="stats-value">${normalLogs} (${normalPercentage}%)</div>
            </div>
        </div>
        ${ruleLevelsHtml}
        ${dailyLogsHtml}
    `;
}
async function loadClients() {
    const dashboardGrid = document.getElementById('dashboardView');
    if (!dashboardGrid) return;
    dashboardGrid.innerHTML = '<div class="loading">Loading clients...</div>';
    try {
        const response = await fetch('/api/clients', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load clients');
        const clients = await response.json();
        if (clients.length === 0) {
            dashboardGrid.innerHTML = '<div class="no-clients">No clients found. Click "Manage Clients" to add clients.</div>';
            return;
        }
        dashboardGrid.innerHTML = '';
        for (const client of clients) {
            let logCount = 'Loading...';
            let lastActive = 'Just now';
            const clientCard = document.createElement('div');
            clientCard.className = 'client-card';
            clientCard.dataset.clientId = client.id;
            clientCard.innerHTML = `
                <div class="client-card-header">
                    <div class="client-icon" style="background: ${getRandomColor()}">
                        ${client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="client-name">${escapeHtml(client.name)}</div>
                        <div class="client-url">${escapeHtml(client.url)}</div>
                    </div>
                </div>
                <div class="client-description">
                    ${escapeHtml(client.description || 'No description available')}
                </div>
                    
                <div class="client-status">
                    <span>
                        <span class="status-indicator status-active"></span>
                        <span class="status-text">Active</span>
                    </span>
                    <span class="log-count-wrapper">
                        Logs (10s): <span class="log-count">0</span>
                    </span>
                </div>
                    
                <!-- Current Log Graph -->
                <div class="log-graph-container">
                    <div class="log-graph">
                        <div class="graph-bar" style="width: 0%"></div>
                        <div class="timer-line"></div>
                    </div>
                    <div class="graph-labels">
                        <span>0</span>
                        <span>50</span>
                        <span>100+</span>
                    </div>
                </div>
                    
                <!-- Historical Log Graph (Last 60 seconds) -->
                <div class="history-graph">
                    <div class="graph-labels" style="padding-bottom: 5px;">
                        <span>Logs (Last 60s)</span>
                        <span class="history-average">Avg: 0</span>
                    </div>
                    <div class="history-bars" id="historyGraph-${client.id}">
                        <!-- Bars will be added dynamically -->
                    </div>
                </div>
                    
                <div class="client-status">
                    <span>Last active: Just now</span>
                    <span class="last-updated">Updating...</span>
                </div>
            `;

            function getRandomColor() {
                const colors = [
                    'linear-gradient(135deg, #3498db, #2ecc71)',
                    'linear-gradient(135deg, #e74c3c, #f39c12)',
                    'linear-gradient(135deg, #9b59b6, #3498db)',
                    'linear-gradient(135deg, #1abc9c, #2ecc71)',
                    'linear-gradient(135deg, #f1c40f, #e67e22)'
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            const historyGraph = clientCard.querySelector(`#historyGraph-${client.id}`);
            for (let i = 0; i < 12; i++) {
                const bar = document.createElement('div');
                bar.className = 'history-bar';
                bar.style.height = '0%';
                bar.dataset.count = '0';
                historyGraph.appendChild(bar);
            }

            clientCard.addEventListener('click', () => openClientDashboard(client));
            dashboardGrid.appendChild(clientCard);
            // Fetch log count for this client
            fetchLogCount(client.id);
            if (client.name === "Virtual Galaxy") {
                fetchClientDetailedStats(client.id);
            }
        }
        setInterval(refreshAllLogCounts, 10000);
    } catch (error) {
        console.error('Error loading clients:', error);
        dashboardGrid.innerHTML = '<div class="error">Error loading clients. Click Refresh to try again.</div>';
    }
}
async function fetchLogCount(clientId) {
    try {
        const response = await fetch(`/api/clients/${clientId}/logs`, { 
            credentials: 'include' 
        });
        
        if (!response.ok) throw new Error(`Failed to load logs for client ${clientId}`);
        
        const data = await response.json();
        if (data.success) {
            const clientCard = document.querySelector(`.client-card[data-client-id="${clientId}"]`);
            if (clientCard) {
                // Update current log count
                const logCount = data.logCount || 0;
                const logCountElement = clientCard.querySelector('.log-count');
                const graphBar = clientCard.querySelector('.graph-bar');
                
                if (logCountElement) {
                    logCountElement.textContent = logCount;
                }
                
                if (graphBar) {
                    const percentage = Math.min(100, logCount);
                    graphBar.style.width = `${percentage}%`;
                }
                
                // Update historical data
                if (!clientHistory[clientId]) {
                    clientHistory[clientId] = [];
                }
                
                clientHistory[clientId].push(logCount);
                if (clientHistory[clientId].length > 12) {
                    clientHistory[clientId].shift();
                }
                
                // Calculate average
                const avg = Math.round(clientHistory[clientId].reduce((a, b) => a + b, 0) / clientHistory[clientId].length);
                clientCard.querySelector('.history-average').textContent = `Avg: ${avg}`;
                
                // Update history graph
                const historyBars = clientCard.querySelectorAll('.history-bar');
                const maxValue = Math.max(...clientHistory[clientId], 1); // Avoid division by zero
                
                clientHistory[clientId].forEach((count, index) => {
                    if (historyBars[index]) {
                        const height = Math.min(100, (count / maxValue) * 100);
                        historyBars[index].style.height = `${height}%`;
                        historyBars[index].dataset.count = count;
                    }
                });
                
                // Update timestamp
                const lastUpdatedElement = clientCard.querySelector('.last-updated');
                if (lastUpdatedElement) {
                    const now = new Date();
                    lastUpdatedElement.textContent = `Updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                }
            }
        }
    } catch (error) {
        console.error(`Error fetching log count for client ${clientId}:`, error);
        const clientCard = document.querySelector(`.client-card[data-client-id="${clientId}"]`);
        if (clientCard) {
            const statusIndicator = clientCard.querySelector('.status-indicator');
            const statusText = clientCard.querySelector('.status-text');
            const logCountElement = clientCard.querySelector('.log-count');
            
            if (statusIndicator) {
                statusIndicator.classList.remove('status-active');
                statusIndicator.classList.add('status-inactive');
            }
            
            if (statusText) {
                statusText.textContent = 'Connection Error';
            }
            
            if (logCountElement) {
                logCountElement.textContent = 'Error';
            }
        }
    }
}
function refreshAllLogCounts() {
    const clientCards = document.querySelectorAll('.client-card');
    clientCards.forEach(card => {
        const clientId = card.dataset.clientId;
        if (clientId) {
            fetchLogCount(parseInt(clientId));
            
            // Also refresh detailed stats for Virtual Galaxy
            const clientName = card.querySelector('.client-name')?.textContent;
            if (clientName === "Virtual Galaxy") {
                fetchClientDetailedStats(parseInt(clientId));
            }
        }
    });
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

    // Get graylog config
    const graylogHost = document.getElementById('graylogHost').value.trim();
    const graylogUsername = document.getElementById('graylogUsername').value.trim();
    const graylogPassword = document.getElementById('graylogPassword').value.trim();
    const graylogStreamId = document.getElementById('graylogStreamId').value.trim();

    const graylog = graylogHost ? {
        host: graylogHost,
        username: graylogUsername,
        password: graylogPassword,
        streamId: graylogStreamId
    } : null;

    if (!name || !url) {
        showMessage('Name and URL are required', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, url, description, graylog })
        });

        const data = await response.json();
        if (data.success) {
            showMessage('Client added successfully', 'success');
            document.getElementById('addClientModal').classList.add('hidden');
            await loadClients();
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