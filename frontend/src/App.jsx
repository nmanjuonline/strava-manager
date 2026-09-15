import { useEffect, useState, useCallback } from "react";
import { getStatus, getStoredSecret, clearStoredSecret, logout } from "./api.js";
import Login from "./components/Login.jsx";
import ActivitiesList from "./components/ActivitiesList.jsx";

export default function App() {
  const [hasSecret, setHasSecret] = useState(!!getStoredSecret());
  const [connected, setConnected] = useState(null); // null = checking
  const [checkError, setCheckError] = useState("");
  const [searchSlot, setSearchSlot] = useState(null);

  const checkStatus = useCallback(() => {
    if (!getStoredSecret()) {
      setConnected(false);
      return;
    }
    getStatus()
      .then((res) => setConnected(res.connected))
      .catch((err) => {
        setCheckError(err.message);
        setConnected(false);
      });
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus, hasSecret]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // even if the call fails, forget the local secret
    }
    clearStoredSecret();
    setHasSecret(false);
    setConnected(false);
  }

  if (!hasSecret || connected === false) {
    return (
      <div className="app-shell">
        <Login onSecretSaved={() => setHasSecret(true)} />
        {checkError && <div className="error-text">{checkError}</div>}
      </div>
    );
  }

  if (connected === null) {
    return (
      <div className="app-shell">
        <div className="loading-state">Checking connection…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Strava Mini</h1>
        <div className="status-pill">
          <span className="dot" title="Connected" />
          <div ref={setSearchSlot} className="header-search-slot" />
          <button className="btn btn-ghost header-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <ActivitiesList searchSlot={searchSlot} />
    </div>
  );
}

