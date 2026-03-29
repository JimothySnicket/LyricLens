import { motion } from "motion/react";
import { useNavigate, useLocation } from "react-router";
import { useTheme } from "../theme/ThemeProvider";

const SECTION_LINKS = [
  { label: "Intro", index: 0 },
  { label: "Keyword", index: 1 },
  { label: "Semantic", index: 2 },
  { label: "Hybrid", index: 3 },
  { label: "NL", index: 4 },
];

interface NavProps {
  visible?: boolean;
  onNavigate?: (sectionIndex: number) => void;
}

export function Nav({ visible = true, onNavigate }: NavProps) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isHome = pathname === "/";

  function handleNav(index: number) {
    if (onNavigate) {
      onNavigate(index);
    } else {
      navigate("/");
    }
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: visible ? 0 : -60 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-(--color-border) bg-(--color-bg)/95 backdrop-blur-sm"
    >
      <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => handleNav(0)}
          className="text-base font-semibold text-(--color-text) bg-transparent border-none cursor-pointer"
          style={{ fontFamily: "inherit" }}
        >
          Lyric<span className="text-(--color-text-secondary)">Lens</span>
        </button>

        {/* Section links */}
        <div className="flex items-center gap-6">
          {isHome && SECTION_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleNav(link.index)}
              className="text-xs text-(--color-text-tertiary) hover:text-(--color-text-secondary) transition-colors bg-transparent border-none cursor-pointer"
              style={{ fontFamily: "inherit" }}
            >
              {link.label}
            </button>
          ))}
          <a
            href="/deep-dive"
            className="text-xs text-(--color-text-secondary) hover:text-(--color-text) transition-colors"
          >
            Deep Dive →
          </a>
          <a
            href="/visualizer"
            className="text-xs text-(--color-text-secondary) hover:text-(--color-text) transition-colors"
          >
            Vector Map
          </a>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-(--color-bg-secondary) transition-colors text-(--color-text-tertiary) bg-transparent border-none cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13.5 8.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" />
              </svg>
            )}
          </button>
        </div>
      </nav>
    </motion.header>
  );
}
