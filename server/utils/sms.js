'use strict';

const https        = require('https');
const querystring  = require('querystring');

function normalisePhone(phone) {
  return String(phone).replace(/^\+?977/, '').replace(/\D/g, '');
}

async function getConfig() {
  try {
    const SmsConfig = require('../models/SmsConfig');
    const cfg = await SmsConfig.findOne().lean();
    if (cfg && cfg.enabled && cfg.token) {
      return { token: cfg.token, from: cfg.senderId || 'CakeZake' };
    }
  } catch {}
  // Fallback to env vars
  if (process.env.SPARROWSMS_TOKEN) {
    return { token: process.env.SPARROWSMS_TOKEN, from: process.env.SPARROWSMS_FROM || 'CakeZake' };
  }
  return null;
}

async function sendViaSparrow(to, text, cfg) {
  const payload = querystring.stringify({
    token: cfg.token,
    from:  cfg.from,
    to:    normalisePhone(to),
    text,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.sparrowsms.com',
      path:     '/v2/sms/',
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.response_code === 200) {
            resolve({ success: true, gateway: 'sparrowsms' });
          } else {
            reject(new Error(json.message || `SparrowSMS error ${json.response_code}`));
          }
        } catch {
          reject(new Error('Invalid SparrowSMS response'));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function sendSMS(to, text) {
  try {
    const cfg = await getConfig();
    if (!cfg) return { success: false, gateway: 'none', error: 'SparrowSMS not configured' };
    return await sendViaSparrow(to, text, cfg);
  } catch (err) {
    return { success: false, gateway: 'none', error: err.message };
  }
}

module.exports = { sendSMS };
