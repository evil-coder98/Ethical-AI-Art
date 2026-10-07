const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const titleElement = document.getElementById("title");
const seedElement = document.getElementById("seed");
const compositionElement = document.getElementById("composition");
const paletteElement = document.getElementById("palette");
const circlesElement = document.getElementById("circles");
const TAU = Math.PI * 2;
const WIDTH = 1200;
const HEIGHT = 900;
let currentArtwork = null;
function randomSeed() {
    return Math.floor(Math.random() * 2147483647);
}
function createRandom(seed) {
    let value = seed >>> 0;
    return function () {
        value += 0x6D2B79F5;
        let t = value;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function randomRange(random, min, max) {
    return min + random() * (max - min);
}
function randomInt(random, min, max) {
    return Math.floor(randomRange(random, min, max + 1));
}
function chance(random, amount) {
    return random() < amount;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
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
function mixColor(a, b, amount) {
    return {
        r: Math.round(lerp(a.r, b.r, amount)),
        g: Math.round(lerp(a.g, b.g, amount)),
        b: Math.round(lerp(a.b, b.b, amount))
    };
}
function multiplyColor(color, amount) {
    return {
        r: clamp(Math.round(color.r * amount), 0, 255),
        g: clamp(Math.round(color.g * amount), 0, 255),
        b: clamp(Math.round(color.b * amount), 0, 255)
    };
}
function rgbString(color, alpha) {
    return `rgba(${color.r},${color.g},${color.b},${alpha})`;
}
function makePalette(random) {
    const baseHue = randomRange(random, 0, 360);
    const modes = [
        "ANALOGOUS",
        "COMPLEMENTARY",
        "TRIADIC",
        "SPLIT-COMPLEMENTARY",
        "TETRADIC",
        "MONOCHROMATIC",
        "CHAOTIC HARMONY"
    ];
    const mode = modes[randomInt(random, 0, modes.length - 1)];
    let hues;
    if (mode === "ANALOGOUS") {
        hues = [
            baseHue - 38,
            baseHue - 18,
            baseHue,
            baseHue + 18,
            baseHue + 38
        ];
    } else if (mode === "COMPLEMENTARY") {
        hues = [
            baseHue,
            baseHue + 12,
            baseHue - 12,
            baseHue + 180,
            baseHue + 192
        ];
    } else if (mode === "TRIADIC") {
        hues = [
            baseHue,
            baseHue + 120,
            baseHue + 240,
            baseHue + 120,
            baseHue
        ];
    } else if (mode === "SPLIT-COMPLEMENTARY") {
        hues = [
            baseHue,
            baseHue + 150,
            baseHue + 210,
            baseHue + 25,
            baseHue - 25
        ];
    } else if (mode === "TETRADIC") {
        hues = [
            baseHue,
            baseHue + 90,
            baseHue + 180,
            baseHue + 270,
            baseHue + 45
        ];
    } else if (mode === "MONOCHROMATIC") {
        hues = [
            baseHue,
            baseHue,
            baseHue,
            baseHue,
            baseHue
        ];
    } else {
        hues = [
            baseHue,
            baseHue + randomRange(random, 25, 80),
            baseHue + randomRange(random, 100, 180),
            baseHue + randomRange(random, 190, 270),
            baseHue + randomRange(random, 280, 350)
        ];
    }
    const colors = hues.map((hue, index) => {
        const saturation = index === 0
            ? randomRange(random, 0.28, 0.55)
            : randomRange(random, 0.35, 0.95);
        const value = index === 0
            ? randomRange(random, 0.08, 0.24)
            : randomRange(random, 0.35, 1);
        return hsvToRgb(hue, saturation, value);
    });
    const background = chance(random, 0.72)
        ? mixColor(colors[0], { r: 0, g: 0, b: 0 }, randomRange(random, 0.35, 0.8))
        : hsvToRgb(randomRange(random, 0, 360), 0.1, 0.06);
    return {
        name: mode,
        colors,
        background
    };
}
function createComposition(random) {
    const modes = [
        "RULE OF THIRDS",
        "GOLDEN SPIRAL",
        "DIAGONAL TENSION",
        "RADIAL BALANCE",
        "ASYMMETRICAL BALANCE",
        "CENTRAL GRAVITY",
        "EDGE DOMINANCE",
        "NEGATIVE SPACE",
        "CONTROLLED CHAOS"
    ];
    const mode = modes[randomInt(random, 0, modes.length - 1)];
    const thirds = [
        [WIDTH * 0.333, HEIGHT * 0.333],
        [WIDTH * 0.666, HEIGHT * 0.333],
        [WIDTH * 0.333, HEIGHT * 0.666],
        [WIDTH * 0.666, HEIGHT * 0.666]
    ];
    let focal;
    if (mode === "CENTRAL GRAVITY") {
        focal = {
            x: WIDTH * 0.5 + randomRange(random, -80, 80),
            y: HEIGHT * 0.5 + randomRange(random, -80, 80)
        };
    } else if (mode === "EDGE DOMINANCE") {
        const side = randomInt(random, 0, 3);
        focal = side === 0
            ? { x: randomRange(random, 70, 220), y: randomRange(random, 100, 800) }
            : side === 1
                ? { x: randomRange(random, 980, 1130), y: randomRange(random, 100, 800) }
                : side === 2
                    ? { x: randomRange(random, 100, 1100), y: randomRange(random, 60, 190) }
                    : { x: randomRange(random, 100, 1100), y: randomRange(random, 710, 840) };
    } else {
        const point = thirds[randomInt(random, 0, thirds.length - 1)];
        focal = {
            x: point[0] + randomRange(random, -150, 150),
            y: point[1] + randomRange(random, -130, 130)
        };
    }
    return {
        mode,
        focalX: clamp(focal.x, 80, WIDTH - 80),
        focalY: clamp(focal.y, 80, HEIGHT - 80),
        symmetry: randomRange(random, 0, 0.35),
        tension: randomRange(random, 0.2, 1),
        negativeSpace: randomRange(random, 0.08, 0.55),
        rhythm: randomRange(random, 0.25, 1),
        scaleVariation: randomRange(random, 0.6, 1.8)
    };
}
function makeCircle(x, y, radius, color, alpha, layer) {
    return {
        x,
        y,
        radius,
        color,
        alpha,
        layer
    };
}
function addCircle(circles, x, y, radius, color, alpha, layer) {
    circles.push(makeCircle(x, y, radius, color, alpha, layer));
}
function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function paintGradient(random, palette, circles) {
    const spacing = 5;
    for (let y = 0; y < HEIGHT; y += spacing) {
        const progress = y / HEIGHT;
        const upper = palette.background;
        const lower = mixColor(
            palette.background,
            palette.colors[0],
            0.18
        );
        const base = mixColor(upper, lower, progress);
        for (let x = 0; x < WIDTH; x += spacing) {
            const variation = randomRange(random, 0.82, 1.18);
            addCircle(
                circles,
                x + randomRange(random, -3, 3),
                y + randomRange(random, -3, 3),
                randomRange(random, 2.5, 5.5),
                multiplyColor(base, variation),
                randomRange(random, 0.12, 0.24),
                0
            );
        }
    }
}
function paintAtmosphere(random, palette, circles) {
    const count = 14000;
    for (let i = 0; i < count; i++) {
        const x = randomRange(random, 0, WIDTH);
        const y = randomRange(random, 0, HEIGHT);
        const color = palette.colors[randomInt(random, 0, 4)];
        addCircle(
            circles,
            x,
            y,
            randomRange(random, 1, 4),
            color,
            randomRange(random, 0.025, 0.11),
            2
        );
    }
}
function paintBlob(random, cx, cy, radius, color, circles, layer, irregularity = 0.5) {
    const count = Math.floor(radius * 3.4);
    for (let i = 0; i < count; i++) {
        const angle = randomRange(random, 0, TAU);
        const distanceFromCenter = Math.pow(random(), 0.52) * radius;
        const wave =
            Math.sin(angle * randomRange(random, 2, 7)) *
            radius *
            irregularity *
            0.15;
        const r = Math.max(
            1.5,
            randomRange(random, radius * 0.018, radius * 0.065)
        );
        const x =
            cx +
            Math.cos(angle) * (distanceFromCenter + wave);
        const y =
            cy +
            Math.sin(angle) * (distanceFromCenter + wave);
        addCircle(
            circles,
            x,
            y,
            r,
            color,
            randomRange(random, 0.12, 0.52),
            layer
        );
    }
}
function paintOrb(random, x, y, radius, color, circles, layer) {
    const count = Math.floor(radius * 7);
    for (let i = 0; i < count; i++) {
        const angle = randomRange(random, 0, TAU);
        const d = Math.sqrt(random()) * radius;
        const shade = randomRange(random, 0.75, 1.15);
        addCircle(
            circles,
            x + Math.cos(angle) * d,
            y + Math.sin(angle) * d,
            randomRange(random, 1.5, 7),
            multiplyColor(color, shade),
            randomRange(random, 0.25, 0.85),
            layer
        );
    }
    const glowCount = Math.floor(radius * 5);
    for (let i = 0; i < glowCount; i++) {
        const angle = randomRange(random, 0, TAU);
        const d = randomRange(random, radius, radius * 2.8);
        addCircle(
            circles,
            x + Math.cos(angle) * d,
            y + Math.sin(angle) * d,
            randomRange(random, 2, 8),
            color,
            randomRange(random, 0.015, 0.08),
            layer - 1
        );
    }
}
function paintSpiral(random, center, radius, color, circles, layer) {
    const turns = randomRange(random, 1.5, 4.5);
    const count = randomInt(random, 500, 1200);
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * TAU * turns;
        const d = t * radius;
        const wobble =
            Math.sin(t * TAU * randomRange(random, 2, 6)) *
            radius *
            0.04;
        addCircle(
            circles,
            center.x + Math.cos(angle) * (d + wobble),
            center.y + Math.sin(angle) * (d + wobble),
            randomRange(random, 2, 7) * (1 - t * 0.5),
            color,
            randomRange(random, 0.08, 0.5),
            layer
        );
    }
}
function paintRibbon(random, start, end, color, circles, layer) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(length / 4);
    const normalX = -dy / length;
    const normalY = dx / length;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const x = lerp(start.x, end.x, t);
        const y = lerp(start.y, end.y, t);
        const wave =
            Math.sin(t * TAU * randomRange(random, 1, 5)) *
            randomRange(random, 20, 80);
        const px = x + normalX * wave;
        const py = y + normalY * wave;
        const width = randomRange(random, 8, 28);
        for (let j = 0; j < randomInt(random, 2, 7); j++) {
            addCircle(
                circles,
                px + randomRange(random, -width, width),
                py + randomRange(random, -width, width),
                randomRange(random, 2, 8),
                color,
                randomRange(random, 0.08, 0.42),
                layer
            );
        }
    }
}
function paintGeometricForm(random, x, y, size, color, circles, layer) {
    const type = randomInt(random, 0, 4);
    if (type === 0) {
        const points = randomInt(random, 5, 9);
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * TAU + randomRange(random, -0.2, 0.2);
            const radius = size * randomRange(random, 0.65, 1);
            paintRibbon(
                random,
                {
                    x,
                    y
                },
                {
                    x: x + Math.cos(angle) * radius,
                    y: y + Math.sin(angle) * radius
                },
                color,
                circles,
                layer
            );
        }
    } else if (type === 1) {
        for (let i = 0; i < 1800; i++) {
            const angle = randomRange(random, 0, TAU);
            const d = randomRange(random, size * 0.65, size);
            addCircle(
                circles,
                x + Math.cos(angle) * d,
                y + Math.sin(angle) * d,
                randomRange(random, 2, 7),
                color,
                randomRange(random, 0.1, 0.4),
                layer
            );
        }
    } else if (type === 2) {
        const angle = randomRange(random, 0, TAU);
        const length = size * randomRange(random, 1.3, 2.2);
        paintRibbon(
            random,
            {
                x: x - Math.cos(angle) * length * 0.5,
                y: y - Math.sin(angle) * length * 0.5
            },
            {
                x: x + Math.cos(angle) * length * 0.5,
                y: y + Math.sin(angle) * length * 0.5
            },
            color,
            circles,
            layer
        );
    } else if (type === 3) {
        const rings = randomInt(random, 3, 9);
        for (let ring = 0; ring < rings; ring++) {
            const ringRadius = size * (ring + 1) / rings;
            for (let i = 0; i < ringRadius * 2; i++) {
                const angle = i / (ringRadius * 2) * TAU;
                addCircle(
                    circles,
                    x + Math.cos(angle) * ringRadius,
                    y + Math.sin(angle) * ringRadius,
                    randomRange(random, 2, 6),
                    color,
                    randomRange(random, 0.12, 0.4),
                    layer
                );
            }
        }
    } else {
        const count = Math.floor(size * 5);
        for (let i = 0; i < count; i++) {
            const t = random();
            addCircle(
                circles,
                x + randomRange(random, -size, size),
                y + randomRange(random, -size, size),
                randomRange(random, 2, 8),
                color,
                randomRange(random, 0.08, 0.45),
                layer
            );
        }
    }
}
function paintOrganicForm(random, x, y, size, color, circles, layer) {
    const lobes = randomInt(random, 3, 9);
    for (let i = 0; i < lobes; i++) {
        const angle = (i / lobes) * TAU;
        const distanceFromCenter = randomRange(random, size * 0.2, size * 0.65);
        const px = x + Math.cos(angle) * distanceFromCenter;
        const py = y + Math.sin(angle) * distanceFromCenter;
        paintBlob(
            random,
            px,
            py,
            randomRange(random, size * 0.25, size * 0.6),
            color,
            circles,
            layer,
            randomRange(random, 0.2, 0.9)
        );
    }
    paintBlob(
        random,
        x,
        y,
        size * 0.65,
        color,
        circles,
        layer + 1,
        0.7
    );
}
function paintSecondaryForms(random, composition, palette, circles) {
    const formCount = randomInt(random, 4, 11);
    for (let i = 0; i < formCount; i++) {
        let x;
        let y;
        if (chance(random, 0.6)) {
            const angle = randomRange(random, 0, TAU);
            const d = randomRange(random, 150, 650);
            x = composition.focalX + Math.cos(angle) * d;
            y = composition.focalY + Math.sin(angle) * d;
        } else {
            x = randomRange(random, 50, WIDTH - 50);
            y = randomRange(random, 50, HEIGHT - 50);
        }
        if (distance(
            { x, y },
            { x: composition.focalX, y: composition.focalY }
        ) < 110 && chance(random, 0.75)) {
            continue;
        }
        const size = randomRange(random, 25, 170);
        const color = palette.colors[randomInt(random, 0, 4)];
        if (chance(random, 0.52)) {
            paintOrganicForm(
                random,
                x,
                y,
                size,
                color,
                circles,
                randomInt(random, 4, 7)
            );
        } else {
            paintGeometricForm(
                random,
                x,
                y,
                size,
                color,
                circles,
                randomInt(random, 4, 7)
            );
        }
    }
}
function paintFocalStructure(random, composition, palette, circles) {
    const x = composition.focalX;
    const y = composition.focalY;
    const size = randomRange(random, 130, 260);
    const primary = palette.colors[randomInt(random, 1, 3)];
    const accent = palette.colors[4];
    const type = randomInt(random, 0, 5);
    if (type === 0) {
        paintOrganicForm(random, x, y, size, primary, circles, 8);
        paintOrb(
            random,
            x + randomRange(random, -size * 0.25, size * 0.25),
            y + randomRange(random, -size * 0.25, size * 0.25),
            size * 0.22,
            accent,
            circles,
            10
        );
    } else if (type === 1) {
        paintGeometricForm(random, x, y, size, primary, circles, 8);
        paintSpiral(random, { x, y }, size * 0.8, accent, circles, 10);
    } else if (type === 2) {
        paintSpiral(random, { x, y }, size * 1.2, primary, circles, 8);
        paintOrb(
            random,
            x,
            y,
            size * 0.18,
            accent,
            circles,
            11
        );
    } else if (type === 3) {
        const angle = randomRange(random, 0, TAU);
        for (let i = 0; i < 7; i++) {
            const t = i / 6;
            paintBlob(
                random,
                x + Math.cos(angle) * size * t * 1.7,
                y + Math.sin(angle) * size * t * 1.7,
                size * (0.45 - t * 0.25),
                i % 2 === 0 ? primary : accent,
                circles,
                8 + i
            );
        }
    } else if (type === 4) {
        paintRibbon(
            random,
            {
                x: x - size,
                y: y + size * 0.4
            },
            {
                x: x + size,
                y: y - size * 0.4
            },
            primary,
            circles,
            8
        );
        paintRibbon(
            random,
            {
                x: x - size * 0.3,
                y: y - size
            },
            {
                x: x + size * 0.3,
                y: y + size
            },
            accent,
            circles,
            9
        );
    } else {
        paintOrganicForm(random, x, y, size, primary, circles, 8);
        paintGeometricForm(
            random,
            x + randomRange(random, -size * 0.25, size * 0.25),
            y + randomRange(random, -size * 0.25, size * 0.25),
            size * 0.55,
            accent,
            circles,
            10
        );
    }
}
function paintDirectionalEnergy(random, composition, palette, circles) {
    const count = randomInt(random, 3, 8);
    for (let i = 0; i < count; i++) {
        const angle =
            Math.atan2(
                composition.focalY - HEIGHT / 2,
                composition.focalX - WIDTH / 2
            ) +
            randomRange(random, -1.2, 1.2);
        const startDistance = randomRange(random, 300, 700);
        const endDistance = randomRange(random, 80, 250);
        const start = {
            x: composition.focalX + Math.cos(angle) * startDistance,
            y: composition.focalY + Math.sin(angle) * startDistance
        };
        const end = {
            x: composition.focalX + Math.cos(angle) * endDistance,
            y: composition.focalY + Math.sin(angle) * endDistance
        };
        paintRibbon(
            random,
            start,
            end,
            palette.colors[randomInt(random, 1, 4)],
            circles,
            5
        );
    }
}
function paintHighlights(random, composition, palette, circles) {
    const count = randomInt(random, 2500, 6000);
    for (let i = 0; i < count; i++) {
        const angle = randomRange(random, 0, TAU);
        const d = Math.pow(random(), 1.8) * 360;
        const x = composition.focalX + Math.cos(angle) * d;
        const y = composition.focalY + Math.sin(angle) * d;
        if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT) continue;
        addCircle(
            circles,
            x,
            y,
            randomRange(random, 0.7, 3),
            palette.colors[4],
            randomRange(random, 0.08, 0.38),
            12
        );
    }
}
function addLightGlow(random, x, y, radius, color, circles) {
    const count = Math.floor(radius * 5);
    for (let i = 0; i < count; i++) {
        const angle = randomRange(random, 0, TAU);
        const d = Math.pow(random(), 0.65) * radius;
        addCircle(
            circles,
            x + Math.cos(angle) * d,
            y + Math.sin(angle) * d,
            randomRange(random, 2, 10),
            color,
            randomRange(random, 0.01, 0.07),
            11
        );
    }
}
function paintLight(random, composition, palette, circles) {
    const x =
        composition.focalX +
        randomRange(random, -350, 350);
    const y =
        composition.focalY +
        randomRange(random, -350, 350);
    const radius = randomRange(random, 120, 300);
    addLightGlow(
        random,
        x,
        y,
        radius,
        palette.colors[4],
        circles
    );
}
function addNegativeSpaceMask(random, composition, circles) {
    if (composition.negativeSpace < 0.25) return;
    const side = randomInt(random, 0, 3);
    let xMin = 0;
    let xMax = WIDTH;
    let yMin = 0;
    let yMax = HEIGHT;
    if (side === 0) {
        xMax = WIDTH * 0.3;
    } else if (side === 1) {
        xMin = WIDTH * 0.7;
    } else if (side === 2) {
        yMax = HEIGHT * 0.25;
    } else {
        yMin = HEIGHT * 0.75;
    }
    for (const item of circles) {
        if (
            item.x >= xMin &&
            item.x <= xMax &&
            item.y >= yMin &&
            item.y <= yMax &&
            item.layer >= 3
        ) {
            item.alpha *= randomRange(random, 0.05, 0.3);
        }
    }
}
function addSymmetryInfluence(random, composition, circles) {
    if (composition.symmetry < 0.08) return;
    const strength = composition.symmetry;
    for (const item of circles) {
        if (item.layer < 5) continue;
        if (chance(random, strength * 0.16)) {
            const mirroredX = WIDTH - item.x;
            addCircle(
                circles,
                mirroredX,
                item.y + randomRange(random, -30, 30),
                item.radius * randomRange(random, 0.7, 1.1),
                item.color,
                item.alpha * strength,
                Math.max(4, item.layer - 1)
            );
        }
    }
}
function createTitle(random, composition, palette) {
    const prefixes = [
        "THE",
        "A",
        "BEYOND",
        "WITHIN",
        "UNDER",
        "ABOVE",
        "BETWEEN",
        "AFTER",
        "BEFORE",
        "WHERE"
    ];
    const adjectives = [
        "SILENT",
        "ETERNAL",
        "HOLLOW",
        "LUMINOUS",
        "FORGOTTEN",
        "INFINITE",
        "CRIMSON",
        "VIOLET",
        "GOLDEN",
        "BROKEN",
        "DREAMING",
        "RESTLESS",
        "ANCIENT",
        "WEIGHTLESS",
        "OTHER"
    ];
    const nouns = [
        "MACHINE",
        "GARDEN",
        "HORIZON",
        "MEMORY",
        "OCEAN",
        "CATHEDRAL",
        "ECHO",
        "WORLD",
        "FRAGMENT",
        "VOID",
        "ORBIT",
        "HEART",
        "MONUMENT",
        "DREAM",
        "SIGNAL",
        "SHADOW",
        "THRESHOLD",
        "STAR",
        "RIVER",
        "SILENCE"
    ];
    const structures = [
        `${prefixes[randomInt(random, 0, prefixes.length - 1)]} ${adjectives[randomInt(random, 0, adjectives.length - 1)]} ${nouns[randomInt(random, 0, nouns.length - 1)]}`,
        `${adjectives[randomInt(random, 0, adjectives.length - 1)]} ${nouns[randomInt(random, 0, nouns.length - 1)]}`,
        `${nouns[randomInt(random, 0, nouns.length - 1)]} OF ${adjectives[randomInt(random, 0, adjectives.length - 1)]}`,
        `${prefixes[randomInt(random, 0, prefixes.length - 1)]} ${nouns[randomInt(random, 0, nouns.length - 1)]}`,
        `${adjectives[randomInt(random, 0, adjectives.length - 1)]} ${nouns[randomInt(random, 0, nouns.length - 1)]} ${nouns[randomInt(random, 0, nouns.length - 1)]}`
    ];
    return structures[randomInt(random, 0, structures.length - 1)];
}
function render(seed) {
    const random = createRandom(seed);
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const palette = makePalette(random);
    const composition = createComposition(random);
    const circles = [];
    ctx.fillStyle = rgbString(palette.background, 1);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    paintGradient(random, palette, circles);
    paintAtmosphere(random, palette, circles);
    paintLight(
        random,
        composition,
        palette,
        circles
    );
    paintSecondaryForms(
        random,
        composition,
        palette,
        circles
    );
    paintDirectionalEnergy(
        random,
        composition,
        palette,
        circles
    );
    paintFocalStructure(
        random,
        composition,
        palette,
        circles
    );
    paintHighlights(
        random,
        composition,
        palette,
        circles
    );
    addNegativeSpaceMask(
        random,
        composition,
        circles
    );
    addSymmetryInfluence(
        random,
        composition,
        circles
    );
    circles.sort((a, b) => a.layer - b.layer);
    for (const item of circles) {
        ctx.beginPath();
        ctx.arc(
            item.x,
            item.y,
            item.radius,
            0,
            TAU
        );
        ctx.fillStyle = rgbString(
            item.color,
            item.alpha
        );
        ctx.fill();
    }
    const title = createTitle(
        random,
        composition,
        palette
    );
    currentArtwork = {
        seed,
        title,
        composition,
        palette,
        circleCount: circles.length
    };
    titleElement.textContent = title;
    seedElement.textContent = seed;
    compositionElement.textContent = composition.mode;
    paletteElement.textContent = palette.name;
    circlesElement.textContent = circles.length.toLocaleString();
}
function generate() {
    render(randomSeed());
}
function saveArtwork() {
    if (!currentArtwork) return;
    const safeTitle = currentArtwork.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const link = document.createElement("a");
    link.download =
        `${safeTitle}-${currentArtwork.seed}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}
document
    .getElementById("generate")
    .addEventListener("click", generate);
document
    .getElementById("save")
    .addEventListener("click", saveArtwork);
render(randomSeed());
