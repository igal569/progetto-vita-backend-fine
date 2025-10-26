const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

module.exports = async (req, res) => {
  try {
    const { email, date } = req.query;
    if (!email || !date) {
      return res.status(400).json({ error: "Missing email or date" });
    }

    const filter = `AND(LOWER({Email})=LOWER("${email}"), {Data ISO}="${date}")`;
    const url = `${API_ROOT}/Log Completamenti?filterByFormula=${encodeURIComponent(filter)}`;

    const air = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error:", txt);
      return res.status(500).json({ error: "Airtable request failed" });
    }

    const data = await air.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Server error /api/completati:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};
