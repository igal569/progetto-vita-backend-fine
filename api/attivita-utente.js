const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Attività Utente";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return sendError(res, 400, "Missing userId");
    }

    // se "Utente" è un campo link a Users, la formula giusta è:
    // FIND("recXXXX", ARRAYJOIN({Utente})) > 0
    // così becca tutte le righe dove quel record è linkato
    const filterFormula = `FIND("${userId}", ARRAYJOIN({Utente}))>0`;

    const url = new URL(`${API_ROOT}/${encodeURIComponent(TABLE)}`);
    url.searchParams.set("filterByFormula", filterFormula);
    url.searchParams.set("pageSize", "100");

    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error /attivita-utente:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();

    // restituiamo lo stesso shape che il frontend già usa:
    // { records: [ { id, fields: {...} }, ... ] }
    return res.status(200).json({
      records: data.records || [],
    });
  } catch (err) {
    console.error("Server error /attivita-utente:", err);
    return sendError(res, 500, "Internal error");
  }
};
