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

  function renderOrders(data) {
    tbody.innerHTML = "";
    itemsHost.innerHTML = "";
    let list = data?.orders || [];
    // sort by createdAt desc
    list = list
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
				<td style="padding:10px; border-bottom:1px solid var(--border);">${o.name}</td>
				<td style="padding:10px; border-bottom:1px solid var(--border);">${
          o.location || ""
        }</td>
				<td style="padding:10px; border-bottom:1px solid var(--border);">${o.phone}</td>
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
        if (!o.items || !o.items.length) {
          itemsHost.innerHTML =
            '<div style="color: var(--muted);">No items</div>';
          return;
        }
        itemsHost.innerHTML = `
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
					</div>`;
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

  document.addEventListener("DOMContentLoaded", () => {
    setThemeToggle();
    const savedKey = sessionStorage.getItem("ownerKey") || "";
    async function loadOnceAndRender(key, prevIds) {
      const data = await fetchOrders(key);
      renderOrders(data);
      const newIds = new Set((data?.orders || []).map((o) => String(o.id)));
      if (prevIds) {
        for (const id of newIds) {
          if (!prevIds.has(id)) {
            toast("New order received");
            break;
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
