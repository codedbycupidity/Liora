/**
 * Training module for machine learning features
 * Manages training data collection, storage, and gesture confidence scoring
 */

import { detectGesture, GESTURES } from './gestures.js';

/**
 * TrainingManager class handles all training-related functionality
 * - Loads/saves training data from localStorage and server
 * - Captures new training samples
 * - Enhances gesture detection with confidence scoring
 */
export class TrainingManager {
    constructor() {
        // Load existing training data from localStorage
        this.trainingData = this.loadTrainingData();
        
        // Asynchronously load additional data from server
        this.loadServerTrainingData();
    }

    /**
     * Load training data from browser's localStorage
     * @returns {Object} Training data organized by gesture name
     */
    loadTrainingData() {
        try {
            const savedData = localStorage.getItem('aslTrainingData');
            return savedData ? JSON.parse(savedData) : {};
        } catch (e) {
            console.error('Error loading training data:', e);
            return {};
        }
    }

    /**
     * Load training data from server (training-data folder)
     * Automatically merges with existing localStorage data
     * Called on initialization to restore previous training sessions
     */
    async loadServerTrainingData() {
        try {
            const response = await fetch('http://localhost:8000/api/training-data/load');
            if (response.ok) {
                const serverData = await response.json();
                
                // Merge server data with existing local data
                for (const [gesture, samples] of Object.entries(serverData)) {
                    // Initialize array if gesture doesn't exist
                    if (!this.trainingData[gesture]) {
                        this.trainingData[gesture] = [];
                    }
                    
                    // Add server samples that don't already exist locally
                    samples.forEach(sample => {
                        // Simple comparison to avoid duplicates
                        const exists = this.trainingData[gesture].some(existing => 
                            JSON.stringify(existing) === JSON.stringify(sample)
                        );
                        
                        if (!exists) {
                            this.trainingData[gesture].push(sample);
                        }
                    });
                }
                
                // Save the merged data to localStorage for quick access
                this.saveTrainingData();
                console.log('Loaded training data from server:', 
                    Object.keys(serverData).map(g => `${g}: ${serverData[g].length} samples`).join(', '));
            }
        } catch (e) {
            // Server might not be running - this is okay
            console.log('Could not load server training data (server may not be running):', e.message);
        }
    }

    /**
     * Save training data to localStorage
     * Called after each new capture or data modification
     */
    saveTrainingData() {
        try {
            localStorage.setItem('aslTrainingData', JSON.stringify(this.trainingData));
        } catch (e) {
            console.error('Error saving training data:', e);
        }
    }

    /**
     * Capture a new training sample for a gesture
     * @param {string} gesture - Name of the gesture being trained
     * @param {Array} landmarks - Current hand landmarks from MediaPipe
     * @returns {number} Total number of samples for this gesture
     */
    captureTrainingSample(gesture, landmarks) {
        // Initialize array if this is the first sample for this gesture
        if (!this.trainingData[gesture]) {
            this.trainingData[gesture] = [];
        }
        
        // Extract only x, y, z coordinates from landmarks
        const sample = landmarks.map(point => ({
            x: point.x,
            y: point.y,
            z: point.z
        }));
        
        // Add to training data
        this.trainingData[gesture].push(sample);
        
        // Save to localStorage immediately
        this.saveTrainingData();
        
        // Also save to server for persistence
        this.saveToServer(gesture, sample);
        
        // Return updated count for UI feedback
        return this.trainingData[gesture].length;
    }

    /**
     * Get the number of training samples for a specific gesture
     * @param {string} gesture - Gesture name
     * @returns {number} Number of samples
     */
    getSampleCount(gesture) {
        return this.trainingData[gesture] ? this.trainingData[gesture].length : 0;
    }

    /**
     * Calculate Euclidean distance between two hand poses
     * Used to find the closest matching training sample
     * @param {Array} landmarks1 - First set of landmarks
     * @param {Array} landmarks2 - Second set of landmarks
     * @returns {number} Average distance per landmark
     */
    calculateLandmarkDistance(landmarks1, landmarks2) {
        let totalDistance = 0;
        
        // Calculate 3D distance for each landmark pair
        for (let i = 0; i < landmarks1.length; i++) {
            const dx = landmarks1[i].x - landmarks2[i].x;
            const dy = landmarks1[i].y - landmarks2[i].y;
            const dz = landmarks1[i].z - landmarks2[i].z;
            
            // Euclidean distance in 3D space
            totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        
        // Return average distance per landmark for normalization
        return totalDistance / landmarks1.length;
    }

    /**
     * Detect gesture with confidence score based on training data
     * Combines rule-based detection with ML-enhanced confidence
     * @param {Array} landmarks - Current hand landmarks
     * @returns {Object} {gesture: string, confidence: number}
     */
    detectGestureWithConfidence(landmarks) {
        // First use rule-based detection to identify the gesture
        const baseDetection = detectGesture(landmarks);
        
        // If no gesture detected or no training data exists
        if (baseDetection === GESTURES.NONE || 
            !this.trainingData[baseDetection] || 
            this.trainingData[baseDetection].length === 0) {
            return { 
                gesture: baseDetection, 
                confidence: baseDetection === GESTURES.NONE ? 0 : 0.5 // Base confidence of 0.5 without training
            };
        }
        
        // Find the closest matching training sample
        const samples = this.trainingData[baseDetection];
        let minDistance = Infinity;
        
        samples.forEach(sample => {
            const distance = this.calculateLandmarkDistance(landmarks, sample);
            minDistance = Math.min(minDistance, distance);
        });
        
        // Convert distance to confidence score (0-1)
        // Lower distance = higher confidence
        // Multiplier of 5 adjusts sensitivity
        const confidence = Math.max(0, Math.min(1, 1 - (minDistance * 5)));
        
        return { gesture: baseDetection, confidence };
    }

    /**
     * Clear training data for a specific gesture or all gestures
     * @param {string|null} gesture - Gesture to clear, or null for all
     */
    clearTrainingData(gesture = null) {
        if (gesture) {
            // Clear specific gesture
            delete this.trainingData[gesture];
        } else {
            // Clear all training data
            this.trainingData = {};
        }
        this.saveTrainingData();
    }

    /**
     * Export all training data as formatted JSON string
     * @returns {string} JSON string of all training data
     */
    exportTrainingData() {
        return JSON.stringify(this.trainingData, null, 2);
    }

    /**
     * Export training data for a specific gesture
     * @param {string} gesture - Gesture name to export
     * @returns {string|null} JSON string or null if gesture not found
     */
    exportGestureData(gesture) {
        if (!this.trainingData[gesture]) {
            return null;
        }
        
        // Create structured export with metadata
        return JSON.stringify({
            gesture: gesture,
            samples: this.trainingData[gesture],
            count: this.trainingData[gesture].length,
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Download training data as a JSON file
     * @param {string|null} gesture - Specific gesture or null for all
     * @returns {boolean} Success status
     */
    async downloadTrainingData(gesture = null) {
        let data, filename;
        
        if (gesture) {
            // Export specific gesture
            data = this.exportGestureData(gesture);
            if (!data) return false;
            
            // Sanitize gesture name for filename
            filename = `asl-training-${gesture.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`;
        } else {
            // Export all gestures
            data = this.exportTrainingData();
            filename = `asl-training-all-${Date.now()}.json`;
        }

        // Check if running in Electron
        if (window.electronAPI && window.electronAPI.isElectron) {
            // Use Electron's save dialog
            try {
                const result = await window.electronAPI.showSaveDialog(filename);
                if (!result.canceled && result.filePath) {
                    // In a real implementation, we'd use fs to write the file
                    // For now, we'll still use the blob download method
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = result.filePath.split('/').pop();
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
                return !result.canceled;
            } catch (error) {
                console.error('Error showing save dialog:', error);
                // Fall back to regular download
            }
        }

        // Regular web download
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        return true;
    }

    /**
     * Import training data from JSON string
     * @param {string} jsonData - JSON string containing training data
     * @returns {boolean} Success status
     */
    importTrainingData(jsonData) {
        try {
            // Parse and replace existing data
            this.trainingData = JSON.parse(jsonData);
            this.saveTrainingData();
            return true;
        } catch (e) {
            console.error('Error importing training data:', e);
            return false;
        }
    }

    /**
     * Save a training sample to the server
     * Server stores samples in training-data folder for persistence
     * @param {string} gesture - Gesture name
     * @param {Array} landmarks - Hand landmarks to save
     * @returns {boolean} Success status
     */
    async saveToServer(gesture, landmarks) {
        // Prepare sample with metadata
        const sample = {
            gesture: gesture,
            landmarks: landmarks,
            timestamp: new Date().toISOString()
        };

        try {
            // POST to server endpoint
            const response = await fetch('http://localhost:8000/api/training-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sample)
            });
            
            return response.ok;
        } catch (e) {
            // Server might not be running - this is okay
            console.error('Error saving to server:', e);
            return false;
        }
    }
}