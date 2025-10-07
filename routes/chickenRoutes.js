const express = require("express");
const router = express.Router();
const {
	fetchAndStoreChickenData,
	getLeaderboard,
} = require("../controllers/chickenController");

// Route for frontend to get leaderboard
router.get("/leaderboard", getLeaderboard);

// Optional: manual refresh route (for testing)
router.post("/refresh", async (req, res) => {
	await fetchAndStoreChickenData();
	res.json({ message: "Chicken data refreshed" });
});
// POST manual fetch from Chicken API (for testing)
router.post("/fetch-test", async (req, res) => {
	try {
		await fetchAndStoreChickenData();
		res.json({ message: "Chicken data fetched and stored successfully!" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
module.exports = router;
