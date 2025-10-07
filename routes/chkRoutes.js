import express from "express";
import Referral from "../models/Referral.js"; // adjust path if needed

const router = express.Router();

// GET /api/chk?minTime=xxx&maxTime=yyy
router.get("/", async (req, res) => {
	try {
		const { minTime, maxTime } = req.query;

		// Build MongoDB filter
		const filter = {};
		if (minTime || maxTime) {
			filter.referredAt = {};
			if (minTime) filter.referredAt.$gte = parseInt(minTime);
			if (maxTime) filter.referredAt.$lte = parseInt(maxTime);
		}

		// Fetch top 50 referrals sorted by XP descending
		const leaderboard = await Referral.find(filter)
			.sort({ xp: -1 })
			.limit(50)
			.select("-__v -_id"); // optional: hide __v and _id

		res.json(leaderboard);
	} catch (err) {
		console.error("Error fetching /api/chk:", err);
		res.status(500).json({ error: err.message });
	}
});

export default router;
