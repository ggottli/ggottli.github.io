// script.js
document.addEventListener("DOMContentLoaded", function () {
    console.log("Interactive Program Loaded!");
  
    const menuToggle = document.getElementById("menu-toggle");
    const mobileNav = document.getElementById("mobile-nav");
    const mobileNavClose = document.getElementById("mobile-nav-close");
    const mobileLinks = document.querySelectorAll(".mobile-link");
  
    // Open mobile nav when hamburger is clicked
    if (menuToggle) {
      menuToggle.addEventListener("click", function () {
        mobileNav.classList.add("open");
      });
    }
  
    // Close mobile nav when close button is clicked
    if (mobileNavClose) {
      mobileNavClose.addEventListener("click", function () {
        mobileNav.classList.remove("open");
      });
    }
  
    // Close mobile nav when any link is clicked
    mobileLinks.forEach(link => {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("open");
      });
    });
  });
  