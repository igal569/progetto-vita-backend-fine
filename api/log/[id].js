// /api/log/[id].js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Log Completamenti";

// piccolo helper errore
function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return sendError(res, 400, "Missing record id");
  }

  try {
    // --- GET: recupera un singolo log (per la nota / mood) ---
    if (req.method === "GET") {
      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable error (GET /log/[id]):", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await r.json();
      return res.status(200).json(data);
    }

    // --- PATCH: aggiorna Nota / Umore ---
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
        return sendError(res, 500, "Airtable patch failed");
      }

      const data = await r.json();
      return res.status(200).json(data);
    }

    // --- DELETE: elimina un log completamento ---
    if (req.method === "DELETE") {
      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;
      const r = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable error (DELETE /log/[id]) http:", txt);
        return sendError(res, 500, "Airtable delete failed (http)");
      }

      const data = await r.json();
      // Airtable in DELETE risponde tipo { "id": "...", "deleted": true }
      if (!data.deleted) {
        console.error("Airtable error (DELETE /log/[id]) logical:", data);
        return sendError(res, 500, "Airtable delete failed (logical)");
      }

      return res.status(200).json({
        ok: true,
        id: data.id
      });
    }

    // --- altri metodi non ammessi ---
    return sendError(res, 405, "Method not allowed");

  } catch (err) {
    console.error("Server error /api/log/[id]:", err);
    return sendError(res, 500, "Internal error");
  }
};
