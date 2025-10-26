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

    // filtro: record dell'utente (per email) in quella data ISO
    const filter = `AND(LOWER({Email})=LOWER("${email}"), {Data ISO}="${date}")`;

    const url = `${API_ROOT}/Log%20Completamenti?filterByFormula=${encodeURIComponent(filter)}`;

    const air = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error /completati:", txt);
      return res.status(500).json({ error: "Airtable request failed" });
    }

    const data = await air.json();

    // ritorniamo come {records:[...]} perché il frontend se lo aspetta così
    return res.status(200).json({
      records: data.records || []
    });
  } catch (err) {
    console.error("Server error /api/completati:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};
