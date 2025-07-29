import { detectGesture, GESTURES } from './gestures.js';

export class TrainingManager {
    constructor() {
        this.trainingData = this.loadTrainingData();
    }

    loadTrainingData() {
        try {
            const savedData = localStorage.getItem('aslTrainingData');
            return savedData ? JSON.parse(savedData) : {};
        } catch (e) {
            console.error('Error loading training data:', e);
            return {};
        }
    }

    saveTrainingData() {
        try {
            localStorage.setItem('aslTrainingData', JSON.stringify(this.trainingData));
        } catch (e) {
            console.error('Error saving training data:', e);
        }
    }

    captureTrainingSample(gesture, landmarks) {
        if (!this.trainingData[gesture]) {
            this.trainingData[gesture] = [];
        }
        
        const sample = landmarks.map(point => ({
            x: point.x,
            y: point.y,
            z: point.z
        }));
        
        this.trainingData[gesture].push(sample);
        this.saveTrainingData();
        
        return this.trainingData[gesture].length;
    }

    getSampleCount(gesture) {
        return this.trainingData[gesture] ? this.trainingData[gesture].length : 0;
    }

    calculateLandmarkDistance(landmarks1, landmarks2) {
        let totalDistance = 0;
        for (let i = 0; i < landmarks1.length; i++) {
            const dx = landmarks1[i].x - landmarks2[i].x;
            const dy = landmarks1[i].y - landmarks2[i].y;
            const dz = landmarks1[i].z - landmarks2[i].z;
            totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return totalDistance / landmarks1.length;
    }

    detectGestureWithConfidence(landmarks) {
        const baseDetection = detectGesture(landmarks);
        
        if (baseDetection === GESTURES.NONE || 
            !this.trainingData[baseDetection] || 
            this.trainingData[baseDetection].length === 0) {
            return { 
                gesture: baseDetection, 
                confidence: baseDetection === GESTURES.NONE ? 0 : 0.5 
            };
        }
        
        const samples = this.trainingData[baseDetection];
        let minDistance = Infinity;
        
        samples.forEach(sample => {
            const distance = this.calculateLandmarkDistance(landmarks, sample);
            minDistance = Math.min(minDistance, distance);
        });
        
        // Convert distance to confidence (0-1)
        const confidence = Math.max(0, Math.min(1, 1 - (minDistance * 5)));
        
        return { gesture: baseDetection, confidence };
    }

    clearTrainingData(gesture = null) {
        if (gesture) {
            delete this.trainingData[gesture];
        } else {
            this.trainingData = {};
        }
        this.saveTrainingData();
    }

    exportTrainingData() {
        return JSON.stringify(this.trainingData, null, 2);
    }

    exportGestureData(gesture) {
        if (!this.trainingData[gesture]) {
            return null;
        }
        return JSON.stringify({
            gesture: gesture,
            samples: this.trainingData[gesture],
            count: this.trainingData[gesture].length,
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    downloadTrainingData(gesture = null) {
        let data, filename;
        
        if (gesture) {
            data = this.exportGestureData(gesture);
            if (!data) return false;
            filename = `asl-training-${gesture.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`;
        } else {
            data = this.exportTrainingData();
            filename = `asl-training-all-${Date.now()}.json`;
        }

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    }

    importTrainingData(jsonData) {
        try {
            this.trainingData = JSON.parse(jsonData);
            this.saveTrainingData();
            return true;
        } catch (e) {
            console.error('Error importing training data:', e);
            return false;
        }
    }

    async saveToServer(gesture, landmarks) {
        // This method can be implemented if you have a server endpoint
        // For now, it's a placeholder that could save to a local server
        const sample = {
            gesture: gesture,
            landmarks: landmarks,
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/training-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sample)
            });
            
            return response.ok;
        } catch (e) {
            console.error('Error saving to server:', e);
            return false;
        }
    }
}