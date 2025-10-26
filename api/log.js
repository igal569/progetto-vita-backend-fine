// /api/log.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Log Completamenti";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

// DELETE /api/log/:logId  -> rimane uguale sotto
// PATCH /api/log/:logId   -> rimane uguale sotto

module.exports = async (req, res) => {
  const { method } = req;

  if (method === "POST") {
    try {
      // CAMPI CHE CI ASPETTIAMO DAL FRONTEND
      const {
        Email,
        AttivitaUtenteNumero, // <-- questo è il valore di Attività Utente.Id, tipo 102
        Nota,
        Umore,
        DurataSec,
        ScoreMemoria,
        LivelloMemoria
      } = req.body || {};

      if (!Email) {
        return sendError(res, 400, "Missing Email");
      }
      if (!AttivitaUtenteNumero) {
        return sendError(res, 400, "Missing AttivitaUtenteNumero");
      }

      // costruiamo il body per Airtable
      const fields = {
        "Email": Email,
        "Attivita Utente": Number(AttivitaUtenteNumero),
      };

      if (Nota != null)           fields["Nota"] = String(Nota);
      if (Umore != null)          fields["Umore"] = Number(Umore);
      if (DurataSec != null)      fields["Durata (sec)"] = Number(DurataSec);
      if (ScoreMemoria != null)   fields["Score memoria"] = Number(ScoreMemoria);
      if (LivelloMemoria != null) fields["Livello memoria"] = Number(LivelloMemoria);

      // Data/Ora la lasciamo "Created time" in Airtable, quindi non la mandiamo noi.

      const airtableRes = await fetch(`${API_ROOT}/${encodeURIComponent(TABLE)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      });

      if (!airtableRes.ok) {
        const txt = await airtableRes.text();
        console.error("Airtable error POST /log:", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await airtableRes.json(); // {id:'rec...', fields:{...}}
      // ritorniamo al frontend l'id della riga Log creata, così lo possiamo cancellare dopo
      return res.status(200).json({
        id: data.id,
        fields: data.fields || {},
      });

    } catch (err) {
      console.error("Server error POST /api/log:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // PATCH /api/log/:id  (aggiorna nota/umore)
  if (method === "PATCH") {
    try {
      const logId = req.url.split("/").pop(); // /api/log/recXXXX
      if (!logId) return sendError(res, 400, "Missing log id");

      const { Nota, Umore } = req.body || {};
      const fields = {};
      if (Nota != null)  fields["Nota"] = String(Nota);
      if (Umore != null) fields["Umore"] = Number(Umore);

      const airtableRes = await fetch(
        `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(logId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
        }
      );

      if (!airtableRes.ok) {
        const txt = await airtableRes.text();
        console.error("Airtable error PATCH /log:", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await airtableRes.json();
      return res.status(200).json(data);

    } catch (err) {
      console.error("Server error PATCH /api/log:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // DELETE /api/log/:id
  if (method === "DELETE") {
    try {
      const logId = req.url.split("/").pop();
      if (!logId) return sendError(res, 400, "Missing log id");

      const airtableRes = await fetch(
        `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(logId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
        }
      );

      if (!airtableRes.ok) {
        const txt = await airtableRes.text();
        console.error("Airtable error DELETE /log:", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Server error DELETE /api/log:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  return sendError(res, 405, "Method not allowed");
};
