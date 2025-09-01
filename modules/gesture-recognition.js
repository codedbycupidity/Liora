/**
 * TensorFlow.js gesture recognition integration
 * Connects MediaPipe hand tracking with custom trained models
 */

import { GestureModels } from './gesture-models.js?v=8';

export class GestureRecognition {
    constructor() {
        try {
            this.gestureModels = new GestureModels();
            this.trainingData = { static: {}, motion: {} };
            this.motionBuffer = [];
            this.isRecordingMotion = false;
            this.motionStartTime = null;
            this.maxMotionDuration = 10000; // 10 seconds max
            this.minMotionFrames = 15; // Minimum frames for valid motion (1 second at 15fps)
            
            console.log('GestureRecognition initialized with TensorFlow.js');
            
            // Load existing models if available
            this.initializeModels();
        } catch (error) {
            console.error('Error initializing GestureRecognition:', error);
            this.gestureModels = null;
        }
    }

    async initializeModels() {
        try {
            await this.gestureModels.loadModels();
            console.log('Existing models loaded');
        } catch (error) {
            console.log('No existing models found, starting fresh');
        }
    }

    /**
     * Process landmarks for gesture recognition
     * @param {Array} landmarks - MediaPipe hand landmarks
     * @param {string} mode - 'detect' or 'train'
     * @param {string} selectedGesture - Selected gesture for training
     */
    async processLandmarks(landmarks, mode, selectedGesture = null) {
        if (!landmarks || landmarks.length === 0) {
            return { gesture: null, confidence: 0 };
        }

        // Normalize landmarks (MediaPipe gives normalized coordinates)
        const normalizedLandmarks = this.normalizeLandmarks(landmarks);

        if (mode === 'train' && selectedGesture) {
            return this.handleTrainingMode(normalizedLandmarks, selectedGesture);
        } else if (mode === 'detect') {
            return this.handleDetectionMode(normalizedLandmarks);
        }

        return { gesture: null, confidence: 0 };
    }

    /**
     * Normalize landmarks for consistent input
     */
    normalizeLandmarks(landmarks) {
        // MediaPipe already provides normalized coordinates (0-1)
        // But we can add additional normalization if needed
        return landmarks.map(point => [
            point.x || 0,
            point.y || 0, 
            point.z || 0
        ]);
    }

    /**
     * Handle training mode - collect samples
     */
    handleTrainingMode(landmarks, selectedGesture) {
        // Check if this is a motion gesture (you can determine this from UI or gesture name)
        const isMotionGesture = this.isMotionGesture(selectedGesture);
        
        if (isMotionGesture) {
            return this.handleMotionTraining(landmarks, selectedGesture);
        } else {
            return this.handleStaticTraining(landmarks, selectedGesture);
        }
    }

    /**
     * Handle static gesture training
     */
    handleStaticTraining(landmarks, gesture) {
        // For static gestures, we just collect single frames
        if (!this.trainingData.static[gesture]) {
            this.trainingData.static[gesture] = [];
        }

        return {
            gesture: 'training',
            confidence: 1.0,
            ready: true,
            type: 'static'
        };
    }

    /**
     * Handle motion gesture training - only records when manually started
     */
    handleMotionTraining(landmarks, gesture) {
        if (!this.trainingData.motion[gesture]) {
            this.trainingData.motion[gesture] = [];
        }

        // Only add frames when recording is active
        if (this.isRecordingMotion) {
            this.motionBuffer.push({
                landmarks: landmarks,
                timestamp: Date.now()
            });

            const recordingDuration = Date.now() - this.motionStartTime;
            const hasEnoughFrames = this.motionBuffer.length >= this.minMotionFrames;

            return {
                gesture: 'recording motion',
                confidence: Math.min(this.motionBuffer.length / 45, 1.0), // Progress indicator (3s at 15fps)
                ready: hasEnoughFrames,
                type: 'motion',
                frameCount: this.motionBuffer.length,
                duration: recordingDuration
            };
        } else {
            // Not recording, show ready state
            return {
                gesture: 'ready to record',
                confidence: 0,
                ready: false,
                type: 'motion',
                frameCount: 0,
                duration: 0
            };
        }
    }

    /**
     * Handle detection mode - predict gestures
     */
    async handleDetectionMode(landmarks) {
        try {
            // Try static gesture recognition first
            if (this.gestureModels.staticModel) {
                const staticResult = await this.gestureModels.predictStatic(landmarks);
                
                // If confidence is high enough, return static result
                if (staticResult.confidence > 0.7) {
                    return {
                        gesture: staticResult.gesture,
                        confidence: staticResult.confidence,
                        type: 'static'
                    };
                }
            }

            // For motion gestures, we'd need to buffer frames and analyze sequences
            // This would require more complex logic to determine when a motion starts/ends

            return { gesture: null, confidence: 0 };
        } catch (error) {
            console.error('Detection error:', error);
            return { gesture: null, confidence: 0 };
        }
    }

    /**
     * Capture current training sample
     */
    captureTrainingSample(gesture) {
        const isMotionGesture = this.isMotionGesture(gesture);
        
        if (isMotionGesture) {
            return this.captureMotionSample(gesture);
        } else {
            return this.captureStaticSample(gesture);
        }
    }

    /**
     * Capture static gesture sample
     */
    captureStaticSample(gesture) {
        // Get current landmarks from the last processed frame
        // This would be stored from the last processLandmarks call
        if (this.lastLandmarks) {
            if (!this.trainingData.static[gesture]) {
                this.trainingData.static[gesture] = [];
            }
            
            this.trainingData.static[gesture].push(this.lastLandmarks);
            
            return {
                success: true,
                count: this.trainingData.static[gesture].length,
                type: 'static'
            };
        }
        
        return { success: false, error: 'No landmarks available' };
    }

    /**
     * Capture motion gesture sample
     */
    captureMotionSample(gesture) {
        if (this.motionBuffer.length >= this.minMotionFrames) {
            if (!this.trainingData.motion[gesture]) {
                this.trainingData.motion[gesture] = [];
            }
            
            // Store the motion sequence
            this.trainingData.motion[gesture].push({
                sequence: [...this.motionBuffer],
                duration: Date.now() - this.motionStartTime,
                frameCount: this.motionBuffer.length
            });
            
            // Reset motion buffer
            this.resetMotionRecording();
            
            return {
                success: true,
                count: this.trainingData.motion[gesture].length,
                type: 'motion'
            };
        }
        
        return { 
            success: false, 
            error: `Need at least ${this.minMotionFrames} frames, got ${this.motionBuffer.length}` 
        };
    }

    /**
     * Start motion recording manually
     */
    startMotionRecording() {
        this.isRecordingMotion = true;
        this.motionStartTime = Date.now();
        this.motionBuffer = [];
        console.log('Started motion recording');
    }

    /**
     * Stop motion recording manually and return captured data
     */
    stopMotionRecording() {
        this.isRecordingMotion = false;
        const duration = this.motionStartTime ? Date.now() - this.motionStartTime : 0;
        
        console.log(`Stopped motion recording: ${this.motionBuffer.length} frames, ${duration}ms`);
        
        return {
            frameCount: this.motionBuffer.length,
            duration: duration,
            hasEnoughFrames: this.motionBuffer.length >= this.minMotionFrames
        };
    }

    /**
     * Reset motion recording
     */
    resetMotionRecording() {
        this.isRecordingMotion = false;
        this.motionStartTime = null;
        this.motionBuffer = [];
    }

    /**
     * Train models with collected data
     */
    async trainModels(onProgress = null) {
        const results = {};
        
        try {
            // Train static model if we have static data
            if (Object.keys(this.trainingData.static).length > 0) {
                console.log('Training static gesture model...');
                
                // Create progress callback for UI updates
                const progressCallback = onProgress ? (progress) => {
                    onProgress({
                        type: 'static',
                        ...progress
                    });
                } : null;
                
                const staticHistory = await this.gestureModels.trainStaticModel(
                    this.trainingData.static, 
                    50, // epochs
                    progressCallback
                );
                
                results.static = {
                    history: staticHistory,
                    finalAccuracy: staticHistory.history.acc ? 
                        staticHistory.history.acc[staticHistory.history.acc.length - 1] : null,
                    finalLoss: staticHistory.history.loss ? 
                        staticHistory.history.loss[staticHistory.history.loss.length - 1] : null
                };
            }
            
            // Train motion model if we have motion data
            if (Object.keys(this.trainingData.motion).length > 0) {
                console.log('Training motion gesture model...');
                const motionHistory = await this.gestureModels.trainMotionModel(this.trainingData.motion);
                results.motion = motionHistory;
            }
            
            // Save trained models
            await this.gestureModels.saveModels();
            
            return {
                success: true,
                results: results
            };
            
        } catch (error) {
            console.error('Training error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Determine if gesture is motion-based
     */
    isMotionGesture(gesture) {
        // Define motion gestures based on your UI
        const motionGestures = ['hello', 'yes', 'thank you'];
        return motionGestures.includes(gesture.toLowerCase());
    }

    /**
     * Get training data statistics
     */
    getTrainingStats() {
        const stats = {
            static: {},
            motion: {},
            total: 0
        };
        
        Object.keys(this.trainingData.static).forEach(gesture => {
            const count = this.trainingData.static[gesture].length;
            stats.static[gesture] = count;
            stats.total += count;
        });
        
        Object.keys(this.trainingData.motion).forEach(gesture => {
            const count = this.trainingData.motion[gesture].length;
            stats.motion[gesture] = count;
            stats.total += count;
        });
        
        return stats;
    }

    /**
     * Store last processed landmarks for training
     */
    setLastLandmarks(landmarks) {
        this.lastLandmarks = landmarks;
    }

    /**
     * Clear all training data
     */
    clearTrainingData() {
        this.trainingData = { static: {}, motion: {} };
        this.resetMotionRecording();
    }

    /**
     * Export training data for external storage (S3, etc.)
     */
    exportTrainingData() {
        return {
            static: this.trainingData.static,
            motion: this.trainingData.motion,
            timestamp: new Date().toISOString(),
            stats: this.getTrainingStats()
        };
    }

    /**
     * Clear all training data (called after S3 export)
     */
    clearAllTrainingData() {
        this.clearTrainingData();
        console.log('All TensorFlow.js training data cleared');
    }

    /**
     * Load training data from S3 into TensorFlow.js
     * @param {Object} s3Storage - S3Storage instance
     * @param {Function} onProgress - Optional progress callback for training
     */
    async loadTrainingDataFromS3(s3Storage, onProgress = null) {
        if (!s3Storage || !s3Storage.isConfigured) {
            console.log('S3 not configured, skipping S3 data loading');
            return { success: false, error: 'S3 not configured' };
        }

        try {
            console.log('Loading training data from S3...');
            const result = await s3Storage.downloadTrainingData();
            
            if (!result.success) {
                return result;
            }

            // Merge S3 data into local training data
            for (const [gesture, samples] of Object.entries(result.data)) {
                if (!this.trainingData.static[gesture]) {
                    this.trainingData.static[gesture] = [];
                }
                
                // Add each sample from S3
                samples.forEach(sample => {
                    this.trainingData.static[gesture].push(sample);
                });
            }

            const totalSamples = Object.values(result.data).reduce((sum, samples) => sum + samples.length, 0);
            console.log(`Loaded ${totalSamples} training samples from S3 across ${Object.keys(result.data).length} gestures`);

            // Automatically train models if we have training data
            if (totalSamples > 0) {
                console.log('Automatically training models with loaded S3 data...');
                try {
                    // Use the provided progress callback or create a simple one
                    const progressCallback = onProgress || ((progress) => {
                        console.log(`Training progress: ${progress.epoch}/${progress.totalEpochs}, accuracy: ${(progress.accuracy * 100).toFixed(1)}%`);
                    });
                    
                    const trainingResult = await this.trainModels(progressCallback);
                    if (trainingResult.success) {
                        console.log('Models automatically trained with S3 data');
                    } else {
                        console.warn('Automatic training failed:', trainingResult.error);
                    }
                } catch (trainingError) {
                    console.warn('Automatic training error:', trainingError);
                }
            }

            return {
                success: true,
                totalSamples: totalSamples,
                gestureCount: Object.keys(result.data).length,
                data: result.data,
                modelsTrained: totalSamples > 0
            };

        } catch (error) {
            console.error('Error loading S3 training data:', error);
            return { success: false, error: error.message };
        }
    }
}