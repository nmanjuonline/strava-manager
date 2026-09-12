import { useEffect, useState, useCallback } from "react";
import {
  getActivities,
  getActivityDetail,
  getAthlete,
  updateActivity,
} from "../api.js";
import { formatDistance, formatDuration, formatDate } from "../format.js";
import EditModal from "./EditModal.jsx";
import SocialModal from "./SocialModal.jsx";
import SplitsTable from "./SplitsTable.jsx";

const PER_PAGE = 20;

export default function ActivitiesList() {
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [gearOptions, setGearOptions] = useState({ bikes: [], shoes: [] });
  const [editingActivity, setEditingActivity] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [socialActivity, setSocialActivity] = useState(null);
  const [expandedSplitsId, setExpandedSplitsId] = useState(null);
  const [splitsCache, setSplitsCache] = useState({});
  const [splitsLoadingId, setSplitsLoadingId] = useState(null);
  const [splitsError, setSplitsError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

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

  // The activity list Strava returns doesn't include description, so we
  // fetch the full detail record right before editing — otherwise the
  // description field always looks empty even when one exists.
  async function handleEditClick(activity) {
    setEditLoadingId(activity.id);
    try {
      const detail = await getActivityDetail(activity.id);
      const merged = { ...activity, ...detail };
      setActivities((prev) =>
        prev.map((a) => (a.id === activity.id ? merged : a))
      );
      setEditingActivity(merged);
    } catch (err) {
      setError(err.message || "Couldn't load activity details");
    } finally {
      setEditLoadingId(null);
    }
  }

  async function handleToggleSplits(activity) {
    if (expandedSplitsId === activity.id) {
      setExpandedSplitsId(null);
      return;
    }
    setExpandedSplitsId(activity.id);
    setSplitsError("");
    if (splitsCache[activity.id]) return;

    setSplitsLoadingId(activity.id);
    try {
      const detail = await getActivityDetail(activity.id);
      setSplitsCache((prev) => ({ ...prev, [activity.id]: detail.splits_metric || [] }));
    } catch (err) {
      setSplitsError(err.message || "Couldn't load splits");
    } finally {
      setSplitsLoadingId(null);
    }
  }

  async function handleShare(activity) {
    const url = `https://www.strava.com/activities/${activity.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: activity.name, url });
      } catch {
        // user cancelled the share sheet — no error needed
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(activity.id);
      setTimeout(() => setCopiedId((id) => (id === activity.id ? null : id)), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
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
            <div key={activity.id}>
              <div className="activity-row">
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
                  {copiedId === activity.id && (
                    <p className="copy-toast">Link copied</p>
                  )}
                </div>
                <div className="row-actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleToggleSplits(activity)}
                  >
                    {expandedSplitsId === activity.id ? "Hide splits" : "Splits"}
                  </button>
                  <button
                    className="edit-btn"
                    onClick={() => handleShare(activity)}
                  >
                    Share
                  </button>
                  <button
                    className="edit-btn"
                    onClick={() => handleEditClick(activity)}
                    disabled={editLoadingId === activity.id}
                  >
                    {editLoadingId === activity.id ? "Loading…" : "Edit"}
                  </button>
                </div>
              </div>

              {expandedSplitsId === activity.id && (
                <div className="splits-wrap">
                  {splitsLoadingId === activity.id && (
                    <div className="splits-empty">Loading splits…</div>
                  )}
                  {splitsError && splitsLoadingId !== activity.id && (
                    <div className="error-text">{splitsError}</div>
                  )}
                  {splitsCache[activity.id] && splitsLoadingId !== activity.id && (
                    <SplitsTable splits={splitsCache[activity.id]} />
                  )}
                </div>
              )}
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

