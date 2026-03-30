import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import type { ParsedQuery, SearchResult, ScoreComponent } from "../lib/types";

// ---------------------------------------------------------------------------
// Build Qdrant filter from parsed query filters
// ---------------------------------------------------------------------------
function buildQdrantFilter(parsed: ParsedQuery): Record<string, any> | undefined {
  const { artistHint } = parsed.filters;
  const must: any[] = [];

  // Artist filter — explicit user intent ("by Artist")
  if (artistHint.length > 0) {
    for (const token of artistHint) {
      must.push({ key: "artist", match: { text: token } });
    }
  }

  // Title scope — explicit user intent ("in the title")
  if (parsed.scopeTitle && parsed.terms.length > 0) {
    for (const term of parsed.terms) {
      must.push({ key: "title", match: { text: term } });
    }
  }

  if (must.length === 0) return undefined;
  return { must };
}

// ---------------------------------------------------------------------------
// Semantic search
// ---------------------------------------------------------------------------
export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20,
): Promise<{ results: SearchResult[]; totalFiltered: number; timing?: { embedMs: number; qdrantMs: number } }> {
  const client = getQdrantClient();

  const filter = buildQdrantFilter(parsed);

  const queryText = originalQuery || parsed.semanticText;

  if (!queryText.trim()) {
    return { results: [], totalFiltered: 2742 };
  }

  const t0 = performance.now();
  const vector = await embedQuery(queryText);
  const embedMs = Math.round(performance.now() - t0);

  // Query both vectors in parallel
  const t1 = performance.now();
  const [lyricsResponse, summaryResponse] = await Promise.all([
    client.query(COLLECTION_NAME, {
      query: vector,
      using: "lyrics",
      filter,
      limit,
      with_payload: true,
    }),
    client.query(COLLECTION_NAME, {
      query: vector,
      using: "summary",
      filter,
      limit,
      with_payload: true,
    }),
  ]);

  // Merge by song ID — track both scores for breakdown
  const merged = new Map<string, {
    result: SearchResult;
    lyricsScore: number;
    summaryScore: number;
  }>();

  for (const point of lyricsResponse.points) {
    const song = payloadToSong(point.id, point.payload);
    const lScore = point.score ?? 0;
    merged.set(song.id, {
      result: {
        song,
        score: lScore,
        matchReason: `lyrics: ${lScore.toFixed(3)}`,
        scoreBreakdown: [],
        mode: "semantic" as const,
      },
      lyricsScore: lScore,
      summaryScore: 0,
    });
  }

  for (const point of summaryResponse.points) {
    const song = payloadToSong(point.id, point.payload);
    const sScore = point.score ?? 0;
    const existing = merged.get(song.id);
    if (existing) {
      existing.summaryScore = sScore;
      if (sScore > existing.result.score) {
        existing.result.score = sScore;
        existing.result.song = song;
      }
    } else {
      merged.set(song.id, {
        result: {
          song,
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

  const qdrantMs = Math.round(performance.now() - t1);

  const results = [...merged.values()]
    .map((e) => e.result)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { results, totalFiltered: 2742, timing: { embedMs, qdrantMs } };
}
