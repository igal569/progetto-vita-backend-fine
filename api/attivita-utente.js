// /api/attivita-utente.js
const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLE = "Attività Utente";

function sendError(res, code, msg) {
  res.status(code).json({ error: msg });
}

module.exports = async (req, res) => {
  const { method } = req;

  // 1) DELETE -> rimuovi dalla routine
  if (method === "DELETE") {
    const { id } = req.query;
    if (!id) {
      return sendError(res, 400, "Missing id");
    }

    try {
      const url = `${API_ROOT}/${encodeURIComponent(TABLE)}/${encodeURIComponent(id)}`;

      const air = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable error (DELETE attivita-utente):", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await air.json(); // { deleted: true, id: "rec..." }
      return res.status(200).json(data);
    } catch (err) {
      console.error("Server error DELETE /api/attivita-utente:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // 2) POST -> aggiungi alla routine
  if (method === "POST") {
    try {
      const body = req.body || {};
      // body = { UtenteId, CatalogoId, Ricorrenza, Giorno?, Mese? }

      // costruiamo i fields Airtable
      const fields = {
        "Utente": [body.UtenteId],              // link a Users
        "Attività": [body.CatalogoId],          // link a Catalogo Attività
        "Ricorrenza": body.Ricorrenza || "Giornaliera",
        "Attiva?": true
      };

      if (body.Giorno != null) fields["Giorno"] = body.Giorno;
      if (body.Mese   != null) fields["Mese"]   = body.Mese;

      const air = await fetch(`${API_ROOT}/${encodeURIComponent(TABLE)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          records: [{ fields }]
        })
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable error (POST attivita-utente):", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await air.json();
      // Airtable risponde { records: [ {id:"recXYZ", fields:{...}} ] }
      const created = data.records?.[0];
      return res.status(200).json({ id: created?.id });

    } catch (err) {
      console.error("Server error POST /api/attivita-utente:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // 3) PATCH -> riordino "Ordine Oggi"
  if (method === "PATCH") {
    try {
      const body = req.body || {};
      // body.updates = [ { id, ordineOggi } , ... ]
      const records = (body.updates || []).map(u => ({
        id: u.id,
        fields: { "Ordine Oggi": u.ordineOggi }
      }));

      const air = await fetch(`${API_ROOT}/${encodeURIComponent(TABLE)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records })
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable error (PATCH attivita-utente):", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await air.json();
      return res.status(200).json(data);

    } catch (err) {
      console.error("Server error PATCH /api/attivita-utente:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // 4) GET -> già lo hai come file separato attivita-utente.js?  
  // Se stai usando QUESTO file anche per GET, includi qui sotto la tua logica GET 
  // (quella che richiede email & fa filterByFormula).
  if (method === "GET") {
    // questa è la versione che mi avevi mostrato prima in Attività utente
    try {
      const email = req.query.email;
      if (!email) {
        return sendError(res, 400, "Missing email");
      }

      const filterFormula =
        `OR(LOWER(ARRAYJOIN({Utente}))=LOWER("${email}"),LOWER({Utente})=LOWER("${email}"))`;

      const url = new URL(
        `${API_ROOT}/${encodeURIComponent(TABLE)}`
      );
      url.searchParams.set("filterByFormula", filterFormula);
      url.searchParams.set("pageSize", "100");

      const air = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
      });

      if (!air.ok) {
        const txt = await air.text();
        console.error("Airtable error GET attivita-utente:", txt);
        return sendError(res, 500, "Airtable request failed");
      }

      const data = await air.json();
      return res.status(200).json({
        records: data.records || []
      });

    } catch (err) {
      console.error("Server error GET /api/attivita-utente:", err);
      return sendError(res, 500, "Internal error");
    }
  }

  // altri metodi no
  return sendError(res, 405, "Method not allowed");
};
