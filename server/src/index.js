import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { notifyOwner } from "./notify.js";

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 3001);

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS not allowed"), false);
    },
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/orders", async (req, res) => {
  try {
    const { customer, items } = req.body || {};
    if (!customer || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const { name, phone, location, doctorRecommended } = customer;
    if (!name || !phone || !location) {
      return res.status(400).json({ error: "Missing name/phone/location" });
    }

    const normalized = items.map((it) => {
      if (!it?.id || !it?.qty || !it?.name || typeof it.price !== "number") {
        throw new Error("Each item must include id, name, price, qty");
      }
      return {
        medId: Number(it.id),
        name: String(it.name),
        price: it.price,
        qty: Number(it.qty),
      };
    });

    const total = normalized.reduce((sum, it) => sum + it.price * it.qty, 0);

    const order = await prisma.order.create({
      data: {
        name,
        phone,
        location,
        doctorRecommended:
          String(doctorRecommended).toLowerCase() === "yes" ||
          doctorRecommended === true,
        total,
        items: { create: normalized },
      },
      include: { items: true },
    });

    // Fire-and-forget owner notification
    notifyOwner(order).catch(() => {});

    return res.status(201).json({ ok: true, order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

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
