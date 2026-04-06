// ── MOBILE MENU ───────────────────────────────────────────────────────
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

// ── INTERACTIVE CARDS ─────────────────────────────────────────────────
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

// ── TYPEWRITER ────────────────────────────────────────────────────────
const trades = [
  "tree service companies",
  "arborists",
  "land clearing crews",
  "stump grinding companies",
  "tree trimming contractors",
  "high ticket trades"
];

let tradeIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typeEl = document.getElementById("typewriter");

function type() {
  if (!typeEl) return;
  const current = trades[tradeIndex];

  if (isDeleting) {
    charIndex--;
    typeEl.textContent = current.substring(0, charIndex);
  } else {
    charIndex++;
    typeEl.textContent = current.substring(0, charIndex);
  }

  let delay = isDeleting ? 55 : 100;

  if (!isDeleting && charIndex === current.length) {
    delay = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    tradeIndex = (tradeIndex + 1) % trades.length;
    delay = 300;
  }

  setTimeout(type, delay);
}

type();

// ── SCROLL COUNTERS ───────────────────────────────────────────────────
function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * target);
    el.textContent = "$" + value.toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const counters = document.querySelectorAll(".counter");
let countersStarted = false;

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && !countersStarted) {
      countersStarted = true;
      counters.forEach((counter) => {
        const target = parseInt(counter.dataset.target, 10);
        animateCounter(counter, target);
      });
    }
  });
}, { threshold: 0.3 });

if (counters.length > 0) {
  observer.observe(counters[0]);
}