import { useRef, useEffect, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import type { ModeAnimationContent } from "./animation-content";
import { ANIMATION_FPS, ANIMATION_DURATION_FRAMES } from "./animation-content";

interface AnimationSectionProps {
  content: ModeAnimationContent;
  composition: React.FC<{ content: ModeAnimationContent }>;
  onSkipToSearch: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function AnimationSection({
  content,
  composition,
  onSkipToSearch,
  scrollContainerRef,
}: AnimationSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [isVisible, setIsVisible] = useState(false);
  const wasVisible = useRef(false);

  // Track visibility via IntersectionObserver
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { root: scrollContainerRef?.current ?? null, threshold: 0.6 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [scrollContainerRef]);

  // When section becomes visible again, restart; when hidden, pause
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isVisible && wasVisible.current === false) {
      // Just became visible — restart from beginning
      player.seekTo(0);
      player.play();
    } else if (!isVisible && wasVisible.current === true) {
      // Just became hidden — pause
      player.pause();
    }

    wasVisible.current = isVisible;
  }, [isVisible]);

  return (
    <div
      ref={sectionRef}
      style={{
        height: "100vh",
        scrollSnapAlign: "start",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {/* Colored number badge */}
      <div
        style={{
          marginTop: 24,
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: `var(${content.cssVar}, ${content.fallbackColor})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "white",
          flexShrink: 0,
        }}
      >
        {content.num}
      </div>

      {/* Mode label */}
      <div
        style={{
          marginTop: 8,
          fontSize: 18,
          fontWeight: 600,
          color: "var(--color-text)",
          flexShrink: 0,
        }}
      >
        {content.label}
      </div>

      {/* Remotion Player — observer triggers play when section is scrolled into view */}
      <div style={{ flex: 1, width: "100%", maxWidth: 900, margin: "4px auto 0" }}>
        <Player
          ref={playerRef}
          component={composition}
          inputProps={{ content }}
          durationInFrames={ANIMATION_DURATION_FRAMES}
          fps={ANIMATION_FPS}
          compositionWidth={900}
          compositionHeight={500}
          style={{ width: "100%", height: "100%" }}
          moveToBeginningWhenEnded={false}
          clickToPlay={false}
          acknowledgeRemotionLicense
        />
      </div>

      {/* Skip to search */}
      <button
        type="button"
        onClick={onSkipToSearch}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: "var(--color-text-tertiary)",
          borderBottom: "1px solid var(--color-border)",
          padding: 0,
          fontFamily: "var(--font-sans)",
        }}
      >
        Skip to search ↓
      </button>
    </div>
  );
}
