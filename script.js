// ---------------------------------------------------------------------------
// SCARS config — change the WhatsApp number here (country code, digits only).
// ---------------------------------------------------------------------------
const WHATSAPP_NUMBER = "250788000000";

const FLEET = [
  { name: "Volkswagen Polo", cls: "Economy hatchback", cat: "economy", img: "polo", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 2, price: 45000 },
  { name: "Toyota Camry", cls: "Comfort sedan", cat: "economy", img: "camry", seats: 5, gear: "Automatic", fuel: "Hybrid", bags: 3, price: 70000, tag: "Popular" },
  { name: "Honda CR-V", cls: "Compact SUV", cat: "suv", img: "crv", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 4, price: 80000 },
  { name: "Toyota RAV4", cls: "Compact SUV", cat: "suv", img: "rav4", seats: 5, gear: "Automatic", fuel: "Hybrid", bags: 4, price: 85000, tag: "Best value" },
  { name: "Toyota Tacoma 4x4", cls: "Double-cab pickup", cat: "4x4", img: "tacoma", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 5, price: 110000 },
  { name: "Ford Expedition", cls: "Full-size 4x4 SUV", cat: "4x4", img: "expedition", seats: 7, gear: "Automatic", fuel: "Petrol", bags: 6, price: 150000, tag: "Safari ready" },
  { name: "Audi A6", cls: "Executive sedan", cat: "luxury", img: "audi", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 3, price: 160000 },
  { name: "Mercedes-Benz CLS", cls: "Luxury coupé sedan", cat: "luxury", img: "cls", seats: 4, gear: "Automatic", fuel: "Petrol", bags: 2, price: 220000, tag: "Weddings" },
];

const rwf = new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// ---------------------------------------------------------------------------
// WhatsApp message builder — uses whatever the visitor filled in the hero form
// ---------------------------------------------------------------------------
const form = document.getElementById("searchForm");
const startEl = document.getElementById("start");
const endEl = document.getElementById("end");
const errorEl = document.getElementById("dateError");

function bookingDetails() {
  const lines = [];
  const mode = form.querySelector('input[name="mode"]:checked').value;
  lines.push(`Rental type: ${mode}`);
  lines.push(`Pick-up & return: ${form.pickup.value}`);
  if (startEl.value) lines.push(`Start: ${dateFmt.format(new Date(startEl.value))}`);
  if (endEl.value) lines.push(`Return: ${dateFmt.format(new Date(endEl.value))}`);
  return lines;
}

function waLink(car) {
  const lines = ["Hello SCARS! I'd like to rent a car."];
  if (car) lines.push(`Car: ${car.name} (${rwf.format(car.price)} RWF/day)`);
  lines.push(...bookingDetails());
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function openWhatsApp(car) {
  window.open(waLink(car), "_blank", "noopener");
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-wa]");
  if (!trigger) return;
  e.preventDefault();
  const car = trigger.dataset.car ? FLEET[Number(trigger.dataset.car)] : null;
  openWhatsApp(car);
});

document.querySelectorAll("[data-phone]").forEach((el) => {
  el.textContent = "+" + WHATSAPP_NUMBER.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4");
});

// ---------------------------------------------------------------------------
// Hero search: default dates + validation
// ---------------------------------------------------------------------------
function toLocalInput(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

(function setDefaultDates() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  end.setHours(18, 0, 0, 0);
  startEl.value = toLocalInput(start);
  endEl.value = toLocalInput(end);
  startEl.min = toLocalInput(new Date());
})();

function validateDates() {
  let msg = "";
  if (!startEl.value || !endEl.value) msg = "Choose a start and return date and time.";
  else if (new Date(endEl.value) <= new Date(startEl.value)) msg = "Return must be after the start. Pick a later return date.";
  errorEl.textContent = msg;
  [startEl, endEl].forEach((el) => el.setAttribute("aria-invalid", msg ? "true" : "false"));
  return !msg;
}

startEl.addEventListener("change", () => { endEl.min = startEl.value; if (errorEl.textContent) validateDates(); });
endEl.addEventListener("change", () => { if (errorEl.textContent) validateDates(); });

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateDates()) { (startEl.value ? endEl : startEl).focus(); return; }
  openWhatsApp(null);
});

// ---------------------------------------------------------------------------
// Fleet grid + filters
// ---------------------------------------------------------------------------
const grid = document.getElementById("fleetGrid");
const status = document.getElementById("fleetStatus");

const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;

grid.innerHTML = FLEET.map((c, i) => `
  <li class="car reveal" data-cat="${c.cat}">
    <div class="car__media">
      <img src="images/${c.img}.jpg" alt="${c.name}" width="900" height="600" loading="lazy">
      ${c.tag ? `<span class="car__tag">${c.tag}</span>` : ""}
    </div>
    <div class="car__body">
      <div>
        <h3 class="car__name">${c.name}</h3>
        <span class="car__class">${c.cls}</span>
      </div>
      <ul class="specs">
        <li>${icon("users")}${c.seats} seats</li>
        <li>${icon("gear")}${c.gear}</li>
        <li>${icon("fuel")}${c.fuel}</li>
        <li>${icon("bag")}${c.bags} bags</li>
      </ul>
      <div class="car__foot">
        <p class="price" style="margin:0"><strong>${rwf.format(c.price)}</strong> RWF<span>per day</span></p>
        <a href="#" class="btn btn--dark" data-wa data-car="${i}" aria-label="Book the ${c.name} on WhatsApp">Book</a>
      </div>
    </div>
  </li>`).join("");

const chips = document.querySelectorAll(".chip");
chips.forEach((chip) => chip.addEventListener("click", () => {
  const f = chip.dataset.filter;
  chips.forEach((c) => { const on = c === chip; c.classList.toggle("is-active", on); c.setAttribute("aria-pressed", on); });
  let shown = 0;
  grid.querySelectorAll(".car").forEach((card) => {
    const match = f === "all" || card.dataset.cat === f;
    card.hidden = !match;
    if (match) { shown++; card.classList.add("is-in"); }
  });
  status.textContent = `Showing ${shown} ${shown === 1 ? "car" : "cars"}: ${chip.textContent}`;
}));

// ---------------------------------------------------------------------------
// Nav: mobile menu, scrolled state, current section
// ---------------------------------------------------------------------------
const nav = document.querySelector(".nav");
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");

function setMenu(open) {
  links.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", open);
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  toggle.querySelector("use").setAttribute("href", open ? "#i-x" : "#i-menu");
}
toggle.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && links.classList.contains("is-open")) { setMenu(false); toggle.focus(); } });

const waFloat = document.querySelector(".wa-float");
new IntersectionObserver(([entry]) => {
  nav.classList.toggle("is-scrolled", !entry.isIntersecting);
  waFloat.classList.toggle("is-visible", !entry.isIntersecting);
}, { rootMargin: "-120px 0px 0px 0px" }).observe(document.querySelector(".hero__inner"));

const navAnchors = [...links.querySelectorAll('a[href^="#"]:not([href="#"])')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navAnchors.forEach((a) => {
      const on = a.getAttribute("href") === `#${entry.target.id}`;
      a.classList.toggle("is-current", on);
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  });
}, { rootMargin: "-45% 0px -50% 0px" });
navAnchors.forEach((a) => { const s = document.querySelector(a.getAttribute("href")); if (s) sectionObserver.observe(s); });

// ---------------------------------------------------------------------------
// Scroll reveal
// ---------------------------------------------------------------------------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (!entry.isIntersecting) return;
    entry.target.style.transitionDelay = `${Math.min(i, 5) * 50}ms`;
    entry.target.classList.add("is-in");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

document.getElementById("year").textContent = new Date().getFullYear();
