const express = require("express");
const { handleIncomingMessage } = require("./router");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "conclave_soprano_verify";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";

// Verificación del Webhook por parte de Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function sendWhatsAppMessage(to, bodyText) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.log("[MODO PRUEBA - SIN CREDENCIALES META] Para:", to, "\nRespuesta:", bodyText);
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: bodyText }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Error enviando mensaje a WhatsApp:", errText);
  }
}

// Recepción de mensajes desde WhatsApp Cloud API
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message || message.type !== "text") {
      return;
    }

    const from = message.from;
    const text = message.text?.body || "";

    const result = handleIncomingMessage({ from, text });
    console.log(`[${result.brand}] Mensaje de ${from}: "${text}"`);
    await sendWhatsAppMessage(from, result.reply);
  } catch (error) {
    console.error("Error procesando webhook:", error);
  }
});

// Ruta rápida para probar la lógica sin WhatsApp todavía
app.post("/test", (req, res) => {
  const { from = "526180000000", text = "" } = req.body || {};
  const result = handleIncomingMessage({ from, text });
  res.json(result);
});

app.get("/", (req, res) => {
  res.send("Webhook CÓNCLAVE & Barbería Soprano activo.");
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});