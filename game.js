
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

const TAU = Math.PI * 2;

let activeSeed = 0;
let painting = false;
let paintTimer = null;

const state = {
    rng: null,
    idea: null,
    scene: null,
    palette: null,
    paint: [],
    strokes: [],
    stage: 0,
    stageProgress: 0,
    totalCircles: 0
};

function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function randomSeed() {
    return Math.floor(Math.random() * 2147483647);
}

function rand(min = 0, max = 1) {
    return min + state.rng() * (max - min);
}

function chance(p) {
    return state.rng() < p;
}

function pick(arr) {
    return arr[Math.floor(state.rng() * arr.length)];
}

function clamp(v, a = 0, b = 1) {
    return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function smooth(t) {
    return t * t * (3 - 2 * t);
}

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function hexToRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255
    };
}

function rgbToHex(r, g, b) {
    return "#" +
        [r, g, b]
            .map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0"))
            .join("");
}

function mixColor(a, b, t) {
    return {
        r: lerp(a.r, b.r, t),
        g: lerp(a.g, b.g, t),
        b: lerp(a.b, b.b, t)
    };
}

function adjustColor(c, amount) {
    return {
        r: clamp(c.r + amount, 0, 255),
        g: clamp(c.g + amount, 0, 255),
        b: clamp(c.b + amount, 0, 255)
    };
}

function rgba(c, alpha = 1) {
    return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${alpha})`;
}

function polar(x, y, angle, radius) {
    return {
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius
    };
}

function normalize(vx, vy) {
    const d = Math.hypot(vx, vy) || 1;
    return { x: vx / d, y: vy / d };
}

function rotatePoint(p, angle, cx, cy) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const x = p.x - cx;
    const y = p.y - cy;

    return {
        x: cx + x * c - y * s,
        y: cy + x * s + y * c
    };
}

function noise1D(x, seedOffset = 0) {
    const old = state.rng;
    const n = Math.sin(x * 127.1 + seedOffset * 311.7 + activeSeed * 0.0001) * 43758.5453;
    return n - Math.floor(n);
}

function smoothNoise(x, scale = 1, seedOffset = 0) {
    const p = x / scale;
    const i = Math.floor(p);
    const f = p - i;

    const a = noise1D(i, seedOffset);
    const b = noise1D(i + 1, seedOffset);

    return lerp(a, b, smooth(f));
}

function fbm(x, octaves = 5, scale = 100, offset = 0) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
        value += smoothNoise(x * frequency, scale, offset + i * 19.7) * amplitude;
        frequency *= 2;
        amplitude *= 0.5;
    }

    return value;
}

function weightedChoice(weights) {
    const total = weights.reduce((a, b) => a + b.weight, 0);
    let value = rand(0, total);

    for (const item of weights) {
        value -= item.weight;
        if (value <= 0) return item.value;
    }

    return weights[weights.length - 1].value;
}

/* =========================================================
   IDEA ENGINE
========================================================= */

function generateIdea() {
    const idea = {
        representation: rand(),
        abstraction: rand(),
        organicity: rand(),
        geometricity: rand(),
        symmetry: rand(),
        branching: rand(),
        enclosure: rand(),
        verticality: rand(),
        horizontality: rand(),
        repetition: rand(),
        depth: rand(),
        atmosphere: rand(),
        complexity: rand(),
        surfaceContinuity: rand(),
        volume: rand(),
        scaleVariation: rand(),
        darkness: rand(),
        quietness: rand(),
        tension: rand(),
        colorTemperature: rand(),
        perspective: rand()
    };

    if (idea.representation > 0.72) {
        idea.complexity = Math.max(idea.complexity, 0.65);
    }

    if (idea.organicity > 0.7) {
        idea.branching = Math.max(idea.branching, 0.55);
    }

    if (idea.depth > 0.7) {
        idea.perspective = Math.max(idea.perspective, 0.65);
    }

    return idea;
}

function inferVisualDirection(idea) {
    const directions = [];

    if (idea.horizontality > 0.65 && idea.depth > 0.5) {
        directions.push("landscape");
    }

    if (idea.symmetry > 0.68 && idea.enclosure > 0.45) {
        directions.push("figure");
    }

    if (idea.branching > 0.68 && idea.organicity > 0.58) {
        directions.push("organic_structure");
    }

    if (idea.geometricity > 0.7) {
        directions.push("constructed_form");
    }

    if (idea.abstraction > 0.72) {
        directions.push("abstract");
    }

    if (idea.surfaceContinuity > 0.7 && idea.depth > 0.5) {
        directions.push("environment");
    }

    if (!directions.length) {
        directions.push(
            weightedChoice([
                { value: "landscape", weight: 2 },
                { value: "organic_structure", weight: 2 },
                { value: "constructed_form", weight: 2 },
                { value: "abstract", weight: 1 }
            ])
        );
    }

    return pick(directions);
}

/* =========================================================
   PALETTE ENGINE
========================================================= */

function makePalette(idea) {
    const hue = rand(0, 360);
    const spread = rand(20, 75);
    const light = lerp(38, 62, 1 - idea.darkness);

    const schemes = [
        "analogous",
        "complementary",
        "split",
        "triadic",
        "earth",
        "monochrome"
    ];

    const scheme = pick(schemes);

    let hues;

    if (scheme === "analogous") {
        hues = [
            hue,
            hue + spread * 0.45,
            hue - spread * 0.35,
            hue + spread
        ];
    } else if (scheme === "complementary") {
        hues = [
            hue,
            hue + 180,
            hue + rand(-25, 25),
            hue + 180 + rand(-20, 20)
        ];
    } else if (scheme === "split") {
        hues = [
            hue,
            hue + 150,
            hue + 210,
            hue + rand(-15, 15)
        ];
    } else if (scheme === "triadic") {
        hues = [
            hue,
            hue + 120,
            hue + 240,
            hue + rand(-20, 20)
        ];
    } else if (scheme === "earth") {
        hues = [
            rand(20, 50),
            rand(35, 75),
            rand(80, 125),
            rand(5, 25)
        ];
    } else {
        hues = [
            hue,
            hue + rand(-8, 8),
            hue + rand(-15, 15),
            hue + rand(-25, 25)
        ];
    }

    const colors = hues.map((h, i) => {
        const saturation = lerp(20, 78, rand() * 0.8 + 0.2);
        const l = clamp(light + rand(-18, 18) - i * 3, 15, 82);

        return hslToRgb((h % 360 + 360) % 360, saturation, l);
    });

    const sky = colors[0];
    const shadow = adjustColor(colors[1], -35);
    const lightColor = adjustColor(colors[2], 35);
    const accent = colors[3];

    return {
        scheme,
        colors,
        sky,
        shadow,
        light: lightColor,
        accent
    };
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);

    const f = n =>
        l - a * Math.max(
            -1,
            Math.min(
                k(n) - 3,
                Math.min(9 - k(n), 1)
            )
        );

    return {
        r: f(0) * 255,
        g: f(8) * 255,
        b: f(4) * 255
    };
}

/* =========================================================
   SCENE / COMPOSITION ENGINE
========================================================= */

function createScene(idea) {
    const scene = {
        horizon: lerp(HEIGHT * 0.28, HEIGHT * 0.72, rand()),
        focal: {
            x: lerp(WIDTH * 0.22, WIDTH * 0.78, rand()),
            y: lerp(HEIGHT * 0.25, HEIGHT * 0.65, rand())
        },
        objects: [],
        mountains: [],
        trees: [],
        clouds: [],
        terrain: [],
        strokes: [],
        lights: [],
        geometry: []
    };

    const direction = inferVisualDirection(idea);
    scene.direction = direction;

    const thirds = [
        WIDTH / 3,
        WIDTH * 2 / 3
    ];

    if (chance(0.7)) {
        scene.focal.x = thirds[chance(0.5) ? 0 : 1] + rand(-100, 100);
    }

    if (direction === "landscape" || direction === "environment") {
        buildLandscape(scene, idea);
    }

    if (direction === "organic_structure") {
        buildOrganicScene(scene, idea);
    }

    if (direction === "constructed_form") {
        buildConstructedScene(scene, idea);
    }

    if (direction === "figure") {
        buildFigureScene(scene, idea);
    }

    if (direction === "abstract") {
        buildAbstractScene(scene, idea);
    }

    addAtmosphere(scene, idea);
    addLights(scene, idea);

    return scene;
}

/* =========================================================
   LANDSCAPE ENGINE
========================================================= */

function mountainProfile(baseY, amplitude, offset, roughness) {
    const points = [];
    const count = 80;

    for (let i = 0; i <= count; i++) {
        const x = i / count;
        const broad = fbm(x * 900 + offset, 5, 180, offset);
        const sharp = fbm(x * 900 + offset * 2, 4, 55, offset + 30);

        const mountain =
            Math.pow(broad, 1.2) * amplitude +
            sharp * amplitude * roughness;

        points.push({
            x: x * WIDTH,
            y: baseY - mountain
        });
    }

    return points;
}

function buildLandscape(scene, idea) {
    const mountainCount = Math.floor(2 + idea.complexity * 4);

    for (let i = 0; i < mountainCount; i++) {
        const depth = i / Math.max(1, mountainCount - 1);

        scene.mountains.push({
            points: mountainProfile(
                scene.horizon + lerp(40, 180, depth),
                lerp(80, 310, 1 - depth) * rand(0.75, 1.25),
                rand(0, 1000),
                rand(0.25, 0.9)
            ),
            depth,
            offset: rand(-100, 100)
        });
    }

    const treeCount = Math.floor(
        8 +
        idea.complexity * 35 +
        idea.organicity * 20
    );

    for (let i = 0; i < treeCount; i++) {
        const x = rand(-50, WIDTH + 50);

        const ground =
            scene.horizon +
            (HEIGHT - scene.horizon) *
            Math.pow(rand(), 1.6);

        const scale = lerp(0.35, 1.5, rand());

        scene.trees.push(
            createTree(
                x,
                ground,
                scale,
                rand(-0.15, 0.15),
                2 + Math.floor(rand(0, 4))
            )
        );
    }

    const cloudCount = Math.floor(3 + idea.atmosphere * 12);

    for (let i = 0; i < cloudCount; i++) {
        scene.clouds.push(
            createCloud(
                rand(-100, WIDTH + 100),
                rand(60, scene.horizon * 0.65),
                rand(45, 150),
                rand(15, 55)
            )
        );
    }

    createTerrain(scene, idea);
}

/* =========================================================
   TERRAIN ENGINE
========================================================= */

function createTerrain(scene, idea) {
    const rows = Math.floor(12 + idea.complexity * 24);
    const cols = 80;

    for (let r = 0; r < rows; r++) {
        const depth = r / rows;
        const y = lerp(scene.horizon + 10, HEIGHT + 40, depth);

        const row = [];

        for (let c = 0; c <= cols; c++) {
            const x = c / cols;

            const undulation =
                fbm(
                    x * 900 + r * 42,
                    4,
                    180,
                    r * 13
                );

            const perspective =
                Math.pow(depth, 1.4) * 40;

            row.push({
                x: x * WIDTH,
                y:
                    y +
                    (undulation - 0.5) *
                    perspective *
                    (0.4 + idea.surfaceContinuity)
            });
        }

        scene.terrain.push(row);
    }
}

/* =========================================================
   TREE / ORGANIC FORM ENGINE
========================================================= */

function createTree(x, y, scale, angle, generations) {
    const tree = {
        branches: [],
        x,
        y,
        scale
    };

    function branch(
        x1,
        y1,
        length,
        a,
        width,
        generation
    ) {
        if (generation <= 0) return;

        const bend = rand(-0.35, 0.35);

        const x2 =
            x1 +
            Math.cos(a + bend) * length;

        const y2 =
            y1 +
            Math.sin(a + bend) * length;

        tree.branches.push({
            x1,
            y1,
            x2,
            y2,
            width
        });

        const children = generation <= 2
            ? 2
            : Math.floor(rand(2, 4));

        for (let i = 0; i < children; i++) {
            const childAngle =
                a +
                rand(-1.15, 1.15);

            branch(
                x2,
                y2,
                length * rand(0.45, 0.78),
                childAngle,
                width * rand(0.48, 0.72),
                generation - 1
            );
        }
    }

    branch(
        x,
        y,
        100 * scale,
        -Math.PI / 2 + angle,
        16 * scale,
        generations
    );

    return tree;
}

function createCloud(x, y, width, height) {
    const lobes = [];
    const count = Math.floor(rand(4, 10));

    for (let i = 0; i < count; i++) {
        lobes.push({
            x: x + rand(-width * 0.45, width * 0.45),
            y: y + rand(-height * 0.35, height * 0.35),
            rx: rand(width * 0.15, width * 0.38),
            ry: rand(height * 0.35, height * 0.8)
        });
    }

    return { lobes };
}

/* =========================================================
   CONSTRUCTED FORM ENGINE
========================================================= */

function buildConstructedScene(scene, idea) {
    const cx = scene.focal.x;
    const cy = scene.focal.y;

    const width = lerp(80, 280, rand());
    const height = lerp(130, 360, rand());

    const levels = Math.floor(2 + idea.complexity * 7);

    const object = {
        x: cx,
        y: cy,
        width,
        height,
        levels,
        rotation: rand(-0.12, 0.12),
        parts: []
    };

    for (let i = 0; i < levels; i++) {
        const t = i / levels;

        object.parts.push({
            x: cx + rand(-width * 0.2, width * 0.2),
            y: cy + height * 0.5 - t * height,
            width: width * rand(0.45, 1),
            height: height / levels * rand(0.65, 1.2),
            rotation: rand(-0.12, 0.12),
            protrusions: Math.floor(rand(0, 4))
        });
    }

    scene.objects.push(object);

    const surrounding = Math.floor(3 + idea.complexity * 10);

    for (let i = 0; i < surrounding; i++) {
        scene.objects.push({
            x: rand(0, WIDTH),
            y: rand(scene.horizon, HEIGHT * 0.8),
            width: rand(25, 120),
            height: rand(40, 180),
            levels: Math.floor(rand(1, 4)),
            rotation: rand(-0.3, 0.3),
            parts: []
        });
    }
}

/* =========================================================
   FIGURE / FACE CONSTRUCTION ENGINE
========================================================= */

function buildFigureScene(scene, idea) {
    const cx = scene.focal.x;
    const cy = scene.focal.y;

    const headWidth = lerp(110, 260, rand());
    const headHeight = headWidth * lerp(1.05, 1.45, rand());

    const asymmetry = 1 - idea.symmetry;

    const face = {
        cx,
        cy,
        headWidth,
        headHeight,
        rotation: rand(-0.18, 0.18),
        features: []
    };

    const eyeY = cy - headHeight * rand(0.12, 0.22);
    const eyeSpacing = headWidth * rand(0.18, 0.3);

    face.features.push({
        type: "eye",
        x: cx - eyeSpacing + rand(-asymmetry * 18, asymmetry * 18),
        y: eyeY,
        size: rand(10, 28),
        side: -1
    });

    face.features.push({
        type: "eye",
        x: cx + eyeSpacing + rand(-asymmetry * 18, asymmetry * 18),
        y: eyeY + rand(-asymmetry * 10, asymmetry * 10),
        size: rand(10, 28),
        side: 1
    });

    face.features.push({
        type: "nose",
        x: cx + rand(-asymmetry * 35, asymmetry * 35),
        y: cy + rand(-5, 35),
        size: headHeight * rand(0.16, 0.28)
    });

    face.features.push({
        type: "mouth",
        x: cx + rand(-asymmetry * 30, asymmetry * 30),
        y: cy + headHeight * rand(0.25, 0.38),
        width: headWidth * rand(0.22, 0.42)
    });

    scene.objects.push({
        type: "face",
        ...face
    });
}

/* =========================================================
   ABSTRACT CONSTRUCTION ENGINE
========================================================= */

function buildAbstractScene(scene, idea) {
    const count = Math.floor(
        3 +
        idea.complexity * 18
    );

    for (let i = 0; i < count; i++) {
        const cx = rand(0, WIDTH);
        const cy = rand(0, HEIGHT);

        const points = [];
        const sides = Math.floor(rand(5, 18));
        const radius = rand(30, 250);

        for (let j = 0; j < sides; j++) {
            const a = j / sides * TAU;

            const r =
                radius *
                rand(0.45, 1.15) *
                (0.7 + fbm(j * 70 + i * 20, 3, 30, i));

            points.push(
                polar(cx, cy, a, r)
            );
        }

        scene.geometry.push({
            type: "blob",
            points,
            rotation: rand(-Math.PI, Math.PI)
        });
    }

    const lineCount = Math.floor(
        5 + idea.repetition * 40
    );

    for (let i = 0; i < lineCount; i++) {
        const points = [];

        let x = rand(0, WIDTH);
        let y = rand(0, HEIGHT);
        let angle = rand(0, TAU);

        const steps = Math.floor(rand(10, 60));

        for (let j = 0; j < steps; j++) {
            points.push({ x, y });

            angle += rand(-0.5, 0.5);

            x += Math.cos(angle) * rand(5, 30);
            y += Math.sin(angle) * rand(5, 30);
        }

        scene.strokes.push({
            points,
            width: rand(2, 12)
        });
    }
}

/* =========================================================
   ATMOSPHERE / LIGHT
========================================================= */

function addAtmosphere(scene, idea) {
    const count = Math.floor(
        3 + idea.atmosphere * 12
    );

    for (let i = 0; i < count; i++) {
        scene.geometry.push({
            type: "atmosphere",
            x: rand(0, WIDTH),
            y: rand(0, HEIGHT),
            radius: rand(80, 350),
            alpha: rand(0.01, 0.06)
        });
    }
}

function addLights(scene, idea) {
    const count = Math.floor(
        1 + rand(0, 3 + idea.complexity * 3)
    );

    for (let i = 0; i < count; i++) {
        scene.lights.push({
            x: rand(-WIDTH * 0.3, WIDTH * 1.3),
            y: rand(-HEIGHT * 0.3, HEIGHT * 0.8),
            radius: rand(200, 700),
            intensity: rand(0.3, 1),
            warm: rand()
        });
    }
}

/* =========================================================
   PAINTING PRIMITIVES
========================================================= */

function addCircle(x, y, radius, color, alpha = 1, depth = 0) {
    state.paint.push({
        x,
        y,
        radius,
        color,
        alpha,
        depth
    });
}

function sampleLine(a, b, density, color, radius, depth = 0) {
    const d = dist(a, b);
    const count = Math.max(1, Math.floor(d * density));

    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);

        addCircle(
            lerp(a.x, b.x, t) + rand(-radius, radius),
            lerp(a.y, b.y, t) + rand(-radius, radius),
            radius * rand(0.45, 1.1),
            color,
            rand(0.55, 1),
            depth
        );
    }
}

function paintPolygon(points, color, density, radius, depth = 0) {
    if (points.length < 3) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }

    const area =
        (maxX - minX) *
        (maxY - minY);

    const count = Math.floor(
        area * density
    );

    function inside(x, y) {
        let hit = false;

        for (
            let i = 0, j = points.length - 1;
            i < points.length;
            j = i++
        ) {
            const xi = points[i].x;
            const yi = points[i].y;
            const xj = points[j].x;
            const yj = points[j].y;

            const intersect =
                ((yi > y) !== (yj > y)) &&
                x <
                (xj - xi) *
                (y - yi) /
                (yj - yi) +
                xi;

            if (intersect) hit = !hit;
        }

        return hit;
    }

    for (let i = 0; i < count; i++) {
        const x = rand(minX, maxX);
        const y = rand(minY, maxY);

        if (inside(x, y)) {
            addCircle(
                x,
                y,
                radius * rand(0.5, 1.35),
                color,
                rand(0.45, 0.95),
                depth
            );
        }
    }
}

function paintCurve(points, color, radius, depth = 0) {
    for (let i = 1; i < points.length; i++) {
        sampleLine(
            points[i - 1],
            points[i],
            0.35,
            color,
            radius,
            depth
        );
    }
}

/* =========================================================
   BACKGROUND PAINT
========================================================= */

function paintBackground(scene, palette, idea) {
    const rows = 70;
    const rowHeight = HEIGHT / rows;

    for (let r = 0; r < rows; r++) {
        const t = r / rows;

        const skyColor = mixColor(
            palette.sky,
            palette.colors[1],
            t
        );

        const density = 0.15 + idea.complexity * 0.08;

        for (let i = 0; i < WIDTH * density; i++) {
            const x = rand(0, WIDTH);
            const y = r * rowHeight + rand(-4, 4);

            addCircle(
                x,
                y,
                rand(2, 8),
                adjustColor(
                    skyColor,
                    rand(-10, 10)
                ),
                rand(0.25, 0.8),
                0
            );
        }
    }
}

/* =========================================================
   MOUNTAIN PAINT
========================================================= */

function paintMountains(scene, palette, idea) {
    for (const mountain of scene.mountains) {
        const baseColor = mixColor(
            palette.colors[1],
            palette.shadow,
            mountain.depth
        );

        const litColor = mixColor(
            baseColor,
            palette.light,
            0.25 + idea.colorTemperature * 0.3
        );

        const darkColor = adjustColor(
            baseColor,
            -25
        );

        const points = mountain.points;

        const fillPoints = [
            ...points,
            { x: WIDTH, y: HEIGHT },
            { x: 0, y: HEIGHT }
        ];

        paintPolygon(
            fillPoints,
            baseColor,
            0.0015,
            rand(3, 7),
            mountain.depth
        );

        for (let i = 1; i < points.length; i++) {
            const p = points[i];

            const slope =
                points[i - 1].y - p.y;

            const color =
                slope > 0
                    ? litColor
                    : darkColor;

            addCircle(
                p.x + rand(-8, 8),
                p.y + rand(-4, 7),
                rand(3, 10),
                color,
                rand(0.5, 0.9),
                mountain.depth
            );
        }

        for (let i = 0; i < points.length - 1; i++) {
            if (chance(0.55)) {
                sampleLine(
                    points[i],
                    points[i + 1],
                    0.4,
                    chance(0.55)
                        ? litColor
                        : darkColor,
                    rand(2, 7),
                    mountain.depth
                );
            }
        }
    }
}

/* =========================================================
   TERRAIN PAINT
========================================================= */

function paintTerrain(scene, palette, idea) {
    for (let r = 0; r < scene.terrain.length; r++) {
        const row = scene.terrain[r];
        const depth = r / scene.terrain.length;

        const base =
            mixColor(
                palette.colors[1],
                palette.shadow,
                depth * 0.6
            );

        for (let i = 1; i < row.length; i++) {
            if (chance(0.8)) {
                const slope =
                    row[i - 1].y - row[i].y;

                let c = base;

                if (slope > 2) {
                    c = mixColor(
                        base,
                        palette.light,
                        0.25
                    );
                }

                sampleLine(
                    row[i - 1],
                    row[i],
                    0.12 + idea.complexity * 0.05,
                    c,
                    rand(2, 6),
                    depth
                );
            }
        }
    }
}

/* =========================================================
   TREE PAINT
========================================================= */

function paintTrees(scene, palette, idea) {
    for (const tree of scene.trees) {
        const trunk = mixColor(
            palette.shadow,
            palette.colors[2],
            0.3
        );

        for (const branch of tree.branches) {
            sampleLine(
                { x: branch.x1, y: branch.y1 },
                { x: branch.x2, y: branch.y2 },
                0.4,
                trunk,
                Math.max(
                    1.5,
                    branch.width * 0.22
                ),
                0.2
            );

            if (branch.width < 5) {
                for (let i = 0; i < 3; i++) {
                    addCircle(
                        branch.x2 + rand(-12, 12),
                        branch.y2 + rand(-12, 12),
                        rand(5, 14),
                        mixColor(
                            palette.colors[2],
                            palette.accent,
                            rand()
                        ),
                        rand(0.25, 0.75),
                        0.1
                    );
                }
            }
        }
    }
}

/* =========================================================
   CLOUD PAINT
========================================================= */

function paintClouds(scene, palette, idea) {
    const cloudColor = mixColor(
        palette.colors[0],
        { r: 240, g: 240, b: 235 },
        0.6
    );

    for (const cloud of scene.clouds) {
        for (const lobe of cloud.lobes) {
            const count = Math.floor(
                lobe.rx * lobe.ry * 0.05
            );

            for (let i = 0; i < count; i++) {
                const a = rand(0, TAU);
                const r = Math.sqrt(rand());

                addCircle(
                    lobe.x +
                        Math.cos(a) *
                        lobe.rx *
                        r,
                    lobe.y +
                        Math.sin(a) *
                        lobe.ry *
                        r,
                    rand(3, 12),
                    adjustColor(
                        cloudColor,
                        rand(-12, 12)
                    ),
                    rand(0.1, 0.5),
                    0
                );
            }
        }
    }
}

/* =========================================================
   CONSTRUCTED OBJECT PAINT
========================================================= */

function paintConstructed(scene, palette, idea) {
    for (const object of scene.objects) {
        if (object.type === "face") {
            paintFace(object, palette, idea);
            continue;
        }

        const base = palette.colors[
            Math.floor(rand(0, palette.colors.length))
        ];

        if (object.parts.length) {
            for (const part of object.parts) {
                const points = [
                    { x: part.x - part.width / 2, y: part.y },
                    { x: part.x + part.width / 2, y: part.y },
                    {
                        x: part.x + part.width / 2,
                        y: part.y + part.height
                    },
                    {
                        x: part.x - part.width / 2,
                        y: part.y + part.height
                    }
                ];

                const rotated = points.map(p =>
                    rotatePoint(
                        p,
                        part.rotation,
                        part.x,
                        part.y
                    )
                );

                paintPolygon(
                    rotated,
                    base,
                    0.006,
                    rand(2, 7),
                    0.3
                );

                for (let p = 0; p < part.protrusions; p++) {
                    const edge =
                        pick(rotated);

                    addCircle(
                        edge.x,
                        edge.y,
                        rand(5, 20),
                        palette.accent,
                        rand(0.4, 0.9),
                        0.2
                    );
                }
            }
        } else {
            const points = [
                {
                    x: object.x - object.width / 2,
                    y: object.y
                },
                {
                    x: object.x + object.width / 2,
                    y: object.y
                },
                {
                    x: object.x + object.width / 2,
                    y: object.y + object.height
                },
                {
                    x: object.x - object.width / 2,
                    y: object.y + object.height
                }
            ];

            paintPolygon(
                points,
                base,
                0.008,
                rand(2, 7),
                0.4
            );
        }
    }
}

/* =========================================================
   FACE PAINT
========================================================= */

function paintFace(face, palette, idea) {
    const skin = mixColor(
        palette.colors[2],
        palette.light,
        0.5
    );

    const shadow = mixColor(
        skin,
        palette.shadow,
        0.55
    );

    const headPoints = [];

    const segments = 64;

    for (let i = 0; i < segments; i++) {
        const a = i / segments * TAU;

        const vertical =
            Math.sin(a) *
            face.headHeight *
            0.5;

        const horizontal =
            Math.cos(a) *
            face.headWidth *
            0.5;

        headPoints.push({
            x:
                face.cx +
                horizontal *
                (0.92 + rand(-0.04, 0.04)),
            y:
                face.cy +
                vertical *
                (0.96 + rand(-0.04, 0.04))
        });
    }

    paintPolygon(
        headPoints,
        skin,
        0.007,
        3.5,
        0.4
    );

    for (const feature of face.features) {
        if (feature.type === "eye") {
            for (let i = 0; i < 90; i++) {
                const a = rand(0, TAU);
                const r = Math.sqrt(rand());

                addCircle(
                    feature.x +
                        Math.cos(a) *
                        feature.size *
                        1.7 *
                        r,
                    feature.y +
                        Math.sin(a) *
                        feature.size *
                        0.55 *
                        r,
                    rand(1.5, 4),
                    palette.shadow,
                    rand(0.5, 1),
                    0.1
                );
            }
        }

        if (feature.type === "nose") {
            const points = [];

            for (let i = 0; i < 14; i++) {
                points.push({
                    x:
                        feature.x +
                        rand(-feature.size * 0.25, feature.size * 0.25),
                    y:
                        feature.y +
                        i / 13 * feature.size
                });
            }

            paintCurve(
                points,
                shadow,
                rand(2, 5),
                0.1
            );
        }

        if (feature.type === "mouth") {
            const points = [];

            for (let i = 0; i < 18; i++) {
                const t = i / 17;

                points.push({
                    x:
                        feature.x +
                        (t - 0.5) *
                        feature.width,
                    y:
                        feature.y +
                        Math.sin(t * Math.PI) *
                        rand(-5, 5)
                });
            }

            paintCurve(
                points,
                palette.shadow,
                rand(2, 5),
                0.1
            );
        }
    }
}

/* =========================================================
   ABSTRACT PAINT
========================================================= */

function paintAbstract(scene, palette) {
    for (const geometry of scene.geometry) {
        if (geometry.type !== "blob") continue;

        paintPolygon(
            geometry.points,
            pick(palette.colors),
            0.0035,
            rand(2, 8),
            rand(0.1, 0.8)
        );
    }

    for (const stroke of scene.strokes) {
        paintCurve(
            stroke.points,
            pick(palette.colors),
            stroke.width,
            rand(0.2, 0.8)
        );
    }
}

/* =========================================================
   LIGHTING PASS
========================================================= */

function applyLighting(scene, palette, idea) {
    const source = scene.lights[0];

    if (!source) return;

    for (const p of state.paint) {
        const dx = source.x - p.x;
        const dy = source.y - p.y;
        const d = Math.hypot(dx, dy);

        const light =
            clamp(
                1 -
                d / source.radius
            ) *
            source.intensity;

        const amount =
            (light - 0.35) *
            35;

        p.color = adjustColor(
            p.color,
            amount
        );

        if (source.warm > 0.5 && light > 0.25) {
            p.color = mixColor(
                p.color,
                {
                    r: 255,
                    g: 185,
                    b: 120
                },
                light * 0.12
            );
        }
    }
}

/* =========================================================
   DETAIL PASS
========================================================= */

function addDetails(scene, palette, idea) {
    const detailCount = Math.floor(
        800 +
        idea.complexity * 6000
    );

    for (let i = 0; i < detailCount; i++) {
        let x;
        let y;

        if (scene.focal) {
            x = lerp(
                scene.focal.x - WIDTH * 0.45,
                scene.focal.x + WIDTH * 0.45,
                rand()
            );

            y = lerp(
                scene.focal.y - HEIGHT * 0.45,
                scene.focal.y + HEIGHT * 0.45,
                rand()
            );
        } else {
            x = rand(0, WIDTH);
            y = rand(0, HEIGHT);
        }

        const nearest =
            state.paint.length
                ? state.paint[
                    Math.floor(
                        rand(0, state.paint.length)
                    )
                ]
                : null;

        const color = nearest
            ? adjustColor(
                nearest.color,
                rand(-15, 15)
            )
            : pick(palette.colors);

        addCircle(
            x,
            y,
            rand(
                0.8,
                3.8
            ),
            color,
            rand(0.08, 0.38),
            rand(0.4, 1)
        );
    }
}

/* =========================================================
   SELF EVALUATION
========================================================= */

function evaluateArtwork() {
    if (!state.paint.length) return 0;

    let densityVariance = 0;
    let averageRadius = 0;

    for (const p of state.paint) {
        averageRadius += p.radius;
    }

    averageRadius /= state.paint.length;

    const sampleCount = Math.min(
        5000,
        state.paint.length
    );

    const bins = new Array(36).fill(0);

    for (let i = 0; i < sampleCount; i++) {
        const p =
            state.paint[
                Math.floor(
                    rand(0, state.paint.length)
                )
            ];

        const bx = Math.floor(
            clamp(
                p.x / WIDTH,
                0,
                0.999
            ) * 6
        );

        const by = Math.floor(
            clamp(
                p.y / HEIGHT,
                0,
                0.999
            ) * 6
        );

        bins[by * 6 + bx]++;
    }

    const mean =
        sampleCount / bins.length;

    for (const b of bins) {
        densityVariance +=
            Math.abs(b - mean);
    }

    densityVariance /=
        sampleCount;

    const radiusScore =
        clamp(
            averageRadius / 8,
            0,
            1
        );

    const densityScore =
        1 - clamp(
            densityVariance,
            0,
            1
        );

    return (
        densityScore * 0.55 +
        radiusScore * 0.45
    );
}

/* =========================================================
   PAINT STAGES
========================================================= */

function prepareArtwork() {
    state.paint = [];
    state.strokes = [];
    state.totalCircles = 0;

    state.idea = generateIdea();
    state.palette = makePalette(state.idea);
    state.scene = createScene(state.idea);

    titleEl.textContent =
        generateTitle(state.idea, state.scene);

    compositionEl.textContent =
        describeComposition(
            state.idea,
            state.scene
        );

    paletteEl.textContent =
        state.palette.scheme.toUpperCase();

    seedEl.textContent =
        activeSeed;

    circlesEl.textContent = "0";

    ctx.fillStyle = "#050505";
    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );
}

function generateTitle(idea, scene) {
    const words = [
        "Silent",
        "Forgotten",
        "Endless",
        "Distant",
        "Hollow",
        "Hidden",
        "Fading",
        "Strange",
        "Quiet",
        "Unknown",
        "Dreaming",
        "Ancient",
        "Solitary",
        "Unfamiliar",
        "Weightless"
    ];

    const nouns = [
        "Horizon",
        "Valley",
        "Structure",
        "Figure",
        "Garden",
        "Passage",
        "Mountain",
        "Landscape",
        "Form",
        "World",
        "Memory",
        "Place",
        "Object",
        "Sky",
        "Terrain"
    ];

    return `${pick(words)} ${pick(nouns)}`;
}

function describeComposition(idea, scene) {
    const parts = [];

    if (idea.depth > 0.6) {
        parts.push("deep spatial layering");
    }

    if (idea.symmetry > 0.7) {
        parts.push("strong bilateral balance");
    }

    if (idea.branching > 0.65) {
        parts.push("branching organic structures");
    }

    if (idea.horizontality > 0.65) {
        parts.push("broad horizontal masses");
    }

    if (idea.verticality > 0.65) {
        parts.push("strong vertical movement");
    }

    if (idea.atmosphere > 0.65) {
        parts.push("atmospheric depth");
    }

    if (!parts.length) {
        parts.push("asymmetrical visual balance");
    }

    return parts.slice(0, 3).join(" · ");
}

/* =========================================================
   REAL-TIME RENDERING
========================================================= */

function clearCanvas() {
    ctx.fillStyle = "#050505";
    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );
}

function renderVisiblePaint(count) {
    clearCanvas();

    const visible =
        state.paint.slice(
            0,
            Math.min(
                count,
                state.paint.length
            )
        );

    visible.sort(
        (a, b) =>
            a.depth - b.depth
    );

    for (const p of visible) {
        ctx.beginPath();

        ctx.globalAlpha =
            clamp(p.alpha, 0, 1);

        ctx.fillStyle =
            rgba(p.color, 1);

        ctx.arc(
            p.x,
            p.y,
            p.radius,
            0,
            TAU
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;

    circlesEl.textContent =
        visible.length.toLocaleString();
}

function runStage(index) {
    state.stage = index;

    if (index === 0) {
        state.paint = [];

        paintBackground(
            state.scene,
            state.palette,
            state.idea
        );
    }

    if (index === 1) {
        paintClouds(
            state.scene,
            state.palette,
            state.idea
        );

        paintMountains(
            state.scene,
            state.palette,
            state.idea
        );
    }

    if (index === 2) {
        paintTerrain(
            state.scene,
            state.palette,
            state.idea
        );

        paintTrees(
            state.scene,
            state.palette,
            state.idea
        );

        paintConstructed(
            state.scene,
            state.palette,
            state.idea
        );

        paintAbstract(
            state.scene,
            state.palette
        );
    }

    if (index === 3) {
        applyLighting(
            state.scene,
            state.palette,
            state.idea
        );

        addDetails(
            state.scene,
            state.palette,
            state.idea
        );
    }

    if (index === 4) {
        addDetails(
            state.scene,
            state.palette,
            {
                ...state.idea,
                complexity: Math.min(
                    1,
                    state.idea.complexity + 0.35
                )
            }
        );
    }
}

function animatePainting() {
    if (!painting) return;

    const stages = 5;

    if (state.stage >= stages) {
        painting = false;

        renderVisiblePaint(
            state.paint.length
        );

        evaluateArtwork();

        return;
    }

    runStage(state.stage);

    const start =
        state.totalCircles;

    const end =
        state.paint.length;

    const duration =
        state.stage === 0
            ? 1100
            : state.stage === 1
                ? 1300
                : state.stage === 2
                    ? 1700
                    : 1800;

    const startTime =
        performance.now();

    function frame(now) {
        if (!painting) return;

        const progress =
            clamp(
                (now - startTime) /
                duration,
                0,
                1
            );

        const eased =
            smooth(progress);

        const count =
            Math.floor(
                start +
                (end - start) *
                eased
            );

        renderVisiblePaint(count);

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            state.totalCircles =
                end;

            state.stage++;

            setTimeout(
                animatePainting,
                120
            );
        }
    }

    requestAnimationFrame(frame);
}

/* =========================================================
   GENERATION
========================================================= */

function generateArtwork(seed = randomSeed()) {
    if (painting) {
        painting = false;

        if (paintTimer) {
            clearTimeout(paintTimer);
        }
    }

    activeSeed = seed >>> 0;
    state.rng = mulberry32(
        activeSeed
    );

    prepareArtwork();

    painting = true;
    state.stage = 0;
    state.totalCircles = 0;

    animatePainting();
}

/* =========================================================
   SAVE
========================================================= */

function saveArtwork() {
    const link =
        document.createElement("a");

    const safeTitle =
        titleEl.textContent
            .replace(/[^a-z0-9]+/gi, "_")
            .replace(/^_+|_+$/g, "");

    link.download =
        `${safeTitle}_${activeSeed}.png`;

    link.href =
        canvas.toDataURL("image/png");

    link.click();
}

/* =========================================================
   UI
========================================================= */

generateBtn.addEventListener(
    "click",
    () => {
        generateArtwork();
    }
);

saveBtn.addEventListener(
    "click",
    saveArtwork
);

generateArtwork();
