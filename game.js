const VERSION = "ILB1";

const state = {
    image: null,
    coordinate: null,
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
const ctx = canvas.getContext("2d");

function showScreen(name) {
    for (const screen of Object.values(screens)) {
        screen.classList.remove("active");
    }

    screens[name].classList.add("active");
}

function toast(message) {
    const element = document.getElementById("toast");

    element.textContent = message;
    element.classList.add("visible");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        element.classList.remove("visible");
    }, 1800);
}


/* ------------------------------
   HOME
------------------------------ */

document
    .getElementById("uploadButton")
    .addEventListener("click", () => {
        document
            .getElementById("fileInput")
            .click();
    });

document
    .getElementById("randomButton")
    .addEventListener("click", () => {
        randomImage();
    });

document
    .getElementById("coordinateButton")
    .addEventListener("click", () => {
        document.getElementById(
            "coordinateInput"
        ).value = "";

        document.getElementById(
            "coordinateError"
        ).textContent = "";

        showScreen("coordinate");
    });

document
    .getElementById("archiveButton")
    .addEventListener("click", () => {
        renderArchive();
        showScreen("archive");
    });


/* ------------------------------
   FILE UPLOAD
------------------------------ */

document
    .getElementById("fileInput")
    .addEventListener("change", event => {

        const file = event.target.files[0];

        if (!file) {
            return;
        }

        loadUploadedImage(file);

        event.target.value = "";
    });

function loadUploadedImage(file) {

    const reader = new FileReader();

    reader.onload = () => {

        const image = new Image();

        image.onload = () => {

            const width =
                image.naturalWidth;

            const height =
                image.naturalHeight;

            const temp =
                document.createElement("canvas");

            temp.width = width;
            temp.height = height;

            const tempContext =
                temp.getContext("2d", {
                    willReadFrequently: true
                });

            tempContext.drawImage(
                image,
                0,
                0
            );

            const data =
                tempContext.getImageData(
                    0,
                    0,
                    width,
                    height
                );

            const pixels =
                new Uint8Array(
                    width *
                    height *
                    3
                );

            let p = 0;

            for (
                let i = 0;
                i < data.data.length;
                i += 4
            ) {
                pixels[p++] =
                    data.data[i];

                pixels[p++] =
                    data.data[i + 1];

                pixels[p++] =
                    data.data[i + 2];
            }

            openImage({
                width,
                height,
                pixels
            });

        };

        image.onerror = () => {
            toast("IMAGE COULD NOT BE READ");
        };

        image.src = reader.result;
    };

    reader.onerror = () => {
        toast("FILE COULD NOT BE READ");
    };

    reader.readAsDataURL(file);
}


/* ------------------------------
   OPEN IMAGE
------------------------------ */

function openImage(image) {

    state.image = image;

    state.coordinate =
        encodeImage(image);

    drawImage(image);

    updateViewer();

    showScreen("viewer");
}


/* ------------------------------
   DRAW IMAGE
------------------------------ */

function drawImage(image) {

    canvas.width =
        image.width;

    canvas.height =
        image.height;

    const rgba =
        new Uint8ClampedArray(
            image.width *
            image.height *
            4
        );

    let p = 0;

    for (
        let i = 0;
        i < image.pixels.length;
        i += 3
    ) {

        rgba[p++] =
            image.pixels[i];

        rgba[p++] =
            image.pixels[i + 1];

        rgba[p++] =
            image.pixels[i + 2];

        rgba[p++] = 255;
    }

    ctx.putImageData(
        new ImageData(
            rgba,
            image.width,
            image.height
        ),
        0,
        0
    );
}


/* ------------------------------
   VIEWER
------------------------------ */

function updateViewer() {

    const image =
        state.image;

    document.getElementById(
        "dimensionsValue"
    ).textContent =
        `${image.width} × ${image.height}`;

    document.getElementById(
        "coordinateValue"
    ).value =
        state.coordinate;

    document.getElementById(
        "locationValue"
    ).textContent =
        [
            "UNIVERSE: RGB-8",
            `WIDTH: ${image.width}`,
            `HEIGHT: ${image.height}`,
            `PIXELS: ${image.width * image.height}`,
            "CHANNELS: RED / GREEN / BLUE",
            "VALUES PER CHANNEL: 256"
        ].join("\n");
}


/* ------------------------------
   COORDINATES
------------------------------ */

function encodeImage(image) {

    return (
        VERSION +
        ":" +
        image.width +
        "x" +
        image.height +
        ":" +
        bytesToBase64(image.pixels)
    );
}

function decodeImage(address) {

    const match =
        address.match(
            /^ILB1:(\d+)x(\d+):([A-Za-z0-9+/=_-]+)$/
        );

    if (!match) {
        throw new Error(
            "That is not a valid IMAGE LIBRARY address."
        );
    }

    const width =
        Number(match[1]);

    const height =
        Number(match[2]);

    if (
        !Number.isSafeInteger(width) ||
        !Number.isSafeInteger(height) ||
        width < 1 ||
        height < 1
    ) {
        throw new Error(
            "The image dimensions are invalid."
        );
    }

    const pixels =
        base64ToBytes(match[3]);

    const expected =
        width *
        height *
        3;

    if (pixels.length !== expected) {
        throw new Error(
            "The address contains invalid pixel data."
        );
    }

    return {
        width,
        height,
        pixels
    };
}

function bytesToBase64(bytes) {

    let binary = "";

    const chunk = 8192;

    for (
        let i = 0;
        i < bytes.length;
        i += chunk
    ) {

        const part =
            bytes.subarray(
                i,
                Math.min(
                    i + chunk,
                    bytes.length
                )
            );

        binary += String.fromCharCode(
            ...part
        );
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

function base64ToBytes(value) {

    const normalized =
        value
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const padding =
        "=".repeat(
            (4 -
                normalized.length % 4) %
            4
        );

    let binary;

    try {
        binary =
            atob(
                normalized +
                padding
            );
    } catch {
        throw new Error(
            "The address contains invalid data."
        );
    }

    const bytes =
        new Uint8Array(
            binary.length
        );

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


/* ------------------------------
   RANDOM LIBRARY LOCATION
------------------------------ */

function randomImage() {

    const sizes = [
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
        [8, 8],
        [8, 12],
        [12, 8],
        [16, 16],
        [16, 24],
        [24, 16],
        [32, 32],
        [32, 48],
        [48, 32],
        [64, 64]
    ];

    const size =
        sizes[
            Math.floor(
                Math.random() *
                sizes.length
            )
        ];

    const width =
        size[0];

    const height =
        size[1];

    const pixels =
        new Uint8Array(
            width *
            height *
            3
        );

    if (
        window.crypto &&
        window.crypto.getRandomValues
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

    openImage({
        width,
        height,
        pixels
    });
}


/* ------------------------------
   NEIGHBOURING IMAGE
------------------------------ */

document
    .getElementById("previousButton")
    .addEventListener("click", () => {
        moveImage(-1);
    });

document
    .getElementById("nextButton")
    .addEventListener("click", () => {
        moveImage(1);
    });

function moveImage(direction) {

    if (!state.image) {
        return;
    }

    const pixels =
        new Uint8Array(
            state.image.pixels
        );

    let carry =
        direction === 1
            ? 1
            : -1;

    for (
        let i = pixels.length - 1;
        i >= 0;
        i--
    ) {

        const value =
            pixels[i] +
            carry;

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
        toast(
            direction === 1
                ? "END OF THIS IMAGE SPACE"
                : "BEGINNING OF THIS IMAGE SPACE"
        );

        return;
    }

    openImage({
        width: state.image.width,
        height: state.image.height,
        pixels
    });
}


/* ------------------------------
   RANDOM BUTTON INSIDE VIEWER
------------------------------ */

document
    .getElementById("randomViewerButton")
    .addEventListener("click", () => {
        randomImage();
    });


/* ------------------------------
   GO BACK
------------------------------ */

document
    .getElementById("backButton")
    .addEventListener("click", () => {
        showScreen("home");
    });

document
    .getElementById("coordinateBackButton")
    .addEventListener("click", () => {
        showScreen("home");
    });

document
    .getElementById("archiveBackButton")
    .addEventListener("click", () => {
        showScreen("home");
    });

document
    .getElementById("similarBackButton")
    .addEventListener("click", () => {
        showScreen("viewer");
    });


/* ------------------------------
   OPEN ADDRESS
------------------------------ */

document
    .getElementById("openCoordinateButton")
    .addEventListener("click", () => {

        const input =
            document
                .getElementById(
                    "coordinateInput"
                )
                .value
                .trim();

        const error =
            document.getElementById(
                "coordinateError"
            );

        error.textContent = "";

        try {

            const image =
                decodeImage(input);

            openImage(image);

        } catch (e) {

            error.textContent =
                e.message;
        }
    });


/* ------------------------------
   COPY ADDRESS
------------------------------ */

document
    .getElementById(
        "copyCoordinateButton"
    )
    .addEventListener(
        "click",
        async () => {

            if (!state.coordinate) {
                return;
            }

            try {

                await navigator
                    .clipboard
                    .writeText(
                        state.coordinate
                    );

                toast("ADDRESS COPIED");

            } catch {

                const box =
                    document.getElementById(
                        "coordinateValue"
                    );

                box.focus();
                box.select();

                document.execCommand(
                    "copy"
                );

                toast("ADDRESS COPIED");
            }
        }
    );


/* ------------------------------
   DOWNLOAD
------------------------------ */

document
    .getElementById(
        "downloadButton"
    )
    .addEventListener(
        "click",
        () => {

            if (!state.image) {
                return;
            }

            const url =
                canvas.toDataURL(
                    "image/png"
                );

            const link =
                document.createElement(
                    "a"
                );

            link.href = url;

            link.download =
                `library-${state.image.width}x${state.image.height}.png`;

            link.click();
        }
    );


/* ------------------------------
   ARCHIVE
------------------------------ */

document
    .getElementById(
        "saveArchiveButton"
    )
    .addEventListener(
        "click",
        () => {

            if (
                !state.image ||
                !state.coordinate
            ) {
                return;
            }

            const exists =
                state.archive.some(
                    item =>
                        item.coordinate ===
                        state.coordinate
                );

            if (exists) {
                toast(
                    "ALREADY IN YOUR ARCHIVE"
                );

                return;
            }

            state.archive.unshift({
                coordinate:
                    state.coordinate,

                width:
                    state.image.width,

                height:
                    state.image.height,

                pixels:
                    bytesToBase64(
                        state.image.pixels
                    )
            });

            try {

                localStorage.setItem(
                    "ILB_ARCHIVE",
                    JSON.stringify(
                        state.archive
                    )
                );

                toast(
                    "SAVED TO YOUR ARCHIVE"
                );

            } catch {

                state.archive.shift();

                toast(
                    "BROWSER STORAGE IS FULL"
                );
            }
        }
    );


function loadArchive() {

    try {

        const raw =
            localStorage.getItem(
                "ILB_ARCHIVE"
            );

        if (!raw) {
            return [];
        }

        const value =
            JSON.parse(raw);

        return Array.isArray(value)
            ? value
            : [];

    } catch {

        return [];
    }
}


function renderArchive() {

    const grid =
        document.getElementById(
            "archiveGrid"
        );

    const empty =
        document.getElementById(
            "emptyArchive"
        );

    grid.innerHTML = "";

    if (
        state.archive.length === 0
    ) {

        empty.style.display =
            "block";

        return;
    }

    empty.style.display =
        "none";

    for (
        const item of state.archive
    ) {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "archiveItem";

        const image =
            document.createElement(
                "img"
            );

        image.className =
            "archiveImage";

        image.src =
            makeDataURL(
                item.width,
                item.height,
                base64ToBytes(
                    item.pixels
                )
            );

        const info =
            document.createElement(
                "div"
            );

        info.className =
            "archiveInfo";

        const dimensions =
            document.createElement(
                "div"
            );

        dimensions.className =
            "archiveDimensions";

        dimensions.textContent =
            `${item.width} × ${item.height}`;

        const address =
            document.createElement(
                "div"
            );

        address.className =
            "archiveCoordinates";

        address.textContent =
            item.coordinate;

        info.appendChild(
            dimensions
        );

        info.appendChild(
            address
        );

        card.appendChild(
            image
        );

        card.appendChild(
            info
        );

        card.addEventListener(
            "click",
            () => {

                openImage({
                    width:
                        item.width,

                    height:
                        item.height,

                    pixels:
                        base64ToBytes(
                            item.pixels
                        )
                });
            }
        );

        grid.appendChild(card);
    }
}


/* ------------------------------
   SIMILARITY
------------------------------ */

document
    .getElementById(
        "similarButton"
    )
    .addEventListener(
        "click",
        () => {
            findSimilar();
        }
    );

function findSimilar() {

    const grid =
        document.getElementById(
            "similarGrid"
        );

    const empty =
        document.getElementById(
            "noSimilar"
        );

    grid.innerHTML = "";

    if (
        !state.image ||
        state.archive.length === 0
    ) {

        empty.style.display =
            "block";

        showScreen("similar");

        return;
    }

    const results =
        state.archive
            .filter(
                item =>
                    item.coordinate !==
                    state.coordinate
            )
            .map(item => {

                const image = {
                    width:
                        item.width,

                    height:
                        item.height,

                    pixels:
                        base64ToBytes(
                            item.pixels
                        )
                };

                return {
                    item,
                    image,
                    score:
                        compareImages(
                            state.image,
                            image
                        )
                };
            })
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .slice(0, 30);

    if (results.length === 0) {

        empty.style.display =
            "block";

        showScreen("similar");

        return;
    }

    empty.style.display =
        "none";

    for (
        const result of results
    ) {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "archiveItem";

        const image =
            document.createElement(
                "img"
            );

        image.className =
            "archiveImage";

        image.src =
            makeDataURL(
                result.image.width,
                result.image.height,
                result.image.pixels
            );

        const info =
            document.createElement(
                "div"
            );

        info.className =
            "archiveInfo";

        const score =
            document.createElement(
                "div"
            );

        score.className =
            "archiveDimensions";

        score.textContent =
            `${(
                result.score * 100
            ).toFixed(1)}% SIMILAR`;

        info.appendChild(
            score
        );

        card.appendChild(
            image
        );

        card.appendChild(
            info
        );

        card.addEventListener(
            "click",
            () => {
                openImage(
                    result.image
                );
            }
        );

        grid.appendChild(
            card
        );
    }

    showScreen("similar");
}


function compareImages(a, b) {

    const samples = 400;

    let difference = 0;

    for (
        let i = 0;
        i < samples;
        i++
    ) {

        const t =
            i /
            (samples - 1);

        const pa =
            sample(
                a,
                t
            );

        const pb =
            sample(
                b,
                t
            );

        difference +=
            Math.abs(
                pa[0] - pb[0]
            ) +
            Math.abs(
                pa[1] - pb[1]
            ) +
            Math.abs(
                pa[2] - pb[2]
            );
    }

    return Math.max(
        0,
        1 -
        difference /
        (samples * 765)
    );
}


function sample(image, t) {

    const x =
        Math.min(
            image.width - 1,
            Math.floor(
                t * image.width
            )
        );

    const y =
        Math.min(
            image.height - 1,
            Math.floor(
                ((t * 997) % 1) *
                image.height
            )
        );

    const i =
        (y * image.width + x) *
        3;

    return [
        image.pixels[i],
        image.pixels[i + 1],
        image.pixels[i + 2]
    ];
}


/* ------------------------------
   DATA URL
------------------------------ */

function makeDataURL(
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

    const rgba =
        new Uint8ClampedArray(
            width *
            height *
            4
        );

    let p = 0;

    for (
        let i = 0;
        i < pixels.length;
        i += 3
    ) {

        rgba[p++] =
            pixels[i];

        rgba[p++] =
            pixels[i + 1];

        rgba[p++] =
            pixels[i + 2];

        rgba[p++] = 255;
    }

    context.putImageData(
        new ImageData(
            rgba,
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


/* ------------------------------
   STARTUP
------------------------------ */

randomImage();
