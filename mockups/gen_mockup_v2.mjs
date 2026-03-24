// Excalidraw wireframe generator v2 — LyricLens
// Focus: clear page flow, separation of search vs retrieval process,
// storytelling through the three messages
const elements = [];
let idCounter = 1;
const now = Date.now();

function uid() { return 'el_' + (idCounter++); }
function sd() { return Math.floor(Math.random() * 2000000000); }

function rect(x, y, w, h, opts = {}) {
  elements.push({
    id: uid(), type: 'rectangle', x, y, width: w, height: h, angle: 0,
    strokeColor: opts.stroke || '#1e1e1e',
    backgroundColor: opts.fill || 'transparent',
    fillStyle: opts.fillStyle || 'solid',
    strokeWidth: opts.sw || 2,
    strokeStyle: opts.dash ? 'dashed' : 'solid',
    roughness: 0, opacity: opts.opacity || 100,
    groupIds: opts.group ? [opts.group] : [],
    roundness: opts.rounded !== false ? { type: 3 } : null,
    seed: sd(), version: 1, versionNonce: sd(),
    isDeleted: false, boundElements: opts.bound || null,
    updated: now, link: null, locked: false
  });
  return elements[elements.length - 1];
}

function txt(x, y, str, opts = {}) {
  const fs = opts.fontSize || 16;
  elements.push({
    id: uid(), type: 'text', x, y,
    width: opts.width || str.split('\n').reduce((max, line) => Math.max(max, line.length), 0) * fs * 0.55,
    height: opts.height || str.split('\n').length * fs * 1.35,
    angle: 0,
    strokeColor: opts.color || '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
    roughness: 0, opacity: opts.opacity || 100,
    groupIds: opts.group ? [opts.group] : [],
    roundness: null, seed: sd(), version: 1, versionNonce: sd(),
    isDeleted: false, boundElements: null, updated: now,
    link: null, locked: false,
    text: str, fontSize: fs, fontFamily: opts.fontFamily || 1,
    textAlign: opts.align || 'left', verticalAlign: opts.vAlign || 'top',
    containerId: null, originalText: str, autoResize: true, lineHeight: 1.25
  });
  return elements[elements.length - 1];
}

function ln(points, opts = {}) {
  elements.push({
    id: uid(), type: opts.arrow ? 'arrow' : 'line',
    x: points[0][0], y: points[0][1], width: 0, height: 0, angle: 0,
    strokeColor: opts.stroke || '#1e1e1e',
    backgroundColor: 'transparent', fillStyle: 'solid',
    strokeWidth: opts.sw || 2, strokeStyle: opts.dash ? 'dashed' : 'solid',
    roughness: 0, opacity: 100, groupIds: [],
    roundness: { type: 2 }, seed: sd(), version: 1, versionNonce: sd(),
    isDeleted: false, boundElements: null, updated: now,
    link: null, locked: false,
    points: points.map((p, i) => i === 0 ? [0, 0] : [p[0] - points[0][0], p[1] - points[0][1]]),
    lastCommittedPoint: null, startBinding: null, endBinding: null,
    startArrowhead: null, endArrowhead: opts.arrow ? 'arrow' : null
  });
}

function divider(x, y, w, opts = {}) {
  ln([[x, y], [x + w, y]], { stroke: opts.stroke || '#cccccc', sw: 1, ...opts });
}

function badge(x, y, label, opts = {}) {
  const g = 'g_' + idCounter;
  rect(x, y, label.length * 9 + 20, 28, { fill: opts.fill || '#e8e8e8', stroke: opts.stroke || '#aaaaaa', sw: 1, rounded: true, group: g });
  txt(x + 10, y + 5, label, { fontSize: 13, color: opts.textColor || '#444444', group: g });
}

function button(x, y, label, opts = {}) {
  const w = opts.width || label.length * 10 + 30;
  const g = 'g_' + idCounter;
  rect(x, y, w, 38, { fill: opts.active ? '#1e1e1e' : '#f5f5f5', stroke: opts.active ? '#1e1e1e' : '#cccccc', sw: opts.active ? 2 : 1, rounded: true, group: g });
  txt(x + 15, y + 9, label, { fontSize: 14, color: opts.active ? '#ffffff' : '#555555', group: g });
}

function card(x, y, w, h, opts = {}) {
  rect(x, y, w, h, { fill: '#ffffff', stroke: '#dddddd', sw: 1, rounded: true, ...opts });
}

function annotation(x, y, str, opts = {}) {
  txt(x, y, str, { fontSize: 12, color: '#d32f2f', ...opts });
}

function annotationBox(x, y, w, h, str, opts = {}) {
  rect(x, y, w, h, { fill: '#fff3f0', stroke: '#d32f2f', sw: 1, dash: true, rounded: true });
  txt(x + 10, y + 8, str, { fontSize: 11, color: '#d32f2f', width: w - 20 });
}

// ============================================
// LAYOUT: Three pages stacked with clear labels
// Page 1: SEARCH (top)
// Page 2: VISUALIZER (middle)
// Page 3: HOW IT WORKS (bottom)
// Annotations on the right side
// ============================================

const PW = 900;  // page width
const PX = 100;  // page x offset
const AX = PX + PW + 40; // annotation x

// ============================================
// DESIGN INTENT (top of canvas)
// ============================================
txt(PX, 20, 'LyricLens v2 \u2014 Wireframes (v2)', { fontSize: 28, color: '#1e1e1e' });
txt(PX, 58, 'Three messages: (1) How 3 RAG methods work  (2) Use it in a context anyone understands  (3) Hire this guy', { fontSize: 14, color: '#888888' });
txt(PX, 80, 'Key separation: THE SEARCH (what user does) vs THE RETRIEVAL PROCESS (what happens under the hood)', { fontSize: 13, color: '#d32f2f' });


// ============================================
// PAGE 1: SEARCH
// ============================================
const S = 130; // search page y start

txt(PX, S, 'PAGE 1: SEARCH', { fontSize: 22, color: '#888888' });
txt(PX + 200, S + 5, '\u2014 "Here\'s how you can use it"', { fontSize: 14, color: '#aaaaaa' });

rect(PX, S + 35, PW, 1350, { fill: '#fafafa', stroke: '#cccccc', sw: 1 });

// --- Nav (shared across all pages) ---
rect(PX, S + 35, PW, 52, { fill: '#ffffff', stroke: '#dddddd', sw: 1, rounded: false });
txt(PX + 24, S + 50, 'LyricLens', { fontSize: 20, color: '#1e1e1e' });
// Nav items - right aligned
txt(PX + 580, S + 54, 'Search', { fontSize: 14, color: '#1e1e1e' });
divider(PX + 578, S + 82, 50, { stroke: '#1e1e1e' }); // active underline
txt(PX + 660, S + 54, 'Visualizer', { fontSize: 14, color: '#888888' });
txt(PX + 770, S + 54, 'How It Works', { fontSize: 14, color: '#888888' });

// ==============================
// ZONE 1: THE SEARCH (user-facing product experience)
// ==============================
annotationBox(AX, S + 100, 260, 55, 'ZONE 1: THE SEARCH\nThe product. Clean, usable,\nfamiliar search experience.');

// Search bar - large, centered, the primary action
rect(PX + 100, S + 120, 700, 55, { fill: '#ffffff', stroke: '#bbbbbb', sw: 1, rounded: true });
txt(PX + 130, S + 136, 'songs that feel like driving at night...', { fontSize: 16, color: '#aaaaaa' });
rect(PX + 720, S + 128, 65, 38, { fill: '#1e1e1e', stroke: '#1e1e1e', sw: 1, rounded: true });
txt(PX + 732, S + 137, 'Search', { fontSize: 13, color: '#ffffff' });

// Quick suggestions - small, unobtrusive
txt(PX + 100, S + 188, 'Try:', { fontSize: 12, color: '#aaaaaa' });
badge(PX + 130, S + 184, 'baby in the title, 60s', { fill: '#f5f5f5', stroke: '#dddddd', textColor: '#888888' });
badge(PX + 315, S + 184, 'sad rock songs', { fill: '#f5f5f5', stroke: '#dddddd', textColor: '#888888' });
badge(PX + 445, S + 184, 'by Michael Jackson', { fill: '#f5f5f5', stroke: '#dddddd', textColor: '#888888' });
badge(PX + 610, S + 184, 'upbeat dance', { fill: '#f5f5f5', stroke: '#dddddd', textColor: '#888888' });

// --- Mode Toggle (tabs, not buttons - feels like navigation, not configuration) ---
const tabY = S + 230;
rect(PX + 50, tabY, 800, 50, { fill: '#f5f5f5', stroke: '#dddddd', sw: 1, rounded: true });
// Tab: Keyword
rect(PX + 58, tabY + 6, 250, 38, { fill: 'transparent', stroke: 'transparent', sw: 0, rounded: true });
txt(PX + 100, tabY + 12, 'Keyword Search', { fontSize: 15, color: '#888888' });
// Tab: Semantic (active)
rect(PX + 318, tabY + 6, 260, 38, { fill: '#ffffff', stroke: '#dddddd', sw: 1, rounded: true });
txt(PX + 365, tabY + 12, 'Semantic Search', { fontSize: 15, color: '#1e1e1e' });
// Tab: Hybrid
rect(PX + 588, tabY + 6, 250, 38, { fill: 'transparent', stroke: 'transparent', sw: 0, rounded: true });
txt(PX + 640, tabY + 12, 'Hybrid Search', { fontSize: 15, color: '#888888' });

annotationBox(AX, tabY - 10, 260, 70, 'MODE TOGGLE\nTabs, not buttons. Switching\nmodes re-runs the same query\nso you see the difference.');

// Mode description - one line that changes per mode
txt(PX + 280, tabY + 55, 'Finds songs by meaning, even without matching words', { fontSize: 12, color: '#888888' });

// --- Active Filters (only show when active) ---
const filtY = tabY + 80;
txt(PX + 100, filtY, 'Active filters:', { fontSize: 12, color: '#aaaaaa' });
badge(PX + 205, filtY - 3, '1980s  \u00d7', { fill: '#f0f4ff', stroke: '#b0c4de', textColor: '#4a6fa5' });
badge(PX + 290, filtY - 3, 'Rock  \u00d7', { fill: '#f0fff0', stroke: '#90b090', textColor: '#4a7a4a' });

// --- Results ---
const resY = filtY + 40;
divider(PX + 50, resY, 800);
txt(PX + 60, resY + 10, '12 results', { fontSize: 13, color: '#888888' });
txt(PX + 680, resY + 10, 'sorted by similarity', { fontSize: 12, color: '#aaaaaa' });

// Result Card 1 — clean, focused
const c1Y = resY + 35;
card(PX + 60, c1Y, 780, 135);
// Left: song info
txt(PX + 85, c1Y + 15, 'Running Down a Dream', { fontSize: 18, color: '#1e1e1e' });
txt(PX + 85, c1Y + 42, 'Tom Petty  \u00b7  1989  \u00b7  Rock', { fontSize: 13, color: '#888888' });
// Match reason — this changes per mode (key educational element)
rect(PX + 85, c1Y + 68, 500, 32, { fill: '#f8f8f8', stroke: '#eeeeee', sw: 1, rounded: true });
txt(PX + 100, c1Y + 74, 'Matched: lyric themes of motion, night, and freedom', { fontSize: 12, color: '#555555' });
// Tags
badge(PX + 85, c1Y + 105, 'night/time', { fill: '#f0f0f0', stroke: '#dddddd', textColor: '#666666' });
badge(PX + 185, c1Y + 105, '#7 on chart', { fill: '#f0f0f0', stroke: '#dddddd', textColor: '#666666' });
// Right: score
rect(PX + 740, c1Y + 12, 80, 36, { fill: '#1e1e1e', stroke: '#1e1e1e', sw: 1, rounded: true });
txt(PX + 753, c1Y + 18, '0.847', { fontSize: 16, color: '#ffffff' });
txt(PX + 742, c1Y + 52, 'similarity', { fontSize: 11, color: '#aaaaaa' });

annotationBox(AX, c1Y, 260, 75, 'MATCH REASON changes per mode:\nKeyword: "\'dream\' in title"\nSemantic: "themes of motion, night"\nHybrid: "filtered 80s + semantic"');

// Result Card 2
const c2Y = c1Y + 148;
card(PX + 60, c2Y, 780, 115);
txt(PX + 85, c2Y + 15, 'Drive', { fontSize: 18, color: '#1e1e1e' });
txt(PX + 85, c2Y + 42, 'The Cars  \u00b7  1984  \u00b7  Rock', { fontSize: 13, color: '#888888' });
rect(PX + 85, c2Y + 68, 400, 32, { fill: '#f8f8f8', stroke: '#eeeeee', sw: 1, rounded: true });
txt(PX + 100, c2Y + 74, 'Matched: nighttime atmosphere, emotional drive', { fontSize: 12, color: '#555555' });
rect(PX + 740, c2Y + 12, 80, 36, { fill: '#1e1e1e', stroke: '#1e1e1e', sw: 1, rounded: true });
txt(PX + 753, c2Y + 18, '0.823', { fontSize: 16, color: '#ffffff' });

// Result Card 3
const c3Y = c2Y + 128;
card(PX + 60, c3Y, 780, 95);
txt(PX + 85, c3Y + 15, 'Nightshift', { fontSize: 18, color: '#1e1e1e' });
txt(PX + 85, c3Y + 42, 'Commodores  \u00b7  1985  \u00b7  Pop', { fontSize: 13, color: '#888888' });
rect(PX + 85, c3Y + 62, 350, 25, { fill: '#f8f8f8', stroke: '#eeeeee', sw: 1, rounded: true });
txt(PX + 100, c3Y + 65, 'Matched: night, shifting moods', { fontSize: 12, color: '#555555' });
rect(PX + 740, c3Y + 12, 80, 36, { fill: '#1e1e1e', stroke: '#1e1e1e', sw: 1, rounded: true });
txt(PX + 753, c3Y + 18, '0.791', { fontSize: 16, color: '#ffffff' });

txt(PX + 420, c3Y + 110, '\u00b7  \u00b7  \u00b7', { fontSize: 18, color: '#cccccc' });

// ==============================
// ZONE 2: THE RETRIEVAL PROCESS (under the hood)
// ==============================
const uhY = c3Y + 145;
annotationBox(AX, uhY - 10, 260, 70, 'ZONE 2: UNDER THE HOOD\nSeparate from search results.\nShows what the system did.\nCollapsible by default.');

divider(PX + 50, uhY, 800);
// Collapsible header
rect(PX + 60, uhY + 12, 780, 48, { fill: '#f8f8f8', stroke: '#e0e0e0', sw: 1, rounded: true });
txt(PX + 85, uhY + 22, '\u25bc  Under the hood: how this search worked', { fontSize: 14, color: '#555555' });
txt(PX + 620, uhY + 25, 'Semantic mode \u00b7 12ms', { fontSize: 12, color: '#aaaaaa' });

// Expanded state (dashed to show it's a toggle)
const expY = uhY + 72;
rect(PX + 60, expY, 780, 320, { fill: '#ffffff', stroke: '#e0e0e0', sw: 1, rounded: true });

// Step 1: Parse
txt(PX + 85, expY + 15, '1. Query Parsed', { fontSize: 14, color: '#1e1e1e' });
txt(PX + 85, expY + 38, '"songs that feel like driving at night" \u2192 filters: 1980s, Rock \u2192 semantic query: "driving at night"', { fontSize: 12, color: '#666666' });

// Step 2: Filter
divider(PX + 85, expY + 60, 730, { stroke: '#eeeeee' });
txt(PX + 85, expY + 70, '2. Metadata Filters Applied', { fontSize: 14, color: '#1e1e1e' });
txt(PX + 85, expY + 93, '691 songs \u2192 filtered to 142 songs matching decade:1980s AND genre:Rock', { fontSize: 12, color: '#666666' });

// Step 3: Embed + Search
divider(PX + 85, expY + 115, 730, { stroke: '#eeeeee' });
txt(PX + 85, expY + 125, '3. Query Embedded & Searched', { fontSize: 14, color: '#1e1e1e' });
txt(PX + 85, expY + 148, '"driving at night" \u2192 384-dim vector \u2192 cosine similarity against 142 filtered songs', { fontSize: 12, color: '#666666' });

// Step 4: Results
divider(PX + 85, expY + 170, 730, { stroke: '#eeeeee' });
txt(PX + 85, expY + 180, '4. Results Ranked by Similarity', { fontSize: 14, color: '#1e1e1e' });
txt(PX + 85, expY + 203, 'Top match: "Running Down a Dream" (0.847) \u2014 themes of motion, night, freedom', { fontSize: 12, color: '#666666' });

// Visual: mini pipeline
const mpY = expY + 235;
txt(PX + 85, mpY, 'Pipeline:', { fontSize: 11, color: '#aaaaaa' });
const miniSteps = [
  ['Parse', '#e0e0e0'], ['Filter\n142 songs', '#e0e0e0'], ['Embed\n384-dim', '#e0e0e0'], ['Search\nQdrant', '#e0e0e0'], ['Rank\n12 results', '#e0e0e0']
];
miniSteps.forEach(([ label, fill ], i) => {
  const mx = PX + 155 + i * 130;
  rect(mx, mpY - 5, 110, 50, { fill: '#f5f5f5', stroke: '#cccccc', sw: 1, rounded: true });
  txt(mx + 10, mpY + 2, label, { fontSize: 11, color: '#555555', width: 90, height: 36 });
  if (i < miniSteps.length - 1) {
    txt(mx + 114, mpY + 8, '\u2192', { fontSize: 16, color: '#cccccc' });
  }
});

annotationBox(AX, expY, 260, 90, 'THIS SECTION CHANGES PER MODE\nKeyword: shows term matching\nSemantic: shows embedding + vector\nHybrid: shows both filter + vector\nThe educational payload.');

// ==============================
// ZONE 3: EXPANDED CARD (on click)
// ==============================
const exY = expY + 350;
annotationBox(AX, exY, 260, 55, 'EXPANDED CARD\nClicked result shows lyrics,\nsentiment, audio features.');

txt(PX + 60, exY + 5, 'EXPANDED RESULT (on click):', { fontSize: 13, color: '#888888' });
rect(PX + 60, exY + 25, 780, 200, { fill: '#ffffff', stroke: '#cccccc', sw: 1, dash: true, rounded: true });

// Two columns in expanded card
// Left: lyrics
txt(PX + 85, exY + 40, 'Lyrics', { fontSize: 13, color: '#555555' });
rect(PX + 85, exY + 58, 380, 110, { fill: '#fafafa', stroke: '#eeeeee', sw: 1, rounded: true });
txt(PX + 100, exY + 68, 'It was a beautiful day, the sun beat down\nI had the radio on, I was drivin\nTrees flew by, me and Del were singin\nLittle Runaway, I was flyin...', { fontSize: 11, color: '#666666', width: 350, height: 70 });
// Highlight note
txt(PX + 85, exY + 178, 'Keyword matches highlighted in results', { fontSize: 10, color: '#aaaaaa' });

// Right: metrics
txt(PX + 500, exY + 40, 'Song Profile', { fontSize: 13, color: '#555555' });
const profileMetrics = [
  ['Sadness', '12%'], ['Romantic', '8%'], ['Night/Time', '78%'],
  ['Energy', '85%'], ['Danceability', '70%'], ['Valence', '62%']
];
profileMetrics.forEach(([label, val], i) => {
  const my = exY + 62 + i * 20;
  txt(PX + 500, my, label, { fontSize: 11, color: '#888888' });
  txt(PX + 610, my, val, { fontSize: 11, color: '#333333' });
  // Simple bar
  rect(PX + 650, my + 3, 140, 8, { fill: '#f0f0f0', stroke: '#eeeeee', sw: 0, rounded: true });
  const pct = parseInt(val) / 100;
  rect(PX + 650, my + 3, 140 * pct, 8, { fill: '#999999', stroke: '#999999', sw: 0, rounded: true });
});


// ============================================
// PAGE 2: VISUALIZER
// ============================================
const V = S + 1440; // visualizer y start

txt(PX, V, 'PAGE 2: VISUALIZER', { fontSize: 22, color: '#888888' });
txt(PX + 260, V + 5, '\u2014 "See the math, not a black box"', { fontSize: 14, color: '#aaaaaa' });

rect(PX, V + 35, PW, 1050, { fill: '#fafafa', stroke: '#cccccc', sw: 1 });

// Nav bar
rect(PX, V + 35, PW, 52, { fill: '#ffffff', stroke: '#dddddd', sw: 1, rounded: false });
txt(PX + 24, V + 50, 'LyricLens', { fontSize: 20, color: '#1e1e1e' });
txt(PX + 580, V + 54, 'Search', { fontSize: 14, color: '#888888' });
txt(PX + 660, V + 54, 'Visualizer', { fontSize: 14, color: '#1e1e1e' });
divider(PX + 658, V + 82, 75, { stroke: '#1e1e1e' });
txt(PX + 770, V + 54, 'How It Works', { fontSize: 14, color: '#888888' });

// Title + subtitle
txt(PX + 60, V + 105, 'Embedding Space', { fontSize: 24, color: '#1e1e1e' });
txt(PX + 60, V + 138, 'Each dot is a song. Similar songs cluster together \u2014 not by genre, but by feeling.', { fontSize: 13, color: '#888888' });

// --- Controls row ---
const vcY = V + 170;
// Search input
rect(PX + 60, vcY, 380, 40, { fill: '#ffffff', stroke: '#bbbbbb', sw: 1, rounded: true });
txt(PX + 80, vcY + 10, 'Type a query to project into space...', { fontSize: 13, color: '#aaaaaa' });
button(PX + 450, vcY + 1, 'Project', { width: 90, active: true });

// Color by
txt(PX + 570, vcY + 12, 'Color by:', { fontSize: 12, color: '#888888' });
badge(PX + 635, vcY + 6, 'Genre', { fill: '#1e1e1e', stroke: '#1e1e1e', textColor: '#ffffff' });
badge(PX + 705, vcY + 6, 'Decade', { fill: '#f5f5f5', stroke: '#cccccc', textColor: '#888888' });
badge(PX + 780, vcY + 6, 'Topic', { fill: '#f5f5f5', stroke: '#cccccc', textColor: '#888888' });

// --- 3D Plot ---
const plotY = vcY + 55;
rect(PX + 40, plotY, 820, 520, { fill: '#ffffff', stroke: '#dddddd', sw: 2, rounded: true });

// Genre clusters with labels
const clusters = [
  { cx: 200, cy: 180, color: '#4caf50', label: 'Rock', dots: [[0,0],[25,15],[-15,25],[30,-10],[10,35],[-20,-5]] },
  { cx: 500, cy: 140, color: '#2196f3', label: 'Pop', dots: [[0,0],[20,10],[-10,20],[15,-15],[25,25],[-5,30],[35,5]] },
  { cx: 350, cy: 350, color: '#ff9800', label: 'Country', dots: [[0,0],[20,-10],[-15,15],[25,20],[-10,-20]] },
  { cx: 650, cy: 280, color: '#9c27b0', label: 'Jazz', dots: [[0,0],[15,15],[-20,10],[10,-20]] },
  { cx: 180, cy: 400, color: '#f44336', label: 'Blues', dots: [[0,0],[20,10],[-10,-15]] },
  { cx: 700, cy: 420, color: '#795548', label: 'Reggae', dots: [[0,0],[15,-10],[-10,15]] },
];
clusters.forEach(c => {
  txt(PX + 40 + c.cx - 15, plotY + c.cy - 25, c.label, { fontSize: 10, color: c.color, opacity: 60 });
  c.dots.forEach(([dx, dy]) => {
    rect(PX + 40 + c.cx + dx - 4, plotY + c.cy + dy - 4, 8, 8, { fill: c.color, stroke: c.color, sw: 0, rounded: true });
  });
});

// Query vector
txt(PX + 40 + 380, plotY + 310, '\u2605', { fontSize: 30, color: '#d32f2f' });

// Lines to nearest matches
ln([[PX + 40 + 395, plotY + 325], [PX + 40 + 350, plotY + 350]], { stroke: '#d32f2f', sw: 1, dash: true });
ln([[PX + 40 + 395, plotY + 325], [PX + 40 + 365, plotY + 370]], { stroke: '#d32f2f', sw: 1, dash: true });
ln([[PX + 40 + 395, plotY + 325], [PX + 40 + 200, plotY + 180]], { stroke: '#d32f2f', sw: 1, dash: true });

// Query label
txt(PX + 40 + 410, plotY + 305, '"driving at night"', { fontSize: 12, color: '#d32f2f' });
txt(PX + 40 + 410, plotY + 322, 'query vector', { fontSize: 10, color: '#d32f2f' });

annotationBox(AX, plotY, 260, 100, '3D UMAP SCATTER\nInteractive (Plotly or Three.js)\n\u00b7 Rotate, zoom, pan\n\u00b7 Hover shows song name\n\u00b7 Click opens song detail\n\u00b7 Query projects as star');

// Legend row
const legY = plotY + 535;
rect(PX + 40, legY, 820, 40, { fill: '#fafafa', stroke: '#eeeeee', sw: 1, rounded: true });
clusters.forEach((c, i) => {
  const lx = PX + 70 + i * 135;
  rect(lx, legY + 13, 12, 12, { fill: c.color, stroke: c.color, sw: 0, rounded: true });
  txt(lx + 18, legY + 11, c.label, { fontSize: 12, color: '#555555' });
});

// --- Insight panel ---
const insY = legY + 55;
card(PX + 40, insY, 820, 90);
txt(PX + 65, insY + 12, 'What you\'re seeing', { fontSize: 15, color: '#1e1e1e' });
txt(PX + 65, insY + 38, 'Songs cluster by emotional theme, not genre. Notice how 60s soul and 80s power ballads\nshare a neighbourhood. Keyword search would never connect them \u2014 they don\'t share\nwords, they share feelings. That\'s what embeddings capture.', { fontSize: 12, color: '#666666', width: 770, height: 50 });

annotationBox(AX, insY, 260, 55, 'INSIGHT PANEL\nChanges based on what\'s\nvisible. The "aha" moment.');


// ============================================
// PAGE 3: HOW IT WORKS
// ============================================
const H = V + 1140; // how it works y start

txt(PX, H, 'PAGE 3: HOW IT WORKS', { fontSize: 22, color: '#888888' });
txt(PX + 300, H + 5, '\u2014 "How 3 RAG methods work + hire this guy"', { fontSize: 14, color: '#aaaaaa' });

rect(PX, H + 35, PW, 1700, { fill: '#fafafa', stroke: '#cccccc', sw: 1 });

// Nav bar
rect(PX, H + 35, PW, 52, { fill: '#ffffff', stroke: '#dddddd', sw: 1, rounded: false });
txt(PX + 24, H + 50, 'LyricLens', { fontSize: 20, color: '#1e1e1e' });
txt(PX + 580, H + 54, 'Search', { fontSize: 14, color: '#888888' });
txt(PX + 660, H + 54, 'Visualizer', { fontSize: 14, color: '#888888' });
txt(PX + 770, H + 54, 'How It Works', { fontSize: 14, color: '#1e1e1e' });
divider(PX + 768, H + 82, 95, { stroke: '#1e1e1e' });

// --- Section 1: The Honest Pitch ---
const s1Y = H + 110;
txt(PX + 60, s1Y, 'When do you actually need vector search?', { fontSize: 24, color: '#1e1e1e' });
txt(PX + 60, s1Y + 35, 'Everyone\'s asking for RAG. Most don\'t need it. This app shows you when you do and when you don\'t.', { fontSize: 14, color: '#888888' });

annotationBox(AX, s1Y, 260, 55, 'SECTION 1: THE HOOK\nLeads with the honest take.\nNot "look what I built" but\n"here\'s what you need to know."');

// --- Section 2: The Three Modes (side by side comparison) ---
const s2Y = s1Y + 80;
divider(PX + 40, s2Y, 820);
txt(PX + 60, s2Y + 15, 'The same query, three different approaches', { fontSize: 18, color: '#1e1e1e' });
txt(PX + 60, s2Y + 42, 'Query: "songs about loneliness and rain from the 80s"', { fontSize: 14, color: '#888888' });

// Three columns
const colW = 250;
const colGap = 20;
const col1X = PX + 60;
const col2X = col1X + colW + colGap;
const col3X = col2X + colW + colGap;
const colTopY = s2Y + 75;

// Column 1: Keyword
card(col1X, colTopY, colW, 340);
txt(col1X + 15, colTopY + 15, 'Keyword Search', { fontSize: 16, color: '#1e1e1e' });
divider(col1X + 15, colTopY + 40, colW - 30, { stroke: '#eeeeee' });
txt(col1X + 15, colTopY + 50, 'HOW IT WORKS', { fontSize: 10, color: '#aaaaaa' });
txt(col1X + 15, colTopY + 68, 'Parses query into terms.\nFilters: decade=1980s.\nScores each song by how\nmany terms match in title,\nlyrics, and artist name.', { fontSize: 11, color: '#666666', width: colW - 30, height: 90 });
divider(col1X + 15, colTopY + 160, colW - 30, { stroke: '#eeeeee' });
txt(col1X + 15, colTopY + 170, 'RESULTS', { fontSize: 10, color: '#aaaaaa' });
txt(col1X + 15, colTopY + 188, '1. "Lonely" \u2014 Bobby Vinton\n2. "Rainy Night" \u2014 Eddy Rabbitt\n3. (few matches \u2014 most 80s\n   songs don\'t literally say\n   "loneliness" or "rain")', { fontSize: 11, color: '#555555', width: colW - 30, height: 90 });
// Verdict
rect(col1X + 10, colTopY + 295, colW - 20, 32, { fill: '#fff3e0', stroke: '#ffb74d', sw: 1, rounded: true });
txt(col1X + 20, colTopY + 301, 'Weak \u2014 needs exact word matches', { fontSize: 11, color: '#e65100' });

// Column 2: Semantic
card(col2X, colTopY, colW, 340);
txt(col2X + 15, colTopY + 15, 'Semantic Search', { fontSize: 16, color: '#1e1e1e' });
divider(col2X + 15, colTopY + 40, colW - 30, { stroke: '#eeeeee' });
txt(col2X + 15, colTopY + 50, 'HOW IT WORKS', { fontSize: 10, color: '#aaaaaa' });
txt(col2X + 15, colTopY + 68, 'Embeds entire query as\na 384-dim vector. Searches\nall 691 songs by cosine\nsimilarity. Finds meaning,\nnot words.', { fontSize: 11, color: '#666666', width: colW - 30, height: 90 });
divider(col2X + 15, colTopY + 160, colW - 30, { stroke: '#eeeeee' });
txt(col2X + 15, colTopY + 170, 'RESULTS', { fontSize: 10, color: '#aaaaaa' });
txt(col2X + 15, colTopY + 188, '1. "Against All Odds" \u2014 Collins\n2. "Total Eclipse" \u2014 Bonnie T\n3. "Everybody Hurts" \u2014 R.E.M.\n4. "Hello" \u2014 Lionel Richie\n5. "Careless Whisper" \u2014 Wham!', { fontSize: 11, color: '#555555', width: colW - 30, height: 90 });
// Verdict
rect(col2X + 10, colTopY + 295, colW - 20, 32, { fill: '#e8f5e9', stroke: '#66bb6a', sw: 1, rounded: true });
txt(col2X + 20, colTopY + 301, 'Strong \u2014 finds the vibe', { fontSize: 11, color: '#2e7d32' });

// Column 3: Hybrid
card(col3X, colTopY, colW, 340);
txt(col3X + 15, colTopY + 15, 'Hybrid Search', { fontSize: 16, color: '#1e1e1e' });
divider(col3X + 15, colTopY + 40, colW - 30, { stroke: '#eeeeee' });
txt(col3X + 15, colTopY + 50, 'HOW IT WORKS', { fontSize: 10, color: '#aaaaaa' });
txt(col3X + 15, colTopY + 68, 'Filters first: decade=1980s.\nThen embeds "loneliness and\nrain" and searches only the\nfiltered set by similarity.\nBest of both.', { fontSize: 11, color: '#666666', width: colW - 30, height: 90 });
divider(col3X + 15, colTopY + 160, colW - 30, { stroke: '#eeeeee' });
txt(col3X + 15, colTopY + 170, 'RESULTS', { fontSize: 10, color: '#aaaaaa' });
txt(col3X + 15, colTopY + 188, '1. "Against All Odds" \u2014 Collins\n2. "Total Eclipse" \u2014 Bonnie T\n3. "Hello" \u2014 Lionel Richie\n4. "Every Breath" \u2014 Police\n   (all actually from the 80s)', { fontSize: 11, color: '#555555', width: colW - 30, height: 90 });
// Verdict
rect(col3X + 10, colTopY + 295, colW - 20, 32, { fill: '#e8f5e9', stroke: '#66bb6a', sw: 1, rounded: true });
txt(col3X + 20, colTopY + 301, 'Best \u2014 precise + meaningful', { fontSize: 11, color: '#2e7d32' });

annotationBox(AX, colTopY, 260, 80, 'LIVE COMPARISON\nSame query, 3 results.\nThis IS the argument.\nUser sees the difference\nwithout needing to understand\nthe math.');

// --- Section 3: But keyword wins sometimes ---
const s3Y = colTopY + 360;
divider(PX + 40, s3Y, 820);
txt(PX + 60, s3Y + 15, 'But keyword search wins too', { fontSize: 18, color: '#1e1e1e' });

card(PX + 60, s3Y + 50, 780, 110);
txt(PX + 85, s3Y + 65, 'Query: "songs with baby in the title from the 60s"', { fontSize: 14, color: '#333333' });
divider(PX + 85, s3Y + 90, 730, { stroke: '#eeeeee' });
// Two columns
txt(PX + 85, s3Y + 100, 'Keyword: Finds all of them instantly.\nExact title match = exact results.', { fontSize: 12, color: '#2e7d32' });
txt(PX + 490, s3Y + 100, 'Semantic: Returns vaguely related\nsongs about infants and childhood.', { fontSize: 12, color: '#e65100' });

annotationBox(AX, s3Y + 40, 260, 55, 'THE HONEST PART\nShows where embeddings fail.\nThis is the maturity signal\nemployers are looking for.');

// --- Section 4: How The Retrieval Actually Works ---
const s4Y = s3Y + 180;
divider(PX + 40, s4Y, 820);
txt(PX + 60, s4Y + 15, 'How retrieval actually works', { fontSize: 18, color: '#1e1e1e' });
txt(PX + 60, s4Y + 42, 'The search is what you see. The retrieval process is what happens behind it.', { fontSize: 13, color: '#888888' });

// Pipeline diagram
const pipBaseY = s4Y + 75;

// Row 1: The search (what user does)
txt(PX + 60, pipBaseY, 'WHAT YOU DO:', { fontSize: 11, color: '#aaaaaa' });
const userSteps = ['Type a query', 'Pick a mode', 'Add filters', 'Get results'];
userSteps.forEach((label, i) => {
  const ux = PX + 160 + i * 175;
  rect(ux, pipBaseY - 8, 150, 35, { fill: '#ffffff', stroke: '#bbbbbb', sw: 1, rounded: true });
  txt(ux + 15, pipBaseY - 1, label, { fontSize: 12, color: '#333333' });
  if (i < userSteps.length - 1) {
    txt(ux + 155, pipBaseY - 3, '\u2192', { fontSize: 16, color: '#cccccc' });
  }
});

// Arrow down
ln([[PX + 450, pipBaseY + 35], [PX + 450, pipBaseY + 55]], { arrow: true, stroke: '#888888', sw: 1 });

// Row 2: The retrieval (what system does)
txt(PX + 60, pipBaseY + 65, 'WHAT HAPPENS:', { fontSize: 11, color: '#aaaaaa' });
const sysSteps = [
  { label: 'Parse query\ninto parts', desc: 'NLP' },
  { label: 'Apply metadata\nfilters', desc: 'Qdrant' },
  { label: 'Embed query\ntext', desc: 'MiniLM' },
  { label: 'Vector\nsimilarity', desc: 'Cosine' },
  { label: 'Rank &\nreturn', desc: 'Score' },
];
sysSteps.forEach((step, i) => {
  const sx = PX + 115 + i * 150;
  rect(sx, pipBaseY + 58, 125, 50, { fill: '#f5f5f5', stroke: '#cccccc', sw: 1, rounded: true });
  txt(sx + 10, pipBaseY + 64, step.label, { fontSize: 11, color: '#333333', width: 105, height: 30 });
  txt(sx + 90, pipBaseY + 88, step.desc, { fontSize: 9, color: '#aaaaaa' });
  if (i < sysSteps.length - 1) {
    txt(sx + 130, pipBaseY + 72, '\u2192', { fontSize: 14, color: '#cccccc' });
  }
});

annotationBox(AX, pipBaseY - 10, 260, 55, 'TWO LAYERS\nUser action on top.\nSystem process below.\nConnected with arrow.');

// Row 3: What changes per mode
const modeCompY = pipBaseY + 130;
txt(PX + 60, modeCompY, 'WHAT CHANGES PER MODE:', { fontSize: 11, color: '#aaaaaa' });

// Keyword row
txt(PX + 85, modeCompY + 22, 'Keyword:', { fontSize: 12, color: '#333333' });
txt(PX + 170, modeCompY + 22, 'Parse \u2192 Filter \u2192 Term match \u2192 Weighted score \u2192 Rank', { fontSize: 12, color: '#666666' });
txt(PX + 620, modeCompY + 22, '(no embedding step)', { fontSize: 11, color: '#aaaaaa' });

// Semantic row
txt(PX + 85, modeCompY + 45, 'Semantic:', { fontSize: 12, color: '#333333' });
txt(PX + 170, modeCompY + 45, 'Parse \u2192 Embed query \u2192 Vector search all \u2192 Cosine sim \u2192 Rank', { fontSize: 12, color: '#666666' });
txt(PX + 620, modeCompY + 45, '(no keyword step)', { fontSize: 11, color: '#aaaaaa' });

// Hybrid row
txt(PX + 85, modeCompY + 68, 'Hybrid:', { fontSize: 12, color: '#333333' });
txt(PX + 170, modeCompY + 68, 'Parse \u2192 Filter \u2192 Embed query \u2192 Vector search filtered \u2192 Rank', { fontSize: 12, color: '#666666' });
txt(PX + 620, modeCompY + 68, '(both steps)', { fontSize: 11, color: '#aaaaaa' });

// --- Section 5: The Numbers ---
const s5Y = modeCompY + 110;
divider(PX + 40, s5Y, 820);
txt(PX + 60, s5Y + 15, 'The numbers', { fontSize: 18, color: '#1e1e1e' });
txt(PX + 60, s5Y + 42, 'Evaluated against 50 hand-curated test queries with expected results', { fontSize: 13, color: '#888888' });

// Metric cards
const metricRow = [
  { val: '0.92', label: 'Precision@5', sub: 'Keyword (specific queries)', color: '#2e7d32' },
  { val: '0.76', label: 'Precision@5', sub: 'Semantic (conceptual queries)', color: '#1565c0' },
  { val: '0.88', label: 'Precision@5', sub: 'Hybrid (mixed queries)', color: '#6a1b9a' },
  { val: '0.71', label: 'Cluster Purity', sub: 'Genre alignment', color: '#555555' },
];
metricRow.forEach((m, i) => {
  const mx = PX + 60 + i * 210;
  card(mx, s5Y + 70, 195, 85);
  txt(mx + 15, s5Y + 82, m.val, { fontSize: 28, color: m.color });
  txt(mx + 15, s5Y + 118, m.label, { fontSize: 12, color: '#555555' });
  txt(mx + 15, s5Y + 135, m.sub, { fontSize: 10, color: '#aaaaaa' });
});

// Key finding
card(PX + 60, s5Y + 170, 780, 50);
txt(PX + 85, s5Y + 180, 'Key finding: No single mode wins everything. Keyword wins specific lookups. Semantic wins', { fontSize: 12, color: '#333333' });
txt(PX + 85, s5Y + 198, 'conceptual queries. Hybrid is the best general-purpose approach.', { fontSize: 12, color: '#333333' });

// --- Section 6: In Production ---
const s6Y = s5Y + 240;
divider(PX + 40, s6Y, 820);
txt(PX + 60, s6Y + 15, 'This pattern in the real world', { fontSize: 18, color: '#1e1e1e' });

// Mapping table
card(PX + 60, s6Y + 50, 780, 180);
txt(PX + 85, s6Y + 62, 'LyricLens', { fontSize: 13, color: '#888888' });
txt(PX + 350, s6Y + 62, '\u2192', { fontSize: 14, color: '#cccccc' });
txt(PX + 400, s6Y + 62, 'Production equivalent', { fontSize: 13, color: '#888888' });
divider(PX + 85, s6Y + 82, 730, { stroke: '#eeeeee' });

const mappings = [
  ['Song lyrics', 'Support tickets, product descriptions, documents'],
  ['Artist, decade, genre filters', 'Department, priority, date range, category'],
  ['Qdrant vector search', 'Any vector DB (Pinecone, Weaviate, pgvector)'],
  ['MiniLM embeddings', 'OpenAI ada-002, Cohere, any embedding model'],
  ['Keyword vs semantic toggle', 'The decision your team needs to make'],
];
mappings.forEach(([from, to], i) => {
  const ry = s6Y + 92 + i * 22;
  txt(PX + 85, ry, from, { fontSize: 12, color: '#333333' });
  txt(PX + 350, ry, '\u2192', { fontSize: 12, color: '#cccccc' });
  txt(PX + 400, ry, to, { fontSize: 12, color: '#666666' });
});

annotationBox(AX, s6Y + 50, 260, 55, 'THE HIRE-ME SECTION\n"I built this with music.\nYour version uses support\ntickets. Same architecture."');

// --- Section 7: CTA ---
const s7Y = s6Y + 250;
divider(PX + 40, s7Y, 820);
card(PX + 60, s7Y + 15, 780, 80);
txt(PX + 250, s7Y + 30, 'Built by Jamie \u2014 Available for hire', { fontSize: 18, color: '#1e1e1e' });
txt(PX + 200, s7Y + 58, 'Full-stack developer who tells you what you need, not just what you asked for', { fontSize: 13, color: '#888888' });

annotationBox(AX, s7Y + 15, 260, 40, 'PORTFOLIO CTA\nClean, confident, no fluff.');

// ============================================
// FLOW ANNOTATIONS (connecting the pages)
// ============================================
const flowX = PX - 80;

// Page 1 flow marker
txt(flowX, S + 50, '1', { fontSize: 36, color: '#dddddd' });
txt(flowX - 10, S + 95, 'USE IT', { fontSize: 12, color: '#aaaaaa' });

// Page 2 flow marker
txt(flowX, V + 50, '2', { fontSize: 36, color: '#dddddd' });
txt(flowX - 10, V + 95, 'SEE IT', { fontSize: 12, color: '#aaaaaa' });

// Page 3 flow marker
txt(flowX, H + 50, '3', { fontSize: 36, color: '#dddddd' });
txt(flowX - 20, H + 95, 'UNDERSTAND', { fontSize: 12, color: '#aaaaaa' });
txt(flowX - 20, H + 112, 'IT', { fontSize: 12, color: '#aaaaaa' });

// Connecting arrows between pages
ln([[flowX + 10, S + 1400], [flowX + 10, V + 35]], { arrow: true, stroke: '#dddddd', sw: 2 });
ln([[flowX + 10, V + 1080], [flowX + 10, H + 35]], { arrow: true, stroke: '#dddddd', sw: 2 });


// ============================================
// OUTPUT
// ============================================
const doc = {
  type: 'excalidraw',
  version: 2,
  source: 'lyriclens-mockup-v2',
  elements,
  appState: {
    gridSize: null,
    viewBackgroundColor: '#ffffff'
  },
  files: {}
};

import { writeFileSync } from 'fs';
const outPath = process.argv[2] || 'lyriclens-wireframes-v2.excalidraw';
writeFileSync(outPath, JSON.stringify(doc, null, 2));
console.log('Generated ' + elements.length + ' elements to ' + outPath);
