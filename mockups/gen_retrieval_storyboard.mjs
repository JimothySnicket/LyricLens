// Excalidraw storyboard — Animated retrieval explainer
// Shows keyframes for each scroll-driven animation sequence
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
    isDeleted: false, boundElements: null,
    updated: now, link: null, locked: false
  });
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

function card(x, y, w, h, opts = {}) {
  rect(x, y, w, h, { fill: '#ffffff', stroke: '#dddddd', sw: 1, rounded: true, ...opts });
}

function dot(x, y, size, color, opts = {}) {
  rect(x - size/2, y - size/2, size, size, { fill: color, stroke: color, sw: 0, rounded: true, ...opts });
}

function badge(x, y, label, opts = {}) {
  const g = 'g_' + idCounter;
  rect(x, y, label.length * 9 + 16, 26, { fill: opts.fill || '#e8e8e8', stroke: opts.stroke || '#aaaaaa', sw: 1, rounded: true, group: g });
  txt(x + 8, y + 4, label, { fontSize: 12, color: opts.textColor || '#444444', group: g });
}

function annotBox(x, y, w, str, opts = {}) {
  const lines = str.split('\n').length;
  const h = lines * 15 + 16;
  rect(x, y, w, h, { fill: '#fff8f0', stroke: '#e65100', sw: 1, dash: true, rounded: true });
  txt(x + 10, y + 8, str, { fontSize: 11, color: '#e65100', width: w - 20 });
}

function keyframeLabel(x, y, num, label) {
  rect(x, y, 30, 30, { fill: '#1e1e1e', stroke: '#1e1e1e', sw: 0, rounded: true });
  txt(x + 9, y + 5, '' + num, { fontSize: 16, color: '#ffffff' });
  txt(x + 40, y + 6, label, { fontSize: 14, color: '#1e1e1e' });
}

function scrollIndicator(x, y, progress) {
  // Scroll progress bar
  rect(x, y, 8, 60, { fill: '#f0f0f0', stroke: '#dddddd', sw: 1, rounded: true });
  rect(x, y, 8, 60 * progress, { fill: '#888888', stroke: '#888888', sw: 0, rounded: true });
  txt(x + 14, y + 20, Math.round(progress * 100) + '%', { fontSize: 10, color: '#aaaaaa' });
}


// ============================================
const PX = 60;
const FW = 700; // frame width
const FH = 420; // frame height
const FG = 60;  // gap between frames

// Title
txt(PX, 20, 'HOW IT WORKS \u2014 Animated Retrieval Explainer', { fontSize: 28, color: '#1e1e1e' });
txt(PX, 55, 'Storyboard: scroll-driven animations using Motion (useScroll + useTransform + AnimatePresence + layout + spring)', { fontSize: 13, color: '#888888' });
txt(PX, 78, 'Each row = one animation sequence. Frames show keyframe states as user scrolls through the section.', { fontSize: 13, color: '#888888' });
txt(PX, 100, 'Read left to right: initial state \u2192 mid-animation \u2192 final state', { fontSize: 13, color: '#d32f2f' });


// ============================================
// SEQUENCE 1: QUERY DECOMPOSITION
// ============================================
const S1Y = 150;
txt(PX, S1Y, 'SEQUENCE 1: QUERY DECOMPOSITION', { fontSize: 20, color: '#1e1e1e' });
txt(PX, S1Y + 28, 'The query enters as plain text. As user scrolls, words classify and physically separate into buckets.', { fontSize: 12, color: '#888888' });
txt(PX, S1Y + 46, 'Motion: spring physics on word movement, stagger on classification highlights, layout animation on bucket fill', { fontSize: 11, color: '#e65100' });

// Frame 1A: Initial state
const f1ax = PX;
const f1ay = S1Y + 75;
rect(f1ax, f1ay, FW, 320, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f1ax + 15, f1ay + 10, 'A', 'Query enters (scroll 0%)');
scrollIndicator(f1ax + FW - 40, f1ay + 10, 0);

// The query text - all one color, unclassified
rect(f1ax + 60, f1ay + 60, 580, 50, { fill: '#ffffff', stroke: '#dddddd', sw: 1, rounded: true });
txt(f1ax + 80, f1ay + 72, 'songs about loneliness and rain from the 80s', { fontSize: 18, color: '#333333' });

// Empty buckets below
rect(f1ax + 60, f1ay + 150, 260, 100, { fill: '#ffffff', stroke: '#dddddd', sw: 1, dash: true, rounded: true });
txt(f1ax + 130, f1ay + 160, 'FILTERS', { fontSize: 14, color: '#cccccc' });
txt(f1ax + 100, f1ay + 185, '(empty \u2014 waiting)', { fontSize: 12, color: '#dddddd' });

rect(f1ax + 380, f1ay + 150, 260, 100, { fill: '#ffffff', stroke: '#dddddd', sw: 1, dash: true, rounded: true });
txt(f1ax + 445, f1ay + 160, 'MEANING', { fontSize: 14, color: '#cccccc' });
txt(f1ax + 420, f1ay + 185, '(empty \u2014 waiting)', { fontSize: 12, color: '#dddddd' });

txt(f1ax + 60, f1ay + 270, 'User sees their query. Nothing has happened yet.\nThe two empty buckets signal that something is about to.', { fontSize: 11, color: '#888888' });

// Frame 1B: Mid-animation — words classifying
const f1bx = PX + FW + FG;
const f1by = S1Y + 75;
rect(f1bx, f1by, FW, 320, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f1bx + 15, f1by + 10, 'B', 'Words classify (scroll 40%)');
scrollIndicator(f1bx + FW - 40, f1by + 10, 0.4);

// Query with words highlighted differently
rect(f1bx + 60, f1by + 60, 580, 50, { fill: '#ffffff', stroke: '#dddddd', sw: 1, rounded: true });
// "songs about" - stop words, fading
txt(f1bx + 80, f1by + 72, 'songs about', { fontSize: 18, color: '#cccccc' });
// "loneliness and rain" - semantic, blue highlight
rect(f1bx + 230, f1by + 67, 260, 36, { fill: '#e3f2fd', stroke: '#90caf9', sw: 1, rounded: true });
txt(f1bx + 240, f1by + 72, 'loneliness and rain', { fontSize: 18, color: '#1565c0' });
// "from the" - stop words, fading
txt(f1bx + 500, f1by + 72, 'from the', { fontSize: 18, color: '#cccccc' });
// "80s" - filter, orange highlight
rect(f1bx + 575, f1by + 67, 50, 36, { fill: '#fff3e0', stroke: '#ffcc80', sw: 1, rounded: true });
txt(f1bx + 583, f1by + 72, '80s', { fontSize: 18, color: '#e65100' });

// Arrows showing movement direction
ln([[f1bx + 600, f1by + 107], [f1bx + 190, f1by + 150]], { arrow: true, stroke: '#e65100', sw: 2, dash: true });
ln([[f1bx + 360, f1by + 107], [f1bx + 510, f1by + 150]], { arrow: true, stroke: '#1565c0', sw: 2, dash: true });

// Buckets starting to fill
rect(f1bx + 60, f1by + 150, 260, 100, { fill: '#fff8f0', stroke: '#ffcc80', sw: 2, rounded: true });
txt(f1bx + 130, f1by + 160, 'FILTERS', { fontSize: 14, color: '#e65100' });
// 80s arriving with spring bounce
txt(f1bx + 105, f1by + 188, 'decade = 1980s', { fontSize: 14, color: '#e65100' });
txt(f1bx + 110, f1by + 210, '\u2190 "80s" parsed as decade', { fontSize: 10, color: '#aaaaaa' });

rect(f1bx + 380, f1by + 150, 260, 100, { fill: '#f0f7ff', stroke: '#90caf9', sw: 2, rounded: true });
txt(f1bx + 445, f1by + 160, 'MEANING', { fontSize: 14, color: '#1565c0' });

txt(f1bx + 60, f1by + 270, 'Words highlight in sequence (stagger: 150ms).\nColor = classification. Spring physics on the movement\ninto buckets. Stop words fade out.', { fontSize: 11, color: '#888888' });

// Frame 1C: Final state
const f1cx = PX + (FW + FG) * 2;
const f1cy = S1Y + 75;
rect(f1cx, f1cy, FW, 320, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f1cx + 15, f1cy + 10, 'C', 'Sorted into buckets (scroll 60%)');
scrollIndicator(f1cx + FW - 40, f1cy + 10, 0.6);

// Query text is now faded/consumed
rect(f1cx + 60, f1cy + 60, 580, 35, { fill: '#fafafa', stroke: '#eeeeee', sw: 1, rounded: true });
txt(f1cx + 200, f1cy + 67, 'Query parsed \u2714', { fontSize: 14, color: '#aaaaaa' });

// Buckets full
rect(f1cx + 60, f1cy + 115, 260, 130, { fill: '#fff8f0', stroke: '#e65100', sw: 2, rounded: true });
txt(f1cx + 130, f1cy + 122, 'FILTERS', { fontSize: 14, color: '#e65100' });
divider(f1cx + 75, f1cy + 142, 230, { stroke: '#ffcc80' });
txt(f1cx + 80, f1cy + 152, 'decade = 1980s', { fontSize: 14, color: '#e65100' });
txt(f1cx + 80, f1cy + 175, 'These become Qdrant payload\nfilters \u2014 hard constraints that\nnarrow the pool before search.', { fontSize: 10, color: '#888888', width: 220, height: 40 });

rect(f1cx + 380, f1cy + 115, 260, 130, { fill: '#f0f7ff', stroke: '#1565c0', sw: 2, rounded: true });
txt(f1cx + 445, f1cy + 122, 'MEANING', { fontSize: 14, color: '#1565c0' });
divider(f1cx + 395, f1cy + 142, 230, { stroke: '#90caf9' });
txt(f1cx + 400, f1cy + 152, '"loneliness and rain"', { fontSize: 14, color: '#1565c0' });
txt(f1cx + 400, f1cy + 175, 'This text gets embedded into a\n384-dimensional vector \u2014 a\nnumerical fingerprint of meaning.', { fontSize: 10, color: '#888888', width: 220, height: 40 });

txt(f1cx + 60, f1cy + 265, 'Clean separation. The user sees their query broken\ndown into what the system can act on. Each bucket\nfeeds the next animation sequence.', { fontSize: 11, color: '#888888' });


// ============================================
// SEQUENCE 2: THE FUNNEL
// ============================================
const S2Y = S1Y + 430;
txt(PX, S2Y, 'SEQUENCE 2: THE FUNNEL', { fontSize: 20, color: '#1e1e1e' });
txt(PX, S2Y + 28, 'A field of dots (each = a song). Filters apply visually \u2014 non-matching dots fade and shrink. Pool narrows.', { fontSize: 12, color: '#888888' });
txt(PX, S2Y + 46, 'Motion: AnimatePresence for exit, layout for rearrangement, spring on remaining dots settling, animated counter', { fontSize: 11, color: '#e65100' });

// Frame 2A: All songs visible
const f2ax = PX;
const f2ay = S2Y + 75;
rect(f2ax, f2ay, FW, 340, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f2ax + 15, f2ay + 10, 'A', 'All 691 songs (scroll 60%)');
scrollIndicator(f2ax + FW - 40, f2ay + 10, 0.6);

// Counter
txt(f2ax + 280, f2ay + 50, '691', { fontSize: 40, color: '#1e1e1e' });
txt(f2ax + 270, f2ay + 95, 'songs in pool', { fontSize: 13, color: '#888888' });

// Dense field of dots — all colors mixed
const dotField2a = [];
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 20; col++) {
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#795548'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const dx = f2ax + 80 + col * 28 + (Math.random() - 0.5) * 8;
    const dy = f2ay + 130 + row * 22 + (Math.random() - 0.5) * 6;
    dot(dx, dy, 8, c);
  }
}

// Filter badge (inactive)
rect(f2ax + 200, f2ay + 310, 300, 28, { fill: '#f5f5f5', stroke: '#dddddd', sw: 1, rounded: true });
txt(f2ax + 220, f2ay + 315, 'Filter: decade = 1980s  (not yet applied)', { fontSize: 12, color: '#aaaaaa' });

// Frame 2B: Filter applying — dots fading
const f2bx = PX + FW + FG;
const f2by = S2Y + 75;
rect(f2bx, f2by, FW, 340, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f2bx + 15, f2by + 10, 'B', 'Filter applies (scroll 70%)');
scrollIndicator(f2bx + FW - 40, f2by + 10, 0.7);

// Counter animating down
txt(f2bx + 280, f2by + 50, '347', { fontSize: 40, color: '#888888' });
txt(f2bx + 215, f2by + 95, 'songs remaining (counting down...)', { fontSize: 13, color: '#888888' });

// Sparse field — many dots faded/gone, some remaining
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 20; col++) {
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#795548'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const dx = f2bx + 80 + col * 28 + (Math.random() - 0.5) * 8;
    const dy = f2by + 130 + row * 22 + (Math.random() - 0.5) * 6;
    const keep = Math.random() < 0.35;
    if (keep) {
      dot(dx, dy, 8, c);
    } else {
      dot(dx, dy, 5, c, { opacity: 15 }); // fading out
    }
  }
}

// Filter badge (active, glowing)
rect(f2bx + 200, f2by + 310, 300, 28, { fill: '#fff3e0', stroke: '#e65100', sw: 2, rounded: true });
txt(f2bx + 220, f2by + 315, 'Filter: decade = 1980s  (applying...)', { fontSize: 12, color: '#e65100' });

// Frame 2C: Filtered — remaining dots settle
const f2cx = PX + (FW + FG) * 2;
const f2cy = S2Y + 75;
rect(f2cx, f2cy, FW, 340, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f2cx + 15, f2cy + 10, 'C', '142 remain, settled (scroll 80%)');
scrollIndicator(f2cx + FW - 40, f2cy + 10, 0.8);

// Counter final
txt(f2cx + 280, f2cy + 50, '142', { fontSize: 40, color: '#1e1e1e' });
txt(f2cx + 250, f2cy + 95, 'songs from the 1980s', { fontSize: 13, color: '#888888' });

// Tight cluster of remaining dots — rearranged, centered
for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 12; col++) {
    if (row * 12 + col >= 40) break;
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const dx = f2cx + 180 + col * 28 + (Math.random() - 0.5) * 6;
    const dy = f2cy + 140 + row * 28 + (Math.random() - 0.5) * 6;
    dot(dx, dy, 9, c);
  }
}

// Visual note
txt(f2cx + 100, f2cy + 300, 'Remaining dots physically rearrange (layout animation)\ninto a tighter cluster. Feels like a pool shrinking.\nCounter lands with a spring bounce.', { fontSize: 11, color: '#888888', width: 500 });


// ============================================
// SEQUENCE 3: THE EMBEDDING MOMENT
// ============================================
const S3Y = S2Y + 455;
txt(PX, S3Y, 'SEQUENCE 3: THE EMBEDDING MOMENT', { fontSize: 20, color: '#1e1e1e' });
txt(PX, S3Y + 28, 'The semantic query text transforms into a vector and drops into the song space. The "aha" moment.', { fontSize: 12, color: '#888888' });
txt(PX, S3Y + 46, 'Motion: morphing text\u2192point transition, spring drop into space, stagger on proximity lines drawing, counter on scores', { fontSize: 11, color: '#e65100' });

// Frame 3A: Text query floating above song space
const f3ax = PX;
const f3ay = S3Y + 75;
rect(f3ax, f3ay, FW, 380, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f3ax + 15, f3ay + 10, 'A', 'Query text above space (scroll 80%)');
scrollIndicator(f3ax + FW - 40, f3ay + 10, 0.8);

// Query text bubble
rect(f3ax + 200, f3ay + 50, 300, 40, { fill: '#e3f2fd', stroke: '#90caf9', sw: 2, rounded: true });
txt(f3ax + 225, f3ay + 58, '"loneliness and rain"', { fontSize: 16, color: '#1565c0' });

// Arrow indicating transformation about to happen
txt(f3ax + 310, f3ay + 100, '\u2193', { fontSize: 24, color: '#1565c0' });
txt(f3ax + 340, f3ay + 100, 'about to embed...', { fontSize: 11, color: '#aaaaaa' });

// Song space (the 142 filtered dots from before)
rect(f3ax + 60, f3ay + 130, 580, 200, { fill: '#ffffff', stroke: '#eeeeee', sw: 1, rounded: true });
txt(f3ax + 280, f3ay + 138, '142 songs', { fontSize: 11, color: '#cccccc' });

// Scattered dots (genre colored)
const s3dots = [
  [150, 180], [200, 220], [170, 250], [230, 190],
  [350, 200], [380, 230], [340, 260], [400, 210], [370, 180],
  [500, 190], [520, 220], [480, 250],
  [250, 280], [300, 300], [280, 260],
  [450, 280], [430, 310], [470, 260],
  [180, 310], [550, 300], [420, 170],
];
s3dots.forEach(([dx, dy]) => {
  const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0'];
  dot(f3ax + dx, f3ay + dy, 8, colors[Math.floor(Math.random() * colors.length)]);
});

txt(f3ax + 60, f3ay + 345, 'The query sits above the song space.\nUser can see the pool of remaining songs.\nThe text is about to become a point.', { fontSize: 11, color: '#888888' });

// Frame 3B: Text morphs into a point, dropping in
const f3bx = PX + FW + FG;
const f3by = S3Y + 75;
rect(f3bx, f3by, FW, 380, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f3bx + 15, f3by + 10, 'B', 'Text becomes vector (scroll 88%)');
scrollIndicator(f3bx + FW - 40, f3by + 10, 0.88);

// Morphing text → shrinking, becoming a point
// Show intermediate: text is small, glowing, turning into a star
rect(f3bx + 280, f3by + 60, 140, 30, { fill: '#e3f2fd', stroke: '#1565c0', sw: 2, rounded: true, opacity: 60 });
txt(f3bx + 290, f3by + 65, '"loneliness..."', { fontSize: 13, color: '#1565c0', opacity: 60 });

// The point forming
txt(f3bx + 342, f3by + 100, '\u2605', { fontSize: 20, color: '#d32f2f' });
ln([[f3bx + 350, f3by + 115], [f3bx + 350, f3by + 240]], { arrow: true, stroke: '#d32f2f', sw: 2, dash: true });
txt(f3bx + 365, f3by + 160, '384-dim vector', { fontSize: 11, color: '#d32f2f' });
txt(f3bx + 365, f3by + 176, 'dropping into', { fontSize: 11, color: '#d32f2f' });
txt(f3bx + 365, f3by + 192, 'the song space', { fontSize: 11, color: '#d32f2f' });

// Song space
rect(f3bx + 60, f3by + 130, 580, 200, { fill: '#ffffff', stroke: '#eeeeee', sw: 1, rounded: true });
s3dots.forEach(([dx, dy]) => {
  const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0'];
  dot(f3bx + dx, f3by + dy, 8, colors[Math.floor(Math.random() * colors.length)]);
});

// Annotation about the morph
txt(f3bx + 60, f3by + 345, 'Key animation: text shrinks, blurs, and resolves\ninto a single glowing point (the query vector).\nSpring physics on the drop. This IS the demo of\nwhat "embedding" means \u2014 text becomes position.', { fontSize: 11, color: '#888888', width: 550 });

// Frame 3C: Query landed, lines drawing to nearest songs
const f3cx = PX + (FW + FG) * 2;
const f3cy = S3Y + 75;
rect(f3cx, f3cy, FW, 380, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f3cx + 15, f3cy + 10, 'C', 'Nearest neighbors found (scroll 95%)');
scrollIndicator(f3cx + FW - 40, f3cy + 10, 0.95);

// Song space with query point landed
rect(f3cx + 60, f3cy + 50, 580, 230, { fill: '#ffffff', stroke: '#eeeeee', sw: 1, rounded: true });

// Same dots but some are now highlighted (the matches)
s3dots.forEach(([dx, dy], i) => {
  const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0'];
  const isMatch = i === 4 || i === 5 || i === 7 || i === 9 || i === 16;
  if (isMatch) {
    // Matched dots are larger, brighter
    dot(f3cx + dx, f3cy + dy - 80, 12, '#d32f2f');
  } else {
    dot(f3cx + dx, f3cy + dy - 80, 7, colors[Math.floor(Math.random() * colors.length)], { opacity: 40 });
  }
});

// Query star landed
txt(f3cx + 322, f3cy + 165, '\u2605', { fontSize: 24, color: '#d32f2f' });

// Proximity lines (stagger animation — draw one by one)
ln([[f3cx + 338, f3cy + 175], [f3cx + 350, f3cy + 120]], { stroke: '#d32f2f', sw: 1, dash: true });
ln([[f3cx + 338, f3cy + 175], [f3cx + 380, f3cy + 150]], { stroke: '#d32f2f', sw: 1, dash: true });
ln([[f3cx + 338, f3cy + 175], [f3cx + 400, f3cy + 130]], { stroke: '#d32f2f', sw: 1, dash: true });
ln([[f3cx + 338, f3cy + 175], [f3cx + 500, f3cy + 110]], { stroke: '#d32f2f', sw: 1, dash: true });
ln([[f3cx + 338, f3cy + 175], [f3cx + 430, f3cy + 230]], { stroke: '#d32f2f', sw: 1, dash: true });

// Results emerging below
txt(f3cx + 60, f3cy + 290, 'Nearest songs:', { fontSize: 13, color: '#555555' });

const matchResults = [
  ['"Against All Odds"', 'Phil Collins', '0.89'],
  ['"Total Eclipse of the Heart"', 'Bonnie Tyler', '0.85'],
  ['"Hello"', 'Lionel Richie', '0.82'],
];
matchResults.forEach(([title, artist, score], i) => {
  const ry = f3cy + 310 + i * 22;
  dot(f3cx + 70, ry + 6, 8, '#d32f2f');
  txt(f3cx + 85, ry, title + ' \u2014 ' + artist, { fontSize: 12, color: '#333333' });
  txt(f3cx + 480, ry, score, { fontSize: 12, color: '#d32f2f' });
});


// ============================================
// SEQUENCE 4: MODE COMPARISON
// ============================================
const S4Y = S3Y + 500;
txt(PX, S4Y, 'SEQUENCE 4: MODE COMPARISON', { fontSize: 20, color: '#1e1e1e' });
txt(PX, S4Y + 28, 'Three pipeline tracks animate side by side. Each mode lights up different steps. Visual proof of what changes.', { fontSize: 12, color: '#888888' });
txt(PX, S4Y + 46, 'Motion: stagger across three tracks, sequential step highlighting, AnimatePresence on results sliding in', { fontSize: 11, color: '#e65100' });

// Frame 4A: Three tracks, all dim
const f4ax = PX;
const f4ay = S4Y + 75;
rect(f4ax, f4ay, FW, 400, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f4ax + 15, f4ay + 10, 'A', 'Three tracks ready (scroll start)');

// Three track labels
const trackW = 190;
const trackNames = ['KEYWORD', 'SEMANTIC', 'HYBRID'];
const trackSteps = [
  ['Parse', 'Filter', 'Term\nMatch', 'Score'],
  ['Parse', 'Embed', 'Vector\nSearch', 'Rank'],
  ['Parse', 'Filter', 'Embed', 'Vector\nSearch', 'Rank'],
];

trackNames.forEach((name, ti) => {
  const tx = f4ax + 40 + ti * 225;
  txt(tx + 50, f4ay + 50, name, { fontSize: 14, color: '#aaaaaa' });

  trackSteps[ti].forEach((step, si) => {
    const sy = f4ay + 80 + si * 55;
    rect(tx, sy, trackW, 38, { fill: '#f5f5f5', stroke: '#dddddd', sw: 1, rounded: true });
    txt(tx + 15, sy + 6, step, { fontSize: 11, color: '#aaaaaa', width: 160, height: 30 });
    if (si < trackSteps[ti].length - 1) {
      txt(tx + 90, sy + 40, '\u2193', { fontSize: 12, color: '#dddddd' });
    }
  });
});

txt(f4ax + 40, f4ay + 370, 'All three tracks visible but dim. User sees the full picture\nbefore anything animates.', { fontSize: 11, color: '#888888' });

// Frame 4B: Tracks lighting up
const f4bx = PX + FW + FG;
const f4by = S4Y + 75;
rect(f4bx, f4by, FW, 400, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f4bx + 15, f4by + 10, 'B', 'Tracks animate (scroll mid)');

const trackColors = ['#e65100', '#1565c0', '#6a1b9a'];
const trackActiveFills = ['#fff3e0', '#e3f2fd', '#f3e5f5'];
const trackActiveSteps = [
  [true, true, true, true],       // keyword: all steps
  [true, false, true, true],      // semantic: skip filter (index 1)
  [true, true, true, true, true], // hybrid: all steps
];

trackNames.forEach((name, ti) => {
  const tx = f4bx + 40 + ti * 225;
  txt(tx + 50, f4by + 50, name, { fontSize: 14, color: trackColors[ti] });

  trackSteps[ti].forEach((step, si) => {
    const sy = f4by + 80 + si * 55;
    const active = trackActiveSteps[ti][si];
    rect(tx, sy, trackW, 38, {
      fill: active ? trackActiveFills[ti] : '#f5f5f5',
      stroke: active ? trackColors[ti] : '#eeeeee',
      sw: active ? 2 : 1,
      rounded: true
    });
    txt(tx + 15, sy + 6, step, {
      fontSize: 11,
      color: active ? trackColors[ti] : '#cccccc',
      width: 160, height: 30
    });
    if (si < trackSteps[ti].length - 1) {
      txt(tx + 90, sy + 40, '\u2193', { fontSize: 12, color: active ? trackColors[ti] : '#eeeeee' });
    }
  });
});

// Annotation: what's different
txt(f4bx + 40, f4by + 370, 'Steps light up sequentially (stagger 200ms between tracks).\nDim steps = skipped in that mode. The visual diff is\nimmediate \u2014 you SEE what each mode does differently.', { fontSize: 11, color: '#888888' });

// Frame 4C: Results arrive at bottom of each track
const f4cx = PX + (FW + FG) * 2;
const f4cy = S4Y + 75;
rect(f4cx, f4cy, FW, 400, { fill: '#fafafa', stroke: '#cccccc', sw: 1, rounded: true });
keyframeLabel(f4cx + 15, f4cy + 10, 'C', 'Results slide in (scroll end)');

const trackResults = [
  { label: 'KEYWORD', color: '#e65100', songs: ['"Lonely" \u2014 weak match', '"Rainy Night" \u2014 ok match'], verdict: 'Sparse results', vColor: '#e65100' },
  { label: 'SEMANTIC', color: '#1565c0', songs: ['"Against All Odds" \u2014 0.89', '"Total Eclipse" \u2014 0.85'], verdict: 'Finds the vibe', vColor: '#2e7d32' },
  { label: 'HYBRID', color: '#6a1b9a', songs: ['"Against All Odds" \u2014 0.89', '"Every Breath" \u2014 0.84'], verdict: 'Best of both', vColor: '#2e7d32' },
];

trackResults.forEach((tr, ti) => {
  const tx = f4cx + 40 + ti * 225;
  txt(tx + 50, f4cy + 50, tr.label, { fontSize: 14, color: tr.color });

  // Compressed pipeline (just showing it's done)
  rect(tx, f4cy + 75, trackW, 25, { fill: '#f5f5f5', stroke: '#dddddd', sw: 1, rounded: true });
  txt(tx + 30, f4cy + 79, 'pipeline complete \u2714', { fontSize: 10, color: '#aaaaaa' });

  // Results sliding in (AnimatePresence)
  tr.songs.forEach((song, si) => {
    const sy = f4cy + 115 + si * 35;
    rect(tx, sy, trackW, 28, { fill: '#ffffff', stroke: tr.color, sw: 1, rounded: true });
    txt(tx + 10, sy + 6, song, { fontSize: 10, color: '#333333', width: 170 });
  });

  // Verdict badge
  rect(tx + 20, f4cy + 200, trackW - 40, 28, {
    fill: tr.vColor === '#2e7d32' ? '#e8f5e9' : '#fff3e0',
    stroke: tr.vColor,
    sw: 1,
    rounded: true
  });
  txt(tx + 35, f4cy + 206, tr.verdict, { fontSize: 11, color: tr.vColor });
});

// Summary
rect(f4cx + 40, f4cy + 250, 620, 50, { fill: '#f8f8f8', stroke: '#dddddd', sw: 1, rounded: true });
txt(f4cx + 60, f4cy + 258, 'The punchline: No single mode wins everything.\nKeyword wins for specific lookups. Semantic wins conceptual. Hybrid is the general-purpose answer.', { fontSize: 12, color: '#333333', width: 580 });

txt(f4cx + 40, f4cy + 320, 'Results slide in from bottom (AnimatePresence, spring).\nVerdict badges fade in last. The three columns next to\neach other make the comparison visceral, not theoretical.', { fontSize: 11, color: '#888888' });


// ============================================
// IMPLEMENTATION NOTES
// ============================================
const NY = S4Y + 520;
txt(PX, NY, 'IMPLEMENTATION NOTES', { fontSize: 20, color: '#1e1e1e' });
divider(PX, NY + 28, 2100);

const noteCol1 = PX;
const noteCol2 = PX + 750;
const noteCol3 = PX + 1500;

// Column 1: Motion APIs
card(noteCol1, NY + 40, 680, 200);
txt(noteCol1 + 15, NY + 52, 'Motion APIs Used', { fontSize: 15, color: '#1e1e1e' });
divider(noteCol1 + 15, NY + 74, 650, { stroke: '#eeeeee' });
const apis = [
  ['useScroll + useTransform', 'Scroll progress drives all animations. Each sequence triggers at a scroll range.'],
  ['spring physics', 'Word movement into buckets, dot settling, query drop, result slide-in.'],
  ['AnimatePresence', 'Dots exiting during filter, results entering, text morphing to point.'],
  ['layout', 'Remaining dots rearranging after filter. Smooth positional transitions.'],
  ['stagger', 'Word classification sequence, proximity lines drawing, track comparison.'],
  ['animate (number)', 'Counter ticking down from 691 to 142. Score values appearing.'],
];
apis.forEach(([api, desc], i) => {
  const ay = NY + 82 + i * 22;
  txt(noteCol1 + 20, ay, api, { fontSize: 11, color: '#1e1e1e' });
  txt(noteCol1 + 220, ay, desc, { fontSize: 11, color: '#666666' });
});

// Column 2: Scroll mapping
card(noteCol2, NY + 40, 680, 200);
txt(noteCol2 + 15, NY + 52, 'Scroll Trigger Map', { fontSize: 15, color: '#1e1e1e' });
divider(noteCol2 + 15, NY + 74, 650, { stroke: '#eeeeee' });
const scrollMap = [
  ['0% \u2013 20%', 'Section intro text fades in'],
  ['20% \u2013 60%', 'Seq 1: Query decomposition (words classify, buckets fill)'],
  ['60% \u2013 80%', 'Seq 2: The funnel (dots filter, pool narrows, counter ticks)'],
  ['80% \u2013 95%', 'Seq 3: Embedding moment (text morphs, drops, lines draw)'],
  ['95% \u2013 100%', 'Seq 4: Mode comparison (tracks light up, results arrive)'],
];
scrollMap.forEach(([range, desc], i) => {
  const sy = NY + 82 + i * 22;
  txt(noteCol2 + 20, sy, range, { fontSize: 11, color: '#1e1e1e' });
  txt(noteCol2 + 140, sy, desc, { fontSize: 11, color: '#666666' });
});
txt(noteCol2 + 20, NY + 200, 'Sticky container: animation viewport stays fixed while content scrolls behind it.', { fontSize: 11, color: '#aaaaaa' });

// Output
const doc = {
  type: 'excalidraw',
  version: 2,
  source: 'lyriclens-retrieval-storyboard',
  elements,
  appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
  files: {}
};

import { writeFileSync } from 'fs';
const outPath = process.argv[2] || 'retrieval-storyboard.excalidraw';
writeFileSync(outPath, JSON.stringify(doc, null, 2));
console.log('Generated ' + elements.length + ' elements to ' + outPath);
