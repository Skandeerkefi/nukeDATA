const ChickenReferral = require("../models/ChickenReferral");
const fetch = require("node-fetch"); // node-fetch v2

const API_KEY = process.env.API_KEY;

async function fetchAndStoreChickenData() {
	if (!API_KEY) {
		console.error("❌ API_KEY is not defined!");
		return;
	}

	try {
		const url = `https://affiliates.chicken.gg/v1/referrals?key=${API_KEY}`;
		console.log("Fetching Chicken API:", url);

		const response = await fetch(url);
		const text = await response.text();

		console.log("Chicken API raw response:", text);

		const data = JSON.parse(text);

		if (!data.referrals || !Array.isArray(data.referrals)) {
			console.error("❌ Unexpected Chicken API response format");
			return;
		}

		for (const item of data.referrals) {
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
		console.error("❌ Error fetching Chicken data:", err);
	}
}

async function getLeaderboard(req, res) {
	try {
		const leaderboard = await ChickenReferral.find().sort({ xp: -1 }).limit(50);

		res.json(leaderboard);
	} catch (err) {
		console.error("❌ Leaderboard fetch error:", err);
		res.status(500).json({ error: err.message });
	}
}

module.exports = { fetchAndStoreChickenData, getLeaderboard };
