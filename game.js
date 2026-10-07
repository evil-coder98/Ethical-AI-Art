const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const titleElement = document.getElementById("title");
const seedElement = document.getElementById("seed");
const compositionElement = document.getElementById("composition");
const paletteElement = document.getElementById("palette");
const circlesElement = document.getElementById("circles");

const TAU = Math.PI * 2;

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

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, amount) {
    return a + (b - a) * amount;
}

function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 1);
    v = clamp(v, 0, 1);

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

function rgbString(color, alpha = 1) {
    return `rgba(${color.r},${color.g},${color.b},${alpha})`;
}

function createPalette(random) {
    const baseHue = randomRange(random, 0, 360);

    const systems = [
        {
            name: "ANALOGOUS",
            hues: [
                baseHue - 35,
                baseHue - 15,
                baseHue,
                baseHue + 18,
                baseHue + 38
            ]
        },
        {
            name: "COMPLEMENTARY",
            hues: [
                baseHue - 15,
                baseHue,
                baseHue + 15,
                baseHue + 180,
                baseHue + 195
            ]
        },
        {
            name: "TRIADIC",
            hues: [
                baseHue,
                baseHue + 120,
                baseHue + 240,
                baseHue + 120,
                baseHue
            ]
        },
        {
            name: "SPLIT-COMPLEMENTARY",
            hues: [
                baseHue,
                baseHue - 150,
                baseHue + 150,
                baseHue + 20,
                baseHue - 20
            ]
        },
        {
            name: "MONOCHROMATIC",
            hues: [
                baseHue,
                baseHue,
                baseHue,
                baseHue,
                baseHue
            ]
        }
    ];

    const system = systems[randomInt(random, 0, systems.length - 1)];

    const palette = system.hues.map((hue, index) => {
        let saturation;
        let value;

        if (index === 0) {
            saturation = randomRange(random, 0.35, 0.65);
            value = randomRange(random, 0.18, 0.35);
        } else if (index === 4) {
            saturation = randomRange(random, 0.45, 0.85);
            value = randomRange(random, 0.75, 1);
        } else {
            saturation = randomRange(random, 0.35, 0.8);
            value = randomRange(random, 0.35, 0.85);
        }

        return hsvToRgb(hue, saturation, value);
    });

    return {
        name: system.name,
        colors: palette
    };
}

function chooseComposition(random) {
    const compositions = [
        "RULE OF THIRDS",
        "ASYMMETRICAL BALANCE",
        "CENTRAL FOCUS",
        "DIAGONAL FLOW",
        "GOLDEN BALANCE"
    ];

    return compositions[randomInt(random, 0, compositions.length - 1)];
}

function createScene(random, width, height) {
    const sceneTypes = [
        "MOUNTAIN",
        "FOREST",
        "OCEAN",
        "DESERT",
        "VALLEY",
        "RUINS",
        "ISLAND",
        "NIGHT CITY"
    ];

    const type = sceneTypes[randomInt(random, 0, sceneTypes.length - 1)];

    const thirdsX = [
        width * 0.333,
        width * 0.666
    ];

    const thirdsY = [
        height * 0.333,
        height * 0.666
    ];

    const focalX = thirdsX[randomInt(random, 0, 1)] + randomRange(random, -width * 0.08, width * 0.08);
    const focalY = thirdsY[randomInt(random, 0, 1)] + randomRange(random, -height * 0.08, height * 0.08);

    return {
        type,
        focalX,
        focalY,
        horizon: randomRange(random, height * 0.42, height * 0.67),
        lightX: randomRange(random, width * 0.15, width * 0.85),
        lightY: randomRange(random, height * 0.1, height * 0.45),
        scale: randomRange(random, 0.85, 1.2)
    };
}

function circle(x, y, radius, color, alpha, layer = 0) {
    return {
        x,
        y,
        radius,
        color,
        alpha,
        layer
    };
}

function drawCircle(item) {
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, TAU);
    ctx.fillStyle = rgbString(item.color, item.alpha);
    ctx.fill();
}

function paintBackground(random, scene, palette, width, height, circles) {
    const rows = Math.ceil(height / 9);

    for (let y = 0; y < height; y += 9) {
        const progress = y / height;

        let color;

        if (progress < scene.horizon / height) {
            color = palette.colors[
                progress < 0.35 ? 0 : 1
            ];
        } else {
            color = palette.colors[2];
        }

        for (let x = 0; x < width; x += 9) {
            const jitterX = randomRange(random, -5, 5);
            const jitterY = randomRange(random, -5, 5);

            const radius = randomRange(random, 5, 10);

            const brightness = randomRange(random, 0.65, 1.15);

            const c = {
                r: clamp(Math.round(color.r * brightness), 0, 255),
                g: clamp(Math.round(color.g * brightness), 0, 255),
                b: clamp(Math.round(color.b * brightness), 0, 255)
            };

            circles.push(
                circle(
                    x + jitterX,
                    y + jitterY,
                    radius,
                    c,
                    randomRange(random, 0.12, 0.3),
                    0
                )
            );
        }
    }
}

function paintGlow(random, x, y, radius, color, circles, layer) {
    const count = Math.floor(radius * 2.5);

    for (let i = 0; i < count; i++) {
        const angle = randomRange(random, 0, TAU);
        const distance = Math.pow(random(), 0.6) * radius;

        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;

        const size = randomRange(random, 3, 11) * (1 - distance / radius);

        circles.push(
            circle(
                px,
                py,
                Math.max(1, size),
                color,
                randomRange(random, 0.015, 0.06),
                layer
            )
        );
    }
}

function paintSunOrMoon(random, scene, palette, width, height, circles) {
    const radius = randomRange(random, width * 0.035, width * 0.075);

    const x = scene.lightX;
    const y = scene.lightY;

    const color = palette.colors[4];

    paintGlow(random, x, y, radius * 4, color, circles, 1);

    const count = Math.floor(radius * 7);

    for (let i = 0; i < count; i++) {
        const angle = randomRange(random, 0, TAU);
        const distance = Math.sqrt(random()) * radius;

        circles.push(
            circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                randomRange(random, 3, 8),
                color,
                randomRange(random, 0.35, 0.8),
                2
            )
        );
    }
}

function mountainPath(random, baseY, peakX, peakY, width, circles, color, layer) {
    const points = [];

    const start = -width * 0.15;
    const end = width * 1.15;

    for (let x = start; x <= end; x += 12) {
        const normalized = (x - peakX) / (width * 0.5);
        const mountain = Math.max(0, 1 - Math.abs(normalized));

        const noise = randomRange(random, -20, 20);

        const y = baseY - mountain * (baseY - peakY) + noise;

        points.push({ x, y });
    }

    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const count = Math.ceil(distance / 7);

        for (let j = 0; j < count; j++) {
            const t = j / count;
            const px = lerp(a.x, b.x, t);
            const py = lerp(a.y, b.y, t);

            for (let k = 0; k < randomInt(random, 1, 4); k++) {
                const depth = random();

                circles.push(
                    circle(
                        px + randomRange(random, -10, 10),
                        py + depth * 70,
                        randomRange(random, 4, 9),
                        color,
                        randomRange(random, 0.15, 0.45),
                        layer
                    )
                );
            }
        }
    }
}

function paintMountains(random, scene, palette, width, height, circles) {
    const mountainColor = palette.colors[1];
    const distantColor = palette.colors[0];

    mountainPath(
        random,
        scene.horizon + 40,
        width * 0.25,
        height * 0.25,
        width * 0.65,
        circles,
        distantColor,
        2
    );

    mountainPath(
        random,
        scene.horizon + 65,
        scene.focalX,
        scene.horizon - height * 0.25,
        width * 0.75,
        circles,
        mountainColor,
        3
    );

    mountainPath(
        random,
        scene.horizon + 80,
        width * 0.75,
        scene.horizon - height * 0.12,
        width * 0.7,
        circles,
        palette.colors[2],
        4
    );
}

function paintGround(random, scene, palette, width, height, circles) {
    const startY = scene.horizon;

    for (let y = startY; y < height; y += 11) {
        const depth = (y - startY) / (height - startY);

        for (let x = 0; x < width; x += 11) {
            const perspective = 1 + depth * 2;

            const radius = randomRange(random, 3, 7) * perspective;

            const base = palette.colors[
                randomInt(random, 1, 3)
            ];

            circles.push(
                circle(
                    x + randomRange(random, -7, 7),
                    y + randomRange(random, -5, 5),
                    radius,
                    base,
                    randomRange(random, 0.12, 0.35),
                    3
                )
            );
        }
    }
}

function paintTrees(random, scene, palette, width, height, circles) {
    const count = randomInt(random, 18, 40);

    for (let i = 0; i < count; i++) {
        const x = randomRange(random, 0, width);
        const groundY = randomRange(
            random,
            scene.horizon + 20,
            height * 0.95
        );

        const treeHeight = randomRange(random, height * 0.05, height * 0.18);
        const trunkWidth = Math.max(3, treeHeight * 0.08);

        const trunkColor = palette.colors[0];
        const leafColor = palette.colors[randomInt(random, 1, 3)];

        for (let y = groundY - treeHeight * 0.35; y < groundY; y += 7) {
            circles.push(
                circle(
                    x + randomRange(random, -3, 3),
                    y,
                    trunkWidth,
                    trunkColor,
                    randomRange(random, 0.3, 0.7),
                    5
                )
            );
        }

        const foliageCount = Math.floor(treeHeight * 2.2);

        for (let j = 0; j < foliageCount; j++) {
            const px = x + randomRange(random, -treeHeight * 0.28, treeHeight * 0.28);
            const py = groundY - randomRange(random, treeHeight * 0.35, treeHeight);

            const radius = randomRange(random, 5, 13);

            circles.push(
                circle(
                    px,
                    py,
                    radius,
                    leafColor,
                    randomRange(random, 0.2, 0.55),
                    6
                )
            );
        }
    }
}

function paintOcean(random, scene, palette, width, height, circles) {
    for (let y = scene.horizon; y < height; y += 8) {
        const depth = (y - scene.horizon) / (height - scene.horizon);

        for (let x = 0; x < width; x += 10) {
            const wave = Math.sin(x * 0.025 + y * 0.018) * 7;

            const color = palette.colors[
                randomInt(random, 1, 3)
            ];

            circles.push(
                circle(
                    x + randomRange(random, -5, 5),
                    y + wave + randomRange(random, -3, 3),
                    randomRange(random, 3, 8) * (1 + depth),
                    color,
                    randomRange(random, 0.15, 0.4),
                    4
                )
            );
        }
    }
}

function paintIsland(random, scene, palette, width, height, circles) {
    const islandX = scene.focalX;
    const islandY = scene.horizon + height * 0.2;

    const islandWidth = width * randomRange(random, 0.18, 0.35);

    for (let i = 0; i < islandWidth * 3; i++) {
        const x = islandX + randomRange(random, -islandWidth / 2, islandWidth / 2);
        const normalized = Math.abs(x - islandX) / (islandWidth / 2);

        if (normalized > 1) continue;

        const thickness = (1 - normalized * normalized) * height * 0.07;

        circles.push(
            circle(
                x,
                islandY + randomRange(random, -thickness, thickness),
                randomRange(random, 5, 12),
                palette.colors[0],
                randomRange(random, 0.3, 0.7),
                6
            )
        );
    }

    paintTrees(random, scene, palette, width, height, circles);
}

function paintCity(random, scene, palette, width, height, circles) {
    const buildingCount = randomInt(random, 8, 18);

    for (let i = 0; i < buildingCount; i++) {
        const x = (i / buildingCount) * width + randomRange(random, -15, 15);
        const buildingWidth = randomRange(random, 25, 75);
        const buildingHeight = randomRange(random, height * 0.08, height * 0.35);

        const bottom = scene.horizon + 20;

        for (let y = bottom - buildingHeight; y < bottom; y += 9) {
            for (let bx = x; bx < x + buildingWidth; bx += 9) {
                circles.push(
                    circle(
                        bx + randomRange(random, -3, 3),
                        y + randomRange(random, -3, 3),
                        randomRange(random, 4, 8),
                        palette.colors[0],
                        randomRange(random, 0.25, 0.55),
                        5
                    )
                );
            }
        }

        const windowColor = palette.colors[4];

        const windows = randomInt(random, 3, 12);

        for (let w = 0; w < windows; w++) {
            circles.push(
                circle(
                    randomRange(random, x + 5, x + buildingWidth - 5),
                    randomRange(random, bottom - buildingHeight + 8, bottom - 8),
                    randomRange(random, 2, 5),
                    windowColor,
                    randomRange(random, 0.35, 0.8),
                    7
                )
            );
        }
    }
}

function paintRuin(random, scene, palette, width, height, circles) {
    const x = scene.focalX;
    const baseY = scene.horizon + height * 0.15;
    const ruinWidth = width * 0.25;
    const ruinHeight = height * 0.22;

    for (let px = x - ruinWidth / 2; px < x + ruinWidth / 2; px += 8) {
        const broken = random() > 0.12;

        if (!broken) continue;

        for (let py = baseY - ruinHeight; py < baseY; py += 9) {
            if (random() < 0.18) continue;

            circles.push(
                circle(
                    px + randomRange(random, -3, 3),
                    py + randomRange(random, -3, 3),
                    randomRange(random, 4, 8),
                    palette.colors[0],
                    randomRange(random, 0.25, 0.65),
                    6
                )
            );
        }
    }
}

function paintFocalSubject(random, scene, palette, width, height, circles) {
    const x = scene.focalX;
    const y = scene.focalY;

    const radius = randomRange(random, width * 0.045, width * 0.09);

    const mainColor = palette.colors[4];

    paintGlow(random, x, y, radius * 2.4, mainColor, circles, 7);

    const count = Math.floor(radius * 9);

    for (let i = 0; i < count; i++) {
        const angle = randomRange(random, 0, TAU);
        const distance = Math.sqrt(random()) * radius;

        const light = distance / radius;

        circles.push(
            circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                randomRange(random, 3, 8),
                mainColor,
                randomRange(random, 0.35, 0.9) * (1 - light * 0.4),
                8
            )
        );
    }

    for (let i = 0; i < count * 0.35; i++) {
        circles.push(
            circle(
                x + randomRange(random, -radius, radius),
                y + randomRange(random, -radius, radius),
                randomRange(random, 2, 5),
                palette.colors[3],
                randomRange(random, 0.2, 0.6),
                9
            )
        );
    }
}

function paintAtmosphere(random, scene, palette, width, height, circles) {
    const count = Math.floor(width * height / 900);

    for (let i = 0; i < count; i++) {
        const x = randomRange(random, 0, width);
        const y = randomRange(random, 0, height);

        const color = palette.colors[randomInt(random, 2, 4)];

        circles.push(
            circle(
                x,
                y,
                randomRange(random, 1, 4),
                color,
                randomRange(random, 0.03, 0.14),
                10
            )
        );
    }
}

function generateTitle(random, scene) {
    const first = [
        "THE",
        "A",
        "BEYOND THE",
        "UNDER THE",
        "WHERE THE",
        "WHEN THE",
        "THE LAST",
        "THE SILENT"
    ];

    const second = [
        "SILENT",
        "ENDLESS",
        "HOLLOW",
        "GOLDEN",
        "VIOLET",
        "FORGOTTEN",
        "LONELY",
        "ANCIENT",
        "DREAMING",
        "ETERNAL"
    ];

    const nouns = {
        MOUNTAIN: ["MOUNTAIN", "PEAK", "VALLEY", "SUMMIT"],
        FOREST: ["FOREST", "TREES", "WOOD", "WILDERNESS"],
        OCEAN: ["SEA", "OCEAN", "TIDE", "HORIZON"],
        DESERT: ["DESERT", "DUNE", "SANDS", "WASTELAND"],
        VALLEY: ["VALLEY", "HOLLOW", "PASS", "LAND"],
        RUINS: ["RUINS", "KINGDOM", "TEMPLE", "CITY"],
        ISLAND: ["ISLAND", "SHORE", "SEA", "WORLD"],
        "NIGHT CITY": ["CITY", "LIGHTS", "STREETS", "NIGHT"]
    };

    const nounList = nouns[scene.type];
    const noun = nounList[randomInt(random, 0, nounList.length - 1)];

    return `${first[randomInt(random, 0, first.length - 1)]} ${second[randomInt(random, 0, second.length - 1)]} ${noun}`;
}

function renderArtwork(seed) {
    const random = createRandom(seed);

    const width = 1200;
    const height = 900;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const palette = createPalette(random);
    const composition = chooseComposition(random);
    const scene = createScene(random, width, height);

    const circles = [];

    paintBackground(random, scene, palette, width, height, circles);

    paintSunOrMoon(random, scene, palette, width, height, circles);

    if (scene.type === "OCEAN") {
        paintOcean(random, scene, palette, width, height, circles);
    } else {
        paintGround(random, scene, palette, width, height, circles);
    }

    paintMountains(random, scene, palette, width, height, circles);

    if (scene.type === "FOREST") {
        paintTrees(random, scene, palette, width, height, circles);
    }

    if (scene.type === "ISLAND") {
        paintIsland(random, scene, palette, width, height, circles);
    }

    if (scene.type === "NIGHT CITY") {
        paintCity(random, scene, palette, width, height, circles);
    }

    if (scene.type === "RUINS") {
        paintRuin(random, scene, palette, width, height, circles);
    }

    if (scene.type === "DESERT") {
        for (let i = 0; i < 3; i++) {
            mountainPath(
                random,
                scene.horizon + i * 35,
                randomRange(random, 0, width),
                scene.horizon - randomRange(random, 30, 160),
                width * randomRange(random, 0.4, 0.8),
                circles,
                palette.colors[i],
                5
            );
        }
    }

    paintFocalSubject(random, scene, palette, width, height, circles);

    paintAtmosphere(random, scene, palette, width, height, circles);

    circles.sort((a, b) => a.layer - b.layer);

    ctx.globalCompositeOperation = "source-over";

    for (const item of circles) {
        drawCircle(item);
    }

    const title = generateTitle(random, scene);

    currentArtwork = {
        seed,
        title,
        palette,
        composition,
        scene,
        circleCount: circles.length
    };

    titleElement.textContent = title;
    seedElement.textContent = seed;
    compositionElement.textContent = composition;
    paletteElement.textContent = palette.name;
    circlesElement.textContent = circles.length.toLocaleString();
}

function generate() {
    const seed = randomSeed();
    renderArtwork(seed);
}

function saveArtwork() {
    if (!currentArtwork) return;

    const link = document.createElement("a");

    const safeTitle = currentArtwork.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    link.download = `${safeTitle}-${currentArtwork.seed}.png`;
    link.href = canvas.toDataURL("image/png");

    link.click();
}

document.getElementById("generate").addEventListener("click", generate);
document.getElementById("save").addEventListener("click", saveArtwork);

generate();
