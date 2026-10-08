const APP_VERSION = "ILB1";

const state = {
    currentImage: null,
    currentSource: null,
    currentCoordinate: null,
    archive: loadArchive()
};

const screens = {
    home: document.getElementById("homeScreen"),
    viewer: document.getElementById("viewerScreen"),
    coordinate: document.getElementById("coordinateScreen"),
    archive: document.getElementById("archiveScreen"),
    similar: document.getElementById("similarScreen")
};

const canvas = document.getElementById("imageCanvas");
const ctx = canvas.getContext("2d", {
    willReadFrequently: true
});

document.getElementById("uploadButton").onclick = () => {
    document.getElementById("fileInput").click();
};

document.getElementById("fileInput").addEventListener("change", async event => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    try {
        await processUploadedImage(file);
    } catch (error) {
        console.error(error);
        showToast("COULD NOT READ IMAGE");
    }

    event.target.value = "";
});

document.getElementById("coordinateButton").onclick = () => {
    showScreen("coordinate");
};

document.getElementById("randomButton").onclick = () => {
    openRandomImage();
};

document.getElementById("archiveButton").onclick = () => {
    renderArchive();
    showScreen("archive");
};

document.getElementById("backButton").onclick = () => {
    showScreen("home");
};

document.getElementById("coordinateBackButton").onclick = () => {
    showScreen("home");
};

document.getElementById("archiveBackButton").onclick = () => {
    showScreen("home");
};

document.getElementById("similarBackButton").onclick = () => {
    showScreen("viewer");
};

document.getElementById("randomViewerButton").onclick = () => {
    openRandomImage();
};

document.getElementById("previousButton").onclick = () => {
    navigateImage(-1);
};

document.getElementById("nextButton").onclick = () => {
    navigateImage(1);
};

document.getElementById("openCoordinateButton").onclick = () => {
    const input = document.getElementById("coordinateInput");
    const error = document.getElementById("coordinateError");

    error.textContent = "";

    try {
        const image = decodeCoordinate(input.value.trim());
        openImage(image, "coordinate");
    } catch (e) {
        error.textContent = e.message;
    }
};

document.getElementById("copyCoordinateButton").onclick = async () => {
    if (!state.currentCoordinate) {
        return;
    }

    try {
        await navigator.clipboard.writeText(state.currentCoordinate);
        showToast("COORDINATES COPIED");
    } catch {
        const textarea = document.getElementById("coordinateValue");
        textarea.select();
        document.execCommand("copy");
        showToast("COORDINATES COPIED");
    }
};

document.getElementById("downloadButton").onclick = () => {
    downloadCurrentImage();
};

document.getElementById("saveArchiveButton").onclick = () => {
    saveCurrentToArchive();
};

document.getElementById("similarButton").onclick = () => {
    findSimilarImages();
};

function showScreen(name) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove("active");
    });

    screens[name].classList.add("active");
}

async function processUploadedImage(file) {
    const bitmap = await createImageBitmap(file);

    const width = bitmap.width;
    const height = bitmap.height;

    if (width < 1 || height < 1) {
        throw new Error("INVALID IMAGE DIMENSIONS");
    }

    const imageCanvas = document.createElement("canvas");
    imageCanvas.width = width;
    imageCanvas.height = height;

    const imageContext = imageCanvas.getContext("2d", {
        willReadFrequently: true
    });

    imageContext.drawImage(bitmap, 0, 0);

    const imageData = imageContext.getImageData(
        0,
        0,
        width,
        height
    );

    const pixels = new Uint8Array(width * height * 3);

    for (let i = 0, j = 0; i < imageData.data.length; i += 4) {
        pixels[j++] = imageData.data[i];
        pixels[j++] = imageData.data[i + 1];
        pixels[j++] = imageData.data[i + 2];
    }

    const image = {
        width,
        height,
        pixels
    };

    openImage(image, "upload");
}

function openImage(image, source = "library") {
    state.currentImage = image;
    state.currentSource = source;

    state.currentCoordinate = encodeCoordinate(image);

    renderImage(image);
    updateInformation();

    showScreen("viewer");
}

function renderImage(image) {
    canvas.width = image.width;
    canvas.height = image.height;

    const data = new Uint8ClampedArray(
        image.width * image.height * 4
    );

    for (let i = 0, j = 0; i < image.pixels.length; i += 3) {
        data[j++] = image.pixels[i];
        data[j++] = image.pixels[i + 1];
        data[j++] = image.pixels[i + 2];
        data[j++] = 255;
    }

    ctx.putImageData(
        new ImageData(data, image.width, image.height),
        0,
        0
    );
}

function updateInformation() {
    const image = state.currentImage;

    document.getElementById("dimensionsValue").textContent =
        `${image.width} × ${image.height}`;

    document.getElementById("coordinateValue").value =
        state.currentCoordinate;

    document.getElementById("locationValue").textContent =
        createHumanLocation(image);
}

function createHumanLocation(image) {
    const totalPixels = image.width * image.height;

    return [
        `UNIVERSE: RGB-8`,
        `WIDTH: ${image.width}`,
        `HEIGHT: ${image.height}`,
        `PIXELS: ${totalPixels}`,
        `CHANNELS: 3`,
        `COLOUR VALUES: 256`
    ].join("\n");
}

function encodeCoordinate(image) {
    const pixelString = bytesToBase64Url(image.pixels);

    return `${APP_VERSION}:${image.width}x${image.height}:${pixelString}`;
}

function decodeCoordinate(coordinate) {
    const match = coordinate.match(
        /^ILB1:(\d+)x(\d+):([A-Za-z0-9_-]+)$/
    );

    if (!match) {
        throw new Error("INVALID COORDINATE FORMAT");
    }

    const width = Number(match[1]);
    const height = Number(match[2]);

    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
        throw new Error("IMAGE DIMENSIONS ARE TOO LARGE");
    }

    if (width < 1 || height < 1) {
        throw new Error("INVALID IMAGE DIMENSIONS");
    }

    const pixelCount = width * height;

    if (!Number.isSafeInteger(pixelCount)) {
        throw new Error("IMAGE IS TOO LARGE FOR THIS BROWSER");
    }

    const pixels = base64UrlToBytes(match[3]);

    const expectedLength = pixelCount * 3;

    if (pixels.length !== expectedLength) {
        throw new Error("COORDINATE DOES NOT MATCH ITS DIMENSIONS");
    }

    return {
        width,
        height,
        pixels
    };
}

function bytesToBase64Url(bytes) {
    let binary = "";

    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(
            i,
            Math.min(i + chunkSize, bytes.length)
        );

        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
    const normalized = value
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padding =
        "=".repeat((4 - normalized.length % 4) % 4);

    let binary;

    try {
        binary = atob(normalized + padding);
    } catch {
        throw new Error("INVALID PIXEL DATA");
    }

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

function navigateImage(direction) {
    if (!state.currentImage) {
        return;
    }

    const current = state.currentImage;
    const total = current.pixels.length;

    const pixels = new Uint8Array(total);

    pixels.set(current.pixels);

    let carry = direction > 0 ? 1 : -1;

    for (let i = pixels.length - 1; i >= 0; i--) {
        const value = pixels[i] + carry;

        if (value > 255) {
            pixels[i] = 0;
            carry = 1;
        } else if (value < 0) {
            pixels[i] = 255;
            carry = -1;
        } else {
            pixels[i] = value;
            carry = 0;
            break;
        }
    }

    if (carry !== 0) {
        showToast(
            direction > 0
                ? "END OF THIS IMAGE SPACE"
                : "BEGINNING OF THIS IMAGE SPACE"
        );
        return;
    }

    openImage({
        width: current.width,
        height: current.height,
        pixels
    }, "navigation");
}

function openRandomImage() {
    const width = randomDimension();
    const height = randomDimension();

    const pixelCount = width * height;
    const pixels = new Uint8Array(pixelCount * 3);

    crypto.getRandomValues(pixels);

    openImage({
        width,
        height,
        pixels
    }, "random");
}

function randomDimension() {
    const options = [
        1,
        2,
        3,
        4,
        8,
        16,
        24,
        32,
        48,
        64,
        96,
        128
    ];

    return options[
        Math.floor(Math.random() * options.length)
    ];
}

function saveCurrentToArchive() {
    if (!state.currentImage || !state.currentCoordinate) {
        return;
    }

    const existing = state.archive.find(
        item => item.coordinate === state.currentCoordinate
    );

    if (existing) {
        showToast("ALREADY IN ARCHIVE");
        return;
    }

    const image = state.currentImage;

    const item = {
        coordinate: state.currentCoordinate,
        width: image.width,
        height: image.height,
        pixels: bytesToBase64Url(image.pixels),
        created: Date.now()
    };

    state.archive.unshift(item);

    try {
        localStorage.setItem(
            "ILB_ARCHIVE",
            JSON.stringify(state.archive)
        );

        showToast("IMAGE ADDED TO ARCHIVE");
    } catch {
        state.archive.shift();
        showToast("ARCHIVE STORAGE LIMIT REACHED");
    }
}

function loadArchive() {
    try {
        const value = localStorage.getItem("ILB_ARCHIVE");

        if (!value) {
            return [];
        }

        const parsed = JSON.parse(value);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed;
    } catch {
        return [];
    }
}

function renderArchive() {
    const grid = document.getElementById("archiveGrid");
    const empty = document.getElementById("emptyArchive");

    grid.innerHTML = "";

    if (state.archive.length === 0) {
        empty.style.display = "block";
        return;
    }

    empty.style.display = "none";

    for (const item of state.archive) {
        const element = document.createElement("div");
        element.className = "archiveItem";

        const image = document.createElement("img");
        image.className = "archiveImage";
        image.src = createDataURL(
            item.width,
            item.height,
            base64UrlToBytes(item.pixels)
        );

        const info = document.createElement("div");
        info.className = "archiveInfo";

        const dimensions = document.createElement("div");
        dimensions.className = "archiveDimensions";
        dimensions.textContent =
            `${item.width} × ${item.height}`;

        const coordinates = document.createElement("div");
        coordinates.className = "archiveCoordinates";
        coordinates.textContent = item.coordinate;

        info.appendChild(dimensions);
        info.appendChild(coordinates);

        element.appendChild(image);
        element.appendChild(info);

        element.onclick = () => {
            openImage(
                {
                    width: item.width,
                    height: item.height,
                    pixels: base64UrlToBytes(item.pixels)
                },
                "archive"
            );
        };

        grid.appendChild(element);
    }
}

function findSimilarImages() {
    if (!state.currentImage) {
        return;
    }

    const grid = document.getElementById("similarGrid");
    const empty = document.getElementById("noSimilar");

    grid.innerHTML = "";

    const candidates = state.archive
        .filter(item => item.coordinate !== state.currentCoordinate)
        .map(item => {
            const pixels = base64UrlToBytes(item.pixels);

            const score = similarityScore(
                state.currentImage,
                {
                    width: item.width,
                    height: item.height,
                    pixels
                }
            );

            return {
                ...item,
                score
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);

    if (candidates.length === 0) {
        empty.style.display = "block";
        showScreen("similar");
        return;
    }

    empty.style.display = "none";

    for (const item of candidates) {
        const element = document.createElement("div");
        element.className = "similarItem";

        const image = document.createElement("img");
        image.className = "similarImage";

        image.src = createDataURL(
            item.width,
            item.height,
            base64UrlToBytes(item.pixels)
        );

        const info = document.createElement("div");
        info.className = "similarInfo";

        const score = document.createElement("div");
        score.className = "similarScore";
        score.textContent =
            `${(item.score * 100).toFixed(1)}% SIMILAR`;

        info.appendChild(score);

        element.appendChild(image);
        element.appendChild(info);

        element.onclick = () => {
            openImage(
                {
                    width: item.width,
                    height: item.height,
                    pixels: base64UrlToBytes(item.pixels)
                },
                "similar"
            );
        };

        grid.appendChild(element);
    }

    showScreen("similar");
}

function similarityScore(a, b) {
    const samples = 900;

    let totalDifference = 0;

    for (let i = 0; i < samples; i++) {
        const u = samples === 1
            ? 0
            : i / (samples - 1);

        const av = sampleImage(a, u);
        const bv = sampleImage(b, u);

        totalDifference +=
            Math.abs(av[0] - bv[0]) +
            Math.abs(av[1] - bv[1]) +
            Math.abs(av[2] - bv[2]);
    }

    const maxDifference = samples * 765;

    return Math.max(
        0,
        1 - totalDifference / maxDifference
    );
}

function sampleImage(image, normalizedPosition) {
    const aspect =
        image.width / image.height;

    let x;
    let y;

    if (aspect >= 1) {
        x = Math.floor(
            normalizedPosition * image.width
        );

        y = Math.floor(
            ((normalizedPosition * 997) % 1) *
            image.height
        );
    } else {
        y = Math.floor(
            normalizedPosition * image.height
        );

        x = Math.floor(
            ((normalizedPosition * 997) % 1) *
            image.width
        );
    }

    x = Math.max(
        0,
        Math.min(image.width - 1, x)
    );

    y = Math.max(
        0,
        Math.min(image.height - 1, y)
    );

    const index =
        (y * image.width + x) * 3;

    return [
        image.pixels[index],
        image.pixels[index + 1],
        image.pixels[index + 2]
    ];
}

function createDataURL(width, height, pixels) {
    const temp = document.createElement("canvas");

    temp.width = width;
    temp.height = height;

    const context = temp.getContext("2d");

    const data = new Uint8ClampedArray(
        width * height * 4
    );

    for (let i = 0, j = 0; i < pixels.length; i += 3) {
        data[j++] = pixels[i];
        data[j++] = pixels[i + 1];
        data[j++] = pixels[i + 2];
        data[j++] = 255;
    }

    context.putImageData(
        new ImageData(data, width, height),
        0,
        0
    );

    return temp.toDataURL("image/png");
}

function downloadCurrentImage() {
    if (!state.currentImage) {
        return;
    }

    const image = state.currentImage;

    const dataURL = createDataURL(
        image.width,
        image.height,
        image.pixels
    );

    const link = document.createElement("a");

    link.href = dataURL;
    link.download =
        `image-library-${image.width}x${image.height}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();
}

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("visible");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("visible");
    }, 1800);
}
