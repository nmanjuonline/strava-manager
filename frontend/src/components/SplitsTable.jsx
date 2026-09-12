import { formatPace } from "../format.js";

export default function SplitsTable({ splits }) {
  if (!splits || splits.length === 0) {
    return <div className="splits-empty">No split data for this activity.</div>;
  }

  const maxSpeed = Math.max(...splits.map((s) => s.average_speed || 0));

  return (
    <div className="splits-table">
      <div className="splits-header-row">
        <span>Km</span>
        <span>Pace</span>
        <span className="splits-bar-col" />
        <span>Elev</span>
        <span>HR</span>
      </div>
      {splits.map((s) => {
        const barPct = maxSpeed
          ? Math.max(8, Math.round((s.average_speed / maxSpeed) * 100))
          : 0;
        return (
          <div className="splits-row" key={s.split}>
            <span>{s.split}</span>
            <span className="splits-pace">{formatPace(s.average_speed)}</span>
            <span className="splits-bar-col">
              <span
                className="splits-bar"
                style={{ width: `${barPct}%` }}
              />
            </span>
            <span className="splits-elev">
              {s.elevation_difference > 0 ? "+" : ""}
              {Math.round(s.elevation_difference || 0)}
            </span>
            <span className="splits-hr">
              {s.average_heartrate ? Math.round(s.average_heartrate) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
