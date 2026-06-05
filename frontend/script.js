let isRegister = false;
// Toggle between Login and Register
function toggleAuth() {
    isRegister = !isRegister;
    document.getElementById("form-title").innerText = isRegister ? "🎵 Create Account" : "🎵 Welcome Back";
    document.getElementById("auth-btn").innerText = isRegister ? "Register" : "Login";
    document.getElementById("toggle-text").innerHTML = isRegister
        ? 'Already have an account? <a href="#" onclick="toggleAuth()">Login</a>'
        : 'Don\'t have an account? <a href="#" onclick="toggleAuth()">Register</a>';
}
// Handle Authentication (Login/Register)
function handleAuth() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    console.log("handleAuth called", { username, isRegister });
    if (!username || !password) {
        alert("Please enter both username and password!");
        return;
    }
    if (isRegister) {
        // REGISTER FLOW
        fetch("http://127.0.0.1:5000/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        })
        .then(res => {
            console.log("Register response status:", res.status);
            return res.json().then(data => ({ status: res.status, data }));
        })
        .then(({ status, data }) => {
            if (status === 201) {
                console.log("Registration successful, now logging in...");
                // Auto-login after successful registration
                return fetch("http://127.0.0.1:5000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ username, password })
                })
                .then(res => res.json())
                .then(loginData => {
                    console.log("Auto-login response:", loginData);
                    localStorage.setItem("username", username);
                    console.log("Redirecting to home.html...");
                    window.location.href = "home.html";
                });
            } else {
                alert(data.error || "Registration failed");
            }
        })
        .catch(err => {
            console.error("Register error:", err);
            alert("Failed to connect to server. Is Flask running?");
        });
    } else {
        // LOGIN FLOW
        fetch("http://127.0.0.1:5000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        })
        .then(res => {
            console.log("Login response status:", res.status);
            return res.json().then(data => ({ status: res.status, data }));
        })
        .then(({ status, data }) => {
            if (status === 200) {
                console.log("Login successful, redirecting...");
                localStorage.setItem("username", username);
                window.location.href = "home.html";
            } else {
                alert(data.error || "Login failed");
            }
        })
        .catch(err => {
            console.error("Login error:", err);
            alert("Failed to connect to server. Is Flask running?");
        });
    }
}
// Check if user is authenticated (on home.html load)
function checkAuth() {
    console.log("Checking authentication...");
    fetch("http://127.0.0.1:5000/check-auth", {
        credentials: "include"
    })
    .then(res => {
        console.log("Auth check status:", res.status);
        return res.json();
    })
    .then(data => {
        console.log("Auth check response:", data);
        if (!data.authenticated) {
            console.log("Not authenticated, redirecting to login");
            alert("Please login first");
            window.location.href = "index.html";
        } else {
            console.log("User authenticated:", data.username);
            const userDisplay = document.getElementById("user-display");
            if (userDisplay) {
                userDisplay.innerText = `Welcome, ${data.username}!`;
            }
            localStorage.setItem("currentUser", data.username);
            // Load last generated audio if exists
            loadLastGenerated();
        }
    })
    .catch(err => {
        console.error("Auth check failed:", err);
        alert("Session check failed. Please login.");
        window.location.href = "index.html";
    });
}
// Logout function
function logout() {
    console.log("Logging out...");
    fetch("http://127.0.0.1:5000/logout", {
        method: "POST",
        credentials: "include"
    })
    .then(() => {
        localStorage.removeItem("username");
        localStorage.removeItem("lastGenerated"); // Clear last generated audio
        localStorage.removeItem("currentUser");
        window.location.href = "index.html";
    })
    .catch(err => {
        console.error("Logout error:", err);
        window.location.href = "index.html";
    });
}
// Show different sections
function showSection(id) {
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    event.target.classList.add("active");
    // If showing home section, load last generated audio
    if (id === 'home') {
        loadLastGenerated();
    }
    // If showing history section, reload history
    if (id === 'history') {
        loadHistory();
    }
}
// Generate Music
function generateMusic() {
    const prompt = document.getElementById("musicPrompt").value.trim();
    if (!prompt) {
        alert("Please enter a music prompt!");
        return;
    }
    const musicResult = document.getElementById("musicResult");
    musicResult.innerHTML = `
        <div class="generating-message">
            <p>🎵 Generating music for: <b>${prompt}</b></p>
            <div class="loading-spinner"></div>
            <p><small>This may take a few moments...</small></p>
        </div>
    `;
    // Disable the generate button temporarily
    const generateBtn = document.querySelector('#home button');
    const originalText = generateBtn.textContent;
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;
    fetch("http://127.0.0.1:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt })
    })
    .then(res => {
        if (res.status === 401) {
            alert("Session expired. Please login again.");
            window.location.href = "index.html";
            return Promise.reject('Unauthorized');
        }
        return res.json();
    })
    .then(data => {
        // Re-enable button
        generateBtn.textContent = originalText;
        generateBtn.disabled = false;
        if (data && data.audio_url) {
            const fullAudioUrl = `http://127.0.0.1:5000${data.audio_url}`;
            // Display in the generate section with better styling
            musicResult.innerHTML = `
                <div class="music-output">
        <p><b>✨ Generated Successfully!</b></p>
        <p style="color: #667eea; font-size: 0.95rem; margin-bottom: 15px;">"${prompt}"</p>
        <audio controls autoplay src="${fullAudioUrl}" style="width: 100%;"></audio>
    </div>
`;
            // Save to history
            saveHistory(prompt, data.audio_url);
            // Store as last generated audio
            localStorage.setItem("lastGenerated", JSON.stringify({
                prompt: prompt,
                audio_url: data.audio_url,
                date: new Date().toLocaleString(),
                full_url: fullAudioUrl
            }));
        } else if (data && data.error) {
            musicResult.innerHTML = `
                <div class="error-message">
                    Error: ${data.error}
                </div>
            `;
        }
    })
    .catch(err => {
        // Re-enable button
        generateBtn.textContent = originalText;
        generateBtn.disabled = false;
        console.error("Generation error:", err);
        if (err !== 'Unauthorized') {
            musicResult.innerHTML = `
                <div class="error-message">
                    Failed to generate music. Please try again.
                </div>
            `;
        }
    });
}
// Load last generated audio in home section
function loadLastGenerated() {
    const lastGenerated = JSON.parse(localStorage.getItem("lastGenerated"));
    const musicResult = document.getElementById("musicResult");
    if (lastGenerated && musicResult) {
        musicResult.innerHTML = `
            <div class="audio-result">
                <div class="last-generated-header">
                    <span>🎵 Last Generated Music</span>
                </div>
                <div class="prompt-display">
                    <strong>Prompt:</strong> "${lastGenerated.prompt}"
                </div>
                <div class="audio-player-container">
                    <audio controls class="audio-player">
                        <source src="${lastGenerated.full_url}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </div>
        `;
    } else if (musicResult && musicResult.innerHTML.trim() === '') {
        musicResult.innerHTML = `
            <div class="welcome-message">
                <p>🎶 Enter a prompt above and click "Generate" to create your music!</p>
                <p><small>Try describing the style, mood, instruments, or genre you want.</small></p>
            </div>
        `;
    }
}
// Download audio function
function downloadAudio(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename || 'music'}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function getHistoryKey(){
    const username=localStorage.getItem("currentUser") || localStorage.getItem("username");
    return username ? `musicHistory_${username}` : "musicHistory";
}
// Save to History - FIXED VERSION
function saveHistory(prompt, audio_url) {
    const historyKey = getHistoryKey();
    let history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    const historyItem = {
        prompt: prompt,
        audio_url: audio_url,
        full_url: `http://127.0.0.1:5000${audio_url}`,
        date: new Date().toLocaleString(),
        timestamp: new Date().getTime() // Add timestamp for unique ID
    };
    // Add to beginning of array (newest first)
    history.unshift(historyItem);
    // Keep only last 50 items to prevent localStorage overflow
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    localStorage.setItem(historyKey, JSON.stringify(history));
    loadHistory(); // Refresh history display
}
// Load History - COMPLETELY FIXED VERSION
function loadHistory() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;
    const historyKey = getHistoryKey();
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="no-history">
                <p>No music generated yet.</p>
                <p><small>Your generated songs will appear here!</small></p>
            </div>
        `;
        return;
    }
    historyList.innerHTML = '';
    history.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-content">
                <div class="history-prompt">
                    <strong>${item.prompt}</strong>
                </div>
                <div class="history-date">
                    ${item.date}
                </div>
                <div class="history-audio">
                    <audio controls class="history-audio-player">
                        <source src="${item.full_url}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                </div>
                <div class="history-actions">
                    <button class="action-btn delete-btn" onclick="deleteHistoryItem(${index})">🗑 Delete</button>
                </div>
            </div>
        `;
        historyList.appendChild(historyItem);
    });
}

// Delete a single item from history and remove the corresponding audio file
function deleteHistoryItem(index) {
    const historyKey = getHistoryKey();
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    const item = history[index];

    if (!item) {
        alert("History item not found.");
        return;
    }

    if (!confirm("Delete this audio clip from your history?")) {
        return;
    }

    const audioPath = item.audio_url || "";
    const filename = audioPath.split("/").pop();

    fetch(`http://127.0.0.1:5000/delete/${filename}`, {
        method: "DELETE",
        credentials: "include"
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ data }) => {
        history.splice(index, 1);
        localStorage.setItem(historyKey, JSON.stringify(history));
        loadHistory();

        const lastGenerated = JSON.parse(localStorage.getItem("lastGenerated"));
        if (lastGenerated && lastGenerated.audio_url === item.audio_url) {
            localStorage.removeItem("lastGenerated");
            loadLastGenerated();
        }

        alert(data.message || "Audio clip deleted.");
    })
    .catch(err => {
        console.error("Delete error:", err);
        alert("Failed to delete the audio clip.");
    });
}
// Initialize on page load
window.onload = function() {
    console.log("Page loaded:", window.location.pathname);
    // If on home.html, check authentication
    if (window.location.pathname.includes("home.html")) {
        checkAuth();
        loadHistory();
        // Also load history when switching to history tab
        const historyLink = document.querySelector('a[onclick="showSection(\'history\')"]');
        if (historyLink) {
            historyLink.addEventListener('click', function() {
                setTimeout(loadHistory, 100);
            });
        }
    }
};