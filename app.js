// Face Recognition App - Cross-Platform
// Works on Android, iPhone, and Desktop browsers

class FaceRecognitionApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.isModelLoaded = false;
        this.isCameraActive = false;
        this.capturedDescriptor = null;
        this.registeredFaces = [];
        this.currentFacingMode = 'user'; // 'user' for front camera, 'environment' for back
        this.detectionInterval = null;
        
        // Liveness detection properties
        this.livenessCheckActive = false;
        this.livenessData = {
            blinkDetected: false,
            movementDetected: false,
            eyeClosedFrames: 0,
            eyeOpenFrames: 0,
            previousFacePosition: null,
            movementFrames: 0,
            checkStartTime: null
        };
        
        this.initElements();
        this.loadModels();
        this.loadRegisteredFaces();
    }

    initElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.switchCameraBtn = document.getElementById('switchCamera');
        this.saveBtn = document.getElementById('saveBtn');
        this.personNameInput = document.getElementById('personName');
        this.clearAllBtn = document.getElementById('clearAll');
        this.statusDiv = document.getElementById('status');
        this.detectionInfo = document.getElementById('detectionInfo');
        this.facesList = document.getElementById('facesList');
        this.faceCount = document.getElementById('faceCount');
        
        // Liveness UI elements
        this.livenessStatusDiv = document.getElementById('livenessStatus');
        this.livenessText = document.getElementById('livenessText');
        this.livenessIcon = document.getElementById('livenessIcon');
        this.blinkStatus = document.getElementById('blinkStatus');
        this.movementStatus = document.getElementById('movementStatus');

        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.captureFace());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.saveBtn.addEventListener('click', () => this.saveFace());
        this.clearAllBtn.addEventListener('click', () => this.clearAllFaces());
    }

    async loadModels() {
        this.updateStatus('Loading AI models...', 'info');
        try {
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
            
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
            
            this.isModelLoaded = true;
            this.updateStatus('AI models loaded! Ready to start.', 'success');
            this.startBtn.disabled = false;
        } catch (error) {
            console.error('Error loading models:', error);
            this.updateStatus('Error loading AI models. Please refresh.', 'error');
        }
    }

    async startCamera() {
        if (!this.isModelLoaded) {
            this.updateStatus('Please wait for models to load.', 'warning');
            return;
        }

        try {
            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            });

            await this.video.play();
            
            this.isCameraActive = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.captureBtn.disabled = false;
            this.updateStatus('Camera active - Face detection running', 'success');
            
            this.startFaceDetection();
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.updateStatus('Camera access denied or not available.', 'error');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            this.stream = null;
        }

        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        this.isCameraActive = false;
        this.livenessCheckActive = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.captureBtn.disabled = true;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.livenessStatusDiv.classList.add('hidden');
        this.updateStatus('Camera stopped', 'info');
        this.detectionInfo.textContent = 'No faces detected';
    }

    async switchCamera() {
        if (!this.isCameraActive) return;
        
        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
        this.stopCamera();
        setTimeout(() => this.startCamera(), 500);
    }

    async startFaceDetection() {
        const detectFaces = async () => {
            if (!this.isCameraActive) return;

            try {
                const detections = await faceapi
                    .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceExpressions()
                    .withFaceDescriptors();

                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                if (detections.length > 0) {
                    const resizedDetections = faceapi.resizeResults(detections, {
                        width: this.canvas.width,
                        height: this.canvas.height
                    });
                    
                    // Perform liveness detection if active
                    if (this.livenessCheckActive && detections[0]) {
                        await this.performLivenessDetection(detections[0]);
                    }

                    // Draw detections
                    faceapi.draw.drawDetections(this.canvas, resizedDetections);
                    faceapi.draw.drawFaceLandmarks(this.canvas, resizedDetections);
                    faceapi.draw.drawFaceExpressions(this.canvas, resizedDetections);

                    // Try to recognize faces
                    let infoText = `Detected ${detections.length} face(s)\n\n`;
                    
                    resizedDetections.forEach((detection, index) => {
                        const { x, y } = detection.detection.box;
                        const expressions = detection.expressions;
                        const topExpression = Object.keys(expressions).reduce((a, b) => 
                            expressions[a] > expressions[b] ? a : b
                        );

                        infoText += `Face ${index + 1}:\n`;
                        infoText += `Position: (${Math.round(x)}, ${Math.round(y)})\n`;
                        infoText += `Expression: ${topExpression} (${(expressions[topExpression] * 100).toFixed(1)}%)\n`;

                        // Match against registered faces
                        if (this.registeredFaces.length > 0) {
                            const match = this.findBestMatch(detection.descriptor);
                            if (match) {
                                infoText += `Match: ${match.name} (${(match.distance * 100).toFixed(1)}% similar)\n`;
                                
                                // Draw name label
                                this.ctx.fillStyle = '#4CAF50';
                                this.ctx.fillRect(x, y - 30, 200, 30);
                                this.ctx.fillStyle = 'white';
                                this.ctx.font = '16px Arial';
                                this.ctx.fillText(match.name, x + 5, y - 10);
                            } else {
                                infoText += `Match: Unknown person\n`;
                            }
                        }
                        infoText += '\n';
                    });

                    this.detectionInfo.textContent = infoText;
                } else {
                    this.detectionInfo.textContent = 'No faces detected';
                }
            } catch (error) {
                console.error('Detection error:', error);
            }
        };

        // Run detection every 100ms
        this.detectionInterval = setInterval(detectFaces, 100);
    }

    async captureFace() {
        if (!this.isCameraActive) return;
        
        // Start liveness check
        this.updateStatus('Starting liveness detection... Please look at the camera naturally.', 'info');
        this.startLivenessCheck();
    }
    
    startLivenessCheck() {
        this.livenessCheckActive = true;
        this.livenessData = {
            blinkDetected: false,
            movementDetected: false,
            eyeClosedFrames: 0,
            eyeOpenFrames: 0,
            previousFacePosition: null,
            movementFrames: 0,
            checkStartTime: Date.now()
        };
        
        this.livenessStatusDiv.classList.remove('hidden', 'success', 'failed');
        this.livenessStatusDiv.classList.add('checking');
        this.livenessText.textContent = 'Please blink and move your head slightly';
        this.livenessIcon.textContent = '👁️';
        this.blinkStatus.textContent = '⏳ Waiting for blink...';
        this.blinkStatus.classList.remove('success', 'failed');
        this.movementStatus.textContent = '⏳ Detecting movement...';
        this.movementStatus.classList.remove('success', 'failed');
    }
    
    async performLivenessDetection(detection) {
        if (!this.livenessCheckActive || !detection) return;
        
        const landmarks = detection.landmarks;
        const box = detection.detection.box;
        
        // Check for blink using eye landmarks
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        
        // Calculate eye aspect ratio (simplified)
        const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y);
        const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y);
        const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
        
        // Eye closed threshold
        if (avgEyeHeight < 3) {
            this.livenessData.eyeClosedFrames++;
            if (this.livenessData.eyeOpenFrames > 5) {
                this.livenessData.blinkDetected = true;
                this.blinkStatus.textContent = '✅ Blink detected!';
                this.blinkStatus.classList.add('success');
            }
        } else {
            this.livenessData.eyeOpenFrames++;
            if (this.livenessData.eyeClosedFrames > 2) {
                this.livenessData.eyeClosedFrames = 0;
            }
        }
        
        // Check for head movement
        const currentPosition = { x: box.x, y: box.y };
        if (this.livenessData.previousFacePosition) {
            const dx = Math.abs(currentPosition.x - this.livenessData.previousFacePosition.x);
            const dy = Math.abs(currentPosition.y - this.livenessData.previousFacePosition.y);
            
            if (dx > 5 || dy > 5) {
                this.livenessData.movementFrames++;
                if (this.livenessData.movementFrames > 10) {
                    this.livenessData.movementDetected = true;
                    this.movementStatus.textContent = '✅ Movement detected!';
                    this.movementStatus.classList.add('success');
                }
            }
        }
        this.livenessData.previousFacePosition = currentPosition;
        
        // Check if liveness verified
        if (this.livenessData.blinkDetected && this.livenessData.movementDetected) {
            this.completeLivenessCheck(true, detection);
        }
        
        // Timeout after 15 seconds
        if (Date.now() - this.livenessData.checkStartTime > 15000) {
            this.completeLivenessCheck(false, detection);
        }
    }
    
    async completeLivenessCheck(passed, detection) {
        this.livenessCheckActive = false;
        
        if (passed) {
            this.livenessStatusDiv.classList.remove('checking');
            this.livenessStatusDiv.classList.add('success');
            this.livenessText.textContent = '✅ Liveness verified! You are a real person.';
            this.livenessIcon.textContent = '✅';
            
            // Capture the face
            this.capturedDescriptor = detection.descriptor;
            this.saveBtn.disabled = false;
            this.updateStatus('Real person verified! Enter a name and click Save.', 'success');
            this.personNameInput.focus();
            
            // Hide liveness status after 3 seconds
            setTimeout(() => {
                this.livenessStatusDiv.classList.add('hidden');
            }, 3000);
        } else {
            this.livenessStatusDiv.classList.remove('checking');
            this.livenessStatusDiv.classList.add('failed');
            this.livenessText.textContent = '❌ Liveness check failed! Photo detected or timeout.';
            this.livenessIcon.textContent = '❌';
            
            if (!this.livenessData.blinkDetected) {
                this.blinkStatus.textContent = '❌ No blink detected';
                this.blinkStatus.classList.add('failed');
            }
            if (!this.livenessData.movementDetected) {
                this.movementStatus.textContent = '❌ No movement detected';
                this.movementStatus.classList.add('failed');
            }
            
            this.updateStatus('⚠️ PHOTO DETECTED! Please use a real person, not a picture.', 'error');
            
            // Hide liveness status after 5 seconds
            setTimeout(() => {
                this.livenessStatusDiv.classList.add('hidden');
            }, 5000);
        }
    }

    saveFace() {
        const name = this.personNameInput.value.trim();
        
        if (!name) {
            this.updateStatus('Please enter a name.', 'warning');
            return;
        }

        if (!this.capturedDescriptor) {
            this.updateStatus('Please capture a face first.', 'warning');
            return;
        }

        // Create thumbnail
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = 150;
        thumbnailCanvas.height = 150;
        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        thumbnailCtx.drawImage(this.video, 0, 0, 150, 150);
        const thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.8);

        const faceData = {
            id: Date.now(),
            name: name,
            descriptor: Array.from(this.capturedDescriptor),
            thumbnail: thumbnail,
            date: new Date().toISOString()
        };

        this.registeredFaces.push(faceData);
        this.saveRegisteredFaces();
        this.renderFacesList();
        
        this.personNameInput.value = '';
        this.capturedDescriptor = null;
        this.saveBtn.disabled = true;
        this.updateStatus(`Face registered for ${name}!`, 'success');
    }

    findBestMatch(descriptor) {
        if (this.registeredFaces.length === 0) return null;

        let bestMatch = null;
        let bestDistance = Infinity;

        this.registeredFaces.forEach(face => {
            const distance = faceapi.euclideanDistance(descriptor, face.descriptor);
            if (distance < bestDistance && distance < 0.6) { // Threshold
                bestDistance = distance;
                bestMatch = {
                    name: face.name,
                    distance: 1 - distance // Convert to similarity
                };
            }
        });

        return bestMatch;
    }

    saveRegisteredFaces() {
        try {
            localStorage.setItem('registeredFaces', JSON.stringify(this.registeredFaces));
        } catch (error) {
            console.error('Error saving faces:', error);
            this.updateStatus('Error saving face data.', 'error');
        }
    }

    loadRegisteredFaces() {
        try {
            const stored = localStorage.getItem('registeredFaces');
            if (stored) {
                this.registeredFaces = JSON.parse(stored);
                this.renderFacesList();
            }
        } catch (error) {
            console.error('Error loading faces:', error);
        }
    }

    renderFacesList() {
        this.facesList.innerHTML = '';
        this.faceCount.textContent = this.registeredFaces.length;

        this.registeredFaces.forEach(face => {
            const faceItem = document.createElement('div');
            faceItem.className = 'face-item';
            faceItem.innerHTML = `
                <img src="${face.thumbnail}" alt="${face.name}">
                <div class="name">${face.name}</div>
                <button class="delete-btn" onclick="app.deleteFace(${face.id})">Delete</button>
            `;
            this.facesList.appendChild(faceItem);
        });
    }

    deleteFace(id) {
        if (confirm('Delete this face?')) {
            this.registeredFaces = this.registeredFaces.filter(face => face.id !== id);
            this.saveRegisteredFaces();
            this.renderFacesList();
            this.updateStatus('Face deleted.', 'info');
        }
    }

    clearAllFaces() {
        if (confirm('Delete all registered faces? This cannot be undone.')) {
            this.registeredFaces = [];
            this.saveRegisteredFaces();
            this.renderFacesList();
            this.updateStatus('All faces cleared.', 'info');
        }
    }

    updateStatus(message, type = 'info') {
        this.statusDiv.textContent = message;
        this.statusDiv.className = 'status ' + type;
    }
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new FaceRecognitionApp();
    });
} else {
    app = new FaceRecognitionApp();
}

// PWA Install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or prompt
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt show';
    installPrompt.innerHTML = `
        <p>Install this app on your device for better experience!</p>
        <button class="btn btn-success" id="installBtn">Install</button>
    `;
    document.body.appendChild(installPrompt);

    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            deferredPrompt = null;
            installPrompt.remove();
        }
    });
});
