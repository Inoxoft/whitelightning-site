document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const desktopNav = document.querySelector('.desktop-nav');
  const mobileSidebar = document.querySelector('.docs-sidebar.mobile-sidebar');
  
  hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('active');
    if (mobileSidebar) {
      mobileSidebar.classList.toggle('active');
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', function(event) {
    if (!hamburger.contains(event.target) && !mobileNav.contains(event.target)) {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('active');
      if (mobileSidebar && !mobileSidebar.contains(event.target)) {
        mobileSidebar.classList.remove('active');
      }
    }
  });

  // Close menu when clicking a link
  const mobileNavLinks = document.querySelectorAll('.mobile-nav a');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('active');
      if (mobileSidebar) {
        mobileSidebar.classList.remove('active');
      }
    });
  });

  // Also close mobile sidebar when clicking a sidebar link
  if (mobileSidebar) {
    const sidebarLinks = mobileSidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileSidebar.classList.remove('active');
      });
    });
  }

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

  // Handle terminal animation completion
  const terminalContents = document.querySelectorAll('.terminal-content');
  
  terminalContents.forEach(terminal => {
    const codes = terminal.querySelectorAll('code');
    const lastCode = codes[codes.length - 1];
    
    if (lastCode) {
      lastCode.addEventListener('animationend', function() {
        terminal.classList.add('animation-complete');
      });
    }
  });
}); 