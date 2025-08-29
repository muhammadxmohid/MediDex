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
  const sortSelect = document.getElementById("sort-orders");

  let ordersData = [];

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
    if (!resp.ok) throw new Error(`${resp.status}`);
    return resp.json();
  }

  function toast(msg) {
    let host = document.getElementById("toast");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast";
      Object.assign(host.style, {
        position: "fixed",
        left: "50%",
        bottom: "16px",
        transform: "translateX(-50%)",
        display: "grid",
        gap: "8px",
        zIndex: "999999",
      });
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      background: "#fff",
      color: "#111",
      border: "1px solid #e5e7eb",
      padding: "10px 14px",
      borderRadius: "10px",
      boxShadow: "0 6px 24px rgba(16,24,40,0.12)",
      opacity: "0",
      transform: "translateY(8px)",
      transition: "opacity .2s, transform .2s",
    });
    host.appendChild(el);
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

  function sortOrders(orders, sortType) {
    const sorted = orders.slice();
    switch (sortType) {
      case "oldest":
        return sorted.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      case "newest":
      default:
        return sorted.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
    }
  }

  function displayOrderDetails(order) {
    let detailsHTML = `
      <div style="padding:10px; border-bottom:1px solid var(--border); font-weight:700;">
        Order Details - ${order.id}
      </div>
      <div style="padding:10px;">
        <div style="margin-bottom: 12px;">
          <strong>Customer:</strong> ${order.name}<br>
          <strong>Phone:</strong> ${order.phone}<br>
          <strong>CNIC:</strong> ${order.cnic || "Not provided"}<br>
          <strong>Address:</strong> ${order.location || "Not provided"}
        </div>
    `;

    // Show prescription file if available
    if (order.prescriptionFile) {
      const fileName = order.prescriptionFileName || "prescription";
      const isImage =
        fileName.toLowerCase().includes(".jpg") ||
        fileName.toLowerCase().includes(".jpeg") ||
        fileName.toLowerCase().includes(".png");

      detailsHTML += `
        <div style="margin-bottom: 12px;">
          <strong>Prescription File:</strong><br>
          <div class="file-preview">
            <div style="font-size: 0.875rem; margin-bottom: 4px;">${fileName}</div>
      `;

      if (isImage) {
        detailsHTML += `<img src="${order.prescriptionFile}" alt="Prescription" style="max-width: 100%; height: auto; border-radius: 4px;" />`;
      } else {
        detailsHTML += `
          <div style="padding: 8px; background: var(--surface-2); border-radius: 4px; text-align: center;">
            <i class="fas fa-file-pdf" style="font-size: 24px; color: #dc2626; margin-bottom: 4px;"></i><br>
            <a href="${order.prescriptionFile}" download="${fileName}" 
               style="color: var(--primary); text-decoration: none;">
              Download PDF
            </a>
          </div>
        `;
      }
      detailsHTML += `</div></div>`;
    }

    // Show map location if available
    if (order.mapLocation) {
      try {
        const coords = JSON.parse(order.mapLocation);
        detailsHTML += `
          <div style="margin-bottom: 12px;">
            <strong>Delivery Location:</strong><br>
            <div class="map-location" id="order-map-${order.id}"></div>
          </div>
        `;
      } catch (e) {
        console.error("Error parsing map location:", e);
      }
    }

    // Show items
    if (order.items && order.items.length > 0) {
      detailsHTML += `
        <div style="border-top: 1px solid var(--border); padding-top: 12px;">
          <strong>Items:</strong>
          <div style="margin-top: 8px; display: grid; gap: 8px;">
            ${order.items
              .map(
                (it) => `
              <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 8px; padding: 4px 0;">
                <div>${it.name}</div>
                <div>x${it.qty ?? it.quantity ?? 1}</div>
                <div>${money(it.price)}</div>
              </div>
            `
              )
              .join("")}
          </div>
          <div style="border-top: 1px solid var(--border); margin-top: 8px; padding-top: 8px; font-weight: 600;">
            Total: ${money(order.total)}
          </div>
        </div>
      `;
    }

    detailsHTML += `</div>`;
    itemsHost.innerHTML = detailsHTML;

    // Initialize map for this order if coordinates exist and Leaflet is available
    if (order.mapLocation && window.L) {
      try {
        const coords = JSON.parse(order.mapLocation);
        const mapElement = document.getElementById(`order-map-${order.id}`);
        if (mapElement) {
          // Small delay to ensure element is rendered
          setTimeout(() => {
            const orderMap = L.map(mapElement).setView(
              [coords.lat, coords.lng],
              15
            );

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "© OpenStreetMap contributors",
            }).addTo(orderMap);

            L.marker([coords.lat, coords.lng])
              .addTo(orderMap)
              .bindPopup("Delivery Location")
              .openPopup();
          }, 100);
        }
      } catch (e) {
        console.error("Error creating order map:", e);
      }
    }
  }

  function renderOrders(data) {
    tbody.innerHTML = "";
    itemsHost.innerHTML = "";
    ordersData = data?.orders || [];

    const sortType = sortSelect ? sortSelect.value : "newest";
    let list = sortOrders(ordersData, sortType);

    if (list.length === 0) {
      ordersEmpty.style.display = "block";
      ordersList.style.display = "none";
      return;
    }

    ordersEmpty.style.display = "none";
    ordersList.style.display = "block";

    list.forEach((o) => {
      const tr = document.createElement("tr");
      const doneKey = `order_done_${o.id}`;
      const isDone = localStorage.getItem(doneKey) === "1";

      tr.innerHTML = `
        <td style="padding:10px; border-bottom:1px solid var(--border);">${fmtDate(
          o.createdAt
        )}</td>
        <td style="padding:10px; border-bottom:1px solid var(--border); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${
          o.id
        }</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.name
        }</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.phone
        }</td>
        <td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.cnic || "N/A"
        }</td>
        <td style="padding:10px; text-align:right; border-bottom:1px solid var(--border);">${money(
          o.total
        )}</td>
        <td style="padding:10px; text-align:center; border-bottom:1px solid var(--border);"><input type="checkbox" ${
          isDone ? "checked" : ""
        } /></td>
      `;

      const checkbox = tr.querySelector('input[type="checkbox"]');
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        const v = checkbox.checked;
        localStorage.setItem(doneKey, v ? "1" : "0");
      });

      tr.addEventListener("click", () => {
        displayOrderDetails(o);
      });

      tbody.appendChild(tr);
    });
  }

  function setThemeToggle() {
    document.addEventListener("DOMContentLoaded", () => {
      const root = document.body;
      const toggle = document.getElementById("theme-toggle");
      const saved = localStorage.getItem("medidexTheme");

      if (saved === "dark") {
        root.classList.add("dark");
        if (toggle) toggle.textContent = "☀️";
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
  }

  // Enhanced notification system
  function playNotificationSound() {
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCz2C3/jJbyEBWaDc7Z9NEQ1Ms+3y0oUsAhNx2vfHeiwALIfM7teSQgwZZ7vu56ZVFAxGneH3w2IeEDqO3/fPaiQBVaLu9qJOEgpEqOvz0Ys"
      );
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Silent fail if audio not allowed
    } catch (e) {
      // Silent fail
    }
  }

  function showNewOrderNotification(orderId) {
    // Visual notification
    toast("New order received: " + orderId);

    // Audio notification
    playNotificationSound();

    // Browser notification if permission granted
    if (Notification.permission === "granted") {
      new Notification("New Order - MediDex", {
        body: `Order ${orderId} has been placed`,
        icon: "/favicon.ico",
      });
    }
  }

  // Request notification permission
  function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setThemeToggle();
    requestNotificationPermission();

    const savedKey = sessionStorage.getItem("ownerKey") || "";

    // Sort functionality
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        renderOrders({ orders: ordersData });
      });
    }

    async function loadOnceAndRender(key, prevIds) {
      const data = await fetchOrders(key);
      renderOrders(data);

      const newIds = new Set((data?.orders || []).map((o) => String(o.id)));
      if (prevIds) {
        for (const id of newIds) {
          if (!prevIds.has(id)) {
            showNewOrderNotification(id);
          }
        }
      }
      return newIds;
    }

    if (savedKey) {
      loadOnceAndRender(savedKey, null).catch(() => {
        ordersError.style.display = "block";
      });

      // auto refresh every 20s and notify for new orders
      let prev = null;
      setInterval(async () => {
        try {
          prev = await loadOnceAndRender(savedKey, prev || null);
        } catch {}
      }, 20000);
    }

    if (keyForm) {
      keyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        ordersError.style.display = "none";
        const key = new FormData(keyForm).get("key");
        try {
          let prev = null;
          prev = await loadOnceAndRender(key, prev);
          sessionStorage.setItem("ownerKey", key);

          // start auto refresh
          setInterval(async () => {
            try {
              prev = await loadOnceAndRender(key, prev || null);
            } catch {}
          }, 20000);
        } catch {
          ordersError.style.display = "block";
        }
      });
    }
  });
})();
