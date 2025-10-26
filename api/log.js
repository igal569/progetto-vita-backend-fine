const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

// data di oggi in formato YYYY-MM-DD fuso orario Europa/Rome
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
    // fallback UTC
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

// legge l'email dell'utente dalla tabella Users dato il suo recordId
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
  // campo Email nella tabella Users (come mi hai detto)
  return data.fields?.["Email"] || data.fields?.["email"] || null;
}

module.exports = async (req, res) => {
  // accettiamo SOLO POST
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    const body = req.body || {};
    // ci aspettiamo:
    // {
    //   UtenteId: "recUser...",
    //   AttivitaUtenteId: "recAttUtente...",
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

    // 1. prendo l'email utente per scriverla nel log
    let userEmail = null;
    try {
      userEmail = await fetchUserEmail(UtenteId);
    } catch (e) {
      console.warn("Non riesco a leggere email utente, continuo senza:", e.message);
    }

    // 2. preparo i campi Airtable
    const fields = {
      // link
      "Utente": [UtenteId],
      "Attività Utente": [AttivitaUtenteId],

      // data di oggi (stringa YYYY-MM-DD)
      "Data ISO": todayISOEuropeRome()
    };

    if (userEmail) {
      fields["Email"] = userEmail;
    }

    // opzionali
    if (Nota != null && Nota !== "") {
      fields["Nota"] = Nota;
    }
    if (Umore != null && Umore !== "") {
      fields["Umore"] = Number(Umore);
    }
    if (DurataSec != null && DurataSec !== "") {
      // in Airtable il campo è proprio "Durata (sec)"
      fields["Durata (sec)"] = Number(DurataSec);
    }

    // 3. salvo su Airtable (Log Completamenti)
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
    const created = data.records?.[0] || null;

    // rimandiamo l'id del log appena creato
    return res.status(200).json({
      id: created?.id || null,
      fields: created?.fields || {}
    });

  } catch (err) {
    console.error("Server error POST /api/log:", err);
    return sendError(res, 500, "Internal error");
  }
};
