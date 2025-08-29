import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increase limit for file uploads
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = process.env.PORT || 3001;
const OWNER_KEY = process.env.OWNER_KEY || "admin123";

// Health check
app.get("/", (req, res) => {
  res.json({ status: "MediDex API is running" });
});

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
      cnic,
      prescriptionFile,
      prescriptionFileName,
      mapLocation,
      doctorRecommended,
    } = customer;

    if (!name || !phone || !location) {
      return res
        .status(400)
        .json({ error: "Name, phone, and location are required" });
    }

    // Validate CNIC if provided
    if (cnic && cnic.replace(/[^0-9]/g, "").length !== 13) {
      return res.status(400).json({ error: "CNIC must be exactly 13 digits" });
    }

    const total = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1),
      0
    );

    const order = await prisma.order.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
        cnic: cnic ? cnic.replace(/[^0-9]/g, "") : null,
        prescriptionFile: prescriptionFile || null,
        prescriptionFileName: prescriptionFileName || null,
        mapLocation: mapLocation || null,
        doctorRecommended: doctorRecommended === "yes",
        total: Number(total.toFixed(2)),
        items: {
          create: items.map((item) => ({
            medId: Number(item.id) || null,
            name: String(item.name || "Unknown Medicine").trim(),
            price: Number(item.price || 0),
            qty: Math.max(1, Number(item.qty) || 1),
          })),
        },
      },
      include: {
        items: true,
      },
    });

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

// Get orders (owner only)
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
    res.status(500).json({
      error: "Failed to fetch orders",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
