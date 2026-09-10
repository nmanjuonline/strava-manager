import { useEffect, useState } from "react";
import { getKudos, getComments } from "../api.js";
import { formatDate } from "../format.js";

export default function SocialModal({ activity, onClose }) {
  const [kudos, setKudos] = useState(null);
  const [comments, setComments] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    Promise.all([getKudos(activity.id), getComments(activity.id)])
      .then(([kudosData, commentsData]) => {
        if (cancelled) return;
        setKudos(kudosData);
        setComments(commentsData);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load kudos/comments");
      });
    return () => {
      cancelled = true;
    };
  }, [activity.id]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{activity.name}</h2>

        {error && <div className="error-text">{error}</div>}

        <section className="social-section">
          <h3>Kudos {kudos ? `(${kudos.length})` : ""}</h3>
          {kudos === null && !error && (
            <p className="social-loading">Loading…</p>
          )}
          {kudos && kudos.length === 0 && (
            <p className="social-empty">No kudos yet.</p>
          )}
          {kudos && kudos.length > 0 && (
            <ul className="kudos-list">
              {kudos.map((k, i) => (
                <li key={i} className="kudos-item">
                  {k.profile_medium && (
                    <img
                      className="avatar"
                      src={k.profile_medium}
                      alt=""
                      width={24}
                      height={24}
                    />
                  )}
                  <span>
                    {k.firstname} {k.lastname}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="social-section">
          <h3>Comments {comments ? `(${comments.length})` : ""}</h3>
          {comments === null && !error && (
            <p className="social-loading">Loading…</p>
          )}
          {comments && comments.length === 0 && (
            <p className="social-empty">No comments yet.</p>
          )}
          {comments && comments.length > 0 && (
            <ul className="comments-list">
              {comments.map((c) => (
                <li key={c.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">
                      {c.athlete
                        ? `${c.athlete.firstname} ${c.athlete.lastname}`
                        : "Someone"}
                    </span>
                    <span className="comment-date">
                      {formatDate(c.created_at)}
                    </span>
                  </div>
                  <p className="comment-text">{c.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
