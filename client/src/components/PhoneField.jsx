import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_DIAL_CODES, DEFAULT_DIAL } from '../lib/phoneCountries';
import { digitsOnly, mergeInternationalPhone, splitStoredPhone } from '../lib/phoneIntl';

const sortedCountries = [...COUNTRY_DIAL_CODES].sort((a, b) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
);

/**
 * Searchable country code + national number. Calls onChange with full international digits (no +).
 */
export default function PhoneField({ value, onChange, label, error, id }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const lastEmitted = useRef('');

  const { dial, national } = useMemo(() => splitStoredPhone(value), [value]);

  const [localDial, setLocalDial] = useState(dial);
  const [localNational, setLocalNational] = useState(national);

  useEffect(() => {
    const v = value || '';
    if (v !== lastEmitted.current) {
      const s = splitStoredPhone(v);
      setLocalDial(s.dial);
      setLocalNational(s.national);
    }
  }, [value]);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function emit(d, n) {
    const merged = mergeInternationalPhone(d, n);
    lastEmitted.current = merged;
    onChange(merged);
  }

  function handleDialSelect(code) {
    setLocalDial(code);
    setOpen(false);
    setQuery('');
    emit(code, localNational);
  }

  function handleNationalChange(e) {
    const n = digitsOnly(e.target.value);
    setLocalNational(n);
    emit(localDial, n);
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sortedCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.dial.includes(q) ||
          `+${c.dial}`.includes(q)
      )
    : sortedCountries;

  const currentLabel = sortedCountries.find((c) => c.dial === localDial)?.name || 'Country';

  return (
    <div ref={wrapRef}>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="relative flex-shrink-0 w-[min(11rem,42vw)]">
          <button
            type="button"
            id={id ? `${id}-cc` : undefined}
            onClick={() => setOpen((o) => !o)}
            className="input w-full text-left flex items-center justify-between gap-1 px-2"
          >
            <span className="truncate text-sm">
              +{localDial} <span className="text-gray-400 font-normal">· {currentLabel}</span>
            </span>
            <span className="text-gray-400 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-56 overflow-hidden flex flex-col">
              <input
                type="search"
                autoFocus
                placeholder="Search country or code…"
                className="w-full px-3 py-2 text-sm border-b border-gray-100 outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
              />
              <ul className="overflow-y-auto max-h-44 text-sm">
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-gray-400">No match</li>
                )}
                {filtered.map((c) => (
                  <li key={`${c.dial}-${c.name}`}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-brand-50 ${
                        c.dial === localDial ? 'bg-brand-50 font-medium' : ''
                      }`}
                      onClick={() => handleDialSelect(c.dial)}
                    >
                      +{c.dial} <span className="text-gray-500">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className="input flex-1 min-w-0"
          placeholder="Mobile number"
          value={localNational}
          onChange={handleNationalChange}
          id={id}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
