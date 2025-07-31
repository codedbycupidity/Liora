/**
 * UI module for managing all user interface interactions
 * Handles DOM manipulation, event listeners, and visual feedback
 */

/**
 * UIManager class centralizes all UI-related operations
 * Uses event-driven architecture for communication with app
 */
export class UIManager {
    constructor() {
        // Cache all DOM elements for efficient access
        this.elements = {
            statusText: document.getElementById('statusText'),          // Status messages
            gestureResult: document.getElementById('gestureResult'),    // Detected gesture display
            startButton: document.getElementById('startButton'),        // Camera start button
            modeToggle: document.getElementById('modeToggle'),          // Mode toggle switch
            trainingPanel: document.getElementById('trainingPanel'),    // Training controls panel
            captureBtn: document.getElementById('captureBtn'),          // Capture sample button
            trainingInfo: document.getElementById('trainingInfo'),      // Training status text
            confidenceFill: document.getElementById('confidenceFill'),  // Confidence meter fill
            confidenceMeter: document.querySelector('.confidence-meter'), // Confidence container
            exportGestureBtn: document.getElementById('exportGestureBtn'), // Export gesture button
            exportAllBtn: document.getElementById('exportAllBtn')       // Export all data button
        };
        
        // State management
        this.currentMode = 'detect';      // Current app mode (detect/train)
        this.selectedGesture = null;      // Selected gesture in training mode
        this.callbacks = {};              // Event callbacks storage
    }

    /**
     * Switch between detect and training modes
     * Updates UI elements accordingly
     * @param {string} mode - 'detect' or 'train'
     */
    setMode(mode) {
        this.currentMode = mode;
        
        if (mode === 'detect') {
            // Activate detect mode UI
            this.elements.modeToggle.checked = false;
            this.elements.trainingPanel.style.display = 'none';
        } else {
            // Activate training mode UI
            this.elements.modeToggle.checked = true;
            this.elements.trainingPanel.style.display = 'block';
        }
    }

    /**
     * Update status message with optional styling
     * @param {string} text - Status message to display
     * @param {string} className - CSS class for styling (e.g., 'error', 'loading')
     */
    updateStatus(text, className = '') {
        this.elements.statusText.textContent = text;
        this.elements.statusText.className = className;
    }

    /**
     * Display detected gesture and confidence level
     * @param {string} gesture - Detected gesture name
     * @param {number|null} confidence - Confidence score (0-1)
     * @param {Object|null} motionFeedback - Motion tracking feedback
     */
    updateGestureResult(gesture, confidence = null, motionFeedback = null) {
        if (gesture && gesture !== 'None') {
            // Show gesture name
            this.elements.gestureResult.textContent = `"${gesture}" detected`;
            
            // Add motion feedback if provided
            if (motionFeedback && motionFeedback.message) {
                // Clear previous feedback if exists
                const existingFeedback = this.elements.gestureResult.querySelector('.motion-feedback');
                if (existingFeedback) {
                    existingFeedback.remove();
                }
                
                const feedbackDiv = document.createElement('div');
                feedbackDiv.style.fontSize = '0.9em';
                feedbackDiv.style.marginTop = '0.5rem';
                feedbackDiv.style.color = '#666';
                feedbackDiv.style.fontWeight = '500';
                feedbackDiv.textContent = motionFeedback.message;
                feedbackDiv.className = 'motion-feedback';
                this.elements.gestureResult.appendChild(feedbackDiv);
                
                // Update confidence based on motion progress if available
                if (motionFeedback.progress !== undefined) {
                    confidence = motionFeedback.progress;
                }
            } else {
                // Remove feedback if none provided
                const existingFeedback = this.elements.gestureResult.querySelector('.motion-feedback');
                if (existingFeedback) {
                    existingFeedback.remove();
                }
            }
            
            // Show confidence meter if confidence provided
            if (confidence !== null) {
                this.elements.confidenceMeter.style.display = 'block';
                this.elements.confidenceFill.style.width = `${confidence * 100}%`;
            }
        } else {
            // Clear display when no gesture detected
            this.elements.gestureResult.textContent = '';
            this.elements.confidenceMeter.style.display = 'none';
        }
    }

    /**
     * Update training mode information text
     * @param {string} text - Information to display
     */
    updateTrainingInfo(text) {
        this.elements.trainingInfo.textContent = text;
    }

    /**
     * Show feedback when training sample is captured
     * Displays temporary success message
     * @param {string} gesture - Gesture name
     * @param {number} count - Total samples for this gesture
     */
    showTrainingCapture(gesture, count) {
        // Show immediate feedback
        this.updateTrainingInfo(`Captured! ${count} samples for "${gesture}"`);
        
        // Revert to count display after 2 seconds
        setTimeout(() => {
            this.updateTrainingInfo(`${count} samples captured for "${gesture}"`);
        }, 2000);
    }

    /**
     * Set up all event listeners for UI elements
     * Uses callback pattern for communication with app
     */
    setupEventListeners() {
        // Camera start button
        this.elements.startButton.addEventListener('click', () => {
            if (this.callbacks.onStartCamera) {
                this.callbacks.onStartCamera();
            }
        });

        // Mode toggle switch
        this.elements.modeToggle.addEventListener('change', (e) => {
            const mode = e.target.checked ? 'train' : 'detect';
            this.setMode(mode);
            if (this.callbacks.onModeChange) {
                this.callbacks.onModeChange(mode);
            }
        });

        // Gesture selection buttons in training mode
        document.querySelectorAll('.gesture-button').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active state from all buttons
                document.querySelectorAll('.gesture-button').forEach(b => b.classList.remove('active'));
                
                // Activate clicked button
                btn.classList.add('active');
                this.selectedGesture = btn.dataset.gesture;
                
                // Enable capture button
                this.elements.captureBtn.disabled = false;
                
                // Notify app of gesture selection
                if (this.callbacks.onGestureSelect) {
                    this.callbacks.onGestureSelect(this.selectedGesture);
                }
            });
        });

        // Capture button for training samples
        this.elements.captureBtn.addEventListener('click', () => {
            if (this.callbacks.onCapture && this.selectedGesture) {
                this.callbacks.onCapture(this.selectedGesture);
            }
        });

        // Export buttons
        this.elements.exportGestureBtn.addEventListener('click', () => {
            if (this.callbacks.onExportGesture && this.selectedGesture) {
                this.callbacks.onExportGesture(this.selectedGesture);
            }
        });

        this.elements.exportAllBtn.addEventListener('click', () => {
            if (this.callbacks.onExportAll) {
                this.callbacks.onExportAll();
            }
        });
    }

    /**
     * Register event callback
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        this.callbacks[event] = callback;
    }

    /**
     * Disable camera start button
     */
    disableStartButton() {
        this.elements.startButton.disabled = true;
    }

    /**
     * Enable camera start button
     */
    enableStartButton() {
        this.elements.startButton.disabled = false;
    }

    /**
     * Get current mode
     * @returns {string} Current mode ('detect' or 'train')
     */
    getMode() {
        return this.currentMode;
    }

    /**
     * Get currently selected gesture in training mode
     * @returns {string|null} Selected gesture name or null
     */
    getSelectedGesture() {
        return this.selectedGesture;
    }
}