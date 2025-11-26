const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

// GET /api/csgo/leaderboard
router.get("/leaderboard", async (req, res) => {
    try {
        const params = new URLSearchParams({
            code: "degenbomber",
            gt: new Date("2025").getTime(),
            lt: Date.now(),
            by: "wager",       // sorting key
            sort: "desc",      // desc or asc
            search: "",        // optional
            take: 10,          // limit
            skip: 0            // offset
        });

        const response = await fetch(
            `https://api.csgowin.com/apic/affiliate/external?${params.toString()}`,
            { headers: { "x-apikey": "0b08932086" } }
        );

        const data = await response.json();
        return res.json(data);

    } catch (error) {
        console.error("❌ CSGO leaderboard error:", error);
        return res.status(500).json({ message: "Failed to fetch CSGO leaderboard" });
    }
});

module.exports = router;
