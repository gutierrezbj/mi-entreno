"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  finishSession,
  startSession,
  type WorkoutTemplate,
  type WorkoutSession,
  type ExerciseDefinition,
} from "@/lib/model";
import {
  emptyLocal,
  readLocal,
  localKey,
  enqueue,
  draftSchema,
  type LocalState,
} from "@/lib/local";
import Editor from "./editor";
import PlanStructure from "./plan-structure";
import { groupSummary, withStructure } from "@/lib/structure";
import Workout from "./workout";
import History from "./history";
type Data = {
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  exercises: ExerciseDefinition[];
};
async function api(path: string, method = "GET", value?: unknown) {
  const r = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: value === undefined ? undefined : JSON.stringify(value),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "No se pudo conectar");
  return data;
}
export default function Dashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<Data>({
    templates: [],
    sessions: [],
    exercises: [],
  });
  const [local, setLocal] = useState<LocalState>(emptyLocal);
  const localRef = useRef(local);
  const storedRaw = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"routine" | "workout" | "history">(
    "routine",
  );
  const [selected, setSelected] = useState("");
  const [editor, setEditor] = useState<{
    template: WorkoutTemplate;
    isNew: boolean;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const persist = useCallback(
    (next: LocalState) => {
      try {
        if (localStorage.getItem(localKey(userId)) !== storedRaw.current) {
          setReady(false);
          setMessage(
            "El registro cambió en otra pestaña. Recarga antes de continuar.",
          );
          return false;
        }
        if (next.draft && !draftSchema.safeParse(next.draft).success) {
          setMessage(
            "Revisa los valores: deben ser positivos y estar dentro de los límites.",
          );
          return false;
        }
        const raw = JSON.stringify(next);
        localStorage.setItem(localKey(userId), raw);
        storedRaw.current = raw;
        localRef.current = next;
        setLocal(next);
        return true;
      } catch {
        setMessage(
          "No hay espacio para guardar en este dispositivo. No cierres esta pantalla. Libera espacio antes de continuar.",
        );
        return false;
      }
    },
    [userId],
  );
  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const s of [...localRef.current.pending]) {
        await api("sessions", "POST", s);
        setData((d) => ({
          ...d,
          sessions: [s, ...d.sessions.filter((x) => x.id !== s.id)],
        }));
        if (
          !persist({
            ...localRef.current,
            pending: localRef.current.pending.filter((x) => x.id !== s.id),
          })
        )
          return;
      }
      const fresh: Data = await api("data");
      setData(fresh);
      setLoaded(true);
      setSelected((s) =>
        fresh.templates.some((t) => t.id === s)
          ? s
          : (fresh.templates[0]?.id ?? ""),
      );
      setMessage("");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Sin conexión. Los registros locales se conservan.",
      );
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [persist]);
  useEffect(() => {
    let valid = true;
    try {
      storedRaw.current = localStorage.getItem(localKey(userId));
      const state = readLocal(storedRaw.current);
      localRef.current = state;
      setLocal(state);
      setReady(true);
      if (state.draft) setView("workout");
    } catch {
      valid = false;
      setMessage(
        "No se pudo leer el registro local. Se conserva intacto. Exporta una copia antes de restaurarlo.",
      );
    }
    setOnline(navigator.onLine);
    if (valid) void sync();
    const connected = () => {
      setOnline(true);
      if (valid) void sync();
    };
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, [userId, sync]);
  useEffect(() => {
    const otherTab = (e: StorageEvent) => {
      if (e.key === localKey(userId)) {
        setReady(false);
        setMessage(
          "Otra pestaña ha cambiado el registro local. Recarga esta página antes de seguir para evitar sobrescribirlo.",
        );
      }
    };
    window.addEventListener("storage", otherTab);
    return () => window.removeEventListener("storage", otherTab);
  }, [userId]);
  const template = data.templates.find((t) => t.id === selected);
  const allSessions = [
    ...data.sessions.filter((s) => !local.pending.some((p) => p.id === s.id)),
    ...local.pending,
  ];
  function start() {
    if (!template || !ready) return;
    if (local.draft) {
      setView("workout");
      return;
    }
    if (
      persist({
        ...localRef.current,
        draft: startSession(withStructure(template)),
      })
    ) {
      setView("workout");
      window.scrollTo(0, 0);
    }
  }
  function finish() {
    if (!localRef.current.draft || !ready) return;
    try {
      const session = finishSession(localRef.current.draft);
      if (persist(enqueue(localRef.current, session))) {
        setView("history");
        window.scrollTo(0, 0);
        void sync();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Revisa los datos");
    }
  }
  function duplicate(t: WorkoutTemplate) {
    setEditor({
      isNew: true,
      template: {
        ...structuredClone(t),
        id: crypto.randomUUID(),
        version: 1,
        name: t.name + " · copia",
      },
    });
  }
  return (
    <div className="app-shell">
      <header>
        <a className="brand" href="/" aria-label="Mi Entreno, inicio">
          <span className="logo">M/</span> MI ENTRENO
        </a>
        <button
          className="quiet small"
          onClick={async () => {
            if (localRef.current.draft || localRef.current.pending.length) {
              setMessage(
                "Guarda la sesión y sincroniza los pendientes antes de salir.",
              );
              return;
            }
            try {
              await api("logout", "POST");
              localStorage.removeItem(localKey(userId));
              location.href = "/login";
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "No se pudo salir");
            }
          }}
        >
          Salir
        </button>
      </header>
      <main>
        <div className="connection">
          <span className={online ? "dot" : "dot offline"} />
          {syncing
            ? "Sincronizando…"
            : online
              ? "Espacio privado"
              : "Sin conexión · Guardado local"}
          {local.pending.length > 0 && (
            <button
              className="quiet"
              disabled={syncing}
              onClick={() => void sync()}
            >
              Sincronizar ({local.pending.length})
            </button>
          )}
        </div>
        {message && (
          <div role="alert" className="notice">
            {message}
            <button
              className="quiet"
              onClick={() => void sync()}
              disabled={syncing || !ready}
            >
              Reintentar
            </button>
          </div>
        )}
        {!ready && (
          <button
            className="outline"
            onClick={() => {
              const blob = new Blob(
                [localStorage.getItem(localKey(userId)) ?? ""],
                { type: "application/json" },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "mi-entreno-recuperacion.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exportar copia local
          </button>
        )}
        {editor ? (
          <Editor
            initial={editor.template}
            isNew={editor.isNew}
            onCancel={() => setEditor(null)}
            onSave={async (t, isNew) => {
              const saved: WorkoutTemplate = await api(
                "templates",
                isNew ? "POST" : "PUT",
                t,
              );
              setData((d) => ({
                ...d,
                templates: [
                  saved,
                  ...d.templates.filter((x) => x.id !== saved.id),
                ],
              }));
              setSelected(saved.id);
              setEditor(null);
              setMessage("Rutina guardada.");
            }}
          />
        ) : view === "workout" && local.draft ? (
          <fieldset disabled={!ready} className="workout-fieldset">
            <Workout
              draft={local.draft}
              history={allSessions}
              onChange={(draft) => {
                if (ready) persist({ ...localRef.current, draft });
              }}
              onFinish={finish}
            />
          </fieldset>
        ) : view === "history" ? (
          <History
            sessions={allSessions}
            pending={new Set(local.pending.map((s) => s.id))}
          />
        ) : (
          <>
            <p className="eyebrow">TU PRÓXIMO PASO</p>
            <h1>
              Hoy, un poco
              <br />
              <em>más cerca.</em>
            </h1>
            <p className="muted intro">
              Vuelve a moverte. Apunta lo que hagas.
              <br />
              El ritmo lo pones tú.
            </p>
            <div className="section-heading">
              <h2>Mis rutinas</h2>
              <button
                className="quiet"
                disabled={!loaded}
                onClick={() =>
                  setEditor({
                    isNew: true,
                    template: {
                      id: crypto.randomUUID(),
                      version: 1,
                      name: "Mi rutina",
                      targetMinutes: 45,
                      blocks: [
                        {
                          id: crypto.randomUUID(),
                          name: "Bloque 1",
                          rounds: 1,
                          exercises: [
                            {
                              id: crypto.randomUUID(),
                              exerciseId: crypto.randomUUID(),
                              name: "Ejercicio",
                              unit: "reps",
                              target: 1,
                              loadKg: null,
                              restSeconds: 0,
                              uncertain: false,
                            },
                          ],
                        },
                      ],
                    },
                  })
                }
              >
                + Nueva
              </button>
            </div>
            {data.templates.length > 1 && (
              <label>
                Selecciona rutina
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {data.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!template ? (
              <p className="card muted">
                {loaded
                  ? "Crea una rutina para comenzar."
                  : "Cargando tus rutinas…"}
              </p>
            ) : (
              <>
                <section className="routine-hero card">
                  <div className="section-heading">
                    <span className="eyebrow">CIRCUITO FUNCIONAL</span>
                    <span className="pill">V{template.version}</span>
                  </div>
                  <h2>{template.name}</h2>
                  <div className="routine-stats">
                    <div>
                      <strong>{template.blocks.length}</strong>
                      <span>bloques</span>
                    </div>
                    <div>
                      <strong>
                        {template.targetMinutes}
                        <small> min</small>
                      </strong>
                      <span>referencia, sin límite</span>
                    </div>
                  </div>
                  <button className="primary" disabled={!ready} onClick={start}>
                    {local.draft ? "Retomar sesión" : "Comenzar sesión"}{" "}
                    <span>↗</span>
                  </button>
                  <div className="actions">
                    <button
                      className="quiet"
                      onClick={() => setEditor({ template, isNew: false })}
                    >
                      Editar rutina
                    </button>
                    <button
                      className="quiet"
                      onClick={() => duplicate(template)}
                    >
                      Duplicar
                    </button>
                    <button
                      className="quiet danger"
                      onClick={() => setDeleteId(template.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                  {deleteId === template.id && (
                    <div role="alert" className="notice">
                      ¿Eliminar esta plantilla? Las sesiones guardadas se
                      conservan.
                      <div className="actions">
                        <button
                          className="danger"
                          onClick={async () => {
                            try {
                              await api("templates/" + template.id, "DELETE");
                              setDeleteId(null);
                              await sync();
                            } catch (e) {
                              setMessage(
                                e instanceof Error
                                  ? e.message
                                  : "No se pudo eliminar",
                              );
                            }
                          }}
                        >
                          Sí, eliminar
                        </button>
                        <button onClick={() => setDeleteId(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </section>
                <div className="section-heading">
                  <h2>Tu plan de hoy</h2>
                  <span className="muted small">Editable, siempre</span>
                </div>
                {template.blocks.map((b, i) => (
                  <details
                    className="card plan-block"
                    key={b.id}
                    open={i === 0}
                  >
                    <summary>
                      <span className="block-number">0{i + 1}</span>
                      <span>
                        <strong>{b.name}</strong>
                        <span className="muted small">
                          {groupSummary(b.exercises)} · {b.rounds}{" "}
                          {b.rounds === 1 ? "ronda" : "rondas"}
                        </span>
                      </span>
                      <span className="expand">+</span>
                    </summary>
                    <PlanStructure exercises={b.exercises} />
                  </details>
                ))}
                <p className="muted small">
                  Los complementarios proceden de una transcripción incierta.
                  Revísalos en el editor antes de entrenar.
                </p>
              </>
            )}
            <section className="card gentle">
              <span>↗</span>
              <div>
                <h3>La constancia suma.</h3>
                <p className="muted">
                  Una sesión parcial también es un paso adelante. No necesitas
                  completarlo todo para registrarlo.
                </p>
              </div>
            </section>
          </>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {(
          [
            { id: "routine", label: "Rutinas", icon: "▦" },
            { id: "workout", label: "Entrenar", icon: "◷" },
            { id: "history", label: "Histórico", icon: "↗" },
          ] as const
        ).map((item) => (
          <button
            aria-current={view === item.id ? "page" : undefined}
            key={item.id}
            onClick={() => {
              setEditor(null);
              if (item.id === "workout" && !local.draft) {
                start();
                return;
              }
              setView(item.id);
              window.scrollTo(0, 0);
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
