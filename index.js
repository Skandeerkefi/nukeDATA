// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const fetch = require("node-fetch"); // Use node-fetch in Node.js
require("dotenv").config();

const { fetchAndStoreChickenData } = require("./controllers/chickenController");
const { drawWinnerAuto } = require("./controllers/gwsController");
const GWS = require("./models/GWS");
const { User } = require("./models/User");
const { SlotCall } = require("./models/SlotCall");

const slotCallRoutes = require("./routes/slotCallRoutes");
const gwsRoutes = require("./routes/gwsRoutes");
const chickenRoutes = require("./routes/chickenRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------
// Check critical env vars
// ----------------------
if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined!");
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined!");
if (!process.env.API_KEY) throw new Error("API_KEY is not defined!");

// ----------------------
// CORS Middleware
// ----------------------
const allowedOrigins = [
	"http://localhost:5173",
	"https://degenbomber.vercel.app",
	"https://nukedata-production.up.railway.app",
];
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin))
				return callback(null, true);
			callback(new Error("CORS policy: This origin is not allowed"));
		},
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

// ----------------------
// JSON Parsing Middleware
// ----------------------
app.use(express.json());

// ----------------------
// MongoDB Connection
// ----------------------
mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

// server.js snippet
mongoose
	.connect(process.env.MONGO_URI)
	.then(async () => {
		console.log("✅ MongoDB connected");

		// Initial fetch after connection is ready
		try {
			await fetchAndStoreChickenData();
			console.log("✅ Initial Chicken leaderboard populated");
		} catch (err) {
			console.error("❌ Initial fetch failed:", err);
		}

		// Start cron jobs AFTER DB is connected
		cron.schedule("*/5 * * * *", async () => {
			console.log("🐔 Running Chicken leaderboard update...");
			try {
				await fetchAndStoreChickenData();
			} catch (err) {
				console.error("❌ Error fetching Chicken data:", err);
			}
		});

		cron.schedule("* * * * *", async () => {
			console.log("🎁 Running giveaway auto-draw job...");
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
				console.error("❌ Error during auto draw:", err);
			}
		});
	})
	.catch((err) => {
		console.error("❌ MongoDB connection error:", err);
		process.exit(1);
	});

// ----------------------
// Logging Middleware
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

// Chicken leaderboard update every 5 minutes
cron.schedule("*/5 * * * *", async () => {
	console.log("🐔 Running Chicken leaderboard update...");
	try {
		await fetchAndStoreChickenData();
		console.log("✅ Chicken leaderboard updated successfully.");
	} catch (err) {
		console.error("❌ Error fetching Chicken data:", err);
	}
});

// Auto-draw giveaways every minute
cron.schedule("* * * * *", async () => {
	console.log("🎁 Running giveaway auto-draw job...");
	try {
		const giveawaysToDraw = await GWS.find({
			state: "active",
			endTime: { $lte: new Date() },
		}).populate("participants");
		for (const gws of giveawaysToDraw) {
			await drawWinnerAuto(gws);
			console.log(`Giveaway ${gws._id} winner drawn automatically.`);
		}
	} catch (err) {
		console.error("❌ Error during auto draw:", err);
	}
});

// ----------------------
// Routes
// ----------------------
app.use("/api/slot-calls", slotCallRoutes);
app.use("/api/gws", gwsRoutes);
app.use("/api/chicken", chickenRoutes);

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
	try {
		const { kickUsername, rainbetUsername, password, confirmPassword } =
			req.body;
		if (password !== confirmPassword)
			return res.status(400).json({ message: "Passwords do not match." });

		const existing = await User.findOne({
			$or: [{ kickUsername }, { rainbetUsername }],
		});
		if (existing)
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

// Health Check
app.get("/health", (req, res) =>
	res.status(200).json({ status: "OK", message: "Server is running" })
);

// ----------------------
// Start Server
// ----------------------
app.listen(PORT, () => {
	console.log(`✅ Server is running at http://localhost:${PORT}`);
	// Initial fetch to populate Chicken leaderboard
	fetchAndStoreChickenData().catch((err) =>
		console.error("Initial Chicken fetch failed:", err)
	);
});
