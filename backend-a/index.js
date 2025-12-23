const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");

// 🟢 NEW: Import Prometheus Client
const client = require('prom-client');

// 🟢 NEW: Create a Registry and Enable Default Metrics
// (This automatically collects CPU, Memory, Event Loop Lag, etc.)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// 🟢 NEW: Create a custom histogram for tracking HTTP duration
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

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
  database: process.env.DB_NAME,

  // 🟢 FIX: Enable SSL for Azure Postgres
  ssl: {
    rejectUnauthorized: false 
  }
});

const app = express();

// 🟢 NEW: Middleware to measure request duration
// (Must be placed BEFORE your routes)
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, code: res.statusCode });
  });
  next();
});

// 🟢 FIX 2: Increase Express Body Parser limits to 50MB
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

// 🟢 NEW: The "/metrics" Endpoint
// Prometheus will hit this URL every ~15s to get data
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", backend: BACKEND, port: PORT });
});

// 🟢 NEW: Database Connection Test Endpoint
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

// 🟢 NEW: Initialize Database Table
app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        backend_name TEXT NOT NULL,
        ts TIMESTAMP DEFAULT NOW(),
        meta JSONB,
        image BYTEA
      );
    `);
    res.json({ status: "success", message: "✅ Table 'requests' created successfully!" });
  } catch (err) {
    console.error("Init Error:", err);
    res.status(500).json({ status: "error", details: err.message });
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