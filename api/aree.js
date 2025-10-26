// /api/aree.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = process.env.BASE_ID;
    if (!AIRTABLE_TOKEN || !BASE_ID) {
      console.error("Missing env AIRTABLE_TOKEN or BASE_ID");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/Aree`
    );
    // se vuoi ordinare alfabetico:
    url.searchParams.set("sort[0][field]", "Nome");
    url.searchParams.set("sort[0][direction]", "asc");

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("Airtable /Aree error:", txt);
      return res.status(500).json({ error: "Airtable request failed" });
    }

    const data = await r.json();

    // trasformiamo nel formato che il frontend si aspetta:
    // [{ id, nome }]
    const records = (data.records || []).map(x => ({
      id: x.id,
      nome:
        x.fields?.["Nome"] ||
        x.fields?.["nome"] ||
        x.nome ||
        "",
    }));

    return res.status(200).json({ records });
  } catch (err) {
    console.error("Server error /api/aree:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};
