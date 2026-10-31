import heapq
import math


# Parking slot names
SLOTS = [
    "A1", "A2", "A3", "A4", "A5",
    "B1", "B2", "B3", "B4", "B5"
]


# Initially occupied parking slots
DEFAULT_OCCUPIED = [
    "A1", "A3", "A4",
    "B3", "B4", "B5"
]


# Coordinates used to draw the parking map.
# These coordinates do not decide the driving distances.
POSITIONS = {
    "Entrance": (500, 460)
}

for i in range(1, 6):
    x = 100 + (i - 1) * 200

    POSITIONS[f"J{i}"] = (x, 280)
    POSITIONS[f"A{i}"] = (x, 100)
    POSITIONS[f"B{i}"] = (x, 390)


# Adjacency list representation of the graph
GRAPH = {
    node: {}
    for node in POSITIONS
}


def add_edge(node1, node2, distance):
    """Add a two-way connection."""

    GRAPH[node1][node2] = distance
    GRAPH[node2][node1] = distance


# Entrance to central junction
add_edge("Entrance", "J3", 10)


# Connections between adjacent junctions
for i in range(1, 5):
    add_edge(f"J{i}", f"J{i + 1}", 10)


# Connections from junctions to parking slots
for i in range(1, 6):
    add_edge(f"J{i}", f"A{i}", 8)
    add_edge(f"J{i}", f"B{i}", 5)


def dijkstra(start):
    """Find shortest distances from the starting node."""

    distances = {
        node: math.inf
        for node in GRAPH
    }

    parents = {
        node: None
        for node in GRAPH
    }

    distances[start] = 0

    # Each entry contains: (distance, node)
    priority_queue = [(0, start)]

    visited = set()
    steps = []

    while priority_queue:
        current_distance, current_node = heapq.heappop(
            priority_queue
        )

        # Ignore nodes that have already been finalized.
        if current_node in visited:
            continue

        visited.add(current_node)

        # Check all neighbors of the current node.
        for neighbor, weight in GRAPH[current_node].items():
            new_distance = current_distance + weight

            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                parents[neighbor] = current_node

                heapq.heappush(
                    priority_queue,
                    (new_distance, neighbor)
                )

        # Record the node whose shortest distance is finalized.
        steps.append({
            "step": len(steps) + 1,
            "node": current_node,
            "distance": current_distance,
            "parent": parents[current_node]
        })

    return distances, parents, steps


def find_parking(occupied_slots):
    """Select the nearest reachable available parking slot."""

    distances, parents, steps = dijkstra("Entrance")

    available_slots = [
        slot
        for slot in SLOTS
        if slot not in occupied_slots
    ]

    # Sort available slots by distance, then by slot name.
    available_slots.sort(
        key=lambda slot: (distances[slot], slot)
    )

    candidates = [
        {
            "slot": slot,
            "distance": (
                distances[slot]
                if math.isfinite(distances[slot])
                else None
            )
        }
        for slot in available_slots
    ]

    reachable_slots = [
        slot
        for slot in available_slots
        if math.isfinite(distances[slot])
    ]

    if not reachable_slots:
        message = (
            "All parking slots are occupied."
            if not available_slots
            else "No available parking slot can be reached."
        )

        return {
            "slot": None,
            "distance": None,
            "path": [],
            "steps": steps,
            "candidates": candidates,
            "message": message
        }

    nearest_slot = reachable_slots[0]

    # Reconstruct the route using parent pointers.
    path = []
    current_node = nearest_slot

    while current_node is not None:
        path.append(current_node)
        current_node = parents[current_node]

    path.reverse()

    return {
        "slot": nearest_slot,
        "distance": distances[nearest_slot],
        "path": path,
        "steps": steps,
        "candidates": candidates,
        "message": "Route found successfully."
    }