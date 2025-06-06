// URL Router for clean URLs without .html extensions
(function() {
    // Map of clean URLs to actual HTML files
    const routes = {
        '/': 'index.html',
        '/getting-started': 'docs.html',
        '/prompt-examples': 'examples.html',
        '/binary-setup': 'binary-classifier.html',
        '/multiclass-setup': 'multiclass-classifier.html',
        '/binary-running': 'running_bnr.html',
        '/multiclass-running': 'running_mlt.html',
        '/mobile-deployment': 'arduino.html',
        '/arduino-deployment': 'arduino.html',
        '/playground': 'playground.html'
    };

    // Function to handle navigation
    function navigate(path) {
        const targetFile = routes[path];
        if (targetFile && targetFile !== getCurrentPage()) {
            window.location.href = targetFile;
        }
    }

    // Get current page filename
    function getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    // Handle click events on navigation links
    function handleNavClick(event) {
        const link = event.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Check if it's an internal navigation link
        if (href && routes[href]) {
            event.preventDefault();
            
            // Update browser history
            history.pushState(null, '', href);
            
            // Navigate to the actual file
            navigate(href);
        }
    }

    // Handle browser back/forward buttons
    function handlePopState() {
        const path = window.location.pathname;
        navigate(path);
    }

    // Initialize when DOM is loaded
    function init() {
        // Add event listeners to navigation containers
        const navContainers = document.querySelectorAll('nav, .hero');
        navContainers.forEach(container => {
            container.addEventListener('click', handleNavClick);
        });

        // Handle browser navigation
        window.addEventListener('popstate', handlePopState);

        // If we're on a clean URL, redirect to the actual file
        const currentPath = window.location.pathname;
        if (routes[currentPath] && getCurrentPage() !== routes[currentPath]) {
            window.location.replace(routes[currentPath]);
        }

        // If someone accesses HTML files directly, redirect to clean URLs
        const currentFile = getCurrentPage();
        const cleanUrl = Object.keys(routes).find(key => routes[key] === currentFile);
        if (cleanUrl && cleanUrl !== currentPath && currentPath.endsWith('.html')) {
            window.location.replace(cleanUrl);
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 