const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // solo GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.BASE_ID;
  const TABLE = "Aree";

  try {
    // prendiamo tutte le aree (max 100 per stare larghi)
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}?pageSize=100`;

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("Airtable /Aree error:", txt);
      return res.status(500).json({ error: "Airtable request failed" });
    }

    const data = await r.json();

    // Risposta "pulita": solo quello che ci serve
    // es: [{id:"rec123", nome:"Mente"}, ...]
    const mapped = (data.records || []).map(rec => ({
      id: rec.id,
      nome: rec.fields?.Nome || rec.fields?.Title || ""
    }));

    return res.status(200).json({ records: mapped });
  } catch (err) {
    console.error("Server error /api/aree:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};
