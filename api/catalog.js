const fetch = require("node-fetch");

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    // prendiamo fino a 100 item dal catalogo
    const url = new URL(
      `https://api.airtable.com/v0/${process.env.BASE_ID}/Catalogo%20Attività`
    );
    url.searchParams.set("pageSize", "100");

    const air = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      },
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable /Catalogo Attività error:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();

    // rispondiamo con i records grezzi Airtable (id, fields...)
    return res.status(200).json(data);
  } catch (err) {
    console.error("Server error /api/catalog:", err);
    return sendError(res, 500, "Internal error");
  }
};
