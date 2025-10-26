// /api/completati.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Log Completamenti";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    const { email, date } = req.query || {};
    if (!email || !date) {
      return sendError(res, 400, "Missing email or date");
    }

    // filtro:
    //  AND(
    //    LOWER({Email}) = LOWER("xxx"),
    //    {Data ISO} = "2025-10-26"
    //  )
    //
    // NB: il campo in Airtable deve chiamarsi esattamente "Data ISO"
    // e il campo email nel log deve chiamarsi "Email" (come l'abbiamo messo noi nel POST /api/log)

    const filterFormula =
      `AND(LOWER({Email})=LOWER("${email}"), {Data ISO}="${date}")`;

    const url = new URL(
      `${API_ROOT}/${encodeURIComponent(TABLE)}`
    );
    url.searchParams.set("filterByFormula", filterFormula);
    url.searchParams.set("pageSize", "100");

    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error GET /completati:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();

    // Risposta uniforme: { records: [ {id, fields:{...}}, ... ] }
    return res.status(200).json({
      records: data.records || []
    });

  } catch (err) {
    console.error("Server error /api/completati:", err);
    return sendError(res, 500, "Internal error");
  }
};
