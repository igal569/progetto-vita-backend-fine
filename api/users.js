const fetch = require("node-fetch");

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    const { email, maxRecords } = req.query || {};

    // costruiamo la query Airtable come faceva il front-end
    // filtro: LOWER({Email})=LOWER("email")
    const filter = email
      ? `LOWER({Email})=LOWER("${email}")`
      : "";

    const url = new URL(
      `https://api.airtable.com/v0/${process.env.BASE_ID}/Users`
    );

    if (filter) {
      url.searchParams.set("filterByFormula", filter);
    }
    url.searchParams.set("maxRecords", maxRecords || "1");

    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable /Users error:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();
    // Rispondiamo direttamente i records (id e fields)
    return res.status(200).json(data);
  } catch (err) {
    console.error("Server error /api/users:", err);
    return sendError(res, 500, "Internal error");
  }
};
