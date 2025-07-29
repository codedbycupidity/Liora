export class CameraManager {
    constructor(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');
        this.camera = null;
        this.isDetecting = false;
        this.hands = null;
        this.onResultsCallback = null;
    }

    async waitForMediaPipe() {
        while (typeof window.Hands === 'undefined' || typeof window.Camera === 'undefined') {
            console.log('Waiting for MediaPipe to load...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('MediaPipe loaded!');
    }

    async initialize() {
        await this.waitForMediaPipe();
        
        this.hands = new window.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => {
            if (this.onResultsCallback) {
                this.onResultsCallback(results);
            }
        });
        
        console.log('MediaPipe initialized successfully');
    }

    async start() {
        this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
                if (this.isDetecting) {
                    await this.hands.send({image: this.videoElement});
                }
            },
            width: 640,
            height: 480
        });
        
        await this.camera.start();
        this.isDetecting = true;
        
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
    }

    stop() {
        if (this.camera) {
            this.camera.stop();
            this.isDetecting = false;
        }
    }

    onResults(callback) {
        this.onResultsCallback = callback;
    }

    getCanvas() {
        return {
            element: this.canvasElement,
            ctx: this.canvasCtx,
            width: this.canvasElement.width,
            height: this.canvasElement.height
        };
    }
}