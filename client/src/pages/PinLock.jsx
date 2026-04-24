import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function PinLock() {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setAttempts(0);
        setError('');
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const submit = useCallback(async (currentPin) => {
    if (lockedUntil) return;
    try {
      const res = await login(currentPin);
      if (res.success) {
        navigate('/dashboard');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
          setError(`Too many wrong attempts. Locked for ${LOCKOUT_SECONDS}s.`);
        } else {
          setError(`Wrong PIN (${MAX_ATTEMPTS - newAttempts} tries left)`);
        }
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 400);
      }
    } catch {
      setError('Server error. Try again.');
      setPin('');
    }
  }, [login, navigate, attempts, lockedUntil]);

  function pressDigit(d) {
    if (lockedUntil || pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 6) {
      submit(next);
    }
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  const isLocked = !!lockedUntil;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-pink-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎂</div>
          <h1 className="text-2xl font-bold text-brand-600">CakeZake</h1>
          <p className="text-gray-500 text-sm mt-1">Order Management</p>
        </div>

        <div className={`flex justify-center gap-3 mb-6 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-500 text-sm mb-4">
            {isLocked ? `Locked — ${countdown}s remaining` : error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1,2,3,4,5,6,7,8,9].map((d) => (
            <button
              key={d}
              onClick={() => pressDigit(String(d))}
              disabled={isLocked}
              className="h-14 rounded-xl border border-gray-200 text-xl font-semibold text-gray-800 hover:bg-brand-50 active:bg-brand-100 transition-colors disabled:opacity-40"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => pressDigit('0')}
            disabled={isLocked}
            className="h-14 rounded-xl border border-gray-200 text-xl font-semibold text-gray-800 hover:bg-brand-50 active:bg-brand-100 transition-colors disabled:opacity-40"
          >
            0
          </button>
          <button
            onClick={backspace}
            disabled={isLocked}
            className="h-14 rounded-xl border border-gray-200 text-xl text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
