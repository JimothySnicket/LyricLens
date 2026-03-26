// web/src/components/animations/AnimationSection.tsx

import { useRef, useEffect, useCallback, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import type { ModeAnimationContent } from "./animation-content";
import { ANIMATION_FPS, ANIMATION_DURATION_FRAMES } from "./animation-content";

interface AnimationSectionProps {
  content: ModeAnimationContent;
  composition: React.FC<{ content: ModeAnimationContent }>;
  onSkipToSearch: () => void;
}

export function AnimationSection({ content, composition, onSkipToSearch }: AnimationSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  const handleIntersection = useCallback(
    ([entry]: IntersectionObserverEntry[]) => {
      const player = playerRef.current;
      if (!player) return;

      if (entry.isIntersecting) {
        player.seekTo(0);
        player.play();
        setHasPlayed(true);
      } else {
        player.pause();
      }
    },
    []
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.6,
    });

    observer.observe(section);
    return () => observer.disconnect();
  }, [handleIntersection]);

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
          marginTop: 32,
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

      {/* Remotion Player */}
      <div style={{ flex: 1, width: "100%", maxWidth: 900, margin: "16px auto 0" }}>
        <Player
          ref={playerRef}
          component={composition}
          inputProps={{ content }}
          durationInFrames={ANIMATION_DURATION_FRAMES}
          fps={ANIMATION_FPS}
          compositionWidth={900}
          compositionHeight={500}
          style={{ width: "100%", height: "100%" }}
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
