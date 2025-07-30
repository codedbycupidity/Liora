// Main application entry point for ASL Gesture Recognition
// This file coordinates all modules and manages the application lifecycle

// Import all necessary modules
import { GESTURES } from './modules/gestures.js';
import { drawHandConnections, drawHandLandmarks, getBoundingBox, drawBoundingBox } from './modules/visualization.js';
import { TrainingManager } from './modules/training.js';
import { UIManager } from './modules/ui.js';
import { CameraManager } from './modules/camera.js';
import { MotionTracker } from './modules/motion.js';

/**
 * Main application class that coordinates all components
 * Handles initialization, camera management, and gesture detection
 */
class ASLGestureApp {
    constructor() {
        // Get DOM elements for video and canvas
        this.videoElement = document.getElementById('webcam');
        this.canvasElement = document.getElementById('output');
        
        // Initialize all manager instances
        this.ui = new UIManager();           // Handles all UI interactions
        this.training = new TrainingManager(); // Manages training data and ML features
        this.camera = new CameraManager(this.videoElement, this.canvasElement); // Handles MediaPipe
        this.motion = new MotionTracker();   // Handles motion-based gesture detection
        
        // Store current hand landmarks for gesture detection
        this.currentLandmarks = null;
        
        // Gesture display timing
        this.lastGesture = GESTURES.NONE;
        this.gestureStartTime = 0;
        this.minDisplayTime = {
            [GESTURES.YES]: 1000,  // 1 second minimum for Yes
            default: 0  // No minimum for other gestures
        };
        
        // Connect UI events to app methods
        this.setupEventHandlers();
    }

    /**
     * Initialize the application
     * Sets up camera, loads training data, and prepares UI
     */
    async initialize() {
        // Initialize MediaPipe camera and hand tracking
        await this.camera.initialize();
        
        // Set up callback for when MediaPipe detects hands
        this.camera.onResults(this.handleResults.bind(this));
        
        // Initialize UI event listeners
        this.ui.setupEventListeners();
        
        // Check if any training data was loaded from localStorage or server
        const totalSamples = Object.values(this.training.trainingData)
            .reduce((sum, samples) => sum + samples.length, 0);
        
        // Display message if training data exists
        if (totalSamples > 0) {
            console.log(`Loaded ${totalSamples} training samples from previous sessions`);
            this.ui.updateStatus(`Ready - Loaded ${totalSamples} training samples`);
            
            // Reset status message after 3 seconds
            setTimeout(() => {
                this.ui.updateStatus('Click "Start Camera" to begin');
            }, 3000);
        }
    }

    /**
     * Set up event handlers for UI interactions
     * Connects UI events to appropriate handler methods
     */
    setupEventHandlers() {
        // Camera start button clicked
        this.ui.on('onStartCamera', () => this.startCamera());
        
        // Mode switch between detect and train
        this.ui.on('onModeChange', (mode) => this.handleModeChange(mode));
        
        // Gesture selected in training mode
        this.ui.on('onGestureSelect', (gesture) => this.handleGestureSelect(gesture));
        
        // Capture button clicked in training mode
        this.ui.on('onCapture', (gesture) => this.handleCapture(gesture));
        
        // Export buttons clicked
        this.ui.on('onExportGesture', (gesture) => this.handleExportGesture(gesture));
        this.ui.on('onExportAll', () => this.handleExportAll());
    }

    /**
     * Start the camera and begin hand tracking
     * Handles permissions and error states
     */
    async startCamera() {
        // Disable button to prevent multiple clicks
        this.ui.disableStartButton();
        this.ui.updateStatus('Initializing camera...', 'loading');
        
        try {
            // Start camera and MediaPipe tracking
            await this.camera.start();
            this.ui.updateStatus('Camera active - Try any of the supported gestures');
        } catch (error) {
            // Handle camera permission errors
            console.error('Error starting camera:', error);
            this.ui.updateStatus('Error: Could not access camera. Please check permissions.', 'error');
            this.ui.enableStartButton();
        }
    }

    /**
     * Process results from MediaPipe hand tracking
     * Called for each camera frame with hand landmark data
     * @param {Object} results - MediaPipe results containing landmarks and image
     */
    handleResults(results) {
        // Get canvas context for drawing
        const canvas = this.camera.getCanvas();
        const ctx = canvas.ctx;
        
        // Ensure canvas has proper dimensions (fallback for initialization issues)
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.element.width = 640;
            canvas.element.height = 480;
        }
        
        // Save context state before drawing
        ctx.save();
        
        // Clear previous frame and draw current camera image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        
        // Check if hand landmarks were detected
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Get landmarks for first detected hand (we only track one hand)
            const landmarks = results.multiHandLandmarks[0];
            this.currentLandmarks = landmarks;
            
            // Add current frame to motion tracker with face landmarks if available
            this.motion.addFrame(landmarks, results.faceLandmarks);
            
            // Draw hand skeleton with colored connections and joints
            drawHandConnections(ctx, landmarks, canvas.width, canvas.height);
            drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
            
            // Calculate bounding box around the hand
            const boundingBox = getBoundingBox(landmarks, canvas.width, canvas.height);
            
            // Handle differently based on current mode
            if (this.ui.getMode() === 'detect') {
                // Detection mode: recognize gesture and show confidence
                const detection = this.training.detectGestureWithConfidence(landmarks);
                
                // Check for motion-based gestures
                let finalGesture = detection.gesture;
                let motionFeedback = null;
                
                // Check for motion-based gestures on open hand
                if (detection.gesture === GESTURES.HELLO) {
                    // First check for Thank You motion (chin to forward/down)
                    const thankYouResult = this.motion.detectThankYouMotion(landmarks, results.faceLandmarks);
                    
                    if (thankYouResult.detected) {
                        // Only show Thank You when motion is completed
                        finalGesture = GESTURES.THANK_YOU;
                        detection.confidence = thankYouResult.confidence;
                    } else if (thankYouResult.phase === 'started') {
                        // While in Thank You motion, show feedback
                        motionFeedback = this.motion.getMotionFeedback('Thank You');
                    } else {
                        // If not doing Thank You, check for Hello wave motion
                        const helloResult = this.motion.detectHelloMotion(landmarks);
                        
                        if (helloResult.detected) {
                            // Only show Hello when wave is completed
                            finalGesture = GESTURES.HELLO;
                            detection.confidence = helloResult.confidence;
                        } else if (helloResult.phase === 'waving') {
                            // While waving, show feedback
                            motionFeedback = this.motion.getMotionFeedback('Hello');
                        }
                        // If not waving or doing Thank You, just keep showing previous gesture
                    }
                }
                
                // If static gesture is Yes (fist), check for knocking motion
                if (detection.gesture === GESTURES.YES) {
                    const motionResult = this.motion.detectYesMotion(landmarks, results.faceLandmarks);
                    if (motionResult.detected) {
                        // Only show Yes when knocking motion is completed
                        finalGesture = GESTURES.YES;
                        detection.confidence = motionResult.confidence;
                    } else if (motionResult.phase === 'tracking') {
                        // While knocking, show feedback but clear gesture
                        finalGesture = GESTURES.NONE;
                        motionFeedback = this.motion.getMotionFeedback('Yes');
                    } else {
                        // Just a static fist, don't show anything
                        finalGesture = GESTURES.NONE;
                    }
                }
                
                // Check if we need to enforce minimum display time
                const now = Date.now();
                const minTime = this.minDisplayTime[this.lastGesture] || this.minDisplayTime.default;
                const timeSinceChange = now - this.gestureStartTime;
                
                // If no gesture detected, keep showing the last gesture
                if (finalGesture === GESTURES.NONE && this.lastGesture !== GESTURES.NONE) {
                    finalGesture = this.lastGesture;
                } else if (this.lastGesture !== finalGesture && this.lastGesture !== GESTURES.NONE) {
                    // If the gesture is changing and we haven't met minimum display time, keep showing last gesture
                    if (timeSinceChange < minTime) {
                        // Keep showing the previous gesture
                        finalGesture = this.lastGesture;
                    } else {
                        // Enough time has passed, allow the change
                        this.lastGesture = finalGesture;
                        this.gestureStartTime = now;
                    }
                } else if (this.lastGesture !== finalGesture && finalGesture !== GESTURES.NONE) {
                    // First time showing this gesture (not None)
                    this.lastGesture = finalGesture;
                    this.gestureStartTime = now;
                }
                
                drawBoundingBox(ctx, boundingBox, finalGesture);
                this.ui.updateGestureResult(finalGesture, detection.confidence, motionFeedback);
            } else {
                // Training mode: show selected gesture for capture
                drawBoundingBox(ctx, boundingBox, 'Training Mode');
                const selectedGesture = this.ui.getSelectedGesture();
                if (selectedGesture) {
                    this.ui.updateGestureResult(`Training: ${selectedGesture}`);
                }
            }
        } else {
            // No hand detected - keep showing last gesture but reset motion tracker
            this.currentLandmarks = null;
            this.motion.reset();
            // Keep showing the last gesture if there was one
            if (this.lastGesture && this.lastGesture !== GESTURES.NONE) {
                this.ui.updateGestureResult(this.lastGesture);
            }
        }
        
        // Restore canvas context state
        ctx.restore();
    }

    /**
     * Handle mode change between detect and training
     * @param {string} mode - Either 'detect' or 'train'
     */
    handleModeChange(mode) {
        // Mode change is handled by UI manager
        // This method exists for potential future mode-specific logic
    }

    /**
     * Handle gesture selection in training mode
     * Updates UI to show current sample count
     * @param {string} gesture - Selected gesture name
     */
    handleGestureSelect(gesture) {
        // Get existing sample count for this gesture
        const count = this.training.getSampleCount(gesture);
        
        // Update UI with appropriate message
        if (count > 0) {
            this.ui.updateTrainingInfo(`${count} samples captured for "${gesture}"`);
        } else {
            this.ui.updateTrainingInfo(`0 samples captured for "${gesture}". Make the gesture and click Capture!`);
        }
    }

    /**
     * Capture current hand position as training sample
     * @param {string} gesture - Gesture to train
     */
    handleCapture(gesture) {
        // Only capture if hand is currently detected
        if (this.currentLandmarks) {
            // Save sample and get updated count
            const count = this.training.captureTrainingSample(gesture, this.currentLandmarks);
            
            // Show capture feedback in UI
            this.ui.showTrainingCapture(gesture, count);
        }
    }

    /**
     * Export training data for a specific gesture
     * @param {string} gesture - Gesture to export
     */
    async handleExportGesture(gesture) {
        // Download gesture data as JSON file
        const success = await this.training.downloadTrainingData(gesture);
        
        if (success) {
            // Show success message
            this.ui.updateTrainingInfo(`Exported ${gesture} training data!`);
            
            // Return to showing sample count after 2 seconds
            setTimeout(() => this.handleGestureSelect(gesture), 2000);
        }
    }

    /**
     * Export all training data for all gestures
     */
    async handleExportAll() {
        // Download all training data as JSON file
        const success = await this.training.downloadTrainingData();
        
        if (success) {
            this.ui.updateTrainingInfo('Exported all training data!');
        }
    }
}

// Initialize app when DOM is loaded
// Ensures all HTML elements exist before starting
document.addEventListener('DOMContentLoaded', async () => {
    // Create and initialize the main app instance
    const app = new ASLGestureApp();
    await app.initialize();
    
    // Set up Electron menu handlers if running in Electron
    if (window.electronAPI && window.electronAPI.isElectron) {
        // Handle export from menu
        window.electronAPI.onMenuExportData(() => {
            app.handleExportAll();
        });
        
        // Handle import from menu
        window.electronAPI.onMenuImportData(async (filePath) => {
            try {
                // In a real implementation, we'd read the file using fs
                // For now, we'll use fetch to read the local file
                const response = await fetch(`file://${filePath}`);
                const jsonData = await response.text();
                
                if (app.training.importTrainingData(jsonData)) {
                    app.ui.updateTrainingInfo('Training data imported successfully!');
                    
                    // Refresh the UI if in training mode
                    const selectedGesture = app.ui.getSelectedGesture();
                    if (selectedGesture) {
                        app.handleGestureSelect(selectedGesture);
                    }
                } else {
                    app.ui.updateTrainingInfo('Failed to import training data');
                }
            } catch (error) {
                console.error('Error importing training data:', error);
                app.ui.updateTrainingInfo('Error importing training data');
            }
        });
    }
});