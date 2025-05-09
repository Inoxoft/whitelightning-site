document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('nav');
  
  hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    nav.classList.toggle('active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', function(event) {
    if (!hamburger.contains(event.target) && !nav.contains(event.target)) {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    }
  });

  // Close menu when clicking a link
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    });
  });
}); 