// routes/referrals.js
import express from "express";
import Referral from "../models/Referral.js";

const router = express.Router();

// GET all referrals
router.get("/", async (req, res) => {
	try {
		// Optional: you can add query filters, e.g., min/max XP
		const { minXp, maxXp } = req.query;
		let filter = {};

		if (minXp) filter.xp = { ...filter.xp, $gte: parseInt(minXp) };
		if (maxXp) filter.xp = { ...filter.xp, $lte: parseInt(maxXp) };

		const referrals = await Referral.find(filter).sort({ referredAt: -1 }); // newest first
		res.status(200).json(referrals);
	} catch (err) {
		console.error("❌ Error fetching stored referrals:", err.message);
		res.status(500).json({ error: "Server error fetching referrals" });
	}
});

export default router;
