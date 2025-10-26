const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // Questo serve solo per vedere se la funzione parte
  res.status(200).json({ ok: true, msg: "Funziona 🟢" });
};
