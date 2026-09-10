import { useState } from "react";

const COMMON_SPORT_TYPES = [
  "Run",
  "TrailRun",
  "Ride",
  "MountainBikeRide",
  "GravelRide",
  "VirtualRide",
  "Swim",
  "Walk",
  "Hike",
  "WeightTraining",
  "Yoga",
  "Workout",
];

export default function EditModal({ activity, gearOptions, onClose, onSave }) {
  const [name, setName] = useState(activity.name || "");
  const [description, setDescription] = useState(activity.description || "");
  const [gearId, setGearId] = useState(activity.gear_id || "");
  const [sportType, setSportType] = useState(
    activity.sport_type || activity.type || ""
  );
  const [commute, setCommute] = useState(!!activity.commute);
  const [trainer, setTrainer] = useState(!!activity.trainer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sportTypeOptions = COMMON_SPORT_TYPES.includes(sportType)
    ? COMMON_SPORT_TYPES
    : [sportType, ...COMMON_SPORT_TYPES].filter(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(activity.id, {
        name,
        description,
        gear_id: gearId || "none",
        sport_type: sportType,
        commute,
        trainer,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit activity</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="gear">Gear</label>
            <select
              id="gear"
              value={gearId}
              onChange={(e) => setGearId(e.target.value)}
            >
              <option value="">No gear</option>
              {gearOptions.bikes.length > 0 && (
                <optgroup label="Bikes">
                  {gearOptions.bikes.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {gearOptions.shoes.length > 0 && (
                <optgroup label="Shoes">
                  {gearOptions.shoes.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="field">
            <label htmlFor="sportType">Type</label>
            <select
              id="sportType"
              value={sportType}
              onChange={(e) => setSportType(e.target.value)}
            >
              {sportTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={commute}
                onChange={(e) => setCommute(e.target.checked)}
              />
              Commute
            </label>
            <label>
              <input
                type="checkbox"
                checked={trainer}
                onChange={(e) => setTrainer(e.target.checked)}
              />
              Trainer
            </label>
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
