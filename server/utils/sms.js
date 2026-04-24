'use strict';

const https = require('https');
const querystring = require('querystring');

function normalisePhone(phone) {
  // Strip +977 or 977 prefix; SparrowSMS expects 10-digit number
  return String(phone).replace(/^\+?977/, '').replace(/\D/g, '');
}

async function sendViaSparrow(to, text) {
  const token    = process.env.SPARROWSMS_TOKEN;
  const from     = process.env.SPARROWSMS_FROM || 'CakeZake';
  if (!token) throw new Error('SPARROWSMS_TOKEN not configured');

  const payload = querystring.stringify({
    token,
    from,
    to:      normalisePhone(to),
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
            reject(new Error(json.message || `SparrowSMS error code ${json.response_code}`));
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

/**
 * Send SMS — SparrowSMS only (no fallback needed for Nepal).
 * Returns { success, gateway, error }.
 */
async function sendSMS(to, text) {
  try {
    const result = await sendViaSparrow(to, text);
    return result;
  } catch (err) {
    return { success: false, gateway: 'none', error: err.message };
  }
}

module.exports = { sendSMS };
