// /api/attivita-utente.js

const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE_NAME = "Attività Utente";

// helper comune
function send(res, code, payload) {
  res.status(code).json(payload);
}

module.exports = async (req, res) => {
  try {
    // ========== GET: lista attività utente per email ==========
    if (req.method === "GET") {
      const email = req.query.email;
      if (!email) {
        return send(res, 400, { error: "Missing email" });
      }

      // stessa formula che usavi nel frontend
      const filterFormula =
        `OR(` +
        `LOWER(ARRAYJOIN({Utente}))=LOWER("${email}"),` +
        `LOWER({Utente})=LOWER("${email}")` +
        `)`;

      const url = new URL(`${API_ROOT}/${encodeURIComponent(TABLE_NAME)}`);
      url.searchParams.set("filterByFormula", filterFormula);
      url.searchParams.set("pageSize", "100");

      const air = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        },
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable GET error /attivita-utente:", txt);
        return send(res, 500, { error: "Airtable request failed" });
      }

      const data = await air.json();
      // ritorniamo i record esattamente come li aspetta il frontend
      return send(res, 200, { records: data.records || [] });
    }

    // ========== POST: crea nuova Attività Utente ==========
    if (req.method === "POST") {
      // il frontend ti manda:
      // {
      //   UtenteId: CURRENT_USER_ID,
      //   CatalogoId: rec.id,
      //   Ricorrenza: defRic,
      //   Giorno: ... (opzionale)
      //   Mese: ... (opzionale)
      // }
      const body = req.body || {};

      if (!body.UtenteId || !body.CatalogoId || !body.Ricorrenza) {
        return send(res, 400, { error: "Missing required fields" });
      }

      // Costruiamo il record Airtable nel formato che Airtable vuole
      // Nota: i campi devono avere gli ESATTI nomi colonna della tua base
      const airtableRecord = {
        fields: {
          "Utente": [body.UtenteId],          // link a Users
          "Attività": [body.CatalogoId],      // link a Catalogo Attività
          "Ricorrenza": body.Ricorrenza,      // es. "Giornaliera", "Mensile", ...
        },
      };

      if (body.Giorno !== undefined) {
        airtableRecord.fields["Giorno"] = body.Giorno;
      }
      if (body.Mese !== undefined) {
        airtableRecord.fields["Mese"] = String(body.Mese);
      }

      const url = `${API_ROOT}/${encodeURIComponent(TABLE_NAME)}`;
      const air = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: [airtableRecord] }),
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable POST error /attivita-utente:", txt);
        return send(res, 500, { error: "Airtable request failed" });
      }

      const data = await air.json();
      // Airtable risponde { records:[ { id:"recXXX", fields:{...} } ] }
      const created = data.records && data.records[0];

      return send(res, 200, { id: created.id });
    }

    // ========== PATCH: aggiorna Ordine Oggi (ri-ordino drag/up/down) ==========
    if (req.method === "PATCH") {
      // frontend manda:
      // { updates: [ { id:"rec123", ordineOggi: 2 }, ... ] }
      const body = req.body || {};
      const updates = body.updates || [];

      if (!Array.isArray(updates) || updates.length === 0) {
        return send(res, 400, { error: "Missing updates" });
      }

      // prepariamo payload per Airtable batch update
      const airtablePayload = {
        records: updates.map(u => ({
          id: u.id,
          fields: {
            "Ordine Oggi": u.ordineOggi
          }
        }))
      };

      const url = `${API_ROOT}/${encodeURIComponent(TABLE_NAME)}`;
      const air = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(airtablePayload),
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable PATCH error /attivita-utente:", txt);
        return send(res, 500, { error: "Airtable request failed" });
      }

      const data = await air.json();
      return send(res, 200, { ok: true, records: data.records || [] });
    }

    // ========== DELETE /api/attivita-utente?id=recXXXX ==========
    if (req.method === "DELETE") {
      const { id } = req.query || {};
      if (!id) {
        return send(res, 400, { error: "Missing id" });
      }

      // chiamata DELETE diretta a Airtable record singolo
      const url = `${API_ROOT}/${encodeURIComponent(TABLE_NAME)}/${encodeURIComponent(id)}`;

      const air = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        },
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable DELETE error /attivita-utente:", txt);
        return send(res, 500, { error: "Airtable request failed" });
      }

      return send(res, 200, { ok: true });
    }

    // qualsiasi altro metodo
    return send(res, 405, { error: "Method not allowed" });

  } catch (err) {
    console.error("Server error /api/attivita-utente:", err);
    return send(res, 500, { error: "Internal error" });
  }
};
