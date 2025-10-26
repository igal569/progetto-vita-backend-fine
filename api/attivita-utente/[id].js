const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Attività Utente";

module.exports = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing record id" });
  }

  // Deve essere DELETE
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Airtable delete singolo record: DELETE /TABLE/recXYZ
    const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;

    const air = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      }
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error /attivita-utente/[id] DELETE:", txt);
      return res.status(500).json({ error: "Airtable delete failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Server error /api/attivita-utente/[id]:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};
