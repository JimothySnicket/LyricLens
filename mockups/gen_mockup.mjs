// Excalidraw wireframe generator for LyricLens v2
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
    roughness: 0, opacity: 100, groupIds: opts.group ? [opts.group] : [],
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
  rect(x, y, w, 38, { fill: opts.active ? '#1e1e1e' : '#f0f0f0', stroke: '#1e1e1e', sw: opts.active ? 2 : 1, rounded: true, group: g });
  txt(x + 15, y + 9, label, { fontSize: 14, color: opts.active ? '#ffffff' : '#333333', group: g });
}

function card(x, y, w, h, opts = {}) {
  rect(x, y, w, h, { fill: '#ffffff', stroke: '#cccccc', sw: 1, rounded: true, ...opts });
}


// ============================================
// PAGE LABELS
// ============================================
txt(300, 30, 'SEARCH PAGE', { fontSize: 24, color: '#888888' });
txt(1250, 30, 'VISUALIZER PAGE', { fontSize: 24, color: '#888888' });
txt(2200, 30, 'HOW IT WORKS PAGE', { fontSize: 24, color: '#888888' });


// ============================================
// SEARCH PAGE (x: 100, y: 80)
// ============================================
const SX = 100, SY = 80;
rect(SX, SY, 780, 1520, { fill: '#fafafa', stroke: '#cccccc', sw: 1 });

// Nav bar
rect(SX, SY, 780, 50, { fill: '#ffffff', stroke: '#cccccc', sw: 1, rounded: false });
txt(SX + 20, SY + 14, 'LyricLens', { fontSize: 18, color: '#1e1e1e' });
txt(SX + 480, SY + 16, 'Search', { fontSize: 13, color: '#1e1e1e' });
txt(SX + 560, SY + 16, 'Visualizer', { fontSize: 13, color: '#888888' });
txt(SX + 660, SY + 16, 'How It Works', { fontSize: 13, color: '#888888' });

// Hero / Search area
txt(SX + 200, SY + 90, 'Search 691 chart hits', { fontSize: 28, color: '#1e1e1e' });
txt(SX + 160, SY + 130, 'by meaning, not just keywords \u2014 1950 to 2019', { fontSize: 15, color: '#888888' });

// Search bar
rect(SX + 90, SY + 175, 600, 48, { fill: '#ffffff', stroke: '#aaaaaa', sw: 1, rounded: true });
txt(SX + 120, SY + 189, 'songs that feel like driving at night...', { fontSize: 15, color: '#aaaaaa' });

// Quick search suggestions
txt(SX + 90, SY + 235, 'Try:', { fontSize: 12, color: '#888888' });
badge(SX + 120, SY + 232, 'baby in title, 60s');
badge(SX + 275, SY + 232, 'sad rock');
badge(SX + 370, SY + 232, 'by Michael Jackson');
badge(SX + 530, SY + 232, 'upbeat dance');

// Mode Toggle
txt(SX + 90, SY + 280, 'Search Mode', { fontSize: 12, color: '#888888' });
button(SX + 90, SY + 298, 'Keyword', { width: 130 });
button(SX + 230, SY + 298, 'Semantic', { width: 130, active: true });
button(SX + 370, SY + 298, 'Hybrid', { width: 130 });

// Mode description
rect(SX + 90, SY + 345, 470, 32, { fill: '#f0f0f0', stroke: '#dddddd', sw: 1, rounded: true });
txt(SX + 105, SY + 351, 'Semantic: finds songs by meaning, even without matching words', { fontSize: 12, color: '#666666' });

// Filters
txt(SX + 90, SY + 395, 'Filters', { fontSize: 12, color: '#888888' });
badge(SX + 140, SY + 392, '1980s  \u00d7', { fill: '#e0eeff', stroke: '#88aacc', textColor: '#336699' });
badge(SX + 230, SY + 392, 'Rock  \u00d7', { fill: '#e0ffe0', stroke: '#88cc88', textColor: '#336633' });
badge(SX + 310, SY + 392, 'High energy  \u00d7', { fill: '#fff0e0', stroke: '#ccaa88', textColor: '#996633' });
badge(SX + 440, SY + 392, '+ Add filter', { fill: '#f5f5f5', stroke: '#cccccc', textColor: '#888888' });

// Query Interpretation
rect(SX + 90, SY + 435, 600, 50, { fill: '#f8f8f8', stroke: '#dddddd', sw: 1, rounded: true });
txt(SX + 105, SY + 440, 'Query Interpretation', { fontSize: 11, color: '#888888' });
txt(SX + 105, SY + 458, 'Decade: 1980s (filter) \u00b7 Genre: Rock (filter) \u00b7 Semantic: "driving at night"', { fontSize: 12, color: '#555555' });

// Pipeline steps
const pipY = SY + 505;
txt(SX + 90, pipY, 'Pipeline', { fontSize: 11, color: '#888888' });
const steps = ['Parse', 'Filter', 'Embed', 'Search', 'Rank'];
steps.forEach((s, i) => {
  const sx = SX + 155 + i * 105;
  rect(sx, pipY - 5, 80, 26, { fill: i <= 3 ? '#e8f5e9' : '#fff3e0', stroke: i <= 3 ? '#4caf50' : '#ff9800', sw: 1, rounded: true });
  txt(sx + 8, pipY, s, { fontSize: 12, color: i <= 3 ? '#2e7d32' : '#e65100' });
  if (i < steps.length - 1) {
    txt(sx + 85, pipY - 2, '\u2192', { fontSize: 14, color: '#aaaaaa' });
  }
});

// Results header
divider(SX + 40, SY + 545, 700);
txt(SX + 90, SY + 558, 'Results', { fontSize: 18, color: '#1e1e1e' });
txt(SX + 580, SY + 562, '12 songs found', { fontSize: 13, color: '#888888' });

// Result Card 1
card(SX + 90, SY + 595, 600, 180);
txt(SX + 110, SY + 608, '"Running Down a Dream"', { fontSize: 16, color: '#1e1e1e' });
txt(SX + 110, SY + 632, 'Tom Petty', { fontSize: 14, color: '#555555' });
txt(SX + 110, SY + 654, '1989 \u00b7 Rock \u00b7 night/time', { fontSize: 12, color: '#888888' });
rect(SX + 570, SY + 605, 100, 30, { fill: '#1e1e1e', stroke: '#1e1e1e', sw: 1, rounded: true });
txt(SX + 582, SY + 610, '0.847', { fontSize: 14, color: '#ffffff' });
txt(SX + 110, SY + 680, 'Why: lyric themes of motion, night, freedom match query meaning', { fontSize: 12, color: '#666666' });
badge(SX + 110, SY + 705, 'Rock', { fill: '#e0ffe0', stroke: '#88cc88', textColor: '#336633' });
badge(SX + 170, SY + 705, '1980s', { fill: '#e0eeff', stroke: '#88aacc', textColor: '#336699' });
badge(SX + 240, SY + 705, 'night/time', { fill: '#f0e0ff', stroke: '#aa88cc', textColor: '#663399' });
txt(SX + 110, SY + 740, 'Expand for lyrics, sentiment & audio features  \u25be', { fontSize: 11, color: '#aaaaaa' });

// Result Card 2
card(SX + 90, SY + 790, 600, 150);
txt(SX + 110, SY + 803, '"Drive"', { fontSize: 16, color: '#1e1e1e' });
txt(SX + 110, SY + 827, 'The Cars', { fontSize: 14, color: '#555555' });
txt(SX + 110, SY + 849, '1984 \u00b7 Rock \u00b7 feelings', { fontSize: 12, color: '#888888' });
rect(SX + 570, SY + 800, 100, 30, { fill: '#1e1e1e', stroke: '#1e1e1e', sw: 1, rounded: true });
txt(SX + 582, SY + 805, '0.823', { fontSize: 14, color: '#ffffff' });
txt(SX + 110, SY + 875, 'Why: themes of motion and nighttime atmosphere', { fontSize: 12, color: '#666666' });
badge(SX + 110, SY + 900, 'Rock');
badge(SX + 170, SY + 900, '1980s', { fill: '#e0eeff', stroke: '#88aacc', textColor: '#336699' });

// Result Card 3 (partial)
card(SX + 90, SY + 955, 600, 80);
txt(SX + 110, SY + 968, '"Nightshift"', { fontSize: 16, color: '#1e1e1e' });
txt(SX + 110, SY + 992, 'Commodores', { fontSize: 14, color: '#555555' });
rect(SX + 570, SY + 965, 100, 30, { fill: '#1e1e1e', stroke: '#1e1e1e', sw: 1, rounded: true });
txt(SX + 582, SY + 970, '0.791', { fontSize: 14, color: '#ffffff' });

txt(SX + 340, SY + 1055, '\u00b7 \u00b7 \u00b7', { fontSize: 20, color: '#cccccc' });

// Expanded card detail annotation
txt(SX + 90, SY + 1100, 'EXPANDED CARD DETAIL (on click)', { fontSize: 14, color: '#888888' });
rect(SX + 90, SY + 1125, 600, 280, { fill: '#ffffff', stroke: '#aaaaaa', sw: 1, dash: true, rounded: true });

txt(SX + 110, SY + 1140, 'Sentiment Scores', { fontSize: 13, color: '#555555' });
const sentiments = [['Sadness', 0.65], ['Romantic', 0.3], ['Night/Time', 0.8], ['Feelings', 0.55]];
sentiments.forEach(([label, val], i) => {
  const by = SY + 1165 + i * 24;
  txt(SX + 110, by, label, { fontSize: 11, color: '#888888' });
  rect(SX + 210, by + 2, 200, 12, { fill: '#f0f0f0', stroke: '#dddddd', sw: 1, rounded: true });
  rect(SX + 210, by + 2, 200 * val, 12, { fill: '#555555', stroke: '#555555', sw: 0, rounded: true });
  txt(SX + 420, by, Math.round(val * 100) + '%', { fontSize: 11, color: '#888888' });
});

txt(SX + 470, SY + 1140, 'Audio Features', { fontSize: 13, color: '#555555' });
const audios = [['Dance', 0.7], ['Energy', 0.85], ['Valence', 0.6], ['Acoustic', 0.15]];
audios.forEach(([label, val], i) => {
  const by = SY + 1165 + i * 24;
  txt(SX + 470, by, label, { fontSize: 11, color: '#888888' });
  txt(SX + 540, by, Math.round(val * 100) + '%', { fontSize: 12, color: '#333333' });
});

txt(SX + 110, SY + 1275, 'Lyrics', { fontSize: 13, color: '#555555' });
rect(SX + 110, SY + 1295, 560, 90, { fill: '#f8f8f8', stroke: '#dddddd', sw: 1, rounded: true });
txt(SX + 125, SY + 1305, 'It was a beautiful day, the sun beat down\nI had the radio on, I was drivin...\nTrees flew by, me and Del were singin...', { fontSize: 12, color: '#666666', width: 530, height: 60 });


// ============================================
// VISUALIZER PAGE (x: 1050, y: 80)
// ============================================
const VX = 1050, VY = 80;
rect(VX, VY, 780, 1520, { fill: '#fafafa', stroke: '#cccccc', sw: 1 });

// Nav bar
rect(VX, VY, 780, 50, { fill: '#ffffff', stroke: '#cccccc', sw: 1, rounded: false });
txt(VX + 20, VY + 14, 'LyricLens', { fontSize: 18, color: '#1e1e1e' });
txt(VX + 480, VY + 16, 'Search', { fontSize: 13, color: '#888888' });
txt(VX + 560, VY + 16, 'Visualizer', { fontSize: 13, color: '#1e1e1e' });
txt(VX + 660, VY + 16, 'How It Works', { fontSize: 13, color: '#888888' });

// Title
txt(VX + 200, VY + 80, 'Embedding Space Explorer', { fontSize: 24, color: '#1e1e1e' });
txt(VX + 130, VY + 115, 'See where songs live in the vector space \u2014 similar songs cluster together', { fontSize: 13, color: '#888888' });

// Search in viz
rect(VX + 90, VY + 150, 450, 40, { fill: '#ffffff', stroke: '#aaaaaa', sw: 1, rounded: true });
txt(VX + 110, VY + 160, 'Type a query to see where it lands...', { fontSize: 13, color: '#aaaaaa' });
button(VX + 550, VY + 151, 'Project Query', { width: 130, active: true });

// Controls
txt(VX + 90, VY + 210, 'Color by:', { fontSize: 12, color: '#888888' });
button(VX + 155, VY + 205, 'Genre', { width: 80, active: true });
button(VX + 245, VY + 205, 'Decade', { width: 80 });
button(VX + 335, VY + 205, 'Topic', { width: 80 });
button(VX + 425, VY + 205, 'Mood', { width: 80 });

// 3D Plot area
rect(VX + 40, VY + 255, 700, 550, { fill: '#ffffff', stroke: '#cccccc', sw: 2, rounded: true });
txt(VX + 270, VY + 270, '3D UMAP Scatter Plot', { fontSize: 16, color: '#aaaaaa' });

// Fake song dots (scattered)
const dots = [
  [200, 350, '#4caf50'], [250, 380, '#4caf50'], [230, 330, '#4caf50'],
  [400, 300, '#2196f3'], [430, 320, '#2196f3'], [380, 290, '#2196f3'], [420, 340, '#2196f3'],
  [300, 500, '#ff9800'], [330, 520, '#ff9800'], [280, 490, '#ff9800'],
  [500, 400, '#9c27b0'], [520, 420, '#9c27b0'], [480, 380, '#9c27b0'],
  [180, 480, '#f44336'], [200, 500, '#f44336'],
  [550, 300, '#795548'], [570, 320, '#795548'],
  [350, 420, '#607d8b'], [370, 400, '#607d8b'],
];
dots.forEach(([dx, dy, color]) => {
  rect(VX + dx - 4, VY + dy - 4, 8, 8, { fill: color, stroke: color, sw: 0, rounded: true });
});

// Query star
txt(VX + 340, VY + 440, '\u2605', { fontSize: 28, color: '#e91e63' });
txt(VX + 370, VY + 448, '\u2190 query vector', { fontSize: 12, color: '#e91e63' });

// Lines from star to nearest dots
ln([[VX + 355, VY + 455], [VX + 400, VY + 420]], { stroke: '#e91e63', sw: 1, dash: true });
ln([[VX + 355, VY + 455], [VX + 350, VY + 420]], { stroke: '#e91e63', sw: 1, dash: true });
ln([[VX + 355, VY + 455], [VX + 330, VY + 520]], { stroke: '#e91e63', sw: 1, dash: true });

// Axis labels
txt(VX + 680, VY + 770, 'UMAP-1', { fontSize: 11, color: '#aaaaaa' });
txt(VX + 55, VY + 270, 'UMAP-2', { fontSize: 11, color: '#aaaaaa' });

// Legend
rect(VX + 40, VY + 825, 700, 70, { fill: '#ffffff', stroke: '#cccccc', sw: 1, rounded: true });
txt(VX + 60, VY + 835, 'Legend:', { fontSize: 12, color: '#888888' });
const genreColors = [['Rock', '#4caf50'], ['Pop', '#2196f3'], ['Country', '#ff9800'], ['Jazz', '#9c27b0'], ['Blues', '#f44336'], ['Reggae', '#795548']];
genreColors.forEach(([label, color], i) => {
  const gx = VX + 60 + i * 110;
  rect(gx, VY + 858, 12, 12, { fill: color, stroke: color, sw: 0, rounded: true });
  txt(gx + 18, VY + 856, label, { fontSize: 12, color: '#555555' });
});

// Selected song panel
txt(VX + 90, VY + 920, 'SELECTED SONG (on hover/click)', { fontSize: 12, color: '#888888' });
card(VX + 90, VY + 942, 600, 120);
txt(VX + 110, VY + 955, '"Running Down a Dream" \u2014 Tom Petty', { fontSize: 15, color: '#1e1e1e' });
txt(VX + 110, VY + 978, '1989 \u00b7 Rock \u00b7 night/time', { fontSize: 12, color: '#888888' });
txt(VX + 110, VY + 1000, 'Nearest neighbors: "Drive" (0.92), "Nightshift" (0.88), "Night Moves" (0.85)', { fontSize: 12, color: '#555555' });
button(VX + 110, VY + 1025, 'Find Similar \u2192', { width: 140 });

// Cluster insight
rect(VX + 90, VY + 1085, 600, 80, { fill: '#f8f8f8', stroke: '#dddddd', sw: 1, rounded: true });
txt(VX + 110, VY + 1095, 'Cluster Insight', { fontSize: 14, color: '#1e1e1e' });
txt(VX + 110, VY + 1118, 'Songs cluster by emotional theme, not just genre. 60s soul and\n80s power ballads share a neighbourhood \u2014 keyword search\nwould never connect them.', { fontSize: 12, color: '#666666', width: 560, height: 50 });


// ============================================
// HOW IT WORKS PAGE (x: 2000, y: 80)
// ============================================
const HX = 2000, HY = 80;
rect(HX, HY, 780, 1520, { fill: '#fafafa', stroke: '#cccccc', sw: 1 });

// Nav bar
rect(HX, HY, 780, 50, { fill: '#ffffff', stroke: '#cccccc', sw: 1, rounded: false });
txt(HX + 20, HY + 14, 'LyricLens', { fontSize: 18, color: '#1e1e1e' });
txt(HX + 480, HY + 16, 'Search', { fontSize: 13, color: '#888888' });
txt(HX + 560, HY + 16, 'Visualizer', { fontSize: 13, color: '#888888' });
txt(HX + 660, HY + 16, 'How It Works', { fontSize: 13, color: '#1e1e1e' });

// Title
txt(HX + 140, HY + 80, 'How LyricLens Works', { fontSize: 28, color: '#1e1e1e' });
txt(HX + 90, HY + 120, "And when you actually need vector search vs when you don't", { fontSize: 14, color: '#888888' });

// Section 1: Three Modes
divider(HX + 40, HY + 160, 700);
txt(HX + 90, HY + 175, '1. Three Search Modes, One Dataset', { fontSize: 18, color: '#1e1e1e' });

const modeCards = [
  { name: 'Keyword', desc: 'Weighted term matching.\nFast, transparent.\nBest for specific lookups.', example: '"songs with baby\nin the title from the 60s"\n\u2192 exact matches' },
  { name: 'Semantic', desc: 'Vector embeddings.\nFinds meaning, not words.\nBest for conceptual queries.', example: '"songs that feel like\ndriving at night"\n\u2192 mood matches' },
  { name: 'Hybrid', desc: 'Filters + vectors.\nNarrow then rank.\nProduction RAG pattern.', example: '"80s rock about\nloneliness"\n\u2192 filtered + semantic' },
];
modeCards.forEach((m, i) => {
  const mx = HX + 90 + i * 220;
  card(mx, HY + 205, 200, 200);
  txt(mx + 60, HY + 215, m.name, { fontSize: 16, color: '#1e1e1e' });
  txt(mx + 15, HY + 245, m.desc, { fontSize: 11, color: '#666666', width: 170, height: 60 });
  rect(mx + 10, HY + 320, 180, 70, { fill: '#f0f0f0', stroke: '#dddddd', sw: 1, rounded: true });
  txt(mx + 20, HY + 328, m.example, { fontSize: 10, color: '#555555', width: 160, height: 50 });
});

// Section 2: When To Use Which
divider(HX + 40, HY + 425, 700);
txt(HX + 90, HY + 440, '2. When To Use Which', { fontSize: 18, color: '#1e1e1e' });

card(HX + 90, HY + 470, 600, 130);
txt(HX + 110, HY + 480, 'Query Type', { fontSize: 12, color: '#888888' });
txt(HX + 280, HY + 480, 'Best Mode', { fontSize: 12, color: '#888888' });
txt(HX + 430, HY + 480, 'Why', { fontSize: 12, color: '#888888' });
divider(HX + 110, HY + 498, 560, { stroke: '#eeeeee' });

const tableRows = [
  ['"baby in the title"', 'Keyword', 'Exact term match needed'],
  ['"songs about heartbreak"', 'Semantic', 'Conceptual, no exact words'],
  ['"sad 80s rock"', 'Hybrid', 'Filters + meaning'],
  ['"by Michael Jackson"', 'Keyword', 'Structured artist lookup'],
];
tableRows.forEach(([q, mode, why], i) => {
  const ry = HY + 505 + i * 22;
  txt(HX + 110, ry, q, { fontSize: 11, color: '#333333' });
  txt(HX + 280, ry, mode, { fontSize: 11, color: '#1e1e1e' });
  txt(HX + 430, ry, why, { fontSize: 11, color: '#666666' });
});

// Section 3: Pipeline
divider(HX + 40, HY + 620, 700);
txt(HX + 90, HY + 635, '3. How The Data Pipeline Works', { fontSize: 18, color: '#1e1e1e' });

const pipeSteps = [
  { label: 'Raw Lyrics\n(691 songs)', x: 0 },
  { label: 'Clean &\nMerge', x: 150 },
  { label: 'Embed\n(MiniLM)', x: 300 },
  { label: 'Index in\nQdrant', x: 450 },
];
pipeSteps.forEach((s, i) => {
  const px = HX + 130 + s.x;
  rect(px, HY + 670, 120, 55, { fill: '#ffffff', stroke: '#333333', sw: 2, rounded: true });
  txt(px + 15, HY + 678, s.label, { fontSize: 11, color: '#333333', width: 90, height: 40 });
  if (i < pipeSteps.length - 1) {
    ln([[px + 125, HY + 697], [px + 150, HY + 697]], { arrow: true, stroke: '#333333', sw: 2 });
  }
});

// UMAP branch
ln([[HX + 460, HY + 725], [HX + 460, HY + 755]], { arrow: true, stroke: '#333333', sw: 2 });
rect(HX + 400, HY + 755, 120, 40, { fill: '#ffffff', stroke: '#333333', sw: 2, rounded: true });
txt(HX + 418, HY + 763, 'UMAP \u2192 3D viz', { fontSize: 11, color: '#333333' });

// Section 4: Evaluation
divider(HX + 40, HY + 820, 700);
txt(HX + 90, HY + 835, '4. Evaluation Results', { fontSize: 18, color: '#1e1e1e' });
txt(HX + 90, HY + 865, 'Honest metrics \u2014 not just "it works," but where each mode wins and loses:', { fontSize: 12, color: '#666666' });

const metricCards = [
  { label: 'Precision@5', val: '0.76', sub: 'semantic' },
  { label: 'Precision@5', val: '0.92', sub: 'keyword (specific)' },
  { label: 'MRR', val: '0.83', sub: 'hybrid' },
  { label: 'Cluster Purity', val: '0.71', sub: 'by genre' },
];
metricCards.forEach((m, i) => {
  const mx = HX + 90 + i * 160;
  card(mx, HY + 895, 145, 70);
  txt(mx + 15, HY + 905, m.val, { fontSize: 24, color: '#1e1e1e' });
  txt(mx + 15, HY + 935, m.label, { fontSize: 11, color: '#555555' });
  txt(mx + 15, HY + 950, m.sub, { fontSize: 10, color: '#888888' });
});

// Comparison callout
rect(HX + 90, HY + 985, 600, 55, { fill: '#f8f8f8', stroke: '#dddddd', sw: 1, rounded: true });
txt(HX + 110, HY + 995, '"songs with baby in the title" \u2192 Keyword nails it. Semantic returns\nirrelevant songs about infants. The app itself makes the case for\nwhen to use which tool.', { fontSize: 11, color: '#555555', width: 560, height: 40 });

// Section 5: Production Mapping
divider(HX + 40, HY + 1060, 700);
txt(HX + 90, HY + 1075, '5. What This Maps To In Production', { fontSize: 18, color: '#1e1e1e' });

rect(HX + 90, HY + 1110, 600, 120, { fill: '#ffffff', stroke: '#cccccc', sw: 1, rounded: true });
txt(HX + 110, HY + 1120, 'This same architecture powers:', { fontSize: 13, color: '#333333' });
const prodExamples = [
  'Help desk chatbots \u2192 swap lyrics for support tickets',
  'Product search \u2192 swap lyrics for product descriptions',
  'Document retrieval \u2192 swap lyrics for knowledge base articles',
  'The filters become: department, priority, date range, category',
];
prodExamples.forEach((ex, i) => {
  txt(HX + 130, HY + 1145 + i * 22, '\u00b7 ' + ex, { fontSize: 12, color: '#666666' });
});


// ============================================
// ANNOTATIONS (outside page frames, in red)
// ============================================
// Search page annotations
txt(SX + 720, SY + 310, '\u2190 toggles\nsearch mode', { fontSize: 11, color: '#e91e63' });
ln([[SX + 710, SY + 318], [SX + 510, SY + 318]], { arrow: true, stroke: '#e91e63', sw: 1, dash: true });

txt(SX + 720, SY + 460, '\u2190 shows how\nquery was\nprocessed', { fontSize: 11, color: '#e91e63' });

txt(SX + 720, SY + 620, '\u2190 click to\nexpand with\nlyrics + stats', { fontSize: 11, color: '#e91e63' });

// Visualizer annotations
txt(VX - 60, VY + 445, 'query lands\nin the space \u2192', { fontSize: 11, color: '#e91e63' });
txt(VX + 660, VY + 450, '\u2190 lines show\nnearest\nneighbors', { fontSize: 11, color: '#e91e63' });


// ============================================
// OUTPUT
// ============================================
const doc = {
  type: 'excalidraw',
  version: 2,
  source: 'lyriclens-mockup-generator',
  elements,
  appState: {
    gridSize: null,
    viewBackgroundColor: '#ffffff'
  },
  files: {}
};

import { writeFileSync } from 'fs';
const outPath = process.argv[2] || 'lyriclens-wireframes.excalidraw';
writeFileSync(outPath, JSON.stringify(doc, null, 2));
console.log('Generated ' + elements.length + ' elements to ' + outPath);
