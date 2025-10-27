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

  // CREA UNA RIGA DI LOG (completata)
  if (method === "POST") {
    try {
      // Dal frontend arrivano:
      //  UtenteId            = recordId Airtable dell'utente (es. "recUSER123")
      //  AttivitaUtenteId    = recordId Airtable della riga Attività Utente (es. "recATTUT456")
      //  Nota, Umore, DurataSec (opzionali)
      const {
        UtenteId,
        AttivitaUtenteId,
        Nota,
        Umore,
        DurataSec,
        Email // <-- aggiungiamo anche email dalla request se vuoi
      } = req.body || {};

      if (!UtenteId) {
        return sendError(res, 400, "Missing UtenteId");
      }
      if (!AttivitaUtenteId) {
        return sendError(res, 400, "Missing AttivitaUtenteId");
      }

      // questo è QUEL pezzo che ti ho scritto prima
      const airtablePayload = {
        fields: {
          "Email": Email || "",                   // stringa email utente
          "Utente": [UtenteId],                   // link alla tabella Users
          "Attivita Utente": [AttivitaUtenteId],  // link alla tabella Attività Utente
          "Nota": Nota || "",
          "Umore": Umore != null ? Number(Umore) : null,
          "Durata (sec)": DurataSec != null ? Number(DurataSec) : null
          // "Data/Ora" NON la mando: ci pensa Airtable
        }
      };

      const r = await fetch(`${API_ROOT}/${encodeURIComponent(TABLE)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(airtablePayload)
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable create log error:", txt);
        return sendError(res, 500, "Airtable create log failed");
      }

      const data = await r.json();
      // data.records NON c'è nel create singolo, Airtable risponde {id:"recXXX", fields:{...}}
      return res.status(200).json({
        id: data.id,        // <-- importantissimo: l'id della riga Log Completamenti
        fields: data.fields // opzionale se ti serve
      });

    } catch (err) {
      console.error("POST /api/log error:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // AGGIORNA NOTA / UMORE (diario)
  if (method === "PATCH") {
    try {
      const logId = req.query.id;
      if (!logId) return sendError(res, 400, "Missing log id");

      const { Nota, Umore } = req.body || {};

      const airtablePayload = {
        fields: {
          "Nota": Nota || "",
          "Umore": Umore != null ? Number(Umore) : null
        }
      };

      const r = await fetch(
        `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(logId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(airtablePayload)
        }
      );

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable patch log error:", txt);
        return sendError(res, 500, "Airtable patch log failed");
      }

      const data = await r.json();
      return res.status(200).json({
        id: data.id,
        fields: data.fields
      });
    } catch (err) {
      console.error("PATCH /api/log error:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // ELIMINA LA RIGA DI LOG (annulla completamento)
  if (method === "DELETE") {
    try {
      const logId = req.query.id;
      if (!logId) {
        return sendError(res, 400, "Missing log id");
      }

      const r = await fetch(
        `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(logId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`
          }
        }
      );

      if (!r.ok) {
        const txt = await r.text();
        console.error("Airtable delete log error:", txt);
        return sendError(res, 500, "Airtable delete failed");
      }

      // Airtable sul delete risponde { deleted: true, id: "recXXX" }
      const data = await r.json();
      return res.status(200).json({ deleted: data.deleted, id: data.id });
    } catch (err) {
      console.error("DELETE /api/log error:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // metodi diversi
  return sendError(res, 405, "Method not allowed");
};
