import { motion } from "motion/react";
import { useNavigate, useLocation } from "react-router";
import { useTheme } from "../theme/ThemeProvider";

const SECTION_LINKS = [
  { label: "Intro", hash: "intro" },
  { label: "Keyword", hash: "keyword" },
  { label: "Semantic", hash: "semantic" },
  { label: "Hybrid", hash: "hybrid" },
  { label: "NL", hash: "nl" },
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

  function handleSectionClick(index: number, hash: string) {
    if (isHome && onNavigate) {
      onNavigate(index);
    } else {
      navigate(`/#${hash}`);
    }
  }

  return (
    <motion.header
      initial={{ opacity: isHome ? 0 : 1, y: isHome ? -20 : 0 }}
      animate={{ opacity: 1, y: visible ? 0 : -60 }}
      transition={{ duration: isHome ? 0.3 : 0 }}
      className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-(--color-border) bg-(--color-bg)/95 backdrop-blur-sm overflow-hidden"
    >
      <nav className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => handleSectionClick(0, "intro")}
          className="text-base font-semibold text-(--color-text) bg-transparent border-none cursor-pointer"
          style={{ fontFamily: "inherit" }}
        >
          Lyric<span className="text-(--color-text-secondary)">Lens</span>
        </button>

        {/* Section links + page links */}
        <div className="flex items-center gap-6">
          {SECTION_LINKS.map((link, i) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleSectionClick(i, link.hash)}
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
