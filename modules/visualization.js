export const FINGER_COLORS = {
    thumb: '#FF6B6B',      // Red
    index: '#4ECDC4',      // Teal
    middle: '#45B7D1',     // Blue
    ring: '#F7DC6F',       // Yellow
    pinky: '#BB8FCE',      // Purple
    palm: '#52BE80',       // Green
    wrist: '#FFFFFF'       // White
};

export const FINGER_CONNECTIONS = {
    thumb: { connections: [[0, 1], [1, 2], [2, 3], [3, 4]], color: FINGER_COLORS.thumb },
    index: { connections: [[0, 5], [5, 6], [6, 7], [7, 8]], color: FINGER_COLORS.index },
    middle: { connections: [[0, 9], [9, 10], [10, 11], [11, 12]], color: FINGER_COLORS.middle },
    ring: { connections: [[0, 13], [13, 14], [14, 15], [15, 16]], color: FINGER_COLORS.ring },
    pinky: { connections: [[0, 17], [17, 18], [18, 19], [19, 20]], color: FINGER_COLORS.pinky },
    palm: { connections: [[5, 9], [9, 13], [13, 17]], color: FINGER_COLORS.palm }
};

export const LANDMARK_COLORS = {
    0: FINGER_COLORS.wrist,
    1: FINGER_COLORS.thumb, 2: FINGER_COLORS.thumb, 3: FINGER_COLORS.thumb, 4: FINGER_COLORS.thumb,
    5: FINGER_COLORS.index, 6: FINGER_COLORS.index, 7: FINGER_COLORS.index, 8: FINGER_COLORS.index,
    9: FINGER_COLORS.middle, 10: FINGER_COLORS.middle, 11: FINGER_COLORS.middle, 12: FINGER_COLORS.middle,
    13: FINGER_COLORS.ring, 14: FINGER_COLORS.ring, 15: FINGER_COLORS.ring, 16: FINGER_COLORS.ring,
    17: FINGER_COLORS.pinky, 18: FINGER_COLORS.pinky, 19: FINGER_COLORS.pinky, 20: FINGER_COLORS.pinky
};

export function drawHandConnections(ctx, landmarks, canvasWidth, canvasHeight) {
    ctx.lineWidth = 3;
    
    Object.values(FINGER_CONNECTIONS).forEach(finger => {
        ctx.strokeStyle = finger.color;
        finger.connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            ctx.beginPath();
            ctx.moveTo(startPoint.x * canvasWidth, startPoint.y * canvasHeight);
            ctx.lineTo(endPoint.x * canvasWidth, endPoint.y * canvasHeight);
            ctx.stroke();
        });
    });
}

export function drawHandLandmarks(ctx, landmarks, canvasWidth, canvasHeight) {
    landmarks.forEach((landmark, index) => {
        ctx.fillStyle = LANDMARK_COLORS[index] || '#FF0000';
        ctx.beginPath();
        ctx.arc(landmark.x * canvasWidth, landmark.y * canvasHeight, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add a white border to make dots more visible
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

export function getBoundingBox(landmarks, canvasWidth, canvasHeight) {
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
        x: minX * canvasWidth,
        y: minY * canvasHeight,
        width: (maxX - minX) * canvasWidth,
        height: (maxY - minY) * canvasHeight
    };
}

export function drawBoundingBox(ctx, box, gesture) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(box.x, box.y - 30, box.width, 30);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(gesture, box.x + 10, box.y - 8);
}