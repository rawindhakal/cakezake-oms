'use strict';

/**
 * Normalise to international digits only (no +). Legacy Nepal 10-digit 97/98… gets 977 prefix.
 * @param {string} raw
 * @returns {string}
 */
function normalizeOrderPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) {
    const err = new Error('Phone number required');
    err.code = 'PHONE_EMPTY';
    throw err;
  }
  if (/^(97|98)\d{8}$/.test(d)) d = `977${d}`;
  if (d.length < 10 || d.length > 15) {
    const err = new Error('Phone must be 10–15 digits including country code');
    err.code = 'PHONE_LENGTH';
    throw err;
  }
  return d;
}

function isValidOrderPhone(raw) {
  try {
    normalizeOrderPhone(raw);
    return true;
  } catch {
    return false;
  }
}

module.exports = { normalizeOrderPhone, isValidOrderPhone };
