import type { ParsedQuery } from "../lib/types";

interface QueryChipsProps {
  interpretations: ParsedQuery["interpretations"];
}

const TYPE_STYLES: Record<string, string> = {
  decade: "bg-(--color-warning-bg) text-(--color-warning)",
  genre: "bg-(--color-info-bg) text-(--color-info)",
  artist: "bg-(--color-success-bg) text-(--color-success)",
  mood: "bg-(--color-accent-subtle) text-(--color-text-secondary)",
  topic: "bg-(--color-accent-subtle) text-(--color-text-secondary)",
  default: "bg-(--color-bg-secondary) text-(--color-text-secondary)",
};

export function QueryChips({ interpretations }: QueryChipsProps) {
  if (!interpretations || interpretations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-(--color-text-tertiary) font-medium">Interpreted as:</span>
      {interpretations.map((item, i) => {
        const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.default;
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-(--color-border-subtle) ${style}`}
          >
            <span className="opacity-60 capitalize">{item.type}:</span>
            <span>{item.label}</span>
          </span>
        );
      })}
    </div>
  );
}
