export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.status(200).json({
    AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN,
    BASE_ID: process.env.BASE_ID,
  });
}
