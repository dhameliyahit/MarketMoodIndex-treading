// server.js - UPDATED WITH PROPER API ENDPOINTS
import express from "express";
import http from "http";
import { chromium } from "playwright";
import { Server } from "socket.io";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import MMI from "./models/MMI.js";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Add CORS middleware for frontend communication
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const DB_URL_ENV =  process.env.DB_URL_ENV 
// Connect to MongoDB
mongoose.connect(DB_URL_ENV)
  .then(() => console.log("✅ MongoDB connected " + mongoose.connection.host))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const TARGET_URL = process.env.TARGET_URL || "https://www.tickertape.in/market-mood-index";
  ;
const SELECTOR = 'span[class*="number"]';
const POLL_INTERVAL = 15000;

let lastValue = null;

async function startScraper() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(SELECTOR, { timeout: 20000 });
  console.log("✅ Page loaded successfully");

  async function fetchData() {
    try {
      const rawValue = await page.$eval(SELECTOR, el => el.textContent.trim());
      const value = parseFloat(rawValue.replace(/,/g, ""));

      if (lastValue === null || value !== lastValue) {
        const status = lastValue === null ? "same" : (value > lastValue ? "up" : value < lastValue ? "down" : "same");
        lastValue = value;

        const newRecord = new MMI({ value, status });
        await newRecord.save();

        const updateData = {
          value,
          status,
          time: new Date().toISOString()
        };

        console.log("📈 Emitting MMI update:", updateData);
        io.emit("mmi-update", updateData);
      } else {
        console.log("No change, still:", value);
      }
    } catch (err) {
      console.error("❌ Scrape error:", err.message);

      try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector(SELECTOR, { timeout: 10000 });
        console.log("🔁 Page reloaded and recovered");
      } catch (reloadErr) {
        console.error("⚠️ Reload failed:", reloadErr.message);
      }
    }
  }

  await fetchData();
  setInterval(fetchData, POLL_INTERVAL);
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "MMI Server is running",
    timestamp: new Date().toISOString()
  });
});

// Get all historical data with pagination and filtering
app.get("/api/all", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      sort = "desc",
      days
    } = req.query;

    // Build query for date filtering
    let query = {};
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      query.updatedAt = { $gte: startDate };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const total = await MMI.countDocuments(query);

    // Get data with sorting
    const sortOrder = sort === "asc" ? 1 : -1;
    const data = await MMI.find(query)
      .sort({ updatedAt: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .select('value status updatedAt')
      .lean();

    // Format response
    const formattedData = data.map(item => ({
      id: item._id,
      value: item.value,
      status: item.status,
      time: item.updatedAt.toISOString(),
      date: item.updatedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      timestamp: item.updatedAt.getTime()
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      period: days ? `${days} days` : 'all time'
    });

  } catch (error) {
    console.error("❌ Error fetching historical data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch historical data",
      message: error.message
    });
  }
});

// Get latest data
app.get("/api/latest", async (req, res) => {
  try {
    const latest = await MMI.findOne().sort({ updatedAt: -1 });

    if (latest) {
      res.json({
        success: true,
        data: {
          value: latest.value,
          status: latest.status,
          time: latest.updatedAt.toISOString()
        }
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: "No data available"
      });
    }
  } catch (error) {
    console.error("❌ Error fetching latest data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch latest data"
    });
  }
});

// Get statistics
app.get("/api/stats", async (req, res) => {
  try {
    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's stats
    const todayStats = await MMI.aggregate([
      {
        $match: {
          updatedAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          average: { $avg: "$value" },
          max: { $max: "$value" },
          min: { $min: "$value" },
          count: { $sum: 1 }
        }
      }
    ]);

    // All time stats
    const allTimeStats = await MMI.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: "$value" },
          max: { $max: "$value" },
          min: { $min: "$value" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Last 24 hours data count
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    const last24hCount = await MMI.countDocuments({
      updatedAt: { $gte: last24Hours }
    });

    const response = {
      success: true,
      today: todayStats[0] || { average: 0, max: 0, min: 0, count: 0 },
      allTime: allTimeStats[0] || { average: 0, max: 0, min: 0, count: 0 },
      last24h: {
        count: last24hCount
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
});

// Get data for specific time range
app.get("/api/range", async (req, res) => {
  try {
    const { start, end, limit = 1000 } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: "Start and end dates are required"
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const data = await MMI.find({
      updatedAt: { $gte: startDate, $lte: endDate }
    })
      .sort({ updatedAt: 1 })
      .limit(parseInt(limit))
      .select('value status updatedAt')
      .lean();

    const formattedData = data.map(item => ({
      value: item.value,
      status: item.status,
      time: item.updatedAt.toISOString(),
      timestamp: item.updatedAt.getTime()
    }));

    res.json({
      success: true,
      data: formattedData,
      total: formattedData.length,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error fetching range data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch range data"
    });
  }
});

// Socket.io connection handling
io.on("connection", async (socket) => {
  console.log("🟢 Client connected:", socket.id);

  try {
    // Send latest MMI from DB on connect
    const latest = await MMI.findOne().sort({ updatedAt: -1 });
    if (latest) {
      const data = {
        value: latest.value,
        status: latest.status,
        time: latest.updatedAt.toISOString()
      };
      console.log("📤 Sending initial data to client:", data);
      socket.emit("mmi-update", data);
    } else {
      console.log("⚠️ No MMI data in database yet");
      socket.emit("mmi-update", {
        value: 50,
        status: "same",
        time: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("❌ Error sending initial data:", err);
  }

  socket.on("disconnect", (reason) => {
    console.log("🔴 Client disconnected:", socket.id, "Reason:", reason);
  });

  socket.on("error", (error) => {
    console.error("🔴 Socket error:", error);
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("🚨 Server error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /api/health",
      "GET /api/all",
      "GET /api/latest",
      "GET /api/stats",
      "GET /api/range"
    ]
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /api/health - Server health check`);
  console.log(`   GET /api/all - All historical data`);
  console.log(`   GET /api/latest - Latest MMI value`);
  console.log(`   GET /api/stats - Statistics`);
  console.log(`   GET /api/range - Data for date range`);
  console.log(`🔌 WebSocket ready for real-time updates`);
  startScraper();
});