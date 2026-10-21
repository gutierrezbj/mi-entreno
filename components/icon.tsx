export type IconName =
  | "home"
  | "routines"
  | "history"
  | "progress"
  | "more"
  | "play"
  | "pause"
  | "arrow"
  | "back"
  | "plus"
  | "check"
  | "timer"
  | "settings"
  | "logout"
  | "sync"
  | "dumbbell"
  | "activity";
const paths: Record<IconName, string> = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  routines: "M8 3v18M16 3v18M3 8h18M3 16h18",
  history: "M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2",
  progress: "M4 20V10M10 20V4M16 20v-7M22 20V7",
  more: "M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1",
  play: "m9 5 11 7-11 7V5",
  pause: "M8 5v14M16 5v14",
  arrow: "m9 5 7 7-7 7",
  back: "m15 5-7 7 7 7",
  plus: "M12 5v14M5 12h14",
  check: "m5 12 4 4L19 6",
  timer: "M10 2h4M12 7v6l3 2M19 5l2 2M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  settings:
    "M12 8v8M8 12h8M12 3l2 3 4 1 1 4 2 1-2 2-1 4-4 1-2 2-2-2-4-1-1-4-2-2 2-1 1-4 4-1 2-3",
  logout: "M9 3H4v18h5M12 12h9m-4-4 4 4-4 4",
  sync: "M20 7a9 9 0 0 0-15-1L2 9m0-6v6h6M4 17a9 9 0 0 0 15 1l3-3m0 6v-6h-6",
  dumbbell: "M7 12h10M3 8v8M7 5v14M17 5v14M21 8v8",
  activity: "M2 12h4l3-8 6 16 3-8h4",
};
export default function Icon({
  name,
  size = 22,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
