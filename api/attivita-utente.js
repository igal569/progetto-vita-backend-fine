const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Attività Utente";

// piccola helper
function send(res, code, obj) {
  res.status(code).json(obj);
}

module.exports = async (req, res) => {
  try {
    // ===== GET /api/attivita-utente?email=... =====
    if (req.method === "GET") {
      const email = req.query.email;
      if (!email) {
        return send(res, 400, { error: "Missing email" });
      }

      // stessa formula che usavi già
      const filterFormula = `OR(LOWER(ARRAYJOIN({Utente}))=LOWER("${email}"),LOWER({Utente})=LOWER("${email}"))`;

      const url = new URL(`${API_ROOT}/${encodeURIComponent(TABLE)}`);
      url.searchParams.set("filterByFormula", filterFormula);
      url.searchParams.set("pageSize", "100");

      const air = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`
        }
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable error /attivita-utente GET:", txt);
        return send(res, 500, { error: "Airtable request failed" });
      }

      const data = await air.json();
      return send(res, 200, { records: data.records || [] });
    }

    // ===== POST /api/attivita-utente =====
    // body JSON dal frontend:
    // {
    //   UtenteId: CURRENT_USER_ID,
    //   CatalogoId: rec.id,
    //   Ricorrenza: defRic,
    //   Giorno: ... (opzionale)
    //   Mese: ... (opzionale)
    // }
    if (req.method === "POST") {
      let body = {};
      try {
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return send(res, 400, { error: "Bad JSON body" });
      }

      const {
        UtenteId,
        CatalogoId,
        Ricorrenza,
        Giorno,
        Mese
      } = body;

      if (!UtenteId || !CatalogoId || !Ricorrenza) {
        return send(res, 400, { error: "Missing required fields" });
      }

      // costruisco l'oggetto fields per Airtable
      // ATTENZIONE ai nomi colpiscono le tue colonne.
      // Io sto seguendo i nomi che hai usato nel frontend:
      //  - "Utente" (link a Users)
      //  - "Attività" (link a Catalogo Attività)
      //  - "Ricorrenza"
      //  - "Giorno"
      //  - "Mese"
      //  - "Attiva?" true
      //  - "Ordine Oggi" default 999 (ti va bene perché poi lo riordini)
      //
      // Se in Airtable i nomi differiscono, dimmelo e li cambiamo, ma
      // sono gli stessi che già leggi con rec.fields[...] nel frontend.
      const airtableRecord = {
        fields: {
          "Utente": [UtenteId],
          "Attività": [CatalogoId],
          "Ricorrenza": Ricorrenza,
          "Attiva?": true,
          "Ordine Oggi": 999
        }
      };

      if (Giorno !== undefined) airtableRecord.fields["Giorno"] = Giorno;
      if (Mese !== undefined)   airtableRecord.fields["Mese"]   = String(Mese);

      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}`;

      const air = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: [ airtableRecord ] })
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable error /attivita-utente POST:", txt);
        return send(res, 500, { error: "Airtable create failed" });
      }

      const data = await air.json();
      // Airtable risponde { records: [ {id:"recXXX", fields:{...}} ] }
      const created = data.records && data.records[0];

      return send(res, 200, { id: created?.id || null });
    }

    // ===== PATCH /api/attivita-utente =====
    // frontend la usa per salvare l'ordine ("Ordine Oggi")
    // body:
    // { updates: [{ id:"rec123", ordineOggi: 2 }, ...] }
    if (req.method === "PATCH") {
      let body = {};
      try {
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return send(res, 400, { error: "Bad JSON body" });
      }

      if (!Array.isArray(body.updates) || !body.updates.length) {
        return send(res, 400, { error: "Missing updates" });
      }

      // mappo al formato che Airtable vuole per PATCH in bulk
      const airtablePayload = {
        records: body.updates.map(u => ({
          id: u.id,
          fields: {
            "Ordine Oggi": u.ordineOggi
          }
        }))
      };

      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}`;
      const air = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(airtablePayload)
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable error /attivita-utente PATCH:", txt);
        return send(res, 500, { error: "Airtable patch failed" });
      }

      const data = await air.json();
      return send(res, 200, { ok: true, records: data.records || [] });
    }

    // se arrivi qui è perché hai fatto un metodo non supportato
    return send(res, 405, { error: "Method not allowed" });

  } catch (err) {
    console.error("Server error /api/attivita-utente:", err);
    return send(res, 500, { error: "Internal error" });
  }
};
