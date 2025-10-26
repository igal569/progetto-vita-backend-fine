// /api/log.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

// helper per avere la data "oggi" in formato YYYY-MM-DD Europa/Roma
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
    // fallback: UTC (meglio di niente)
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

// helper: dato l'id utente Airtable (CURRENT_USER_ID) prendo la sua email
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
  // assumo che il campo si chiami "Email" in Users
  return data.fields?.["Email"] || data.fields?.["email"] || null;
}

module.exports = async (req, res) => {
  // questo endpoint per ora gestisce SOLO POST
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    const body = req.body || {};
    // dal frontend:
    // {
    //   UtenteId: CURRENT_USER_ID,
    //   AttivitaUtenteId: attId,
    //   Nota: "...",        (opzionale)
    //   Umore: 3,           (opzionale)
    //   DurataSec: 120      (opzionale)
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

    // 1. prendo l'email dell'utente
    let userEmail = null;
    try {
      userEmail = await fetchUserEmail(UtenteId);
    } catch (e) {
      console.warn("Non riesco a leggere email utente, continuo senza:", e.message);
    }

    // 2. preparo i campi per Airtable
    const fields = {
      // link a tabelle
      "Utente": [UtenteId],
      "Attività Utente": [AttivitaUtenteId],

      // meta giornata
      "Data ISO": todayISOEuropeRome()
    };

    if (userEmail) {
      fields["Email"] = userEmail;
    }

    // opzionali dal frontend
    if (Nota != null && Nota !== "") {
      fields["Nota"] = Nota;
    }
    if (Umore != null && Umore !== "") {
      fields["Umore"] = Number(Umore);
    }
    if (DurataSec != null && DurataSec !== "") {
      // ATTENZIONE: nella tua tabella il campo si chiama esattamente "Durata (sec)"
      // abbiamo definito LOG_SECONDS_FIELD = "Durata (sec)" nel frontend
      // quindi qui dobbiamo scrivere su quel campo
      fields["Durata (sec)"] = Number(DurataSec);
    }

    // 3. creo il record su "Log Completamenti"
    const air = await fetch(
      `${API_ROOT}/Log%20Completamenti`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [{ fields }],
        }),
      }
    );

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error POST /log:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();
    // torniamo il record creato, così possiamo recuperare l'id log se serve
    // Airtable risponde { records: [ {id:"recXXX", fields:{...}} ] }
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
