import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = process.env.PORT || 3001;
const OWNER_KEY = process.env.OWNER_KEY || "admin123";
const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

// Sample medicines data for initial seeding
const sampleMedicines = [
  {
    name: "Aspirin",
    category: "Tablet",
    price: 5.99,
    description: "Used to reduce pain, fever, or inflammation.",
    image: "images/aspirin.png",
    stockCount: 100,
  },
  {
    name: "Benzyl Penicillin",
    category: "Injection",
    price: 19.99,
    description: "Antibiotic used for bacterial infections.",
    image: "images/benzene.png",
    stockCount: 50,
  },
  {
    name: "Paracetamol",
    category: "Tablet",
    price: 6.49,
    description: "Pain reliever and fever reducer.",
    image: "images/paracetamol.png",
    stockCount: 150,
  },
  {
    name: "Amoxicillin",
    category: "Capsule",
    price: 12.49,
    description: "Antibiotic for a variety of infections.",
    image: "images/amoxicillin.png",
    stockCount: 75,
  },
  {
    name: "Ibuprofen",
    category: "Tablet",
    price: 7.49,
    description: "Reduces fever and treats pain or inflammation.",
    image: "images/ibuprofen.png",
    stockCount: 120,
  },
  {
    name: "Cetirizine",
    category: "Tablet",
    price: 4.99,
    description: "Antihistamine used to relieve allergy symptoms.",
    image: "images/cetirizine.png",
    stockCount: 80,
  },
  {
    name: "Doxycycline",
    category: "Capsule",
    price: 14.99,
    description: "Antibiotic for respiratory infections and more.",
    image: "images/doxycycline.png",
    stockCount: 60,
  },
  {
    name: "Metformin",
    category: "Tablet",
    price: 8.99,
    description: "Used to treat type 2 diabetes.",
    image: "images/metmormin.png",
    stockCount: 90,
  },
  {
    name: "Loratadine",
    category: "Tablet",
    price: 5.49,
    description: "Antihistamine for seasonal allergies.",
    image: "images/loratadine.png",
    stockCount: 70,
  },
  {
    name: "Naproxen",
    category: "Tablet",
    price: 9.49,
    description: "NSAID for pain and inflammation.",
    image: "images/naproxen.png",
    stockCount: 85,
  },
  {
    name: "ORS Solution",
    category: "Solution",
    price: 3.99,
    description: "Oral rehydration solution for dehydration.",
    image: "images/ors.png",
    stockCount: 200,
  },
  {
    name: "Dextromethorphan Syrup",
    category: "Syrup",
    price: 6.99,
    description: "Cough suppressant for dry cough.",
    image: "images/dxm.png",
    stockCount: 40,
  },
];

// Middleware for JWT verification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Email notification function
async function sendOrderNotification(order) {
  if (!process.env.RESEND_API_KEY || !process.env.OWNER_EMAIL) {
    console.log("Email not configured, skipping notification");
    return;
  }

  try {
    const itemsList = order.items
      .map(
        (item) =>
          `${item.name} - Qty: ${item.qty} - $${Number(item.price).toFixed(2)}`
      )
      .join("\n");

    const emailHTML = `
      <h2>New Order Received - MediDex</h2>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${new Date(
        order.createdAt
      ).toLocaleString()}</p>
      
      <h3>Customer Details:</h3>
      <p><strong>Name:</strong> ${order.name}</p>
      <p><strong>Phone:</strong> ${order.phone}</p>
      <p><strong>CNIC:</strong> ${order.cnic || "Not provided"}</p>
      <p><strong>Address:</strong> ${order.location}</p>
      
      <h3>Items Ordered:</h3>
      <pre>${itemsList}</pre>
      
      <p><strong>Total Amount:</strong> $${Number(order.total).toFixed(2)}</p>
      
      ${
        order.prescriptionFile
          ? "<p><strong>Note:</strong> Customer uploaded prescription file</p>"
          : ""
      }
      ${
        order.mapLocation
          ? "<p><strong>Note:</strong> Customer selected delivery location on map</p>"
          : ""
      }
      
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
        <p><strong>Manage this order:</strong></p>
        <a href="https://muhammadxmohid.github.io/MediDex/orders.html" 
           style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
          View Orders Dashboard
        </a>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MediDex <orders@resend.dev>",
        to: [process.env.OWNER_EMAIL],
        subject: `New Order #${order.id} - MediDex`,
        html: emailHTML,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.status}`);
    }

    console.log(`Order notification email sent for order ${order.id}`);
  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
}

// Initialize database with sample data
async function initializeDatabase() {
  try {
    // Check if medicines exist
    const medicineCount = await prisma.medicine.count();
    if (medicineCount === 0) {
      console.log("Seeding medicines database...");
      await prisma.medicine.createMany({
        data: sampleMedicines,
      });
      console.log("✓ Sample medicines added to database");
    }

    // Create default admin user if none exists
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("Creating default admin user...");
      await prisma.user.create({
        data: {
          email: "admin@medidex.com",
          name: "Admin User",
          role: "ADMIN",
          isActive: true,
        },
      });
      console.log("✓ Default admin user created");
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

// Health check
app.get("/", (req, res) => {
  res.json({ status: "MediDex API is running" });
});

// Public APIs (existing functionality)

// Create order
app.post("/api/orders", async (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    const {
      name,
      phone,
      location,
      cnic = null,
      prescriptionFile = null,
      prescriptionFileName = null,
      mapLocation = null,
      doctorRecommended = "no",
    } = customer;

    if (!name || !phone || !location) {
      return res
        .status(400)
        .json({ error: "Name, phone, and location are required" });
    }

    if (cnic && cnic.replace(/[^0-9]/g, "").length !== 13) {
      return res.status(400).json({ error: "CNIC must be exactly 13 digits" });
    }

    const total = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1),
      0
    );

    const orderData = {
      name: name.trim(),
      phone: phone.trim(),
      location: location.trim(),
      doctorRecommended: doctorRecommended === "yes",
      total: Number(total.toFixed(2)),
      status: "RECEIVED",
      items: {
        create: items.map((item) => ({
          medId: Number(item.id) || null,
          name: String(item.name || "Unknown Medicine").trim(),
          price: Number(item.price || 0),
          qty: Math.max(1, Number(item.qty) || 1),
        })),
      },
    };

    if (cnic) orderData.cnic = cnic.replace(/[^0-9]/g, "");
    if (prescriptionFile) {
      orderData.prescriptionFile = prescriptionFile;
      if (prescriptionFileName)
        orderData.prescriptionFileName = prescriptionFileName;
    }
    if (mapLocation) orderData.mapLocation = mapLocation;

    const order = await prisma.order.create({
      data: orderData,
      include: {
        items: true,
      },
    });

    sendOrderNotification(order).catch((err) =>
      console.error("Email notification failed:", err)
    );

    res.json({
      success: true,
      order: {
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        total: Number(order.total),
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      error: "Failed to create order",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get medicines (for frontend)
app.get("/api/medicines", async (req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { inStock: true },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        description: true,
        image: true,
      },
    });

    res.json({ medicines });
  } catch (error) {
    console.error("Get medicines error:", error);
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

// Admin APIs

// Admin login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { key } = req.body;

    if (key !== OWNER_KEY) {
      return res.status(401).json({ error: "Invalid access key" });
    }

    // Get admin user
    let adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true },
    });

    if (!adminUser) {
      // Create default admin if doesn't exist
      adminUser = await prisma.user.create({
        data: {
          email: "admin@medidex.com",
          name: "Admin User",
          role: "ADMIN",
          isActive: true,
        },
      });
    }

    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Verify token
app.get("/api/admin/verify", authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Get orders for admin
app.get("/api/admin/orders", authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const ordersWithNumbers = orders.map((order) => ({
      ...order,
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    }));

    res.json({ orders: ordersWithNumbers });
  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update order status
app.put("/api/admin/orders/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "RECEIVED",
      "PROCESSING",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        assignedTo: req.user.id,
        updatedAt: new Date(),
      },
      include: { items: true },
    });

    res.json({ success: true, order });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Get medicines for admin
app.get("/api/admin/medicines", authenticateToken, async (req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: { name: "asc" },
    });

    const medicinesWithNumbers = medicines.map((med) => ({
      ...med,
      price: Number(med.price),
    }));

    res.json({ medicines: medicinesWithNumbers });
  } catch (error) {
    console.error("Get admin medicines error:", error);
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

// Create medicine
app.post("/api/admin/medicines", authenticateToken, async (req, res) => {
  try {
    // Only admins and managers can add medicines
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const { name, category, price, stockCount, description, image } = req.body;

    if (!name || !category || !price || !stockCount || !description) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Use default image if none provided
    const imageUrl =
      image || `images/${name.toLowerCase().replace(/\s+/g, "_")}.png`;

    const medicine = await prisma.medicine.create({
      data: {
        name: name.trim(),
        category,
        price: Number(price),
        stockCount: Number(stockCount),
        description: description.trim(),
        image: imageUrl,
        inStock: Number(stockCount) > 0,
      },
    });

    res.json({ success: true, medicine });
  } catch (error) {
    console.error("Create medicine error:", error);
    res.status(500).json({ error: "Failed to create medicine" });
  }
});

// Update medicine
app.put("/api/admin/medicines/:id", authenticateToken, async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const { id } = req.params;
    const { name, category, price, stockCount, description, image } = req.body;

    const updateData = {
      name: name.trim(),
      category,
      price: Number(price),
      stockCount: Number(stockCount),
      description: description.trim(),
      inStock: Number(stockCount) > 0,
      updatedAt: new Date(),
    };

    if (image) {
      updateData.image = image;
    }

    const medicine = await prisma.medicine.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({ success: true, medicine });
  } catch (error) {
    console.error("Update medicine error:", error);
    res.status(500).json({ error: "Failed to update medicine" });
  }
});

// Delete medicine
app.delete("/api/admin/medicines/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can delete medicines" });
    }

    const { id } = req.params;
    await prisma.medicine.delete({
      where: { id: parseInt(id) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete medicine error:", error);
    res.status(500).json({ error: "Failed to delete medicine" });
  }
});

// Staff login endpoint
app.post("/api/admin/staff-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // For demo purposes, we'll use simple password check
    // In production, you'd use bcrypt.compare(password, user.password)
    const isValidPassword =
      password === "demo123" || password === user.email.split("@")[0];

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Create user (with password)
app.post("/api/admin/users", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can create users" });
    }

    const { name, email, role, password } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // For demo purposes, store plain password
    // In production, use: const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password, // In production: hashedPassword
        role,
        createdBy: req.user.id,
        isActive: true,
      },
    });

    // Don't return password in response
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user
app.put("/api/admin/users/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can update users" });
    }

    const { id } = req.params;
    const { name, email, role } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Toggle user status
app.put("/api/admin/users/:id/toggle", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can toggle user status" });
    }

    const { id } = req.params;

    const currentUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        isActive: !currentUser.isActive,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({ error: "Failed to toggle user status" });
  }
});

// Get users
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  try {
    // Only admins can view users
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Legacy endpoint for backward compatibility
app.get("/api/orders", async (req, res) => {
  try {
    const { key } = req.query;

    if (key !== OWNER_KEY) {
      return res.status(401).json({ error: "Invalid access key" });
    }

    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const ordersWithFiles = orders.map((order) => ({
      ...order,
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    }));

    res.json({ orders: ordersWithFiles });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Test email endpoint
app.get("/api/test-email", async (req, res) => {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.OWNER_EMAIL) {
      return res.status(400).json({ error: "Email not configured" });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MediDex <orders@resend.dev>",
        to: [process.env.OWNER_EMAIL],
        subject: "MediDex Email Test",
        html: "<h2>Email configuration is working!</h2><p>This is a test email from your MediDex server.</p>",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorData}`);
    }

    res.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error("Test email failed:", error);
    res
      .status(500)
      .json({ error: "Email test failed", details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("✓ Database connected");

    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
