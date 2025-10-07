import axios from "axios";
import dotenv from "dotenv";
import Referral from "../models/Referral.js";

dotenv.config();

export async function fetchReferrals() {
	try {
		const url = `https://affiliates.chicken.gg/v1/referrals?key=${process.env.API_KEY}`;
		console.log("🌐 Fetching referrals from Chicken API:", url);

		const { data } = await axios.get(url);

		if (!data || !Array.isArray(data.referrals)) {
			console.warn("⚠️ No referrals array in API response:", data);
			return;
		}

		for (const ref of data.referrals) {
			await Referral.findOneAndUpdate(
				{ userId: ref.userId },
				{
					username: ref.displayName,
					xp: ref.xpEarned || 0,
					depositAmount: ref.depositAmount || 0,
					wagerAmount: ref.wagerAmount || 0,
					commissionAmount: ref.commissionAmount || 0,
					referredAt: ref.acquireTime,
				},
				{ upsert: true, new: true }
			);
		}

		console.log(`✅ Saved ${data.referrals.length} referrals`);
	} catch (err) {
		console.error(
			"❌ Error fetching referrals:",
			err.response?.data || err.message
		);
	}
}
