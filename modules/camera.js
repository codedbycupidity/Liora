/**
 * Camera module for MediaPipe integration
 * Handles camera access and hand tracking pipeline
 */

/**
 * CameraManager class encapsulates all MediaPipe functionality
 * Manages camera stream, hand detection, and results callback
 */
export class CameraManager {
    constructor(videoElement, canvasElement) {
        // DOM elements
        this.videoElement = videoElement;      // Video element for camera feed
        this.canvasElement = canvasElement;    // Canvas for drawing overlay
        this.canvasCtx = canvasElement.getContext('2d');
        
        // MediaPipe objects
        this.camera = null;                    // MediaPipe Camera instance
        this.hands = null;                     // MediaPipe Hands instance
        
        // State management
        this.isDetecting = false;              // Flag for detection status
        this.onResultsCallback = null;         // Callback for hand detection results
    }

    /**
     * Wait for MediaPipe libraries to load in the browser
     * Required because scripts load asynchronously
     */
    async waitForMediaPipe() {
        // Poll until both Hands and Camera are available on window object
        while (typeof window.Hands === 'undefined' || typeof window.Camera === 'undefined') {
            console.log('Waiting for MediaPipe to load...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('MediaPipe loaded!');
    }

    /**
     * Initialize MediaPipe Hands with configuration
     * Must be called before starting camera
     */
    async initialize() {
        // Ensure MediaPipe is loaded
        await this.waitForMediaPipe();
        
        // Create MediaPipe Hands instance
        this.hands = new window.Hands({
            locateFile: (file) => {
                // Use CDN for MediaPipe model files
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        // Configure hand detection parameters
        this.hands.setOptions({
            maxNumHands: 1,                    // Track only one hand
            modelComplexity: 1,                // Model complexity (0, 1, or 2)
            minDetectionConfidence: 0.5,       // Detection threshold
            minTrackingConfidence: 0.5         // Tracking threshold
        });

        // Set up results callback
        this.hands.onResults((results) => {
            if (this.onResultsCallback) {
                this.onResultsCallback(results);
            }
        });
        
        console.log('MediaPipe initialized successfully');
    }

    /**
     * Start camera and begin hand detection
     * Requests camera permissions if not already granted
     */
    async start() {
        // Create MediaPipe Camera instance
        this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
                // Send each frame to hand detection if active
                if (this.isDetecting) {
                    await this.hands.send({image: this.videoElement});
                }
            },
            width: 640,     // Camera resolution
            height: 480
        });
        
        // Start camera (will request permissions)
        await this.camera.start();
        this.isDetecting = true;
        
        // Match canvas size to video dimensions
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
    }

    /**
     * Stop camera and hand detection
     */
    stop() {
        if (this.camera) {
            this.camera.stop();
            this.isDetecting = false;
        }
    }

    /**
     * Set callback function for hand detection results
     * @param {Function} callback - Function to call with results
     */
    onResults(callback) {
        this.onResultsCallback = callback;
    }

    /**
     * Get canvas information for drawing
     * @returns {Object} Canvas element, context, and dimensions
     */
    getCanvas() {
        return {
            element: this.canvasElement,
            ctx: this.canvasCtx,
            width: this.canvasElement.width,
            height: this.canvasElement.height
        };
    }
}