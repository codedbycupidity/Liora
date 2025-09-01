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
            modeToggleBtn: document.getElementById('modeToggleBtn'),    // Mode toggle button
            menuToggle: document.getElementById('menuToggle'),          // Hamburger menu button
            menuPanel: document.getElementById('menuPanel'),            // Menu panel
            menuBackdrop: document.getElementById('menuBackdrop'),      // Menu backdrop
            trainingPanel: document.getElementById('trainingPanel'),    // Training controls panel
            trainingControls: document.getElementById('trainingControls'), // Right-side training controls
            captureBtn: document.getElementById('captureBtn'),          // Capture sample button
            trainingInfo: document.getElementById('trainingInfo'),      // Training status text
            confidenceFill: document.getElementById('confidenceFill'),  // Confidence meter fill
            confidenceMeter: document.querySelector('.confidence-meter'), // Confidence container
            clearSamplesBtn: document.getElementById('clearSamplesBtn'),   // Clear samples button
            exportGestureBtn: document.getElementById('exportGestureBtn'), // Export gesture button
            exportAllBtn: document.getElementById('exportAllBtn'),       // Export all data button
            s3ConfigBtn: document.getElementById('s3ConfigBtn'),         // S3 configuration button
            exportS3Btn: document.getElementById('exportS3Btn'),         // Export to S3 button
            loadS3Btn: document.getElementById('loadS3Btn'),             // Load from S3 button
            staticControls: document.getElementById('staticControls'),   // Static gesture controls
            motionControls: document.getElementById('motionControls'),   // Motion gesture controls
            startRecordBtn: document.getElementById('startRecordBtn'),   // Start recording button
            stopRecordBtn: document.getElementById('stopRecordBtn'),     // Stop recording button
            recordingStatus: document.getElementById('recordingStatus'), // Recording status display
            recordingTimer: document.getElementById('recordingTimer'),   // Recording timer display
            restartCameraBtn: document.getElementById('restartCameraBtn'), // Restart camera button
            // Main training controls below video
            trainingControlsMain: document.getElementById('trainingControlsMain'), // Main training controls container
            staticControlsMain: document.getElementById('staticControlsMain'),     // Main static controls
            motionControlsMain: document.getElementById('motionControlsMain'),     // Main motion controls
            captureBtnMain: document.getElementById('captureBtnMain'),             // Main capture button
            startRecordBtnMain: document.getElementById('startRecordBtnMain'),     // Main start recording button
            stopRecordBtnMain: document.getElementById('stopRecordBtnMain'),       // Main stop recording button
            recordingStatusMain: document.getElementById('recordingStatusMain'),   // Main recording status
            recordingTimerMain: document.getElementById('recordingTimerMain'),     // Main recording timer
            metricsToggle: document.getElementById('metricsToggle'),     // Metrics toggle button
            trainingMetrics: document.getElementById('trainingMetrics'), // Training metrics panel
            trainingProgress: document.getElementById('trainingProgress'), // Training progress text
            trainingProgressBar: document.getElementById('trainingProgressBar'), // Training progress bar
            currentEpoch: document.getElementById('currentEpoch'),       // Current epoch display
            currentLoss: document.getElementById('currentLoss'),         // Current loss display
            currentAccuracy: document.getElementById('currentAccuracy'), // Current accuracy display
            trainingDataSummary: document.getElementById('trainingDataSummary'), // Training data summary
            beforeAccuracy: document.getElementById('beforeAccuracy'),   // Before training accuracy
            afterAccuracy: document.getElementById('afterAccuracy'),     // After training accuracy
            confidenceChart: document.getElementById('confidenceChart'), // Confidence chart canvas
            debugToggle: document.getElementById('debugToggle'),         // Debug toggle button
            landmarkDebug: document.getElementById('landmarkDebug'),     // Landmark debug panel
            modelPrediction: document.getElementById('modelPrediction'), // Model prediction display
            modelConfidence: document.getElementById('modelConfidence'), // Model confidence display
            landmarkValues: document.getElementById('landmarkValues'),   // Landmark values display
            landmarkPreview: document.getElementById('landmarkPreview')  // Landmark preview canvas
        };
        
        // State management
        this.currentMode = 'detect';      // Current app mode (detect/train)
        this.selectedGesture = null;      // Selected gesture in training mode
        this.isRecording = false;         // Recording state for motion gestures
        this.recordingStartTime = null;   // Recording start time
        this.recordingTimer = null;       // Timer interval
        this.callbacks = {};              // Event callbacks storage
        this.metricsVisible = false;      // Metrics panel visibility
        this.confidenceHistory = [];     // Confidence tracking history
        this.chartAnimationId = null;    // Chart animation frame ID
        this.debugVisible = false;       // Debug panel visibility
        this.landmarkHistory = [];       // Landmark tracking history
        
        // Debug: Check if critical elements exist
        console.log('UI Elements found:', {
            modeToggleBtn: !!this.elements.modeToggleBtn,
            menuToggle: !!this.elements.menuToggle,
            menuPanel: !!this.elements.menuPanel,
            trainingPanel: !!this.elements.trainingPanel,
            confidenceMeter: !!this.elements.confidenceMeter,
            confidenceFill: !!this.elements.confidenceFill,
            gestureResult: !!this.elements.gestureResult
        });
    }

    /**
     * Switch between detect and training modes
     * Updates UI elements accordingly
     * @param {string} mode - 'detect' or 'train'
     */
    setMode(mode) {
        this.currentMode = mode;
        console.log('setMode called with:', mode);
        
        if (mode === 'detect') {
            // Activate detect mode UI
            if (this.elements.modeToggleBtn) {
                this.elements.modeToggleBtn.textContent = 'Switch to Training';
                this.elements.modeToggleBtn.className = 'w-full px-3 py-2 text-left bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm';
            }
            if (this.elements.trainingPanel) {
                this.elements.trainingPanel.style.display = 'none';
                console.log('Training panel hidden');
            }
            if (this.elements.trainingControls) {
                this.elements.trainingControls.style.display = 'none';
            }
        } else {
            // Activate training mode UI
            if (this.elements.modeToggleBtn) {
                this.elements.modeToggleBtn.textContent = 'Switch to Detection';
                this.elements.modeToggleBtn.className = 'w-full px-3 py-2 text-left bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm';
            }
            if (this.elements.trainingPanel) {
                this.elements.trainingPanel.style.display = 'block';
                console.log('Training panel shown');
            } else {
                console.error('Training panel element not found!');
            }
            if (this.elements.trainingControls) {
                this.elements.trainingControls.style.display = 'block';
            }
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
                if (this.elements.confidenceMeter) {
                    this.elements.confidenceMeter.style.display = 'block';
                }
                if (this.elements.confidenceFill) {
                    this.elements.confidenceFill.style.width = `${confidence * 100}%`;
                }
            }
        } else {
            // Clear display when no gesture detected
            this.elements.gestureResult.textContent = '';
            if (this.elements.confidenceMeter) {
                this.elements.confidenceMeter.style.display = 'none';
            }
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
        // Hamburger menu toggle
        if (this.elements.menuToggle && this.elements.menuPanel) {
            this.elements.menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
        }
        
        // Menu backdrop click to close
        if (this.elements.menuBackdrop) {
            this.elements.menuBackdrop.addEventListener('click', () => {
                this.closeMenu();
            });
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.elements.menuPanel.contains(e.target) && 
                !this.elements.menuToggle.contains(e.target) &&
                !this.elements.menuPanel.classList.contains('hidden')) {
                this.closeMenu();
            }
        });
        
        // Mode toggle button
        if (this.elements.modeToggleBtn) {
            this.elements.modeToggleBtn.addEventListener('click', () => {
                const newMode = this.currentMode === 'detect' ? 'train' : 'detect';
                console.log('Mode button clicked, switching to:', newMode);
                this.setMode(newMode);
                if (this.callbacks.onModeChange) {
                    this.callbacks.onModeChange(newMode);
                }
            });
        }

        // Gesture selection buttons in training mode
        document.querySelectorAll('.gesture-button').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active state from all buttons
                document.querySelectorAll('.gesture-button').forEach(b => b.classList.remove('active'));
                
                // Activate clicked button
                btn.classList.add('active');
                this.selectedGesture = btn.dataset.gesture;
                
                // Check if it's a motion gesture
                const isMotion = btn.dataset.motion === 'true';
                
                // Make sure main container is visible
                if (this.elements.trainingControlsMain) {
                    this.elements.trainingControlsMain.style.display = 'block';
                    console.log('Showing main training controls container');
                }
                
                // Show appropriate controls (both versions)
                if (isMotion) {
                    this.elements.staticControls.style.display = 'none';
                    this.elements.motionControls.style.display = 'block';
                    
                    // Main controls below video
                    if (this.elements.staticControlsMain) {
                        this.elements.staticControlsMain.style.display = 'none';
                        console.log('Hiding static controls');
                    }
                    if (this.elements.motionControlsMain) {
                        this.elements.motionControlsMain.style.display = 'block';
                        console.log('Showing motion controls');
                    }
                    
                    this.updateTrainingInfo(`Motion gesture selected. Click "Start Recording" to begin capturing the ${this.selectedGesture} motion.`);
                } else {
                    this.elements.staticControls.style.display = 'block';
                    this.elements.motionControls.style.display = 'none';
                    
                    // Main controls below video
                    if (this.elements.staticControlsMain) {
                        this.elements.staticControlsMain.style.display = 'block';
                        console.log('Showing static controls with capture button');
                    }
                    if (this.elements.motionControlsMain) {
                        this.elements.motionControlsMain.style.display = 'none';
                        console.log('Hiding motion controls');
                    }
                    
                    this.updateTrainingInfo(`Static gesture selected. Hold the ${this.selectedGesture} pose and click "Capture Sample".`);
                }
                
                // Notify app of gesture selection
                if (this.callbacks.onGestureSelect) {
                    this.callbacks.onGestureSelect(this.selectedGesture);
                }
            });
        });

        // Capture button for static gestures (both versions)
        this.elements.captureBtn.addEventListener('click', () => {
            if (this.callbacks.onCapture && this.selectedGesture) {
                this.callbacks.onCapture(this.selectedGesture);
            }
        });
        
        // Main capture button below video
        if (this.elements.captureBtnMain) {
            this.elements.captureBtnMain.addEventListener('click', () => {
                if (this.callbacks.onCapture && this.selectedGesture) {
                    this.callbacks.onCapture(this.selectedGesture);
                }
            });
        }

        // Start recording button for motion gestures
        this.elements.startRecordBtn.addEventListener('click', () => {
            if (this.callbacks.onStartRecording && this.selectedGesture) {
                this.startRecording();
                this.callbacks.onStartRecording(this.selectedGesture);
            }
        });
        
        // Main start recording button below video
        if (this.elements.startRecordBtnMain) {
            this.elements.startRecordBtnMain.addEventListener('click', () => {
                if (this.callbacks.onStartRecording && this.selectedGesture) {
                    this.startRecording();
                    this.callbacks.onStartRecording(this.selectedGesture);
                }
            });
        }

        // Stop recording button for motion gestures
        this.elements.stopRecordBtn.addEventListener('click', () => {
            if (this.callbacks.onStopRecording && this.selectedGesture) {
                this.stopRecording();
                this.callbacks.onStopRecording(this.selectedGesture);
            }
        });
        
        // Main stop recording button below video
        if (this.elements.stopRecordBtnMain) {
            this.elements.stopRecordBtnMain.addEventListener('click', () => {
                if (this.callbacks.onStopRecording && this.selectedGesture) {
                    this.stopRecording();
                    this.callbacks.onStopRecording(this.selectedGesture);
                }
            });
        }

        // Clear samples button
        this.elements.clearSamplesBtn.addEventListener('click', () => {
            if (this.callbacks.onClearSamples) {
                this.callbacks.onClearSamples();
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

        // S3 configuration button
        this.elements.s3ConfigBtn.addEventListener('click', () => {
            if (this.callbacks.onS3Config) {
                this.callbacks.onS3Config();
            }
        });

        // Export to S3 button
        this.elements.exportS3Btn.addEventListener('click', () => {
            if (this.callbacks.onExportS3) {
                this.callbacks.onExportS3();
            }
        });

        // Load from S3 button
        this.elements.loadS3Btn.addEventListener('click', () => {
            if (this.callbacks.onLoadS3) {
                this.callbacks.onLoadS3();
            }
        });

        // Restart camera button
        this.elements.restartCameraBtn.addEventListener('click', () => {
            if (this.callbacks.onRestartCamera) {
                this.callbacks.onRestartCamera();
            }
        });

        // Metrics toggle button
        this.elements.metricsToggle.addEventListener('click', () => {
            this.toggleMetrics();
        });

        // Debug toggle button
        this.elements.debugToggle.addEventListener('click', () => {
            this.toggleDebug();
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

    /**
     * Start recording for motion gestures
     */
    startRecording() {
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        
        // Update UI (both versions)
        this.elements.startRecordBtn.style.display = 'none';
        this.elements.stopRecordBtn.style.display = 'block';
        this.elements.recordingStatus.style.display = 'flex';
        
        // Update main controls below video
        if (this.elements.startRecordBtnMain) {
            this.elements.startRecordBtnMain.style.display = 'none';
        }
        if (this.elements.stopRecordBtnMain) {
            this.elements.stopRecordBtnMain.style.display = 'block';
        }
        if (this.elements.recordingStatusMain) {
            this.elements.recordingStatusMain.style.display = 'flex';
        }
        
        // Start timer (both versions)
        this.recordingTimer = setInterval(() => {
            const elapsed = (Date.now() - this.recordingStartTime) / 1000;
            this.elements.recordingTimer.textContent = `${elapsed.toFixed(1)}s`;
            if (this.elements.recordingTimerMain) {
                this.elements.recordingTimerMain.textContent = `${elapsed.toFixed(1)}s`;
            }
        }, 100);
        
        this.updateTrainingInfo(`Recording ${this.selectedGesture} motion... Perform the gesture now!`);
    }

    /**
     * Stop recording for motion gestures
     */
    stopRecording() {
        this.isRecording = false;
        
        // Clear timer
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        // Update UI (both versions)
        this.elements.startRecordBtn.style.display = 'block';
        this.elements.stopRecordBtn.style.display = 'none';
        this.elements.recordingStatus.style.display = 'none';
        
        // Update main controls below video
        if (this.elements.startRecordBtnMain) {
            this.elements.startRecordBtnMain.style.display = 'block';
        }
        if (this.elements.stopRecordBtnMain) {
            this.elements.stopRecordBtnMain.style.display = 'none';
        }
        if (this.elements.recordingStatusMain) {
            this.elements.recordingStatusMain.style.display = 'none';
        }
        
        const duration = this.recordingStartTime ? 
            ((Date.now() - this.recordingStartTime) / 1000).toFixed(1) : '0.0';
        
        this.updateTrainingInfo(`Recording stopped! Captured ${duration}s of ${this.selectedGesture} motion.`);
    }

    /**
     * Check if currently recording
     * @returns {boolean} Recording state
     */
    isCurrentlyRecording() {
        return this.isRecording;
    }

    /**
     * Show recording feedback when sample is saved
     * @param {string} gesture - Gesture name
     * @param {number} count - Total samples for this gesture
     * @param {number} duration - Duration of recorded sample
     */
    showRecordingCapture(gesture, count, duration) {
        this.updateTrainingInfo(`Saved! ${count} motion samples for "${gesture}" (${duration}s)`);
        
        // Revert to instruction after 3 seconds
        setTimeout(() => {
            this.updateTrainingInfo(`Motion gesture selected. Click "Start Recording" to capture another ${gesture} sample.`);
        }, 3000);
    }

    /**
     * Toggle the hamburger menu
     */
    toggleMenu() {
        const isHidden = this.elements.menuPanel.classList.contains('hidden');
        if (isHidden) {
            this.openMenu();
        } else {
            this.closeMenu();
        }
    }

    /**
     * Open the hamburger menu
     */
    openMenu() {
        this.elements.menuPanel.classList.remove('hidden');
        this.elements.menuBackdrop.classList.remove('hidden');
        this.elements.menuPanel.classList.add('menu-slide-down');
    }

    /**
     * Close the hamburger menu
     */
    closeMenu() {
        this.elements.menuPanel.classList.add('hidden');
        this.elements.menuBackdrop.classList.add('hidden');
        this.elements.menuPanel.classList.remove('menu-slide-down');
    }

    /**
     * Toggle training metrics panel visibility
     */
    toggleMetrics() {
        this.metricsVisible = !this.metricsVisible;
        
        if (this.elements.trainingMetrics) {
            this.elements.trainingMetrics.style.display = this.metricsVisible ? 'block' : 'none';
        }
        
        if (this.elements.metricsToggle) {
            this.elements.metricsToggle.textContent = this.metricsVisible ? '📊 Hide Metrics' : '📊 Show Metrics';
        }
        
        if (this.metricsVisible) {
            this.initializeConfidenceChart();
        } else {
            this.stopConfidenceChart();
        }
        
        this.updateLayoutCompactness();
        this.closeMenu();
    }

    /**
     * Update training progress during model training
     */
    updateTrainingProgress(epoch, totalEpochs, loss, accuracy) {
        console.log('Updating training progress:', { epoch, totalEpochs, loss, accuracy });
        
        const progress = totalEpochs > 0 ? Math.round((epoch / totalEpochs) * 100) : 0;
        
        if (this.elements.trainingProgress) {
            this.elements.trainingProgress.textContent = `${progress}%`;
        }
        
        if (this.elements.trainingProgressBar) {
            this.elements.trainingProgressBar.style.width = `${progress}%`;
        }
        
        if (this.elements.currentEpoch) {
            this.elements.currentEpoch.textContent = `${epoch}/${totalEpochs}`;
        }
        
        if (this.elements.currentLoss !== null && loss !== undefined && loss !== null) {
            this.elements.currentLoss.textContent = loss.toFixed(4);
        }
        
        if (this.elements.currentAccuracy !== null && accuracy !== undefined && accuracy !== null) {
            this.elements.currentAccuracy.textContent = `${(accuracy * 100).toFixed(1)}%`;
        }
    }

    /**
     * Update training data summary
     */
    updateTrainingDataSummary(trainingStats) {
        if (!this.elements.trainingDataSummary || !trainingStats) return;
        
        const staticGestures = Object.keys(trainingStats.static || {});
        const motionGestures = Object.keys(trainingStats.motion || {});
        const totalSamples = trainingStats.total || 0;
        
        if (totalSamples === 0) {
            this.elements.trainingDataSummary.textContent = 'No training data';
        } else {
            const summaryParts = [];
            
            // Add static gestures
            staticGestures.forEach(gesture => {
                const count = trainingStats.static[gesture] || 0;
                if (count > 0) {
                    summaryParts.push(`${gesture}: ${count}`);
                }
            });
            
            // Add motion gestures
            motionGestures.forEach(gesture => {
                const count = trainingStats.motion[gesture] || 0;
                if (count > 0) {
                    summaryParts.push(`${gesture}: ${count} (motion)`);
                }
            });
            
            this.elements.trainingDataSummary.textContent = `${totalSamples} total samples (${summaryParts.join(', ')})`;
        }
    }

    /**
     * Update before/after training accuracy comparison
     */
    updateAccuracyComparison(beforeAccuracy = null, afterAccuracy = null) {
        console.log('Updating accuracy comparison:', { beforeAccuracy, afterAccuracy });
        
        if (this.elements.beforeAccuracy && beforeAccuracy !== null) {
            this.elements.beforeAccuracy.textContent = `${(beforeAccuracy * 100).toFixed(1)}%`;
        }
        
        if (this.elements.afterAccuracy && afterAccuracy !== null) {
            this.elements.afterAccuracy.textContent = `${(afterAccuracy * 100).toFixed(1)}%`;
            
            // Add visual feedback for improvement
            if (beforeAccuracy !== null && afterAccuracy > beforeAccuracy) {
                this.elements.afterAccuracy.classList.add('text-green-600');
                this.elements.afterAccuracy.classList.remove('text-red-600');
            }
        }
    }

    /**
     * Track confidence for live chart
     */
    trackConfidence(gesture, confidence) {
        // Always track confidence, even if metrics not visible
        const now = Date.now();
        this.confidenceHistory.push({
            timestamp: now,
            gesture: gesture,
            confidence: confidence || 0
        });
        
        // Keep only last 50 entries (about 3-4 seconds at 15fps)
        if (this.confidenceHistory.length > 50) {
            this.confidenceHistory.shift();
        }
        
        // Only update chart if metrics visible
        if (this.metricsVisible) {
            this.updateConfidenceChart();
        }
    }

    /**
     * Initialize confidence chart
     */
    initializeConfidenceChart() {
        if (!this.elements.confidenceChart) return;
        
        const canvas = this.elements.confidenceChart;
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Start animation loop
        this.animateConfidenceChart();
    }

    /**
     * Update confidence chart
     */
    updateConfidenceChart() {
        if (!this.elements.confidenceChart || !this.metricsVisible) return;
        
        const canvas = this.elements.confidenceChart;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        if (this.confidenceHistory.length < 2) return;
        
        // Draw confidence line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.confidenceHistory.forEach((point, index) => {
            const x = (index / (this.confidenceHistory.length - 1)) * width;
            const y = height - (point.confidence * height);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw confidence threshold line at 70%
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, height - (0.7 * height));
        ctx.lineTo(width, height - (0.7 * height));
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw current confidence value
        if (this.confidenceHistory.length > 0) {
            const latest = this.confidenceHistory[this.confidenceHistory.length - 1];
            ctx.fillStyle = latest.confidence > 0.7 ? '#10b981' : '#ef4444';
            ctx.font = '12px monospace';
            ctx.fillText(`${(latest.confidence * 100).toFixed(1)}%`, width - 40, 15);
        }
    }

    /**
     * Animate confidence chart
     */
    animateConfidenceChart() {
        if (this.metricsVisible) {
            this.updateConfidenceChart();
            this.chartAnimationId = requestAnimationFrame(() => this.animateConfidenceChart());
        }
    }

    /**
     * Stop confidence chart animation
     */
    stopConfidenceChart() {
        if (this.chartAnimationId) {
            cancelAnimationFrame(this.chartAnimationId);
            this.chartAnimationId = null;
        }
    }

    /**
     * Reset training metrics
     */
    resetTrainingMetrics() {
        this.updateTrainingProgress(0, 0, null, null);
        this.updateAccuracyComparison(null, null);
        this.confidenceHistory = [];
        
        if (this.elements.trainingProgressBar) {
            this.elements.trainingProgressBar.style.width = '0%';
        }
    }

    /**
     * Toggle landmark debug panel visibility
     */
    toggleDebug() {
        this.debugVisible = !this.debugVisible;
        
        if (this.elements.landmarkDebug) {
            this.elements.landmarkDebug.style.display = this.debugVisible ? 'block' : 'none';
        }
        
        if (this.elements.debugToggle) {
            this.elements.debugToggle.textContent = this.debugVisible ? '🔍 Hide Debug' : '🔍 Show Debug';
        }
        
        this.updateLayoutCompactness();
        this.closeMenu();
    }

    /**
     * Update landmark values display
     */
    updateLandmarkValues(landmarks) {
        if (!this.debugVisible || !this.elements.landmarkValues || !landmarks) return;
        
        const landmarkStrings = landmarks.map((landmark, index) => {
            const x = landmark.x ? landmark.x.toFixed(3) : '0.000';
            const y = landmark.y ? landmark.y.toFixed(3) : '0.000';
            const z = landmark.z ? landmark.z.toFixed(3) : '0.000';
            return `${index.toString().padStart(2, '0')}: (${x}, ${y}, ${z})`;
        });
        
        this.elements.landmarkValues.innerHTML = landmarkStrings.join('<br>');
    }

    /**
     * Update model prediction display
     */
    updateModelPrediction(gesture, confidence) {
        // Always update, not just when debug visible
        if (this.elements.modelPrediction) {
            this.elements.modelPrediction.textContent = gesture || '--';
        }
        
        if (this.elements.modelConfidence) {
            const confidenceText = confidence !== undefined && confidence !== null ? 
                `${(confidence * 100).toFixed(1)}%` : '--';
            this.elements.modelConfidence.textContent = confidenceText;
            
            // Color code confidence
            if (confidence !== undefined && confidence !== null) {
                if (confidence > 0.8) {
                    this.elements.modelConfidence.className = 'font-mono text-xs text-green-600';
                } else if (confidence > 0.5) {
                    this.elements.modelConfidence.className = 'font-mono text-xs text-yellow-600';
                } else {
                    this.elements.modelConfidence.className = 'font-mono text-xs text-red-600';
                }
            }
        }
    }

    /**
     * Update landmark preview visualization
     */
    updateLandmarkPreview(landmarks) {
        if (!this.debugVisible || !this.elements.landmarkPreview || !landmarks) return;
        
        const canvas = this.elements.landmarkPreview;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw hand landmarks
        this.drawHandLandmarks(ctx, landmarks, width, height);
        
        // Draw hand connections
        this.drawHandConnections(ctx, landmarks, width, height);
    }

    /**
     * Draw hand landmarks on preview canvas
     */
    drawHandLandmarks(ctx, landmarks, width, height) {
        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2;
        
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * width;
            const y = landmark.y * height;
            
            // Draw landmark point (bigger for better visibility)
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Draw landmark index for key points
            if (index === 0 || index === 4 || index === 8 || index === 12 || index === 16 || index === 20) {
                ctx.fillStyle = '#1e40af';
                ctx.font = '10px Arial';
                ctx.fillText(index.toString(), x + 5, y - 3);
                ctx.fillStyle = '#3b82f6';
            }
        });
    }

    /**
     * Draw hand connections on preview canvas
     */
    drawHandConnections(ctx, landmarks, width, height) {
        // Hand connection definitions (MediaPipe hand model)
        const connections = [
            // Thumb
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index finger
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle finger
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring finger
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm
            [5, 9], [9, 13], [13, 17]
        ];
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        
        connections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end]) {
                const startX = landmarks[start].x * width;
                const startY = landmarks[start].y * height;
                const endX = landmarks[end].x * width;
                const endY = landmarks[end].y * height;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        });
    }

    /**
     * Clear debug displays when no hand detected
     */
    clearDebugDisplays() {
        if (!this.debugVisible) return;
        
        if (this.elements.landmarkValues) {
            this.elements.landmarkValues.textContent = 'No hand detected';
        }
        
        if (this.elements.landmarkPreview) {
            const ctx = this.elements.landmarkPreview.getContext('2d');
            ctx.clearRect(0, 0, this.elements.landmarkPreview.width, this.elements.landmarkPreview.height);
        }
        
        this.updateModelPrediction(null, null);
    }

    /**
     * Update layout compactness based on visible panels
     */
    updateLayoutCompactness() {
        // Count visible panels
        let visiblePanels = 0;
        
        if (this.metricsVisible) visiblePanels++;
        if (this.debugVisible) visiblePanels++;
        if (this.currentMode === 'train') visiblePanels++; // Training controls
        
        // Get the right panel container
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            // Apply compact layout if 2+ panels are visible
            if (visiblePanels >= 2) {
                rightPanel.classList.add('compact-layout');
                
                // Further reduce spacing if 3+ panels visible
                if (visiblePanels >= 3) {
                    rightPanel.style.gap = '0.5rem';
                    rightPanel.querySelector('.space-y-3')?.classList.remove('space-y-3');
                    rightPanel.querySelector('.space-y-3')?.classList.add('space-y-2');
                }
            } else {
                rightPanel.classList.remove('compact-layout');
                rightPanel.style.gap = '';
            }
        }
    }

    /**
     * Override mode switching to update layout
     */
    switchToMode(mode) {
        const wasTrainingMode = this.currentMode === 'train';
        
        // Call original switch logic
        this.currentMode = mode;
        
        if (mode === 'train') {
            this.elements.trainingPanel.style.display = 'block';
            this.elements.modeToggleBtn.textContent = 'Switch to Detect';
            this.elements.trainingControls.style.display = 'block';
            
            // Show main training controls below video
            if (this.elements.trainingControlsMain) {
                this.elements.trainingControlsMain.style.display = 'block';
            }
        } else {
            this.elements.trainingPanel.style.display = 'none';
            this.elements.modeToggleBtn.textContent = 'Switch to Training';
            this.elements.trainingControls.style.display = 'none';
            
            // Hide all controls
            this.elements.staticControls.style.display = 'none';
            this.elements.motionControls.style.display = 'none';
            
            // Hide main training controls below video
            if (this.elements.trainingControlsMain) {
                this.elements.trainingControlsMain.style.display = 'none';
            }
            if (this.elements.staticControlsMain) {
                this.elements.staticControlsMain.style.display = 'none';
            }
            if (this.elements.motionControlsMain) {
                this.elements.motionControlsMain.style.display = 'none';
            }
        }
        
        // Update layout if training mode changed
        if (wasTrainingMode !== (mode === 'train')) {
            this.updateLayoutCompactness();
        }
        
        // Trigger callback if registered
        if (this.callbacks.onModeChange) {
            this.callbacks.onModeChange(mode);
        }
    }
}