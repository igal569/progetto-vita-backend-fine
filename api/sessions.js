const fetch = require("node-fetch");

// helper risposta errore
function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = process.env.BASE_ID;

    // prendiamo il deviceId dal querystring (quello che il frontend manda)
    const { deviceId } = req.query || {};

    // costruiamo la query Airtable con lo stesso filtro che usavi prima:
    //   AND({DeviceId}="...", NOT({Revoked}))
    //
    // NB: se non arriva deviceId, non mandiamo filterByFormula e semplicemente restituiamo []
    const tableName = "Sessions";
    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}`
    );

    url.searchParams.set("maxRecords", "1");
    // ordina per CreatedAt desc
    url.searchParams.set("sort[0][field]", "CreatedAt");
    url.searchParams.set("sort[0][direction]", "desc");

    if (deviceId) {
      const formula = `AND({DeviceId}="${deviceId}", NOT({Revoked}))`;
      url.searchParams.set("filterByFormula", formula);
    }

    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error /sessions:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();

    // ritorniamo pari pari {records:[...]} così il frontend può fare:
    // const rec = d.records?.[0]
    return res.status(200).json({
      records: data.records || []
    });

  } catch (err) {
    console.error("Server error /api/sessions:", err);
    return sendError(res, 500, "Internal error");
  }
};
