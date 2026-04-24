const SLOTS = ['7AM–10AM', '10AM–1PM', '1PM–4PM', '4PM–7PM', '7PM–9PM', 'Anytime'];

export default function DeliverySlotPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SLOTS.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onChange(slot)}
          className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
            value === slot
              ? 'bg-brand-500 text-white border-brand-500'
              : 'border-gray-300 text-gray-700 hover:border-brand-400'
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
