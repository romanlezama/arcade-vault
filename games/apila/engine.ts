// Motor de APILA (SPEC 06).
// Port a TypeScript de references/started-games/03-tetris/game.js.
// Sin React ni globales: todo el estado vive en el closure de createApilaEngine,
// y este módulo no toca window/document al importarse.
// ── Lienzo y distribución (800×600, tablero de 300×600 centrado) ──────────────
const W = 800;
const H = 600;
const BOARD_X = 250; // panel izquierdo: 0–250 · tablero: 250–550 · panel derecho: 550–800
const PANEL_W = 250;
const RIGHT_X = BOARD_X + 300;
// ── Constantes (mismos valores que la referencia) ─────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
type Shape = number[][];
const PIECES: (Shape | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
const LINE_SCORES = [0, 100, 300, 500, 800];
const KICKS = [0, -1, 1, -2, 2];
const START_DROP_INTERVAL = 1000; // ms
const MIN_DROP_INTERVAL = 100; // ms
const DROP_STEP = 90; // ms menos por nivel
const GHOST_ALPHA = 0.2;
const HIGHLIGHT = "rgba(255,255,255,0.12)";
const MAX_DT = 50; // ms: tras un parón la pieza no cae en ráfaga
// ── Paleta ────────────────────────────────────────────────────────────────────
// Paleta neón del vault: mismos valores que los tokens de app/globals.css
// (el motor no lee getComputedStyle). Un color por tipo de pieza; la plata
// queda reservada a la tuerca.
const PALETTE = {
  pieces: [
    "",
    "#00f5ff", // I · --cyan
    "#f5ff00", // O · --yellow
    "#ff006e", // T · --magenta
    "#00ff88", // S · --green
    "#d97a3a", // Z · --bronze
    "#e6e9ff", // J · --ink
    "#ffcf3a", // L · --gold
    "#c7d0e0", // N (tuerca) · --silver
  ],
  grid: "#4a4f70", // --ink-faint
  boardBg: "#0a0a0f", // --bg
  boardBorder: "rgba(0, 245, 255, 0.18)", // --line
  label: "#8a8fb5", // --ink-dim
  value: "#f5ff00", // --yellow
  overlayText: "#e6e9ff", // --ink
  gameOver: "#ff006e", // --magenta
};
const GLOW_BLUR = 10; // shadowBlur de las piezas fijas, la actual y NEXT
const CONTROLS: [string, string][] = [
  ["← →", "MOVER"],
  ["↑ X", "ROTAR"],
  ["↓", "BAJAR"],
  ["ESPACIO", "CAÍDA"],
  ["P ESC", "PAUSA"],
];
// ── Lógica pura de piezas y tablero ──────────────────────────────────────────
type Piece = { type: number; shape: Shape; x: number; y: number };
type Board = number[][];
function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}
function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = (PIECES[type] as Shape).map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
function collide(board: Board, shape: Shape, ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
/** Elimina las filas completas de abajo arriba y devuelve cuántas había. */
function clearFullRows(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}
function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
const fmt = (n: number) => n.toLocaleString("es-ES");

/** Teclas cuyo comportamiento por defecto (scroll, etc.) se bloquea. */
const PREVENT_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
  "KeyP",
  "Escape",
]);

/** Eventos de campos de texto (p. ej. las iniciales del modal) no son del juego. */
function isTextTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
// ── Motor ─────────────────────────────────────────────────────────────────────
export type ApilaStatus = "ready" | "playing" | "gameover";
export type ApilaSnapshot = {
  status: ApilaStatus;
  paused: boolean;
  score: number;
  lives: number; // siempre 0: el juego no tiene vidas y el HUD muestra "—"
  level: number; // floor(lines / 10) + 1
};
export type ApilaEngine = {
  pause(): void; // solo tiene efecto en playing
  resume(): void;
  reset(): void; // vuelve a ready: tablero vacío, score 0, lines 0, nivel 1
  destroy(): void; // cancela el rAF y retira los listeners de window/document
};
export function createApilaEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: ApilaSnapshot) => void,
): ApilaEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("APILA: canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Estado del juego ────────────────────────────────────────────────────────
  let board: Board = createBoard();
  let next: Piece = randomPiece();
  let current: Piece = next;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = START_DROP_INTERVAL;
  let status: ApilaStatus = "ready";
  let paused = false;
  let dropAccum = 0;
  // ── Mecánica (misma lógica que la referencia) ───────────────────────────────
  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }
  function moveX(dir: -1 | 1) {
    if (!collide(board, current.shape, current.x + dir, current.y))
      current.x += dir;
  }
  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }
  function clearLines() {
    const cleared = clearFullRows(board);
    if (!cleared) return;
    lines += cleared;
    // El multiplicador es el nivel de antes de sumar las líneas nuevas.
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(
      MIN_DROP_INTERVAL,
      START_DROP_INTERVAL - (level - 1) * DROP_STEP,
    );
  }
  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y))
      status = "gameover";
  }
  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }
  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }
  function hardDrop() {
    const gy = ghostY(board, current);
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }
  /** Paso automático de caída: baja una fila o bloquea la pieza. */
  function stepDown() {
    if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
    else lockPiece();
  }
  function setupGame(nextStatus: ApilaStatus) {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = START_DROP_INTERVAL;
    next = randomPiece();
    spawn();
    status = nextStatus;
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  /** Celda con 1 px de margen y franja de brillo de 4 px, como drawBlock. */
  function drawCell(px: number, py: number, type: number, alpha = 1) {
    if (!type) return;
    const color = PALETTE.pieces[type];
    ctx.globalAlpha = alpha;
    // Glow solo en celdas ocupadas y nunca en el fantasma (alpha < 1).
    if (alpha === 1) {
      ctx.shadowColor = color;
      ctx.shadowBlur = GLOW_BLUR;
    }
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = HIGHLIGHT;
    ctx.fillRect(px + 1, py + 1, BLOCK - 2, 4);
    ctx.globalAlpha = 1;
  }
  function drawShape(shape: Shape, ox: number, oy: number, alpha = 1) {
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawCell(ox + c * BLOCK, oy + r * BLOCK, shape[r][c], alpha);
  }
  function drawGrid() {
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK, 0);
      ctx.lineTo(BOARD_X + c * BLOCK, ROWS * BLOCK);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, r * BLOCK);
      ctx.lineTo(BOARD_X + COLS * BLOCK, r * BLOCK);
    }
    ctx.stroke();
  }
  function drawBoard() {
    ctx.fillStyle = PALETTE.boardBg;
    ctx.fillRect(BOARD_X, 0, COLS * BLOCK, ROWS * BLOCK);
    drawGrid();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawCell(BOARD_X + c * BLOCK, r * BLOCK, board[r][c]);
    if (status === "playing") {
      const gy = ghostY(board, current);
      drawShape(
        current.shape,
        BOARD_X + current.x * BLOCK,
        gy * BLOCK,
        GHOST_ALPHA,
      );
      drawShape(current.shape, BOARD_X + current.x * BLOCK, current.y * BLOCK);
    }
    ctx.strokeStyle = PALETTE.boardBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X - 1, -1, COLS * BLOCK + 2, ROWS * BLOCK + 2);
  }
  function drawStat(label: string, value: string, y: number) {
    const cx = PANEL_W / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.label;
    ctx.font = "14px monospace";
    ctx.fillText(label, cx, y);
    ctx.fillStyle = PALETTE.value;
    ctx.font = "bold 28px monospace";
    ctx.fillText(value, cx, y + 36);
  }
  function drawLeftPanel() {
    drawStat("SCORE", fmt(score), 150);
    drawStat("LINES", fmt(lines), 270);
    drawStat("LEVEL", fmt(level), 390);
  }
  function drawRightPanel() {
    const cx = RIGHT_X + PANEL_W / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.label;
    ctx.font = "14px monospace";
    ctx.fillText("NEXT", cx, 90);
    // Caja de 4×4 celdas centrada en el panel; la pieza se centra como en drawNext.
    const boxX = cx - 2 * BLOCK;
    const boxY = 110;
    ctx.strokeStyle = PALETTE.boardBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX - 0.5, boxY - 0.5, 4 * BLOCK + 1, 4 * BLOCK + 1);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    drawShape(shape, boxX + offX * BLOCK, boxY + offY * BLOCK);
    ctx.fillStyle = PALETTE.label;
    ctx.font = "14px monospace";
    ctx.fillText("CONTROLES", cx, 300);
    ctx.font = "13px monospace";
    CONTROLS.forEach(([keys, action], i) => {
      const y = 335 + i * 28;
      ctx.textAlign = "right";
      ctx.fillStyle = PALETTE.value;
      ctx.fillText(keys, cx - 8, y);
      ctx.textAlign = "left";
      ctx.fillStyle = PALETTE.label;
      ctx.fillText(action, cx + 8, y);
    });
  }
  /** Overlay en el canvas, sobre el tablero: sustituye al overlay HTML. */
  function drawOverlay(title: string, titleColor: string, sub: string) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(BOARD_X, 0, COLS * BLOCK, ROWS * BLOCK);
    const cx = BOARD_X + (COLS * BLOCK) / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = titleColor;
    ctx.font = "bold 40px monospace";
    ctx.fillText(title, cx, H / 2 - 16);
    ctx.fillStyle = PALETTE.overlayText;
    ctx.font = "13px monospace";
    // El subtítulo no cabe en 300 px de una sola línea: se parte en dos.
    sub.split("\n").forEach((line, i) => ctx.fillText(line, cx, H / 2 + 22 + i * 20));
  }

  function draw() {
    ctx.shadowBlur = 0;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    drawBoard();
    drawLeftPanel();
    drawRightPanel();
    if (status === "ready")
      drawOverlay("APILA", PALETTE.overlayText, "PULSA ESPACIO\nPARA EMPEZAR");
    else if (status === "gameover")
      drawOverlay(
        "GAME OVER",
        PALETTE.gameOver,
        `PUNTAJE: ${fmt(score)}\nESPACIO PARA REINICIAR`,
      );
  }

  // ── Notificación a React (solo cuando cambia algo) ──────────────────────────
  let lastSnapshot: ApilaSnapshot | null = null;

  function emit() {
    const prev = lastSnapshot;
    if (
      prev &&
      prev.status === status &&
      prev.paused === paused &&
      prev.score === score &&
      prev.level === level
    )
      return;
    lastSnapshot = { status, paused, score, lives: 0, level };
    onChange(lastSnapshot);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  // La repetición de tecla es la nativa del navegador, como en la referencia.
  // Excepción: si Espacio arrancó la partida, sus repeticiones mientras sigue
  // pulsado no hacen hard drop de la primera pieza.
  let spaceStartedGame = false;

  function onKeyDown(e: KeyboardEvent) {
    if (isTextTarget(e.target)) return;
    if (PREVENT_CODES.has(e.code)) e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (e.repeat) return;
      if (paused) resume();
      else pause();
      return;
    }

    if (e.code === "Space") {
      if (!e.repeat) spaceStartedGame = false;
      if (status === "ready" || status === "gameover") {
        if (e.repeat) return;
        // Espacio solo arranca o reinicia: no hace hard drop.
        if (status === "gameover") setupGame("playing");
        else status = "playing";
        dropAccum = 0;
        spaceStartedGame = true;
        emit();
        return;
      }
    }

    if (status !== "playing" || paused) return;

    switch (e.code) {
      case "ArrowLeft":
        moveX(-1);
        break;
      case "ArrowRight":
        moveX(1);
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        if (!spaceStartedGame) hardDrop();
        break;
    }
    emit();
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;
  let destroyed = false;

  function update(dt: number) {
    if (status !== "playing") return;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      stepDown();
    }
  }

  function loop(ts: number) {
    if (destroyed) return;
    if (paused) {
      // En pausa no hay update: se dibuja el último frame tal cual.
      lastTime = null;
    } else {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
      lastTime = ts;
      update(dt);
    }
    draw();
    emit();
    rafId = requestAnimationFrame(loop);
  }

  // ── API pública ─────────────────────────────────────────────────────────────
  function pause() {
    if (paused || status !== "playing") return;
    paused = true;
    emit();
  }

  function resume() {
    if (!paused) return;
    paused = false;
    lastTime = null; // dt no acumula el tiempo en pausa
    emit();
  }

  function reset() {
    setupGame("ready");
    paused = false;
    dropAccum = 0;
    lastTime = null;
    spaceStartedGame = false;
    draw();
    emit();
  }

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  setupGame("ready");
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  draw();
  emit(); // (ready, 0, 0, 1, paused: false)
  rafId = requestAnimationFrame(loop);

  return { pause, resume, reset, destroy };
}
