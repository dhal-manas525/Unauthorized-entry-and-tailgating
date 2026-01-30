from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import random   # simulated AI for hackathon

app = Flask(__name__)
CORS(app)

DB = "database.db"

# ================= DATABASE =================
def get_db():
    return sqlite3.connect(DB)

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            time TEXT,
            persons INTEGER
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            time TEXT,
            location TEXT,
            type TEXT,
            severity TEXT,
            status TEXT
        )
    """)

    conn.commit()
    conn.close()

init_db()

# ================= AI DETECTION (SIMULATED) =================
def ai_detection():
    """
    AI simulation logic:
    - 1 person  -> Normal access
    - 2+ people -> Tailgating
    """
    persons = random.choice([1, 1, 1, 2, 3])  # bias towards normal
    alert = persons > 1
    return alert, persons

# ================= ROUTES =================
@app.route("/")
def home():
    return "Smart AccessGuard Backend Running"

# ---- DASHBOARD STATS ----
@app.route("/api/stats")
def stats():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM access_logs")
    access = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM incidents")
    incidents = cur.fetchone()[0]

    conn.close()

    return jsonify({
        "today_access": access,
        "incidents_today": incidents,
        "accuracy": "99%"
    })

# ---- AI DETECTION ----
@app.route("/api/detect", methods=["POST"])
def detect():
    alert, persons = ai_detection()
    time = datetime.now().strftime("%d %b %Y %H:%M:%S")

    conn = get_db()
    cur = conn.cursor()

    # ✅ ALWAYS log access (normal or tailgating)
    cur.execute(
        "INSERT INTO access_logs (time, persons) VALUES (?, ?)",
        (time, persons)
    )

    # 🚨 ONLY log incident if tailgating (persons > 1)
    if alert:
        cur.execute("""
            INSERT INTO incidents (time, location, type, severity, status)
            VALUES (?, ?, ?, ?, ?)
        """, (time, "Main Entrance", "Tailgating", "High", "Active"))

    conn.commit()
    conn.close()

    return jsonify({
        "alert": alert,
        "persons": persons,
        "time": time
    })

# ---- LOAD INCIDENTS ----
@app.route("/api/incidents")
def incidents():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT time, location, type, severity, status
        FROM incidents
        ORDER BY id DESC
    """)

    rows = cur.fetchall()
    conn.close()

    return jsonify([
        {
            "time": r[0],
            "location": r[1],
            "type": r[2],
            "severity": r[3],
            "status": r[4]
        } for r in rows
    ])

# ---- CLEAR INCIDENTS ----
@app.route("/api/clear-incidents", methods=["POST"])
def clear_incidents():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM incidents")
    cur.execute("DELETE FROM access_logs")

    conn.commit()
    conn.close()

    return jsonify({"message": "All incidents cleared"})

# ================= RUN SERVER =================
if __name__ == "__main__":
    print("🚀 Smart AccessGuard Backend Started")
    app.run(debug=True)