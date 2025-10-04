const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
	userId: String,
	username: String,
	xp: Number,
	referredAt: Number,
});

module.exports = mongoose.model("Referral", referralSchema);
