(function () {
  const API_BASE =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://localhost:3001"
      : "https://medidex-production.up.railway.app";

  const keyForm = document.getElementById("owner-key-form");
  const ordersList = document.getElementById("orders-list");
  const ordersEmpty = document.getElementById("orders-empty");
  const ordersError = document.getElementById("orders-error");
  const tbody = document.getElementById("orders-tbody");
  const itemsHost = document.getElementById("order-items");
  const dateInput = document.getElementById("orders-date");
  const applyBtn = document.getElementById("orders-date-apply");
  const clearBtn = document.getElementById("orders-date-clear");

  function fmtDateParts(iso) {
    try {
      const d = new Date(iso);
      return {
        ymd: d.toISOString().slice(0, 10),
        date: d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }),
        time: d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { ymd: "", date: iso, time: "" };
    }
  }
  function money(n) {
    const x = Number(n || 0);
    return `$${x.toFixed(2)}`;
  }

  async function fetchOrders(key) {
    const url = `${API_BASE}/api/orders?key=${encodeURIComponent(key)}`;
    const resp = await fetch(url, { method: "GET", mode: "cors" });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(msg || `HTTP ${resp.status}`);
    }
    return resp.json();
  }

  function loadDoneMap() {
    try {
      return JSON.parse(localStorage.getItem("medidex_done_orders") || "{}");
    } catch {
      return {};
    }
  }
  function saveDoneMap(map) {
    localStorage.setItem("medidex_done_orders", JSON.stringify(map));
  }

  let allOrders = [];
  let lastSeenIds = new Set();

  function filterByDate(list) {
    const val = dateInput?.value || "";
    if (!val) return list;
    return list.filter((o) => fmtDateParts(o.createdAt).ymd === val);
  }

  function renderOrders() {
    const doneMap = loadDoneMap();
    const list = filterByDate(allOrders);
    tbody.innerHTML = "";
    itemsHost.innerHTML = "";
    if (list.length === 0) {
      ordersEmpty.style.display = "block";
      ordersList.style.display = "none";
      return;
    }
    ordersEmpty.style.display = "none";
    ordersList.style.display = "block";

    list.forEach((o) => {
      const { date, time } = fmtDateParts(o.createdAt);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding:10px; border-bottom:1px solid var(--border);">${date}</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${time}</td>
        <td style="padding:10px; border-bottom:1px solid var(--border); font-family: ui-monospace, Menlo, Consolas, 'Courier New', monospace;">${
          o.id
        }</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.name
        }</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.location
        }</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.phone
        }</td>
        <td style="padding:10px; text-align:right; border-bottom:1px solid var(--border);">${money(
          o.total
        )}</td>
        <td style="padding:10px; text-align:center; border-bottom:1px solid var(--border);">
          <input type="checkbox" class="order-done" data-id="${o.id}" ${
        doneMap[o.id] ? "checked" : ""
      } />
        </td>
      `;
      tr.addEventListener("click", (e) => {
        if (e.target.closest(".order-done")) return;
        if (!o.items || !o.items.length) {
          itemsHost.innerHTML = '<div class="cart-item-meta">No items</div>';
          return;
        }
        itemsHost.innerHTML = `
          <div style="border:1px solid var(--border); border-radius: 10px; background: var(--surface);">
            <div style="padding:10px; border-bottom:1px solid var(--border); font-weight:700;">Items in ${
              o.id
            }</div>
            <div style="padding:10px; display:grid; gap:8px;">
              ${o.items
                .map(
                  (
                    it
                  ) => `<div style="display:grid; grid-template-columns: 1fr auto auto; gap:8px;">
                <div>${it.name}</div>
                <div>x${it.qty ?? it.quantity ?? 1}</div>
                <div>${money(it.price)}</div>
              </div>`
                )
                .join("")}
            </div>
          </div>`;
      });
      const cb = tr.querySelector(".order-done");
      cb.addEventListener("change", () => {
        const map = loadDoneMap();
        if (cb.checked) map[o.id] = true;
        else delete map[o.id];
        saveDoneMap(map);
      });
      tbody.appendChild(tr);
    });
  }

  function showPopup(msg) {
    let host = document.getElementById("toast");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast";
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .2s";
    }, 700);
    setTimeout(() => {
      el.remove();
    }, 900);
  }

  async function refreshOrders() {
    const key = sessionStorage.getItem("ownerKey") || "";
    if (!key) return;
    try {
      const data = await fetchOrders(key);
      const incoming = data?.orders || [];
      // Detect new orders
      const incomingIds = new Set(incoming.map((o) => o.id));
      const newOnes = incoming.filter((o) => !lastSeenIds.has(o.id));
      allOrders = incoming;
      lastSeenIds = incomingIds;
      renderOrders();
      if (newOnes.length > 0) {
        showPopup(
          `${newOnes.length} new order${newOnes.length > 1 ? "s" : ""}`
        );
      }
    } catch (err) {
      ordersError.textContent = `Error loading orders: ${err.message}`;
      ordersError.style.display = "block";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("medidexTheme");
    if (saved === "dark") document.body.classList.add("dark");

    if (keyForm) {
      keyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        ordersError.style.display = "none";
        const key = new FormData(keyForm).get("key");
        try {
          sessionStorage.setItem("ownerKey", key);
          await refreshOrders();
          setInterval(refreshOrders, 20000);
        } catch (err) {
          ordersError.textContent = `Error loading orders: ${err.message}`;
          ordersError.style.display = "block";
        }
      });
    }

    if (applyBtn) applyBtn.addEventListener("click", () => renderOrders());
    if (clearBtn)
      clearBtn.addEventListener("click", () => {
        dateInput.value = "";
        renderOrders();
      });

    // Auto-use saved key if present
    const savedKey = sessionStorage.getItem("ownerKey") || "";
    if (savedKey) {
      refreshOrders();
      setInterval(refreshOrders, 20000);
    }
  });
})();
