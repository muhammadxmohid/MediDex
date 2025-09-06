(function () {
  const API_BASE =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://localhost:3001"
      : "https://medidex-production.up.railway.app";

  // State management
  let currentUser = null;
  let ordersData = [];
  let inventoryData = [];
  let usersData = [];
  let currentSection = "orders";

  // DOM elements
  const loginSection = document.getElementById("login-section");
  const adminPanel = document.getElementById("admin-panel");
  const loginForm = document.getElementById("admin-login-form");

  // Navigation
  const navItems = document.querySelectorAll(".admin-nav-item");
  const sections = document.querySelectorAll(".admin-section");

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    setThemeToggle();
    setupEventListeners();
    checkAutoLogin();
  });

  // Event Listeners Setup
  function setupEventListeners() {
    // Login form
    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }

    // Navigation
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const section = item.getAttribute("data-section");
        switchSection(section);
      });
    });

    // Orders section
    setupOrdersListeners();

    // Inventory section
    setupInventoryListeners();

    // Users section
    setupUsersListeners();

    // Settings section
    setupSettingsListeners();
  }

  // Authentication
  async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const key = formData.get("key");

    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        throw new Error("Invalid access key");
      }

      const data = await response.json();
      currentUser = data.user;
      sessionStorage.setItem("adminToken", data.token);

      showAdminPanel();
      await loadAllData();
    } catch (error) {
      showToast("Login failed: " + error.message);
    }
  }

  function checkAutoLogin() {
    const token = sessionStorage.getItem("adminToken");
    if (token) {
      // Verify token and show panel
      verifyToken(token).then((isValid) => {
        if (isValid) {
          showAdminPanel();
          loadAllData();
        }
      });
    }
  }

  async function verifyToken(token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  function showAdminPanel() {
    loginSection.style.display = "none";
    adminPanel.style.display = "block";
  }

  // Section Navigation
  function switchSection(sectionName) {
    currentSection = sectionName;

    // Update nav
    navItems.forEach((item) => {
      if (item.getAttribute("data-section") === sectionName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update sections
    sections.forEach((section) => {
      if (section.id === `${sectionName}-section`) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });

    // Load section data
    loadSectionData(sectionName);
  }

  async function loadSectionData(section) {
    switch (section) {
      case "orders":
        await loadOrders();
        break;
      case "inventory":
        await loadInventory();
        break;
      case "analytics":
        await loadAnalytics();
        break;
      case "users":
        await loadUsers();
        break;
      case "settings":
        await loadSettings();
        break;
    }
  }

  // Data Loading
  async function loadAllData() {
    await Promise.all([
      loadOrders(),
      loadInventory(),
      loadUsers(),
      loadAnalytics(),
    ]);
  }

  // Orders Management
  function setupOrdersListeners() {
    const filterStatus = document.getElementById("filter-status");
    const sortOrders = document.getElementById("sort-orders");

    if (filterStatus) {
      filterStatus.addEventListener("change", filterOrders);
    }
    if (sortOrders) {
      sortOrders.addEventListener("change", filterOrders);
    }
  }

  async function loadOrders() {
    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(`${API_BASE}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load orders");

      const data = await response.json();
      ordersData = data.orders;
      renderOrders(ordersData);
      updateOrderStats(ordersData);
    } catch (error) {
      showToast("Error loading orders: " + error.message);
      document.getElementById("orders-error").style.display = "block";
    }
  }

  function renderOrders(orders) {
    const tbody = document.getElementById("orders-tbody");
    const ordersList = document.getElementById("orders-list");
    const ordersEmpty = document.getElementById("orders-empty");

    if (!orders || orders.length === 0) {
      ordersList.style.display = "none";
      ordersEmpty.style.display = "block";
      return;
    }

    ordersList.style.display = "block";
    ordersEmpty.style.display = "none";

    tbody.innerHTML = "";

    orders.forEach((order) => {
      const row = document.createElement("tr");
      row.style.cursor = "pointer";
      row.innerHTML = `
        <td style="padding:12px; border-bottom:1px solid var(--border);">
          ${new Date(order.createdAt).toLocaleDateString()}
        </td>
        <td style="padding:12px; border-bottom:1px solid var(--border); font-family: monospace;">
          ${order.id}
        </td>
        <td style="padding:12px; border-bottom:1px solid var(--border);">
          ${order.name}
        </td>
        <td style="padding:12px; border-bottom:1px solid var(--border);">
          <span class="status-badge status-${order.status.toLowerCase()}">${order.status.replace(
        "_",
        " "
      )}</span>
        </td>
        <td style="padding:12px; text-align:right; border-bottom:1px solid var(--border);">
          $${Number(order.total).toFixed(2)}
        </td>
        <td style="padding:12px; text-align:center; border-bottom:1px solid var(--border);">
          <select onchange="updateOrderStatus('${
            order.id
          }', this.value)" onclick="event.stopPropagation()">
            <option value="RECEIVED" ${
              order.status === "RECEIVED" ? "selected" : ""
            }>Received</option>
            <option value="PROCESSING" ${
              order.status === "PROCESSING" ? "selected" : ""
            }>Processing</option>
            <option value="OUT_FOR_DELIVERY" ${
              order.status === "OUT_FOR_DELIVERY" ? "selected" : ""
            }>Out for Delivery</option>
            <option value="COMPLETED" ${
              order.status === "COMPLETED" ? "selected" : ""
            }>Completed</option>
            <option value="CANCELLED" ${
              order.status === "CANCELLED" ? "selected" : ""
            }>Cancelled</option>
          </select>
        </td>
      `;

      row.addEventListener("click", () => showOrderDetails(order));
      tbody.appendChild(row);
    });
  }

  function showOrderDetails(order) {
    const detailsContainer = document.getElementById("order-details");

    let detailsHTML = `
      <div style="padding-bottom: 16px; border-bottom: 1px solid var(--border); margin-bottom: 16px;">
        <h3>Order ${order.id}</h3>
        <div style="font-size: 0.9rem; color: var(--muted);">
          ${new Date(order.createdAt).toLocaleString()}
        </div>
      </div>
      
      <div style="margin-bottom: 16px;">
        <h4>Customer Information</h4>
        <div style="background: var(--surface-2); padding: 12px; border-radius: 6px; margin: 8px 0;">
          <strong>Name:</strong> ${order.name}<br>
          <strong>Phone:</strong> ${order.phone}<br>
          <strong>CNIC:</strong> ${order.cnic || "Not provided"}<br>
          <strong>Address:</strong> ${order.location}
        </div>
      </div>`;

    // Prescription file
    if (order.prescriptionFile) {
      const fileName = order.prescriptionFileName || "prescription";
      const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/);

      detailsHTML += `
        <div style="margin-bottom: 16px;">
          <h4>Prescription File</h4>
          <div style="background: var(--surface-2); padding: 12px; border-radius: 6px;">
            <div style="font-size: 0.9rem; margin-bottom: 8px;">${fileName}</div>
      `;

      if (isImage) {
        detailsHTML += `<img src="${order.prescriptionFile}" alt="Prescription" style="max-width: 100%; border-radius: 4px;" />`;
      } else {
        detailsHTML += `
          <div style="text-align: center; padding: 16px;">
            <i class="fas fa-file-pdf" style="font-size: 32px; color: #dc2626; margin-bottom: 8px;"></i><br>
            <a href="${order.prescriptionFile}" download="${fileName}" class="btn">Download PDF</a>
          </div>
        `;
      }
      detailsHTML += `</div></div>`;
    }

    // Map location
    if (order.mapLocation) {
      detailsHTML += `
        <div style="margin-bottom: 16px;">
          <h4>Delivery Location</h4>
          <div id="order-map-${order.id}" style="height: 150px; border: 1px solid var(--border); border-radius: 6px;"></div>
        </div>
      `;
    }

    // Order items
    if (order.items && order.items.length > 0) {
      detailsHTML += `
        <div style="margin-bottom: 16px;">
          <h4>Order Items</h4>
          <div style="background: var(--surface-2); padding: 12px; border-radius: 6px;">
            ${order.items
              .map(
                (item) => `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border);">
                <span>${item.name}</span>
                <span>x${item.qty} - ${Number(item.price * item.qty).toFixed(
                  2
                )}</span>
              </div>
            `
              )
              .join("")}
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; margin-top: 8px; border-top: 2px solid var(--border);">
              <span>Total:</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    }

    detailsContainer.innerHTML = detailsHTML;

    // Initialize map if location exists
    if (order.mapLocation && window.L) {
      try {
        const coords = JSON.parse(order.mapLocation);
        setTimeout(() => {
          const mapElement = document.getElementById(`order-map-${order.id}`);
          if (mapElement) {
            const orderMap = L.map(mapElement).setView(
              [coords.lat, coords.lng],
              15
            );
            L.tileLayer(
              "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            ).addTo(orderMap);
            L.marker([coords.lat, coords.lng])
              .addTo(orderMap)
              .bindPopup("Delivery Location");
          }
        }, 100);
      } catch (e) {
        console.error("Error creating map:", e);
      }
    }
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(
        `${API_BASE}/api/admin/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to update status");

      showToast("Order status updated successfully");
      await loadOrders(); // Refresh orders
    } catch (error) {
      showToast("Error updating status: " + error.message);
    }
  }

  function filterOrders() {
    const statusFilter = document.getElementById("filter-status").value;
    const sortValue = document.getElementById("sort-orders").value;

    let filteredOrders = ordersData;

    // Filter by status
    if (statusFilter) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === statusFilter
      );
    }

    // Sort orders
    filteredOrders = filteredOrders.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortValue === "oldest" ? dateA - dateB : dateB - dateA;
    });

    renderOrders(filteredOrders);
  }

  function updateOrderStats(orders) {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) =>
      ["RECEIVED", "PROCESSING", "OUT_FOR_DELIVERY"].includes(o.status)
    ).length;
    const completedOrders = orders.filter(
      (o) => o.status === "COMPLETED"
    ).length;

    const today = new Date().toDateString();
    const todayRevenue = orders
      .filter(
        (o) =>
          new Date(o.createdAt).toDateString() === today &&
          o.status === "COMPLETED"
      )
      .reduce((sum, o) => sum + Number(o.total), 0);

    document.getElementById("total-orders").textContent = totalOrders;
    document.getElementById("pending-orders").textContent = pendingOrders;
    document.getElementById("completed-orders").textContent = completedOrders;
    document.getElementById(
      "today-revenue"
    ).textContent = `${todayRevenue.toFixed(2)}`;
  }

  // Inventory Management
  function setupInventoryListeners() {
    const addMedicineBtn = document.getElementById("add-medicine-btn");
    const inventoryFilter = document.getElementById("inventory-filter");
    const inventorySearch = document.getElementById("inventory-search");

    if (addMedicineBtn) {
      addMedicineBtn.addEventListener("click", showAddMedicineModal);
    }

    if (inventoryFilter) {
      inventoryFilter.addEventListener("change", filterInventory);
    }

    if (inventorySearch) {
      inventorySearch.addEventListener("input", filterInventory);
    }
  }

  async function loadInventory() {
    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(`${API_BASE}/api/admin/medicines`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load inventory");

      const data = await response.json();
      inventoryData = data.medicines;
      renderInventory(inventoryData);
    } catch (error) {
      showToast("Error loading inventory: " + error.message);
    }
  }

  function renderInventory(medicines) {
    const grid = document.getElementById("inventory-grid");

    grid.innerHTML = medicines
      .map(
        (med) => `
      <div class="inventory-card ${!med.inStock ? "out-of-stock" : ""}">
        <img src="${med.image}" alt="${med.name}" />
        <h4>${med.name}</h4>
        <p>${med.category}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0;">
          <strong>${Number(med.price).toFixed(2)}</strong>
          <span class="status-badge ${
            med.inStock ? "status-completed" : "status-cancelled"
          }">
            ${med.inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>
        <div style="font-size: 0.9rem; color: var(--muted); margin-bottom: 12px;">
          Stock: ${med.stockCount} units
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn" onclick="editMedicine('${
            med.id
          }')" style="flex: 1; padding: 6px;">Edit</button>
          <button class="btn ${med.inStock ? "btn-danger" : "btn-success"}" 
                  onclick="toggleMedicineStock('${
                    med.id
                  }')" style="flex: 1; padding: 6px;">
            ${med.inStock ? "Mark Out of Stock" : "Mark In Stock"}
          </button>
        </div>
      </div>
    `
      )
      .join("");
  }

  function filterInventory() {
    const filterValue = document.getElementById("inventory-filter").value;
    const searchValue = document
      .getElementById("inventory-search")
      .value.toLowerCase();

    let filteredMeds = inventoryData;

    // Filter by stock status
    if (filterValue === "in-stock") {
      filteredMeds = filteredMeds.filter((med) => med.inStock);
    } else if (filterValue === "out-of-stock") {
      filteredMeds = filteredMeds.filter((med) => !med.inStock);
    }

    // Filter by search
    if (searchValue) {
      filteredMeds = filteredMeds.filter(
        (med) =>
          med.name.toLowerCase().includes(searchValue) ||
          med.category.toLowerCase().includes(searchValue)
      );
    }

    renderInventory(filteredMeds);
  }

  function showAddMedicineModal() {
    // Create and show modal for adding new medicine
    showToast("Add medicine functionality will be implemented");
  }

  async function toggleMedicineStock(medId) {
    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(
        `${API_BASE}/api/admin/medicines/${medId}/toggle-stock`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to update stock status");

      showToast("Stock status updated successfully");
      await loadInventory();
    } catch (error) {
      showToast("Error updating stock: " + error.message);
    }
  }

  // User Management
  function setupUsersListeners() {
    const addUserBtn = document.getElementById("add-user-btn");
    if (addUserBtn) {
      addUserBtn.addEventListener("click", showAddUserModal);
    }
  }

  async function loadUsers() {
    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load users");

      const data = await response.json();
      usersData = data.users;
      renderUsers(usersData);
    } catch (error) {
      showToast("Error loading users: " + error.message);
    }
  }

  function renderUsers(users) {
    const tbody = document.getElementById("users-tbody");

    tbody.innerHTML = users
      .map(
        (user) => `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td><span class="role-badge role-${user.role.toLowerCase()}">${
          user.role
        }</span></td>
        <td><span class="status-badge ${
          user.isActive ? "status-completed" : "status-cancelled"
        }">
          ${user.isActive ? "Active" : "Inactive"}
        </span></td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn" onclick="editUser('${
            user.id
          }')" style="margin-right: 8px;">Edit</button>
          <button class="btn btn-danger" onclick="toggleUserStatus('${
            user.id
          }')">
            ${user.isActive ? "Deactivate" : "Activate"}
          </button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function showAddUserModal() {
    showToast("Add user functionality will be implemented");
  }

  // Analytics
  async function loadAnalytics() {
    if (!ordersData.length) await loadOrders();

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const weeklyOrders = ordersData.filter(
      (o) => new Date(o.createdAt) >= weekAgo
    ).length;
    const monthlyRevenue = ordersData
      .filter(
        (o) => new Date(o.createdAt) >= monthAgo && o.status === "COMPLETED"
      )
      .reduce((sum, o) => sum + Number(o.total), 0);

    const completedOrders = ordersData.filter((o) => o.status === "COMPLETED");
    const avgOrderValue =
      completedOrders.length > 0
        ? completedOrders.reduce((sum, o) => sum + Number(o.total), 0) /
          completedOrders.length
        : 0;

    document.getElementById("weekly-orders").textContent = weeklyOrders;
    document.getElementById(
      "monthly-revenue"
    ).textContent = `${monthlyRevenue.toFixed(2)}`;
    document.getElementById(
      "avg-order-value"
    ).textContent = `${avgOrderValue.toFixed(2)}`;
    document.getElementById("top-medicine").textContent = "Aspirin"; // Placeholder
  }

  // Settings
  function setupSettingsListeners() {
    const testEmailBtn = document.getElementById("test-email-btn");
    const saveSettingsBtn = document.getElementById("save-settings-btn");

    if (testEmailBtn) {
      testEmailBtn.addEventListener("click", testEmail);
    }

    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener("click", saveSettings);
    }
  }

  async function loadSettings() {
    // Load current settings
    showToast("Settings loaded");
  }

  async function testEmail() {
    try {
      const response = await fetch(`${API_BASE}/api/test-email`);
      if (response.ok) {
        showToast("Test email sent successfully!");
      } else {
        throw new Error("Failed to send test email");
      }
    } catch (error) {
      showToast("Test email failed: " + error.message);
    }
  }

  async function saveSettings() {
    showToast("Settings saved successfully!");
  }

  // Utility Functions
  function setThemeToggle() {
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
  }

  function showToast(message) {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      Object.assign(toastContainer.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "10000",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      });
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    Object.assign(toast.style, {
      background: "#333",
      color: "white",
      padding: "12px 16px",
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      opacity: "0",
      transform: "translateX(100px)",
      transition: "all 0.3s ease",
    });
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    }, 100);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Global functions for inline onclick handlers
  window.updateOrderStatus = updateOrderStatus;
  window.editMedicine = (id) => showToast(`Edit medicine ${id}`);
  window.toggleMedicineStock = toggleMedicineStock;
  window.editUser = (id) => showToast(`Edit user ${id}`);
  window.toggleUserStatus = (id) => showToast(`Toggle user ${id} status`);
})();
