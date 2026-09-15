export default function RangeSlider({ min, max, value, step = 0.5, onChange, formatValue }) {
  const [lo, hi] = value;
  const span = Math.max(max - min, 0.0001);
  const loPct = ((lo - min) / span) * 100;
  const hiPct = ((hi - min) / span) * 100;

  function handleLoChange(e) {
    const next = Math.min(Number(e.target.value), hi - step);
    onChange([next, hi]);
  }

  function handleHiChange(e) {
    const next = Math.max(Number(e.target.value), lo + step);
    onChange([lo, next]);
  }

  const label = formatValue || ((v) => v);

  return (
    <div className="range-slider">
      <div className="range-slider-labels">
        <span>{label(lo)}</span>
        <span>{label(hi)}</span>
      </div>
      <div className="range-slider-track-wrap">
        <div className="range-slider-track" />
        <div
          className="range-slider-track-fill"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />
        <input
          type="range"
          className="range-slider-input"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={handleLoChange}
        />
        <input
          type="range"
          className="range-slider-input"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={handleHiChange}
        />
      </div>
    </div>
  );
}
