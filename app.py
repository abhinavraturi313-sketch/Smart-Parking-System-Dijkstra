from flask import Flask, render_template, request, jsonify

from parking import (
    GRAPH,
    POSITIONS,
    SLOTS,
    DEFAULT_OCCUPIED,
    find_parking
)


app = Flask(__name__)


@app.route("/")
def home():
    edges = []

    # Add each undirected edge only once for drawing.
    for node1 in GRAPH:
        for node2, distance in GRAPH[node1].items():
            if node1 < node2:
                edges.append({
                    "a": node1,
                    "b": node2,
                    "weight": distance
                })

    config = {
        "positions": POSITIONS,
        "slots": SLOTS,
        "occupied": DEFAULT_OCCUPIED,
        "edges": edges
    }

    return render_template(
        "index.html",
        config=config
    )


@app.route("/api/find", methods=["POST"])
def calculate_route():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid request."
        }), 400

    occupied_slots = data.get("occupied")

    if not isinstance(occupied_slots, list):
        return jsonify({
            "error": "Occupied slots must be a list."
        }), 400

    for slot in occupied_slots:
        if not isinstance(slot, str) or slot not in SLOTS:
            return jsonify({
                "error": "Invalid parking slot."
            }), 400

    result = find_parking(set(occupied_slots))

    return jsonify(result)


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5001,
        debug=True
    )