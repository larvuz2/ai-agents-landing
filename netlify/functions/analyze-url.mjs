const MAX_BYTES = 160_000;
const USER_AGENT = "agentesPRO-site-audit/1.0 (+https://agentespro.app)";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
  };
}

function cleanText(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(regex, html) {
  const m = html.match(regex);
  return m ? cleanText(m[1]) : "";
}

function countAny(text, words) {
  const lower = text.toLowerCase();
  return words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
}

function infer(url, html) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
  const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i, html)
    || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i, html);
  const h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html);
  const text = cleanText(html).slice(0, 9000);
  const haystack = `${host} ${title} ${description} ${h1} ${text}`.toLowerCase();

  const signals = {
    services: countAny(haystack, ["servicio", "services", "agency", "agencia", "consulting", "consultoría", "solution", "solución", "clientes", "clients"]),
    ecommerce: countAny(haystack, ["shop", "cart", "checkout", "producto", "products", "tienda", "comprar", "buy now"]),
    appointments: countAny(haystack, ["agenda", "book", "schedule", "cita", "meeting", "demo", "call", "consulta"]),
    proposals: countAny(haystack, ["cotización", "quote", "proposal", "propuesta", "pricing", "presupuesto", "estimate"]),
    contact: countAny(haystack, ["contact", "contacto", "form", "email", "whatsapp", "tel:", "mailto:"]),
    content: countAny(haystack, ["blog", "case study", "caso", "newsletter", "resources", "recursos"]),
  };

  let business = "empresa de servicios";
  if (signals.ecommerce >= 2) business = "empresa con venta online";
  else if (signals.services >= 3) business = "empresa de servicios / agencia";
  else if (signals.appointments >= 2) business = "negocio con flujo de citas o demos";

  let bestAgent = "Proposal + Follow-up Agent";
  let why = "El sitio comunica una oferta, pero el siguiente paso comercial puede quedar manual: capturar el lead, entender el contexto, preparar propuesta y dar seguimiento.";
  let workflow = [
    "Escanea el lead y resume qué quiere comprar",
    "Detecta huecos antes de cotizar",
    "Prepara propuesta o siguiente email",
    "Crea seguimiento si no hay respuesta",
    "Escala a aprobación humana antes de enviar",
  ];

  if (signals.ecommerce >= 2) {
    bestAgent = "Customer Recovery Agent";
    why = "El sitio parece orientado a productos. El agente de mayor impacto sería recuperar dudas, carritos o clientes que necesitan ayuda antes de comprar.";
    workflow = ["Detecta intención de compra", "Resume duda o producto de interés", "Sugiere respuesta personalizada", "Prepara seguimiento", "Escala casos delicados a humano"];
  } else if (signals.content >= 2 && signals.contact < 2) {
    bestAgent = "Lead Capture Agent";
    why = "El sitio tiene contenido/señales de autoridad, pero necesita convertir mejor a visitantes en oportunidades claras.";
    workflow = ["Lee la página visitada", "Identifica intención", "Sugiere CTA o lead magnet", "Prepara respuesta inicial", "Crea tarea de seguimiento"];
  } else if (signals.appointments >= 2 && signals.proposals < 2) {
    bestAgent = "Demo + Follow-up Agent";
    why = "El sitio empuja a llamadas o demos. El agente puede preparar contexto antes de la llamada y evitar que el seguimiento se pierda después.";
    workflow = ["Captura datos del visitante", "Resume contexto para la llamada", "Sugiere preguntas de calificación", "Prepara follow-up", "Actualiza estado en Mission Control"];
  }

  const companyLine = h1 || title || host;
  const confidence = Math.min(91, 58 + signals.services * 5 + signals.contact * 4 + signals.appointments * 3 + signals.proposals * 3);

  return {
    host,
    title,
    description,
    company_line: companyLine.slice(0, 120),
    business,
    best_agent: bestAgent,
    why,
    workflow,
    confidence,
    mission: {
      queued: "Website scanned",
      running: `Building ${bestAgent} workflow`,
      review: "First agent recommendation ready",
      completed: "Implementation call unlocked",
    },
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  let target = String(input.url || "").trim();
  if (!target) return json(400, { error: "Missing url" });
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return json(400, { error: "Invalid url" });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return json(400, { error: "Only http/https URLs are allowed" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();
    const html = raw.slice(0, MAX_BYTES);
    const audit = infer(res.url || parsed.toString(), html);
    return json(200, { ok: true, fetched: res.ok, status: res.status, content_type: contentType, audit });
  } catch (error) {
    const fallback = infer(parsed.toString(), `<title>${parsed.hostname}</title>`);
    return json(200, { ok: true, fetched: false, error: "crawl_unavailable", audit: fallback });
  } finally {
    clearTimeout(timeout);
  }
}
