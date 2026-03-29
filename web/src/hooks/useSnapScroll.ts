// web/src/hooks/useSnapScroll.ts

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseSnapScrollOptions {
  /** Total number of sections */
  sectionCount: number;
}

export function useSnapScroll({ sectionCount }: UseSnapScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const setSectionRef = useCallback((index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, sectionCount - 1));
    const section = sectionRefs.current[clamped];
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  }, [sectionCount]);

  // IntersectionObserver to track active section.
  // Uses a low threshold so tall (scrollable) sections still register,
  // then picks whichever section has the highest intersection ratio.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = sectionRefs.current.indexOf(entry.target as HTMLElement);
          if (idx !== -1) {
            ratios.set(idx, entry.intersectionRatio);
          }
        }

        // Pick the section with the highest visible ratio
        let bestIdx = -1;
        let bestRatio = 0;
        for (const [idx, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }
        if (bestIdx !== -1 && bestRatio > 0) {
          setActiveIndex(bestIdx);
        }
      },
      { root, threshold: [0, 0.1, 0.3, 0.5, 0.7, 1] }
    );

    for (const section of sectionRefs.current) {
      if (section) observer.observe(section);
    }

    return () => observer.disconnect();
  }, [sectionCount]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.min(prev + 1, sectionCount - 1);
          scrollToSection(next);
          return next;
        });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollToSection(next);
          return next;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sectionCount, scrollToSection]);

  return {
    containerRef,
    setSectionRef,
    activeIndex,
    scrollToSection,
  };
}
