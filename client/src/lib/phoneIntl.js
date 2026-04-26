import { DIAL_SORTED_LONGEST_FIRST, DEFAULT_DIAL } from './phoneCountries';

export function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

/** Split stored full international digits into dial + national (for form UI). */
export function splitStoredPhone(raw) {
  const d = digitsOnly(raw);
  if (!d) return { dial: DEFAULT_DIAL, national: '' };
  if (/^(97|98)\d{8}$/.test(d)) return { dial: DEFAULT_DIAL, national: d };
  for (const code of DIAL_SORTED_LONGEST_FIRST) {
    if (d.startsWith(code) && d.length > code.length) {
      return { dial: code, national: d.slice(code.length) };
    }
  }
  return { dial: DEFAULT_DIAL, national: d };
}

export function mergeInternationalPhone(dial, national) {
  const c = String(dial || DEFAULT_DIAL).replace(/\D/g, '');
  const n = digitsOnly(national);
  return `${c}${n}`;
}

/** E.164-style display (+ prefix, no spaces). */
export function formatPhoneDisplay(fullDigits) {
  const d = digitsOnly(fullDigits);
  if (!d) return '';
  return `+${d}`;
}

/** Same rules as server/order schema: legacy Nepal 10-digit or full international 10–15 digits. */
export function isValidIntlPhoneDigits(s) {
  let d = digitsOnly(s);
  if (/^(97|98)\d{8}$/.test(d)) d = `977${d}`;
  return d.length >= 10 && d.length <= 15;
}
