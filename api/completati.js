// /api/completati.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Log Completamenti";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

// helper: oggi in Europe/Rome => "YYYY-MM-DD"
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

    // data del giorno che ci interessa (YYYY-MM-DD, lato frontend usa ymd(dayObj))
    const targetDay = date || ymdEuropeRome();

    // IMPORTANTISSIMO:
    // Filtro:
    //  1) stessa email (LOWER confrontata)
    //  2) stessa data (giorno) estratta dal campo "Data/Ora"
    //
    // In Airtable possiamo confrontare solo la parte data con DATETIME_FORMAT(...)
    //
    // NOTA: CAMPO "Data/Ora" deve chiamarsi esattamente così.
    // NOTA: CAMPO "Utente" -> lookup email? No. Usiamo campo "Email" che salviamo nel POST /api/log.
    //
    // Quindi formula:
    // AND(
    //   LOWER({Email}) = LOWER("xxx@xxx"),
    //   DATETIME_FORMAT({Data/Ora}, 'YYYY-MM-DD') = "2025-10-26"
    // )
    //
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

    // Risposta diretta: {records:[...]} – ogni record ha fields.Attività Utente (link) e id
    return res.status(200).json({
      records: data.records || [],
    });
  } catch (err) {
    console.error("Server error /api/completati:", err);
    return sendError(res, 500, "Internal error");
  }
};
