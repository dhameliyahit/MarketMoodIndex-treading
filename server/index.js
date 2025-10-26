import express from "express";
import http from "http";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";
import MMI from "./models/MMI.js"; // Your mongoose model

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Socket.io setup
import { Server } from "socket.io";
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true }
});

// MongoDB connection
mongoose.connect(process.env.DB_URL_ENV)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.get("/", (req, res) => res.send("<h1>OK</h1>"));

// Scraper settings
const TARGET_URL = process.env.TARGET_URL || "https://www.tickertape.in/market-mood-index";
const SELECTOR = 'span[class*="number"]';
const POLL_INTERVAL = 15000;

let lastValue = null;

async function fetchData() {
  try {
    const response = await axios.get(TARGET_URL, { timeout: 30000 });
    const html = response.data;
    const $ = cheerio.load(html);
    const rawValue = $(SELECTOR).first().text().trim();
    const value = parseFloat(rawValue.replace(/,/g, ""));

    if (lastValue === null || value !== lastValue) {
      const status = lastValue === null ? "same" : (value > lastValue ? "up" : value < lastValue ? "down" : "same");
      lastValue = value;

      const newRecord = new MMI({ value, status });
      await newRecord.save();

      const updateData = { value, status, time: new Date().toISOString() };
      console.log("📈 Emitting MMI update:", updateData);
      io.emit("mmi-update", updateData);
    } else {
      console.log("No change, still:", value);
    }
  } catch (err) {
    console.error("❌ Scrape error:", err.message);
  }
}

// Start polling
setInterval(fetchData, POLL_INTERVAL);
fetchData(); // initial fetch

// --- API Routes --- //
// Health check
app.get("/api/health", (req, res) => res.json({ status: "OK", message: "MMI Server running", timestamp: new Date().toISOString() }));

// All historical data
app.get("/api/all", async (req, res) => {
  try {
    const { page = 1, limit = 100, sort = "desc", days } = req.query;
    let query = {};
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      query.updatedAt = { $gte: startDate };
    }

    const total = await MMI.countDocuments(query);
    const data = await MMI.find(query)
      .sort({ updatedAt: sort === "asc" ? 1 : -1 })
      .skip((page-1)*limit)
      .limit(parseInt(limit))
      .select("value status updatedAt")
      .lean();

    const formatted = data.map(item => ({
      id: item._id,
      value: item.value,
      status: item.status,
      time: item.updatedAt.toISOString(),
      date: item.updatedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      timestamp: item.updatedAt.getTime()
    }));

    res.json({ success: true, data: formatted, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total/limit) }, period: days ? `${days} days` : "all time" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch historical data", message: error.message });
  }
});

// Latest
app.get("/api/latest", async (req, res) => {
  try {
    const latest = await MMI.findOne().sort({ updatedAt: -1 });
    if (latest) res.json({ success: true, data: { value: latest.value, status: latest.status, time: latest.updatedAt.toISOString() } });
    else res.json({ success: true, data: null, message: "No data available" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch latest data" });
  }
});

// Stats
app.get("/api/stats", async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

    const todayStats = await MMI.aggregate([{ $match: { updatedAt: { $gte: today, $lt: tomorrow } } }, { $group: { _id:null, average:{$avg:"$value"}, max:{$max:"$value"}, min:{$min:"$value"}, count:{$sum:1} } }]);
    const allTimeStats = await MMI.aggregate([{ $group: { _id:null, average:{$avg:"$value"}, max:{$max:"$value"}, min:{$min:"$value"}, count:{$sum:1} } }]);
    const last24hCount = await MMI.countDocuments({ updatedAt: { $gte: new Date(Date.now()-24*60*60*1000) } });

    res.json({ success:true, today: todayStats[0]||{average:0,max:0,min:0,count:0}, allTime: allTimeStats[0]||{average:0,max:0,min:0,count:0}, last24h:{count:last24hCount}, lastUpdated:new Date().toISOString() });
  } catch(err){ res.status(500).json({success:false,error:"Failed to fetch statistics"});}
});

// Range
app.get("/api/range", async (req,res)=>{
  try{
    const {start,end,limit=1000} = req.query;
    if(!start || !end) return res.status(400).json({success:false,error:"Start and end required"});
    const data = await MMI.find({updatedAt:{$gte:new Date(start),$lte:new Date(end)}}).sort({updatedAt:1}).limit(parseInt(limit)).select("value status updatedAt").lean();
    res.json({success:true,data:data.map(d=>({value:d.value,status:d.status,time:d.updatedAt.toISOString(),timestamp:d.updatedAt.getTime()})),total:data.length,period:{start:new Date(start).toISOString(),end:new Date(end).toISOString()}});
  }catch(err){ res.status(500).json({success:false,error:"Failed to fetch range data"});}
});

// Socket.io
io.on("connection", async (socket)=>{
  console.log("🟢 Client connected:", socket.id);
  try{
    const latest = await MMI.findOne().sort({updatedAt:-1});
    socket.emit("mmi-update", latest ? {value:latest.value,status:latest.status,time:latest.updatedAt.toISOString()} : {value:50,status:"same",time:new Date().toISOString()});
  }catch(err){ console.error(err);}
  socket.on("disconnect",()=>console.log("🔴 Client disconnected:",socket.id));
});

// 404
app.use((req,res)=>res.status(404).json({success:false,error:"Endpoint not found",availableEndpoints:["GET /api/health","GET /api/all","GET /api/latest","GET /api/stats","GET /api/range"]}));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT,()=>{
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log("🔌 WebSocket ready for real-time updates");
});
