const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

// GET /api/csgo/leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const params = new URLSearchParams({
      code: "degenbomber",
      gt: new Date("2023-01-01").getTime(), // realistic timestamp
      lt: Date.now(),
      by: "wager",
      sort: "desc",
      take: 10,
      skip: 0
    });

    const response = await fetch(`https://api.csgowin.com/apic/affiliate/external?${params.toString()}`, {
      headers: { "x-apikey": "0b08932086" }
    });

    const text = await response.text();
    console.log("CSGO API response:", text);

    const data = JSON.parse(text); // parse after confirming it is JSON
    return res.json(data);

  } catch (error) {
    console.error("❌ CSGO leaderboard error:", error);
    return res.status(500).json({ message: "Failed to fetch CSGO leaderboard" });
  }
});


module.exports = router;
