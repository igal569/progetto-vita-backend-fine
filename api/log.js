// /api/log.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

// Data di oggi in Europa/Roma -> "YYYY-MM-DD"
function todayISOEuropeRome() {
  try {
    const nowRome = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" })
    );
    const y = nowRome.getFullYear();
    const m = String(nowRome.getMonth() + 1).padStart(2, "0");
    const d = String(nowRome.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch (e) {
    // fallback UTC se per qualche motivo il timezone fallisce
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

// Prende email utente dalla tabella Users partendo dal suo recordId Airtable
async function fetchUserEmail(userId) {
  if (!userId) return null;

  const url = `${API_ROOT}/Users/${encodeURIComponent(userId)}`;

  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  if (!r.ok) {
    const txt = await r.text();
    console.error("Airtable error fetching user email:", txt);
    throw new Error("Failed to fetch user email");
  }

  const data = await r.json();
  // Campo email nel record Users (mettiamo entrambi i casi possibili)
  return data.fields?.["Email"] || data.fields?.["email"] || null;
}

module.exports = async (req, res) => {
  // Per ora supportiamo solo POST
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed");
  }

  // check env (aiuta debug se su Vercel dimentichi le variabili)
  if (!AIRTABLE_TOKEN || !BASE_ID) {
    console.error("Missing env AIRTABLE_TOKEN or BASE_ID");
    return sendError(res, 500, "Server misconfigured");
  }

  try {
    const body = req.body || {};
    // body atteso dal frontend:
    // {
    //   UtenteId: CURRENT_USER_ID,
    //   AttivitaUtenteId: attId,
    //   Nota: "...",        // opzionale
    //   Umore: 3,           // opzionale
    //   DurataSec: 120      // opzionale
    // }

    const {
      UtenteId,
      AttivitaUtenteId,
      Nota,
      Umore,
      DurataSec
    } = body;

    if (!UtenteId || !AttivitaUtenteId) {
      return sendError(res, 400, "Missing UtenteId or AttivitaUtenteId");
    }

    // 1. Recupero email utente (serve per /api/completati)
    let userEmail = null;
    try {
      userEmail = await fetchUserEmail(UtenteId);
    } catch (e) {
      console.warn("Non riesco a leggere email utente, continuo senza:", e.message);
    }

    // 2. Preparo fields per Airtable "Log Completamenti"
    const fields = {
      "Utente": [UtenteId],                    // link a Users
      "Attività Utente": [AttivitaUtenteId],   // link a Attività Utente
      "Data ISO": todayISOEuropeRome()         // es. "2025-10-26"
    };

    if (userEmail) {
      fields["Email"] = userEmail;
    }

    if (Nota != null && Nota !== "") {
      fields["Nota"] = Nota;
    }
    if (Umore != null && Umore !== "") {
      fields["Umore"] = Number(Umore);
    }
    if (DurataSec != null && DurataSec !== "") {
      // in Airtable il campo deve chiamarsi esattamente "Durata (sec)"
      fields["Durata (sec)"] = Number(DurataSec);
    }

    // 3. Creo il record su "Log Completamenti"
    const LOG_TABLE = encodeURIComponent("Log Completamenti");
    const air = await fetch(`${API_ROOT}/${LOG_TABLE}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{ fields }],
      }),
    });

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error POST /log:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();
    // Airtable risponde { records: [ { id:"recXXX", fields:{...} } ] }
    const created = data.records?.[0] || null;

    return res.status(200).json({
      id: created?.id || null,
      fields: created?.fields || {}
    });

  } catch (err) {
    console.error("Server error POST /api/log:", err);
    return sendError(res, 500, "Internal error");
  }
};
