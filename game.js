const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const titleElement = document.getElementById("title");
const seedElement = document.getElementById("seed");
const compositionElement = document.getElementById("composition");
const paletteElement = document.getElementById("palette");
const circlesElement = document.getElementById("circles");
const WIDTH = 1200;
const HEIGHT = 900;
const TAU = Math.PI * 2;
let currentArtwork = null;
function randomSeed() {
    return Math.floor(Math.random() * 2147483647);
}
function rng(seed) {
    let s = seed >>> 0;
    return function () {
        s += 0x6D2B79F5;
        let t = s;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function range(r, a, b) {
    return a + r() * (b - a);
}
function integer(r, a, b) {
    return Math.floor(range(r, a, b + 1));
}
function chance(r, n) {
    return r() < n;
}
function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function hsv(h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let rr = 0;
    let gg = 0;
    let bb = 0;
    if (h < 60) {
        rr = c;
        gg = x;
    } else if (h < 120) {
        rr = x;
        gg = c;
    } else if (h < 180) {
        gg = c;
        bb = x;
    } else if (h < 240) {
        gg = x;
        bb = c;
    } else if (h < 300) {
        rr = x;
        bb = c;
    } else {
        rr = c;
        bb = x;
    }
    return {
        r: Math.round((rr + m) * 255),
        g: Math.round((gg + m) * 255),
        b: Math.round((bb + m) * 255)
    };
}
function mix(a, b, t) {
    return {
        r: Math.round(lerp(a.r, b.r, t)),
        g: Math.round(lerp(a.g, b.g, t)),
        b: Math.round(lerp(a.b, b.b, t))
    };
}
function scaleColor(c, n) {
    return {
        r: clamp(Math.round(c.r * n), 0, 255),
        g: clamp(Math.round(c.g * n), 0, 255),
        b: clamp(Math.round(c.b * n), 0, 255)
    };
}
function rgba(c, a) {
    return `rgba(${c.r},${c.g},${c.b},${a})`;
}
function makePalette(r) {
    const base = range(r, 0, 360);
    const systems = [
        {
            name: "DREAM ANALOGUE",
            hues: [base - 45, base - 18, base, base + 20, base + 43]
        },
        {
            name: "DREAM COMPLEMENT",
            hues: [base, base + 18, base - 18, base + 180, base + 198]
        },
        {
            name: "TRIADIC DREAM",
            hues: [base, base + 120, base + 240, base + 18, base + 198]
        },
        {
            name: "NIGHT TETRAD",
            hues: [base, base + 75, base + 180, base + 255, base + 35]
        },
        {
            name: "PASTEL VOID",
            hues: [base, base + 30, base + 70, base + 180, base + 210]
        },
        {
            name: "ACID DREAM",
            hues: [base, base + 55, base + 125, base + 185, base + 275]
        },
        {
            name: "UNSTABLE HARMONY",
            hues: [
                base,
                base + range(r, 20, 90),
                base + range(r, 100, 180),
                base + range(r, 190, 280),
                base + range(r, 280, 350)
            ]
        }
    ];
    const system = systems[integer(r, 0, systems.length - 1)];
    const colors = system.hues.map((h, i) => {
        let saturation;
        let value;
        if (system.name === "PASTEL VOID") {
            saturation = range(r, 0.2, 0.55);
            value = range(r, 0.65, 1);
        } else if (system.name === "ACID DREAM") {
            saturation = range(r, 0.65, 1);
            value = range(r, 0.45, 1);
        } else {
            saturation = i === 0
                ? range(r, 0.3, 0.65)
                : range(r, 0.35, 0.95);
            value = i === 0
                ? range(r, 0.07, 0.2)
                : range(r, 0.35, 1);
        }
        return hsv(h, saturation, value);
    });
    return {
        name: system.name,
        colors,
        background: scaleColor(colors[0], range(r, 0.25, 0.55))
    };
}
function makeComposition(r) {
    const names = [
        "DREAM LOGIC",
        "ASYMMETRICAL DREAM",
        "IMPOSSIBLE PERSPECTIVE",
        "VISUAL TENSION",
        "NEGATIVE SPACE",
        "HYPNOTIC BALANCE",
        "CONTROLLED CHAOS",
        "UNCANNY SYMMETRY",
        "LIMINAL COMPOSITION"
    ];
    return {
        name: names[integer(r, 0, names.length - 1)],
        focalX: range(r, 120, WIDTH - 120),
        focalY: range(r, 100, HEIGHT - 100),
        chaos: range(r, 0.35, 1),
        emptiness: range(r, 0.08, 0.48),
        symmetry: range(r, 0, 0.8),
        density: range(r, 0.75, 1),
        curvature: range(r, 0.2, 1),
        scale: range(r, 0.65, 1.7)
    };
}
function add(circles, x, y, radius, color, alpha, layer) {
    if (
        x < -radius ||
        x > WIDTH + radius ||
        y < -radius ||
        y > HEIGHT + radius
    ) return;
    circles.push({
        x,
        y,
        radius,
        color,
        alpha,
        layer
    });
}
function draw(circles) {
    circles.sort((a, b) => a.layer - b.layer);
    for (const c of circles) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, TAU);
        ctx.fillStyle = rgba(c.color, c.alpha);
        ctx.fill();
    }
}
function background(r, palette, circles) {
    const spacing = 3.5;
    for (let y = 0; y < HEIGHT; y += spacing) {
        const t = y / HEIGHT;
        const base = mix(
            palette.background,
            palette.colors[1],
            t * 0.3
        );
        for (let x = 0; x < WIDTH; x += spacing) {
            const variation = range(r, 0.86, 1.12);
            add(
                circles,
                x + range(r, -2, 2),
                y + range(r, -2, 2),
                range(r, 1.7, 4),
                scaleColor(base, variation),
                range(r, 0.2, 0.42),
                0
            );
        }
    }
}
function denseField(r, palette, circles, cx, cy, width, height, colorIndex, density, layer) {
    const count = Math.floor(width * height / 22 * density);
    const color = palette.colors[colorIndex];
    for (let i = 0; i < count; i++) {
        const x = cx + range(r, -width / 2, width / 2);
        const y = cy + range(r, -height / 2, height / 2);
        const edgeX = Math.abs(x - cx) / (width / 2);
        const edgeY = Math.abs(y - cy) / (height / 2);
        const edgeFade = clamp(
            1 - Math.max(edgeX, edgeY) * 0.45,
            0.1,
            1
        );
        add(
            circles,
            x,
            y,
            range(r, 0.8, 3.8),
            scaleColor(color, range(r, 0.75, 1.25)),
            range(r, 0.12, 0.42) * edgeFade,
            layer
        );
    }
}
function cloud(r, x, y, size, color, circles, layer) {
    const blobs = integer(r, 4, 14);
    for (let i = 0; i < blobs; i++) {
        const angle = range(r, 0, TAU);
        const d = range(r, 0, size * 0.65);
        const bx = x + Math.cos(angle) * d;
        const by = y + Math.sin(angle) * d;
        const radius = range(r, size * 0.15, size * 0.5);
        const count = Math.floor(radius * radius / 3.5);
        for (let j = 0; j < count; j++) {
            const a = range(r, 0, TAU);
            const d2 = Math.sqrt(r()) * radius;
            add(
                circles,
                bx + Math.cos(a) * d2,
                by + Math.sin(a) * d2,
                range(r, 0.7, 4),
                scaleColor(color, range(r, 0.75, 1.2)),
                range(r, 0.1, 0.45),
                layer
            );
        }
    }
}
function tendril(r, startX, startY, angle, length, color, circles, layer) {
    const steps = Math.floor(length / 3.5);
    let x = startX;
    let y = startY;
    let direction = angle;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        direction += Math.sin(t * TAU * range(r, 1.5, 5)) * 0.035;
        x += Math.cos(direction) * range(r, 2.5, 5.5);
        y += Math.sin(direction) * range(r, 2.5, 5.5);
        const width = lerp(8, 1.2, t);
        for (let j = 0; j < integer(r, 2, 6); j++) {
            add(
                circles,
                x + range(r, -width, width),
                y + range(r, -width, width),
                range(r, 0.8, 3.8),
                scaleColor(color, range(r, 0.7, 1.3)),
                range(r, 0.12, 0.45),
                layer
            );
        }
    }
}
function spiral(r, x, y, radius, color, circles, layer) {
    const turns = range(r, 1.5, 6);
    const count = Math.floor(radius * 7);
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * TAU * turns;
        const d = t * radius;
        const wobble =
            Math.sin(t * TAU * integer(r, 2, 7)) *
            radius *
            0.04;
        add(
            circles,
            x + Math.cos(angle) * (d + wobble),
            y + Math.sin(angle) * (d + wobble),
            range(r, 0.8, 4.5) * (1 - t * 0.45),
            color,
            range(r, 0.12, 0.55),
            layer
        );
    }
}
function portal(r, x, y, radius, palette, circles, layer) {
    const rings = integer(r, 4, 12);
    for (let ring = 0; ring < rings; ring++) {
        const rr = radius * (ring + 1) / rings;
        const count = Math.floor(rr * 5);
        for (let i = 0; i < count; i++) {
            const angle =
                i / count * TAU +
                ring * range(r, -0.08, 0.08);
            add(
                circles,
                x + Math.cos(angle) * rr,
                y + Math.sin(angle) * rr,
                range(r, 1, 4),
                palette.colors[(ring + 2) % 5],
                range(r, 0.12, 0.5),
                layer + ring * 0.1
            );
        }
    }
    const inside = Math.floor(radius * radius / 2.5);
    for (let i = 0; i < inside; i++) {
        const angle = range(r, 0, TAU);
        const d = Math.sqrt(r()) * radius * 0.7;
        add(
            circles,
            x + Math.cos(angle) * d,
            y + Math.sin(angle) * d,
            range(r, 0.7, 3),
            palette.colors[0],
            range(r, 0.15, 0.4),
            layer - 1
        );
    }
}
function impossibleStructure(r, x, y, size, palette, circles) {
    const colorA = palette.colors[integer(r, 1, 3)];
    const colorB = palette.colors[integer(r, 2, 4)];
    const mode = integer(r, 0, 5);
    if (mode === 0) {
        for (let i = 0; i < 8; i++) {
            const angle = i / 8 * TAU + range(r, -0.1, 0.1);
            tendril(
                r,
                x,
                y,
                angle,
                size * range(r, 0.6, 1.5),
                i % 2 ? colorA : colorB,
                circles,
                7
            );
        }
    } else if (mode === 1) {
        const levels = integer(r, 4, 12);
        for (let i = 0; i < levels; i++) {
            const t = i / levels;
            const px =
                x +
                Math.sin(t * TAU * 1.7) *
                size *
                0.55;
            const py =
                y -
                t *
                size *
                1.5;
            cloud(
                r,
                px,
                py,
                size * (0.2 + t * 0.08),
                i % 2 ? colorA : colorB,
                circles,
                7 + i * 0.1
            );
        }
    } else if (mode === 2) {
        spiral(
            r,
            x,
            y,
            size * 1.3,
            colorA,
            circles,
            7
        );
        spiral(
            r,
            x,
            y,
            size * 0.65,
            colorB,
            circles,
            8
        );
    } else if (mode === 3) {
        const arms = integer(r, 5, 11);
        for (let i = 0; i < arms; i++) {
            const angle = i / arms * TAU;
            const ex = x + Math.cos(angle) * size;
            const ey = y + Math.sin(angle) * size;
            tendril(
                r,
                x,
                y,
                angle,
                size,
                colorA,
                circles,
                7
            );
            portal(
                r,
                ex,
                ey,
                size * range(r, 0.08, 0.2),
                palette,
                circles,
                9
            );
        }
    } else if (mode === 4) {
        const width = size * 1.6;
        const height = size * 0.7;
        denseField(
            r,
            palette,
            circles,
            x,
            y,
            width,
            height,
            integer(r, 1, 4),
            1.7,
            7
        );
        spiral(
            r,
            x,
            y,
            size * 0.75,
            colorB,
            circles,
            9
        );
    } else {
        portal(
            r,
            x,
            y,
            size * range(r, 0.5, 1),
            palette,
            circles,
            8
        );
        const count = integer(r, 5, 15);
        for (let i = 0; i < count; i++) {
            const angle = range(r, 0, TAU);
            const d = range(r, size, size * 2.2);
            tendril(
                r,
                x + Math.cos(angle) * d,
                y + Math.sin(angle) * d,
                angle + Math.PI,
                range(r, size * 0.2, size * 0.8),
                colorA,
                circles,
                6
            );
        }
    }
}
function dreamObject(r, x, y, size, palette, circles) {
    const type = integer(r, 0, 8);
    if (type === 0) {
        portal(r, x, y, size, palette, circles, 9);
    }
    if (type === 1) {
        impossibleStructure(r, x, y, size, palette, circles);
    }
    if (type === 2) {
        cloud(
            r,
            x,
            y,
            size,
            palette.colors[integer(r, 1, 4)],
            circles,
            8
        );
    }
    if (type === 3) {
        spiral(
            r,
            x,
            y,
            size * 1.5,
            palette.colors[integer(r, 1, 4)],
            circles,
            8
        );
    }
    if (type === 4) {
        for (let i = 0; i < integer(r, 3, 9); i++) {
            const angle = range(r, 0, TAU);
            tendril(
                r,
                x,
                y,
                angle,
                size * range(r, 0.5, 1.5),
                palette.colors[integer(r, 1, 4)],
                circles,
                7
            );
        }
    }
    if (type === 5) {
        denseField(
            r,
            palette,
            circles,
            x,
            y,
            size * 2,
            size * 2,
            integer(r, 1, 4),
            2.5,
            8
        );
    }
    if (type === 6) {
        const copies = integer(r, 3, 7);
        for (let i = 0; i < copies; i++) {
            const angle = i / copies * TAU;
            portal(
                r,
                x + Math.cos(angle) * size * 0.8,
                y + Math.sin(angle) * size * 0.8,
                size * range(r, 0.12, 0.3),
                palette,
                circles,
                9
            );
        }
    }
    if (type === 7) {
        for (let i = 0; i < integer(r, 8, 20); i++) {
            const angle = range(r, 0, TAU);
            const d = range(r, size * 0.3, size);
            add(
                circles,
                x + Math.cos(angle) * d,
                y + Math.sin(angle) * d,
                range(r, 3, 13),
                palette.colors[integer(r, 1, 4)],
                range(r, 0.2, 0.65),
                9
            );
        }
    }
    if (type === 8) {
        impossibleStructure(
            r,
            x,
            y,
            size * range(r, 0.6, 1.4),
            palette,
            circles
        );
    }
}
function focalDream(r, composition, palette, circles) {
    const x = composition.focalX;
    const y = composition.focalY;
    const size = range(
        r,
        130,
        300
    ) * composition.scale;
    dreamObject(
        r,
        x,
        y,
        size,
        palette,
        circles
    );
    if (chance(r, 0.75)) {
        portal(
            r,
            x + range(r, -size * 0.4, size * 0.4),
            y + range(r, -size * 0.4, size * 0.4),
            size * range(r, 0.12, 0.3),
            palette,
            circles,
            11
        );
    }
}
function surroundingDreams(r, composition, palette, circles) {
    const count = integer(
        r,
        7,
        20
    );
    for (let i = 0; i < count; i++) {
        const angle = range(r, 0, TAU);
        const distance = range(
            r,
            160,
            650
        ) * (0.65 + composition.chaos * 0.6);
        const x =
            composition.focalX +
            Math.cos(angle) * distance;
        const y =
            composition.focalY +
            Math.sin(angle) * distance;
        if (
            x < -100 ||
            x > WIDTH + 100 ||
            y < -100 ||
            y > HEIGHT + 100
        ) continue;
        const size = range(r, 15, 130);
        dreamObject(
            r,
            x,
            y,
            size,
            palette,
            circles
        );
    }
}
function paintHugeColourMass(r, composition, palette, circles) {
    const count = integer(r, 2, 6);
    for (let i = 0; i < count; i++) {
        const x = range(r, -100, WIDTH + 100);
        const y = range(r, -100, HEIGHT + 100);
        const width = range(r, 180, 700);
        const height = range(r, 100, 600);
        denseField(
            r,
            palette,
            circles,
            x,
            y,
            width,
            height,
            integer(r, 0, 4),
            range(r, 1.2, 2.8),
            3
        );
    }
}
function atmosphere(r, palette, circles) {
    const count = 22000;
    for (let i = 0; i < count; i++) {
        const x = range(r, 0, WIDTH);
        const y = range(r, 0, HEIGHT);
        const color =
            palette.colors[integer(r, 0, 4)];
        add(
            circles,
            x,
            y,
            range(r, 0.5, 2.5),
            color,
            range(r, 0.015, 0.08),
            12
        );
    }
}
function stars(r, palette, circles) {
    const count = integer(r, 3000, 9000);
    for (let i = 0; i < count; i++) {
        const x = range(r, 0, WIDTH);
        const y = range(r, 0, HEIGHT);
        const color =
            chance(r, 0.65)
                ? palette.colors[4]
                : palette.colors[integer(r, 0, 4)];
        add(
            circles,
            x,
            y,
            range(r, 0.35, 2.5),
            color,
            range(r, 0.08, 0.5),
            13
        );
    }
}
function highlightCore(r, composition, palette, circles) {
    const count = integer(r, 7000, 16000);
    for (let i = 0; i < count; i++) {
        const angle = range(r, 0, TAU);
        const d = Math.pow(r(), 1.6) * 300;
        const x =
            composition.focalX +
            Math.cos(angle) * d;
        const y =
            composition.focalY +
            Math.sin(angle) * d;
        if (
            x < 0 ||
            x > WIDTH ||
            y < 0 ||
            y > HEIGHT
        ) continue;
        add(
            circles,
            x,
            y,
            range(r, 0.4, 2.4),
            palette.colors[4],
            range(r, 0.06, 0.35),
            14
        );
    }
}
function symmetryEcho(r, composition, circles) {
    if (composition.symmetry < 0.15) return;
    const original = circles.slice();
    for (const c of original) {
        if (c.layer < 7) continue;
        if (chance(r, composition.symmetry * 0.08)) {
            const mx = WIDTH - c.x;
            add(
                circles,
                mx + range(r, -25, 25),
                c.y + range(r, -25, 25),
                c.radius * range(r, 0.7, 1.1),
                c.color,
                c.alpha * composition.symmetry,
                c.layer
            );
        }
    }
}
function negativeSpace(r, composition, circles) {
    if (composition.emptiness < 0.18) return;
    const side = integer(r, 0, 3);
    let test;
    if (side === 0) {
        test = c => c.x < WIDTH * 0.25;
    } else if (side === 1) {
        test = c => c.x > WIDTH * 0.75;
    } else if (side === 2) {
        test = c => c.y < HEIGHT * 0.25;
    } else {
        test = c => c.y > HEIGHT * 0.75;
    }
    for (const c of circles) {
        if (c.layer < 4) continue;
        if (test(c)) {
            c.alpha *= range(
                r,
                0.08,
                0.4
            );
        }
    }
}
function title(r) {
    const words = [
        "SOMETHING",
        "NOTHING",
        "ELSEWHERE",
        "HOME",
        "DREAM",
        "MEMORY",
        "SLEEP",
        "THE OTHER SIDE",
        "YESTERDAY",
        "TOMORROW",
        "SILENCE",
        "STATIC",
        "ROOM",
        "PLACE",
        "VOID",
        "LIGHT",
        "OCEAN",
        "SKY",
        "THOUGHT",
        "SIGNAL",
        "GARDEN",
        "DOOR",
        "HALLWAY",
        "WORLD",
        "ECHO"
    ];
    const structures = [
        () => `THE ${words[integer(r, 0, words.length - 1)]}`,
        () => `${words[integer(r, 0, words.length - 1)]} WITHOUT END`,
        () => `WHERE ${words[integer(r, 0, words.length - 1)]} GOES`,
        () => `A ${words[integer(r, 0, words.length - 1)]} IN ${words[integer(r, 0, words.length - 1)]}`,
        () => `${words[integer(r, 0, words.length - 1)]} AFTER ${words[integer(r, 0, words.length - 1)]}`,
        () => `I REMEMBER ${words[integer(r, 0, words.length - 1)]}`,
        () => `THE ${words[integer(r, 0, words.length - 1)]} THAT WASN'T THERE`,
        () => `SOMEWHERE ${words[integer(r, 0, words.length - 1)]}`,
        () => `${words[integer(r, 0, words.length - 1)]} / ${words[integer(r, 0, words.length - 1)]}`,
        () => `DREAM ${integer(r, 2, 99)}`
    ];
    return structures[
        integer(r, 0, structures.length - 1)
    ]();
}
function render(seed) {
    const r = rng(seed);
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const palette = makePalette(r);
    const composition = makeComposition(r);
    const circles = [];
    ctx.fillStyle = rgba(
        palette.background,
        1
    );
    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );
    background(
        r,
        palette,
        circles
    );
    paintHugeColourMass(
        r,
        composition,
        palette,
        circles
    );
    focalDream(
        r,
        composition,
        palette,
        circles
    );
    surroundingDreams(
        r,
        composition,
        palette,
        circles
    );
    if (chance(r, 0.85)) {
        spiral(
            r,
            range(r, 100, WIDTH - 100),
            range(r, 100, HEIGHT - 100),
            range(r, 100, 400),
            palette.colors[integer(r, 1, 4)],
            circles,
            6
        );
    }
    if (chance(r, 0.8)) {
        for (let i = 0; i < integer(r, 2, 8); i++) {
            tendril(
                r,
                range(r, 0, WIDTH),
                range(r, 0, HEIGHT),
                range(r, 0, TAU),
                range(r, 150, 700),
                palette.colors[integer(r, 1, 4)],
                circles,
                5
            );
        }
    }
    atmosphere(
        r,
        palette,
        circles
    );
    stars(
        r,
        palette,
        circles
    );
    highlightCore(
        r,
        composition,
        palette,
        circles
    );
    symmetryEcho(
        r,
        composition,
        circles
    );
    negativeSpace(
        r,
        composition,
        circles
    );
    draw(circles);
    const artworkTitle = title(r);
    currentArtwork = {
        seed,
        title: artworkTitle,
        circles: circles.length
    };
    titleElement.textContent = artworkTitle;
    seedElement.textContent = seed;
    compositionElement.textContent = composition.name;
    paletteElement.textContent = palette.name;
    circlesElement.textContent =
        circles.length.toLocaleString();
}
function generate() {
    render(randomSeed());
}
function saveArtwork() {
    if (!currentArtwork) return;
    const safe =
        currentArtwork.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    const link =
        document.createElement("a");
    link.download =
        `${safe}-${currentArtwork.seed}.png`;
    link.href =
        canvas.toDataURL("image/png");
    link.click();
}
document
    .getElementById("generate")
    .addEventListener("click", generate);
document
    .getElementById("save")
    .addEventListener("click", saveArtwork);
render(randomSeed());
