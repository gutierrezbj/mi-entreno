import { equipmentLabels, type Equipment } from "@/lib/structure";
export default function EquipmentTag({
  kind = "unspecified",
}: {
  kind?: Equipment;
}) {
  return (
    <span className={`equipment-tag equipment-${kind}`}>
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {kind === "machine" ? (
          <>
            <path d="M4 18h16M6 18V9h5l3 5h4v4M11 9V5h5" />
            <circle cx="7" cy="6" r="2" />
          </>
        ) : kind === "bodyweight" ? (
          <>
            <circle cx="12" cy="4" r="2" />
            <path d="m5 9 7-2 7 2M12 7v7m0 0-5 6m5-6 5 6" />
          </>
        ) : kind === "weighted" ? (
          <>
            <path d="M7 12h10M3 9v6m4-8v10m10-10v10m4-8v6" />
          </>
        ) : (
          <circle cx="12" cy="12" r="7" />
        )}
      </svg>
      {equipmentLabels[kind]}
    </span>
  );
}
