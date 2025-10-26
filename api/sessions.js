const fetch = require("node-fetch");

// piccola funzione helper per rispondere con errore pulito
function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  // noi accettiamo solo GET (la tua app fa GET per leggere la sessione)
  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    // prendiamo eventuali query params passati dal frontend,
    // esempio: ?maxRecords=1&filterByFormula=...
    const { maxRecords, filterByFormula, sortField, sortDirection } = req.query || {};

    // costruiamo l'URL Airtable come faceva prima il frontend
    // Tabella: "Sessions"
    const baseId = process.env.AIRTABLE_BASE;
    const table = "Sessions";

    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);

    if (maxRecords) url.searchParams.set("maxRecords", maxRecords);
    if (filterByFormula) url.searchParams.set("filterByFormula", filterByFormula);
    // prima nel codice c'era anche sort[0][field]=CreatedAt ecc, quindi lo supportiamo:
    if (sortField) {
      url.searchParams.set("sort[0][field]", sortField);
      url.searchParams.set("sort[0][direction]", sortDirection || "desc");
    }

    // chiamata a Airtable con la chiave segreta lato server
    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();

    // Rispondiamo 1:1 alla tua app
    return res.status(200).json(data);
  } catch (err) {
    console.error("Server error /api/sessions:", err);
    return sendError(res, 500, "Internal error");
  }
};
