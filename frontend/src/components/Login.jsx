import { useState } from "react";
import { setStoredSecret, loginUrl } from "../api.js";

export default function Login({ onSecretSaved }) {
  const [value, setValue] = useState("");

  function handleConnect(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setStoredSecret(value.trim());
    onSecretSaved();
    window.location.href = loginUrl(value.trim());
  }

  return (
    <div className="login-panel">
      <h1>Activity Log</h1>
      <p>
        Enter the app password you set as <code>APP_SECRET</code> on your
        worker, then connect your Strava account.
      </p>
      <form onSubmit={handleConnect}>
        <div className="field">
          <label htmlFor="secret">App password</label>
          <input
            id="secret"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" type="submit">
            Connect to Strava
          </button>
        </div>
      </form>
    </div>
  );
}
