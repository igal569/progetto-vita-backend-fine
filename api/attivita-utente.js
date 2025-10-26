const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

// GET /api/attivita-utente?email=foo@bar.com
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ error: "Method not allowed" });
  }

  try {
    const email = req.query.email;
    if (!email) {
      return res
        .status(400)
        .json({ error: "Missing email" });
    }

    // questa è la stessa formula che usavi prima nel frontend
    // OR(LOWER(ARRAYJOIN({Utente}))=LOWER("email"), LOWER({Utente})=LOWER("email"))
    const filterFormula = `OR(LOWER(ARRAYJOIN({Utente}))=LOWER("${email}"),LOWER({Utente})=LOWER("${email}"))`;

    // chiamiamo Airtable lato server (qui è ok usare il token segreto)
    const url = new URL(`${API_ROOT}/${encodeURIComponent("Attività Utente")}`);
    url.searchParams.set("filterByFormula", filterFormula);
    url.searchParams.set("pageSize", "100");

    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error /attivita-utente:", txt);
      return res
        .status(500)
        .json({ error: "Airtable request failed" });
    }

    const data = await air.json();

    // rispondiamo al client con lo stesso shape che si aspetta loadAllAttivitaUtente()
    return res.status(200).json({
      records: data.records || []
    });

  } catch (err) {
    console.error("Server error /attivita-utente:", err);
    return res
      .status(500)
      .json({ error: "Internal error" });
  }
};
