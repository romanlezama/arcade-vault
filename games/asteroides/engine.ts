// Motor de ASTEROIDES (SPEC 04).
// Port a TypeScript de references/started-games/02-asteroids/game.js.
// Sin React ni globales: todo el estado vive en el closure de createAsteroidesEngine,
// y este módulo no toca window/document al importarse.
import { DEFAULT_SKIN, type SkinId } from "../skins";
const W = 800;
const H = 600;
// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
// ── Constantes (mismos valores que la referencia) ─────────────────────────────
const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const POWERUP_GUARANTEED_KILLS = 5;
const TRIPLE_SPREAD = 0.18;
const BULLET_SPEED = 520;
const BULLET_TTL = 1.1;
const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño
const ROT = 3.5; // rad/s
const THRUST = 260; // px/s²
const DRAG = 0.987;
const SHOOT_COOLDOWN = 0.2;
const SHIP_NOSE = 21;
const SHIP_RADIUS = 12;
const SPAWN_INVINCIBILITY = 3;
const START_LIVES = 3;
const DEAD_TIME = 2;
const SAFE_DIST = 130;
const MAX_DT = 0.05;
// ── Skins (SPEC 08) ───────────────────────────────────────────────────────────
export type AsteroidesPalette = {
  bg: string; // fondo del canvas
  ship: string; // trazo de la nave
  flame: string; // llama del propulsor
  asteroid: string; // trazo de los asteroides
  particle: string; // chispas de explosión (alfa por vida)
  bullet: string; // balas
  powerUp: string; // rombo 3x y su texto
  life: string; // iconos de vida del HUD
  hudLabel: string; // "SCORE", "NIVEL"
  hudValue: string; // número de puntos y de nivel
  hudPowerUp: string; // contador "3x  n.ns"
  overlayTitle: string; // "ASTEROIDES"
  overlaySub: string; // "PULSA ESPACIO…", "PUNTAJE: …"
  gameOver: string; // título "GAME OVER"
  glow: number; // multiplicador de shadowBlur (0 = sin glow)
};
export const SKINS: Record<SkinId, AsteroidesPalette> = {
  // Vector arcade original: blanco y gris, sin glow.
  clasico: {
    bg: "#000000",
    ship: "#ffffff",
    flame: "#ff8c1a",
    asteroid: "#8c8c8c",
    particle: "#8c8c8c",
    bullet: "#ffffff",
    powerUp: "#66ff66",
    life: "#ffffff",
    hudLabel: "#9a9a9a",
    hudValue: "#ffffff",
    hudPowerUp: "#66ff66",
    overlayTitle: "#ffffff",
    overlaySub: "#b3b3b3",
    gameOver: "#ff4040",
    glow: 0,
  },
  // Paleta del vault (tokens de app/globals.css): el aspecto previo a SPEC 08.
  neon: {
    bg: "#000000",
    ship: "#00f5ff", // --cyan
    flame: "#d96e00", // rgba(255,130,0,0.85) sobre negro
    asteroid: "#ff006e", // --magenta
    particle: "#ff006e", // --magenta
    bullet: "#f5ff00", // --yellow
    powerUp: "#00ff88", // --green
    life: "#00f5ff", // --cyan
    hudLabel: "#e6e9ff", // --ink
    hudValue: "#e6e9ff", // --ink
    hudPowerUp: "#00ff88", // --green
    overlayTitle: "#e6e9ff", // --ink
    overlaySub: "#9697a6", // rgba(--ink, 0.65) sobre negro
    gameOver: "#e6e9ff", // --ink
    glow: 1,
  },
  // Fósforo ámbar monocromo: jerarquía por luminancia, glow suave.
  retro: {
    bg: "#0a0700",
    ship: "#ffd27a",
    flame: "#ff8a00",
    asteroid: "#b87a00",
    particle: "#8f5f00",
    bullet: "#fff4d6",
    powerUp: "#ffe9b0",
    life: "#ffd27a",
    hudLabel: "#c98f2e",
    hudValue: "#ffc24d",
    hudPowerUp: "#ffe9b0",
    overlayTitle: "#ffb000",
    overlaySub: "#c98f2e",
    gameOver: "#ff7a1a",
    glow: 0.35,
  },
};
// shadowBlur base de cada elemento (valores previos a SPEC 08), × palette.glow.
const BLUR_SHIP = 12;
const BLUR_FLAME = 8;
const BLUR_ASTEROID = 10;
const BLUR_PARTICLE = 6;
const BLUR_BULLET = 8;
const BLUR_POWERUP = 12;
const BLUR_POWERUP_TEXT = 8;
const BLUR_LIFE = 8;
const BLUR_HUD = 4;
const BLUR_HUD_POWERUP = 8;
const BLUR_TITLE = 14;
const BLUR_SUB = 4;
/** "#rrggbb" + alfa → "rgba(r, g, b, a)" (partículas que se desvanecen). */
function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(2)})`;
}
/** Glow con shadowBlur. Cada draw fija el suyo, así no se arrastra entre elementos. */
function glow(
  ctx: CanvasRenderingContext2D,
  palette: AsteroidesPalette,
  color: string,
  blur: number,
) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * palette.glow;
}
type Keys = Record<string, boolean>;
// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = BULLET_TTL;
  radius = 2;
  dead = false;
  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidesPalette) {
    glow(ctx, palette, palette.bullet, BLUR_BULLET);
    ctx.fillStyle = palette.bullet;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
// ── Asteroid ──────────────────────────────────────────────────────────────────
class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  verts: [number, number][] = [];
  dead = false;
  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);
    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }
  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidesPalette) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    glow(ctx, palette, palette.asteroid, BLUR_ASTEROID);
    ctx.strokeStyle = palette.asteroid;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}
// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidesPalette, now: number) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(now / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    glow(ctx, palette, palette.powerUp, BLUR_POWERUP);
    ctx.strokeStyle = palette.powerUp;
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    glow(ctx, palette, palette.powerUp, BLUR_POWERUP_TEXT);
    ctx.fillStyle = palette.powerUp;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}
// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = SHIP_RADIUS;
  thrusting = false;
  invincible = SPAWN_INVINCIBILITY;
  shootCooldown = 0;
  tripleShot = 0;
  dead = false;
  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = SPAWN_INVINCIBILITY;
    this.shootCooldown = 0;
    this.dead = false;
  }
  update(dt: number, keys: Keys) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;
    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;
    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }
    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = SHOOT_COOLDOWN;
    const ox = this.x + Math.cos(this.angle) * SHIP_NOSE;
    const oy = this.y + Math.sin(this.angle) * SHIP_NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }
  draw(
    ctx: CanvasRenderingContext2D,
    palette: AsteroidesPalette,
    blink = true,
  ) {
    if (this.dead) return;
    // Parpadeo durante la invencibilidad de reaparición (no en "ready", donde el tiempo no corre)
    if (
      blink &&
      this.invincible > 0 &&
      Math.floor(this.invincible * 8) % 2 === 0
    )
      return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    glow(ctx, palette, palette.ship, BLUR_SHIP);
    ctx.strokeStyle = palette.ship;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();
    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      glow(ctx, palette, palette.flame, BLUR_FLAME);
      ctx.strokeStyle = palette.flame;
      ctx.stroke();
    }
    ctx.restore();
  }
}
// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }
  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidesPalette) {
    const alpha = this.ttl / this.life;
    glow(ctx, palette, palette.particle, BLUR_PARTICLE);
    ctx.strokeStyle = rgba(palette.particle, alpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}
// ── Motor ─────────────────────────────────────────────────────────────────────
export type AsteroidesStatus = "ready" | "playing" | "dead" | "gameover";
export type AsteroidesSnapshot = {
  status: AsteroidesStatus;
  paused: boolean;
  score: number;
  lives: number; // 3 al empezar; 0 en gameover
  level: number; // 1 al empezar
};
export type AsteroidesEngine = {
  pause(): void; // solo tiene efecto en playing/dead
  resume(): void;
  reset(): void; // vuelve a ready con score 0, 3 vidas, nivel 1
  setSkin(id: SkinId): void; // cambia la paleta sin tocar la partida (SPEC 08)
  destroy(): void; // cancela rAF y retira listeners de window/document
};
export type AsteroidesEngineOptions = { skin?: SkinId };
/** Teclas cuyo comportamiento por defecto (scroll, etc.) se bloquea. */
const PREVENT_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
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
export function createAsteroidesEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: AsteroidesSnapshot) => void,
  options: AsteroidesEngineOptions = {},
): AsteroidesEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("ASTEROIDES: canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // Paleta activa; setSkin la sustituye en caliente.
  let palette: AsteroidesPalette = SKINS[options.skin ?? DEFAULT_SKIN];
  // ── Estado del juego ────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let status: AsteroidesStatus = "ready";
  let paused = false;
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  // ── Notificación a React (solo cuando cambia algo) ──────────────────────────
  let lastSnapshot: AsteroidesSnapshot | null = null;
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
  const keys: Keys = {};
  const justPressed: Keys = {};
  function clearInput() {
    for (const k of Object.keys(keys)) delete keys[k];
    for (const k of Object.keys(justPressed)) delete justPressed[k];
  }
  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }
  function onKeyDown(e: KeyboardEvent) {
    if (isTextTarget(e.target)) return;
    if (PREVENT_CODES.has(e.code)) e.preventDefault();
    if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) {
      if (paused) resume();
      else pause();
      return;
    }
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    // Siempre se suelta la tecla, para que ninguna quede "pegada".
    keys[e.code] = false;
    if (isTextTarget(e.target)) return;
    if (PREVENT_CODES.has(e.code)) e.preventDefault();
  }
  function onVisibilityChange() {
    if (document.hidden) pause();
  }
  // ── Ciclo de partida ────────────────────────────────────────────────────────
  function setupGame(next: AsteroidesStatus) {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = START_LIVES;
    level = 1;
    deadTimer = 0;
    status = next;
    spawnAsteroids(3 + level);
  }
  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      status = "gameover";
    } else {
      status = "dead";
      deadTimer = DEAD_TIME;
    }
  }
  function updateParticles(dt: number) {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (status === "ready") {
      // La partida no avanza hasta pulsar Espacio (que no dispara).
      if (pressed("Space")) status = "playing";
      return;
    }
    if (status === "gameover") {
      if (pressed("Space")) setupGame("playing");
      updateParticles(dt);
      return;
    }
    if (status === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        status = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) bullets.push(...ship.tryShoot());
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    powerUps.forEach((p) => p.update(dt));
    updateParticles(dt);
    bullets = bullets.filter((b) => !b.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    glow(ctx, palette, palette.life, BLUR_LIFE);
    ctx.strokeStyle = palette.life;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  /** Texto "label valor" en dos colores, alineado a la izquierda desde x. */
  function drawLabelValue(label: string, value: string, x: number, y: number) {
    ctx.textAlign = "left";
    glow(ctx, palette, palette.hudLabel, BLUR_HUD);
    ctx.fillStyle = palette.hudLabel;
    ctx.fillText(label, x, y);
    glow(ctx, palette, palette.hudValue, BLUR_HUD);
    ctx.fillStyle = palette.hudValue;
    ctx.fillText(value, x + ctx.measureText(label).width, y);
  }
  function drawHUD() {
    ctx.font = "15px monospace";
    ctx.textBaseline = "alphabetic";
    drawLabelValue("SCORE  ", `${score}`, 14, 26);
    // "NIVEL n" centrado en W/2, como antes de SPEC 08.
    const levelLabel = "NIVEL ";
    const levelValue = `${level}`;
    const levelWidth = ctx.measureText(levelLabel + levelValue).width;
    drawLabelValue(levelLabel, levelValue, W / 2 - levelWidth / 2, 26);
    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);
    if (ship.tripleShot > 0) {
      ctx.textAlign = "left";
      glow(ctx, palette, palette.hudPowerUp, BLUR_HUD_POWERUP);
      ctx.fillStyle = palette.hudPowerUp;
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }
  function drawOverlay(title: string, titleColor: string, sub: string) {
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    glow(ctx, palette, titleColor, BLUR_TITLE);
    ctx.fillStyle = titleColor;
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    glow(ctx, palette, palette.overlaySub, BLUR_SUB);
    ctx.fillStyle = palette.overlaySub;
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }
  function draw(now: number) {
    glow(ctx, palette, palette.bg, 0); // el fondo nunca lleva glow
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx, palette));
    asteroids.forEach((a) => a.draw(ctx, palette));
    powerUps.forEach((p) => p.draw(ctx, palette, now));
    bullets.forEach((b) => b.draw(ctx, palette));
    ship.draw(ctx, palette, status !== "ready");
    drawHUD();
    if (status === "ready")
      drawOverlay(
        "ASTEROIDES",
        palette.overlayTitle,
        "PULSA ESPACIO PARA EMPEZAR",
      );
    else if (status === "gameover")
      drawOverlay(
        "GAME OVER",
        palette.gameOver,
        `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`,
      );
  }
  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;
  let destroyed = false;
  function loop(ts: number) {
    if (destroyed) return;
    if (paused) {
      // En pausa no hay update ni redibujado: el canvas conserva el último frame.
      lastTime = null;
    } else {
      const dt =
        lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
      lastTime = ts;
      update(dt);
      draw(ts);
    }
    emit();
    rafId = requestAnimationFrame(loop);
  }
  // ── API pública ─────────────────────────────────────────────────────────────
  function pause() {
    if (paused || (status !== "playing" && status !== "dead")) return;
    paused = true;
    emit();
  }
  function resume() {
    if (!paused) return;
    paused = false;
    lastTime = null; // dt no acumula el tiempo en pausa
    clearInput();
    emit();
  }
  function reset() {
    setupGame("ready");
    paused = false;
    lastTime = null;
    clearInput();
    draw(performance.now());
    emit();
  }
  function setSkin(id: SkinId) {
    palette = SKINS[id];
    // En pausa el loop no redibuja: pintamos el frame actual con la nueva paleta.
    // No toca el estado de la partida ni emite snapshot.
    if (paused) draw(performance.now());
  }
  function destroy() {
    destroyed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  document.addEventListener("visibilitychange", onVisibilityChange);
  setupGame("ready");
  draw(performance.now());
  emit(); // snapshot inicial: ready, 0, 3, 1, paused: false
  rafId = requestAnimationFrame(loop);
  return { pause, resume, reset, setSkin, destroy };
}
