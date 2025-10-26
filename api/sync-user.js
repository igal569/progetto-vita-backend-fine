const { findOrCreateUser, upsertSession } = require("../lib/airtable");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { email, name, deviceId, sessionId } = req.body || {};

    if (!email || !deviceId || !sessionId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // trova o crea l'utente
    const userRec = await findOrCreateUser(email, name);
    const userId = userRec.id;

    // crea / aggiorna la sessione
    const sess = await upsertSession({
      userEmail: email,
      userId,
      deviceId,
      sessionId
    });

    // ritorna info minime al client
    res.status(200).json({
      ok: true,
      user: {
        email: sess.email,
        userId,
        sessionId: sess.sessionId,
        deviceId: sess.deviceId,
        name: name || userRec.get("Nome") || ""
      }
    });
  } catch (err) {
    console.error("sync-user error:", err);
    res.status(500).json({
      ok: false,
      error: "SERVER_ERROR_SYNC_USER"
    });
  }
};
