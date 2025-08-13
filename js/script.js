// ===== Config: API base for checkout (Production uses Railway URL) =====
const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://medidex-production.up.railway.app";

// ===== Sample Medicines Data =====
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

// ===== Hamburger =====
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector("nav");
  if (hamburger && navMenu)
    hamburger.addEventListener("click", () =>
      navMenu.classList.toggle("active")
    );
});

// ===== Theme (persisted) =====
document.addEventListener("DOMContentLoaded", () => {
  const root = document.body;
  const toggle = document.getElementById("theme-toggle");
  const saved = localStorage.getItem("medidexTheme");
  if (saved === "dark") {
    root.classList.add("dark");
    if (toggle) toggle.textContent = "☀️";
  } else {
    root.classList.remove("dark");
    if (toggle) toggle.textContent = "🌙";
  }
  if (toggle) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      root.classList.toggle("dark");
      const isDark = root.classList.contains("dark");
      localStorage.setItem("medidexTheme", isDark ? "dark" : "light");
      toggle.textContent = isDark ? "☀️" : "🌙";
    });
  }
});

// ===== Search submit =====
document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.querySelector(".search-bar");
  const searchInput = document.querySelector(".search-bar input");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query.length > 0) {
        localStorage.setItem("medidexSearchQuery", query);
        if (!location.pathname.endsWith("/medicines.html"))
          window.location.href = "medicines.html";
        else applyFilters();
      }
    });
  }
});

// ===== Filters + render =====
function uniqueCategories(items) {
  return Array.from(new Set(items.map((m) => m.category))).sort();
}
function setGridSingleClass(grid, count) {
  grid.classList.toggle("single", count === 1);
}

function renderMedicines(meds) {
  const grid = document.querySelector(".medicine-grid");
  const countEl = document.getElementById("results-count");
  if (!grid) return;
  grid.innerHTML = "";
  if (countEl)
    countEl.textContent = `${meds.length} result${
      meds.length === 1 ? "" : "s"
    }`;
  setGridSingleClass(grid, meds.length);
  if (meds.length === 0) {
    grid.innerHTML = `<p style="text-align:center; grid-column:1/-1; font-weight:600;">No medicines found.</p>`;
    return;
  }
  meds.forEach((med) => {
    const card = document.createElement("div");
    card.classList.add("medicine-card");
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
        <button class="btn primary buy-now" data-id="${med.id}">Buy now</button>
      </div>`;
    card.addEventListener(
      "click",
      () => (window.location.href = `medicine-details.html?id=${med.id}`)
    );
    card
      .querySelectorAll(".btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) => e.stopPropagation())
      );
    grid.appendChild(card);
  });
}
function applyFilters() {
  const searchInput = document.querySelector(".search-bar input");
  const query = (
    searchInput?.value ||
    localStorage.getItem("medidexSearchQuery") ||
    ""
  ).toLowerCase();
  const catSel = document.getElementById("filter-category");
  const selectedCat = catSel ? catSel.value : "";
  let list = medicines.slice();
  if (query) list = list.filter((m) => m.name.toLowerCase().includes(query));
  if (selectedCat) list = list.filter((m) => m.category === selectedCat);
  renderMedicines(list);
}
function setupFilters() {
  const catSel = document.getElementById("filter-category");
  if (catSel && !catSel.dataset.ready) {
    catSel.innerHTML =
      '<option value="">All categories</option>' +
      uniqueCategories(medicines)
        .map((c) => `<option value="${c}">${c}</option>`)
        .join("");
    catSel.addEventListener("change", applyFilters);
    catSel.dataset.ready = "1";
  }
}

// ===== Cart (localStorage) =====
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
    (sum, it) => sum + (findMed(it.id)?.price || 0) * it.qty,
    0
  );
}
function updateCartBadge() {
  const c = document.getElementById("cart-count");
  if (c) c.textContent = cart.items.reduce((s, it) => s + it.qty, 0);
}
function addToCart(id, qty = 1) {
  const it = cart.items.find((i) => i.id === id);
  if (it) it.qty += qty;
  else cart.items.push({ id, qty });
  saveCart();
  updateCartBadge();
  renderCart?.();
}
function removeFromCart(id) {
  cart.items = cart.items.filter((i) => i.id !== id);
  saveCart();
  updateCartBadge();
  renderCart?.();
}
function setQty(id, qty) {
  const it = cart.items.find((i) => i.id === id);
  if (!it) return;
  it.qty = Math.max(1, qty);
  saveCart();
  updateCartBadge();
  renderCart?.();
}

// Drawer rendering (if present)
function money(n) {
  return `$${n.toFixed(2)}`;
}
function openCart() {
  const d = document.getElementById("cart-drawer");
  if (d) {
    d.setAttribute("aria-hidden", "false");
  }
}
function closeCart() {
  const d = document.getElementById("cart-drawer");
  if (d) {
    d.setAttribute("aria-hidden", "true");
  }
}
function renderCart() {
  const list = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!list || !totalEl) return;
  list.innerHTML = "";
  cart.items.forEach((it) => {
    const med = findMed(it.id);
    if (!med) return;
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img src="${med.image}" alt="${med.name}">
      <div>
        <div class="cart-item-title">${med.name}</div>
        <div class="cart-item-meta">${med.category} · ${money(med.price)}</div>
        <div class="cart-qty">
          <button class="qty-btn" aria-label="Decrease">-</button>
          <span>${it.qty}</span>
          <button class="qty-btn" aria-label="Increase">+</button>
          <button class="icon-btn" style="margin-left:8px">Remove</button>
        </div>
      </div>
      <div>${money(med.price * it.qty)}</div>`;
    const [dec, , inc, rem] = row.querySelectorAll("button");
    dec.onclick = () => setQty(it.id, it.qty - 1);
    inc.onclick = () => setQty(it.id, it.qty + 1);
    rem.onclick = () => removeFromCart(it.id);
    list.appendChild(row);
  });
  totalEl.textContent = money(cartTotal());
}
function buyNow(id) {
  addToCart(id, 1);
  openCheckout();
}

// Checkout (if modal present)
function openCheckout() {
  const m = document.getElementById("checkout-modal");
  if (m) {
    m.setAttribute("aria-hidden", "false");
  }
}
function closeCheckout() {
  const m = document.getElementById("checkout-modal");
  if (m) {
    m.setAttribute("aria-hidden", "true");
  }
}
function setupCartUI() {
  const btn = document.getElementById("cart-button");
  if (btn) btn.onclick = openCart;
  const closeBtn = document.getElementById("cart-close");
  if (closeBtn) closeBtn.onclick = closeCart;
  const backdrop = document.querySelector("#cart-drawer .cart-drawer-backdrop");
  if (backdrop) backdrop.onclick = closeCart;
  const checkoutBtn = document.getElementById("checkout-button");
  if (checkoutBtn) checkoutBtn.onclick = openCheckout;

  const modalClose = document.getElementById("checkout-close");
  if (modalClose) modalClose.onclick = closeCheckout;
  const modalBackdrop = document.querySelector(
    "#checkout-modal .modal-backdrop"
  );
  if (modalBackdrop) modalBackdrop.onclick = closeCheckout;
  const cancelBtn = document.getElementById("checkout-cancel");
  if (cancelBtn) cancelBtn.onclick = closeCheckout;

  const form = document.getElementById("checkout-form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const enrichedItems = cart.items.map((it) => {
        const med = findMed(it.id);
        return {
          id: it.id,
          name: med?.name || `Medicine #${it.id}`,
          price: Number(med?.price || 0),
          qty: it.qty,
        };
      });

      try {
        const resp = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: {
              name: data.name,
              phone: data.phone,
              location: data.location,
              doctorRecommended: data.doctorRecommended || "no",
            },
            items: enrichedItems,
          }),
        });
        let errorText = "";
        if (!resp.ok) {
          try {
            const j = await resp.json();
            errorText = j?.error || JSON.stringify(j);
          } catch {
            errorText = await resp.text();
          }
          throw new Error(errorText || `HTTP ${resp.status}`);
        }
        const { order } = await resp.json();
        alert(`Thank you! Order placed.\nOrder ID: ${order.id}`);
        cart.items = [];
        saveCart();
        updateCartBadge();
        renderCart?.();
        closeCheckout?.();
        closeCart?.();
        window.location.href = "cart.html";
      } catch (err) {
        alert(`Checkout failed: ${err?.message || "Unknown error"}`);
        console.error("Checkout error:", err);
      }
    };
  }
}

// Delegated cart buttons (all pages)
document.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".add-to-cart");
  if (addBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = Number(addBtn.dataset.id);
    if (id) addToCart(id, 1);
    return;
  }
  const buyBtn = e.target.closest(".buy-now");
  if (buyBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = Number(buyBtn.dataset.id);
    if (id) buyNow(id);
    return;
  }
});

// Medicines page
function onMedicinesPageLoad() {
  if (!document.querySelector(".medicine-grid")) return;
  setupFilters();
  const q = localStorage.getItem("medidexSearchQuery") || "";
  localStorage.removeItem("medidexSearchQuery");
  const input = document.querySelector(".search-bar input");
  if (input && q) {
    input.value = q;
  }
  applyFilters();
}

// Cart page
function onCartPageLoad() {
  const host = document.getElementById("cart-page-items");
  const totalEl = document.getElementById("cart-page-total");
  if (!host || !totalEl) return;

  function renderCartPage() {
    host.innerHTML = "";
    cart.items.forEach((it) => {
      const med = findMed(it.id);
      if (!med) return;
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <img src="${med.image}" alt="${med.name}">
        <div>
          <div class="cart-item-title">${med.name}</div>
          <div class="cart-item-meta">${med.category} · $${med.price.toFixed(
        2
      )}</div>
          <div class="cart-qty">
            <button class="qty-btn dec">-</button>
            <span>${it.qty}</span>
            <button class="qty-btn inc">+</button>
            <button class="icon-btn remove" style="margin-left:8px">Remove</button>
          </div>
        </div>
        <div>$${(med.price * it.qty).toFixed(2)}</div>`;
      row.querySelector(".dec").onclick = () => {
        setQty(it.id, it.qty - 1);
        renderCartPage();
      };
      row.querySelector(".inc").onclick = () => {
        setQty(it.id, it.qty + 1);
        renderCartPage();
      };
      row.querySelector(".remove").onclick = () => {
        removeFromCart(it.id);
        renderCartPage();
      };
      host.appendChild(row);
    });
    totalEl.textContent = `$${cartTotal().toFixed(2)}`;
    updateCartBadge();
  }

  renderCartPage();

  const form = document.getElementById("cart-checkout-form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const enrichedItems = cart.items.map((it) => {
        const med = findMed(it.id);
        return {
          id: it.id,
          name: med?.name || `Medicine #${it.id}`,
          price: Number(med?.price || 0),
          qty: it.qty,
        };
      });

      try {
        const resp = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: {
              name: data.name,
              phone: data.phone,
              location: data.location,
              doctorRecommended: data.doctorRecommended || "no",
            },
            items: enrichedItems,
          }),
        });
        let errorText = "";
        if (!resp.ok) {
          try {
            const j = await resp.json();
            errorText = j?.error || JSON.stringify(j);
          } catch {
            errorText = await resp.text();
          }
          throw new Error(errorText || `HTTP ${resp.status}`);
        }
        const { order } = await resp.json();
        alert(`Thank you! Order placed.\nOrder ID: ${order.id}`);
        cart.items = [];
        saveCart();
        renderCartPage();
        window.location.href = "index.html";
      } catch (err) {
        alert(`Checkout failed: ${err?.message || "Unknown error"}`);
        console.error("Checkout error:", err);
      }
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  setupCartUI();
  onMedicinesPageLoad();
});

// Suggestions (minimal)
document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector(".search-bar input");
  const box = document.querySelector(".search-bar .suggestions");
  if (!input || !box) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      box.innerHTML = "";
      box.classList.remove("active");
      return;
    }
    const matches = medicines
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 5);
    if (matches.length === 0) {
      box.innerHTML = "<div>No matches</div>";
      box.classList.add("active");
      return;
    }
    box.innerHTML = matches
      .map((m) => `<div tabindex="0">${m.name}</div>`)
      .join("");
    box.classList.add("active");
  });
  box.addEventListener("click", (e) => {
    if (e.target.tagName === "DIV") {
      input.value = e.target.textContent;
      box.innerHTML = "";
      box.classList.remove("active");
      applyFilters();
    }
  });
  document.addEventListener("click", (e) => {
    if (!box.contains(e.target) && e.target !== input) {
      box.innerHTML = "";
      box.classList.remove("active");
    }
  });
});
