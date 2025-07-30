/**
 * Motion tracking module for gesture movement detection
 * Tracks hand positions over time to detect motion patterns
 */

export class MotionTracker {
    constructor() {
        // Store recent hand positions
        this.positionHistory = [];
        this.maxHistory = 30; // About 1 second at 30fps
        
        // Motion detection thresholds
        this.thresholds = {
            vertical: 0.05,      // Minimum vertical movement (lowered)
            horizontal: 0.05,    // Minimum horizontal movement (lowered)
            stillness: 0.03,     // Maximum movement to be considered "still" (increased)
            minFrames: 5         // Minimum frames needed for motion detection (lowered)
        };
        
        // Gesture-specific state
        this.gestureStates = {
            thankYou: {
                startPosition: null,
                phase: 'waiting', // waiting, started, completed, holding
                startTime: 0,
                completedTime: 0  // Track when gesture was completed
            },
            yes: {
                direction: null,  // up or down
                bounces: 0,       // Number of direction changes
                lastPeakTime: 0,
                phase: 'waiting'
            }
        };
    }
    
    /**
     * Add a new frame of hand landmarks
     * @param {Array} landmarks - 21 hand landmarks from MediaPipe
     * @param {Object} faceLandmarks - Optional face landmarks for accurate chin position
     */
    addFrame(landmarks, faceLandmarks = null) {
        const now = Date.now();
        
        // Extract key positions
        const frame = {
            timestamp: now,
            wrist: { ...landmarks[0] },
            palmBase: { ...landmarks[9] },
            indexTip: { ...landmarks[8] },
            // Calculate palm center for more stable tracking
            palmCenter: {
                x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
                y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3,
                z: (landmarks[0].z + landmarks[5].z + landmarks[17].z) / 3
            }
        };
        
        // Add chin position if face landmarks available
        if (faceLandmarks) {
            // Landmark 152 is the chin tip in MediaPipe face mesh
            frame.chinPosition = { ...faceLandmarks[152] };
        }
        
        this.positionHistory.push(frame);
        
        // Keep only recent history
        while (this.positionHistory.length > this.maxHistory) {
            this.positionHistory.shift();
        }
    }
    
    /**
     * Get recent motion characteristics
     * @returns {Object} Motion data including direction and magnitude
     */
    getRecentMotion() {
        if (this.positionHistory.length < this.thresholds.minFrames) {
            return { type: 'insufficient_data', magnitude: 0 };
        }
        
        // Compare positions from different time windows
        const recent = this.positionHistory.slice(-this.thresholds.minFrames);
        const older = this.positionHistory.slice(-this.thresholds.minFrames * 2, -this.thresholds.minFrames);
        
        if (older.length === 0) {
            return { type: 'insufficient_data', magnitude: 0 };
        }
        
        // Calculate average positions
        const recentAvg = this.averagePosition(recent);
        const olderAvg = this.averagePosition(older);
        
        // Calculate movement
        const deltaX = recentAvg.palmCenter.x - olderAvg.palmCenter.x;
        const deltaY = recentAvg.palmCenter.y - olderAvg.palmCenter.y;
        const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Determine motion type
        let type = 'still';
        if (magnitude > this.thresholds.stillness) {
            // For "Thank You", forward motion often appears as downward + slight right/left
            if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX) * 0.5) {
                type = 'down';
            } else if (deltaY > 0) {
                type = 'diagonal';  // Any downward motion counts
            } else if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
                type = deltaY > 0 ? 'down' : 'up';
            } else if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                type = deltaX > 0 ? 'right' : 'left';
            } else {
                type = 'diagonal';
            }
        }
        
        return {
            type,
            magnitude,
            deltaX,
            deltaY
        };
    }
    
    /**
     * Calculate average position from frames
     */
    averagePosition(frames) {
        const sum = frames.reduce((acc, frame) => {
            acc.palmCenter.x += frame.palmCenter.x;
            acc.palmCenter.y += frame.palmCenter.y;
            acc.wrist.x += frame.wrist.x;
            acc.wrist.y += frame.wrist.y;
            return acc;
        }, {
            palmCenter: { x: 0, y: 0 },
            wrist: { x: 0, y: 0 }
        });
        
        const count = frames.length;
        return {
            palmCenter: {
                x: sum.palmCenter.x / count,
                y: sum.palmCenter.y / count
            },
            wrist: {
                x: sum.wrist.x / count,
                y: sum.wrist.y / count
            }
        };
    }
    
    /**
     * Detect "Thank You" motion
     * Hand starts at chin level and moves forward/down
     * @param {Array} currentLandmarks - Current hand landmarks
     * @param {Object} faceLandmarks - Optional face landmarks for accurate chin detection
     * @returns {Object} Detection result with confidence
     */
    detectThankYouMotion(currentLandmarks, faceLandmarks = null) {
        const motion = this.getRecentMotion();
        const currentPalm = currentLandmarks[9];
        const state = this.gestureStates.thankYou;
        
        // Check if hand is at chin level with proper orientation
        let isAtChinLevel = false;
        let palmFacingChin = false;
        
        if (faceLandmarks && this.positionHistory.length > 0) {
            // Use actual chin position if available
            const latestFrame = this.positionHistory[this.positionHistory.length - 1];
            if (latestFrame.chinPosition) {
                // Check if palm is near chin (within threshold distance)
                const distanceToChin = Math.sqrt(
                    Math.pow(currentPalm.x - latestFrame.chinPosition.x, 2) +
                    Math.pow(currentPalm.y - latestFrame.chinPosition.y, 2)
                );
                
                // Check palm orientation - fingers should be pointing up
                const wrist = currentLandmarks[0];
                const middleTip = currentLandmarks[12];
                const fingerPointingUp = middleTip.y < wrist.y; // Tip above wrist
                
                // Check if palm is facing toward face (using z-coordinate)
                const palmFacingForward = currentPalm.z < wrist.z;
                
                isAtChinLevel = distanceToChin < 0.2 && fingerPointingUp && palmFacingForward;
            }
        }
        // No fallback - if we can't see the face, we can't detect Thank You properly
        
        // State machine for Thank You gesture
        switch (state.phase) {
            case 'waiting':
                // Look for hand at chin/face level
                if (isAtChinLevel) {
                    state.startPosition = { ...currentPalm };
                    state.phase = 'started';
                    state.startTime = Date.now();
                }
                break;
                
            case 'started':
                // Look for forward/downward motion
                if (motion.type === 'down' || motion.type === 'diagonal' || motion.type === 'right') {
                    const timeSinceStart = Date.now() - state.startTime;
                    
                    // Check if motion is significant enough (very low threshold)
                    if (motion.magnitude > 0.03 && timeSinceStart > 200 && timeSinceStart < 3000) {
                        state.phase = 'holding';
                        state.completedTime = Date.now();
                        return {
                            detected: true,
                            confidence: Math.min(motion.magnitude * 5, 1),
                            phase: 'holding'
                        };
                    }
                }
                
                // Reset if hand moves away from chin or too much time passes
                if (!isAtChinLevel || Date.now() - state.startTime > 3000) {
                    state.phase = 'waiting';
                }
                break;
                
            case 'holding':
                // Hold the "Thank You" detection for 2 seconds
                const holdDuration = 2000; // 2 seconds
                const timeSinceCompleted = Date.now() - state.completedTime;
                
                if (timeSinceCompleted < holdDuration) {
                    // Still in hold period
                    return {
                        detected: true,
                        confidence: 1,
                        phase: 'holding',
                        holdProgress: timeSinceCompleted / holdDuration
                    };
                } else {
                    // Hold period over, reset to waiting
                    state.phase = 'waiting';
                    state.startPosition = null;
                    state.startTime = 0;
                    state.completedTime = 0;
                }
                break;
        }
        
        return {
            detected: false,
            confidence: 0,
            phase: state.phase,
            motion: motion.type
        };
    }
    
    /**
     * Detect "Yes" motion (knocking)
     * Fist moves up and down repeatedly
     * @param {Array} currentLandmarks - Current hand landmarks
     * @param {Object} faceLandmarks - Optional face landmarks (not used for Yes)
     * @returns {Object} Detection result with confidence
     */
    detectYesMotion(currentLandmarks, faceLandmarks = null) {
        const motion = this.getRecentMotion();
        const state = this.gestureStates.yes;
        const now = Date.now();
        
        // Detect direction changes (bounces)
        if (motion.type === 'up' || motion.type === 'down') {
            if (state.direction && state.direction !== motion.type) {
                // Direction changed - this is a bounce
                state.bounces++;
                state.lastPeakTime = now;
                
                // Check if we have enough bounces for "Yes"
                if (state.bounces >= 2) {
                    state.phase = 'completed';
                    return {
                        detected: true,
                        confidence: Math.min(0.5 + (state.bounces * 0.25), 1),
                        bounces: state.bounces,
                        phase: 'completed'
                    };
                }
            }
            state.direction = motion.type;
        }
        
        // Reset if no motion for too long
        if (now - state.lastPeakTime > 1500 && state.bounces > 0) {
            state.direction = null;
            state.bounces = 0;
            state.phase = 'waiting';
        }
        
        // Start tracking if we detect first motion
        if (state.phase === 'waiting' && (motion.type === 'up' || motion.type === 'down')) {
            state.phase = 'tracking';
            state.lastPeakTime = now;
        }
        
        return {
            detected: false,
            confidence: 0,
            bounces: state.bounces,
            phase: state.phase,
            motion: motion.type
        };
    }
    
    /**
     * Reset motion tracking states
     */
    reset() {
        this.positionHistory = [];
        this.gestureStates.thankYou = {
            startPosition: null,
            phase: 'waiting',
            startTime: 0,
            completedTime: 0
        };
        this.gestureStates.yes = {
            direction: null,
            bounces: 0,
            lastPeakTime: 0,
            phase: 'waiting'
        };
    }
    
    /**
     * Get visual feedback for current motion state
     * @param {string} gesture - Gesture being tracked
     * @returns {Object} Visual feedback data
     */
    getMotionFeedback(gesture) {
        switch (gesture) {
            case 'Thank You':
                const thankYouState = this.gestureStates.thankYou;
                const motion = this.getRecentMotion();
                let message = '';
                
                // Check if we can see the face
                const hasFaceLandmarks = this.positionHistory.length > 0 && 
                                       this.positionHistory[this.positionHistory.length - 1].chinPosition;
                
                switch (thankYouState.phase) {
                    case 'waiting':
                        if (!hasFaceLandmarks) {
                            message = 'Face not detected - ensure face is visible for Thank You';
                        } else {
                            message = 'For Thank You: place open hand at chin, palm facing you';
                        }
                        break;
                    case 'started':
                        message = `Now move hand forward and down`;
                        break;
                    case 'holding':
                        message = 'Thank You gesture completed!';
                        break;
                }
                
                return {
                    message,
                    progress: thankYouState.phase === 'started' ? 0.3 + (motion.magnitude * 2) : 
                             thankYouState.phase === 'holding' ? 1 : 0,
                    showArrow: thankYouState.phase === 'started'
                };
                
            case 'Yes':
                const yesState = this.gestureStates.yes;
                return {
                    message: yesState.bounces > 0 ? 
                        `Knocking: ${yesState.bounces} bounces` : 
                        'Move fist up and down',
                    progress: Math.min(yesState.bounces / 3, 1),
                    showArrow: true
                };
                
            default:
                return {
                    message: '',
                    progress: 0,
                    showArrow: false
                };
        }
    }
}