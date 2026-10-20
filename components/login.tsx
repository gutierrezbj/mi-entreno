"use client";
import { useState } from "react";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <div className="brand">
        <span className="logo">M/</span> MI ENTRENO
      </div>
      <p className="eyebrow">TU ESPACIO PERSONAL</p>
      <h1>
        Volver.
        <br />
        Moverte.
        <br />
        <em>Seguir.</em>
      </h1>
      <p className="muted">Cada sesión cuenta. También las parciales.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          try {
            const res = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(Object.fromEntries(form)),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            location.href = "/";
          } catch (e) {
            setError(e instanceof Error ? e.message : "Sin conexión");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Usuario
          <input
            name="username"
            autoComplete="username"
            required
            maxLength={120}
          />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Entrando…" : "Entrar a mi espacio →"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
      <p className="muted small">Acceso privado · Sin registros públicos</p>
    </main>
  );
}
