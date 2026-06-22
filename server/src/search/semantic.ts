import { vectorSearch } from "../lib/vector-store";
import { embedQuery } from "../lib/embedder";
import type { ParsedQuery, SearchResult, ScoreComponent, Song } from "../lib/types";

// ---------------------------------------------------------------------------
// Build an in-memory candidate predicate from parsed query filters.
// (Replaces the old Qdrant payload filter — same intent: artist / title scope.)
// ---------------------------------------------------------------------------
function buildPredicate(parsed: ParsedQuery): ((song: Song, index: number) => boolean) | undefined {
  const { artistHint } = parsed.filters;
  const conds: Array<(s: Song) => boolean> = [];

  // Artist filter — explicit user intent ("by Artist")
  for (const token of artistHint) {
    const t = token.toLowerCase();
    conds.push((s) => s.artist.toLowerCase().includes(t));
  }

  // Title scope — explicit user intent ("in the title")
  if (parsed.scopeTitle && parsed.terms.length > 0) {
    for (const term of parsed.terms) {
      const t = term.toLowerCase();
      conds.push((s) => s.title.toLowerCase().includes(t));
    }
  }

  if (conds.length === 0) return undefined;
  return (s) => conds.every((c) => c(s));
}

// ---------------------------------------------------------------------------
// Semantic search — in-memory cosine over baked lyrics + summary vectors
// ---------------------------------------------------------------------------
export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20,
): Promise<{ results: SearchResult[]; totalFiltered: number; timing?: { embedMs: number; searchMs: number } }> {
  const predicate = buildPredicate(parsed);

  const queryText = originalQuery || parsed.semanticText;

  if (!queryText.trim()) {
    return { results: [], totalFiltered: 2742 };
  }

  const t0 = performance.now();
  const vector = await embedQuery(queryText);
  const embedMs = Math.round(performance.now() - t0);

  // Search both vector spaces
  const t1 = performance.now();
  const lyricsHits = vectorSearch(vector, "lyrics", limit, predicate);
  const summaryHits = vectorSearch(vector, "summary", limit, predicate);

  // Merge by song ID — track both scores for breakdown
  const merged = new Map<string, {
    result: SearchResult;
    lyricsScore: number;
    summaryScore: number;
  }>();

  for (const hit of lyricsHits) {
    const lScore = hit.score;
    merged.set(hit.song.id, {
      result: {
        song: hit.song,
        score: lScore,
        matchReason: `lyrics: ${lScore.toFixed(3)}`,
        scoreBreakdown: [],
        mode: "semantic" as const,
      },
      lyricsScore: lScore,
      summaryScore: 0,
    });
  }

  for (const hit of summaryHits) {
    const sScore = hit.score;
    const existing = merged.get(hit.song.id);
    if (existing) {
      existing.summaryScore = sScore;
      if (sScore > existing.result.score) {
        existing.result.score = sScore;
        existing.result.song = hit.song;
      }
    } else {
      merged.set(hit.song.id, {
        result: {
          song: hit.song,
          score: sScore,
          matchReason: `summary: ${sScore.toFixed(3)}`,
          scoreBreakdown: [],
          mode: "semantic" as const,
        },
        lyricsScore: 0,
        summaryScore: sScore,
      });
    }
  }

  // Build matchReason and scoreBreakdown
  for (const entry of merged.values()) {
    const { lyricsScore, summaryScore } = entry;
    const parts: string[] = [];
    const breakdown: ScoreComponent[] = [];

    if (lyricsScore > 0) {
      parts.push(`lyrics: ${lyricsScore.toFixed(3)}`);
      breakdown.push({ label: "Lyrics similarity", value: `${(lyricsScore * 100).toFixed(1)}%` });
    }
    if (summaryScore > 0) {
      parts.push(`summary: ${summaryScore.toFixed(3)}`);
      breakdown.push({ label: "Summary similarity", value: `${(summaryScore * 100).toFixed(1)}%` });
    }
    const best = Math.max(lyricsScore, summaryScore);
    breakdown.push({ label: "Best match", value: `${(best * 100).toFixed(1)}%` });

    entry.result.matchReason = parts.join(" · ");
    entry.result.scoreBreakdown = breakdown;
  }

  const searchMs = Math.round(performance.now() - t1);

  const results = [...merged.values()]
    .map((e) => e.result)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { results, totalFiltered: 2742, timing: { embedMs, searchMs } };
}
