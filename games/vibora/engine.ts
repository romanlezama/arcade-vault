// Motor de VÍBORA (SPEC 07).
// Juego de serpiente original, sin código de referencia: las reglas salen de la spec.
// Sin React ni globales: todo el estado vive en el closure de createViboraEngine,
// y este módulo no toca window/document al importarse.
// ── Lienzo y distribución (800×600: HUD de 800×50 + tablero de 800×550) ───────
const W = 800;
const H = 600;
const COLS = 32;
const ROWS = 22;
const CELL = 25;
const HUD_H = 50;
// ── Constantes de juego ───────────────────────────────────────────────────────
const START_LENGTH = 3;
const START_CELL: Cell = { x: 16, y: 11 }; // cabeza
const START_DIR: Dir = "right";
const START_TICK = 150; // ms
const TICK_STEP = 10; // ms menos por nivel
const MIN_TICK = 60; // ms
const FRUITS_PER_LEVEL = 5;
const START_LIVES = 3;
const DEAD_DELAY = 1000; // ms
const FRUIT_POINTS = 10; // × nivel
const GOLDEN_POINTS = 50; // × nivel
const GOLDEN_CHANCE = 0.15;
const GOLDEN_TTL = 5000; // ms
const GOLDEN_BLINK = 1500; // ms: parpadea en el último tramo
const MAX_QUEUE = 2;
const MAX_DT = 50; // ms: tras un parón la serpiente no avanza en ráfaga
// ── Paleta ────────────────────────────────────────────────────────────────────
// Mismos valores que los tokens de app/globals.css (el motor no lee
// getComputedStyle).
const PALETTE = {
  snake: "#00ff88", // --green
  eye: "#0a0a0f", // --bg
  crashed: "#ff006e", // --magenta
  fruit: {
    manzana: "#ff006e", // --magenta
    cereza: "#d97a3a", // --bronze
    uva: "#00f5ff", // --cyan
    limon: "#f5ff00", // --yellow
  } satisfies Record<FruitKind, string>,
  golden: "#ffcf3a", // --gold
  leaf: "#00ff88", // --green
  shine: "#e6e9ff", // --ink
  grid: "#4a4f70", // --ink-faint
  boardBg: "#0a0a0f", // --bg
  wall: "rgba(0, 245, 255, 0.18)", // --line
  label: "#8a8fb5", // --ink-dim
  value: "#f5ff00", // --yellow
  heart: "#ff006e", // --magenta
  heartLost: "#4a4f70", // --ink-faint
  overlayText: "#e6e9ff", // --ink
  gameOver: "#ff006e", // --magenta
  won: "#ffcf3a", // --gold
};
const GLOW_BLUR = 10; // shadowBlur de la cabeza y las frutas (el cuerpo va sin glow)
const GOLDEN_GLOW_BLUR = 22; // la dorada brilla más
const GRID_ALPHA = 0.35;
const BODY_MIN_ALPHA = 0.45; // el cuerpo se desvanece de 1 a 0,45 hacia la cola
const BLINK_PERIOD = 120; // ms por fase del parpadeo de la dorada

// ── Sprites propios (8×8) ─────────────────────────────────────────────────────
// 0 = transparente, 1 = color principal, 2 = hoja o tallo, 3 = brillo.
// Diseño propio: no se copian de ningún juego.
type Sprite = readonly string[];
const FRUIT_SPRITES: Record<FruitKind, Sprite> = {
  manzana: [
    "00002200",
    "00022000",
    "01101110",
    "11111131",
    "11111131",
    "11111111",
    "01111110",
    "00110110",
  ],
  cereza: [
    "00000220",
    "00002020",
    "00020020",
    "00200200",
    "01102110",
    "11311311",
    "11111111",
    "01100110",
  ],
  uva: [
    "00022000",
    "00020000",
    "03101310",
    "11111111",
    "03101310",
    "01111110",
    "00311100",
    "00011000",
  ],
  limon: [
    "00000200",
    "00002000",
    "00111100",
    "01131110",
    "11311111",
    "01111110",
    "00111100",
    "00000000",
  ],
};
const GOLDEN_SPRITE: Sprite = [
  "00011000",
  "00113100",
  "01131110",
  "11311111",
  "11111111",
  "01111110",
  "00111100",
  "00011000",
];
/** Corazón de vidas del HUD (7×6). */
const HEART_SPRITE: Sprite = [
  "0110110",
  "1111111",
  "1111111",
  "0111110",
  "0011100",
  "0001000",
];
const SPRITE_PX = 3; // 8 × 3 = 24 px dentro de una celda de 25
const SPRITE_OFFSET = Math.round((CELL - 8 * SPRITE_PX) / 2); // 0,5 px → 1
// ── Tipos y lógica pura ───────────────────────────────────────────────────────
type Cell = { x: number; y: number }; // coordenadas de rejilla, origen arriba-izquierda
type Dir = "up" | "down" | "left" | "right";
type FruitKind = "manzana" | "cereza" | "uva" | "limon";
const FRUIT_KINDS: FruitKind[] = ["manzana", "cereza", "uva", "limon"];
const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
const KEY_DIR: Partial<Record<string, Dir>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
/** Serpiente inicial: cabeza en START_CELL y el cuerpo hacia la izquierda. */
function startSnake(): Cell[] {
  return Array.from({ length: START_LENGTH }, (_, i) => ({
    x: START_CELL.x - i,
    y: START_CELL.y,
  }));
}
function tickInterval(level: number) {
  return Math.max(MIN_TICK, START_TICK - (level - 1) * TICK_STEP);
}
/** Celdas libres del tablero: ni serpiente ni las celdas ocupadas indicadas. */
function freeCells(snake: Cell[], taken: Cell[]): Cell[] {
  const used = new Set<number>();
  for (const c of snake) used.add(c.y * COLS + c.x);
  for (const c of taken) used.add(c.y * COLS + c.x);
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (!used.has(y * COLS + x)) free.push({ x, y });
  return free;
}
const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)];
const fmt = (n: number) => n.toLocaleString("es-ES");

/** Teclas cuyo comportamiento por defecto (scroll, etc.) se bloquea. */
const PREVENT_CODES = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
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
export type ViboraStatus = "ready" | "playing" | "dead" | "gameover" | "won";
export type ViboraSnapshot = {
  status: ViboraStatus;
  paused: boolean;
  score: number;
  lives: number; // 3 al empezar; 0 en gameover
  level: number; // floor(fruitsEaten / 5) + 1
};
export type ViboraEngine = {
  pause(): void; // solo tiene efecto en playing
  resume(): void;
  reset(): void; // vuelve a ready: serpiente inicial, score 0, frutas 0, nivel 1, 3 vidas
  destroy(): void; // cancela el rAF y retira los listeners de window/document
};
export function createViboraEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: ViboraSnapshot) => void,
): ViboraEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("VÍBORA: canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Estado del juego ────────────────────────────────────────────────────────
  let snake: Cell[] = startSnake(); // índice 0 = cabeza
  let dir: Dir = START_DIR;
  let dirQueue: Dir[] = [];
  let growPending = 0;
  let fruit: { cell: Cell; kind: FruitKind } = {
    cell: { x: 0, y: 0 },
    kind: "manzana",
  };
  let golden: { cell: Cell; ttl: number } | null = null;
  let score = 0;
  let fruitsEaten = 0;
  let level = 1;
  let lives = START_LIVES;
  let tickAccum = 0;
  let deadTimer = 0;
  let status: ViboraStatus = "ready";
  let paused = false;
  // ── Mecánica ────────────────────────────────────────────────────────────────
  /** Coloca la fruta normal en una celda libre; sin hueco, la partida está ganada. */
  function spawnFruit() {
    const free = freeCells(snake, golden ? [golden.cell] : []);
    if (free.length === 0) {
      status = "won";
      return;
    }
    fruit = { cell: pick(free), kind: pick(FRUIT_KINDS) };
  }
  /** Tras comer una fruta normal: 15 % de que brote una dorada, si no hay ya una. */
  function maybeSpawnGolden() {
    if (golden || Math.random() >= GOLDEN_CHANCE) return;
    const free = freeCells(snake, [fruit.cell]);
    if (free.length === 0) return;
    golden = { cell: pick(free), ttl: GOLDEN_TTL };
  }
  /** Encola un giro si cabe y no repite ni invierte la última dirección encolada. */
  function enqueueDir(next: Dir) {
    const last = dirQueue.at(-1) ?? dir;
    if (dirQueue.length >= MAX_QUEUE) return;
    if (next === last || next === OPPOSITE[last]) return;
    dirQueue.push(next);
  }
  function updateLevel() {
    level = Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
  }
  /** Un tic: consume un giro, avanza una celda, comprueba choques y come. */
  function step() {
    const queued = dirQueue.shift();
    if (queued) dir = queued;
    const head = snake[0];
    const next = { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y };
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      loseLife();
      return;
    }
    // La cola cuenta como libre si este tic no crece, porque se desplaza.
    const growing = growPending > 0;
    const bodyEnd = growing ? snake.length : snake.length - 1;
    for (let i = 0; i < bodyEnd; i++) {
      if (sameCell(snake[i], next)) {
        loseLife();
        return;
      }
    }
    snake.unshift(next);
    if (growing) growPending--;
    else snake.pop();
    if (golden && sameCell(golden.cell, next)) {
      score += GOLDEN_POINTS * level;
      fruitsEaten++;
      growPending++;
      golden = null;
      updateLevel();
    }
    if (sameCell(fruit.cell, next)) {
      score += FRUIT_POINTS * level;
      fruitsEaten++;
      growPending++;
      updateLevel();
      spawnFruit();
      if (status === "playing") maybeSpawnGolden();
    }
  }
  /** Choque: resta una vida; con vidas restantes pasa a dead, si no a gameover. */
  function loseLife() {
    lives--;
    golden = null;
    if (lives > 0) {
      status = "dead";
      deadTimer = DEAD_DELAY;
    } else {
      status = "gameover";
    }
  }
  /** Tras el choque: serpiente inicial en el centro, conservando puntos, frutas y nivel. */
  function respawn() {
    snake = startSnake();
    dir = START_DIR;
    dirQueue = [];
    growPending = 0;
    tickAccum = 0;
    if (snake.some((c) => sameCell(c, fruit.cell))) spawnFruit();
    status = "playing";
  }
  function setupGame(nextStatus: ViboraStatus) {
    snake = startSnake();
    dir = START_DIR;
    dirQueue = [];
    growPending = 0;
    golden = null;
    score = 0;
    fruitsEaten = 0;
    level = 1;
    lives = START_LIVES;
    tickAccum = 0;
    deadTimer = 0;
    status = nextStatus;
    spawnFruit();
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  const cellX = (c: Cell) => c.x * CELL;
  const cellY = (c: Cell) => HUD_H + c.y * CELL;
  function drawSprite(
    sprite: Sprite,
    colors: Record<string, string>,
    x: number,
    y: number,
    px: number,
  ) {
    for (let r = 0; r < sprite.length; r++) {
      const row = sprite[r];
      for (let c = 0; c < row.length; c++) {
        const color = colors[row[c]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x + c * px, y + r * px, px, px);
      }
    }
  }
  function drawFruitSprite(
    sprite: Sprite,
    main: string,
    cell: Cell,
    glow = GLOW_BLUR,
  ) {
    ctx.shadowColor = main;
    ctx.shadowBlur = glow;
    drawSprite(
      sprite,
      { "1": main, "2": PALETTE.leaf, "3": PALETTE.shine },
      cellX(cell) + SPRITE_OFFSET,
      cellY(cell) + SPRITE_OFFSET,
      SPRITE_PX,
    );
    ctx.shadowBlur = 0;
  }
  function drawGrid() {
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = GRID_ALPHA;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * CELL, HUD_H);
      ctx.lineTo(c * CELL, H);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(0, HUD_H + r * CELL);
      ctx.lineTo(W, HUD_H + r * CELL);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawSnake() {
    // En dead se ve la serpiente chocada en magenta.
    const color = status === "dead" ? PALETTE.crashed : PALETTE.snake;
    ctx.fillStyle = color;
    // Cuerpo sin glow, con alpha de 1 (junto a la cabeza) a 0,45 (cola).
    const n = snake.length;
    for (let i = n - 1; i >= 1; i--) {
      const c = snake[i];
      ctx.globalAlpha = 1 - (1 - BODY_MIN_ALPHA) * (i / (n - 1));
      ctx.fillRect(cellX(c) + 1, cellY(c) + 1, CELL - 2, CELL - 2);
    }
    ctx.globalAlpha = 1;
    // Cabeza con glow.
    const head = snake[0];
    ctx.shadowColor = color;
    ctx.shadowBlur = GLOW_BLUR;
    ctx.fillRect(cellX(head) + 1, cellY(head) + 1, CELL - 2, CELL - 2);
    ctx.shadowBlur = 0;
    // Ojo de 3×3 en la mitad delantera de la cabeza, según la dirección.
    const cx = cellX(head) + CELL / 2;
    const cy = cellY(head) + CELL / 2;
    const ex = cx + DELTA[dir].x * 6 + DELTA[dir].y * 4;
    const ey = cy + DELTA[dir].y * 6 - DELTA[dir].x * 4;
    ctx.fillStyle = PALETTE.eye;
    ctx.fillRect(Math.round(ex - 1.5), Math.round(ey - 1.5), 3, 3);
  }
  function drawBoard() {
    ctx.fillStyle = PALETTE.boardBg;
    ctx.fillRect(0, HUD_H, W, H - HUD_H);
    drawGrid();
    if (status !== "won")
      drawFruitSprite(
        FRUIT_SPRITES[fruit.kind],
        PALETTE.fruit[fruit.kind],
        fruit.cell,
      );
    // La dorada parpadea en su último tramo; su ttl se congela en pausa.
    if (
      golden &&
      (golden.ttl > GOLDEN_BLINK ||
        Math.floor(golden.ttl / BLINK_PERIOD) % 2 === 0)
    )
      drawFruitSprite(
        GOLDEN_SPRITE,
        PALETTE.golden,
        golden.cell,
        GOLDEN_GLOW_BLUR,
      );
    drawSnake();
    // Muro: el borde del tablero.
    ctx.strokeStyle = PALETTE.wall;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, HUD_H + 1, W - 2, H - HUD_H - 2);
  }
  function drawHudStat(label: string, value: string, x: number) {
    const y = HUD_H / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = PALETTE.label;
    ctx.font = "13px monospace";
    ctx.fillText(label, x, y);
    const labelW = ctx.measureText(label).width;
    ctx.fillStyle = PALETTE.value;
    ctx.font = "bold 22px monospace";
    ctx.fillText(value, x + labelW + 10, y);
  }
  function drawHud() {
    ctx.textBaseline = "middle";
    drawHudStat("PUNTOS", fmt(score), 24);
    drawHudStat("FRUTAS", fmt(fruitsEaten), 260);
    drawHudStat("NIVEL", fmt(level), 450);
    ctx.textAlign = "left";
    ctx.fillStyle = PALETTE.label;
    ctx.font = "13px monospace";
    ctx.fillText("VIDAS", 610, HUD_H / 2);
    const heartPx = 3;
    for (let i = 0; i < START_LIVES; i++) {
      const color = i < lives ? PALETTE.heart : PALETTE.heartLost;
      drawSprite(
        HEART_SPRITE,
        { "1": color },
        668 + i * 34,
        HUD_H / 2 - 9,
        heartPx,
      );
    }
    ctx.textBaseline = "alphabetic";
  }
  /** Overlay en el canvas, sobre el tablero (no tapa el HUD superior). */
  function drawOverlay(
    title: string,
    titleColor: string,
    sub: string,
    dim = 0.7,
  ) {
    ctx.fillStyle = `rgba(0,0,0,${dim})`;
    ctx.fillRect(0, HUD_H, W, H - HUD_H);
    const cx = W / 2;
    const cy = HUD_H + (H - HUD_H) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = titleColor;
    ctx.font = "bold 44px monospace";
    ctx.fillText(title, cx, cy - 12);
    ctx.fillStyle = PALETTE.overlayText;
    ctx.font = "15px monospace";
    sub
      .split("\n")
      .forEach((line, i) => ctx.fillText(line, cx, cy + 28 + i * 24));
  }

  function draw() {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    drawHud();
    drawBoard();
    if (status === "ready")
      drawOverlay("VÍBORA", PALETTE.overlayText, "PULSA ESPACIO PARA EMPEZAR");
    else if (status === "dead")
      drawOverlay(
        "¡CHOQUE!",
        PALETTE.gameOver,
        `VIDAS RESTANTES: ${lives}`,
        0.35,
      );
    else if (status === "gameover")
      drawOverlay(
        "GAME OVER",
        PALETTE.gameOver,
        `PUNTOS: ${fmt(score)}\nESPACIO PARA REINICIAR`,
      );
    else if (status === "won")
      drawOverlay(
        "¡TABLERO COMPLETO!",
        PALETTE.won,
        `PUNTOS: ${fmt(score)}\nESPACIO PARA JUGAR DE NUEVO`,
      );
  }

  // ── Notificación a React (solo cuando cambia algo) ──────────────────────────
  let lastSnapshot: ViboraSnapshot | null = null;

  function emit() {
    const prev = lastSnapshot;
    if (
      prev &&
      prev.status === status &&
      prev.paused === paused &&
      prev.score === score &&
      prev.lives === lives &&
      prev.level === level
    )
      return;
    lastSnapshot = { status, paused, score, lives, level };
    onChange(lastSnapshot);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
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
      // Espacio solo arranca o reinicia; en playing no hace nada.
      if (e.repeat) return;
      if (status === "ready") {
        status = "playing";
        tickAccum = 0;
        emit();
      } else if (status === "gameover" || status === "won") {
        setupGame("playing");
        emit();
      }
      return;
    }

    const next = KEY_DIR[e.code];
    if (next && status === "playing" && !paused) enqueueDir(next);
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;
  let destroyed = false;

  function update(dt: number) {
    if (status === "dead") {
      deadTimer -= dt;
      if (deadTimer <= 0) respawn();
      return;
    }
    if (status !== "playing") return;
    // El ttl de la dorada solo baja aquí, así que la pausa lo congela.
    if (golden) {
      golden.ttl -= dt;
      if (golden.ttl <= 0) golden = null;
    }
    tickAccum += dt;
    const interval = tickInterval(level);
    if (tickAccum >= interval) {
      tickAccum -= interval;
      step();
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
    lastTime = null;
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
  emit(); // (ready, 0, 3, 1, paused: false)
  rafId = requestAnimationFrame(loop);

  return { pause, resume, reset, destroy };
}
