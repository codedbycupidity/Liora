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
            vertical: 0.03,      // Minimum vertical movement (more sensitive)
            horizontal: 0.05,    // Minimum horizontal movement
            stillness: 0.02,     // Maximum movement to be considered "still"
            minFrames: 4         // Minimum frames needed for motion detection
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
                phase: 'waiting',
                completedTime: 0
            },
            hello: {
                direction: null,  // left or right
                waves: 0,         // Number of direction changes (side to side)
                lastPeakTime: 0,
                phase: 'waiting', // waiting, waving, holding
                completedTime: 0
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
            // Check vertical motion first (for Yes gesture)
            if (Math.abs(deltaY) > this.thresholds.vertical) {
                if (Math.abs(deltaY) > Math.abs(deltaX) * 0.7) {
                    // Primarily vertical motion
                    type = deltaY > 0 ? 'down' : 'up';
                } else {
                    // Diagonal but with significant vertical component
                    type = 'diagonal';
                }
            } else if (Math.abs(deltaX) > this.thresholds.horizontal) {
                if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                    // Primarily horizontal motion
                    type = deltaX > 0 ? 'right' : 'left';
                } else {
                    type = 'diagonal';
                }
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
                
                isAtChinLevel = distanceToChin < 0.2; // Just check distance to chin
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
                // Hold the "Thank You" detection for 1 second
                const holdDuration = 1000; // 1 second
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
        
        // Handle holding phase first
        if (state.phase === 'holding') {
            const holdDuration = 1000; // 1 second
            const timeSinceCompleted = now - state.completedTime;
            
            if (timeSinceCompleted < holdDuration) {
                return {
                    detected: true,
                    confidence: 1,
                    phase: 'holding',
                    holdProgress: timeSinceCompleted / holdDuration
                };
            } else {
                // Reset after hold
                state.phase = 'waiting';
                state.bounces = 0;
                state.direction = null;
                state.completedTime = 0;
                state.lastPeakTime = 0;
            }
        }
        
        // Reset if no motion for too long (even in tracking phase)
        if (state.phase === 'tracking' && motion.type === 'still') {
            const timeSinceLastMotion = now - state.lastPeakTime;
            if (timeSinceLastMotion > 1000) {
                // Reset if still for more than 1 second
                state.direction = null;
                state.bounces = 0;
                state.phase = 'waiting';
                state.lastPeakTime = 0;
            }
        }
        
        // Detect direction changes (bounces)
        if (motion.type === 'up' || motion.type === 'down') {
            if (state.phase === 'waiting') {
                // Start tracking on first motion
                state.phase = 'tracking';
                state.lastPeakTime = now;
                state.direction = motion.type;
                state.bounces = 0;
            } else if (state.phase === 'tracking') {
                // Update last motion time
                state.lastPeakTime = now;
                
                if (state.direction && state.direction !== motion.type) {
                    // Direction changed - this is a bounce
                    state.bounces++;
                    state.direction = motion.type;
                    
                    // Check if we have enough bounces for "Yes"
                    if (state.bounces >= 2) {
                        state.phase = 'holding';
                        state.completedTime = now;
                        return {
                            detected: true,
                            confidence: Math.min(0.5 + (state.bounces * 0.25), 1),
                            bounces: state.bounces,
                            phase: 'holding'
                        };
                    }
                } else {
                    state.direction = motion.type;
                }
            }
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
            phase: 'waiting',
            completedTime: 0
        };
        this.gestureStates.hello = {
            direction: null,
            waves: 0,
            lastPeakTime: 0,
            phase: 'waiting',
            completedTime: 0
        };
    }
    
    /**
     * Detect "Hello" wave motion
     * Open hand moves side to side (left-right-left or right-left-right)
     * @param {Array} currentLandmarks - Current hand landmarks
     * @returns {Object} Detection result with confidence
     */
    detectHelloMotion(currentLandmarks) {
        const motion = this.getRecentMotion();
        const state = this.gestureStates.hello;
        const now = Date.now();
        
        // Detect horizontal motion (waving)
        if (motion.type === 'left' || motion.type === 'right') {
            if (state.direction && state.direction !== motion.type) {
                // Direction changed - this is a wave
                state.waves++;
                state.lastPeakTime = now;
                
                // Check if we have at least one wave for "Hello"
                if (state.waves >= 1) {
                    state.phase = 'holding';
                    state.completedTime = now;
                    return {
                        detected: true,
                        confidence: Math.min(0.5 + (state.waves * 0.25), 1),
                        waves: state.waves,
                        phase: 'holding'
                    };
                }
            }
            state.direction = motion.type;
            state.phase = 'waving';
        }
        
        // Reset if no motion for too long
        if (now - state.lastPeakTime > 1500 && state.waves > 0) {
            state.direction = null;
            state.waves = 0;
            state.phase = 'waiting';
        }
        
        // Handle holding phase
        if (state.phase === 'holding') {
            const holdDuration = 2000; // 2 seconds
            const timeSinceCompleted = now - state.completedTime;
            
            if (timeSinceCompleted < holdDuration) {
                return {
                    detected: true,
                    confidence: 1,
                    phase: 'holding',
                    holdProgress: timeSinceCompleted / holdDuration
                };
            } else {
                // Reset after hold
                state.phase = 'waiting';
                state.waves = 0;
                state.direction = null;
                state.completedTime = 0;
            }
        }
        
        return {
            detected: false,
            confidence: 0,
            waves: state.waves,
            phase: state.phase,
            motion: motion.type
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
                let yesMessage = '';
                let yesProgress = 0;
                
                switch (yesState.phase) {
                    case 'waiting':
                        yesMessage = 'For Yes: move fist up and down like knocking';
                        break;
                    case 'tracking':
                        yesMessage = `Knocking: ${yesState.bounces} bounce${yesState.bounces !== 1 ? 's' : ''} (need 2)`;
                        yesProgress = yesState.bounces / 2;
                        break;
                    case 'holding':
                        yesMessage = 'Yes gesture completed!';
                        yesProgress = 1;
                        break;
                }
                
                return {
                    message: yesMessage,
                    progress: yesProgress,
                    showArrow: yesState.phase === 'tracking'
                };
                
            case 'Hello':
                const helloState = this.gestureStates.hello;
                switch (helloState.phase) {
                    case 'waiting':
                        return {
                            message: 'For Hello: wave hand side to side',
                            progress: 0,
                            showArrow: false
                        };
                    case 'waving':
                        return {
                            message: `Waving: ${helloState.waves} wave${helloState.waves > 1 ? 's' : ''}`,
                            progress: Math.min(helloState.waves, 1),
                            showArrow: true
                        };
                    case 'holding':
                        return {
                            message: 'Hello gesture completed!',
                            progress: 1,
                            showArrow: false
                        };
                }
                break;
                
            default:
                return {
                    message: '',
                    progress: 0,
                    showArrow: false
                };
        }
    }
}