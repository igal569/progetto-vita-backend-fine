const fetch = require("node-fetch");

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.BASE_ID;
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

const headersGET = {
  Authorization: `Bearer ${AIRTABLE_TOKEN}`
};
const headersPOST = {
  Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  "Content-Type": "application/json"
};

// ------- helper di sync-user -------
async function findOrCreateUser(email, name) {
  // 1. cerco l'utente
  const filter = `LOWER({Email})=LOWER("${email}")`;
  const url =
    `${API_ROOT}/Users?filterByFormula=${encodeURIComponent(filter)}&maxRecords=1`;

  const r = await fetch(url, { headers: headersGET });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();

  if (data.records && data.records.length > 0) {
    return {
      id: data.records[0].id,
      get: (field) => data.records[0].fields[field]
    };
  }

  // 2. se non c'è lo creo
  const body = {
    records: [
      {
        fields: {
          Email: email,
          Nome: name || ""
        }
      }
    ]
  };

  const cr = await fetch(`${API_ROOT}/Users`, {
    method: "POST",
    headers: headersPOST,
    body: JSON.stringify(body)
  });
  if (!cr.ok) throw new Error(await cr.text());
  const created = await cr.json();
  const rec = created.records[0];

  return {
    id: rec.id,
    get: (field) => rec.fields[field]
  };
}

async function upsertSession({ userEmail, userId, deviceId, sessionId }) {
  // cerco se esiste già una sessione attiva con stesso deviceId
  const filter = `AND({DeviceId}="${deviceId}", NOT({Revoked}))`;
  const url =
    `${API_ROOT}/Sessions?maxRecords=1&filterByFormula=${encodeURIComponent(filter)}&sort[0][field]=CreatedAt&sort[0][direction]=desc`;

  const r = await fetch(url, { headers: headersGET });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  const existing = data.records?.[0];

  if (existing) {
    // aggiorno la sessione esistente
    const patchBody = {
      records: [
        {
          id: existing.id,
          fields: {
            Email: userEmail,
            UserId: userId,
            SessionId: sessionId,
            Revoked: false
          }
        }
      ]
    };

    const pr = await fetch(`${API_ROOT}/Sessions`, {
      method: "PATCH",
      headers: headersPOST,
      body: JSON.stringify(patchBody)
    });
    if (!pr.ok) throw new Error(await pr.text());

    return {
      email: userEmail,
      sessionId,
      deviceId
    };
  }

  // altrimenti creo nuova sessione
  const createBody = {
    records: [
      {
        fields: {
          Email: userEmail,
          UserId: userId,
          DeviceId: deviceId,
          SessionId: sessionId,
          Revoked: false
        }
      }
    ]
  };

  const cr2 = await fetch(`${API_ROOT}/Sessions`, {
    method: "POST",
    headers: headersPOST,
    body: JSON.stringify(createBody)
  });
  if (!cr2.ok) throw new Error(await cr2.text());

  return {
    email: userEmail,
    sessionId,
    deviceId
  };
}

module.exports = {
  API_ROOT,
  headersGET,
  headersPOST,
  findOrCreateUser,
  upsertSession
};
