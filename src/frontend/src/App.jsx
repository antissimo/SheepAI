import { useEffect, useMemo, useState } from "react";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(`${apiBase}/health`)
      .then(async (response) => {
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(payload?.detail?.error || "Health check failed");
        }
        setState({ status: "ok", payload });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: "error", error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const badgeClass = useMemo(() => {
    if (state.status === "ok") return "badge badge--ok";
    if (state.status === "error") return "badge badge--error";
    return "badge";
  }, [state.status]);

  return (
    <main className="app-shell">
      <section className="panel">
        <p className="eyebrow">SheepAI</p>
        <h1>Health and stack status</h1>
        <div className="status-row">
          <span className={badgeClass}>
            {state.status === "loading"
              ? "Checking backend"
              : state.status === "ok"
                ? "Backend up"
                : "Backend down"}
          </span>
          <span className="muted">{apiBase}</span>
        </div>
        <pre className="payload">
          {state.status === "loading"
            ? "Waiting for response..."
            : state.status === "ok"
              ? JSON.stringify(state.payload, null, 2)
              : state.error}
        </pre>
      </section>
    </main>
  );
}
