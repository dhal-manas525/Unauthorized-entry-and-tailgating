// ================= GLOBAL =================
let cameraStream = null;
let detectionInterval = null;

// ================= CAMERA (REAL BROWSER CAMERA) =================
function startCamera() {
    const video = document.getElementById("webcam");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            cameraStream = stream;
            video.srcObject = stream;
            addLog("Camera started", false);

            // Start backend detection loop
            startDetection();
        })
        .catch(() => {
            alert("Camera access denied");
        });
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        document.getElementById("webcam").srcObject = null;
        addLog("Camera stopped", false);
    }

    stopDetection();
    stopAlertSound();
}

// ================= DETECTION LOOP =================
function startDetection() {
    if (detectionInterval) return;

    detectionInterval = setInterval(() => {
        fetch("http://127.0.0.1:5000/api/detect", {
            method: "POST"
        })
        .then(res => res.json())
        .then(data => {
            if (data.alert) {
                addLog(`🚨 Tailgating detected (${data.persons} persons)`, true);
                playAlertSound();
            } else {
                addLog(`Normal access (${data.persons} person)`, false);
            }

            loadIncidents();
        })
        .catch(() => {
            addLog("Detection failed (backend not responding)", true);
        });
    }, 5000);
}

function stopDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
        addLog("Detection stopped", false);
    }
}

// ================= FORCE TAILGATING (MANUAL DEMO BUTTON) =================
function forceTailgating() {
    fetch("http://127.0.0.1:5000/api/detect", {
        method: "POST"
    })
    .then(res => res.json())
    .then(() => {
        addLog("🚨 Tailgating simulated manually", true);
        playAlertSound();
        loadIncidents();
    })
    .catch(() => {
        addLog("Failed to simulate tailgating", true);
    });
}

// ================= SOUND ALERT =================
function playAlertSound() {
    const sound = document.getElementById("alertSound");
    if (!sound) return;

    sound.currentTime = 0;
    sound.play().catch(() => {
        console.log("Sound blocked until user interaction");
    });
}

function stopAlertSound() {
    const sound = document.getElementById("alertSound");
    if (sound) {
        sound.pause();
        sound.currentTime = 0;
    }
}

// ================= LOGS =================
function addLog(message, alert) {
    const log = document.getElementById("detection-log");
    if (!log) return;

    const div = document.createElement("div");

    const time = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    div.className = "log-entry" + (alert ? " alert" : "");
    div.innerHTML = `<b>${time}</b> – ${message}`;

    log.prepend(div);
}

// ================= INCIDENTS =================
function loadIncidents() {
    fetch("http://127.0.0.1:5000/api/incidents")
        .then(res => res.json())
        .then(data => {
            const body = document.getElementById("incidents-body");
            if (!body) return;

            body.innerHTML = "";
            document.getElementById("incidents-today").innerText = data.length;

            data.forEach(i => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${i.time}</td>
                    <td>${i.location}</td>
                    <td class="incident-tailgating">🚨 ${i.type}</td>
                    <td>${i.severity}</td>
                    <td>
                        <span class="${i.status === 'Active' ? 'status-active' : 'status-reviewed'}">
                            ${i.status}
                        </span>
                    </td>
                `;
                body.appendChild(row);
            });
        })
        .catch(() => {
            addLog("Failed to load incidents from backend", true);
        });
}

// ================= CLEAR INCIDENTS =================
function clearIncidents() {
    if (!confirm("Are you sure you want to clear all incidents?")) return;

    fetch("http://127.0.0.1:5000/api/clear-incidents", {
        method: "POST"
    })
    .then(res => res.json())
    .then(() => {
        document.getElementById("incidents-body").innerHTML = "";
        document.getElementById("incidents-today").innerText = "0";
        addLog("All incidents cleared by operator", false);
    })
    .catch(() => {
        alert("Failed to clear incidents");
    });
}

// ================= SIDEBAR SCROLL =================
function scrollToSection(id) {
    const section = document.getElementById(id);
    if (!section) return;

    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ================= AUTO LOAD =================
document.addEventListener("DOMContentLoaded", () => {
    loadIncidents();
    addLog("System initialized successfully", false);
});