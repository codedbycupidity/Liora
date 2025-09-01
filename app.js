// Main application entry point for ASL Gesture Recognition
// This file coordinates all modules and manages the application lifecycle

// Import all necessary modules
import { GESTURES } from './modules/gestures.js';
import { drawHandConnections, drawHandLandmarks, getBoundingBox, drawBoundingBox } from './modules/visualization.js';
import { TrainingManager } from './modules/training.js';
import { UIManager } from './modules/ui.js';
import { CameraManager } from './modules/camera.js';
import { MotionTracker } from './modules/motion.js';
import { GestureRecognition } from './modules/gesture-recognition.js?v=9';

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
        
        // Initialize TensorFlow.js gesture recognition
        try {
            this.gestureRecognition = new GestureRecognition();
        } catch (error) {
            console.warn('TensorFlow.js not available:', error.message);
            this.gestureRecognition = null;
        }
        
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
        try {
            console.log('Starting app initialization...');
            
            // Initialize MediaPipe camera and hand tracking
            console.log('Initializing camera...');
            await this.camera.initialize();
            console.log('Camera initialized successfully');
            
            // Set up callback for when MediaPipe detects hands
            this.camera.onResults(this.handleResults.bind(this));
            
            // Initialize UI event listeners
            this.ui.setupEventListeners();
            
            // Check if any training data was loaded from localStorage or server
            const totalSamples = Object.values(this.training.trainingData)
                .reduce((sum, samples) => sum + samples.length, 0);
            
            // Load training data from S3 into TensorFlow.js
            if (this.gestureRecognition && this.training.s3Storage.isConfigured) {
                try {
                    this.ui.updateStatus('Loading training data from S3...', 'loading');
                    const s3Result = await this.gestureRecognition.loadTrainingDataFromS3(this.training.s3Storage);
                    
                    if (s3Result.success && s3Result.totalSamples > 0) {
                        // Update training data summary in UI
                        const stats = this.gestureRecognition.getTrainingStats();
                        this.ui.updateTrainingDataSummary(stats);
                        
                        if (s3Result.modelsTrained) {
                            this.ui.updateStatus(`Loaded ${s3Result.totalSamples} samples from S3 and trained models - Ready to detect!`);
                            console.log(`Loaded ${s3Result.totalSamples} samples from S3 and automatically trained models`);
                        } else {
                            this.ui.updateStatus(`Loaded ${s3Result.totalSamples} samples from S3`);
                        }
                    }
                } catch (error) {
                    console.warn('Failed to load S3 training data:', error);
                    this.ui.updateStatus('Ready');
                }
            }
            
            // Display message if training data exists
            if (totalSamples > 0) {
                console.log(`Loaded ${totalSamples} training samples from previous sessions`);
                this.ui.updateStatus(`Ready - Loaded ${totalSamples} training samples`);
            }
            
            // Automatically start the camera
            console.log('Starting camera...');
            await this.startCamera();
            console.log('Camera started successfully');
            
        } catch (error) {
            console.error('Error during app initialization:', error);
            this.ui.updateStatus('Error initializing app: ' + error.message, 'error');
        }
    }

    /**
     * Set up event handlers for UI interactions
     * Connects UI events to appropriate handler methods
     */
    setupEventHandlers() {
        // Mode switch between detect and train
        this.ui.on('onModeChange', (mode) => this.handleModeChange(mode));
        
        // Gesture selected in training mode
        this.ui.on('onGestureSelect', (gesture) => this.handleGestureSelect(gesture));
        
        // Capture button clicked in training mode (static gestures)
        this.ui.on('onCapture', (gesture) => this.handleCapture(gesture));
        
        // Recording controls for motion gestures
        this.ui.on('onStartRecording', (gesture) => this.handleStartRecording(gesture));
        this.ui.on('onStopRecording', (gesture) => this.handleStopRecording(gesture));
        
        // Export buttons clicked
        this.ui.on('onExportGesture', (gesture) => this.handleExportGesture(gesture));
        this.ui.on('onExportAll', () => this.handleExportAll());
        
        // S3 buttons clicked
        this.ui.on('onS3Config', () => this.handleS3Config());
        this.ui.on('onExportS3', () => this.handleExportS3());
        this.ui.on('onLoadS3', () => this.handleLoadS3());
        
        // Clear samples button
        this.ui.on('onClearSamples', () => this.handleClearSamples());
        
        // Restart camera button
        this.ui.on('onRestartCamera', () => this.handleRestartCamera());
    }

    /**
     * Start the camera and begin hand tracking
     * Handles permissions and error states
     */
    async startCamera() {
        this.ui.updateStatus('Initializing camera...', 'loading');
        
        try {
            // Start camera and MediaPipe tracking
            await this.camera.start();
            this.ui.updateStatus('Camera active - Try any of the supported gestures');
        } catch (error) {
            // Handle camera permission errors
            console.error('Error starting camera:', error);
            this.ui.updateStatus('Error: Could not access camera. Please check permissions.', 'error');
        }
    }

    /**
     * Process results from MediaPipe hand tracking
     * Called for each camera frame with hand landmark data
     * @param {Object} results - MediaPipe results containing landmarks and image
     */
    async handleResults(results) {
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
            
            // Update debug display with current landmarks
            this.ui.updateLandmarkValues(landmarks);
            this.ui.updateLandmarkPreview(landmarks);
            
            // Add current frame to motion tracker with face landmarks if available
            this.motion.addFrame(landmarks, results.faceLandmarks);
            
            // Draw hand skeleton with colored connections and joints
            drawHandConnections(ctx, landmarks, canvas.width, canvas.height);
            drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
            
            // Calculate bounding box around the hand
            const boundingBox = getBoundingBox(landmarks, canvas.width, canvas.height);
            
            // Update gesture recognition with current landmarks if available
            if (this.gestureRecognition) {
                this.gestureRecognition.setLastLandmarks(landmarks);
            }
            
            // Handle differently based on current mode
            if (this.ui.getMode() === 'detect') {
                let detection;
                
                // Try TensorFlow.js detection if available
                if (this.gestureRecognition) {
                    try {
                        const tfDetection = await this.gestureRecognition.processLandmarks(
                            landmarks, 'detect'
                        );
                        
                        // Update model prediction display with TensorFlow.js result
                        this.ui.updateModelPrediction(tfDetection.gesture, tfDetection.confidence);
                        
                        // Use TensorFlow.js result if it has a valid gesture, otherwise fallback
                        detection = tfDetection.gesture && tfDetection.gesture !== 'None' ? 
                            tfDetection : this.training.detectGestureWithConfidence(landmarks);
                    } catch (error) {
                        console.warn('TensorFlow.js detection failed, using fallback:', error);
                        detection = this.training.detectGestureWithConfidence(landmarks);
                        
                        // Update model prediction display with fallback result
                        this.ui.updateModelPrediction(detection.gesture, detection.confidence);
                    }
                } else {
                    // Use original detection system
                    detection = this.training.detectGestureWithConfidence(landmarks);
                    
                    // Update model prediction display with legacy detection
                    this.ui.updateModelPrediction(detection.gesture, detection.confidence);
                }
                
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
                
                // Track confidence for metrics visualization
                this.ui.trackConfidence(finalGesture, detection.confidence);
            } else {
                // Training mode: show selected gesture for capture
                drawBoundingBox(ctx, boundingBox, 'Training Mode');
                const selectedGesture = this.ui.getSelectedGesture();
                if (selectedGesture) {
                    this.ui.updateGestureResult(`Training: ${selectedGesture}`);
                    
                    // Process landmarks in training mode for visual feedback
                    if (this.gestureRecognition) {
                        try {
                            const trainingResult = await this.gestureRecognition.processLandmarks(
                                landmarks, 'train', selectedGesture
                            );
                            
                            // Update model prediction display even in training mode
                            if (trainingResult.gesture && trainingResult.confidence !== undefined) {
                                this.ui.updateModelPrediction(trainingResult.gesture, trainingResult.confidence);
                            }
                            
                            // Update training progress if recording motion
                            if (trainingResult.type === 'motion' && trainingResult.frameCount) {
                                const progress = `Recording: ${trainingResult.frameCount} frames`;
                                this.ui.updateTrainingInfo(progress);
                            }
                        } catch (error) {
                            console.warn('Training mode processing error:', error);
                        }
                    }
                }
            }
        } else {
            // No hand detected - keep showing last gesture but reset motion tracker
            this.currentLandmarks = null;
            this.motion.reset();
            
            // Clear debug displays
            this.ui.clearDebugDisplays();
            
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
    async handleModeChange(mode) {
        // If switching to detect mode and we have TensorFlow.js with training data
        if (mode === 'detect' && this.gestureRecognition) {
            const stats = this.gestureRecognition.getTrainingStats();
            const hasTrainingData = stats.total > 0;
            
            if (hasTrainingData) {
                try {
                    this.ui.updateStatus('Training models for detection...', 'loading');
                    console.log('Automatically training models when switching to detect mode');
                    
                    // Update training data summary
                    this.ui.updateTrainingDataSummary(stats);
                    
                    // Create progress callback for training visualization
                    const onProgress = (progress) => {
                        this.ui.updateTrainingProgress(
                            progress.epoch, 
                            progress.totalEpochs, 
                            progress.loss, 
                            progress.accuracy
                        );
                        
                        // Update before/after comparison
                        if (progress.epoch === 1) {
                            this.ui.updateAccuracyComparison(progress.baselineAccuracy, null);
                        }
                        if (progress.epoch === progress.totalEpochs) {
                            this.ui.updateAccuracyComparison(progress.baselineAccuracy, progress.accuracy);
                        }
                    };
                    
                    const result = await this.gestureRecognition.trainModels(onProgress);
                    
                    if (result.success) {
                        this.ui.updateStatus(`Models trained successfully - Ready to detect gestures!`);
                        console.log('Models automatically trained for detection mode');
                    } else {
                        this.ui.updateStatus(`Training failed: ${result.error}`, 'error');
                        console.warn('Automatic training failed:', result.error);
                    }
                } catch (error) {
                    console.error('Automatic training error:', error);
                    this.ui.updateStatus('Training error - detection may be less accurate', 'error');
                }
            } else {
                this.ui.updateStatus('Ready to detect gestures (no training data available)');
            }
        } else if (mode === 'train') {
            this.ui.updateStatus('Training mode - select a gesture to start capturing samples');
        }
    }

    /**
     * Handle gesture selection in training mode
     * Updates UI to show current sample count
     * @param {string} gesture - Selected gesture name
     */
    handleGestureSelect(gesture) {
        // Get sample counts from both systems
        const legacyCount = this.training.getSampleCount(gesture);
        let tfCount = 0;
        let isMotion = false;
        
        if (this.gestureRecognition) {
            try {
                const tfStats = this.gestureRecognition.getTrainingStats();
                isMotion = this.gestureRecognition.isMotionGesture(gesture);
                tfCount = isMotion ? (tfStats.motion[gesture] || 0) : (tfStats.static[gesture] || 0);
                
                // Update training data summary in metrics panel
                this.ui.updateTrainingDataSummary(tfStats);
            } catch (error) {
                console.warn('Failed to get TensorFlow.js training stats:', error);
                const motionGestures = ['Hello', 'Yes', 'Thank You'];
                isMotion = motionGestures.includes(gesture);
            }
        } else {
            const motionGestures = ['Hello', 'Yes', 'Thank You'];
            isMotion = motionGestures.includes(gesture);
        }
        
        const totalCount = Math.max(legacyCount, tfCount);
        
        // Update UI based on gesture type and sample count
        if (totalCount > 0) {
            const type = isMotion ? 'motion' : 'static';
            this.ui.updateTrainingInfo(`${totalCount} ${type} samples captured for "${gesture}"`);
        } else if (isMotion) {
            const instructions = {
                'Hello': 'Wave your hand side to side',
                'Yes': 'Make a fist and knock up and down',
                'Thank You': 'Place open hand at chin and move forward/down'
            };
            this.ui.updateTrainingInfo(`0 samples for "${gesture}". ${instructions[gesture]} - use Start/Stop Recording!`);
        } else {
            this.ui.updateTrainingInfo(`0 samples captured for "${gesture}". Hold the pose and click Capture Sample!`);
        }
    }

    /**
     * Capture current hand position as training sample
     * @param {string} gesture - Gesture to train
     */
    async handleCapture(gesture) {
        // Only capture if hand is currently detected
        if (this.currentLandmarks) {
            let count = 0;
            
            // Try TensorFlow.js capture if available
            if (this.gestureRecognition) {
                try {
                    const result = this.gestureRecognition.captureTrainingSample(gesture);
                    if (result.success) {
                        count = result.count;
                    }
                } catch (error) {
                    console.warn('TensorFlow.js capture failed:', error);
                }
            }
            
            // Also save to legacy system for backward compatibility
            const legacyCount = this.training.captureTrainingSample(gesture, this.currentLandmarks);
            
            // Use the higher count
            const finalCount = Math.max(count, legacyCount);
            
            // Show capture feedback in UI
            this.ui.showTrainingCapture(gesture, finalCount);
            
            // Update training data summary
            if (this.gestureRecognition) {
                const stats = this.gestureRecognition.getTrainingStats();
                this.ui.updateTrainingDataSummary(stats);
            }
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
    
    /**
     * Start recording for motion gestures
     * @param {string} gesture - Motion gesture name
     */
    handleStartRecording(gesture) {
        console.log(`Starting recording for ${gesture}`);
        
        if (this.gestureRecognition) {
            try {
                this.gestureRecognition.startMotionRecording();
            } catch (error) {
                console.warn('TensorFlow.js recording start failed:', error);
            }
        }
    }

    /**
     * Stop recording for motion gestures and save the sample
     * @param {string} gesture - Motion gesture name
     */
    async handleStopRecording(gesture) {
        console.log(`Stopping recording for ${gesture}`);
        
        if (this.gestureRecognition && this.currentLandmarks) {
            try {
                const recordingResult = this.gestureRecognition.stopMotionRecording();
                
                if (recordingResult.hasEnoughFrames) {
                    const result = this.gestureRecognition.captureTrainingSample(gesture);
                    
                    if (result.success) {
                        const duration = (recordingResult.duration / 1000).toFixed(1);
                        this.ui.showRecordingCapture(gesture, result.count, duration);
                        
                        // Also save to legacy system
                        this.training.captureTrainingSample(gesture, this.currentLandmarks);
                    } else {
                        this.ui.updateTrainingInfo(`Recording failed: ${result.error}`);
                    }
                } else {
                    this.ui.updateTrainingInfo(`Recording too short! Need at least ${this.gestureRecognition.minMotionFrames} frames, got ${recordingResult.frameCount}.`);
                }
            } catch (error) {
                console.warn('TensorFlow.js recording stop failed:', error);
                // Fallback to simple capture
                if (this.currentLandmarks) {
                    const count = this.training.captureTrainingSample(gesture, this.currentLandmarks);
                    this.ui.updateTrainingInfo(`Saved sample for ${gesture}! (${count} total)`);
                }
            }
        } else {
            // Fallback if no TensorFlow.js or no landmarks
            if (this.currentLandmarks) {
                const count = this.training.captureTrainingSample(gesture, this.currentLandmarks);
                this.ui.updateTrainingInfo(`Saved sample for ${gesture}! (${count} total)`);
            }
        }
    }

    /**
     * Train TensorFlow.js models with collected data
     */
    /**
     * Handle clear samples button click
     * Clears all training data from local storage and TensorFlow.js
     */
    async handleClearSamples() {
        const confirmed = confirm('Are you sure you want to clear all training samples? This action cannot be undone.');
        
        if (!confirmed) {
            return;
        }
        
        try {
            // Clear legacy training data
            this.training.clearTrainingData();
            
            // Clear TensorFlow.js training data
            if (this.gestureRecognition) {
                this.gestureRecognition.clearAllTrainingData();
            }
            
            // Update UI to reflect cleared data
            this.ui.updateStatus('All training samples cleared successfully');
            
            // Update training data summary to show no data
            if (this.gestureRecognition) {
                const stats = this.gestureRecognition.getTrainingStats();
                this.ui.updateTrainingDataSummary(stats);
            }
            
            // Refresh the training UI if we're in training mode and have a selected gesture
            if (this.ui.getMode() === 'train') {
                const selectedGesture = this.ui.getSelectedGesture();
                if (selectedGesture) {
                    // Refresh the gesture selection to show updated (zero) counts
                    setTimeout(() => {
                        this.handleGestureSelect(selectedGesture);
                    }, 100);
                }
            }
            
            // Close the hamburger menu
            this.ui.closeMenu();
            
        } catch (error) {
            console.error('Error clearing samples:', error);
            this.ui.updateStatus('Error clearing samples: ' + error.message, 'error');
        }
    }

    /**
     * Handle load from S3 button click
     * Downloads training data from S3 and loads it into TensorFlow.js
     */
    async handleLoadS3() {
        if (!this.training.s3Storage.isConfigured) {
            alert('S3 not configured. Click "S3 Status" to see configuration instructions.');
            return;
        }

        if (!this.gestureRecognition) {
            alert('TensorFlow.js not available - cannot load training data.');
            return;
        }

        try {
            this.ui.updateStatus('Loading training data from S3...', 'loading');
            
            // Create progress callback that updates the UI
            const onProgress = (progress) => {
                this.ui.updateTrainingProgress(
                    progress.epoch, 
                    progress.totalEpochs, 
                    progress.loss, 
                    progress.accuracy
                );
                
                // Update before/after comparison
                if (progress.epoch === 1) {
                    this.ui.updateAccuracyComparison(progress.baselineAccuracy, null);
                }
                if (progress.epoch === progress.totalEpochs) {
                    this.ui.updateAccuracyComparison(progress.baselineAccuracy, progress.accuracy);
                }
            };
            
            const result = await this.gestureRecognition.loadTrainingDataFromS3(this.training.s3Storage, onProgress);
            
            if (result.success) {
                // Update training data summary
                const stats = this.gestureRecognition.getTrainingStats();
                this.ui.updateTrainingDataSummary(stats);
                
                if (result.totalSamples > 0) {
                    if (result.modelsTrained) {
                        this.ui.updateStatus(`Loaded ${result.totalSamples} samples from S3 and trained models - Ready to detect!`);
                    } else {
                        this.ui.updateStatus(`Loaded ${result.totalSamples} samples from S3 across ${result.gestureCount} gestures`);
                    }
                    
                    // Refresh the training UI if we're in training mode and have a selected gesture
                    if (this.ui.getMode() === 'train') {
                        const selectedGesture = this.ui.getSelectedGesture();
                        if (selectedGesture) {
                            // Refresh the gesture selection to show updated counts
                            setTimeout(() => {
                                this.handleGestureSelect(selectedGesture);
                            }, 500);
                        }
                    }
                } else {
                    this.ui.updateStatus('No training data found in S3');
                }
                
                // Close the hamburger menu after successful load
                this.ui.closeMenu();
            } else {
                this.ui.updateStatus(`S3 load failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('S3 load error:', error);
            this.ui.updateStatus('S3 load error occurred', 'error');
        }
    }

    /**
     * Restart the camera system
     */
    async handleRestartCamera() {
        this.ui.updateStatus('Restarting camera...', 'loading');
        
        try {
            // Stop current camera if running
            if (this.camera) {
                this.camera.stop();
            }
            
            // Reset motion tracker
            this.motion.reset();
            
            // Clear any current landmarks
            this.currentLandmarks = null;
            
            // Wait a moment for cleanup
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Reinitialize and start camera
            await this.camera.initialize();
            this.camera.onResults(this.handleResults.bind(this));
            await this.camera.start();
            
            this.ui.updateStatus('Camera restarted successfully');
            
        } catch (error) {
            console.error('Camera restart failed:', error);
            this.ui.updateStatus('Failed to restart camera: ' + error.message, 'error');
        }
    }

    /**
     * Handle S3 configuration button click
     * Shows S3 status and allows configuration
     */
    async handleS3Config() {
        try {
            const s3Storage = this.training.s3Storage;
            
            if (s3Storage.isConfigured) {
                // Show current S3 configuration status
                const stats = await s3Storage.getTrainingStats();
                if (stats.success) {
                    alert(`S3 Connected!\nBucket: ${s3Storage.bucket}\nRegion: ${s3Storage.region}\nFiles: ${stats.stats.totalFiles}`);
                } else {
                    alert(`S3 Configured but unable to access:\nBucket: ${s3Storage.bucket}\nError: ${stats.error}`);
                }
            } else {
                // Show configuration instructions
                alert('S3 Not Configured\n\nAdd these environment variables to your .env file:\nAWS_ACCESS_KEY_ID=your_access_key\nAWS_SECRET_ACCESS_KEY=your_secret_key\nS3_BUCKET=your_bucket_name\nAWS_REGION=us-east-1\n\nThen restart the app.');
            }
        } catch (error) {
            console.error('Error checking S3 config:', error);
            alert('Error checking S3 configuration: ' + error.message);
        }
    }

    /**
     * Handle export to S3 button click
     * Exports all training data to S3
     */
    async handleExportS3() {
        if (!this.training.s3Storage.isConfigured) {
            alert('S3 not configured. Click "S3 Status" to see configuration instructions.');
            return;
        }

        try {
            this.ui.updateStatus('Exporting to S3...', 'loading');
            
            const result = await this.training.exportAllToS3();
            
            if (result.success) {
                this.ui.updateStatus(`Exported ${result.uploaded}/${result.total} samples to S3 successfully - Local data cleared`);
                
                // Also clear TensorFlow.js training data
                if (this.gestureRecognition) {
                    this.gestureRecognition.clearAllTrainingData();
                }
                
                // Refresh the training UI if we're in training mode and have a selected gesture
                if (this.ui.getMode() === 'train') {
                    const selectedGesture = this.ui.getSelectedGesture();
                    if (selectedGesture) {
                        // Refresh the gesture selection to show updated (zero) counts
                        setTimeout(() => {
                            this.handleGestureSelect(selectedGesture);
                        }, 500); // Small delay to ensure data clearing is complete
                    }
                }
                
                // Close the hamburger menu after successful export
                this.ui.closeMenu();
            } else {
                this.ui.updateStatus(`S3 export failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error exporting to S3:', error);
            this.ui.updateStatus('Error exporting to S3: ' + error.message, 'error');
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