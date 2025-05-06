// Hide this code from browser inspection by using self-executing functions
(function () {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                showMessage('Please enter both username and password');
                return;
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // Important for cookies
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = '/dashboard.html';
                } else {
                    showMessage(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('Login failed. Please try again.');
            }
        });

        function showMessage(message) {
            const messageElement = document.getElementById('message');
            if (messageElement) {
                messageElement.textContent = message;
                messageElement.style.display = 'block';
            } else {
                alert(message);
            }
        }
    }}) ();

    // Check authentication status
    async function checkAuth() {
        try {
            const response = await fetch('/api/auth/check', {
                credentials: 'include'
            });
            const data = await response.json();
            return data.authenticated;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    // Function to handle logout
    async function logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed');
        }
    }

    // Export functions in a way that obfuscates them
    window.__auth = {
        checkAuth: checkAuth,
        logout: logout
    };