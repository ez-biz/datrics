/**
 * Creates a playground SQLite database with sample e-commerce data.
 * Run: npx tsx scripts/create-playground-db.ts
 * Output: prisma/playground.db
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(__dirname, "../prisma/playground.db");

// Remove existing file
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// ─── Create Tables ──────────────────────────────────────────────────

db.exec(`
  CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    signup_date TEXT NOT NULL,
    plan TEXT NOT NULL
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_date TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL
  );

  CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL
  );

  CREATE TABLE revenue_monthly (
    month TEXT PRIMARY KEY,
    revenue REAL NOT NULL,
    expenses REAL NOT NULL,
    profit REAL NOT NULL
  );
`);

// ─── Seed Data ──────────────────────────────────────────────────────

// Simple deterministic pseudo-random (mulberry32)
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seededRandom(42);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) =>
  Math.round((rand() * (max - min) + min) * 100) / 100;

const FIRST_NAMES = [
  "Emma", "Liam", "Sophia", "Noah", "Olivia", "James", "Ava", "William",
  "Isabella", "Oliver", "Mia", "Benjamin", "Charlotte", "Elijah", "Amelia",
  "Lucas", "Harper", "Mason", "Evelyn", "Logan", "Aria", "Alexander",
  "Ella", "Ethan", "Scarlett", "Daniel", "Grace", "Henry", "Chloe", "Jack",
  "Victoria", "Sebastian", "Riley", "Aiden", "Zoey", "Matthew", "Nora",
  "Samuel", "Lily", "David", "Eleanor", "Joseph", "Hannah", "Carter",
  "Lillian", "Owen", "Addison", "Wyatt", "Aubrey", "Luke",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson",
];

const CITIES = [
  { city: "New York", country: "United States" },
  { city: "San Francisco", country: "United States" },
  { city: "London", country: "United Kingdom" },
  { city: "Berlin", country: "Germany" },
  { city: "Tokyo", country: "Japan" },
  { city: "Sydney", country: "Australia" },
  { city: "Toronto", country: "Canada" },
  { city: "Paris", country: "France" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Singapore", country: "Singapore" },
];

const PLANS = ["free", "starter", "pro", "enterprise"];
const PLAN_WEIGHTS = [0.35, 0.30, 0.25, 0.10];

const CATEGORIES = ["Electronics", "Clothing", "Books", "Home & Garden", "Sports"];

const PRODUCT_NAMES: Record<string, string[]> = {
  Electronics: [
    "Wireless Mouse", "USB-C Hub", "Mechanical Keyboard", "Monitor Stand",
    "Webcam HD", "Bluetooth Speaker", "Power Bank", "LED Desk Lamp",
    "Noise-Cancelling Headphones", "Tablet Stand",
  ],
  Clothing: [
    "Cotton T-Shirt", "Denim Jacket", "Running Shoes", "Wool Sweater",
    "Baseball Cap", "Leather Belt", "Silk Scarf", "Linen Pants",
    "Rain Jacket", "Hiking Boots",
  ],
  Books: [
    "Data Science Handbook", "SQL Mastery", "Clean Code", "Design Patterns",
    "The Lean Startup", "Atomic Habits", "Deep Work", "Python Crash Course",
    "System Design Interview", "Thinking Fast and Slow",
  ],
  "Home & Garden": [
    "Ceramic Planter", "Scented Candle Set", "Throw Blanket", "Wall Clock",
    "Kitchen Scale", "French Press", "Herb Garden Kit", "Door Mat",
    "Cushion Cover Set", "LED String Lights",
  ],
  Sports: [
    "Yoga Mat", "Resistance Bands", "Water Bottle", "Jump Rope",
    "Foam Roller", "Dumbbell Set", "Tennis Racket", "Swim Goggles",
    "Running Armband", "Fitness Tracker",
  ],
};

const ORDER_STATUSES = ["completed", "processing", "shipped", "cancelled", "refunded"];
const STATUS_WEIGHTS = [0.55, 0.15, 0.15, 0.10, 0.05];

function weightedPick(items: string[], weights: number[]): string {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Insert Customers ───────────────────────────────────────────────

const insertCustomer = db.prepare(
  `INSERT INTO customers (id, name, email, city, country, signup_date, plan) VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const insertCustomers = db.transaction(() => {
  for (let i = 1; i <= 100; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    const loc = pick(CITIES);
    const year = pick([2023, 2023, 2024, 2024, 2024, 2025]);
    const month = randInt(1, 12);
    const day = randInt(1, 28);
    const plan = weightedPick(PLANS, PLAN_WEIGHTS);
    insertCustomer.run(i, name, email, loc.city, loc.country, formatDate(year, month, day), plan);
  }
});
insertCustomers();
console.log("✓ Inserted 100 customers");

// ─── Insert Products ────────────────────────────────────────────────

const insertProduct = db.prepare(
  `INSERT INTO products (id, name, category, price, stock) VALUES (?, ?, ?, ?, ?)`
);

const insertProducts = db.transaction(() => {
  let id = 1;
  for (const category of CATEGORIES) {
    for (const name of PRODUCT_NAMES[category]) {
      const price = category === "Electronics"
        ? randFloat(15, 200)
        : category === "Books"
          ? randFloat(10, 45)
          : randFloat(12, 120);
      const stock = randInt(5, 500);
      insertProduct.run(id++, name, category, price, stock);
    }
  }
});
insertProducts();
console.log("✓ Inserted 50 products");

// ─── Insert Orders & Order Items ────────────────────────────────────

const insertOrder = db.prepare(
  `INSERT INTO orders (id, customer_id, order_date, total, status) VALUES (?, ?, ?, ?, ?)`
);

const insertOrderItem = db.prepare(
  `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)`
);

let orderItemId = 1;

const insertOrders = db.transaction(() => {
  for (let orderId = 1; orderId <= 500; orderId++) {
    const customerId = randInt(1, 100);
    // Orders spread across 2024-01 to 2025-12
    const year = rand() < 0.45 ? 2024 : 2025;
    const month = randInt(1, 12);
    const day = randInt(1, 28);
    const orderDate = formatDate(year, month, day);
    const status = weightedPick(ORDER_STATUSES, STATUS_WEIGHTS);

    // Create 1-4 items per order
    const itemCount = randInt(1, 4);
    let orderTotal = 0;

    const items: Array<[number, number, number, number, number]> = [];
    for (let j = 0; j < itemCount; j++) {
      const productId = randInt(1, 50);
      const quantity = randInt(1, 5);
      const unitPrice = randFloat(10, 200);
      orderTotal += quantity * unitPrice;
      items.push([orderItemId++, orderId, productId, quantity, unitPrice]);
    }

    orderTotal = Math.round(orderTotal * 100) / 100;
    insertOrder.run(orderId, customerId, orderDate, orderTotal, status);

    for (const item of items) {
      insertOrderItem.run(...item);
    }
  }
});
insertOrders();
console.log(`✓ Inserted 500 orders and ${orderItemId - 1} order items`);

// ─── Insert Monthly Revenue ─────────────────────────────────────────

const insertRevenue = db.prepare(
  `INSERT INTO revenue_monthly (month, revenue, expenses, profit) VALUES (?, ?, ?, ?)`
);

const insertRevenueData = db.transaction(() => {
  let baseRevenue = 42000;
  let baseExpenses = 28000;

  for (let year = 2024; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      // Gradual growth with seasonal variation
      const seasonalFactor =
        month >= 11
          ? 1.35 // Holiday spike
          : month >= 6 && month <= 8
            ? 0.9 // Summer dip
            : 1.0;
      const growthFactor = 1 + (year - 2024) * 0.15 + (month - 1) * 0.008;
      const noise = 1 + (rand() - 0.5) * 0.1;

      const revenue = Math.round(baseRevenue * growthFactor * seasonalFactor * noise);
      const expenses = Math.round(baseExpenses * growthFactor * (1 + (rand() - 0.5) * 0.08));
      const profit = revenue - expenses;
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;

      insertRevenue.run(monthStr, revenue, expenses, profit);
    }
  }
});
insertRevenueData();
console.log("✓ Inserted 24 monthly revenue rows");

// ─── Done ───────────────────────────────────────────────────────────

db.close();
console.log(`\n✅ Playground database created at: ${DB_PATH}`);
