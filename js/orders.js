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

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
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
  function renderOrders(data) {
    tbody.innerHTML = "";
    itemsHost.innerHTML = "";
    const list = data?.orders || [];
    if (list.length === 0) {
      ordersEmpty.style.display = "block";
      ordersList.style.display = "none";
      return;
    }
    ordersEmpty.style.display = "none";
    ordersList.style.display = "block";
    list.forEach((o) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding:10px; border-bottom:1px solid var(--border);">${fmtDate(
          o.createdAt
        )}</td>
        <td style="padding:10px; border-bottom:1px solid var(--border); font-family: ui-monospace, Menlo, Consolas, 'Courier New', monospace;">${
          o.id
        }</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.name
        }</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.phone
        }</td>
        <td style="padding:10px; text-align:right; border-bottom:1px solid var(--border);">${money(
          o.total
        )}</td>
      `;
      tr.addEventListener("click", () => {
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
      tbody.appendChild(tr);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("medidexTheme");
    if (saved === "dark") document.body.classList.add("dark");

    const savedKey = sessionStorage.getItem("ownerKey") || "";
    if (savedKey) {
      fetchOrders(savedKey)
        .then(renderOrders)
        .catch((err) => {
          ordersError.textContent = `Error loading orders: ${err.message}`;
          ordersError.style.display = "block";
        });
    }
    if (keyForm) {
      keyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        ordersError.style.display = "none";
        const key = new FormData(keyForm).get("key");
        try {
          const data = await fetchOrders(key);
          sessionStorage.setItem("ownerKey", key);
          renderOrders(data);
        } catch (err) {
          ordersError.textContent = `Error loading orders: ${err.message}`;
          ordersError.style.display = "block";
        }
      });
    }
  });
})();
