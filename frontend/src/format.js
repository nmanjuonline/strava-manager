export function formatDistance(meters) {
  if (!meters) return "0 km";
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Strava's start_date_local is already the activity's local time, but the
// string is suffixed with "Z" as if it were UTC. Parsing it with `new
// Date()` and letting the browser reformat it would silently re-convert
// to the viewer's own timezone, shifting the displayed time (and
// sometimes the date). Read the wall-clock digits straight out of the
// string instead so what's shown always matches what Strava recorded.
function localDateTimeParts(iso) {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hours: Number(hours),
    minutes: Number(minutes),
  };
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso) {
  const parts = localDateTimeParts(iso);
  if (!parts) return "";
  return `${MONTH_NAMES[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

export function formatTime(iso) {
  const parts = localDateTimeParts(iso);
  if (!parts) return "";
  const ampm = parts.hours >= 12 ? "PM" : "AM";
  const hour12 = parts.hours % 12 || 12;
  return `${hour12}:${String(parts.minutes).padStart(2, "0")} ${ampm}`;
}

/** Converts speed in m/s to a "min:sec /km" pace string. */
export function formatPace(metersPerSecond) {
  if (!metersPerSecond) return "--:--";
  const secondsPerKm = 1000 / metersPerSecond;
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
