// Navbar scroll effect
window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Scroll animation
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// Observe all sections
document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('.services, .about, .testimonials, .cta');
  sections.forEach(section => {
    section.classList.add('fade-in');
    observer.observe(section);
  });

  // Observe individual items with delay
  const serviceItems = document.querySelectorAll('.service-item');
  serviceItems.forEach((item, index) => {
    item.classList.add('fade-in');
    item.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(item);
  });

  const testimonialItems = document.querySelectorAll('.testimonial-item');
  testimonialItems.forEach((item, index) => {
    item.classList.add('fade-in');
    item.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(item);
  });
});
