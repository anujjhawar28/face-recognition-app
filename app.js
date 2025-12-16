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
        this.attendanceRecords = [];
        this.currentFacingMode = 'user'; // 'user' for front camera, 'environment' for back
        this.detectionInterval = null;
        this.lastRecognitionTime = {}; // Track last recognition time for each person
        
        // Liveness detection properties
        this.livenessCheckActive = false;
        this.livenessData = {
            blinkDetected: false,
            movementDetected: false,
            smileDetected: false,
            headTurnDetected: false,
            eyeClosedFrames: 0,
            eyeOpenFrames: 0,
            previousFacePosition: null,
            movementFrames: 0,
            checkStartTime: null,
            blinkCount: 0,
            wasEyesClosed: false,
            earHistory: [],
            smileFrames: 0,
            neutralFrames: 0,
            wasSmiling: false,
            headRotationFrames: 0,
            initialNoseX: null
        };
        
        this.initElements();
        this.loadModels();
        this.loadRegisteredFaces();
        this.loadAttendanceRecords();
    }

    initElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.skipLivenessBtn = document.getElementById('skipLivenessBtn');
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
        this.smileStatus = document.getElementById('smileStatus');
        this.headTurnStatus = document.getElementById('headTurnStatus');
        this.movementStatus = document.getElementById('movementStatus');
        this.debugInfo = document.getElementById('debugInfo');
        
        // Attendance UI elements
        this.attendanceBody = document.getElementById('attendanceBody');
        this.todayCount = document.getElementById('todayCount');
        this.totalCount = document.getElementById('totalCount');
        this.clearTodayBtn = document.getElementById('clearTodayBtn');
        this.clearAllRecordsBtn = document.getElementById('clearAllRecordsBtn');
        this.exportBtn = document.getElementById('exportBtn');

        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.captureFace());
        if (this.skipLivenessBtn) {
            this.skipLivenessBtn.addEventListener('click', () => this.captureFaceDirectly());
        }
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.saveBtn.addEventListener('click', () => this.saveFace());
        this.clearAllBtn.addEventListener('click', () => this.clearAllFaces());
        this.clearTodayBtn.addEventListener('click', () => this.clearTodayAttendance());
        this.clearAllRecordsBtn.addEventListener('click', () => this.clearAllAttendance());
        this.exportBtn.addEventListener('click', () => this.exportAttendance());
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
            if (this.skipLivenessBtn) {
                this.skipLivenessBtn.style.display = 'inline-flex';
                this.skipLivenessBtn.disabled = false;
            }
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
                                
                                // Mark attendance automatically
                                this.markAttendance(match.name, match.faceId);
                                
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
        console.log('Starting liveness check...');
        this.updateStatus('Starting liveness detection... Please look at the camera naturally.', 'info');
        this.startLivenessCheck();
    }
    
    async captureFaceDirectly() {
        if (!this.isCameraActive) return;
        
        console.log('Skipping liveness check - direct capture');
        try {
            const detection = await faceapi
                .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                this.capturedDescriptor = detection.descriptor;
                this.saveBtn.disabled = false;
                this.updateStatus('Face captured! Enter a name and click Save.', 'success');
                this.personNameInput.focus();
            } else {
                this.updateStatus('No face detected. Please face the camera.', 'warning');
            }
        } catch (error) {
            console.error('Capture error:', error);
            this.updateStatus('Error capturing face.', 'error');
        }
    }
    
    startLivenessCheck() {
        this.livenessCheckActive = true;
        this.livenessData = {
            blinkDetected: false,
            movementDetected: false,
            smileDetected: false,
            headTurnDetected: false,
            eyeClosedFrames: 0,
            eyeOpenFrames: 0,
            previousFacePosition: null,
            movementFrames: 0,
            checkStartTime: Date.now(),
            blinkCount: 0,
            wasEyesClosed: false,
            earHistory: [],
            smileFrames: 0,
            neutralFrames: 0,
            wasSmiling: false,
            headRotationFrames: 0,
            initialNoseX: null
        };
        
        this.livenessStatusDiv.classList.remove('hidden', 'success', 'failed');
        this.livenessStatusDiv.classList.add('checking');
        this.livenessText.textContent = 'Complete ANY 2 checks: Blink OR Smile OR Turn head OR Move';
        this.livenessIcon.textContent = '🎯';
        
        this.blinkStatus.textContent = '⏳ Waiting for blink...';
        this.blinkStatus.classList.remove('success', 'failed');
        this.smileStatus.textContent = '⏳ Try smiling...';
        this.smileStatus.classList.remove('success', 'failed');
        this.headTurnStatus.textContent = '⏳ Turn head left/right...';
        this.headTurnStatus.classList.remove('success', 'failed');
        this.movementStatus.textContent = '⏳ Any movement...';
        this.movementStatus.classList.remove('success', 'failed');
        
        if (this.debugInfo) {
            this.debugInfo.innerHTML = 'Pass ANY 2 checks above ✓';
        }
    }
    
    async performLivenessDetection(detection) {
        if (!this.livenessCheckActive || !detection) return;
        
        const landmarks = detection.landmarks;
        const box = detection.detection.box;
        const expressions = detection.expressions;
        
        // Check if expressions are available
        if (!expressions) {
            console.warn('No expressions data available');
            return;
        }
        
        // ===== METHOD 1: BLINK DETECTION =====
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        
        const getEAR = (eye) => {
            if (!eye || eye.length < 6) return 0.3;
            try {
                const p1 = eye[0], p2 = eye[1], p3 = eye[2], p4 = eye[3], p5 = eye[4], p6 = eye[5];
                const v1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
                const v2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
                const h = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));
                return (v1 + v2) / (2.0 * h);
            } catch (e) {
                return 0.3;
            }
        };
        
        const leftEAR = getEAR(leftEye);
        const rightEAR = getEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;
        
        this.livenessData.earHistory.push(avgEAR);
        if (this.livenessData.earHistory.length > 3) {
            this.livenessData.earHistory.shift();
        }
        
        const smoothedEAR = this.livenessData.earHistory.reduce((a, b) => a + b, 0) / this.livenessData.earHistory.length;
        const EAR_THRESHOLD = 0.21; // Lowered for easier detection
        
        console.log('Blink check - EAR:', smoothedEAR.toFixed(3), 'Threshold:', EAR_THRESHOLD);
        
        if (smoothedEAR < EAR_THRESHOLD) {
            if (!this.livenessData.wasEyesClosed) {
                this.livenessData.wasEyesClosed = true;
                this.blinkStatus.textContent = '👁️ Eyes closing...';
            }
        } else {
            if (this.livenessData.wasEyesClosed) {
                this.livenessData.blinkCount++;
                this.livenessData.wasEyesClosed = false;
                this.livenessData.blinkDetected = true;
                this.blinkStatus.textContent = `✅ Blink detected!`;
                this.blinkStatus.classList.add('success');
                console.log('✅ BLINK DETECTED');
            }
        }
        
        // ===== METHOD 2: SMILE DETECTION =====
        const happyScore = expressions.happy;
        const SMILE_THRESHOLD = 0.4; // 40% confidence - easier to trigger
        
        console.log('Smile check - Happy score:', (happyScore * 100).toFixed(1) + '%', 'Threshold:', (SMILE_THRESHOLD * 100) + '%');
        
        if (happyScore > SMILE_THRESHOLD) {
            this.livenessData.smileFrames++;
            this.smileStatus.textContent = `😊 Smiling... ${Math.min(this.livenessData.smileFrames, 5)}/5`;
            
            if (!this.livenessData.wasSmiling && this.livenessData.smileFrames >= 5) {
                this.livenessData.wasSmiling = true;
                this.livenessData.smileDetected = true;
                this.smileStatus.textContent = '✅ Smile detected!';
                this.smileStatus.classList.add('success');
                console.log('✅ SMILE DETECTED');
            }
        } else {
            // Reset if not smiling
            if (this.livenessData.smileFrames > 0) {
                this.livenessData.smileFrames = Math.max(0, this.livenessData.smileFrames - 1);
            }
        }
        
        // ===== METHOD 3: HEAD TURN DETECTION =====
        const nose = landmarks.getNose();
        const currentNoseX = nose[3].x; // Nose tip
        
        if (this.livenessData.initialNoseX === null) {
            this.livenessData.initialNoseX = currentNoseX;
        } else {
            const noseMovement = Math.abs(currentNoseX - this.livenessData.initialNoseX);
            
            console.log('Head turn check - Movement:', noseMovement.toFixed(1), 'pixels');
            
            if (noseMovement > 10) { // Reduced from 15 to 10 pixels for easier detection
                this.livenessData.headRotationFrames++;
                this.headTurnStatus.textContent = `↔️ Turning... ${Math.min(this.livenessData.headRotationFrames, 3)}/3`;
                
                if (this.livenessData.headRotationFrames >= 3) {
                    this.livenessData.headTurnDetected = true;
                    this.headTurnStatus.textContent = '✅ Head turn detected!';
                    this.headTurnStatus.classList.add('success');
                    console.log('✅ HEAD TURN DETECTED');
                }
            }
        }
        
        // ===== METHOD 4: SIMPLE MOVEMENT DETECTION =====
        const currentPosition = { x: box.x, y: box.y };
        if (this.livenessData.previousFacePosition) {
            const dx = Math.abs(currentPosition.x - this.livenessData.previousFacePosition.x);
            const dy = Math.abs(currentPosition.y - this.livenessData.previousFacePosition.y);
            
            if (dx > 1 || dy > 1) {
                this.livenessData.movementFrames++;
                const progress = Math.min(this.livenessData.movementFrames, 8);
                this.movementStatus.textContent = `🔄 Moving... ${progress}/8`;
                
                if (this.livenessData.movementFrames >= 8) {
                    this.livenessData.movementDetected = true;
                    this.movementStatus.textContent = '✅ Movement detected!';
                    this.movementStatus.classList.add('success');
                    console.log('✅ MOVEMENT DETECTED');
                }
            }
        }
        this.livenessData.previousFacePosition = currentPosition;
        
        // ===== CHECK IF PASSED (Need ANY 2 methods) =====
        const passedMethods = [
            this.livenessData.blinkDetected,
            this.livenessData.smileDetected,
            this.livenessData.headTurnDetected,
            this.livenessData.movementDetected
        ].filter(Boolean).length;
        
        if (this.debugInfo) {
            this.debugInfo.innerHTML = `Checks passed: ${passedMethods}/2 needed | EAR: ${smoothedEAR.toFixed(3)} | Happy: ${(happyScore * 100).toFixed(0)}%`;
        }
        
        if (passedMethods >= 2) {
            console.log('✅ LIVENESS CHECK PASSED! Methods:', passedMethods);
            this.completeLivenessCheck(true, detection);
            return;
        }
        
        // ===== TIMEOUT =====
        const elapsed = Date.now() - this.livenessData.checkStartTime;
        if (elapsed > 30000) {
            this.completeLivenessCheck(false, detection);
        } else if (elapsed > 20000) {
            const remaining = Math.ceil((30000 - elapsed) / 1000);
            const tips = [];
            if (!this.livenessData.blinkDetected) tips.push('BLINK');
            if (!this.livenessData.smileDetected) tips.push('SMILE');
            if (!this.livenessData.headTurnDetected) tips.push('TURN HEAD');
            if (!this.livenessData.movementDetected) tips.push('MOVE');
            this.livenessText.textContent = `${remaining}s left - Try: ${tips.slice(0, 2).join(' or ')}`;
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
            if (!this.livenessData.smileDetected) {
                this.smileStatus.textContent = '❌ No smile detected';
                this.smileStatus.classList.add('failed');
            }
            if (!this.livenessData.headTurnDetected) {
                this.headTurnStatus.textContent = '❌ No head turn detected';
                this.headTurnStatus.classList.add('failed');
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
                    faceId: face.id,
                    distance: 1 - distance // Convert to similarity
                };
            }
        });

        return bestMatch;
    }
    
    markAttendance(name, faceId) {
        const now = new Date();
        const today = now.toDateString();
        const currentTime = now.getTime();
        
        // Check if already marked today
        const alreadyMarked = this.attendanceRecords.some(record => {
            const recordDate = new Date(record.timestamp).toDateString();
            return record.faceId === faceId && recordDate === today;
        });
        
        // Prevent notification spam (only show once every 10 seconds per person)
        const lastTime = this.lastRecognitionTime[faceId] || 0;
        if (currentTime - lastTime < 10000) {
            return; // Too soon, skip
        }
        this.lastRecognitionTime[faceId] = currentTime;
        
        if (alreadyMarked) {
            this.showAttendanceNotification(
                name,
                'Your attendance is already marked for today!',
                'duplicate'
            );
        } else {
            const record = {
                id: Date.now(),
                faceId: faceId,
                name: name,
                timestamp: now.toISOString(),
                status: 'Present'
            };
            
            this.attendanceRecords.unshift(record); // Add to beginning
            this.saveAttendanceRecords();
            this.renderAttendanceTable();
            
            this.showAttendanceNotification(
                name,
                'Attendance marked successfully!',
                'success'
            );
        }
    }
    
    showAttendanceNotification(name, message, type) {
        // Remove existing notification
        const existing = document.querySelector('.attendance-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `attendance-notification ${type} show`;
        notification.innerHTML = `
            <div class="notification-header">
                <span>${type === 'duplicate' ? '⚠️' : '✅'}</span>
                <span>${name}</span>
            </div>
            <div class="notification-body">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
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
    
    saveAttendanceRecords() {
        try {
            localStorage.setItem('attendanceRecords', JSON.stringify(this.attendanceRecords));
        } catch (error) {
            console.error('Error saving attendance:', error);
        }
    }
    
    loadAttendanceRecords() {
        try {
            const stored = localStorage.getItem('attendanceRecords');
            if (stored) {
                this.attendanceRecords = JSON.parse(stored);
                this.renderAttendanceTable();
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
        }
    }
    
    renderAttendanceTable() {
        this.attendanceBody.innerHTML = '';
        
        if (this.attendanceRecords.length === 0) {
            this.attendanceBody.innerHTML = `
                <tr class="no-records">
                    <td colspan="5">No attendance records yet</td>
                </tr>
            `;
            this.todayCount.textContent = '0';
            this.totalCount.textContent = '0';
            return;
        }
        
        const today = new Date().toDateString();
        let todayCount = 0;
        
        this.attendanceRecords.forEach((record, index) => {
            const date = new Date(record.timestamp);
            const isToday = date.toDateString() === today;
            if (isToday) todayCount++;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${record.name}</strong></td>
                <td>${date.toLocaleDateString()}</td>
                <td>${date.toLocaleTimeString()}</td>
                <td><span class="status-badge-table present">${record.status}</span></td>
            `;
            this.attendanceBody.appendChild(row);
        });
        
        this.todayCount.textContent = todayCount;
        this.totalCount.textContent = this.attendanceRecords.length;
    }
    
    clearTodayAttendance() {
        if (confirm('Clear today\'s attendance records?')) {
            const today = new Date().toDateString();
            this.attendanceRecords = this.attendanceRecords.filter(record => {
                const recordDate = new Date(record.timestamp).toDateString();
                return recordDate !== today;
            });
            this.saveAttendanceRecords();
            this.renderAttendanceTable();
            this.updateStatus('Today\'s attendance cleared.', 'info');
        }
    }
    
    clearAllAttendance() {
        if (confirm('Delete all attendance records? This cannot be undone.')) {
            this.attendanceRecords = [];
            this.saveAttendanceRecords();
            this.renderAttendanceTable();
            this.updateStatus('All attendance records cleared.', 'info');
        }
    }
    
    exportAttendance() {
        if (this.attendanceRecords.length === 0) {
            alert('No records to export!');
            return;
        }
        
        let csv = 'No,Name,Date,Time,Status\n';
        
        this.attendanceRecords.forEach((record, index) => {
            const date = new Date(record.timestamp);
            csv += `${index + 1},${record.name},${date.toLocaleDateString()},${date.toLocaleTimeString()},${record.status}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.updateStatus('Attendance exported successfully!', 'success');
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
