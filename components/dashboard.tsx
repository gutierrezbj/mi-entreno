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
import Home from "./screens/home";
import Routines from "./screens/routines";
import Insights from "./screens/insights";
import SessionSummary from "./screens/session-summary";
import Icon, { type IconName } from "./icon";
import { withStructure } from "@/lib/structure";
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
  const [view, setView] = useState<
    "home" | "routine" | "workout" | "history" | "insights" | "more" | "summary"
  >("home");
  const [selected, setSelected] = useState("");
  const [editor, setEditor] = useState<{
    template: WorkoutTemplate;
    isNew: boolean;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [routineDetail, setRoutineDetail] = useState(false);
  const [lastSaved, setLastSaved] = useState<WorkoutSession | null>(null);
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
    if (!ready) return;
    if (local.draft) {
      setView("workout");
      return;
    }
    if (!template) return;
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
        setLastSaved(session);
        setView("summary");
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
  function navigate(next: typeof view) {
    setEditor(null);
    setView(next);
    if (next === "routine") setRoutineDetail(false);
    window.scrollTo(0, 0);
  }
  function selectRoutine(id: string) {
    setSelected(id);
    setRoutineDetail(true);
    setView("routine");
    window.scrollTo(0, 0);
  }
  function editRoutine(t: WorkoutTemplate) {
    setView("routine");
    setRoutineDetail(true);
    setEditor({ template: t, isNew: false });
  }
  function newRoutine() {
    setView("routine");
    setRoutineDetail(true);
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
                equipment: "unspecified",
                supersetId: null,
              },
            ],
          },
        ],
      },
    });
  }
  async function signOut() {
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
  }
  const navItems: { id: typeof view; label: string; icon: IconName }[] = [
    { id: "home", label: "Inicio", icon: "home" },
    { id: "routine", label: "Rutinas", icon: "routines" },
    { id: "history", label: "Historial", icon: "history" },
    { id: "insights", label: "Progreso", icon: "progress" },
    { id: "more", label: "Más", icon: "more" },
  ];
  return (
    <div className={`app-shell view-${view}`}>
      <header className="app-header">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Mi Entreno, inicio"
        >
          <span className="brand-mark">
            <Icon name="activity" size={22} />
          </span>
          Mi Entreno
        </button>
        <button
          className="profile-button"
          aria-label="Ajustes"
          onClick={() => navigate("more")}
        >
          <Icon name="settings" size={20} />
        </button>
      </header>
      <main>
        {(syncing || !online || local.pending.length > 0) && (
          <div className="connection">
            <span className={online ? "dot" : "dot offline"} />
            {syncing
              ? "Sincronizando…"
              : online
                ? "Guardado local pendiente"
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
        )}
        {message && (
          <div
            role={message === "Rutina guardada." ? "status" : "alert"}
            className={`notice ${message === "Rutina guardada." ? "success" : ""}`}
          >
            {message}
            <button
              className="quiet"
              onClick={() =>
                message === "Rutina guardada." ? setMessage("") : void sync()
              }
              disabled={syncing || !ready}
            >
              {message === "Rutina guardada." ? "Cerrar" : "Reintentar"}
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
              setView("routine");
              setRoutineDetail(true);
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
        ) : view === "insights" ? (
          <Insights sessions={allSessions} />
        ) : view === "summary" && lastSaved ? (
          <SessionSummary
            session={lastSaved}
            pending={local.pending.some((s) => s.id === lastSaved.id)}
            onHistory={() => navigate("history")}
          />
        ) : view === "more" ? (
          <>
            <div className="screen-title">
              <h1>Ajustes</h1>
            </div>
            <section className="card profile-card">
              <span className="profile-avatar">
                <Icon name="activity" size={27} />
              </span>
              <div>
                <h2>Mi espacio privado</h2>
                <p className="muted small">Mi Entreno</p>
              </div>
            </section>
            <div className="settings-list">
              <button onClick={() => navigate("routine")}>
                <Icon name="routines" />
                <span>Mis rutinas</span>
                <Icon name="arrow" size={16} />
              </button>
              {template && (
                <button onClick={() => editRoutine(template)}>
                  <Icon name="settings" />
                  <span>Editar rutina actual</span>
                  <Icon name="arrow" size={16} />
                </button>
              )}
              <button onClick={() => navigate("history")}>
                <Icon name="history" />
                <span>Mi historial</span>
                <Icon name="arrow" size={16} />
              </button>
              <button onClick={() => void sync()} disabled={syncing}>
                <Icon name="sync" />
                <span>
                  Sincronizar{" "}
                  {local.pending.length
                    ? `(${local.pending.length} pendientes)`
                    : ""}
                </span>
                <Icon name="arrow" size={16} />
              </button>
              <button className="danger" onClick={() => void signOut()}>
                <Icon name="logout" />
                <span>Cerrar sesión</span>
              </button>
            </div>
            <p className="muted small settings-note">
              Los borradores de entrenamiento se guardan en este dispositivo.
              Las sesiones sincronizadas se conservan en tu servidor privado.
            </p>
          </>
        ) : view === "routine" ? (
          <Routines
            templates={data.templates}
            selected={template}
            detail={routineDetail}
            onSelect={selectRoutine}
            onBack={() => setRoutineDetail(false)}
            onNew={newRoutine}
            onEdit={editRoutine}
            onDuplicate={duplicate}
            onDelete={async (id) => {
              await api("templates/" + id, "DELETE");
              setRoutineDetail(false);
              await sync();
            }}
            onStart={start}
            ready={ready}
            active={!!local.draft}
          />
        ) : loaded ? (
          <Home
            sessions={allSessions}
            templates={
              template
                ? [
                    template,
                    ...data.templates.filter((t) => t.id !== template.id),
                  ]
                : data.templates
            }
            draft={local.draft}
            onStart={start}
            onRoutines={() => navigate("routine")}
            onRoutine={selectRoutine}
            onHistory={() => navigate("history")}
            ready={ready}
          />
        ) : (
          <p className="card muted">Cargando tu espacio…</p>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {navItems.map((item) => (
          <button
            key={item.id}
            aria-current={
              view === item.id ||
              (item.id === "routine" && view === "workout") ||
              (item.id === "history" && view === "summary")
                ? "page"
                : undefined
            }
            onClick={() => navigate(item.id)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
