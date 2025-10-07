const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
	userId: { type: String, required: true },
	username: { type: String },
	imageUrl: { type: String },
	xp: { type: Number, default: 0 },
	wagerAmount: { type: Number, default: 0 },
	depositAmount: { type: Number, default: 0 },
	commissionAmount: { type: Number, default: 0 },
	referredAt: { type: Number },
});

module.exports = mongoose.model("Referral", referralSchema);
