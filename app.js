import { GESTURES } from './modules/gestures.js';
import { drawHandConnections, drawHandLandmarks, getBoundingBox, drawBoundingBox } from './modules/visualization.js';
import { TrainingManager } from './modules/training.js';
import { UIManager } from './modules/ui.js';
import { CameraManager } from './modules/camera.js';

class ASLGestureApp {
    constructor() {
        this.videoElement = document.getElementById('webcam');
        this.canvasElement = document.getElementById('output');
        
        this.ui = new UIManager();
        this.training = new TrainingManager();
        this.camera = new CameraManager(this.videoElement, this.canvasElement);
        
        this.currentLandmarks = null;
        
        this.setupEventHandlers();
    }

    async initialize() {
        await this.camera.initialize();
        this.camera.onResults(this.handleResults.bind(this));
        this.ui.setupEventListeners();
        
        // Check if any training data was loaded
        const totalSamples = Object.values(this.training.trainingData)
            .reduce((sum, samples) => sum + samples.length, 0);
        
        if (totalSamples > 0) {
            console.log(`Loaded ${totalSamples} training samples from previous sessions`);
            this.ui.updateStatus(`Ready - Loaded ${totalSamples} training samples`);
            setTimeout(() => {
                this.ui.updateStatus('Click "Start Camera" to begin');
            }, 3000);
        }
    }

    setupEventHandlers() {
        this.ui.on('onStartCamera', () => this.startCamera());
        this.ui.on('onModeChange', (mode) => this.handleModeChange(mode));
        this.ui.on('onGestureSelect', (gesture) => this.handleGestureSelect(gesture));
        this.ui.on('onCapture', (gesture) => this.handleCapture(gesture));
        this.ui.on('onExportGesture', (gesture) => this.handleExportGesture(gesture));
        this.ui.on('onExportAll', () => this.handleExportAll());
    }

    async startCamera() {
        this.ui.disableStartButton();
        this.ui.updateStatus('Initializing camera...', 'loading');
        
        try {
            await this.camera.start();
            this.ui.updateStatus('Camera active - Try any of the supported gestures');
        } catch (error) {
            console.error('Error starting camera:', error);
            this.ui.updateStatus('Error: Could not access camera. Please check permissions.', 'error');
            this.ui.enableStartButton();
        }
    }

    handleResults(results) {
        const canvas = this.camera.getCanvas();
        const ctx = canvas.ctx;
        
        // Ensure canvas has proper dimensions
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.element.width = 640;
            canvas.element.height = 480;
        }
        
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this.currentLandmarks = landmarks;
            
            // Always use our custom drawing functions
            drawHandConnections(ctx, landmarks, canvas.width, canvas.height);
            drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
            
            const boundingBox = getBoundingBox(landmarks, canvas.width, canvas.height);
            
            if (this.ui.getMode() === 'detect') {
                const detection = this.training.detectGestureWithConfidence(landmarks);
                drawBoundingBox(ctx, boundingBox, detection.gesture);
                this.ui.updateGestureResult(detection.gesture, detection.confidence);
            } else {
                drawBoundingBox(ctx, boundingBox, 'Training Mode');
                const selectedGesture = this.ui.getSelectedGesture();
                if (selectedGesture) {
                    this.ui.updateGestureResult(`Training: ${selectedGesture}`);
                }
            }
        } else {
            this.currentLandmarks = null;
            this.ui.updateGestureResult(null);
        }
        
        ctx.restore();
    }

    handleModeChange(mode) {
        // Mode change is handled by UI manager
    }

    handleGestureSelect(gesture) {
        const count = this.training.getSampleCount(gesture);
        if (count > 0) {
            this.ui.updateTrainingInfo(`${count} samples captured for "${gesture}"`);
        } else {
            this.ui.updateTrainingInfo(`0 samples captured for "${gesture}". Make the gesture and click Capture!`);
        }
    }

    handleCapture(gesture) {
        if (this.currentLandmarks) {
            const count = this.training.captureTrainingSample(gesture, this.currentLandmarks);
            this.ui.showTrainingCapture(gesture, count);
        }
    }

    handleExportGesture(gesture) {
        const success = this.training.downloadTrainingData(gesture);
        if (success) {
            this.ui.updateTrainingInfo(`Exported ${gesture} training data!`);
            setTimeout(() => this.handleGestureSelect(gesture), 2000);
        }
    }

    handleExportAll() {
        const success = this.training.downloadTrainingData();
        if (success) {
            this.ui.updateTrainingInfo('Exported all training data!');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new ASLGestureApp();
    await app.initialize();
});