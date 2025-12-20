const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");

// 🟢 FIX 1: Explicitly set Multer limit to 50MB
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const BACKEND = "backend-a";
const PORT = process.env.PORT || 8080;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const app = express();

// 🟢 FIX 2: Increase Express Body Parser limits to 50MB
// (Crucial if any part of the request is treated as JSON/Text)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Enable CORS for local development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", backend: BACKEND, port: PORT });
});

// 🟢 NEW: Database Connection Test Endpoint (Added this block)
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.json({ 
      status: "success", 
      message: "✅ Database connection is HEALTHY!", 
      serverTime: result.rows[0].time 
    });
  } catch (err) {
    console.error("DB Test Error:", err);
    res.status(500).json({ 
      status: "error", 
      message: "❌ Database connection FAILED", 
      details: err.message 
    });
  }
});

// Upload Endpoint
app.post(["/", "/api/a", "/upload"], upload.single("image"), async (req, res) => {
  try {
    const image = req.file ? req.file.buffer : null;

    await pool.query(
      `INSERT INTO requests (backend_name, meta, image)
       VALUES ($1, $2, $3)`,
      [BACKEND, { uploaded: !!image }, image]
    );

    const rows = await pool.query(
      "SELECT id, backend_name, ts, meta FROM requests ORDER BY ts DESC LIMIT 5"
    );

    res.json({
      backend: BACKEND,
      rows: rows.rows,
      uploadedImage: image ? image.toString("base64") : null
    });

  } catch (err) {
    console.error(err); // 🟢 Added logging to help debug
    res.status(500).json({ error: "Database not responding", details: err.message });
  }
});

app.listen(PORT, () => console.log(`${BACKEND} running on port ${PORT}`));