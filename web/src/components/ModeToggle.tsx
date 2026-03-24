import type { SearchMode } from "../lib/types";

interface ModeToggleProps {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

const MODES: { value: SearchMode; label: string; description: string }[] = [
  {
    value: "keyword",
    label: "Keyword",
    description: "Matches exact words in title, lyrics, and artist",
  },
  {
    value: "semantic",
    label: "Semantic",
    description: "Finds songs by meaning, even without matching words",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "Filters first, then ranks by meaning",
  },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  const active = MODES.find((m) => m.value === mode);

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex rounded-[var(--radius-md)] border border-(--color-border) overflow-hidden bg-(--color-bg-secondary) p-0.5 gap-0.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${
              mode === m.value
                ? "bg-(--color-surface) text-(--color-text) border border-(--color-border) shadow-sm"
                : "text-(--color-text-secondary) hover:text-(--color-text)"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {active && (
        <p className="text-xs text-(--color-text-tertiary)">{active.description}</p>
      )}
    </div>
  );
}
