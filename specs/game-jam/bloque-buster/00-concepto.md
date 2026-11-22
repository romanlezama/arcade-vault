# Concepto — BLOQUE BUSTER

> **Estado:** Borrador
> **Tema de la jam:** BLOQUE BUSTER (id `bloque-buster`)
> **Fecha:** 2026-11-22
> **Spec:** [01-juego-bloque-buster.md](01-juego-bloque-buster.md)

## Pitch

Pilotas una nave-paleta neón al pie de la pantalla y rebotas un núcleo de plasma contra muros de bloques cromáticos que dibujan figuras: un embudo, una diana, un corazón, un rayo, la cámara acorazada del vault y una espiral. Cuantos más bloques rompas sin que el núcleo vuelva a tocar la nave, más crece tu **racha** y más vale cada bloque, hasta ×5. Los módulos que caen de los bloques rotos ensanchan la nave, frenan el plasma o lo dividen en tres núcleos.

## Relación con el tema

- **Nombre.** El tema es el título de una ficha que ya existe en el catálogo como juego simulado (`bloque-buster`, ARCADE, portada `cover-bricks`). El juego de la jam es el motor real de esa ficha: se conservan id, título, posición, textos y portada.
- **Mecánica.** "Bloque" + "buster" (el que revienta): el núcleo del juego es romper bloques rebotando un proyectil con una paleta. Del género "romper ladrillos" solo se toma esa mecánica.
- **Texto de la ficha.** El diseño sale de su `long`: "nave-paleta" (la paleta es una pequeña nave con propulsores), "núcleo de plasma" (la pelota), "bloques cromáticos" (cuatro colores neón más bloques duros y blindados), "cada nivel reorganiza la grilla en patrones" (6 patrones propios que se repiten endurecidos) y "¿hasta dónde llegará tu racha?" (el multiplicador de racha).
- **Estética.** Neón del vault sobre fondo `--bg`, todo dibujado por código: sin el spritesheet ni los sonidos de `references/started-games/04-arkanoid/`.

## Ficha propuesta

La ficha **ya existe** en `GAMES` (1.ª posición) y no cambia.

| Campo   | Valor                                                                                                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | `bloque-buster`                                                                                                                                                                         |
| `title` | BLOQUE BUSTER                                                                                                                                                                           |
| `cat`   | ARCADE                                                                                                                                                                                  |
| `color` | `cyan`                                                                                                                                                                                  |
| `cover` | `cover-bricks` (existente)                                                                                                                                                              |
| `short` | Rebota la pelota y destruye muros de neón.                                                                                                                                              |
| `long`  | Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha? |
| `best`  | 28450 (sin cambios)                                                                                                                                                                     |
| `plays` | "12.4K" (sin cambios)                                                                                                                                                                   |

## Bucle de juego

1. **Saque.** Al empezar cada vida o cada nivel, el núcleo descansa sobre la nave. El jugador la coloca con `←`/`→` y lanza con Espacio (o `↑`/`W`). Sale con 15° hacia la derecha, o hacia la izquierda si se mantiene `←`/`A`.
2. **Rebote.** El núcleo rebota en las paredes laterales y en el techo. Al tocar la nave sale con un ángulo que depende de dónde golpea: en el centro sube vertical y en los extremos sale a 60°. Es la única forma de apuntar.
3. **Romper.** Los bloques normales caen de un golpe. Los duros (plateados) necesitan dos: el primero los agrieta. Los blindados no se rompen y no cuentan para terminar el muro.
4. **Racha.** Cada bloque destruido sin que ningún núcleo toque la nave suma 1 a la racha. Cada 4 bloques el multiplicador sube un punto, hasta ×5. Tocar la nave o perder una vida la pone a 0.
5. **Módulos.** Un 12 % de los bloques destruidos suelta un módulo que cae despacio. Si la nave lo atrapa: AMPLIAR (nave más ancha 10 s), FRENO (núcleo al 70 % durante 8 s) o MULTI (el núcleo se divide en 3).
6. **Muro pulverizado.** Al romper todos los bloques destructibles se cobra un bonus de 1.000 × nivel, se muestra "¡MURO PULVERIZADO!" durante 1,5 s y empieza el siguiente nivel con el núcleo sobre la nave.
7. **Perder.** Si caen todos los núcleos por el borde inferior se pierde una vida ("¡NÚCLEO PERDIDO!" 1 s). Con la última vida, GAME OVER. El juego no tiene final: los 6 patrones se repiten más rápidos y con más bloques duros.

## Controles

| Tecla                | Acción                                                    |
| -------------------- | --------------------------------------------------------- |
| `←` / `A` (mantener) | Mover la nave a la izquierda                              |
| `→` / `D` (mantener) | Mover la nave a la derecha                                |
| Espacio / `↑` / `W`  | Lanzar el núcleo cuando descansa sobre la nave            |
| Espacio              | En `ready` y `gameover`: empezar o reiniciar (sin lanzar) |
| `P` / `Escape`       | Pausar y reanudar                                         |

## Puntuación, vidas y niveles

- **Bloques.** Normal 10 puntos, duro 30 puntos (al romperlo; agrietarlo no suma). Blindado 0. Ambos × multiplicador de racha.
- **Racha.** Multiplicador `min(5, 1 + floor((racha − 1) / 4))`: bloques 1–4 ×1, 5–8 ×2, 9–12 ×3, 13–16 ×4, 17 en adelante ×5.
- **Módulos.** Atrapar uno suma 50 puntos fijos (sin multiplicador).
- **Muro completo.** Bonus 1.000 × nivel.
- **Vidas.** 3 al empezar, máximo 5. Vida extra cada 20.000 puntos (20.000, 40.000…). Si ya hay 5, el umbral pasa igualmente.
- **Niveles.** Infinitos. El nivel `n` usa el patrón `(n − 1) mod 6`: EMBUDO, DIANA, CORAZÓN, RAYO, LA CÁMARA y ESPIRAL. A partir del nivel 7 (segunda vuelta), los bloques normales de las filas 0, 3 y 6 del patrón pasan a ser duros.
- **Velocidad del núcleo.** `min(640, 340 + 25 × (n − 1))` px/s: 340 en el nivel 1, 490 en el 7 y tope de 640 en el 13.

## Boceto de pantalla (800×600)

```
x=0                                                                  x=800
┌──────────────────────────────────────────────────────────────────────┐ y=0
│ PUNTOS        RACHA      NIVEL              MÓDULOS        VIDAS      │
│ 12.340        ×3         03 · CORAZÓN       [A 7][F 3]     ♥ ♥ ♥      │ HUD 800×50
├──────────────────────────────────────────────────────────────────────┤ y=50
│┌────────────────────────────────────────────────────────────────────┐│ y=56 techo
││  x=40                                                      x=760   ││
││   ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐  y=100                     ││
││   │  │▓▓│▓▓│▓▓│  │  │  │▓▓│▓▓│▓▓│  │  │  rejilla 12×9               ││
││   │  │  │  │  │  │  │  │  │  │  │  │  │  bloques de 60×22           ││
││   │  ...                                │  (720×198)                  ││
││   └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘  y=298                     ││
││                                                                    ││
││                         ●  núcleo r=7                              ││
││                                                                    ││
││                   [M]  módulo 36×14 cayendo                        ││
││                                                                    ││
││                    ◢████████◣  nave 96×14, y=556                   ││
││                                                                    ││
│x=14 pared                 (borde inferior abierto)          pared x=786
└──────────────────────────────────────────────────────────────────────┘ y=600
```

- Franja de HUD de 800×50 en `y = 0`, con línea separadora en `y = 50`.
- Campo de juego entre `x = 16` y `x = 784`, con techo en `y = 58`. El borde inferior está abierto: el núcleo se pierde al pasar `y = 600`.
- Rejilla de 12×9 celdas de 60×22 px con origen en (40, 100). Deja 24 px de pasillo a cada lado.
- Nave en `y = 556` (borde superior), 14 px de alto.

## Estética

- **Paleta por rol** (tokens de `app/globals.css`):
  - Nave-paleta: cuerpo `--magenta` con glow, propulsores de 10 px en `--cyan` en cada extremo y una luz central `--yellow`. Con AMPLIAR, el borde pasa a `--green`.
  - Núcleo de plasma: centro `--ink` con glow `--cyan` y una estela de 4 posiciones en `--cyan` que se desvanece.
  - Bloques normales: `--cyan`, `--magenta`, `--yellow` y `--green`. Duros en `--silver` (agrietados con una grieta diagonal en `--bg`). Blindados en `--ink-faint` con rayado en `--line`.
  - Módulos: cápsulas con letra en `--bg`. AMPLIAR "A" `--green`, FRENO "F" `--cyan`, MULTI "M" `--gold`.
  - Partículas al romper un bloque: 8 cuadraditos del color del bloque.
  - Paredes y techo: líneas de 2 px en `--cyan` al 50 %. Fondo `--bg`.
  - HUD: etiquetas `--ink-dim`, valores `--yellow`, racha ≥ ×2 en `--magenta`, corazones `--magenta`.
  - Overlays: título "BLOQUE BUSTER" en `--cyan`, "GAME OVER" y "¡NÚCLEO PERDIDO!" en `--magenta`, "¡MURO PULVERIZADO!" en `--gold`, resto en `--ink`.
- **Sprites por código.** Nada de imágenes: rectángulos con esquinas de 3 px, franja de brillo superior y halo dibujado con un trazo semitransparente. La nave es un trapecio con propulsores. Todo con `fillRect`, `roundRect`, `arc` y `lineTo`.
- **Portada.** Se mantiene `cover-bricks`, que ya identifica a BLOQUE BUSTER en la Biblioteca, la Home y el Salón: filas de ladrillos magenta, naranja, cian y verde. No se parece a ninguna otra portada, así que no hace falta una `cover-bloque-buster`. Si en la revisión se quiere rediseñar, la idea sería: un muro con forma de diana en la mitad superior, la nave-paleta magenta con propulsores cian abajo y la estela del núcleo en diagonal (ver pregunta abierta 1).

## Encaje en el catálogo

- **Categoría.** ARCADE, junto a VÍBORA (real) y SERPENTINA, GLOTÓN y RANARIA (simulados).
- **Qué aporta.** Es la primera mecánica de **rebote con física continua** del catálogo real: ASTEROIDES es movimiento libre con disparo, APILA es rejilla por tics y VÍBORA también va por tics. Introduce además power-ups que se atrapan, multibola y un multiplicador por racha.
- **Primer reemplazo de ficha simulada.** Es el primer juego real que sustituye a una ficha simulada existente en lugar de añadir una nueva: no cambia el número de fichas, la portada, el stat de la Home ni el CHECK de `scores`.
- **Esfuerzo: M.** Motor de unas 700–900 líneas, más `levels.ts` con 6 patrones. Sin migración, sin portada nueva y sin cambios en `GamePlayer`.

## Preguntas abiertas para la revisión

1. **Portada.** ¿Mantener `cover-bricks` o rediseñar una `cover-bloque-buster` con la diana, la nave y la estela? **Elegido:** mantener `cover-bricks` (ficha sustituida; el rediseño iría en otra spec).
2. **Puntuaciones simuladas.** `public.scores` puede tener filas de `bloque-buster` guardadas con la partida simulada (sube unos 250 puntos/s), que competirían con las reales en el Salón. **Elegido:** no tocarlas (la tabla no admite `delete` por RLS); limpiarlas sería una tarea manual o una spec aparte.
3. **Ratón.** La referencia movía la paleta con el ratón. **Elegido:** solo teclado, como el resto de motores y el contrato. El ratón queda fuera de alcance.
4. **Final.** **Elegido:** niveles infinitos (6 patrones que se repiten endurecidos), sin estado `won`. Alternativa: terminar tras el nivel 12 con "¡BÓVEDA LIMPIA!".
5. **Dificultad.** **Elegido:** 3 vidas (máximo 5), vida extra cada 20.000 puntos, núcleo de 340 a 640 px/s (+25 por nivel).
6. **Módulos.** **Elegido:** 3 tipos (AMPLIAR, FRENO, MULTI) con un 12 % de probabilidad y como mucho 2 cayendo a la vez. Sin módulos negativos (nave más corta, núcleo más rápido) ni disparo.
7. **Racha.** **Elegido:** se reinicia al tocar la nave, multiplicador hasta ×5 cada 4 bloques. Alternativa: que se reinicie solo al perder vida (más generosa).
8. **Textos de la ficha.** **Elegido:** no cambiar `short`, `long`, `best` ni `plays`. El `long` ya describe el juego.
9. **Sonido.** **Elegido:** sin sonido; no se portan `ball-bounce.mp3` ni `break-sound.mp3` de la referencia (como en el resto de motores).
