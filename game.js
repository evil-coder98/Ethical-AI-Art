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
const TAU = Math.PI * 2;

canvas.width = WIDTH;
canvas.height = HEIGHT;

let seed = 0;
let rng;
let painting = false;
let generationToken = 0;

const artist = {
    idea: null,
    composition: null,
    palette: null,
    scene: null,
    pigment: [],
    visible: 0,
    phase: 0
};

/* =========================================================
   RANDOM
========================================================= */

function randomSeed() {
    return Math.floor(Math.random() * 2147483647);
}

function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function rand(a = 0, b = 1) {
    return a + rng() * (b - a);
}

function int(a, b) {
    return Math.floor(rand(a, b + 1));
}

function chance(v) {
    return rng() < v;
}

function pick(a) {
    return a[Math.floor(rng() * a.length)];
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

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function point(x, y) {
    return { x, y };
}

function offsetPoint(p, x, y) {
    return {
        x: p.x + x,
        y: p.y + y
    };
}

/* =========================================================
   COLOUR MATH
========================================================= */

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);

    const f = n =>
        l - a *
        Math.max(
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

function rgbToHsl(c) {
    let r = c.r / 255;
    let g = c.g / 255;
    let b = c.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));

        if (max === r) {
            h = 60 * (((g - b) / d) % 6);
        } else if (max === g) {
            h = 60 * ((b - r) / d + 2);
        } else {
            h = 60 * ((r - g) / d + 4);
        }
    }

    if (h < 0) h += 360;

    return {
        h,
        s: s * 100,
        l: l * 100
    };
}

function mixColor(a, b, t) {
    return {
        r: lerp(a.r, b.r, t),
        g: lerp(a.g, b.g, t),
        b: lerp(a.b, b.b, t)
    };
}

function shiftColor(c, hueShift = 0, satMul = 1, lightShift = 0) {
    const h = rgbToHsl(c);

    return hslToRgb(
        (h.h + hueShift + 360) % 360,
        clamp(h.s * satMul, 0, 100),
        clamp(h.l + lightShift, 0, 100)
    );
}

function rgba(c, alpha = 1) {
    return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${alpha})`;
}

function luminance(c) {
    return (
        c.r * 0.2126 +
        c.g * 0.7152 +
        c.b * 0.0722
    ) / 255;
}

function contrast(a, b) {
    return Math.abs(
        luminance(a) -
        luminance(b)
    );
}

/* =========================================================
   NOISE
========================================================= */

function hash(x) {
    const s =
        Math.sin(
            x * 127.1 +
            seed * 0.000013
        ) * 43758.5453123;

    return s - Math.floor(s);
}

function noise(x, scale = 1, offset = 0) {
    const p = x / scale;
    const i = Math.floor(p);
    const f = smooth(p - i);

    return lerp(
        hash(i + offset * 31.7),
        hash(i + 1 + offset * 31.7),
        f
    );
}

function fbm(
    x,
    octaves = 5,
    scale = 100,
    offset = 0
) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
        value +=
            noise(
                x * frequency,
                scale,
                offset + i * 17.3
            ) * amplitude;

        amplitude *= 0.5;
        frequency *= 2;
    }

    return value;
}

/* =========================================================
   IDEA ENGINE
========================================================= */

function generateIdea() {
    const i = {
        realism: rand(),
        abstraction: rand(),
        organic: rand(),
        geometric: rand(),
        symmetry: rand(),
        branching: rand(),
        repetition: rand(),
        verticality: rand(),
        horizontality: rand(),
        depth: rand(),
        atmosphere: rand(),
        complexity: rand(),
        density: rand(),
        enclosure: rand(),
        scale: rand(),
        tension: rand(),
        quietness: rand(),
        darkness: rand(),
        warmth: rand(),
        perspective: rand()
    };

    const candidates = [];

    if (
        i.horizontality > 0.55 &&
        i.depth > 0.4
    ) {
        candidates.push("landscape");
    }

    if (
        i.geometric > 0.58 &&
        i.enclosure > 0.4
    ) {
        candidates.push("architecture");
    }

    if (
        i.organic > 0.55 &&
        i.branching > 0.5
    ) {
        candidates.push("organic");
    }

    if (
        i.symmetry > 0.67 &&
        i.realism > 0.45
    ) {
        candidates.push("figure");
    }

    if (
        i.abstraction > 0.7
    ) {
        candidates.push("abstract");
    }

    if (!candidates.length) {
        candidates.push(
            pick([
                "landscape",
                "architecture",
                "organic",
                "figure",
                "abstract"
            ])
        );
    }

    i.direction = pick(candidates);

    return i;
}

/* =========================================================
   COMPOSITION DIRECTOR
========================================================= */

function createComposition(idea) {
    const horizontalBias =
        idea.horizontality;

    const verticalBias =
        idea.verticality;

    const horizon =
        lerp(
            HEIGHT * 0.25,
            HEIGHT * 0.72,
            rand()
        );

    const thirdsX = [
        WIDTH * 0.333,
        WIDTH * 0.667
    ];

    const thirdsY = [
        HEIGHT * 0.333,
        HEIGHT * 0.667
    ];

    let focalX =
        pick(thirdsX) +
        rand(-100, 100);

    let focalY =
        pick(thirdsY) +
        rand(-100, 100);

    if (horizontalBias > verticalBias) {
        focalY =
            lerp(
                horizon,
                HEIGHT * 0.72,
                rand()
            );
    }

    return {
        horizon,
        focalX: clamp(focalX, 100, WIDTH - 100),
        focalY: clamp(focalY, 100, HEIGHT - 100),

        primaryMass: {
            x: focalX,
            y: focalY,
            scale: lerp(0.7, 1.5, idea.scale)
        },

        secondaryMasses: int(
            1,
            3 + Math.floor(
                idea.complexity * 2
            )
        ),

        negativeSpace:
            lerp(
                0.15,
                0.55,
                idea.quietness
            ),

        depthLayers:
            int(
                3,
                5 + Math.floor(
                    idea.depth * 5
                )
            ),

        perspective:
            lerp(
                0.15,
                1,
                idea.perspective
            )
    };
}

/* =========================================================
   COLOUR DIRECTOR
========================================================= */

function createPalette(idea) {
    const schemes = [
        "analogous",
        "complementary",
        "split-complementary",
        "triadic",
        "tetradic",
        "monochromatic",
        "warm-cool"
    ];

    const scheme = pick(schemes);

    let baseHue;

    if (idea.warmth > 0.7) {
        baseHue = rand(5, 70);
    } else if (idea.warmth < 0.3) {
        baseHue = rand(170, 260);
    } else {
        baseHue = rand(0, 360);
    }

    let hueOffsets;

    if (scheme === "analogous") {
        hueOffsets = [
            0,
            rand(20, 38),
            -rand(15, 32),
            rand(45, 70)
        ];
    }

    if (scheme === "complementary") {
        hueOffsets = [
            0,
            180,
            rand(-25, 25),
            180 + rand(-25, 25)
        ];
    }

    if (scheme === "split-complementary") {
        hueOffsets = [
            0,
            150,
            210,
            rand(-20, 20)
        ];
    }

    if (scheme === "triadic") {
        hueOffsets = [
            0,
            120,
            240,
            rand(-18, 18)
        ];
    }

    if (scheme === "tetradic") {
        hueOffsets = [
            0,
            90,
            180,
            270
        ];
    }

    if (scheme === "monochromatic") {
        hueOffsets = [
            0,
            rand(-8, 8),
            rand(-15, 15),
            rand(-22, 22)
        ];
    }

    if (scheme === "warm-cool") {
        hueOffsets = [
            0,
            180,
            rand(-30, 30),
            180 + rand(-30, 30)
        ];
    }

    const dominantHue =
        (baseHue + hueOffsets[0] + 360) % 360;

    const secondaryHue =
        (baseHue + hueOffsets[1] + 360) % 360;

    const accentHue =
        (baseHue + hueOffsets[2] + 360) % 360;

    const highlightHue =
        (baseHue + hueOffsets[3] + 360) % 360;

    const dominant = hslToRgb(
        dominantHue,
        rand(35, 65),
        rand(35, 55)
    );

    const secondary = hslToRgb(
        secondaryHue,
        rand(30, 70),
        rand(30, 58)
    );

    const accent = hslToRgb(
        accentHue,
        rand(50, 90),
        rand(38, 65)
    );

    const highlight = hslToRgb(
        highlightHue,
        rand(20, 70),
        rand(68, 88)
    );

    const shadow = hslToRgb(
        dominantHue + rand(-20, 20),
        rand(20, 60),
        rand(10, 25)
    );

    const deepShadow = hslToRgb(
        dominantHue + rand(-25, 25),
        rand(15, 50),
        rand(4, 13)
    );

    const atmosphere = mixColor(
        dominant,
        secondary,
        0.5
    );

    return {
        scheme,
        dominant,
        secondary,
        accent,
        highlight,
        shadow,
        deepShadow,
        atmosphere,

        roles: {
            dominant: 0.55,
            secondary: 0.25,
            accent: 0.10,
            highlight: 0.05,
            shadow: 0.05
        }
    };
}

/* =========================================================
   SCENE GRAPH
========================================================= */

function createScene() {
    return {
        background: [],
        masses: [],
        structures: [],
        terrain: [],
        vegetation: [],
        clouds: [],
        figures: [],
        strokes: [],
        details: [],
        lights: [],
        depth: []
    };
}

function addMass(scene, mass) {
    scene.masses.push(mass);
}

function addStructure(scene, structure) {
    scene.structures.push(structure);
}

/* =========================================================
   GENERAL STRUCTURE GENERATOR
========================================================= */

function createStructure(
    x,
    y,
    width,
    height,
    depth,
    levels,
    rotation = 0
) {
    const structure = {
        x,
        y,
        width,
        height,
        depth,
        rotation,
        levels: [],
        supports: [],
        openings: [],
        attachments: []
    };

    const levelHeight =
        height / levels;

    for (let i = 0; i < levels; i++) {
        const t = i / Math.max(1, levels - 1);

        const levelWidth =
            width *
            lerp(
                rand(0.7, 1.05),
                rand(0.55, 0.95),
                t
            );

        const level = {
            x:
                x +
                rand(-width * 0.08, width * 0.08),

            y:
                y +
                height -
                i * levelHeight,

            width: levelWidth,

            height:
                levelHeight *
                rand(0.65, 1.05),

            rotation:
                rotation +
                rand(-0.08, 0.08)
        };

        structure.levels.push(level);

        if (i > 0) {
            const lower =
                structure.levels[i - 1];

            structure.supports.push({
                a: {
                    x: lower.x - lower.width * 0.3,
                    y: lower.y
                },

                b: {
                    x: level.x - level.width * 0.3,
                    y: level.y + level.height
                },

                width:
                    rand(5, 16)
            });
        }
    }

    const openingCount =
        Math.floor(
            1 +
            rand() * levels * 2
        );

    for (let i = 0; i < openingCount; i++) {
        const level =
            pick(structure.levels);

        structure.openings.push({
            x:
                level.x +
                rand(
                    -level.width * 0.3,
                    level.width * 0.3
                ),

            y:
                level.y -
                rand(5, level.height * 0.65),

            width:
                rand(
                    8,
                    Math.max(
                        10,
                        level.width * 0.18
                    )
                ),

            height:
                rand(
                    12,
                    Math.max(
                        16,
                        level.height * 0.6
                    )
                )
        });
    }

    const attachments =
        Math.floor(
            rand(1, 4)
        );

    for (let i = 0; i < attachments; i++) {
        const level =
            pick(structure.levels);

        structure.attachments.push({
            x:
                level.x +
                rand(
                    -level.width * 0.5,
                    level.width * 0.5
                ),

            y:
                level.y +
                rand(
                    -level.height * 0.2,
                    level.height
                ),

            length:
                rand(
                    15,
                    width * 0.45
                ),

            angle:
                rand(-Math.PI, Math.PI),

            width:
                rand(3, 14)
        });
    }

    return structure;
}

/* =========================================================
   LANDSCAPE CONSTRUCTION
========================================================= */

function buildLandscape(scene, idea, composition) {
    const mountainLayers =
        int(
            3,
            5 + Math.floor(
                idea.depth * 3
            )
        );

    for (let layer = 0; layer < mountainLayers; layer++) {
        const depth =
            layer /
            Math.max(
                1,
                mountainLayers - 1
            );

        const baseY =
            composition.horizon +
            lerp(
                0,
                160,
                depth
            );

        const points = [];

        const segments = 100;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;

            const broad =
                fbm(
                    t * 900 +
                    layer * 140,
                    5,
                    180,
                    layer * 17
                );

            const sharp =
                fbm(
                    t * 900 +
                    layer * 80,
                    4,
                    55,
                    layer * 31
                );

            const ridge =
                Math.pow(
                    broad,
                    lerp(
                        0.7,
                        1.5,
                        idea.geometric
                    )
                );

            const height =
                lerp(
                    70,
                    300,
                    1 - depth
                ) *
                (
                    ridge * 0.72 +
                    sharp * 0.28
                );

            points.push({
                x: t * WIDTH,
                y: baseY - height
            });
        }

        scene.masses.push({
            type: "mountain",
            points,
            depth
        });
    }

    createTerrain(scene, composition, idea);

    const treeCount =
        int(
            8,
            18 +
            Math.floor(
                idea.complexity * 35
            )
        );

    for (let i = 0; i < treeCount; i++) {
        const x =
            rand(-50, WIDTH + 50);

        const y =
            lerp(
                composition.horizon + 100,
                HEIGHT + 40,
                Math.pow(
                    rand(),
                    1.5
                )
            );

        const scale =
            lerp(
                0.25,
                1.45,
                rand()
            );

        scene.vegetation.push(
            createTree(
                x,
                y,
                scale,
                int(3, 5)
            )
        );
    }

    const cloudCount =
        int(
            2,
            5 +
            Math.floor(
                idea.atmosphere * 12
            )
        );

    for (let i = 0; i < cloudCount; i++) {
        scene.clouds.push(
            createCloud(
                rand(-100, WIDTH + 100),
                rand(
                    40,
                    composition.horizon * 0.7
                ),
                rand(70, 230),
                rand(20, 75)
            )
        );
    }
}

function createTerrain(scene, composition, idea) {
    const rows =
        14 +
        Math.floor(
            idea.complexity * 25
        );

    const cols = 80;

    for (let r = 0; r < rows; r++) {
        const depth = r / rows;

        const y =
            lerp(
                composition.horizon + 15,
                HEIGHT + 20,
                Math.pow(depth, 0.9)
            );

        const row = [];

        for (let c = 0; c <= cols; c++) {
            const t = c / cols;

            const large =
                fbm(
                    t * 700 +
                    r * 30,
                    5,
                    160,
                    r * 11
                );

            const small =
                fbm(
                    t * 1000 +
                    r * 50,
                    3,
                    45,
                    r * 7
                );

            row.push({
                x: t * WIDTH,
                y:
                    y +
                    (
                        large -
                        0.5
                    ) *
                    lerp(
                        10,
                        80,
                        depth
                    ) +
                    (
                        small -
                        0.5
                    ) *
                    18
            });
        }

        scene.terrain.push(row);
    }
}

/* =========================================================
   ORGANIC STRUCTURES
========================================================= */

function createTree(
    x,
    y,
    scale,
    generations
) {
    const tree = {
        branches: [],
        foliage: []
    };

    function grow(
        x1,
        y1,
        length,
        angle,
        width,
        generation
    ) {
        if (generation <= 0) {
            tree.foliage.push({
                x: x1,
                y: y1,
                radius:
                    rand(7, 18) *
                    scale
            });

            return;
        }

        const bend =
            rand(-0.28, 0.28);

        const x2 =
            x1 +
            Math.cos(angle + bend) *
            length;

        const y2 =
            y1 +
            Math.sin(angle + bend) *
            length;

        tree.branches.push({
            x1,
            y1,
            x2,
            y2,
            width
        });

        const childCount =
            generation >= 3
                ? int(2, 4)
                : int(1, 3);

        for (let i = 0; i < childCount; i++) {
            grow(
                x2,
                y2,
                length *
                rand(0.48, 0.76),

                angle +
                rand(
                    -1.15,
                    1.15
                ),

                width *
                rand(0.42, 0.72),

                generation - 1
            );
        }
    }

    grow(
        x,
        y,
        105 * scale,
        -Math.PI / 2 +
        rand(-0.1, 0.1),
        15 * scale,
        generations
    );

    return tree;
}

function createCloud(
    x,
    y,
    width,
    height
) {
    const lobes = [];

    const count =
        int(4, 11);

    for (let i = 0; i < count; i++) {
        lobes.push({
            x:
                x +
                rand(
                    -width * 0.45,
                    width * 0.45
                ),

            y:
                y +
                rand(
                    -height * 0.35,
                    height * 0.35
                ),

            rx:
                rand(
                    width * 0.12,
                    width * 0.35
                ),

            ry:
                rand(
                    height * 0.35,
                    height * 0.85
                )
        });
    }

    return { lobes };
}

/* =========================================================
   ARCHITECTURE
========================================================= */

function buildArchitecture(
    scene,
    idea,
    composition
) {
    const main =
        createStructure(
            composition.focalX,
            composition.focalY,
            rand(150, 330) *
                composition.primaryMass.scale,
            rand(200, 430) *
                composition.primaryMass.scale,
            0.2,
            int(3, 8),
            rand(-0.1, 0.1)
        );

    scene.structures.push(main);

    const satellites =
        composition.secondaryMasses;

    for (let i = 0; i < satellites; i++) {
        const angle =
            rand(0, TAU);

        const distance =
            rand(180, 470);

        const x =
            composition.focalX +
            Math.cos(angle) *
            distance;

        const y =
            composition.focalY +
            Math.sin(angle) *
            distance *
            0.55;

        scene.structures.push(
            createStructure(
                x,
                y,
                rand(45, 170),
                rand(70, 260),
                rand(0.3, 0.9),
                int(1, 5),
                rand(-0.2, 0.2)
            )
        );
    }

    createGroundStructures(
        scene,
        composition,
        idea
    );
}

function createGroundStructures(
    scene,
    composition,
    idea
) {
    const count =
        int(
            4,
            12 +
            Math.floor(
                idea.complexity * 10
            )
        );

    for (let i = 0; i < count; i++) {
        const x =
            rand(
                -50,
                WIDTH + 50
            );

        const y =
            lerp(
                composition.horizon,
                HEIGHT,
                Math.pow(
                    rand(),
                    1.5
                )
            );

        scene.structures.push(
            createStructure(
                x,
                y,
                rand(25, 100),
                rand(30, 150),
                rand(0.4, 1),
                int(1, 3),
                rand(-0.15, 0.15)
            )
        );
    }
}

/* =========================================================
   FIGURE CONSTRUCTION
========================================================= */

function buildFigure(
    scene,
    idea,
    composition
) {
    const cx =
        composition.focalX;

    const cy =
        composition.focalY;

    const scale =
        lerp(
            0.7,
            1.35,
            rand()
        );

    const headWidth =
        rand(110, 210) * scale;

    const headHeight =
        headWidth *
        rand(1.05, 1.45);

    const shoulderWidth =
        headWidth *
        rand(1.5, 2.3);

    const symmetry =
        lerp(
            0.55,
            0.96,
            idea.symmetry
        );

    const face = {
        cx,
        cy,
        headWidth,
        headHeight,
        shoulderWidth,
        symmetry,
        eyeY:
            cy -
            headHeight *
            rand(0.12, 0.22),

        noseLength:
            headHeight *
            rand(0.14, 0.27),

        mouthY:
            cy +
            headHeight *
            rand(0.22, 0.38),

        jaw:
            rand(0.72, 1.05),

        features: []
    };

    const eyeSpacing =
        headWidth *
        rand(0.18, 0.29);

    const asym =
        1 - symmetry;

    face.features.push({
        type: "eye",
        x:
            cx -
            eyeSpacing +
            rand(-asym * 18, asym * 18),

        y:
            face.eyeY +
            rand(-asym * 8, asym * 8),

        width:
            rand(24, 48),

        height:
            rand(8, 17)
    });

    face.features.push({
        type: "eye",
        x:
            cx +
            eyeSpacing +
            rand(-asym * 18, asym * 18),

        y:
            face.eyeY +
            rand(-asym * 8, asym * 8),

        width:
            rand(24, 48),

        height:
            rand(8, 17)
    });

    face.features.push({
        type: "nose",
        x:
            cx +
            rand(-asym * 30, asym * 30),

        y:
            cy -
            headHeight * 0.03,

        length:
            face.noseLength
    });

    face.features.push({
        type: "mouth",
        x:
            cx +
            rand(-asym * 20, asym * 20),

        y:
            face.mouthY,

        width:
            headWidth *
            rand(0.2, 0.42)
    });

    scene.figures.push(face);

    scene.masses.push({
        type: "shoulders",
        points: [
            {
                x:
                    cx -
                    shoulderWidth / 2,
                y:
                    cy +
                    headHeight * 0.52
            },
            {
                x:
                    cx +
                    shoulderWidth / 2,
                y:
                    cy +
                    headHeight * 0.52
            },
            {
                x:
                    cx +
                    shoulderWidth * 0.42,
                y:
                    cy +
                    headHeight * 1.6
            },
            {
                x:
                    cx -
                    shoulderWidth * 0.42,
                y:
                    cy +
                    headHeight * 1.6
            }
        ]
    });
}

/* =========================================================
   ABSTRACT STRUCTURAL GRAMMAR
========================================================= */

function buildAbstract(
    scene,
    idea,
    composition
) {
    const anchorCount =
        int(
            3,
            8 +
            Math.floor(
                idea.complexity * 8
            )
        );

    const anchors = [];

    for (let i = 0; i < anchorCount; i++) {
        anchors.push({
            x: rand(80, WIDTH - 80),
            y: rand(80, HEIGHT - 80),
            scale: rand(0.3, 1)
        });
    }

    for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i];

        const sides =
            int(5, 12);

        const points = [];

        for (let j = 0; j < sides; j++) {
            const angle =
                j / sides * TAU;

            const radius =
                rand(
                    30,
                    180
                ) *
                a.scale;

            points.push({
                x:
                    a.x +
                    Math.cos(angle) *
                    radius,

                y:
                    a.y +
                    Math.sin(angle) *
                    radius
            });
        }

        scene.masses.push({
            type: "abstract",
            points
        });

        if (i > 0) {
            scene.strokes.push({
                a: anchors[i - 1],
                b: a,
                width: rand(2, 12)
            });
        }
    }
}

/* =========================================================
   BUILD WHOLE WORLD
========================================================= */

function buildWorld() {
    const idea = artist.idea;
    const composition =
        artist.composition;

    const scene = createScene();

    if (
        idea.direction ===
        "landscape"
    ) {
        buildLandscape(
            scene,
            idea,
            composition
        );
    }

    if (
        idea.direction ===
        "architecture"
    ) {
        buildArchitecture(
            scene,
            idea,
            composition
        );
    }

    if (
        idea.direction ===
        "figure"
    ) {
        buildFigure(
            scene,
            idea,
            composition
        );
    }

    if (
        idea.direction ===
        "organic"
    ) {
        buildLandscape(
            scene,
            idea,
            composition
        );

        buildOrganicDominant(
            scene,
            idea,
            composition
        );
    }

    if (
        idea.direction ===
        "abstract"
    ) {
        buildAbstract(
            scene,
            idea,
            composition
        );
    }

    scene.lights = createLights(
        idea
    );

    artist.scene = scene;
}

function buildOrganicDominant(
    scene,
    idea,
    composition
) {
    const centralTree =
        createTree(
            composition.focalX,
            composition.focalY +
            180,
            rand(1, 2.2),
            int(4, 6)
        );

    scene.vegetation.push(
        centralTree
    );

    const branches =
        int(
            4,
            12 +
            Math.floor(
                idea.branching * 20
            )
        );

    for (let i = 0; i < branches; i++) {
        const x =
            composition.focalX +
            rand(-350, 350);

        const y =
            composition.focalY +
            rand(-200, 250);

        scene.vegetation.push(
            createTree(
                x,
                y,
                rand(0.3, 1),
                int(2, 4)
            )
        );
    }
}

/* =========================================================
   LIGHTING
========================================================= */

function createLights(idea) {
    const count =
        int(
            1,
            2 +
            Math.floor(
                idea.complexity * 2
            )
        );

    const lights = [];

    for (let i = 0; i < count; i++) {
        lights.push({
            x:
                rand(
                    -WIDTH * 0.4,
                    WIDTH * 1.4
                ),

            y:
                rand(
                    -HEIGHT * 0.3,
                    HEIGHT * 0.7
                ),

            radius:
                rand(
                    250,
                    850
                ),

            intensity:
                rand(
                    0.45,
                    1
                ),

            warm:
                rand()
        });
    }

    return lights;
}

function lightingAt(
    x,
    y
) {
    let total = 0;

    for (const light of artist.scene.lights) {
        const d =
            Math.hypot(
                light.x - x,
                light.y - y
            );

        total +=
            clamp(
                1 -
                d / light.radius,
                0,
                1
            ) *
            light.intensity;
    }

    return clamp(
        total,
        0,
        1
    );
}

/* =========================================================
   PIGMENT
========================================================= */

function addPigment(
    x,
    y,
    radius,
    color,
    alpha = 1,
    depth = 0
) {
    artist.pigment.push({
        x,
        y,
        radius,
        color,
        alpha,
        depth
    });
}

function paintLine(
    a,
    b,
    color,
    radius,
    density = 0.35,
    depth = 0
) {
    const d =
        distance(a, b);

    const count =
        Math.max(
            2,
            Math.floor(
                d * density
            )
        );

    for (let i = 0; i < count; i++) {
        const t =
            i /
            Math.max(
                1,
                count - 1
            );

        addPigment(
            lerp(a.x, b.x, t) +
                rand(
                    -radius,
                    radius
                ),

            lerp(a.y, b.y, t) +
                rand(
                    -radius,
                    radius
                ),

            radius *
                rand(
                    0.45,
                    1.2
                ),

            color,
            rand(
                0.45,
                0.95
            ),
            depth
        );
    }
}

function polygonContains(
    x,
    y,
    points
) {
    let inside = false;

    for (
        let i = 0,
        j = points.length - 1;
        i < points.length;
        j = i++
    ) {
        const xi =
            points[i].x;

        const yi =
            points[i].y;

        const xj =
            points[j].x;

        const yj =
            points[j].y;

        const hit =
            ((yi > y) !==
                (yj > y)) &&
            x <
                (xj - xi) *
                    (y - yi) /
                    (yj - yi) +
                xi;

        if (hit) inside = !inside;
    }

    return inside;
}

function paintPolygon(
    points,
    color,
    density,
    radius,
    depth = 0
) {
    if (points.length < 3) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
        minX =
            Math.min(
                minX,
                p.x
            );

        maxX =
            Math.max(
                maxX,
                p.x
            );

        minY =
            Math.min(
                minY,
                p.y
            );

        maxY =
            Math.max(
                maxY,
                p.y
            );
    }

    const area =
        Math.max(
            1,
            (maxX - minX) *
            (maxY - minY)
        );

    const count =
        Math.floor(
            area * density
        );

    for (let i = 0; i < count; i++) {
        const x =
            rand(minX, maxX);

        const y =
            rand(minY, maxY);

        if (
            polygonContains(
                x,
                y,
                points
            )
        ) {
            addPigment(
                x,
                y,
                radius *
                    rand(
                        0.5,
                        1.35
                    ),
                color,
                rand(
                    0.45,
                    0.95
                ),
                depth
            );
        }
    }
}

/* =========================================================
   COLOUR ROLE SELECTION
========================================================= */

function roleColor(role) {
    const p = artist.palette;

    if (role === "dominant") {
        return p.dominant;
    }

    if (role === "secondary") {
        return p.secondary;
    }

    if (role === "accent") {
        return p.accent;
    }

    if (role === "highlight") {
        return p.highlight;
    }

    if (role === "shadow") {
        return p.shadow;
    }

    return p.dominant;
}

function chooseSurfaceColor(
    role,
    x,
    y,
    variation = 1
) {
    let base =
        roleColor(role);

    const light =
        lightingAt(x, y);

    if (
        role === "dominant" ||
        role === "secondary"
    ) {
        base =
            mixColor(
                base,
                artist.palette.highlight,
                light *
                0.16
            );
    }

    if (light < 0.22) {
        base =
            mixColor(
                base,
                artist.palette.shadow,
                0.25
            );
    }

    base =
        shiftColor(
            base,
            rand(-8, 8) *
                variation,
            rand(0.93, 1.08),
            rand(-5, 5) *
                variation
        );

    return base;
}

/* =========================================================
   PAINT BACKGROUND
========================================================= */

function paintBackground() {
    const palette =
        artist.palette;

    const rows = 90;

    for (let r = 0; r < rows; r++) {
        const t =
            r /
            Math.max(
                1,
                rows - 1
            );

        const c =
            mixColor(
                palette.dominant,
                palette.secondary,
                t
            );

        const count =
            Math.floor(
                WIDTH *
                0.13
            );

        for (let i = 0; i < count; i++) {
            addPigment(
                rand(0, WIDTH),
                r *
                    HEIGHT /
                    rows +
                    rand(-5, 5),
                rand(2, 8),
                shiftColor(
                    c,
                    rand(-7, 7),
                    1,
                    rand(-6, 6)
                ),
                rand(0.25, 0.72),
                0
            );
        }
    }
}

/* =========================================================
   PAINT MOUNTAINS
========================================================= */

function paintMountains() {
    const scene =
        artist.scene;

    for (
        const mountain
        of scene.masses
    ) {
        if (
            mountain.type !==
            "mountain"
        ) continue;

        const depth =
            mountain.depth;

        const base =
            mixColor(
                artist.palette.secondary,
                artist.palette.shadow,
                depth * 0.65
            );

        const fill = [
            ...mountain.points,
            {
                x: WIDTH,
                y: HEIGHT
            },
            {
                x: 0,
                y: HEIGHT
            }
        ];

        paintPolygon(
            fill,
            base,
            0.0019,
            rand(3, 7),
            depth
        );

        for (
            let i = 1;
            i <
            mountain.points.length;
            i++
        ) {
            const a =
                mountain.points[i - 1];

            const b =
                mountain.points[i];

            const slope =
                a.y - b.y;

            let color;

            if (slope > 0) {
                color =
                    chooseSurfaceColor(
                        "highlight",
                        b.x,
                        b.y
                    );
            } else {
                color =
                    chooseSurfaceColor(
                        "shadow",
                        b.x,
                        b.y
                    );
            }

            if (chance(0.6)) {
                paintLine(
                    a,
                    b,
                    color,
                    rand(2, 7),
                    0.32,
                    depth
                );
            }
        }
    }
}

/* =========================================================
   PAINT TERRAIN
========================================================= */

function paintTerrain() {
    const scene =
        artist.scene;

    for (
        let r = 0;
        r < scene.terrain.length;
        r++
    ) {
        const row =
            scene.terrain[r];

        const depth =
            r /
            scene.terrain.length;

        const role =
            depth < 0.3
                ? "secondary"
                : "dominant";

        for (
            let i = 1;
            i < row.length;
            i++
        ) {
            const a =
                row[i - 1];

            const b =
                row[i];

            const slope =
                a.y - b.y;

            const color =
                chooseSurfaceColor(
                    slope > 2
                        ? "highlight"
                        : role,
                    b.x,
                    b.y,
                    0.8
                );

            paintLine(
                a,
                b,
                color,
                rand(2, 6),
                0.13,
                depth
            );
        }
    }
}

/* =========================================================
   PAINT CLOUDS
========================================================= */

function paintClouds() {
    const p =
        artist.palette;

    for (
        const cloud
        of artist.scene.clouds
    ) {
        for (
            const lobe
            of cloud.lobes
        ) {
            const area =
                lobe.rx *
                lobe.ry;

            const count =
                Math.floor(
                    area *
                    0.045
                );

            const base =
                mixColor(
                    p.highlight,
                    p.atmosphere,
                    rand(0.1, 0.5)
                );

            for (
                let i = 0;
                i < count;
                i++
            ) {
                const a =
                    rand(0, TAU);

                const r =
                    Math.sqrt(
                        rand()
                    );

                addPigment(
                    lobe.x +
                        Math.cos(a) *
                        lobe.rx *
                        r,

                    lobe.y +
                        Math.sin(a) *
                        lobe.ry *
                        r,

                    rand(3, 11),

                    shiftColor(
                        base,
                        rand(-8, 8),
                        1,
                        rand(-12, 8)
                    ),

                    rand(
                        0.12,
                        0.55
                    ),

                    0
                );
            }
        }
    }
}

/* =========================================================
   PAINT VEGETATION
========================================================= */

function paintVegetation() {
    const p =
        artist.palette;

    for (
        const tree
        of artist.scene.vegetation
    ) {
        for (
            const branch
            of tree.branches
        ) {
            const color =
                chooseSurfaceColor(
                    branch.width > 5
                        ? "shadow"
                        : "dominant",
                    branch.x2,
                    branch.y2,
                    0.7
                );

            paintLine(
                {
                    x: branch.x1,
                    y: branch.y1
                },
                {
                    x: branch.x2,
                    y: branch.y2
                },
                color,
                Math.max(
                    1.5,
                    branch.width *
                    0.23
                ),
                0.4,
                0.2
            );
        }

        for (
            const leaf
            of tree.foliage
        ) {
            const leafColor =
                mixColor(
                    p.dominant,
                    p.accent,
                    rand(0.05, 0.35)
                );

            const count =
                int(4, 12);

            for (
                let i = 0;
                i < count;
                i++
            ) {
                const a =
                    rand(0, TAU);

                const r =
                    Math.sqrt(
                        rand()
                    ) *
                    leaf.radius;

                addPigment(
                    leaf.x +
                        Math.cos(a) * r,

                    leaf.y +
                        Math.sin(a) * r,

                    rand(3, 10),

                    shiftColor(
                        leafColor,
                        rand(-10, 10),
                        rand(0.9, 1.1),
                        rand(-10, 10)
                    ),

                    rand(
                        0.25,
                        0.8
                    ),

                    0.1
                );
            }
        }
    }
}

/* =========================================================
   PAINT STRUCTURES
========================================================= */

function paintStructures() {
    const p =
        artist.palette;

    for (
        const structure
        of artist.scene.structures
    ) {
        const base =
            chooseSurfaceColor(
                "secondary",
                structure.x,
                structure.y
            );

        for (
            const level
            of structure.levels
        ) {
            const points = [
                {
                    x:
                        level.x -
                        level.width / 2,

                    y:
                        level.y
                },

                {
                    x:
                        level.x +
                        level.width / 2,

                    y:
                        level.y
                },

                {
                    x:
                        level.x +
                        level.width / 2,

                    y:
                        level.y +
                        level.height
                },

                {
                    x:
                        level.x -
                        level.width / 2,

                    y:
                        level.y +
                        level.height
                }
            ];

            paintPolygon(
                points,
                chooseSurfaceColor(
                    "secondary",
                    level.x,
                    level.y
                ),
                0.006,
                rand(2, 6),
                structure.depth
            );

            const edge =
                chooseSurfaceColor(
                    "highlight",
                    level.x,
                    level.y
                );

            paintLine(
                points[0],
                points[1],
                edge,
                rand(1, 4),
                0.5,
                structure.depth
            );
        }

        for (
            const support
            of structure.supports
        ) {
            paintLine(
                support.a,
                support.b,
                p.shadow,
                support.width,
                0.4,
                structure.depth
            );
        }

        for (
            const opening
            of structure.openings
        ) {
            const points = [
                {
                    x:
                        opening.x -
                        opening.width / 2,
                    y:
                        opening.y
                },
                {
                    x:
                        opening.x +
                        opening.width / 2,
                    y:
                        opening.y
                },
                {
                    x:
                        opening.x +
                        opening.width / 2,
                    y:
                        opening.y +
                        opening.height
                },
                {
                    x:
                        opening.x -
                        opening.width / 2,
                    y:
                        opening.y +
                        opening.height
                }
            ];

            paintPolygon(
                points,
                p.deepShadow,
                0.015,
                2,
                structure.depth
            );

            if (chance(0.55)) {
                paintLine(
                    points[0],
                    points[1],
                    p.accent,
                    rand(1, 3),
                    0.5,
                    structure.depth
                );
            }
        }

        for (
            const attachment
            of structure.attachments
        ) {
            const end = {
                x:
                    attachment.x +
                    Math.cos(
                        attachment.angle
                    ) *
                    attachment.length,

                y:
                    attachment.y +
                    Math.sin(
                        attachment.angle
                    ) *
                    attachment.length
            };

            paintLine(
                {
                    x: attachment.x,
                    y: attachment.y
                },
                end,
                p.shadow,
                attachment.width,
                0.45,
                structure.depth
            );
        }
    }
}

/* =========================================================
   PAINT FIGURES
========================================================= */

function paintFigures() {
    for (
        const face
        of artist.scene.figures
    ) {
        const skin =
            mixColor(
                artist.palette.secondary,
                artist.palette.highlight,
                0.48
            );

        const points = [];

        const count = 72;

        for (
            let i = 0;
            i < count;
            i++
        ) {
            const a =
                i /
                count *
                TAU;

            const rx =
                face.headWidth / 2;

            const ry =
                face.headHeight / 2;

            const taper =
                0.9 +
                0.1 *
                Math.cos(a);

            points.push({
                x:
                    face.cx +
                    Math.cos(a) *
                    rx *
                    taper,

                y:
                    face.cy +
                    Math.sin(a) *
                    ry
            });
        }

        paintPolygon(
            points,
            skin,
            0.007,
            3.5,
            0.3
        );

        for (
            const feature
            of face.features
        ) {
            if (
                feature.type ===
                "eye"
            ) {
                paintEye(
                    feature,
                    face
                );
            }

            if (
                feature.type ===
                "nose"
            ) {
                paintNose(
                    feature,
                    face
                );
            }

            if (
                feature.type ===
                "mouth"
            ) {
                paintMouth(
                    feature,
                    face
                );
            }
        }
    }

    for (
        const mass
        of artist.scene.masses
    ) {
        if (
            mass.type !==
            "shoulders"
        ) continue;

        paintPolygon(
            mass.points,
            artist.palette.secondary,
            0.004,
            3,
            0.4
        );
    }
}

function paintEye(
    feature,
    face
) {
    const dark =
        artist.palette.deepShadow;

    const points = [];

    for (
        let i = 0;
        i <= 20;
        i++
    ) {
        const t =
            i / 20;

        points.push({
            x:
                feature.x +
                (t - 0.5) *
                feature.width,

            y:
                feature.y +
                Math.sin(t * Math.PI) *
                feature.height
        });
    }

    paintLine(
        points[0],
        points[20],
        dark,
        2.4,
        0.6,
        0.1
    );

    for (
        let i = 0;
        i < 45;
        i++
    ) {
        const a =
            rand(0, TAU);

        const r =
            Math.sqrt(
                rand()
            ) *
            feature.height;

        addPigment(
            feature.x +
                Math.cos(a) *
                feature.width *
                0.3,

            feature.y +
                Math.sin(a) *
                r,

            rand(1, 3),

            dark,
            rand(0.5, 1),
            0.1
        );
    }
}

function paintNose(
    feature,
    face
) {
    const points = [];

    for (
        let i = 0;
        i < 18;
        i++
    ) {
        const t =
            i / 17;

        points.push({
            x:
                feature.x +
                Math.sin(t * Math.PI) *
                rand(-5, 5),

            y:
                feature.y +
                t *
                feature.length
        });
    }

    paintLine(
        points[0],
        points[points.length - 1],
        artist.palette.shadow,
        rand(2, 5),
        0.4,
        0.1
    );
}

function paintMouth(
    feature,
    face
) {
    const points = [];

    for (
        let i = 0;
        i < 25;
        i++
    ) {
        const t =
            i / 24;

        points.push({
            x:
                feature.x +
                (t - 0.5) *
                feature.width,

            y:
                feature.y +
                Math.sin(
                    t * Math.PI
                ) *
                rand(-3, 3)
        });
    }

    paintLine(
        points[0],
        points[points.length - 1],
        artist.palette.shadow,
        rand(2, 4),
        0.45,
        0.1
    );
}

/* =========================================================
   PAINT ABSTRACT
========================================================= */

function paintAbstract() {
    for (
        const mass
        of artist.scene.masses
    ) {
        if (
            mass.type !==
            "abstract"
        ) continue;

        paintPolygon(
            mass.points,
            pick([
                artist.palette.dominant,
                artist.palette.secondary,
                artist.palette.accent
            ]),
            0.004,
            rand(2, 7),
            rand(0.2, 0.8)
        );
    }

    for (
        const stroke
        of artist.scene.strokes
    ) {
        paintLine(
            stroke.a,
            stroke.b,
            artist.palette.accent,
            stroke.width,
            0.4,
            0.5
        );
    }
}

/* =========================================================
   STRUCTURAL DETAIL PASS
========================================================= */

function addStructuralDetails() {
    const scene =
        artist.scene;

    const amount =
        700 +
        Math.floor(
            artist.idea.complexity *
            5000
        );

    for (
        let i = 0;
        i < amount;
        i++
    ) {
        let x;
        let y;

        if (
            artist.composition
        ) {
            const c =
                artist.composition;

            const region =
                chance(0.62);

            if (region) {
                x =
                    c.focalX +
                    rand(
                        -320,
                        320
                    );

                y =
                    c.focalY +
                    rand(
                        -280,
                        280
                    );
            } else {
                x =
                    rand(0, WIDTH);

                y =
                    rand(0, HEIGHT);
            }
        }

        let role =
            pick([
                "dominant",
                "secondary",
                "secondary",
                "accent"
            ]);

        if (
            chance(0.15)
        ) {
            role =
                "highlight";
        }

        const color =
            chooseSurfaceColor(
                role,
                x,
                y,
                1
            );

        addPigment(
            x,
            y,
            rand(
                0.8,
                3.8
            ),
            color,
            rand(
                0.12,
                0.48
            ),
            rand(
                0.3,
                1
            )
        );
    }
}

/* =========================================================
   COLOUR CORRECTION
========================================================= */

function colourCorrection() {
    const p =
        artist.pigment;

    if (!p.length) return;

    for (const pigment of p) {
        const light =
            lightingAt(
                pigment.x,
                pigment.y
            );

        let color =
            pigment.color;

        const local =
            luminance(color);

        if (
            light > 0.7 &&
            local < 0.35
        ) {
            color =
                mixColor(
                    color,
                    artist.palette.highlight,
                    0.18
                );
        }

        if (
            light < 0.15 &&
            local > 0.7
        ) {
            color =
                mixColor(
                    color,
                    artist.palette.shadow,
                    0.2
                );
        }

        pigment.color =
            shiftColor(
                color,
                rand(-3.5, 3.5),
                rand(0.96, 1.04),
                rand(-2.5, 2.5)
            );
    }
}

/* =========================================================
   FINAL EDGE PASS
========================================================= */

function finalEdges() {
    const scene =
        artist.scene;

    for (
        const structure
        of scene.structures
    ) {
        for (
            const level
            of structure.levels
        ) {
            const left = {
                x:
                    level.x -
                    level.width / 2,

                y:
                    level.y
            };

            const right = {
                x:
                    level.x +
                    level.width / 2,

                y:
                    level.y
            };

            paintLine(
                left,
                right,
                artist.palette.highlight,
                rand(1, 2.8),
                0.65,
                structure.depth
            );
        }
    }

    for (
        const mountain
        of scene.masses
    ) {
        if (
            mountain.type !==
            "mountain"
        ) continue;

        for (
            let i = 1;
            i <
            mountain.points.length;
            i++
        ) {
            if (
                chance(0.15)
            ) {
                paintLine(
                    mountain.points[i - 1],
                    mountain.points[i],
                    artist.palette.highlight,
                    rand(1, 3),
                    0.5,
                    mountain.depth
                );
            }
        }
    }
}

/* =========================================================
   RENDER
========================================================= */

function render(count) {
    ctx.fillStyle =
        "#050505";

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    const visible =
        artist.pigment.slice(
            0,
            count
        );

    visible.sort(
        (a, b) =>
            a.depth -
            b.depth
    );

    for (
        const p
        of visible
    ) {
        ctx.beginPath();

        ctx.globalAlpha =
            clamp(
                p.alpha,
                0,
                1
            );

        ctx.fillStyle =
            rgba(
                p.color,
                1
            );

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
        count.toLocaleString();
}

/* =========================================================
   PAINTING PASSES
========================================================= */

function buildPigment() {
    artist.pigment = [];

    paintBackground();

    paintClouds();

    paintMountains();

    paintTerrain();

    paintStructures();

    paintFigures();

    paintVegetation();

    paintAbstract();

    addStructuralDetails();

    colourCorrection();

    finalEdges();

    artist.pigment.sort(
        (a, b) =>
            a.depth -
            b.depth
    );
}

function phaseName(n) {
    const names = [
        "SKETCHING",
        "BUILDING FORMS",
        "BLOCKING COLOUR",
        "PAINTING STRUCTURE",
        "LIGHTING",
        "DETAILING",
        "FINISHING"
    ];

    return names[
        Math.min(
            names.length - 1,
            n
        )
    ];
}

function animatePainting(token) {
    if (
        !painting ||
        token !== generationToken
    ) {
        return;
    }

    const phases = [
        {
            from: 0,
            to: 0.12,
            duration: 1100
        },
        {
            from: 0.12,
            to: 0.27,
            duration: 1300
        },
        {
            from: 0.27,
            to: 0.52,
            duration: 1700
        },
        {
            from: 0.52,
            to: 0.72,
            duration: 1500
        },
        {
            from: 0.72,
            to: 0.84,
            duration: 1200
        },
        {
            from: 0.84,
            to: 0.96,
            duration: 1800
        },
        {
            from: 0.96,
            to: 1,
            duration: 1200
        }
    ];

    const phase =
        phases[artist.phase];

    if (!phase) {
        painting = false;
        render(
            artist.pigment.length
        );
        return;
    }

    const start =
        Math.floor(
            artist.pigment.length *
            phase.from
        );

    const end =
        Math.floor(
            artist.pigment.length *
            phase.to
        );

    const startTime =
        performance.now();

    function frame(now) {
        if (
            !painting ||
            token !== generationToken
        ) {
            return;
        }

        const t =
            clamp(
                (now - startTime) /
                phase.duration
            );

        const eased =
            smooth(t);

        const count =
            Math.floor(
                lerp(
                    start,
                    end,
                    eased
                )
            );

        render(count);

        if (t < 1) {
            requestAnimationFrame(
                frame
            );
        } else {
            artist.phase++;

            setTimeout(
                () =>
                    animatePainting(
                        token
                    ),
                100
            );
        }
    }

    requestAnimationFrame(
        frame
    );
}

/* =========================================================
   ARTIST
========================================================= */

function generateArtwork(
    newSeed = randomSeed()
) {
    generationToken++;

    const token =
        generationToken;

    painting = false;

    seed =
        newSeed >>> 0;

    rng =
        mulberry32(seed);

    artist.idea =
        generateIdea();

    artist.composition =
        createComposition(
            artist.idea
        );

    artist.palette =
        createPalette(
            artist.idea
        );

    buildWorld();

    buildPigment();

    artist.phase = 0;

    titleEl.textContent =
        generateTitle();

    seedEl.textContent =
        seed;

    compositionEl.textContent =
        describeComposition();

    paletteEl.textContent =
        artist.palette.scheme
            .toUpperCase();

    circlesEl.textContent =
        "0";

    render(0);

    painting = true;

    animatePainting(
        token
    );
}

/* =========================================================
   TITLE / DESCRIPTION
========================================================= */

function generateTitle() {
    const first = [
        "Silent",
        "Forgotten",
        "Endless",
        "Distant",
        "Hollow",
        "Hidden",
        "Fading",
        "Unfamiliar",
        "Ancient",
        "Solitary",
        "Weightless",
        "Quiet",
        "Immense",
        "Wandering",
        "Unseen",
        "Eternal"
    ];

    const second = [
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
        "Terrain",
        "Architecture",
        "Dream",
        "Field"
    ];

    return (
        pick(first) +
        " " +
        pick(second)
    );
}

function describeComposition() {
    const i =
        artist.idea;

    const pieces = [];

    if (
        i.depth > 0.6
    ) {
        pieces.push(
            "deep spatial layering"
        );
    }

    if (
        i.symmetry > 0.65
    ) {
        pieces.push(
            "balanced structural symmetry"
        );
    }

    if (
        i.branching > 0.6
    ) {
        pieces.push(
            "branching forms"
        );
    }

    if (
        i.horizontality > 0.6
    ) {
        pieces.push(
            "broad horizontal masses"
        );
    }

    if (
        i.verticality > 0.6
    ) {
        pieces.push(
            "strong vertical structure"
        );
    }

    if (
        i.atmosphere > 0.6
    ) {
        pieces.push(
            "atmospheric separation"
        );
    }

    if (
        i.perspective > 0.65
    ) {
        pieces.push(
            "strong perspective"
        );
    }

    if (!pieces.length) {
        pieces.push(
            "asymmetrical visual balance"
        );
    }

    return pieces
        .slice(0, 4)
        .join(" · ");
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
    () => {
        const link =
            document.createElement(
                "a"
            );

        const name =
            titleEl.textContent
                .replace(
                    /[^a-z0-9]+/gi,
                    "_"
                )
                .replace(
                    /^_+|_+$/g,
                    ""
                );

        link.download =
            `${name}_${seed}.png`;

        link.href =
            canvas.toDataURL(
                "image/png"
            );

        link.click();
    }
);

generateArtwork();
