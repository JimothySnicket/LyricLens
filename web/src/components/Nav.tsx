import { NavLink } from "react-router";
import { useTheme } from "../theme/ThemeProvider";

export function Nav() {
  const { theme, toggle } = useTheme();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${
      isActive
        ? "text-(--color-text) border-b-2 border-(--color-accent) pb-1"
        : "text-(--color-text-secondary) hover:text-(--color-text)"
    }`;

  return (
    <nav className="border-b border-(--color-border) bg-(--color-surface)">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
        <NavLink to="/" className="text-xl font-semibold text-(--color-text)">
          LyricLens
        </NavLink>
        <div className="flex items-center gap-8">
          <NavLink to="/" className={linkClass} end>Search</NavLink>
          <NavLink to="/visualizer" className={linkClass}>Visualizer</NavLink>
          <NavLink to="/how-it-works" className={linkClass}>How It Works</NavLink>
          <button
            onClick={toggle}
            className="text-sm text-(--color-text-secondary) hover:text-(--color-text)"
            aria-label="Toggle theme"
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
      </div>
    </nav>
  );
}
