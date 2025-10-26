const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

/**
 * Ritorna una stringa timestamp ISO locale Europe/Rome
 * in formato che Airtable accetta per un campo "date/time"
 * Esempio: "2025-10-26T22:58:00+02:00"
 */
function nowEuropeRomeISO() {
  const now = new Date();
  const romeStr = now.toLocaleString("en-US", { timeZone: "Europe/Rome" });
  const romeDate = new Date(romeStr);

  // offset minuti rispetto a UTC
  const tzOffsetMin = -romeDate.getTimezoneOffset(); // es. 120
  const sign = tzOffsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(tzOffsetMin);
  const hh = String(Math.floor(absMin / 60)).padStart(2, "0");
  const mm = String(absMin % 60).padStart(2, "0");

  const yyyy = romeDate.getFullYear();
  const MM = String(romeDate.getMonth() + 1).padStart(2, "0");
  const dd = String(romeDate.getDate()).padStart(2, "0");
  const HH = String(romeDate.getHours()).padStart(2, "0");
  const min = String(romeDate.getMinutes()).padStart(2, "0");
  const ss = String(romeDate.getSeconds()).padStart(2, "0");

  return `${yyyy}-${MM}-${dd}T${HH}:${min}:${ss}${sign}${hh}:${mm}`;
}

// helper risposta errore
function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

// prendo l'email dell'utente dalla tabella Users
async function fetchUserEmail(userId) {
  if (!userId) return null;

  const r = await fetch(
    `${API_ROOT}/Users/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    }
  );

  if (!r.ok) {
    const txt = await r.text();
    console.error("Airtable error fetching user email:", txt);
    throw new Error("Failed to fetch user email");
  }

  const data = await r.json();
  return data.fields?.["Email"] || data.fields?.["email"] || null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    const body = req.body || {};
    // dal frontend:
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

    // 1. email utente
    let userEmail = null;
    try {
      userEmail = await fetchUserEmail(UtenteId);
    } catch(e) {
      console.warn("Non riesco a leggere email utente, continuo senza:", e.message);
    }

    // 2. PREPARO I CAMPI ESATTAMENTE COME IN AIRTABLE

    // Nomi colonne (IMPORTANTISSIMO):
    // - "Utente"                (link a Users)
    // - "Attivita Utente"       (link a Attività Utente) <-- CAMBIA QUI SE HA ACCENTO DIVERSO
    // - "Data/Ora"              (campo data e ora)
    // - "Email"                 (testo) -> se esiste in tabella
    // - "Nota"                  (testo lungo)
    // - "Umore"                 (number)
    // - "Durata (sec)"          (number)

    const fields = {
      "Utente": [UtenteId],
      "Attivita Utente": [AttivitaUtenteId],
      "Data/Ora": nowEuropeRomeISO()
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
      fields["Durata (sec)"] = Number(DurataSec);
    }

    // 3. CHIAMATA AIRTABLE
    const air = await fetch(
      `${API_ROOT}/Log%20Completamenti`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [{ fields }]
        })
      }
    );

    if (!air.ok) {
      const txt = await air.text();
      console.error("Airtable error POST /log:", txt);
      return sendError(res, 500, "Airtable request failed");
    }

    const data = await air.json();
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
