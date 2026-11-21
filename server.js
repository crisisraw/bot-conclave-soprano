const express = require("express");
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "conclave_soprano_verify1816";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1433457333187907";

const PRECIO_BANQUETE_POR_PERSONA = 130;
const PRECIO_TAQUIZA_POR_PERSONA = 60;

// Verificación del Webhook con Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function enviarMensajeWhatsApp(to, text) {
  if (!WHATSAPP_TOKEN) {
    console.error("Falta configurar WHATSAPP_TOKEN en las variables de entorno.");
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
      text: { body: text }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Error enviando mensaje a WhatsApp:", JSON.stringify(data));
  }
}

function extraerPersonas(texto) {
  const matchEtiqueta = texto.match(/personas\s*:\s*(\d+)/i);
  if (matchEtiqueta) {
    return Math.max(50, parseInt(matchEtiqueta[1], 10));
  }
  const matchNumero = texto.match(/\b(\d{2,4})\b/);
  if (matchNumero) {
    return Math.max(50, parseInt(matchNumero[1], 10));
  }
  return 50;
}

function formatoMXN(monto) {
  return "$" + Number(monto).toLocaleString("es-MX") + " MXN";
}

function construirRespuestaConclave(texto) {
  const limpio = texto.toLowerCase();

  const tienePalabraClave =
    limpio.includes("¡hola! cónclave") ||
    limpio.includes("hola! cónclave") ||
    limpio.includes("hola conclave") ||
    limpio.includes("cónclave") ||
    limpio.includes("conclave");

  if (!tienePalabraClave) {
    return (
      "👋 ¡Hola! Este canal atiende exclusivamente eventos de *CÓNCLAVE*.\n\n" +
      "Envía *¡Hola! CÓNCLAVE* o arma tu paquete desde nuestra página web para recibir tu cotización."
    );
  }

  const esBanquete = limpio.includes("banquete");
  const esTaquiza = limpio.includes("taquiza");

  const pideExtras =
    limpio.includes("bebidas alcohólicas") ||
    limpio.includes("bebidas alcoholicas") ||
    limpio.includes("barra de bebidas") ||
    limpio.includes("meseros / cristalería extra") ||
    limpio.includes("meseros extra") ||
    limpio.includes("barra") ||
    limpio.includes("alcohol");

  // Si solo cotiza bebidas, barra o meseros sin elegir banquete ni taquiza
  if (!esBanquete && !esTaquiza && pideExtras) {
    return (
      "✅ *Información recibida — CÓNCLAVE*\n\n" +
      "Hemos registrado tu solicitud de cotización para bebidas, barra o meseros. " +
      "Por favor espera un momento a que un asesor te responda por este medio."
    );
  }

  const personas = extraerPersonas(texto);

  if (esTaquiza) {
    const totalTaquiza = personas * PRECIO_TAQUIZA_POR_PERSONA;
    let msg =
      "✅ *Cotización Taquiza (5 guisos) — CÓNCLAVE*\n\n" +
      `• *Personas:* ${personas}\n` +
      `• *Precio individual:* ${formatoMXN(PRECIO_TAQUIZA_POR_PERSONA)} por persona\n` +
      `• *Total calculado:* ${formatoMXN(totalTaquiza)}`;

    if (pideExtras) {
      msg +=
        "\n\nEn un momento más un asesor se comunicará con usted respecto al servicio de bebidas alcohólicas, barra de bebidas o meseros extra que solicitó.";
    }
    return msg;
  }

  // Por defecto o cuando especifica Banquete de 3 tiempos
  const totalBanquete = personas * PRECIO_BANQUETE_POR_PERSONA;
  let msg =
    "✅ *Cotización Banquete de 3 Tiempos — CÓNCLAVE*\n\n" +
    `• *Personas:* ${personas}\n` +
    `• *Precio por persona (3 tiempos):* ${formatoMXN(PRECIO_BANQUETE_POR_PERSONA)}\n` +
    `• *Total calculado:* ${formatoMXN(totalBanquete)}`;

  if (pideExtras) {
    msg +=
      "\n\nEn un momento más un asesor se comunicará con usted en dado caso de que también quiera servicio de bebidas alcohólicas, barra de bebidas o meseros extra.";
  }

  return msg;
}

// Recepción de mensajes entrantes desde Meta
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const changes = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (!message || message.type !== "text") {
      return;
    }

    const remitente = message.from;
    const texto = (message.text?.body || "").trim();

    console.log(`Mensaje de ${remitente}: "${texto}"`);

    const respuesta = construirRespuestaConclave(texto);
    await enviarMensajeWhatsApp(remitente, respuesta);
  } catch (error) {
    console.error("Error procesando webhook:", error);
  }
});

app.get("/", (req, res) => {
  res.send("Bot CÓNCLAVE activo.");
});

app.listen(PORT, () => {
  console.log(`Servidor CÓNCLAVE corriendo en puerto ${PORT}`);
});