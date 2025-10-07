import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cron from "node-cron";
import axios from "axios";
import fetch from "node-fetch";

import { fetchReferrals } from "./controllers/referralsController.js";
import { drawWinnerAuto } from "./controllers/gwsController.js";

import GWS from "./models/GWS.js";
import Referral from "./models/Referral.js";
import { User } from "./models/User.js";
import { SlotCall } from "./models/SlotCall.js";

import { verifyToken, isAdmin } from "./middleware/auth.js";
import slotCallRoutes from "./routes/slotCallRoutes.js";
import gwsRoutes from "./routes/gwsRoutes.js";
import leaderboardRoutes from "./routes/leaderboard.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------
// CORS Configuration
// ----------------------
const allowedOrigins = [
	"http://localhost:5173",
	"https://degenbomber.vercel.app",
];

app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin) return callback(null, true);
			if (allowedOrigins.includes(origin)) {
				return callback(null, true);
			} else {
				return callback(new Error("CORS policy: This origin is not allowed"));
			}
		},
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.use(express.json());

// ----------------------
// MongoDB Connection
// ----------------------
if (!process.env.MONGO_URI) {
	console.error("❌ MONGO_URI is not defined in .env!");
	process.exit(1);
}

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		serverSelectionTimeoutMS: 10000,
	})
	.then(() => console.log("✅ MongoDB connected"))
	.catch((err) => console.error("❌ MongoDB connection error:", err));

// ----------------------
// Request Logging
// ----------------------
app.use((req, res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
	const originalSend = res.send;
	res.send = function (body) {
		console.log(
			`[${new Date().toISOString()}] Response Headers:`,
			res.getHeaders()
		);
		return originalSend.call(this, body);
	};
	next();
});

// ----------------------
// Cron Jobs
// ----------------------

// Auto-draw giveaways every minute
cron.schedule("* * * * *", async () => {
	console.log("Running giveaway auto-draw job...");
	const now = new Date();
	try {
		const giveawaysToDraw = await GWS.find({
			state: "active",
			endTime: { $lte: now },
		}).populate("participants");

		for (const gws of giveawaysToDraw) {
			await drawWinnerAuto(gws);
			console.log(`Giveaway ${gws._id} winner drawn automatically.`);
		}
	} catch (err) {
		console.error("Error during auto draw:", err);
	}
});

// Fetch referrals from Chicken.gg every 15 minutes
cron.schedule("*/15 * * * *", fetchReferrals);

// ----------------------
// Auth Routes
// ----------------------
app.post("/api/auth/register", async (req, res) => {
	try {
		const { kickUsername, rainbetUsername, password, confirmPassword } =
			req.body;

		if (password !== confirmPassword)
			return res.status(400).json({ message: "Passwords do not match." });

		const existing = await User.findOne({ kickUsername });
		const existingRainbet = await User.findOne({ rainbetUsername });
		if (existing || existingRainbet)
			return res.status(400).json({ message: "Username already exists." });

		const hashed = await bcrypt.hash(password, 10);
		const newUser = new User({
			kickUsername,
			rainbetUsername,
			password: hashed,
		});
		await newUser.save();
		res.status(201).json({ message: "User registered." });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.post("/api/auth/login", async (req, res) => {
	try {
		const { kickUsername, password } = req.body;
		const user = await User.findOne({ kickUsername });
		if (!user) return res.status(404).json({ message: "User not found." });

		const match = await bcrypt.compare(password, user.password);
		if (!match)
			return res.status(401).json({ message: "Invalid credentials." });

		const token = jwt.sign(
			{ id: user._id, role: user.role, kickUsername: user.kickUsername },
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);

		res.json({
			token,
			user: { id: user._id, kickUsername: user.kickUsername, role: user.role },
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// ----------------------
// Routes
// ----------------------
app.use("/api/slot-calls", slotCallRoutes);
app.use("/api/gws", gwsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// Affiliates Route
app.get("/api/affiliates", async (req, res) => {
	const { start_at, end_at } = req.query;
	if (!start_at || !end_at)
		return res
			.status(400)
			.json({ error: "Missing start_at or end_at parameter" });

	const url = `https://services.rainbet.com/v1/external/affiliates?start_at=${start_at}&end_at=${end_at}&key=${process.env.RAINBET_API_KEY}`;
	try {
		const response = await fetch(url);
		const content = await response.text();
		if (!response.ok) throw new Error(content);
		res.json(JSON.parse(content));
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch affiliates data" });
	}
});

// XP Leaderboard API
app.get("/api/chk", async (req, res) => {
	try {
		const { minTime, maxTime } = req.query;
		let filter = {};

		if (minTime && maxTime) {
			filter.referredAt = {
				$gte: parseInt(minTime),
				$lte: parseInt(maxTime),
			};
		}

		const leaderboard = await Referral.find(filter)
			.sort({ xp: -1 })
			.limit(50)
			.select("-__v");

		res.json(leaderboard);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Health Check
app.get("/health", (req, res) => {
	res.status(200).json({ status: "OK", message: "KingDATA API is running" });
});

// ----------------------
// Start Server
// ----------------------
mongoose.connection.once("open", async () => {
	console.log("✅ MongoDB connection ready. Starting server...");

	app.listen(PORT, async () => {
		console.log(`🚀 Server running on port ${PORT}`);

		// Wait a bit to ensure all models are ready
		setTimeout(async () => {
			console.log("🌐 Fetching initial referrals...");
			await fetchReferrals(); // initial sync
		}, 2000); // 2-second delay just to be safe
	});
});
