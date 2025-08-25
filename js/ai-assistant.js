/* MediDex AI Assistant — GPT‑4o integrated with robust local fallback */

const AI_CONFIG = {
  proxyUrl: window.MEDIDEX_AI_PROXY || "http://localhost:3000/api/gpt",
  model: "gpt-4o",
  maxTokens: 900,
};

const SYSTEM_PROMPT =
  "You are MediDex Assistant, a professional, empathetic virtual clinician. " +
  "Respond naturally like ChatGPT would to a patient, giving clear, stepwise guidance. " +
  "Always include: 1) Summary, 2) Most likely considerations (not a diagnosis), 3) What to do now, " +
  "4) Safe OTC options (dosing tailored if possible), 5) Targeted follow-ups if needed, 6) Red flags. " +
  "Do NOT invent facts. Ask only for missing critical info.";

const memory = {
  ageYears: null,
  weightKg: null,
  isPregnant: null,
  isBreastfeeding: null,
  durationDays: null,
  tempC: null,
  symptoms: new Set(),
  allergies: new Set(),
  conditions: new Set(),
  currentMeds: new Set(),
  lastTopic: null,
};

/* ---------------- Parsing Helpers ---------------- */
function toNum(s) {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function extractNum(t, re) {
  const m = t.match(re);
  return m ? toNum(m[1]) : null;
}

function parseAndUpdate(inputRaw) {
  const t = inputRaw.toLowerCase();

  // Age
  let age = extractNum(t, /\b(\d{1,3})\s*(?:years?|yrs?|yo|y\/o)\b/);
  if (age === null) {
    const m = t.match(/\bi['’` ]?m\s+(\d{1,3})\b/);
    if (m) age = toNum(m[1]);
  }
  if (age !== null) memory.ageYears = age;

  // Weight
  const kg = extractNum(t, /\b(\d{1,3})\s*(?:kg|kilograms?)\b/);
  if (kg !== null) memory.weightKg = kg;

  // Duration
  let dur = extractNum(t, /\b(\d{1,3})\s*(?:days?|d)\b/);
  if (dur === null) {
    const wks = extractNum(t, /\b(\d{1,2})\s*(?:weeks?|wks?)\b/);
    if (wks !== null) dur = wks * 7;
  }
  if (dur !== null) memory.durationDays = dur;

  // Temperature
  const tempC = extractNum(t, /\b(\d{2,3})\s*(?:c|celsius|°c)\b/);
  const tempF = extractNum(t, /\b(\d{2,3})\s*(?:f|fahrenheit|°f)\b/);
  if (tempC !== null) memory.tempC = tempC;
  if (tempF !== null) memory.tempC = Math.round(((tempF - 32) * 5) / 9);

  // Pregnancy/breastfeeding
  if (/\bpregnan/i.test(t)) memory.isPregnant = true;
  if (/\bnot pregnant|no(?:t)?\s+pregnan/i.test(t)) memory.isPregnant = false;
  if (/\bbreastfeed|lactat/i.test(t)) memory.isBreastfeeding = true;

  // Symptoms
  const SYM = [
    ["fever", /fever|pyrex|temperature/i],
    ["headache", /headache|migraine/i],
    ["cough", /\bcough\b/i],
    ["sore throat", /(sore\s+throat|throat\s*pain|pharyng)/i],
    ["nausea", /\bnausea|queasy/i],
    ["vomiting", /\bvomit|emesis|throwing up/i],
    ["diarrhea", /\bdiarrh/i],
    ["chest pain", /\bchest pain|tightness|pressure/i],
    ["rash", /\brash|hives|urticaria/i],
    ["congestion", /\bcongestion|stuffy nose/i],
    ["runny nose", /\brunny nose|rhinorrhea/i],
    [
      "shortness of breath",
      /shortness of breath|dyspnea|difficulty breathing/i,
    ],
    ["body aches", /body ache|myalgia/i],
    ["fatigue", /fatigue|tired/i],
  ];
  SYM.forEach(([name, re]) => {
    if (re.test(t)) memory.symptoms.add(name);
  });

  // Allergies
  [
    "penicillin",
    "amoxicillin",
    "aspirin",
    "ibuprofen",
    "acetaminophen",
    "paracetamol",
    "naproxen",
    "dextromethorphan",
    "guaifenesin",
  ].forEach((a) => {
    if (new RegExp(`allerg(?:y|ic)\\s+to\\s+${a}`, "i").test(t))
      memory.allergies.add(a);
  });

  // Current meds
  [
    "acetaminophen",
    "paracetamol",
    "ibuprofen",
    "aspirin",
    "naproxen",
    "cetirizine",
    "loratadine",
    "dextromethorphan",
    "guaifenesin",
    "loperamide",
  ].forEach((m) => {
    if (new RegExp(`\\b${m}\\b`, "i").test(t)) memory.currentMeds.add(m);
  });

  // Conditions
  [
    ["hypertension", /hypertension|high blood pressure/i],
    ["asthma", /\basthma\b/i],
    ["diabetes", /\bdiabet/i],
    ["kidney", /\bkidney|renal/i],
    ["liver", /\bliver|hepatic/i],
    ["ulcer", /\bulcer|gi bleed|stomach bleeding/i],
    ["heart disease", /\bheart disease|heart failure|cad/i],
  ].forEach(([c, re]) => {
    if (re.test(t)) memory.conditions.add(c);
  });

  if (t.includes("fever")) memory.lastTopic = "fever";
  else if (t.includes("cough")) memory.lastTopic = "cough";
}

/* ---------------- GPT-4o call ---------------- */
async function callGPT(messages) {
  if (!AI_CONFIG.proxyUrl)
    return localFallback(messages[messages.length - 1]?.content || "");

  try {
    const res = await fetch(AI_CONFIG.proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages,
        max_tokens: AI_CONFIG.maxTokens,
      }),
    });
    const data = await res.json();
    if (data?.choices?.[0]?.message?.content)
      return data.choices[0].message.content;
    return localFallback(messages[messages.length - 1]?.content || "");
  } catch (e) {
    console.error(e);
    return localFallback(messages[messages.length - 1]?.content || "");
  }
}

/* ---------------- Minimal fallback ---------------- */
function localFallback(input) {
  parseAndUpdate(input);
  return (
    'I understand you mentioned: "' +
    input +
    '". Stay hydrated, rest, and monitor your symptoms. Seek urgent care if severe chest pain, difficulty breathing, persistent high fever, or blood in stool/vomit.'
  );
}

/* ---------------- UI ---------------- */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function asHtml(text) {
  return text.replace(/\n/g, "<br>");
}

export function initAIAssistant({ containerId = "ai-assistant" } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const root = el("div", "ai-assistant");
  const panel = el("div", "ai-panel");

  const header = el("div", "ai-header");
  header.append(
    el("h2", "", "MediDex AI Assistant"),
    el("span", "ai-status", "Professional guidance — not a diagnosis")
  );

  const body = el("div", "ai-body");
  const inputRow = el("div", "ai-input");
  const textarea = el("textarea");
  textarea.placeholder =
    "Describe your symptoms, duration, temperature, meds taken, allergies, conditions...";
  const sendBtn = el("button", "", "Ask");
  inputRow.append(textarea, sendBtn);

  const note = el(
    "div",
    "ai-note",
    "Educational guidance only. Call emergency services for urgent symptoms."
  );

  panel.append(header, body, inputRow, note);
  root.append(panel);
  container.append(root);

  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  function append(role, content) {
    const wrap = el("div", `ai-msg ${role}`);
    wrap.append(el("div", "role", role === "user" ? "You" : "Assistant"));
    wrap.append(el("div", "bubble", asHtml(content)));
    body.append(wrap);
    body.scrollTop = body.scrollHeight;
  }

  append(
    "assistant",
    "Hi! I'm MediDex AI. Describe your situation (symptoms, duration, temperature, meds, allergies, conditions)."
  );

  async function handleSend() {
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = "";
    append("user", text);

    parseAndUpdate(text);

    const thinking = el("div", "ai-msg assistant");
    thinking.append(el("div", "role", "Assistant"));
    thinking.append(el("div", "bubble", "Thinking..."));
    body.append(thinking);
    body.scrollTop = body.scrollHeight;

    try {
      const convo = messages.concat([{ role: "user", content: text }]);
      const reply = await callGPT(convo);
      messages.push(
        { role: "user", content: text },
        { role: "assistant", content: reply }
      );
      body.removeChild(thinking);
      append("assistant", reply);
    } catch {
      body.removeChild(thinking);
      append("assistant", "Sorry, I had trouble responding. Try again.");
    }
  }

  sendBtn.addEventListener("click", handleSend);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
}

/* Auto-init if container exists */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("ai-assistant")) {
    try {
      initAIAssistant({ containerId: "ai-assistant" });
    } catch {}
  }
});
