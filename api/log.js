// POST /api/log
// body: { Email, AttivitaUtenteId, Nota?, Umore?, DurataSec?, UtenteId }
async function handlePOST(req, res) {
  try {
    const {
      Email,
      AttivitaUtenteId,
      Nota,
      Umore,
      DurataSec,
      UtenteId
    } = req.body || {};

    if (!Email) return sendError(res, 400, "Missing Email");
    if (!AttivitaUtenteId) return sendError(res, 400, "Missing AttivitaUtenteId");
    if (!UtenteId) return sendError(res, 400, "Missing UtenteId");

    const fields = {
      Email: Email,
      "Attivita Utente": [AttivitaUtenteId],
      "Utente": [UtenteId],              // 👈 link alla tabella Users
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
