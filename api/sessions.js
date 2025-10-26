// /api/sessions.js
const fetch = require("node-fetch");

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
    if (!AIRTABLE_TOKEN || !BASE_ID) {
      console.error("Missing env AIRTABLE_TOKEN or BASE_ID");
      return sendError(res, 500, "Server misconfigured");
    }

    // deviceId dal frontend
    const { deviceId } = req.query || {};
    if (!deviceId) {
      return sendError(res, 400, "deviceId required");
    }

    // costruiamo la query Airtable con filtro e sort
    // stesso filtro che usavi sul frontend vecchio:
    // AND({DeviceId}="<did>", NOT({Revoked}))
    const tableName = "Sessions";
    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}`
    );

    url.searchParams.set("maxRecords", "1");
    url.searchParams.set(
      "filterByFormula",
      `AND({DeviceId}="${deviceId}", NOT({Revoked}))`
    );
    url.searchParams.set("sort[0][field]", "CreatedAt");
    url.searchParams.set("sort[0][direction]", "desc");

    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable /Sessions error:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();

    // Rispondiamo così com'è (records[], fields.Email / fields.SessionId ecc.)
    // Il frontend poi fa:
    // const rec = d.records?.[0];
    // rec.fields.Email, rec.fields.SessionId ...
    return res.status(200).json({
      records: data.records || [],
    });
  } catch (err) {
    console.error("Server error /api/sessions:", err);
    return sendError(res, 500, "Internal error");
  }
};
