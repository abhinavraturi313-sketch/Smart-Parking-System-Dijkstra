// Read graph information supplied by Flask.
const config = JSON.parse(
    document.getElementById("parking-config").textContent
);

const svg = document.getElementById("parking-map");
const findButton = document.getElementById("find-button");
const resultBox = document.getElementById("result");

const svgNamespace = "http://www.w3.org/2000/svg";

let occupiedSlots = new Set(config.occupied);
let currentResult = null;

// Used to ignore an old response if availability changes.
let stateVersion = 0;


// Create an SVG element.
function createSvgElement(tag, attributes, text) {
    const element = document.createElementNS(
        svgNamespace,
        tag
    );

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}


// Clear old route information.
function clearResult() {
    stateVersion++;
    currentResult = null;

    resultBox.textContent =
        "Availability updated. Click Find Nearest Parking.";

    document.getElementById("steps-body").innerHTML = `
        <tr>
            <td colspan="4">
                Run the algorithm to view steps.
            </td>
        </tr>
    `;

    document.getElementById("candidate-list").textContent =
        "No calculation yet.";
}


// Change a slot between occupied and available.
function toggleSlot(slot) {
    if (occupiedSlots.has(slot)) {
        occupiedSlots.delete(slot);
    } else {
        occupiedSlots.add(slot);
    }

    clearResult();
    drawMap();
}


// Draw graph edges and their distances.
function drawEdges() {
    for (const edge of config.edges) {
        const [x1, y1] = config.positions[edge.a];
        const [x2, y2] = config.positions[edge.b];

        const line = createSvgElement("line", {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            stroke: "#c9d2dc",
            "stroke-width": 24,
            "stroke-linecap": "round"
        });

        svg.appendChild(line);

        const isVertical = x1 === x2;

        const label = createSvgElement(
            "text",
            {
                x: (x1 + x2) / 2 + (isVertical ? 26 : 0),
                y: (y1 + y2) / 2 - 12,
                fill: "#53657c",
                "font-size": 17,
                "text-anchor": "middle"
            },
            edge.weight + " m"
        );

        svg.appendChild(label);
    }
}


// Highlight the calculated route.
function drawRoute() {
    if (!currentResult || currentResult.path.length === 0) {
        return;
    }

    const points = currentResult.path.map(function (node) {
        return config.positions[node].join(",");
    }).join(" ");

    const route = createSvgElement("polyline", {
        points: points,
        fill: "none",
        stroke: "#2563eb",
        "stroke-width": 9,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
    });

    svg.appendChild(route);
}


// Draw one parking slot.
function drawSlot(name, x, y) {
    const isOccupied = occupiedSlots.has(name);

    const isSelected =
        currentResult &&
        currentResult.slot === name;

    const group = createSvgElement("g", {
        class: "parking-slot",
        tabindex: 0,
        role: "button",
        "aria-label":
            name + ", " +
            (isOccupied ? "occupied" : "available") +
            ", click to toggle"
    });

    const rectangle = createSvgElement("rect", {
        x: x - 60,
        y: y - 42,
        width: 120,
        height: 84,
        rx: 10,
        fill: isOccupied ? "#fee2e2" : "#dcfce7",
        stroke: isSelected
            ? "#2563eb"
            : isOccupied
                ? "#d97780"
                : "#66aa85",
        "stroke-width": isSelected ? 5 : 2
    });

    const nameLabel = createSvgElement(
        "text",
        {
            x: x,
            y: y - 5,
            "text-anchor": "middle",
            "font-size": 24,
            "font-weight": "bold",
            fill: "#20344d"
        },
        name
    );

    const statusLabel = createSvgElement(
        "text",
        {
            x: x,
            y: y + 23,
            "text-anchor": "middle",
            "font-size": 15,
            fill: "#53657c"
        },
        isOccupied ? "Occupied" : "Available"
    );

    group.append(
        rectangle,
        nameLabel,
        statusLabel
    );

    group.addEventListener("click", function () {
        toggleSlot(name);
    });

    group.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleSlot(name);
        }
    });

    svg.appendChild(group);
}


// Draw a junction or the entrance.
function drawJunction(name, x, y) {
    const circle = createSvgElement("circle", {
        cx: x,
        cy: y,
        r: 9,
        fill: name === "Entrance" ? "#2563eb" : "#53667d",
        stroke: "white",
        "stroke-width": 3
    });

    const label = createSvgElement(
        "text",
        {
            x: x,
            y: y + 31,
            "text-anchor": "middle",
            "font-size": 17,
            fill: "#20344d"
        },
        name
    );

    svg.append(circle, label);
}


// Update the statistics.
function updateStatistics() {
    document.getElementById("total-count").textContent =
        config.slots.length;

    document.getElementById("occupied-count").textContent =
        occupiedSlots.size;

    document.getElementById("available-count").textContent =
        config.slots.length - occupiedSlots.size;
}


// Redraw the entire map.
function drawMap() {
    svg.replaceChildren();

    drawEdges();
    drawRoute();

    for (const [name, position] of Object.entries(
        config.positions
    )) {
        const [x, y] = position;

        if (config.slots.includes(name)) {
            drawSlot(name, x, y);
        } else {
            drawJunction(name, x, y);
        }
    }

    updateStatistics();
}


// Display the selected parking slot and route.
function showResult(data) {
    resultBox.replaceChildren();

    if (!data.slot) {
        resultBox.textContent = data.message;
        return;
    }

    const slotLine = document.createElement("strong");

    slotLine.textContent =
        "Nearest Slot: " + data.slot;

    const distanceLine = document.createElement("div");

    distanceLine.textContent =
        "Distance: " + data.distance + " metres";

    const routeLine = document.createElement("p");
    routeLine.className = "route-text";

    routeLine.textContent =
        data.path.join(" → ");

    resultBox.append(
        slotLine,
        distanceLine,
        routeLine
    );
}


// Display the algorithm's finalized-node table.
function showSteps(steps) {
    const tableBody = document.getElementById("steps-body");

    tableBody.replaceChildren();

    for (const step of steps) {
        const row = document.createElement("tr");

        const values = [
            step.step,
            step.node,
            step.distance + " m",
            step.parent === null ? "—" : step.parent
        ];

        for (const value of values) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        }

        tableBody.appendChild(row);
    }
}


// Display distances to all available slots.
function showCandidates(candidates) {
    const list = document.getElementById("candidate-list");

    list.replaceChildren();

    if (candidates.length === 0) {
        list.textContent = "All parking slots are occupied.";
        return;
    }

    for (const candidate of candidates) {
        const row = document.createElement("div");
        row.className = "candidate-row";

        const slot = document.createElement("span");
        slot.textContent = candidate.slot;

        const distance = document.createElement("strong");

        distance.textContent =
            candidate.distance === null
                ? "Unreachable"
                : candidate.distance + " m";

        row.append(slot, distance);
        list.appendChild(row);
    }
}


// Ask Python to calculate the shortest route.
findButton.addEventListener("click", async function () {
    const requestVersion = stateVersion;

    findButton.disabled = true;
    findButton.textContent = "Finding Route...";

    try {
        const response = await fetch("/api/find", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                occupied: Array.from(occupiedSlots)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Route calculation failed."
            );
        }

        // Availability changed while the request was running.
        if (requestVersion !== stateVersion) {
            return;
        }

        currentResult = data;

        showResult(data);
        showSteps(data.steps);
        showCandidates(data.candidates);
        drawMap();

    } catch (error) {
        if (requestVersion === stateVersion) {
            resultBox.textContent =
                "Could not calculate route. " +
                "Check that Flask is running. " +
                error.message;
        }

    } finally {
        findButton.disabled = false;
        findButton.textContent = "Find Nearest Parking";
    }
});


// Restore the initial parking state.
document.getElementById("reset-button").addEventListener(
    "click",
    function () {
        occupiedSlots = new Set(config.occupied);

        clearResult();
        drawMap();

        resultBox.textContent =
            "Demo reset. Click Find Nearest Parking.";
    }
);


// Draw the initial parking map.
drawMap();