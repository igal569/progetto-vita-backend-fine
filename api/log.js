// /api/log.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE_LOG = "Log Completamenti";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

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

// POST /api/log
// body: { Email, AttivitaUtenteId, Nota?, Umore?, DurataSec? }
async function handlePOST(req, res) {
  try {
    const { Email, AttivitaUtenteId, Nota, Umore, DurataSec } = req.body || {};

    if (!Email) return sendError(res, 400, "Missing Email");
    if (!AttivitaUtenteId) return sendError(res, 400, "Missing AttivitaUtenteId");

    const fields = {
      Email: Email,
      "Attivita Utente": [AttivitaUtenteId],
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

    const data = await airtableFetch(TABLE_LOG, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });

    return res.status(200).json({
      id: data.id,
      fields: data.fields || {},
    });
  } catch (err) {
    console.error("POST /api/log error:", err);
    return sendError(res, 500, "Internal error");
  }
}

// GET /api/log?id=recXXXX
async function handleGET(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return sendError(res, 400, "Missing id");

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

// PATCH /api/log?id=recXXXX
// body: { Nota?, Umore? }
async function handlePATCH(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return sendError(res, 400, "Missing id");

    const { Nota, Umore } = req.body || {};
    const fields = {};
    if (Nota != null) fields["Nota"] = Nota;
    if (Umore != null) fields["Umore"] = Number(Umore);

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

// DELETE /api/log?id=recXXXX
async function handleDELETE(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return sendError(res, 400, "Missing id");

    await airtableFetch(`${TABLE_LOG}/${id}`, {
      method: "DELETE",
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/log error:", err);
    return sendError(res, 500, "Internal error");
  }
}

module.exports = async (req, res) => {
  const { method } = req;

  if (method === "POST")   return handlePOST(req, res);
  if (method === "GET")    return handleGET(req, res);
  if (method === "PATCH")  return handlePATCH(req, res);
  if (method === "DELETE") return handleDELETE(req, res);

  return sendError(res, 405, "Method not allowed");
};
