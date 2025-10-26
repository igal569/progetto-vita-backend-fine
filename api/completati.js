// /api/completati.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Log Completamenti";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

function ymdEuropeRome(d = new Date()) {
  const romeNow = new Date(
    d.toLocaleString("en-US", { timeZone: "Europe/Rome" })
  );
  const y = romeNow.getFullYear();
  const m = String(romeNow.getMonth() + 1).padStart(2, "0");
  const da = String(romeNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    const { email, date } = req.query || {};
    if (!email) {
      return sendError(res, 400, "Missing email");
    }

    const targetDay = date || ymdEuropeRome();

    // filtriamo per email e per giorno (ricavato da Data/Ora)
    const filterFormula =
      `AND(` +
      `LOWER({Email})=LOWER("${email}"),` +
      `DATETIME_FORMAT({Data/Ora}, 'YYYY-MM-DD')="${targetDay}"` +
      `)`;

    const url = new URL(`${API_ROOT}/${encodeURIComponent(TABLE)}`);
    url.searchParams.set("filterByFormula", filterFormula);
    url.searchParams.set("pageSize", "100");

    const air = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error GET /completati:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();

    // Preparo records in questo formato:
    // {
    //   logId: 'recXXX',              <-- id riga Log
    //   attivitaNum: 102              <-- valore campo "Attivita Utente" (numero)
    // }
    const out = (data.records || []).map(r => ({
      logId: r.id,
      attivitaNum: r.fields && r.fields["Attivita Utente"]
        ? Number(r.fields["Attivita Utente"])
        : null
    }));

    return res.status(200).json({ records: out });

  } catch (err) {
    console.error("Server error /api/completati:", err);
    return sendError(res, 500, "Internal error");
  }
};
