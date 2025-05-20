(function() {
    document.addEventListener('DOMContentLoaded', async () => {
        const tickerContent = document.querySelector('.ticker-content');
        
        async function fetchNews() {
            try {
                const response = await fetch('/api/news/cyware-news');
                const data = await response.json();
                
                if (data.headlines && data.headlines.length > 0) {
                    renderTicker(data.headlines);
                } else {
                    tickerContent.textContent = "No cybersecurity news available at the moment.";
                }
            } catch (error) {
                console.error('Error loading news:', error);
                tickerContent.textContent = "Failed to load news updates.";
            }
        }
        
        function renderTicker(headlines) {
            tickerContent.innerHTML = '';
            
            headlines.forEach((headline, index) => {
                const item = document.createElement('div');
                item.className = 'ticker-item';
                item.textContent = `News ${index + 1}: ${headline}`;
                tickerContent.appendChild(item);
            });
            
            // Clone items for seamless looping
            const clone = tickerContent.cloneNode(true);
            tickerContent.parentNode.appendChild(clone);
        }
        
        // Fetch news immediately
        fetchNews();
        
        // Refresh news every 24 hours
        setInterval(fetchNews, 86400000);
    });
})();
