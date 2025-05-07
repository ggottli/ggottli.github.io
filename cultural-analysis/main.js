// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu toggle
const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("active");

    // Animate the hamburger icon
    const spans = menuToggle.querySelectorAll("span");
    spans.forEach((span) => span.classList.toggle("active"));

    if (mainNav.classList.contains("active")) {
      spans[0].style.transform = "rotate(45deg) translate(5px, 5px)";
      spans[1].style.opacity = "0";
      spans[2].style.transform = "rotate(-45deg) translate(7px, -6px)";
    } else {
      spans[0].style.transform = "none";
      spans[1].style.opacity = "1";
      spans[2].style.transform = "none";
    }
  });
}

// Simple fade-in animation for content when page loads
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll("main section");

  // Add fade-in class to each section with a slight delay
  sections.forEach((section, index) => {
    setTimeout(
      () => {
        section.style.opacity = "1";
        section.style.transform = "translateY(0)";
      },
      100 * (index + 1),
    );
  });

  // Highlight current page in navigation
  const currentLocation = window.location.pathname;
  const navLinks = document.querySelectorAll("nav ul li a");

  navLinks.forEach((link) => {
    const linkPath = link.getAttribute("href");

    // Check if the current path includes the link path (for subdirectories)
    // or if we're on index and the link points to index
    if (
      (currentLocation.includes(linkPath) && linkPath !== "index.html") ||
      (currentLocation.endsWith("/") && linkPath === "index.html") ||
      (currentLocation.endsWith("index.html") && linkPath === "index.html")
    ) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});
