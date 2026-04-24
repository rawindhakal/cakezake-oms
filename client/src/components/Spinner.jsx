export default function Spinner({ size = 'md', fullPage = false, label = 'Loading…' }) {
  const sizes = {
    sm:  'w-5 h-5 border-2',
    md:  'w-10 h-10 border-[3px]',
    lg:  'w-16 h-16 border-4',
    xl:  'w-24 h-24 border-[5px]',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`${sizes[size]} rounded-full border-pink-100 border-t-brand-500 animate-spin`}
        role="status"
        aria-label={label}
      />
      {label && (
        <p className="text-sm text-gray-400 font-medium animate-pulse">{label}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50 gap-6">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-200">
            <span className="text-3xl">🎂</span>
          </div>
          <span className="font-bold text-gray-700 text-lg">CakeZake</span>
        </div>
        <div className="w-14 h-14 rounded-full border-4 border-pink-100 border-t-brand-500 animate-spin" />
        <p className="text-sm text-gray-400 animate-pulse">{label}</p>
      </div>
    );
  }

  return spinner;
}
