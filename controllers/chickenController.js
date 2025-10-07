const ChickenReferral = require("../models/ChickenReferral");
const fetch = (...args) =>
	import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_KEY = process.env.API_KEY;

async function fetchAndStoreChickenData() {
	try {
		const now = Date.now();
		const fiveMinAgo = now - 1 * 60 * 1000;

		const url = `https://affiliates.chicken.gg/v1/referrals?key=${process.env.API_KEY}&minTime=${fiveMinAgo}&maxTime=${now}`;
		const response = await fetch(url);
		const data = await response.json();

		const referrals = data.referrals;
		if (!Array.isArray(referrals)) {
			console.error("❌ Unexpected API response format");
			return;
		}

		for (const item of referrals) {
			const { userId, displayName, xpEarned, acquireTime } = item;
			await ChickenReferral.findOneAndUpdate(
				{ userId },
				{
					xp: xpEarned,
					displayName,
					updatedAt: new Date(acquireTime),
				},
				{ upsert: true, new: true }
			);
		}

		console.log(
			`✅ Chicken leaderboard updated at ${new Date().toISOString()}`
		);
	} catch (err) {
		console.error("❌ Error fetching Chicken data:", err.message);
	}
}

// Controller for frontend route
async function getLeaderboard(req, res) {
	try {
		const leaderboard = await ChickenReferral.find().sort({ xp: -1 }).limit(50); // top 50
		res.json(leaderboard);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

module.exports = { fetchAndStoreChickenData, getLeaderboard };
