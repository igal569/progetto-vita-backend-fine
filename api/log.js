// /api/log.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Log Completamenti";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  const { method } = req;

  // --- CREA NUOVO LOG (come "aggiungi") ---
  if (method === "POST") {
    try {
      const body = req.body || {};
      // { UtenteId, AttivitaUtenteId, Email }

      if (!body.UtenteId || !body.AttivitaUtenteId) {
        return sendError(res, 400, "Missing fields");
      }

      const fields = {
        "Utente": [body.UtenteId],               // link a Users
        "Attivita Utente": [body.AttivitaUtenteId], // link a Attività Utente
        "Email": body.Email || ""
      };

      const air = await fetch(`${API_ROOT}/${encodeURIComponent(TABLE)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: [{ fields }] })
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable POST /log error:", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await air.json();
      const created = data.records?.[0];
      return res.status(200).json({ id: created?.id });
    } catch (err) {
      console.error("Server error POST /api/log:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // --- ELIMINA LOG (come "rimuovi") ---
  if (method === "DELETE") {
    const { id } = req.query;
    if (!id) return sendError(res, 400, "Missing id");

    try {
      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;
      const air = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable DELETE /log error:", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await air.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error("Server error DELETE /api/log:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  return sendError(res, 405, "Method not allowed");
};
