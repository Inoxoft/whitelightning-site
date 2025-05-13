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

  // Terminal language switching
  const langButtons = document.querySelectorAll('.lang-btn');
  const codeBlocks = document.querySelectorAll('.code-block');

  langButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and code blocks
      langButtons.forEach(btn => btn.classList.remove('active'));
      codeBlocks.forEach(block => block.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Show corresponding code block
      const lang = button.getAttribute('data-lang');
      const codeBlock = document.getElementById(`${lang}-code`);
      if (codeBlock) {
        codeBlock.classList.add('active');
      }
    });
  });
}); 