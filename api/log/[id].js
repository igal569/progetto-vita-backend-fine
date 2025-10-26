const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Log Completamenti";

module.exports = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing record id" });
  }

  try {
    // --- GET: recupera un singolo log (per mostrare nota + umore nel diario) ---
    if (req.method === "GET") {
      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable error (GET /log/[id]):", txt);
        return res.status(500).json({ error: "Airtable request failed" });
      }

      const data = await r.json();
      return res.status(200).json(data);
    }

    // --- PATCH: aggiorna Nota / Umore esistenti ---
    if (req.method === "PATCH") {
      const body = req.body || {};
      const fields = {};

      if (body.Nota != null) {
        fields["Nota"] = body.Nota;
      }
      if (body.Umore != null) {
        fields["Umore"] = Number(body.Umore);
      }

      const r = await fetch(`${API_ROOT}/${encodeURIComponent(TABLE)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              id: id,
              fields
            }
          ]
        }),
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable error (PATCH /log/[id]):", txt);
        return res.status(500).json({ error: "Airtable patch failed" });
      }

      const data = await r.json();
      return res.status(200).json(data);
    }

    // --- DELETE: elimina il record di completamento (serve per "Annulla" e per togliere la spunta verde) ---
    if (req.method === "DELETE") {
      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;
      const r = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable error (DELETE /log/[id]):", txt);
        return res.status(500).json({ error: "Airtable delete failed" });
      }

      return res.status(200).json({ ok: true });
    }

    // metodo non supportato
    res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    console.error("Server error /api/log/[id]:", err);
    res.status(500).json({ error: "Internal error" });
  }
};
