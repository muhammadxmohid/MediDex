// ===== API base =====
const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://medidex-production.up.railway.app";

// First-visit: clear cart on this device
(function ensureFirstVisitCartClear() {
  try {
    if (!localStorage.getItem("medidex_firstSeenAt")) {
      localStorage.removeItem("medidexCart");
      localStorage.setItem("medidex_firstSeenAt", String(Date.now()));
    }
  } catch {}
})();

// ===== Sample data =====
const medicines = [
  {
    id: 1,
    name: "Aspirin",
    category: "Tablet",
    price: 5.99,
    description: "Used to reduce pain, fever, or inflammation.",
    image: "images/aspirin.png",
  },
  {
    id: 2,
    name: "Benzyl Penicillin",
    category: "Injection",
    price: 19.99,
    description: "Antibiotic used for bacterial infections.",
    image: "images/benzene.png",
  },
  {
    id: 3,
    name: "Paracetamol",
    category: "Tablet",
    price: 6.49,
    description: "Pain reliever and fever reducer.",
    image: "images/paracetamol.png",
  },
  {
    id: 4,
    name: "Amoxicillin",
    category: "Capsule",
    price: 12.49,
    description: "Antibiotic for a variety of infections.",
    image: "images/amoxicillin.png",
  },
  {
    id: 5,
    name: "Ibuprofen",
    category: "Tablet",
    price: 7.49,
    description: "Reduces fever and treats pain or inflammation.",
    image: "images/ibuprofen.png",
  },
  {
    id: 6,
    name: "Cetirizine",
    category: "Tablet",
    price: 4.99,
    description: "Antihistamine used to relieve allergy symptoms.",
    image: "images/cetirizine.png",
  },
  {
    id: 7,
    name: "Doxycycline",
    category: "Capsule",
    price: 14.99,
    description: "Antibiotic for respiratory infections and more.",
    image: "images/doxycycline.png",
  },
  {
    id: 8,
    name: "Metformin",
    category: "Tablet",
    price: 8.99,
    description: "Used to treat type 2 diabetes.",
    image: "images/metmormin.png",
  },
  {
    id: 9,
    name: "Loratadine",
    category: "Tablet",
    price: 5.49,
    description: "Antihistamine for seasonal allergies.",
    image: "images/loratadine.png",
  },
  {
    id: 10,
    name: "Naproxen",
    category: "Tablet",
    price: 9.49,
    description: "NSAID for pain and inflammation.",
    image: "images/naproxen.png",
  },
  {
    id: 11,
    name: "ORS Solution",
    category: "Solution",
    price: 3.99,
    description: "Oral rehydration solution for dehydration.",
    image: "images/ors.png",
  },
  {
    id: 12,
    name: "Dextromethorphan Syrup",
    category: "Syrup",
    price: 6.99,
    description: "Cough suppressant for dry cough.",
    image: "images/dxm.png",
  },
];

// ===== Toast (inline styles, always visible) =====
let toastHost;
function ensureToast() {
  if (!toastHost) {
    toastHost = document.createElement("div");
    toastHost.id = "toast";
    Object.assign(toastHost.style, {
      position: "fixed",
      left: "50%",
      bottom: "16px",
      transform: "translateX(-50%)",
      display: "grid",
      gap: "8px",
      zIndex: "999999",
    });
    document.body.appendChild(toastHost);
  }
}
function showToast(text) {
  ensureToast();
  const el = document.createElement("div");
  el.textContent = text;
  const cs = getComputedStyle(document.body);
  Object.assign(el.style, {
    background: cs.getPropertyValue("--surface") || "#fff",
    color: cs.getPropertyValue("--text") || "#111",
    border: `1px solid ${cs.getPropertyValue("--border") || "#e5e7eb"}`,
    padding: "10px 14px",
    borderRadius: "10px",
    boxShadow: "0 6px 24px rgba(16,24,40,0.12)",
    opacity: "0",
    transform: "translateY(8px)",
    transition: "opacity .2s, transform .2s",
  });
  toastHost.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    el.style.opacity = "0";
  }, 700);
  setTimeout(() => {
    el.remove();
  }, 900);
}

// ===== Hamburger & Theme =====
document.addEventListener("DOMContentLoaded", () => {
  const burger = document.querySelector(".hamburger");
  const nav = document.querySelector("nav");
  if (burger && nav)
    burger.addEventListener("click", () => nav.classList.toggle("active"));
});
document.addEventListener("DOMContentLoaded", () => {
  const root = document.body,
    toggle = document.getElementById("theme-toggle");
  const saved = localStorage.getItem("medidexTheme");
  if (saved === "dark") {
    root.classList.add("dark");
    if (toggle) toggle.textContent = "☀️";
  } else {
    root.classList.remove("dark");
    if (toggle) toggle.textContent = "🌙";
  }
  if (toggle)
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      root.classList.toggle("dark");
      const isDark = root.classList.contains("dark");
      localStorage.setItem("medidexTheme", isDark ? "dark" : "light");
      toggle.textContent = isDark ? "☀️" : "🌙";
    });
});

// ===== Search submit =====
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".search-bar");
  const input = document.querySelector(".search-bar input");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    localStorage.setItem("medidexSearchQuery", q);
    if (!location.pathname.endsWith("/medicines.html"))
      window.location.href = "medicines.html";
    else renderFromFilters();
  });
});

// ===== Helpers =====
function uniqueCategories(items) {
  return Array.from(new Set(items.map((m) => m.category))).sort();
}
function setGridSingleClass(grid, count) {
  grid.classList.toggle("single", count === 1);
}
function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// ===== Renderers =====
function renderCards(list) {
  const grid = document.querySelector(".medicine-grid");
  const countEl = document.getElementById("results-count");
  if (!grid) return;
  grid.innerHTML = "";
  if (countEl)
    countEl.textContent = `${list.length} result${
      list.length === 1 ? "" : "s"
    }`;
  setGridSingleClass(grid, list.length);
  if (!list.length) {
    grid.innerHTML = `<p style="text-align:center; grid-column:1/-1; font-weight:600;">No medicines found.</p>`;
    return;
  }
  list.forEach((med) => {
    const card = document.createElement("div");
    card.className = "medicine-card";
    card.innerHTML = `
      <div class="img-wrap"><img src="${med.image}" alt="${
      med.name
    }" loading="lazy" /></div>
      <span class="badge">${med.category}</span>
      <h3><a href="medicine-details.html?id=${med.id}">${med.name}</a></h3>
      <p><strong>Category:</strong> ${med.category}</p>
      <p>${med.description.substring(0, 80)}...</p>
      <div class="card-actions">
        <button class="btn add-to-cart" data-id="${med.id}">Add to cart</button>
      </div>`;
    card.addEventListener(
      "click",
      () => (window.location.href = `medicine-details.html?id=${med.id}`)
    );
    card.querySelector(".add-to-cart").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      addToCart(med.id, 1);
    });
    grid.appendChild(card);
  });
}

function renderFromFilters() {
  const input = document.querySelector(".search-bar input");
  const q = (
    input?.value ||
    localStorage.getItem("medidexSearchQuery") ||
    ""
  ).toLowerCase();
  const catSel = document.getElementById("filter-category");
  const cat = catSel ? catSel.value : "";
  let list = medicines.slice();
  if (q) list = list.filter((m) => m.name.toLowerCase().includes(q));
  if (cat) list = list.filter((m) => m.category === cat);
  renderCards(list);
}

function setupCategoryFilter() {
  const sel = document.getElementById("filter-category");
  if (!sel || sel.dataset.ready) return;
  sel.innerHTML =
    `<option value="">All categories</option>` +
    uniqueCategories(medicines)
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  sel.addEventListener("change", renderFromFilters);
  sel.dataset.ready = "1";
}

// ===== Cart =====
const cart = { items: [] };
function saveCart() {
  localStorage.setItem("medidexCart", JSON.stringify(cart.items));
}
function loadCart() {
  try {
    cart.items = JSON.parse(localStorage.getItem("medidexCart") || "[]");
  } catch {
    cart.items = [];
  }
  updateCartBadge();
}
function findMed(id) {
  return medicines.find((m) => m.id === id);
}
function cartTotal() {
  return cart.items.reduce(
    (s, it) => s + (findMed(it.id)?.price || 0) * it.qty,
    0
  );
}
function updateCartBadge() {
  const el = document.getElementById("cart-count");
  if (el) el.textContent = cart.items.reduce((s, it) => s + it.qty, 0);
}
function addToCart(id, qty = 1) {
  const it = cart.items.find((i) => i.id === id);
  if (it) it.qty += qty;
  else cart.items.push({ id, qty });
  saveCart();
  updateCartBadge();
  showToast("Added to cart");
}

// ===== Init (force render so pages aren’t blank) =====
document.addEventListener("DOMContentLoaded", () => {
  ensureToast();
  loadCart();
  setupCategoryFilter();
  // Always render the grid if present
  if (document.querySelector(".medicine-grid")) {
    renderFromFilters();
    // If filters not present for some reason, render all
    if (!document.getElementById("filter-category")) renderCards(medicines);
  }
});
