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

    const response = await fetch(
      `https://api.csgowin.com/apic/affiliate/external?${params.toString()}`,
      { headers: { "x-apikey": "108adfb76a" } }
    );

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("CSGO API returned non-JSON response:", text);
      return res.status(502).json({ message: "CSGO API returned invalid response" });
    }

    const data = await response.json();
    return res.json(data);

  } catch (error) {
    console.error("❌ CSGO leaderboard error:", error);
    return res.status(500).json({ message: "Failed to fetch CSGO leaderboard" });
  }
});

module.exports = router;
