const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_URL = `https://api.airtable.com/v0/${BASE_ID}/Aree`;

module.exports = async (req, res) => {
  try {
    const r = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("Airtable error:", txt);
      return res.status(500).json({ error: "Airtable request failed" });
    }

    const data = await r.json();

    // 🔄 Torniamo al formato classico Airtable
    const records = (data.records || []).map(x => ({
      id: x.id,
      fields: {
        Nome: x.fields?.["Nome"] || x.fields?.["nome"] || x.nome || "",
        Colore: x.fields?.["Colore"] || x.fields?.["colore"] || "",
        Emoji: x.fields?.["Emoji"] || x.fields?.["emoji"] || "",
      },
    }));

    res.status(200).json({ records });
  } catch (err) {
    console.error("Server error /api/aree:", err);
    res.status(500).json({ error: "Internal error" });
  }
};
