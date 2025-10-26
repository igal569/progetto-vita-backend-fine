// /api/log.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE_LOG = "Log Completamenti";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

// helper per parlare con Airtable
async function airtableFetch(path, opt = {}) {
  const r = await fetch(`${API_ROOT}/${encodeURIComponent(path)}`, {
    ...opt,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(opt.headers || {}),
    },
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `Airtable error ${r.status}`);
  }
  return r.json();
}

// =========================
// POST /api/log
// crea una riga su "Log Completamenti"
// Body JSON dal frontend:
// {
//   Email: "user@mail.com",
//   AttivitaUtenteId: "recXXXX",   <-- obbligatorio
//   Nota: "...",                   <-- opzionale
//   Umore: 4,                      <-- opzionale (numero)
//   DurataSec: 123                 <-- opzionale (numero)
// }
//
// NB: "Data/Ora" NON la mandiamo. Airtable la mette da solo.
// NB: "Attivita Utente" è un campo link -> DEVE essere array ["recXXXX"]
// =========================
async function handlePOST(req, res) {
  try {
    const { Email, AttivitaUtenteId, Nota, Umore, DurataSec } = req.body || {};

    if (!Email) {
      return sendError(res, 400, "Missing Email");
    }
    if (!AttivitaUtenteId) {
      return sendError(res, 400, "Missing AttivitaUtenteId");
    }

    const fields = {
      Email: Email,
      "Attivita Utente": [AttivitaUtenteId], // campo link
    };

    if (Nota != null && Nota !== "") {
      fields["Nota"] = Nota;
    }
    if (Umore != null && Umore !== "") {
      fields["Umore"] = Number(Umore);
    }
    if (DurataSec != null && DurataSec !== "") {
      fields["Durata (sec)"] = Number(DurataSec);
    }

    // crea record
    const data = await airtableFetch(TABLE_LOG, {
      method: "POST",
      body: JSON.stringify({
        fields,
      }),
    });

    // rispondo con { id, fields }
    return res.status(200).json({
      id: data.id,
      fields: data.fields || {},
    });
  } catch (err) {
    console.error("POST /api/log error:", err);
    return sendError(res, 500, "Internal error");
  }
}

// =========================
// GET /api/log/:id
// restituisce UNA riga (per ricaricare Nota/Umore quando riapri il diario)
// =========================
async function handleGET(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) {
      return sendError(res, 400, "Missing id");
    }

    // leggi record
    const data = await airtableFetch(`${TABLE_LOG}/${id}`, {
      method: "GET",
    });

    return res.status(200).json({
      id: data.id,
      fields: data.fields || {},
    });
  } catch (err) {
    console.error("GET /api/log error:", err);
    return sendError(res, 500, "Internal error");
  }
}

// =========================
// PATCH /api/log/:id
// aggiorna Nota, Umore (es. Modifica diario)
// Body JSON:
// { Nota: "...", Umore: 3 }
// =========================
async function handlePATCH(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) {
      return sendError(res, 400, "Missing id");
    }

    const { Nota, Umore } = req.body || {};
    const fields = {};
    if (Nota != null) {
      fields["Nota"] = Nota;
    }
    if (Umore != null) {
      fields["Umore"] = Number(Umore);
    }

    const data = await airtableFetch(`${TABLE_LOG}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    });

    return res.status(200).json({
      id: data.id,
      fields: data.fields || {},
    });
  } catch (err) {
    console.error("PATCH /api/log error:", err);
    return sendError(res, 500, "Internal error");
  }
}

// =========================
// DELETE /api/log/:id
// elimina la riga dal log (toggle OFF)
// =========================
async function handleDELETE(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) {
      return sendError(res, 400, "Missing id");
    }

    // cancella record
    await airtableFetch(`${TABLE_LOG}/${id}`, {
      method: "DELETE",
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/log error:", err);
    return sendError(res, 500, "Internal error");
  }
}

// =========================
// Router principale
// =========================
module.exports = async (req, res) => {
  const { method } = req;

  if (method === "POST")   return handlePOST(req, res);
  if (method === "GET")    return handleGET(req, res);
  if (method === "PATCH")  return handlePATCH(req, res);
  if (method === "DELETE") return handleDELETE(req, res);

  return sendError(res, 405, "Method not allowed");
};
