const fetch = require("node-fetch");

// helper risposta errore
function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  // accettiamo solo GET come avevi visto
  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    // leggiamo le variabili ambiente GIUSTE (quelle che hai già su Vercel)
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = process.env.BASE_ID;

    // parametri opzionali dalla query, uguali a quelli che il frontend costruisce
    const {
      maxRecords,
      filterByFormula,
      sortField,
      sortDirection
    } = req.query || {};

    // costruiamo l'URL Airtable verso la tabella "Sessions"
    const tableName = "Sessions"; // <-- il nome è giusto come nella tua base
    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}`
    );

    if (maxRecords) url.searchParams.set("maxRecords", maxRecords);
    if (filterByFormula) url.searchParams.set("filterByFormula", filterByFormula);

    // supporto sort[0][field] / sort[0][direction] come nel frontend
    if (sortField) {
      url.searchParams.set("sort[0][field]", sortField);
      url.searchParams.set(
        "sort[0][direction]",
        sortDirection || "desc"
      );
    }

    // chiamata vera ad Airtable con il token segreto
    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();

    // rispondiamo al browser con i dati Airtable così com'è abituato il frontend
    return res.status(200).json(data);

  } catch (err) {
    console.error("Server error /api/sessions:", err);
    return sendError(res, 500, "Internal error");
  }
};
