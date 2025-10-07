const mongoose = require("mongoose");

const chickenReferralSchema = new mongoose.Schema({
	userId: String, // Chicken user ID or username
	xp: Number, // XP earned
	referrals: Number, // Number of referrals
	updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChickenReferral", chickenReferralSchema);
