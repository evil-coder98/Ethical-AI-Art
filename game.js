const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: false });

const titleEl = document.getElementById("title");
const seedEl = document.getElementById("seed");
const compositionEl = document.getElementById("composition");
const paletteEl = document.getElementById("palette");
const circlesEl = document.getElementById("circles");
const generateBtn = document.getElementById("generate");
const saveBtn = document.getElementById("save");

const WIDTH = 1200;
const HEIGHT = 900;

canvas.width = WIDTH;
canvas.height = HEIGHT;

let circles = [];
let currentSeed = 0;
let currentTitle = "";

function rng(seed) {
    let x = seed >>> 0;

    return function () {
        x += 0x6D2B79F5;

        let t = x;

        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function randomSeed() {
    return Math.floor(Math.random() * 4294967295);
}

function rand(r, a, b) {
    return a + r() * (b - a);
}

function int(r, a, b) {
    return Math.floor(rand(r, a, b + 1));
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function hsv(h, s, v) {
    h = ((h % 360) + 360) % 360;

    s = clamp(s, 0, 100) / 100;
    v = clamp(v, 0, 100) / 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;

    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) {
        r = c;
        g = x;
    } else if (h < 120) {
        r = x;
        g = c;
    } else if (h < 180) {
        g = c;
        b = x;
    } else if (h < 240) {
        g = x;
        b = c;
    } else if (h < 300) {
        r = x;
        b = c;
    } else {
        r = c;
        b = x;
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

function rgba(c, a) {
    return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function mix(a, b, t) {
    return {
        r: Math.round(lerp(a.r, b.r, t)),
        g: Math.round(lerp(a.g, b.g, t)),
        b: Math.round(lerp(a.b, b.b, t))
    };
}

/* ============================================================
   RANDOM VISUAL INTENT

   These are not artwork templates.

   The generator creates a random combination of visual
   properties and then attempts to express those properties.
   ============================================================ */

function createIntent(r) {
    const intent = {
        representation: rand(r, 0, 1),
        abstraction: rand(r, 0, 1),
        organicity: rand(r, 0, 1),
        geometricity: rand(r, 0, 1),

        scale: rand(r, 0, 1),
        depth: rand(r, 0, 1),

        calmness: rand(r, 0, 1),
        tension: rand(r, 0, 1),

        density: rand(r, 0, 1),
        emptiness: rand(r, 0, 1),

        symmetry: rand(r, 0, 1),
        irregularity: rand(r, 0, 1),

        softness: rand(r, 0, 1),
        sharpness: rand(r, 0, 1),

        luminosity: rand(r, 0, 1),
        darkness: rand(r, 0, 1),

        atmospheric: rand(r, 0, 1),
        movement: rand(r, 0, 1),

        complexity: rand(r, 0, 1)
    };

    /*
        These relationships don't choose an image.

        They simply prevent the generated parameters from
        becoming completely meaningless noise.
    */

    const balance = r();

    if (balance < 0.5) {
        intent.representation *= 0.7;
        intent.abstraction = clamp(
            intent.abstraction + 0.2,
            0,
            1
        );
    } else {
        intent.representation = clamp(
            intent.representation + 0.25,
            0,
            1
        );
    }

    if (intent.representation > 0.65) {
        intent.depth =
            clamp(intent.depth + 0.2, 0, 1);

        intent.atmospheric =
            clamp(intent.atmospheric + 0.15, 0, 1);
    }

    if (intent.abstraction > 0.7) {
        intent.geometricity =
            clamp(intent.geometricity + rand(r, -0.2, 0.25), 0, 1);

        intent.complexity =
            clamp(intent.complexity + 0.2, 0, 1);
    }

    if (intent.organicity > 0.7) {
        intent.irregularity =
            clamp(intent.irregularity + 0.2, 0, 1);
    }

    return intent;
}

/* ============================================================
   RANDOM COMPOSITION

   No fixed thirds.
   No fixed focal point.
   No predefined layout.

   Three major visual masses are generated because the rule of
   thirds is used as a compositional tendency, not a template.
   ============================================================ */

function createComposition(r, intent) {
    const count = int(r, 3, 7);

    const masses = [];

    for (let i = 0; i < count; i++) {
        masses.push({
            x: rand(r, -0.15, 1.15),
            y: rand(r, -0.15, 1.15),

            scale: rand(
                r,
                0.04,
                0.38
            ),

            weight: rand(
                r,
                0.03,
                1
            ),

            rotation: rand(
                r,
                -Math.PI,
                Math.PI
            ),

            depth: rand(r, 0, 1),

            irregularity:
                rand(r, 0, 1),

            density:
                rand(r, 0.1, 1)
        });
    }

    /*
        Randomly establish three dominant relationships.

        Their positions remain completely random.
    */

    const dominantIndices = [];

    while (dominantIndices.length < 3) {
        const i = int(r, 0, masses.length - 1);

        if (!dominantIndices.includes(i)) {
            dominantIndices.push(i);
        }
    }

    for (let i = 0; i < dominantIndices.length; i++) {
        masses[dominantIndices[i]].weight =
            [0.55, 0.3, 0.15][i];
    }

    return {
        masses,

        horizon:
            r() < 0.55
                ? rand(r, 0.2, 0.8)
                : null,

        perspective:
            rand(r, -1, 1),

        globalRotation:
            rand(r, -Math.PI, Math.PI),

        asymmetry:
            rand(r, 0, 1),

        emptyBias:
            clamp(
                intent.emptiness +
                rand(r, -0.25, 0.25),
                0,
                1
            ),

        scale:
            rand(r, 0.7, 1.5)
    };
}

/* ============================================================
   COLOUR THEORY

   The harmony is generated mathematically.

   The exact colours are not predefined.
   ============================================================ */

function createPalette(r, intent) {
    const base = rand(r, 0, 360);

    const harmony = int(r, 0, 4);

    let offsets;

    if (harmony === 0) {
        const spread = rand(r, 15, 55);

        offsets = [
            -spread,
            0,
            spread
        ];
    } else if (harmony === 1) {
        offsets = [
            0,
            180 + rand(r, -18, 18),
            rand(r, -30, 30)
        ];
    } else if (harmony === 2) {
        offsets = [
            0,
            120 + rand(r, -18, 18),
            240 + rand(r, -18, 18)
        ];
    } else if (harmony === 3) {
        offsets = [
            0,
            150 + rand(r, -15, 15),
            210 + rand(r, -15, 15)
        ];
    } else {
        offsets = [
            0,
            90 + rand(r, -12, 12),
            180 + rand(r, -12, 12)
        ];
    }

    const colours = offsets.map(offset => ({
        h: base + offset,
        s: rand(
            r,
            25 + intent.luminosity * 20,
            85 + intent.sharpness * 15
        ),
        v: rand(
            r,
            20,
            75 + intent.luminosity * 25
        )
    }));

    const dark = hsv(
        base + rand(r, -30, 30),
        rand(r, 25, 75),
        rand(
            r,
            4,
            22 + intent.darkness * 15
        )
    );

    const light = hsv(
        base + rand(r, -30, 30),
        rand(r, 5, 35),
        rand(
            r,
            78,
            100
        )
    );

    return {
        harmony,
        base,
        colours,
        dark,
        light
    };
}

/* ============================================================
   MATHEMATICAL WORLD

   This is where the artwork actually comes from.
   ============================================================ */

function createWorld(r, intent) {
    return {
        frequencyA: rand(r, 0.001, 0.025),
        frequencyB: rand(r, 0.001, 0.02),
        frequencyC: rand(r, 0.0005, 0.015),

        amplitudeA: rand(r, 20, 400),
        amplitudeB: rand(r, 20, 350),
        amplitudeC: rand(r, 10, 250),

        phaseA: rand(r, 0, Math.PI * 2),
        phaseB: rand(r, 0, Math.PI * 2),
        phaseC: rand(r, 0, Math.PI * 2),

        warpA: rand(r, 0.1, 5),
        warpB: rand(r, 0.1, 5),
        warpC: rand(r, 0.1, 5),

        radialInfluence: rand(r, -2, 2),
        rotationalInfluence: rand(r, -4, 4),

        attraction: rand(r, -2, 2),
        repulsion: rand(r, -2, 2),

        turbulence: rand(r, 0, 5),

        noiseScale: rand(r, 0.001, 0.03),

        curvature: rand(r, -3, 3),

        perspectiveStrength:
            rand(r, -2, 2),

        grain:
            rand(r, 0.1, 3),

        organic:
            intent.organicity,

        geometric:
            intent.geometricity,

        depth:
            intent.depth,

        motion:
            intent.movement
    };
}

function field(x, y, world) {
    const cx = WIDTH * 0.5;
    const cy = HEIGHT * 0.5;

    const dx = x - cx;
    const dy = y - cy;

    const radius =
        Math.hypot(dx, dy);

    const angle =
        Math.atan2(dy, dx);

    const a =
        Math.sin(
            x * world.frequencyA +
            Math.sin(
                y * world.frequencyB *
                world.warpA
            ) +
            world.phaseA
        );

    const b =
        Math.cos(
            y * world.frequencyB +
            Math.sin(
                x * world.frequencyC *
                world.warpB
            ) +
            world.phaseB
        );

    const c =
        Math.sin(
            (x + y) *
            world.frequencyC *
            world.warpC +
            world.phaseC
        );

    const radial =
        Math.sin(
            radius *
            world.noiseScale *
            20
        );

    const rotation =
        Math.sin(
            angle *
            world.rotationalInfluence +
            radius *
            world.frequencyA
        );

    const curvature =
        Math.sin(
            Math.pow(
                Math.abs(dx) +
                Math.abs(dy),
                0.8
            ) *
            world.frequencyC
        );

    return (
        a * 0.25 +
        b * 0.25 +
        c * 0.18 +
        radial * world.radialInfluence * 0.15 +
        rotation * 0.1 +
        curvature * world.curvature * 0.07
    );
}

function warpPoint(x, y, world, amount) {
    const f1 = field(x, y, world);

    const f2 = field(
        x + 97,
        y - 53,
        world
    );

    const angle =
        f1 * Math.PI * 2 +
        f2 * world.rotationalInfluence;

    const strength =
        amount *
        (
            0.3 +
            Math.abs(f1)
        );

    return {
        x:
            x +
            Math.cos(angle) *
            strength,

        y:
            y +
            Math.sin(angle) *
            strength
    };
}

/* ============================================================
   POSITIONAL COLOUR
   ============================================================ */

function colourAt(x, y, world, palette) {
    const f =
        clamp(
            (field(x, y, world) + 1) * 0.5,
            0,
            1
        );

    const a = palette.colours[0];
    const b = palette.colours[1];
    const c = palette.colours[2];

    let hue;

    if (f < 0.5) {
        hue =
            lerp(
                a.h,
                b.h,
                f * 2
            );
    } else {
        hue =
            lerp(
                b.h,
                c.h,
                (f - 0.5) * 2
            );
    }

    const variation =
        field(
            x + 200,
            y + 400,
            world
        );

    hue += variation * 25;

    const saturation =
        clamp(
            lerp(
                a.s,
                c.s,
                f
            ) +
            variation * 12,
            5,
            100
        );

    const value =
        clamp(
            lerp(
                a.v,
                c.v,
                f
            ) +
            variation * 15,
            5,
            100
        );

    return hsv(
        hue,
        saturation,
        value
    );
}

/* ============================================================
   PARTICLES
   ============================================================ */

function addCircle(
    x,
    y,
    radius,
    colour,
    alpha,
    layer
) {
    if (
        x < -radius ||
        x > WIDTH + radius ||
        y < -radius ||
        y > HEIGHT + radius
    ) {
        return;
    }

    circles.push({
        x,
        y,
        radius,
        colour,
        alpha,
        layer
    });
}

/* ============================================================
   PROCEDURAL SCENE PAINTING
   ============================================================ */

function paintScene(
    r,
    world,
    composition,
    palette,
    intent
) {
    /*
        Large particles establish the broad structure.
    */

    const largeCount =
        Math.floor(
            9000 +
            intent.density * 8000
        );

    for (let i = 0; i < largeCount; i++) {
        const mass =
            composition.masses[
                int(
                    r,
                    0,
                    composition.masses.length - 1
                )
            ];

        let x =
            mass.x * WIDTH +
            rand(
                r,
                -mass.scale * WIDTH,
                mass.scale * WIDTH
            );

        let y =
            mass.y * HEIGHT +
            rand(
                r,
                -mass.scale * HEIGHT,
                mass.scale * HEIGHT
            );

        const warped =
            warpPoint(
                x,
                y,
                world,
                rand(
                    r,
                    20,
                    250
                )
            );

        x = warped.x;
        y = warped.y;

        const f =
            field(
                x,
                y,
                world
            );

        const probability =
            clamp(
                0.25 +
                mass.weight * 0.7 +
                f * 0.2,
                0,
                1
            );

        if (r() > probability) {
            continue;
        }

        const colour =
            colourAt(
                x,
                y,
                world,
                palette
            );

        const radius =
            Math.pow(
                r(),
                intent.softness + 0.7
            ) *
            (
                1 +
                intent.scale * 8
            );

        addCircle(
            x,
            y,
            radius,
            colour,
            rand(
                r,
                0.035,
                0.2
            ),
            1
        );
    }

    /*
        Medium particles provide structure and transitions.
    */

    const mediumCount =
        28000 +
        Math.floor(
            intent.complexity *
            18000
        );

    for (let i = 0; i < mediumCount; i++) {
        let x =
            rand(r, 0, WIDTH);

        let y =
            rand(r, 0, HEIGHT);

        const f =
            field(
                x,
                y,
                world
            );

        const warped =
            warpPoint(
                x,
                y,
                world,
                rand(r, 5, 100)
            );

        x = warped.x;
        y = warped.y;

        let localDensity =
            0.5 +
            f * 0.35;

        for (const mass of composition.masses) {
            const d =
                distance(
                    x,
                    y,
                    mass.x * WIDTH,
                    mass.y * HEIGHT
                );

            const influence =
                Math.exp(
                    -(
                        d * d
                    ) /
                    (
                        2 *
                        Math.pow(
                            mass.scale *
                            WIDTH,
                            2
                        )
                    )
                );

            localDensity +=
                influence *
                mass.weight;
        }

        if (
            r() >
            clamp(
                localDensity,
                0.02,
                1
            )
        ) {
            continue;
        }

        const colour =
            colourAt(
                x,
                y,
                world,
                palette
            );

        const radius =
            rand(
                r,
                0.4,
                3.5
            );

        addCircle(
            x,
            y,
            radius,
            colour,
            rand(
                r,
                0.025,
                0.17
            ),
            2
        );
    }

    /*
        Fine pigment.

        This is what makes dense areas stop looking like
        individual dots.
    */

    const fineCount =
        60000 +
        Math.floor(
            intent.density *
            40000
        );

    for (let i = 0; i < fineCount; i++) {
        const x =
            rand(r, 0, WIDTH);

        const y =
            rand(r, 0, HEIGHT);

        const f =
            field(
                x,
                y,
                world
            );

        if (
            r() >
            clamp(
                0.42 +
                f * 0.28,
                0.05,
                0.9
            )
        ) {
            continue;
        }

        const colour =
            colourAt(
                x,
                y,
                world,
                palette
            );

        addCircle(
            x,
            y,
            rand(
                r,
                0.15,
                1.35
            ),
            colour,
            rand(
                r,
                0.015,
                0.09
            ),
            3
        );
    }
}

/* ============================================================
   ATMOSPHERE / DEPTH
   ============================================================ */

function paintAtmosphere(
    r,
    world,
    palette,
    intent,
    composition
) {
    const amount =
        10000 +
        Math.floor(
            intent.atmospheric *
            16000
        );

    for (let i = 0; i < amount; i++) {
        let x =
            rand(r, -100, WIDTH + 100);

        let y =
            rand(r, -100, HEIGHT + 100);

        const depth =
            r();

        const scale =
            lerp(
                0.2,
                2.5,
                depth
            );

        const colour =
            depth < 0.5
                ? mix(
                    palette.dark,
                    palette.light,
                    depth * 0.5
                )
                : palette.light;

        addCircle(
            x,
            y,
            rand(
                r,
                0.1,
                scale
            ),
            colour,
            rand(
                r,
                0.005,
                0.035
            ) *
            intent.atmospheric,
            4
        );
    }
}

/* ============================================================
   LIGHT / ACCENTS
   ============================================================ */

function paintLight(
    r,
    world,
    palette,
    composition,
    intent
) {
    const amount =
        5000 +
        Math.floor(
            intent.luminosity *
            8000
        );

    for (let i = 0; i < amount; i++) {
        const mass =
            composition.masses[
                int(
                    r,
                    0,
                    composition.masses.length - 1
                )
            ];

        const spread =
            mass.scale *
            WIDTH;

        const angle =
            rand(
                r,
                0,
                Math.PI * 2
            );

        const radius =
            Math.pow(
                r(),
                1.8
            ) *
            spread;

        let x =
            mass.x * WIDTH +
            Math.cos(angle) * radius;

        let y =
            mass.y * HEIGHT +
            Math.sin(angle) * radius;

        const warped =
            warpPoint(
                x,
                y,
                world,
                radius * 0.25
            );

        x = warped.x;
        y = warped.y;

        const colour =
            palette.light;

        addCircle(
            x,
            y,
            rand(
                r,
                0.15,
                2
            ),
            colour,
            rand(
                r,
                0.01,
                0.12
            ) *
            intent.luminosity,
            5
        );
    }
}

/* ============================================================
   SELF-EVALUATION

   We don't identify objects here.

   We evaluate whether the mathematical composition has
   useful visual properties.
   ============================================================ */

function evaluateArtwork() {
    if (circles.length === 0) {
        return 0;
    }

    let densitySum = 0;
    let alphaSum = 0;

    const binsX = 12;
    const binsY = 9;

    const bins = new Array(
        binsX * binsY
    ).fill(0);

    for (const c of circles) {
        const bx =
            clamp(
                Math.floor(
                    c.x / WIDTH * binsX
                ),
                0,
                binsX - 1
            );

        const by =
            clamp(
                Math.floor(
                    c.y / HEIGHT * binsY
                ),
                0,
                binsY - 1
            );

        bins[
            by * binsX + bx
        ] += c.alpha;

        densitySum +=
            c.radius;

        alphaSum +=
            c.alpha;
    }

    let variation = 0;

    const mean =
        bins.reduce(
            (a, b) => a + b,
            0
        ) / bins.length;

    for (const value of bins) {
        variation +=
            Math.abs(
                value - mean
            );
    }

    variation /=
        bins.length;

    const densityScore =
        clamp(
            densitySum /
            circles.length /
            3,
            0,
            1
        );

    const variationScore =
        clamp(
            variation /
            Math.max(mean, 0.001),
            0,
            1
        );

    const opacityScore =
        clamp(
            alphaSum /
            circles.length /
            0.15,
            0,
            1
        );

    /*
        The generator favours images with:
        - variation
        - density
        - visible hierarchy
        - neither complete emptiness nor uniform noise
    */

    return (
        variationScore * 0.4 +
        densityScore * 0.3 +
        opacityScore * 0.3
    );
}

/* ============================================================
   TITLE

   Titles are generated after the image exists and don't
   influence its visual structure.
   ============================================================ */

function generateTitle(r, intent) {
    const wordsA = [
        "Between",
        "Beyond",
        "Inside",
        "Beneath",
        "Above",
        "Through",
        "Across",
        "Within",
        "Against",
        "Beyond",
        "After",
        "Before"
    ];

    const wordsB = [
        "Silence",
        "Distance",
        "Light",
        "Nothing",
        "Memory",
        "Motion",
        "Dreams",
        "Space",
        "Time",
        "Colour",
        "Rain",
        "Darkness",
        "Tomorrow",
        "The Unknown"
    ];

    const a =
        wordsA[
            int(
                r,
                0,
                wordsA.length - 1
            )
        ];

    const b =
        wordsB[
            int(
                r,
                0,
                wordsB.length - 1
            )
        ];

    return `${a} ${b}`;
}

/* ============================================================
   RENDER
   ============================================================ */

function drawBackground(palette) {
    ctx.fillStyle =
        rgba(
            palette.dark,
            1
        );

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );
}

function draw() {
    circles.sort(
        (a, b) =>
            a.layer -
            b.layer
    );

    for (const c of circles) {
        ctx.beginPath();

        ctx.arc(
            c.x,
            c.y,
            c.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            rgba(
                c.colour,
                c.alpha
            );

        ctx.fill();
    }
}

/* ============================================================
   GENERATION

   Several mathematical attempts are made.

   The strongest one is retained.

   This does NOT compare the result to existing artwork.
   ============================================================ */

function render(seed) {
    currentSeed = seed;

    let best = null;

    const attempts = 3;

    for (let attempt = 0; attempt < attempts; attempt++) {
        const attemptSeed =
            (
                seed +
                attempt *
                2654435761
            ) >>> 0;

        const r =
            rng(attemptSeed);

        const intent =
            createIntent(r);

        const composition =
            createComposition(
                r,
                intent
            );

        const world =
            createWorld(
                r,
                intent
            );

        const palette =
            createPalette(
                r,
                intent
            );

        circles = [];

        drawBackground(
            palette
        );

        paintScene(
            r,
            world,
            composition,
            palette,
            intent
        );

        paintAtmosphere(
            r,
            world,
            palette,
            intent,
            composition
        );

        paintLight(
            r,
            world,
            palette,
            composition,
            intent
        );

        const score =
            evaluateArtwork();

        if (
            best === null ||
            score > best.score
        ) {
            best = {
                score,
                circles: circles.slice(),
                intent,
                composition,
                world,
                palette
            };
        }
    }

    circles =
        best.circles;

    draw();

    const titleRandom =
        rng(
            (
                seed ^
                0x9E3779B9
            ) >>> 0
        );

    currentTitle =
        generateTitle(
            titleRandom,
            best.intent
        );

    titleEl.textContent =
        currentTitle;

    seedEl.textContent =
        `SEED: ${seed}`;

    compositionEl.textContent =
        `${best.circles.length.toLocaleString()} PARTICLES · ${Math.round(best.score * 100)}% STRUCTURAL COHERENCE`;

    paletteEl.textContent =
        `HARMONY ${best.palette.harmony + 1} · BASE ${Math.round(best.palette.base)}°`;

    circlesEl.textContent =
        `${circles.length.toLocaleString()} ORBS`;
}

/* ============================================================
   CONTROLS
   ============================================================ */

function generate() {
    render(
        randomSeed()
    );
}

function saveArtwork() {
    const link =
        document.createElement("a");

    link.download =
        `${currentTitle
            .replace(
                /[^a-z0-9]+/gi,
                "_"
            )}_${currentSeed}.png`;

    link.href =
        canvas.toDataURL(
            "image/png"
        );

    link.click();
}

generateBtn.addEventListener(
    "click",
    generate
);

saveBtn.addEventListener(
    "click",
    saveArtwork
);

render(
    randomSeed()
);

