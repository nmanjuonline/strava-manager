import { useState } from "react";
import RangeSlider from "./RangeSlider.jsx";

export default function SearchPanel({
  open,
  onToggle,
  query,
  onQueryChange,
  loading,
  loadedCount,
  error,
  bounds,
  range,
  onRangeChange,
  resultCount,
}) {
  return (
    <div className="search-wrap">
      <button
        type="button"
        className="icon-trigger search-toggle"
        title="Search activities"
        onClick={onToggle}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {open && (
        <div className="search-panel">
          <input
            type="text"
            className="search-input"
            placeholder="Search by activity name…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoFocus
          />

          {loading && (
            <div className="search-status">
              Loading your activity history… {loadedCount} loaded so far
            </div>
          )}

          {error && <div className="error-text">{error}</div>}

          {!loading && bounds && (
            <div className="search-distance">
              <label>Distance (km)</label>
              <RangeSlider
                min={bounds[0]}
                max={bounds[1]}
                value={range}
                onChange={onRangeChange}
                formatValue={(v) => `${v.toFixed(1)}`}
              />
            </div>
          )}

          {!loading && !error && (
            <div className="search-status">{resultCount} matching activities</div>
          )}
        </div>
      )}
    </div>
  );
}
