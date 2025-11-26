const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

// GET /api/csgo/leaderboard
router.get("/leaderboard", async (req, res) => {
    try {
        // Correct timestamp: Jan 1, 2025 UTC
        const gt = new Date("2025-01-01T00:00:00Z").getTime();
        const lt = Date.now();

        const params = new URLSearchParams({
            code: "degenbomber",
            gt: gt.toString(),
            lt: lt.toString(),
            by: "wager",
            sort: "desc",
            search: "",
            take: "10",
            skip: "0"
        });

        const url = `https://api.csgowin.com/api/affiliate/external?${params.toString()}`;

        const response = await fetch(url, {
            headers: { "x-apikey": "0b08932086" }
        });

        // Detect HTML error responses (the reason your old code crashed)
        const text = await response.text();

        if (!response.ok) {
            console.error("❌ Remote API responded with error:", text);
            return res.status(502).json({ message: "Remote API error" });
        }

        // Try parsing JSON safely
        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error("❌ Invalid JSON returned:", text);
            return res.status(500).json({ message: "Invalid JSON from CSGOWin" });
        }

        return res.json(data);

    } catch (error) {
        console.error("❌ CSGO leaderboard error:", error);
        res.status(500).json({ message: "Failed to fetch CSGO leaderboard" });
    }
});

module.exports = router;
