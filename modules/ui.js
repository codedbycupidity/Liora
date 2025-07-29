export class UIManager {
    constructor() {
        this.elements = {
            statusText: document.getElementById('statusText'),
            gestureResult: document.getElementById('gestureResult'),
            startButton: document.getElementById('startButton'),
            detectModeBtn: document.getElementById('detectModeBtn'),
            trainModeBtn: document.getElementById('trainModeBtn'),
            trainingPanel: document.getElementById('trainingPanel'),
            captureBtn: document.getElementById('captureBtn'),
            trainingInfo: document.getElementById('trainingInfo'),
            confidenceFill: document.getElementById('confidenceFill'),
            confidenceMeter: document.querySelector('.confidence-meter'),
            exportGestureBtn: document.getElementById('exportGestureBtn'),
            exportAllBtn: document.getElementById('exportAllBtn')
        };
        
        this.currentMode = 'detect';
        this.selectedGesture = null;
        this.callbacks = {};
    }

    setMode(mode) {
        this.currentMode = mode;
        if (mode === 'detect') {
            this.elements.detectModeBtn.classList.add('active');
            this.elements.trainModeBtn.classList.remove('active');
            this.elements.trainingPanel.style.display = 'none';
        } else {
            this.elements.trainModeBtn.classList.add('active');
            this.elements.detectModeBtn.classList.remove('active');
            this.elements.trainingPanel.style.display = 'block';
        }
    }

    updateStatus(text, className = '') {
        this.elements.statusText.textContent = text;
        this.elements.statusText.className = className;
    }

    updateGestureResult(gesture, confidence = null) {
        if (gesture && gesture !== 'None') {
            this.elements.gestureResult.textContent = `✋ "${gesture}" detected!`;
            if (confidence !== null) {
                this.elements.confidenceMeter.style.display = 'block';
                this.elements.confidenceFill.style.width = `${confidence * 100}%`;
            }
        } else {
            this.elements.gestureResult.textContent = '';
            this.elements.confidenceMeter.style.display = 'none';
        }
    }

    updateTrainingInfo(text) {
        this.elements.trainingInfo.textContent = text;
    }

    showTrainingCapture(gesture, count) {
        this.updateTrainingInfo(`Captured! ${count} samples for "${gesture}"`);
        setTimeout(() => {
            this.updateTrainingInfo(`${count} samples captured for "${gesture}"`);
        }, 2000);
    }

    setupEventListeners() {
        this.elements.startButton.addEventListener('click', () => {
            if (this.callbacks.onStartCamera) {
                this.callbacks.onStartCamera();
            }
        });

        this.elements.detectModeBtn.addEventListener('click', () => {
            this.setMode('detect');
            if (this.callbacks.onModeChange) {
                this.callbacks.onModeChange('detect');
            }
        });

        this.elements.trainModeBtn.addEventListener('click', () => {
            this.setMode('train');
            if (this.callbacks.onModeChange) {
                this.callbacks.onModeChange('train');
            }
        });

        document.querySelectorAll('.gesture-button').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gesture-button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedGesture = btn.dataset.gesture;
                this.elements.captureBtn.disabled = false;
                
                if (this.callbacks.onGestureSelect) {
                    this.callbacks.onGestureSelect(this.selectedGesture);
                }
            });
        });

        this.elements.captureBtn.addEventListener('click', () => {
            if (this.callbacks.onCapture && this.selectedGesture) {
                this.callbacks.onCapture(this.selectedGesture);
            }
        });

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

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    disableStartButton() {
        this.elements.startButton.disabled = true;
    }

    enableStartButton() {
        this.elements.startButton.disabled = false;
    }

    getMode() {
        return this.currentMode;
    }

    getSelectedGesture() {
        return this.selectedGesture;
    }
}