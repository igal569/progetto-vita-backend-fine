// /api/log/[id].js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Log Completamenti";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  const { id } = req.query;

  // 0. sanity check env
  if (!AIRTABLE_TOKEN || !BASE_ID) {
    console.error("Missing env AIRTABLE_TOKEN or BASE_ID");
    return sendError(res, 500, "Server misconfigured");
  }

  // 1. sanity check id
  if (!id) {
    return sendError(res, 400, "Missing record id");
  }

  try {
    // === GET: recupera un singolo log (per mostrare nota/umore già salvati)
    if (req.method === "GET") {
      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable error (GET log/[id]):", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await r.json();
      return res.status(200).json(data);
    }

    // === PATCH: aggiorna Nota / Umore dal Diario
    if (req.method === "PATCH") {
      const body = req.body || {};
      const fields = {};

      if (body.Nota != null) {
        fields["Nota"] = body.Nota;
      }
      if (body.Umore != null) {
        fields["Umore"] = Number(body.Umore);
      }

      // se non stiamo aggiornando niente evitiamo errore Airtable
      if (Object.keys(fields).length === 0) {
        return sendError(res, 400, "No fields to update");
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
        console.error("Airtable error (PATCH log/[id]):", txt);
        return sendError(res, 500, "Airtable patch failed");
      }

      const data = await r.json();
      return res.status(200).json(data);
    }

    // === DELETE: usato per "Annulla" (timer o attività normale)
    if (req.method === "DELETE") {
      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;

      const r = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable error (DELETE log/[id]):", txt);
        return sendError(res, 500, "Airtable delete failed");
      }

      return res.status(200).json({ ok: true });
    }

    // metodo non supportato
    return sendError(res, 405, "Method not allowed");

  } catch (err) {
    console.error("Server error /api/log/[id]:", err);
    return sendError(res, 500, "Internal error");
  }
};
