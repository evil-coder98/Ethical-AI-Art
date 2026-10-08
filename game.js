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

function $(id) {
    return document.getElementById(id);
}

function showScreen(name) {
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.remove("active");
        }
    });

    if (screens[name]) {
        screens[name].classList.add("active");
    }
}

function showToast(message) {
    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("visible");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("visible");
    }, 1800);
}

$("uploadButton").addEventListener("click", () => {
    $("fileInput").click();
});

$("fileInput").addEventListener("change", async event => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    try {
        const image = await loadImageFile(file);

        openImage(image, "upload");
    } catch (error) {
        console.error(error);
        showToast("FAILED TO LOAD IMAGE");
    }

    event.target.value = "";
});

$("coordinateButton").addEventListener("click", () => {
    $("coordinateInput").value = "";
    $("coordinateError").textContent = "";
    showScreen("coordinate");
});

$("randomButton").addEventListener("click", () => {
    openRandomImage();
});

$("archiveButton").addEventListener("click", () => {
    renderArchive();
    showScreen("archive");
});

$("backButton").addEventListener("click", () => {
    showScreen("home");
});

$("coordinateBackButton").addEventListener("click", () => {
    showScreen("home");
});

$("archiveBackButton").addEventListener("click", () => {
    showScreen("home");
});

$("similarBackButton").addEventListener("click", () => {
    showScreen("viewer");
});

$("randomViewerButton").addEventListener("click", () => {
    openRandomImage();
});

$("previousButton").addEventListener("click", () => {
    navigateImage(-1);
});

$("nextButton").addEventListener("click", () => {
    navigateImage(1);
});

$("openCoordinateButton").addEventListener("click", () => {
    const input = $("coordinateInput");
    const error = $("coordinateError");

    error.textContent = "";

    try {
        const image = decodeCoordinate(input.value.trim());

        openImage(image, "coordinate");
    } catch (e) {
        error.textContent = e.message;
    }
});

$("copyCoordinateButton").addEventListener("click", async () => {
    if (!state.currentCoordinate) {
        return;
    }

    try {
        await navigator.clipboard.writeText(
            state.currentCoordinate
        );

        showToast("COORDINATES COPIED");
    } catch {
        const textarea = $("coordinateValue");

        textarea.focus();
        textarea.select();

        document.execCommand("copy");

        showToast("COORDINATES COPIED");
    }
});

$("downloadButton").addEventListener("click", () => {
    downloadCurrentImage();
});

$("saveArchiveButton").addEventListener("click", () => {
    saveCurrentToArchive();
});

$("similarButton").addEventListener("click", () => {
    findSimilarImages();
});


function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();

            image.onload = () => {
                try {
                    const tempCanvas = document.createElement("canvas");

                    tempCanvas.width = image.naturalWidth;
                    tempCanvas.height = image.naturalHeight;

                    const tempContext = tempCanvas.getContext("2d", {
                        willReadFrequently: true
                    });

                    tempContext.drawImage(
                        image,
                        0,
                        0
                    );

                    const imageData = tempContext.getImageData(
                        0,
                        0,
                        image.naturalWidth,
                        image.naturalHeight
                    );

                    const pixels = new Uint8Array(
                        image.naturalWidth *
                        image.naturalHeight *
                        3
                    );

                    for (
                        let source = 0,
                        destination = 0;
                        source < imageData.data.length;
                        source += 4
                    ) {
                        pixels[destination++] =
                            imageData.data[source];

                        pixels[destination++] =
                            imageData.data[source + 1];

                        pixels[destination++] =
                            imageData.data[source + 2];
                    }

                    resolve({
                        width: image.naturalWidth,
                        height: image.naturalHeight,
                        pixels
                    });

                } catch (error) {
                    reject(error);
                }
            };

            image.onerror = () => {
                reject(new Error("IMAGE DECODING FAILED"));
            };

            image.src = reader.result;
        };

        reader.onerror = () => {
            reject(new Error("FILE READING FAILED"));
        };

        reader.readAsDataURL(file);
    });
}


function openImage(image, source) {
    if (!image || !image.width || !image.height) {
        showToast("INVALID IMAGE");
        return;
    }

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
        image.width *
        image.height *
        4
    );

    for (
        let source = 0,
        destination = 0;
        source < image.pixels.length;
        source += 3
    ) {
        data[destination++] =
            image.pixels[source];

        data[destination++] =
            image.pixels[source + 1];

        data[destination++] =
            image.pixels[source + 2];

        data[destination++] = 255;
    }

    const imageData = new ImageData(
        data,
        image.width,
        image.height
    );

    ctx.putImageData(
        imageData,
        0,
        0
    );
}


function updateInformation() {
    if (!state.currentImage) {
        return;
    }

    const image = state.currentImage;

    $("dimensionsValue").textContent =
        `${image.width} × ${image.height}`;

    $("coordinateValue").value =
        state.currentCoordinate;

    $("locationValue").textContent =
        createHumanLocation(image);
}


function createHumanLocation(image) {
    return [
        "UNIVERSE: RGB-8",
        `WIDTH: ${image.width}`,
        `HEIGHT: ${image.height}`,
        `PIXELS: ${image.width * image.height}`,
        "CHANNELS: 3",
        "COLOUR VALUES: 256"
    ].join("\n");
}


function encodeCoordinate(image) {
    return (
        `${APP_VERSION}:` +
        `${image.width}x${image.height}:` +
        bytesToBase64Url(image.pixels)
    );
}


function decodeCoordinate(coordinate) {
    const match = coordinate.match(
        /^ILB1:(\d+)x(\d+):([A-Za-z0-9_-]+)$/
    );

    if (!match) {
        throw new Error(
            "INVALID COORDINATE FORMAT"
        );
    }

    const width = Number(match[1]);
    const height = Number(match[2]);

    if (
        !Number.isSafeInteger(width) ||
        !Number.isSafeInteger(height) ||
        width < 1 ||
        height < 1
    ) {
        throw new Error(
            "INVALID IMAGE DIMENSIONS"
        );
    }

    const pixelCount = width * height;

    if (!Number.isSafeInteger(pixelCount)) {
        throw new Error(
            "IMAGE IS TOO LARGE FOR THIS BROWSER"
        );
    }

    const pixels = base64UrlToBytes(
        match[3]
    );

    const expectedLength =
        pixelCount * 3;

    if (pixels.length !== expectedLength) {
        throw new Error(
            "COORDINATE DOES NOT MATCH ITS DIMENSIONS"
        );
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

    for (
        let i = 0;
        i < bytes.length;
        i += chunkSize
    ) {
        const chunk = bytes.subarray(
            i,
            Math.min(
                i + chunkSize,
                bytes.length
            )
        );

        binary += String.fromCharCode(
            ...chunk
        );
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
        "=".repeat(
            (4 - normalized.length % 4) % 4
        );

    let binary;

    try {
        binary = atob(
            normalized + padding
        );
    } catch {
        throw new Error(
            "INVALID PIXEL DATA"
        );
    }

    const bytes =
        new Uint8Array(binary.length);

    for (
        let i = 0;
        i < binary.length;
        i++
    ) {
        bytes[i] =
            binary.charCodeAt(i);
    }

    return bytes;
}


function openRandomImage() {
    const width = randomDimension();
    const height = randomDimension();

    const pixels = new Uint8Array(
        width *
        height *
        3
    );

    if (
        window.crypto &&
        typeof window.crypto.getRandomValues === "function"
    ) {
        window.crypto.getRandomValues(
            pixels
        );
    } else {
        for (
            let i = 0;
            i < pixels.length;
            i++
        ) {
            pixels[i] =
                Math.floor(
                    Math.random() * 256
                );
        }
    }

    openImage(
        {
            width,
            height,
            pixels
        },
        "random"
    );
}


function randomDimension() {
    const dimensions = [
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

    return dimensions[
        Math.floor(
            Math.random() *
            dimensions.length
        )
    ];
}


function navigateImage(direction) {
    if (!state.currentImage) {
        return;
    }

    const current =
        state.currentImage;

    const pixels =
        new Uint8Array(
            current.pixels
        );

    let carry =
        direction > 0 ? 1 : -1;

    for (
        let i = pixels.length - 1;
        i >= 0;
        i--
    ) {
        const value =
            pixels[i] + carry;

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
                ? "END OF IMAGE SPACE"
                : "BEGINNING OF IMAGE SPACE"
        );

        return;
    }

    openImage(
        {
            width: current.width,
            height: current.height,
            pixels
        },
        "navigation"
    );
}


function saveCurrentToArchive() {
    if (
        !state.currentImage ||
        !state.currentCoordinate
    ) {
        return;
    }

    const exists =
        state.archive.some(
            item =>
                item.coordinate ===
                state.currentCoordinate
        );

    if (exists) {
        showToast(
            "ALREADY IN ARCHIVE"
        );

        return;
    }

    const image =
        state.currentImage;

    const item = {
        coordinate:
            state.currentCoordinate,

        width:
            image.width,

        height:
            image.height,

        pixels:
            bytesToBase64Url(
                image.pixels
            ),

        created:
            Date.now()
    };

    state.archive.unshift(item);

    try {
        localStorage.setItem(
            "ILB_ARCHIVE",
            JSON.stringify(
                state.archive
            )
        );

        showToast(
            "IMAGE ADDED TO ARCHIVE"
        );

    } catch {
        state.archive.shift();

        showToast(
            "BROWSER STORAGE LIMIT REACHED"
        );
    }
}


function loadArchive() {
    try {
        const value =
            localStorage.getItem(
                "ILB_ARCHIVE"
            );

        if (!value) {
            return [];
        }

        const parsed =
            JSON.parse(value);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed;

    } catch {
        return [];
    }
}


function renderArchive() {
    const grid =
        $("archiveGrid");

    const empty =
        $("emptyArchive");

    grid.innerHTML = "";

    if (state.archive.length === 0) {
        empty.style.display = "block";
        return;
    }

    empty.style.display = "none";

    state.archive.forEach(item => {
        const element =
            document.createElement("div");

        element.className =
            "archiveItem";

        const image =
            document.createElement("img");

        image.className =
            "archiveImage";

        image.src =
            createDataURL(
                item.width,
                item.height,
                base64UrlToBytes(
                    item.pixels
                )
            );

        const info =
            document.createElement("div");

        info.className =
            "archiveInfo";

        const dimensions =
            document.createElement("div");

        dimensions.className =
            "archiveDimensions";

        dimensions.textContent =
            `${item.width} × ${item.height}`;

        const coordinates =
            document.createElement("div");

        coordinates.className =
            "archiveCoordinates";

        coordinates.textContent =
            item.coordinate;

        info.appendChild(dimensions);
        info.appendChild(coordinates);

        element.appendChild(image);
        element.appendChild(info);

        element.addEventListener(
            "click",
            () => {
                openImage(
                    {
                        width: item.width,
                        height: item.height,
                        pixels:
                            base64UrlToBytes(
                                item.pixels
                            )
                    },
                    "archive"
                );
            }
        );

        grid.appendChild(element);
    });
}


function findSimilarImages() {
    if (!state.currentImage) {
        return;
    }

    const grid =
        $("similarGrid");

    const empty =
        $("noSimilar");

    grid.innerHTML = "";

    const candidates =
        state.archive
            .filter(
                item =>
                    item.coordinate !==
                    state.currentCoordinate
            )
            .map(item => {
                const pixels =
                    base64UrlToBytes(
                        item.pixels
                    );

                const score =
                    similarityScore(
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
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .slice(0, 30);

    if (candidates.length === 0) {
        empty.style.display = "block";
        showScreen("similar");
        return;
    }

    empty.style.display = "none";

    candidates.forEach(item => {
        const element =
            document.createElement("div");

        element.className =
            "similarItem";

        const image =
            document.createElement("img");

        image.className =
            "similarImage";

        image.src =
            createDataURL(
                item.width,
                item.height,
                base64UrlToBytes(
                    item.pixels
                )
            );

        const info =
            document.createElement("div");

        info.className =
            "similarInfo";

        const score =
            document.createElement("div");

        score.className =
            "similarScore";

        score.textContent =
            `${(
                item.score * 100
            ).toFixed(1)}% SIMILAR`;

        info.appendChild(score);

        element.appendChild(image);
        element.appendChild(info);

        element.addEventListener(
            "click",
            () => {
                openImage(
                    {
                        width: item.width,
                        height: item.height,
                        pixels:
                            base64UrlToBytes(
                                item.pixels
                            )
                    },
                    "similar"
                );
            }
        );

        grid.appendChild(element);
    });

    showScreen("similar");
}


function similarityScore(a, b) {
    const samples = 900;

    let difference = 0;

    for (
        let i = 0;
        i < samples;
        i++
    ) {
        const position =
            i / (samples - 1);

        const av =
            sampleImage(
                a,
                position
            );

        const bv =
            sampleImage(
                b,
                position
            );

        difference +=
            Math.abs(
                av[0] - bv[0]
            ) +
            Math.abs(
                av[1] - bv[1]
            ) +
            Math.abs(
                av[2] - bv[2]
            );
    }

    const maximum =
        samples * 765;

    return Math.max(
        0,
        1 -
        difference / maximum
    );
}


function sampleImage(
    image,
    position
) {
    const aspect =
        image.width /
        image.height;

    let x;
    let y;

    if (aspect >= 1) {
        x = Math.floor(
            position *
            image.width
        );

        y = Math.floor(
            ((position * 997) % 1) *
            image.height
        );
    } else {
        y = Math.floor(
            position *
            image.height
        );

        x = Math.floor(
            ((position * 997) % 1) *
            image.width
        );
    }

    x = Math.max(
        0,
        Math.min(
            image.width - 1,
            x
        )
    );

    y = Math.max(
        0,
        Math.min(
            image.height - 1,
            y
        )
    );

    const index =
        (y * image.width + x) *
        3;

    return [
        image.pixels[index],
        image.pixels[index + 1],
        image.pixels[index + 2]
    ];
}


function createDataURL(
    width,
    height,
    pixels
) {
    const temp =
        document.createElement(
            "canvas"
        );

    temp.width = width;
    temp.height = height;

    const context =
        temp.getContext("2d");

    const data =
        new Uint8ClampedArray(
            width *
            height *
            4
        );

    for (
        let source = 0,
        destination = 0;
        source < pixels.length;
        source += 3
    ) {
        data[destination++] =
            pixels[source];

        data[destination++] =
            pixels[source + 1];

        data[destination++] =
            pixels[source + 2];

        data[destination++] = 255;
    }

    context.putImageData(
        new ImageData(
            data,
            width,
            height
        ),
        0,
        0
    );

    return temp.toDataURL(
        "image/png"
    );
}


function downloadCurrentImage() {
    if (!state.currentImage) {
        return;
    }

    const image =
        state.currentImage;

    const dataURL =
        createDataURL(
            image.width,
            image.height,
            image.pixels
        );

    const link =
        document.createElement("a");

    link.href = dataURL;

    link.download =
        `image-library-${image.width}x${image.height}.png`;

    document.body.appendChild(link);

    link.click();

    link.remove();
}
