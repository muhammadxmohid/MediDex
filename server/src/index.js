import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 3001);

// Normalize origins like https://host/path -> https://host
function normalizeOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(normalizeOrigin)
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl/Postman
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(normalized)) {
      return cb(null, true);
    }
    console.warn("CORS blocked:", origin);
    return cb(new Error("CORS not allowed"), false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Origin"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Create order
app.post("/api/orders", async (req, res) => {
  try {
    const { customer, items } = req.body || {};
    if (!customer || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid payload: missing customer or items" });
    }
    const { name, phone, location, doctorRecommended } = customer;
    if (!name || !phone || !location) {
      return res.status(400).json({ error: "Missing name/phone/location" });
    }

    // Map incoming items {id, name, price, qty} -> Prisma model fields {productId, name, price, quantity}
    const normalizedItems = items.map((it) => {
      if (!it?.id || !it?.qty || !it?.name || typeof it.price !== "number") {
        throw new Error("Each item must include id, name, price (number), qty");
      }
      return {
        productId: Number(it.id),
        name: String(it.name),
        price: Number(it.price),
        quantity: Number(it.qty),
      };
    });

    const total = normalizedItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        name,
        phone,
        location,
        doctorRecommended:
          String(doctorRecommended).toLowerCase() === "yes" ||
          doctorRecommended === true,
        total,
        items: { create: normalizedItems },
      },
      include: { items: true },
    });

    return res.status(201).json({ ok: true, order });
  } catch (err) {
    console.error("Order error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Server error while creating order. Check logs." });
  }
});

// Get order
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
