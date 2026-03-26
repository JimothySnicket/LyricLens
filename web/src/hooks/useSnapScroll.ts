// web/src/hooks/useSnapScroll.ts

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseSnapScrollOptions {
  /** Total number of sections */
  sectionCount: number;
  /** IntersectionObserver threshold for "active" section */
  threshold?: number;
}

export function useSnapScroll({ sectionCount, threshold = 0.6 }: UseSnapScrollOptions) {
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

  // IntersectionObserver to track active section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionRefs.current.forEach((section, index) => {
      if (!section) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index);
          }
        },
        { threshold }
      );

      observer.observe(section);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [threshold, sectionCount]);

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
