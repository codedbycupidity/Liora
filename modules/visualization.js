/**
 * Visualization module for hand tracking display
 * Handles all drawing operations on the canvas
 */

// Color scheme for different parts of the hand
// Each finger has a unique color for easy identification
export const FINGER_COLORS = {
    thumb: '#FF6B6B',      // Red - easily distinguishable
    index: '#4ECDC4',      // Teal - pointing finger
    middle: '#45B7D1',     // Blue - middle finger
    ring: '#F7DC6F',       // Yellow - ring finger
    pinky: '#BB8FCE',      // Purple - smallest finger
    palm: '#52BE80',       // Green - palm connections
    wrist: '#FFFFFF'       // White - wrist landmark
};

// Define connections between landmarks for each finger
// Numbers correspond to MediaPipe landmark indices
export const FINGER_CONNECTIONS = {
    thumb: { 
        connections: [[0, 1], [1, 2], [2, 3], [3, 4]], // Wrist to thumb tip
        color: FINGER_COLORS.thumb 
    },
    index: { 
        connections: [[0, 5], [5, 6], [6, 7], [7, 8]], // Wrist to index tip
        color: FINGER_COLORS.index 
    },
    middle: { 
        connections: [[0, 9], [9, 10], [10, 11], [11, 12]], // Wrist to middle tip
        color: FINGER_COLORS.middle 
    },
    ring: { 
        connections: [[0, 13], [13, 14], [14, 15], [15, 16]], // Wrist to ring tip
        color: FINGER_COLORS.ring 
    },
    pinky: { 
        connections: [[0, 17], [17, 18], [18, 19], [19, 20]], // Wrist to pinky tip
        color: FINGER_COLORS.pinky 
    },
    palm: { 
        connections: [[5, 9], [9, 13], [13, 17]], // Palm connections between finger bases
        color: FINGER_COLORS.palm 
    }
};

// Map each landmark index to its corresponding color
// MediaPipe provides 21 landmarks (0-20)
export const LANDMARK_COLORS = {
    0: FINGER_COLORS.wrist,    // Wrist
    // Thumb landmarks (1-4)
    1: FINGER_COLORS.thumb, 2: FINGER_COLORS.thumb, 3: FINGER_COLORS.thumb, 4: FINGER_COLORS.thumb,
    // Index finger landmarks (5-8)
    5: FINGER_COLORS.index, 6: FINGER_COLORS.index, 7: FINGER_COLORS.index, 8: FINGER_COLORS.index,
    // Middle finger landmarks (9-12)
    9: FINGER_COLORS.middle, 10: FINGER_COLORS.middle, 11: FINGER_COLORS.middle, 12: FINGER_COLORS.middle,
    // Ring finger landmarks (13-16)
    13: FINGER_COLORS.ring, 14: FINGER_COLORS.ring, 15: FINGER_COLORS.ring, 16: FINGER_COLORS.ring,
    // Pinky finger landmarks (17-20)
    17: FINGER_COLORS.pinky, 18: FINGER_COLORS.pinky, 19: FINGER_COLORS.pinky, 20: FINGER_COLORS.pinky
};

/**
 * Draw connections between hand landmarks to form skeleton
 * @param {CanvasRenderingContext2D} ctx - Canvas context for drawing
 * @param {Array} landmarks - 21 normalized landmarks from MediaPipe
 * @param {number} canvasWidth - Width of canvas in pixels
 * @param {number} canvasHeight - Height of canvas in pixels
 */
export function drawHandConnections(ctx, landmarks, canvasWidth, canvasHeight) {
    // Set line width for connections
    ctx.lineWidth = 3;
    
    // Draw connections for each finger
    Object.values(FINGER_CONNECTIONS).forEach(finger => {
        // Set color for this finger's connections
        ctx.strokeStyle = finger.color;
        
        // Draw each connection segment
        finger.connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            // Convert normalized coordinates (0-1) to canvas pixels
            ctx.beginPath();
            ctx.moveTo(startPoint.x * canvasWidth, startPoint.y * canvasHeight);
            ctx.lineTo(endPoint.x * canvasWidth, endPoint.y * canvasHeight);
            ctx.stroke();
        });
    });
}

/**
 * Draw circular dots for each hand landmark
 * @param {CanvasRenderingContext2D} ctx - Canvas context for drawing
 * @param {Array} landmarks - 21 normalized landmarks from MediaPipe
 * @param {number} canvasWidth - Width of canvas in pixels
 * @param {number} canvasHeight - Height of canvas in pixels
 */
export function drawHandLandmarks(ctx, landmarks, canvasWidth, canvasHeight) {
    // Draw a colored dot for each landmark
    landmarks.forEach((landmark, index) => {
        // Get color for this landmark, default to red if not found
        ctx.fillStyle = LANDMARK_COLORS[index] || '#FF0000';
        
        // Draw filled circle
        ctx.beginPath();
        ctx.arc(
            landmark.x * canvasWidth,   // Convert normalized x to pixels
            landmark.y * canvasHeight,  // Convert normalized y to pixels
            5,                          // Radius in pixels
            0,                          // Start angle
            2 * Math.PI                 // End angle (full circle)
        );
        ctx.fill();
        
        // Add white border to make dots more visible against any background
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

/**
 * Calculate bounding box that encompasses all hand landmarks
 * @param {Array} landmarks - 21 normalized landmarks from MediaPipe
 * @param {number} canvasWidth - Width of canvas in pixels
 * @param {number} canvasHeight - Height of canvas in pixels
 * @returns {Object} Bounding box with x, y, width, height in pixels
 */
export function getBoundingBox(landmarks, canvasWidth, canvasHeight) {
    // Initialize min/max values
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    
    // Find the extremes of all landmarks
    landmarks.forEach(landmark => {
        minX = Math.min(minX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxX = Math.max(maxX, landmark.x);
        maxY = Math.max(maxY, landmark.y);
    });
    
    // Add padding around the hand (10% on each side)
    const padding = 0.1;
    minX = Math.max(0, minX - padding);     // Don't go below 0
    minY = Math.max(0, minY - padding);     // Don't go below 0
    maxX = Math.min(1, maxX + padding);     // Don't exceed 1
    maxY = Math.min(1, maxY + padding);     // Don't exceed 1
    
    // Convert normalized coordinates to pixels
    return {
        x: minX * canvasWidth,
        y: minY * canvasHeight,
        width: (maxX - minX) * canvasWidth,
        height: (maxY - minY) * canvasHeight
    };
}

/**
 * Draw bounding box around hand with gesture label
 * @param {CanvasRenderingContext2D} ctx - Canvas context for drawing
 * @param {Object} box - Bounding box with x, y, width, height
 * @param {string} gesture - Name of detected gesture to display
 */
export function drawBoundingBox(ctx, box, gesture) {
    // Draw white border around hand
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;  // Thin border as requested by user
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Draw white label background above box
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(
        box.x,              // Align with box left edge
        box.y - 30,         // Position above box
        box.width,          // Match box width
        30                  // Label height
    );
    
    // Draw black text on white background
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(
        gesture,            // Gesture name
        box.x + 10,         // 10px padding from left
        box.y - 8           // Vertically centered in label
    );
}