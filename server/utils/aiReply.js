const { GoogleGenAI } = require('@google/genai');
const { getConfig } = require('./platformConfig');
const Order = require('../models/Order');

// Knowledge base is stored as one FAQ per line: "Question || Answer"
function parseKnowledgeBase(raw) {
  if (!raw) return [];
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [q, a] = line.split('||').map(s => s?.trim());
      return { question: q || '', answer: a || '' };
    })
    .filter(f => f.question && f.answer);
}

function isWithinBusinessHours(start, end, tz) {
  if (!start || !end) return false; // no hours configured -> AI is always eligible to answer
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz || 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const [h, m]   = fmt.format(new Date()).split(':').map(Number);
    const mins     = h * 60 + m;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return mins >= (sh * 60 + sm) && mins < (eh * 60 + em);
  } catch {
    return false;
  }
}

const FUNCTION_DECLARATIONS = [
  {
    name: 'lookup_order_status',
    description: 'Look up an existing order by the customer\'s phone number to answer questions about order status, items or delivery date.',
    parameters: {
      type: 'OBJECT',
      properties: { phone: { type: 'STRING', description: 'Customer phone number, digits only' } },
      required: ['phone'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Hand this conversation to a human member of staff instead of answering yourself. Use this whenever the customer explicitly asks for a person, is upset or complaining, wants to negotiate price/discount, asks something not covered by the knowledge base, or you are not confident in the answer.',
    parameters: {
      type: 'OBJECT',
      properties: { reason: { type: 'STRING', description: 'Short reason for escalation' } },
      required: ['reason'],
    },
  },
];

async function lookupOrderStatus(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  if (!digits) return { found: false };

  const order = await Order.findOne({
    'sender.phone': new RegExp(digits + '$'),
    isDeleted: { $ne: true },
  }).sort({ createdAt: -1 }).lean();

  if (!order) return { found: false };
  return {
    found:           true,
    orderNumber:     order.orderNumber,
    status:          order.status,
    fulfillmentType: order.fulfillmentType,
    deliveryDate:    order.delivery?.date,
    items:           (order.items || []).map(i => i.name),
  };
}

// Returns one of:
//  { skip: true }                          — AI should not act (disabled, business hours, no key)
//  { skip: false, escalate: true, reason }  — hand off to a human
//  { skip: false, escalate: false, reply }  — send `reply` back to the customer
async function generateAiReply({ history, customerPhone }) {
  const [enabled, apiKey, model, systemPrompt, kbRaw, keywordsRaw, hStart, hEnd, hTz] = await Promise.all([
    getConfig('AI_ENABLED'),
    getConfig('GEMINI_API_KEY'),
    getConfig('AI_MODEL'),
    getConfig('AI_SYSTEM_PROMPT'),
    getConfig('AI_KNOWLEDGE_BASE'),
    getConfig('AI_ESCALATION_KEYWORDS'),
    getConfig('AI_BUSINESS_HOURS_START'),
    getConfig('AI_BUSINESS_HOURS_END'),
    getConfig('AI_BUSINESS_HOURS_TZ'),
  ]);

  if (enabled !== 'true' || !apiKey) return { skip: true };
  if (isWithinBusinessHours(hStart, hEnd, hTz)) return { skip: true };

  const lastInbound = [...history].reverse().find(m => m.direction === 'inbound');
  const keywords = (keywordsRaw || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  if (lastInbound && keywords.some(k => (lastInbound.body || '').toLowerCase().includes(k))) {
    return { skip: false, escalate: true, reason: 'keyword_match' };
  }

  const kb = parseKnowledgeBase(kbRaw);
  const kbText = kb.length
    ? `Knowledge base (use only this for factual answers about the business):\n${kb.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
    : '';

  const basePrompt = systemPrompt || 'You are a helpful assistant for a cake and gifting shop. Keep replies short, friendly, and reply in the same language the customer used.';
  const fullSystemPrompt = [
    basePrompt,
    kbText,
    'You may ONLY: answer using the knowledge base above, look up order status with lookup_order_status, capture a lead by asking for name/phone/what they want, or call escalate_to_human when unsure. Never invent prices, discounts, or order details you have not verified. Keep replies under 3 sentences.',
  ].filter(Boolean).join('\n\n');

  const ai = new GoogleGenAI({ apiKey });
  const modelName = model || 'gemini-2.5-flash';
  const contents = history.slice(-10).map(m => ({
    role:  m.direction === 'inbound' ? 'user' : 'model',
    parts: [{ text: m.body || '' }],
  }));
  const genConfig = { systemInstruction: fullSystemPrompt, tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }] };

  try {
    let response = await ai.models.generateContent({ model: modelName, contents, config: genConfig });
    let call = response.functionCalls?.[0];
    let guard = 0;

    while (call && guard < 3) {
      guard++;
      if (call.name === 'escalate_to_human') {
        return { skip: false, escalate: true, reason: call.args?.reason || 'model_escalated' };
      }

      const result = call.name === 'lookup_order_status'
        ? await lookupOrderStatus(call.args?.phone || customerPhone)
        : {};

      contents.push({ role: 'model', parts: [{ functionCall: call }] });
      contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, response: result } }] });

      response = await ai.models.generateContent({ model: modelName, contents, config: genConfig });
      call = response.functionCalls?.[0];
    }

    const text = response.text?.trim();
    if (!text) return { skip: false, escalate: true, reason: 'empty_response' };
    return { skip: false, escalate: false, reply: text };
  } catch (err) {
    console.error('Gemini error:', err.message);
    return { skip: false, escalate: true, reason: 'ai_error' };
  }
}

module.exports = { generateAiReply, isWithinBusinessHours, parseKnowledgeBase };
