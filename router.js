const sessions = new Map();
const TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function normalizeText(str = "") {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getMeserosIncluidos(personas) {
  const total = Math.max(50, Number(personas) || 50);
  return Math.ceil(total / 50);
}

function handleIncomingMessage({ from, text }) {
  const cleanText = normalizeText(text);
  const now = Date.now();

  let session = sessions.get(from);
  if (session && now - session.updatedAt > TTL_MS) {
    sessions.delete(from);
    session = null;
  }

  let brand = session ? session.brand : null;
  let isFirstTrigger = false;

  // 1. Detección por frases de inicio de tus páginas web
  if (cleanText.startsWith("hola! me interesa agendar") || cleanText.includes("me interesa agendar")) {
    brand = "SOPRANO";
    isFirstTrigger = true;
  } else if (cleanText.startsWith("hola! conclave") || cleanText.includes("conclave, quiero cotizar")) {
    brand = "CONCLAVE";
    isFirstTrigger = true;
  }

  // 2. Detección por opción numérica o palabras clave si aún no hay marca
  if (!brand) {
    if (
      cleanText === "1" ||
      cleanText.includes("conclave") ||
      cleanText.includes("banquete") ||
      cleanText.includes("taquiza") ||
      cleanText.includes("guiso") ||
      cleanText.includes("mesero") ||
      cleanText.includes("cristaleria")
    ) {
      brand = "CONCLAVE";
    } else if (
      cleanText === "2" ||
      cleanText.includes("soprano") ||
      cleanText.includes("barberia") ||
      cleanText.includes("corte") ||
      cleanText.includes("fade") ||
      cleanText.includes("barba") ||
      cleanText.includes("ceja") ||
      cleanText.includes("tinte")
    ) {
      brand = "SOPRANO";
    }
  }

  // 3. Menú si el mensaje es ambiguo (ej. solo "Hola")
  if (!brand) {
    return {
      brand: "UNKNOWN",
      reply:
        "¡Hola! Gracias por escribirnos. ¿Con cuál servicio te gustaría comunicarte?\n\n" +
        "1️⃣ *CÓNCLAVE Eventos* (Banquetes, Taquizas, Cristalería y Meseros)\n" +
        "2️⃣ *Barbería Soprano* (Cortes, Fade, Barba y Citas)\n\n" +
        "Responde *1* o *2* para ayudarte."
    };
  }

  sessions.set(from, { brand, updatedAt: now });

  if (brand === "CONCLAVE") {
    if (isFirstTrigger) {
      return {
        brand,
        reply:
          "¡Hola! Bienvenido a *CÓNCLAVE Eventos* 🥂\n" +
          "Recibimos tu solicitud. Atendemos desde *50 personas* tanto en *banquetes de 3 tiempos* (con entremés, entrada/sopa, platillo con 3 guarniciones, plato, vaso jaibolero, cubierto y 1 mesero por cada 50 personas) como en *taquizas de 5 guisos*.\n\n" +
          "Recuerda que los paquetes base no incluyen bebidas alcohólicas, pero podemos cotizar bebidas o barra de bebidas extra. ¿Qué fecha y cuántas personas tienes contempladas?"
      };
    }

    if (cleanText.includes("precio") || cleanText.includes("costo") || cleanText.includes("cuanto") || cleanText.includes("cotiz")) {
      return {
        brand,
        reply:
          "En *CÓNCLAVE Eventos* cotizamos desde *50 invitados* según el servicio:\n" +
          "• *Banquete de 3 tiempos:* Entremés, entrada/sopa, platillo principal con 3 guarniciones, plato, vaso jaibolero, cubierto y *1 mesero* (y +1 por cada 50 personas adicionales).\n" +
          "• *Taquiza:* *5 guisos* a elegir entre 17 opciones.\n" +
          "• *Bebidas y barra:* Cotización extra (no incluidas en el paquete base).\n\n" +
          "¿Para cuántas personas y qué fecha sería tu evento?"
      };
    }

    const matchPersonas = cleanText.match(/\b(\d{2,4})\b/);
    if (matchPersonas) {
      const personas = Math.max(50, parseInt(matchPersonas[1], 10));
      const meseros = getMeserosIncluidos(personas);
      return {
        brand,
        reply:
          `Perfecto, para *${personas} personas* en *CÓNCLAVE Eventos*:\n` +
          `• En banquete de 3 tiempos te corresponden *${meseros} ${meseros === 1 ? "mesero incluido" : "meseros incluidos"}*.\n` +
          `• También podemos cotizar *taquiza de 5 guisos* desde 50 personas.\n\n` +
          `¿Qué fecha estimada tienes y te interesa cotizar bebidas o barra de bebidas extra?`
      };
    }

    return {
      brand,
      reply:
        "¡Claro! Para armar tu cotización en *CÓNCLAVE Eventos*, dime:\n" +
        "1. ¿Banquete de 3 tiempos o Taquiza de 5 guisos?\n" +
        "2. ¿Cuántas personas (mínimo 50)?\n" +
        "3. ¿Qué fecha y si deseas cotizar bebidas/barra extra?"
    };
  }

  // SOPRANO
  if (isFirstTrigger) {
    return {
      brand,
      reply:
        "¡Qué tal! Bienvenido a *Barbería Soprano* 💈\n" +
        "Recibimos tu mensaje. Nuestro horario es de *lunes a sábado de 11:00 AM a 8:00 PM*.\n\n" +
        "Servicios y precios:\n" +
        "• Corte con tijera: *$120*\n" +
        "• Fade: *$130*\n" +
        "• Barba: *$30*\n" +
        "• Ceja: *$30*\n" +
        "• Servicio completo: *$150*\n" +
        "• Tinte: *A valoración de color y precio*\n\n" +
        "¿Qué día y hora te gustaría agendar?"
    };
  }

  if (cleanText.includes("horario") || cleanText.includes("hora") || cleanText.includes("abren") || cleanText.includes("cierran")) {
    return {
      brand,
      reply:
        "En *Barbería Soprano* atendemos de *lunes a sábado de 11:00 AM a 8:00 PM*.\n" +
        "¿Qué servicio buscas y a qué hora te gustaría pasar?"
    };
  }

  return {
    brand,
    reply:
      "*Barbería Soprano* — Lun a Sáb de *11:00 AM a 8:00 PM*:\n" +
      "• Corte con tijera: *$120* | Fade: *$130*\n" +
      "• Barba: *$30* | Ceja: *$30*\n" +
      "• Servicio completo: *$150* | Tinte: *A valoración*\n\n" +
      "Dime qué servicio quieres y qué día/hora prefieres para confirmar tu cita."
  };
}

module.exports = { handleIncomingMessage };