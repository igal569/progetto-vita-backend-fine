export default function handler(req, res) {
  // blocco CORS base per permettere alla tua app di chiamarlo dal telefono
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // preflight browser
    return res.status(200).end();
  }

  // prendo i segreti dalle env di Vercel
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.BASE_ID;

  if (!AIRTABLE_TOKEN || !BASE_ID) {
    return res.status(500).json({ error: "Missing env vars" });
  }

  // li rimando al client
  res.status(200).json({
    AIRTABLE_TOKEN,
    BASE_ID
  });
}
