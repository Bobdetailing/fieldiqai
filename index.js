const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const navLinks = document.getElementById("navLinks");
const interactiveCards = document.querySelectorAll(".interactive-card");

if (mobileMenuBtn && navLinks) {
  mobileMenuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
    });
  });
}

interactiveCards.forEach((card) => {
  card.addEventListener("click", () => {
    interactiveCards.forEach((c) => c.classList.remove("active-touch"));
    card.classList.add("active-touch");
  });

  card.addEventListener(
    "touchstart",
    () => {
      interactiveCards.forEach((c) => c.classList.remove("active-touch"));
      card.classList.add("active-touch");
    },
    { passive: true }
  );

  card.addEventListener("blur", () => {
    card.classList.remove("active-touch");
  });
});