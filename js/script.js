// ===== API base =====
const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://medidex-production.up.railway.app";

// First-visit: clear any previous cart on this device
(function ensureFirstVisitCartClear() {
  try {
    if (!localStorage.getItem("medidex_firstSeenAt")) {
      localStorage.removeItem("medidexCart");
      localStorage.setItem("medidex_firstSeenAt", String(Date.now()));
    }
  } catch {}
})();

// First open per browser session: start with empty cart
(function ensureFirstSessionCartClear() {
  try {
    if (!sessionStorage.getItem("medidex_sessionStarted")) {
      localStorage.removeItem("medidexCart");
      sessionStorage.setItem("medidex_sessionStarted", "1");
    }
  } catch {}
})();

// Clear cart on full page refresh (reload) only
(function clearCartOnReload() {
  try {
    const nav =
      (performance.getEntriesByType &&
        performance.getEntriesByType("navigation")[0]) ||
      null;
    const isReload = nav
      ? nav.type === "reload"
      : performance &&
        performance.navigation &&
        performance.navigation.type === 1;
    if (isReload) localStorage.removeItem("medidexCart");
  } catch {}
})();

// ===== Sample data (unchanged) =====
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

// ===== Reveal on scroll (animations) =====
let revealObserver;
function setupRevealObserver() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.1 }
  );
  document
    .querySelectorAll(".reveal")
    .forEach((el) => revealObserver.observe(el));
}
function markRevealsNow() {
  document.querySelectorAll(".reveal").forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9)
      el.classList.add("is-visible");
  });
}
function addReveal(el) {
  if (!el.classList.contains("reveal")) el.classList.add("reveal");
  if (revealObserver) revealObserver.observe(el);
}

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
  el.textContent = text;
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

// ===== Render medicines =====
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
    setupRevealObserver();
    markRevealsNow();
    return;
  }
  meds.forEach((med) => {
    const card = document.createElement("div");
    card.classList.add("medicine-card");
    addReveal(card);
    card.setAttribute("data-id", String(med.id));
    card.innerHTML = `
      <div class="img-wrap"><img src="${med.image}" alt="${
      med.name
    }" loading="lazy" /></div>
      <span class="badge">${med.category}</span>
      <h3><a href="medicine-details.html?id=${med.id}">${med.name}</a></h3>
      <p><strong>Category:</strong> ${med.category}</p>
      <p>${med.description.substring(0, 80)}...</p>
      <div class="price">${money(med.price)}</div>
      <div class="card-actions">
        <button class="btn add-to-cart" data-id="${med.id}">Add to cart</button>
      </div>`;
    card.addEventListener(
      "click",
      () => (window.location.href = `medicine-details.html?id=${med.id}`)
    );
    const addBtn = card.querySelector(".add-to-cart");
    if (addBtn)
      addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(med.id, 1);
      });
    grid.appendChild(card);
  });
  setupRevealObserver();
  markRevealsNow();
}

// ===== Filters =====
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
    catSel.addEventListener("change", () => {
      applyFilters();
      updateActivePill?.(catSel.value);
    });
    catSel.dataset.ready = "1";
  }
  setupCategoryPills();
}

// Desktop category pills
function setupCategoryPills() {
  const host = document.querySelector(".category-pills");
  if (!host || host.dataset.ready) return;
  const cats = [""].concat(uniqueCategories(medicines));
  host.innerHTML = cats
    .map((c) => {
      const label = c || "All";
      return `<button type="button" class="pill" data-value="${c}">${label}</button>`;
    })
    .join("");
  host.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    const value = pill.getAttribute("data-value") || "";
    const sel = document.getElementById("filter-category");
    if (sel) {
      sel.value = value;
      applyFilters();
    }
    updateActivePill(value);
  });
  host.dataset.ready = "1";
  // initialize active state
  const sel = document.getElementById("filter-category");
  updateActivePill(sel ? sel.value : "");
}

function updateActivePill(value) {
  const host = document.querySelector(".category-pills");
  if (!host) return;
  host.querySelectorAll(".pill").forEach((el) => {
    if ((el.getAttribute("data-value") || "") === String(value))
      el.classList.add("active");
    else el.classList.remove("active");
  });
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
  const existing = cart.items.find((i) => i.id === id);
  if (existing) existing.qty += qty;
  else cart.items.push({ id, qty });
  saveCart();
  updateCartBadge();
  renderCart?.();
  showToast("Added to cart"); // ensures popup on index and medicines pages
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

// Drawer rendering
function openCart() {
  const d = document.getElementById("cart-drawer");
  if (d) d.setAttribute("aria-hidden", "false");
}
function closeCart() {
  const d = document.getElementById("cart-drawer");
  if (d) d.setAttribute("aria-hidden", "true");
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
    addReveal(row);
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
  setupRevealObserver();
  markRevealsNow();
}

// Checkout modal
function openCheckout() {
  const m = document.getElementById("checkout-modal");
  if (m) m.setAttribute("aria-hidden", "false");
}
function closeCheckout() {
  const m = document.getElementById("checkout-modal");
  if (m) m.setAttribute("aria-hidden", "true");
}

// Create order
async function apiCreateOrder(payload) {
  const resp = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`API ${resp.status}: ${text || "Unknown error"}`);
  }
  return resp.json();
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
      const customer = {
        name: String(data.name || "").trim(),
        phone: String(data.phone || "").trim(),
        location: String(data.location || "").trim(),
        doctorRecommended: data.doctorRecommended || "no",
      };
      if (!customer.name || !customer.phone || !customer.location) {
        alert("Please fill name, phone and location.");
        return;
      }
      if (cart.items.length === 0) {
        alert("Your cart is empty.");
        return;
      }
      const items = cart.items.map((it) => {
        const med = findMed(it.id) || {};
        return {
          id: it.id,
          name: med.name || "",
          price: Number(med.price || 0),
          qty: Number(it.qty || 1),
        };
      });
      const payload = { customer, items };

      const submitBtn = form.querySelector('button[type="submit"]');
      const original = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) submitBtn.textContent = "Processing...";
      try {
        const { order } = await apiCreateOrder(payload);
        cart.items = [];
        saveCart();
        updateCartBadge();
        renderCart?.();
        if (submitBtn) submitBtn.textContent = original;
        alert(`Thank you! Order placed.\nOrder ID: ${order.id}`);
        closeCheckout?.();
        closeCart?.();
        window.location.href = "cart.html";
      } catch (err) {
        if (submitBtn) submitBtn.textContent = original;
        console.error("Checkout failed:", err);
        alert(`Checkout failed: ${err.message}`);
      }
    };
  }
}

// Delegated buttons (no Buy Now)
document.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".add-to-cart");
  if (addBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = Number(addBtn.dataset.id);
    if (id) {
      addToCart(id, 1);
    }
    return;
  }
});

// Page initializers
function onMedicinesPageLoad() {
  if (!document.querySelector(".medicine-grid")) return;
  setupFilters();
  const q = localStorage.getItem("medidexSearchQuery") || "";
  localStorage.removeItem("medidexSearchQuery");
  const input = document.querySelector(".search-bar input");
  if (input && q) input.value = q;
  applyFilters();
}

function onCartPageLoad() {
  // Ensure we load the latest cart state when landing on cart page
  loadCart();
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
      addReveal(row);
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
    setupRevealObserver();
    markRevealsNow();
  }
  renderCartPage();

  const form = document.getElementById("cart-checkout-form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const items = cart.items.map((it) => {
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
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: {
              name: data.name,
              phone: data.phone,
              location: data.location,
              doctorRecommended: data.doctorRecommended || "no",
            },
            items,
          }),
        });
        if (!resp.ok) {
          const t = await resp.text().catch(() => "");
          throw new Error(t || `HTTP ${resp.status}`);
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

// Mobile bottom action bar for details page (single controls for all devices)
function setupDetailsMobileBar(medId) {
  const bar = document.getElementById("mobile-action-bar");
  const btn = document.getElementById("mobile-add-btn");
  if (!bar || !btn) return;
  btn.dataset.id = String(medId);
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const id = Number(btn.dataset.id);
    if (id) {
      addToCart(id, 1);
      showToast("Added to cart");
    }
  };
  function refreshBar() {
    document.body.classList.add("has-mobile-bar");
    bar.setAttribute("aria-hidden", "false");
  }
  refreshBar();
  window.addEventListener("resize", refreshBar);
}

document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  setupCartUI();
  onMedicinesPageLoad();
  // details fallback (in case inline script didn't run)
  (function ensureDetailsFallback() {
    const container = document.getElementById("medicine-details");
    if (!container || container.children.length) return;
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));
    if (!id) return;
    const med = medicines.find((m) => m.id === id);
    if (!med) {
      container.innerHTML = "<p>Medicine not found.</p>";
      return;
    }
    container.innerHTML = `
      <h1 class="reveal">${med.name}</h1>
      <p class="badge" style="justify-self:start;">${med.category}</p>
      <p class="reveal">${med.description}</p>
      <div class="card-actions" style="justify-content:flex-start;">
        <button class="btn add-to-cart" data-id="${med.id}">Add to cart</button>
        <a class="btn" href="cart.html">Go to cart</a>
      </div>
      <img class="reveal" src="${med.image}" alt="${med.name}" />`;
    const addBtn = container.querySelector(".add-to-cart");
    if (addBtn)
      addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        addToCart(med.id, 1);
      });
    if (typeof setupDetailsMobileBar === "function") setupDetailsMobileBar(id);
  })();
  // featured cards animate
  setTimeout(() => {
    document.querySelectorAll(".medicine-card").forEach(addReveal);
    setupRevealObserver();
    markRevealsNow();
  }, 200);
});

// Suggestions
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
