const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

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
    // Aspettati dal frontend:
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

    // 1. email utente (se il campo Email esiste in Log Completamenti)
    let userEmail = null;
    try {
      userEmail = await fetchUserEmail(UtenteId);
    } catch(e) {
      console.warn("Non riesco a leggere email utente, continuo senza:", e.message);
    }

    // 2. PREPARO I CAMPI ESATTAMENTE COME IN AIRTABLE
    //
    // ATTENZIONE: NON includiamo "Data/Ora" perché è un campo "Created time"
    // Airtable lo genera da solo alla creazione, e se provi a mandarlo fallisce.
    //
    // Nomi colonne:
    // - "Utente"
    // - "Attivita Utente"
    // - "Email"            (esiste nella tabella? se sì lo mandiamo)
    // - "Nota"
    // - "Umore"
    // - "Durata (sec)"

    const fields = {
      "Utente": [UtenteId],
      "Attivita Utente": [AttivitaUtenteId]
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
