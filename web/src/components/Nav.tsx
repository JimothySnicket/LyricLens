import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useTheme } from "../theme/ThemeProvider";

const HOW_IT_WORKS_SECTIONS = [
  { id: "keyword", label: "Keyword Search" },
  { id: "semantic", label: "Semantic Search" },
  { id: "hybrid", label: "Hybrid Search" },
  { id: "natural", label: "Natural Language" },
];

export function Nav() {
  const { theme, toggle } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === "/";

  function scrollTo(id: string) {
    setDropdownOpen(false);
    if (!isHome) {
      navigate("/#" + id);
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-(--color-border) bg-(--color-surface)/95 backdrop-blur-sm">
      <div className="max-w-[1800px] mx-auto px-4 flex items-center justify-between h-14">
        <NavLink to="/" className="text-xl font-semibold text-(--color-text)">
          LyricLens
        </NavLink>

        <div className="flex items-center gap-6">
          {/* How It Works dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              className="text-sm text-(--color-text-secondary) hover:text-(--color-text) transition-colors flex items-center gap-1"
            >
              How It Works
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={dropdownOpen ? "M3 7l3-3 3 3" : "M3 5l3 3 3-3"} />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-surface) shadow-lg py-1 z-50">
                {HOW_IT_WORKS_SECTIONS.map((section) => (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() => scrollTo("how-" + section.id)}
                    className="w-full text-left px-4 py-2 text-sm text-(--color-text-secondary) hover:bg-(--color-bg-secondary) hover:text-(--color-text) transition-colors"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search anchor */}
          <button
            type="button"
            onClick={() => scrollTo("search")}
            className="text-sm text-(--color-text-secondary) hover:text-(--color-text) transition-colors"
          >
            Search
          </button>

          {/* Deep Dive page */}
          <NavLink
            to="/deep-dive"
            className={({ isActive }) =>
              `text-sm transition-colors ${
                isActive
                  ? "text-(--color-text) border-b-2 border-(--color-accent) pb-1"
                  : "text-(--color-text-secondary) hover:text-(--color-text)"
              }`
            }
          >
            Deep Dive
          </NavLink>

          {/* Theme toggle */}
          <button
            type="button"
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
