const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');
const statusText = document.getElementById('statusText');
const gestureResult = document.getElementById('gestureResult');
const startButton = document.getElementById('startButton');
const detectModeBtn = document.getElementById('detectModeBtn');
const trainModeBtn = document.getElementById('trainModeBtn');
const trainingPanel = document.getElementById('trainingPanel');
const captureBtn = document.getElementById('captureBtn');
const trainingInfo = document.getElementById('trainingInfo');
const confidenceFill = document.getElementById('confidenceFill');

let camera = null;
let isDetecting = false;
let currentMode = 'detect';
let selectedGesture = null;
let trainingData = {};
let currentLandmarks = null;

// Load training data from localStorage
try {
    const savedData = localStorage.getItem('aslTrainingData');
    if (savedData) {
        trainingData = JSON.parse(savedData);
    }
} catch (e) {
    console.error('Error loading training data:', e);
}


const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        currentLandmarks = landmarks;
        
        if (window.drawConnectors) {
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
        } else {
            drawHandConnections(canvasCtx, landmarks);
        }
        
        if (window.drawLandmarks) {
            window.drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2, radius: 5});
        } else {
            drawHandLandmarks(canvasCtx, landmarks);
        }
        
        const boundingBox = getBoundingBox(landmarks);
        
        if (currentMode === 'detect') {
            const detection = detectGestureWithConfidence(landmarks);
            
            drawBoundingBox(canvasCtx, boundingBox, detection.gesture);
            
            if (detection.gesture !== 'None') {
                gestureResult.textContent = `✋ "${detection.gesture}" detected!`;
                document.querySelector('.confidence-meter').style.display = 'block';
                confidenceFill.style.width = `${detection.confidence * 100}%`;
            } else {
                gestureResult.textContent = '';
                document.querySelector('.confidence-meter').style.display = 'none';
            }
        } else {
            drawBoundingBox(canvasCtx, boundingBox, 'Training Mode');
            if (selectedGesture) {
                gestureResult.textContent = `Training: ${selectedGesture}`;
            }
        }
    } else {
        currentLandmarks = null;
        gestureResult.textContent = '';
        document.querySelector('.confidence-meter').style.display = 'none';
    }
    
    canvasCtx.restore();
}

function getBoundingBox(landmarks) {
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    
    landmarks.forEach(landmark => {
        minX = Math.min(minX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxX = Math.max(maxX, landmark.x);
        maxY = Math.max(maxY, landmark.y);
    });
    
    const padding = 0.1;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(1, maxX + padding);
    maxY = Math.min(1, maxY + padding);
    
    return {
        x: minX * canvasElement.width,
        y: minY * canvasElement.height,
        width: (maxX - minX) * canvasElement.width,
        height: (maxY - minY) * canvasElement.height
    };
}

function drawBoundingBox(ctx, box, gesture) {
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(box.x, box.y - 30, box.width, 30);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(gesture, box.x + 10, box.y - 8);
}

function detectGesture(landmarks) {
    if (isILoveYouGesture(landmarks)) return 'I Love You';
    if (isHelloGesture(landmarks)) return 'Hello';
    if (isGoodGesture(landmarks)) return 'Good';
    if (isBadGesture(landmarks)) return 'Bad';
    if (isYesGesture(landmarks)) return 'Yes';
    if (isIGesture(landmarks)) return 'I/I\'m';
    if (isWhyGesture(landmarks)) return 'Why';
    if (isNoGesture(landmarks)) return 'No';
    if (isOkayGesture(landmarks)) return 'Okay';
    return 'None';
}

function isILoveYouGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    
    const thumbExtended = thumbTip.y < thumbIP.y || Math.abs(thumbTip.x - thumbIP.x) > 0.1;
    const indexExtended = indexTip.y < indexPIP.y;
    const middleFolded = middleTip.y > middlePIP.y;
    const ringFolded = ringTip.y > ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    return thumbExtended && indexExtended && middleFolded && ringFolded && pinkyExtended;
}

function isHelloGesture(landmarks) {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    
    const indexExtended = indexTip.y < indexPIP.y;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringExtended = ringTip.y < ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    const palmFacingForward = landmarks[9].z < wrist.z;
    
    return indexExtended && middleExtended && ringExtended && pinkyExtended && palmFacingForward;
}

function isGoodGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const thumbUp = thumbTip.y < thumbIP.y && thumbTip.y < thumbMCP.y;
    const indexFolded = indexTip.y > indexMCP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    return thumbUp && indexFolded && middleFolded && ringFolded && pinkyFolded;
}

function isBadGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const thumbDown = thumbTip.y > thumbIP.y && thumbTip.y > thumbMCP.y;
    const indexFolded = indexTip.y > indexMCP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    return thumbDown && indexFolded && middleFolded && ringFolded && pinkyFolded;
}

function isYesGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const thumbFolded = Math.abs(thumbTip.y - thumbMCP.y) < 0.1;
    const indexFolded = indexTip.y > indexMCP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    return thumbFolded && indexFolded && middleFolded && ringFolded && pinkyFolded;
}

function isIGesture(landmarks) {
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const indexExtended = indexTip.y < indexPIP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    const indexPointingUp = Math.abs(indexTip.x - indexPIP.x) < 0.05;
    
    return indexExtended && middleFolded && ringFolded && pinkyFolded && indexPointingUp;
}

function isWhyGesture(landmarks) {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    const palmBase = landmarks[9];
    
    const fingersSlightlyBent = 
        indexTip.y < indexMCP.y && 
        middleTip.y < middleMCP.y && 
        ringTip.y < ringMCP.y && 
        pinkyTip.y < pinkyMCP.y;
    
    const palmFacingUp = palmBase.z > wrist.z;
    
    return fingersSlightlyBent && palmFacingUp;
}

function isNoGesture(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const indexExtended = indexTip.y < indexPIP.y;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    const fingersClose = Math.abs(indexTip.x - middleTip.x) < 0.05;
    const touchingThumb = Math.abs(indexTip.x - thumbTip.x) < 0.1 && Math.abs(indexTip.y - thumbTip.y) < 0.1;
    
    return indexExtended && middleExtended && ringFolded && pinkyFolded && (fingersClose || touchingThumb);
}

function isOkayGesture(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    
    const thumbIndexDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2)
    );
    
    const thumbIndexTouching = thumbIndexDistance < 0.05;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringExtended = ringTip.y < ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    return thumbIndexTouching && middleExtended && ringExtended && pinkyExtended;
}

function drawHandConnections(ctx, landmarks) {
    const fingerConnections = {
        thumb: { connections: [[0, 1], [1, 2], [2, 3], [3, 4]], color: '#FF6B6B' },      // Red
        index: { connections: [[0, 5], [5, 6], [6, 7], [7, 8]], color: '#4ECDC4' },      // Teal
        middle: { connections: [[0, 9], [9, 10], [10, 11], [11, 12]], color: '#45B7D1' }, // Blue
        ring: { connections: [[0, 13], [13, 14], [14, 15], [15, 16]], color: '#F7DC6F' }, // Yellow
        pinky: { connections: [[0, 17], [17, 18], [18, 19], [19, 20]], color: '#BB8FCE' }, // Purple
        palm: { connections: [[5, 9], [9, 13], [13, 17]], color: '#52BE80' }             // Green
    };
    
    ctx.lineWidth = 3;
    
    Object.values(fingerConnections).forEach(finger => {
        ctx.strokeStyle = finger.color;
        finger.connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            ctx.beginPath();
            ctx.moveTo(startPoint.x * canvasElement.width, startPoint.y * canvasElement.height);
            ctx.lineTo(endPoint.x * canvasElement.width, endPoint.y * canvasElement.height);
            ctx.stroke();
        });
    });
}

function drawHandLandmarks(ctx, landmarks) {
    const landmarkColors = {
        0: '#FFFFFF',   // Wrist - White
        1: '#FF6B6B', 2: '#FF6B6B', 3: '#FF6B6B', 4: '#FF6B6B',         // Thumb - Red
        5: '#4ECDC4', 6: '#4ECDC4', 7: '#4ECDC4', 8: '#4ECDC4',         // Index - Teal
        9: '#45B7D1', 10: '#45B7D1', 11: '#45B7D1', 12: '#45B7D1',      // Middle - Blue
        13: '#F7DC6F', 14: '#F7DC6F', 15: '#F7DC6F', 16: '#F7DC6F',     // Ring - Yellow
        17: '#BB8FCE', 18: '#BB8FCE', 19: '#BB8FCE', 20: '#BB8FCE'      // Pinky - Purple
    };
    
    landmarks.forEach((landmark, index) => {
        ctx.fillStyle = landmarkColors[index] || '#FF0000';
        ctx.beginPath();
        ctx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add a white border to make dots more visible
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

async function startCamera() {
    startButton.disabled = true;
    statusText.textContent = 'Initializing camera...';
    statusText.className = 'loading';
    
    try {
        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (isDetecting) {
                    await hands.send({image: videoElement});
                }
            },
            width: 640,
            height: 480
        });
        
        await camera.start();
        isDetecting = true;
        statusText.textContent = 'Camera active - Try any of the supported gestures';
        statusText.className = '';
        
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
    } catch (error) {
        console.error('Error starting camera:', error);
        statusText.textContent = 'Error: Could not access camera. Please check permissions.';
        statusText.className = 'error';
        startButton.disabled = false;
    }
}

startButton.addEventListener('click', startCamera);

detectModeBtn.addEventListener('click', () => {
    currentMode = 'detect';
    detectModeBtn.classList.add('active');
    trainModeBtn.classList.remove('active');
    trainingPanel.style.display = 'none';
});

trainModeBtn.addEventListener('click', () => {
    currentMode = 'train';
    trainModeBtn.classList.add('active');
    detectModeBtn.classList.remove('active');
    trainingPanel.style.display = 'block';
});

document.querySelectorAll('.gesture-button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.gesture-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedGesture = btn.dataset.gesture;
        captureBtn.disabled = false;
        updateTrainingInfo();
    });
});

captureBtn.addEventListener('click', () => {
    if (currentLandmarks && selectedGesture) {
        captureTrainingSample(selectedGesture, currentLandmarks);
    }
});

function captureTrainingSample(gesture, landmarks) {
    if (!trainingData[gesture]) {
        trainingData[gesture] = [];
    }
    
    const sample = landmarks.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z
    }));
    
    trainingData[gesture].push(sample);
    localStorage.setItem('aslTrainingData', JSON.stringify(trainingData));
    
    updateTrainingInfo();
    
    trainingInfo.textContent = `Captured! ${trainingData[gesture].length} samples for "${gesture}"`;
    setTimeout(updateTrainingInfo, 2000);
}

function updateTrainingInfo() {
    if (selectedGesture && trainingData[selectedGesture]) {
        trainingInfo.textContent = `${trainingData[selectedGesture].length} samples captured for "${selectedGesture}"`;
    } else if (selectedGesture) {
        trainingInfo.textContent = `0 samples captured for "${selectedGesture}". Make the gesture and click Capture!`;
    }
}

function calculateLandmarkDistance(landmarks1, landmarks2) {
    let totalDistance = 0;
    for (let i = 0; i < landmarks1.length; i++) {
        const dx = landmarks1[i].x - landmarks2[i].x;
        const dy = landmarks1[i].y - landmarks2[i].y;
        const dz = landmarks1[i].z - landmarks2[i].z;
        totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return totalDistance / landmarks1.length;
}

function detectGestureWithConfidence(landmarks) {
    const baseDetection = detectGesture(landmarks);
    
    if (baseDetection === 'None' || !trainingData[baseDetection] || trainingData[baseDetection].length === 0) {
        return { gesture: baseDetection, confidence: baseDetection === 'None' ? 0 : 0.5 };
    }
    
    const samples = trainingData[baseDetection];
    let minDistance = Infinity;
    
    samples.forEach(sample => {
        const distance = calculateLandmarkDistance(landmarks, sample);
        minDistance = Math.min(minDistance, distance);
    });
    
    const confidence = Math.max(0, Math.min(1, 1 - (minDistance * 5)));
    
    return { gesture: baseDetection, confidence };
}