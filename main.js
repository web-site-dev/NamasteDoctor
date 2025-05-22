const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const body = document.body;
const navbar = document.querySelector(".navbar");

// Hamburger menu toggle + disable/enable scrolling
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('toggle');
    body.classList.toggle('no-scroll');
});

// Close menu on nav link click + re-enable scrolling + smooth scroll
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
  
      if (href.startsWith("#")) {
        e.preventDefault();
  
        // Close menu
        navLinks.classList.remove('active');
        hamburger.classList.remove('toggle');
        body.classList.remove('no-scroll');
  
        // Smooth scroll
        const targetSection = document.querySelector(href);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
      // else: it's an external or separate page link (e.g., login.html) — allow it
    });
  });
  

// Navbar hide/show on scroll
let prevScrollpos = window.pageYOffset;
window.onscroll = function () {
    const currentScrollPos = window.pageYOffset;

    // Only hide navbar if menu is not open
    if (!navLinks.classList.contains('active')) {
        if (prevScrollpos > currentScrollPos) {
            navbar.style.top = "0";
        } else {
            navbar.style.top = "-100px";
        }
    }

    prevScrollpos = currentScrollPos;
};

// Fade In on Scroll
const faders = document.querySelectorAll('.fade-in');
const appearOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};

const appearOnScroll = new IntersectionObserver(function (entries, appearOnScroll) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        appearOnScroll.unobserve(entry.target);
    });
}, appearOptions);

faders.forEach(fader => {
    appearOnScroll.observe(fader);
});
