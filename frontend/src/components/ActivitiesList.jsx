import { useEffect, useState, useCallback } from "react";
import { getActivities, getAthlete, updateActivity } from "../api.js";
import { formatDistance, formatDuration, formatDate } from "../format.js";
import EditModal from "./EditModal.jsx";
import SocialModal from "./SocialModal.jsx";

const PER_PAGE = 20;

export default function ActivitiesList() {
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [gearOptions, setGearOptions] = useState({ bikes: [], shoes: [] });
  const [editingActivity, setEditingActivity] = useState(null);
  const [socialActivity, setSocialActivity] = useState(null);

  useEffect(() => {
    getAthlete()
      .then((athlete) => {
        setGearOptions({
          bikes: athlete.bikes || [],
          shoes: athlete.shoes || [],
        });
      })
      .catch(() => {
        // Gear list is a nice-to-have; edit still works without it.
      });
  }, []);

  const load = useCallback((pageToLoad) => {
    setLoading(true);
    setError("");
    getActivities(pageToLoad, PER_PAGE)
      .then((data) => {
        setActivities(data);
        setHasNextPage(data.length === PER_PAGE);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const gearNameById = {};
  for (const g of [...gearOptions.bikes, ...gearOptions.shoes]) {
    gearNameById[g.id] = g.name;
  }

  async function handleSave(id, fields) {
    const updated = await updateActivity(id, fields);
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updated } : a))
    );
  }

  return (
    <div>
      {loading && <div className="loading-state">Loading activities…</div>}
      {error && <div className="error-text">{error}</div>}

      {!loading && !error && activities.length === 0 && (
        <div className="empty-state">No activities on this page.</div>
      )}

      {!loading && activities.length > 0 && (
        <div className="ledger">
          {activities.map((activity) => (
            <div className="activity-row" key={activity.id}>
              <span className="type-tag">
                {activity.sport_type || activity.type}
              </span>
              <div className="activity-main">
                <p className="name">{activity.name}</p>
                <div className="meta">
                  <span>{formatDate(activity.start_date_local)}</span>
                  <span>{formatDistance(activity.distance)}</span>
                  <span>{formatDuration(activity.moving_time)}</span>
                  {activity.gear_id && (
                    <span>
                      gear: {gearNameById[activity.gear_id] || activity.gear_id}
                    </span>
                  )}
                  <button
                    type="button"
                    className="social-trigger"
                    onClick={() => setSocialActivity(activity)}
                  >
                    ♥ {activity.kudos_count ?? 0} · 💬{" "}
                    {activity.comment_count ?? 0}
                  </button>
                </div>
                {activity.description && (
                  <p className="description">{activity.description}</p>
                )}
              </div>
              <button
                className="edit-btn"
                onClick={() => setEditingActivity(activity)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button
          className="btn btn-ghost"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          ← Prev
        </button>
        <span className="page-label">Page {page}</span>
        <button
          className="btn btn-ghost"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNextPage || loading}
        >
          Next →
        </button>
      </div>

      {editingActivity && (
        <EditModal
          activity={editingActivity}
          gearOptions={gearOptions}
          onClose={() => setEditingActivity(null)}
          onSave={handleSave}
        />
      )}

      {socialActivity && (
        <SocialModal
          activity={socialActivity}
          onClose={() => setSocialActivity(null)}
        />
      )}
    </div>
  );
}
