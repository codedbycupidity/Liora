/**
 * TensorFlow.js gesture recognition models for ASL
 * Handles both static and motion gesture recognition
 */

export class GestureModels {
    constructor() {
        this.staticModel = null;
        this.motionModel = null;
        this.gestureLabels = [];
        this.isLoaded = false;
        
        // Check if TensorFlow.js is available
        if (typeof tf === 'undefined') {
            console.warn('TensorFlow.js not available - gesture models disabled');
            this.tfAvailable = false;
        } else {
            console.log('TensorFlow.js available:', tf.version);
            this.tfAvailable = true;
        }
    }

    /**
     * Create a neural network for static gesture recognition
     * Input: 21 hand landmarks * 3 coordinates = 63 features
     */
    createStaticGestureModel(numClasses) {
        if (!this.tfAvailable) {
            console.warn('TensorFlow.js not available, cannot create model');
            return null;
        }
        
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [63], // 21 landmarks * 3 coordinates (x,y,z)
                    units: 128,
                    activation: 'relu',
                    name: 'dense_1'
                }),
                tf.layers.dropout({rate: 0.3}),
                tf.layers.dense({
                    units: 64,
                    activation: 'relu',
                    name: 'dense_2'
                }),
                tf.layers.dropout({rate: 0.2}),
                tf.layers.dense({
                    units: numClasses,
                    activation: 'softmax',
                    name: 'output'
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    /**
     * Create an LSTM network for motion gesture recognition
     * Input: sequence of landmark frames over time
     */
    createMotionGestureModel(sequenceLength, numFeatures, numClasses) {
        const model = tf.sequential({
            layers: [
                tf.layers.lstm({
                    units: 64,
                    inputShape: [sequenceLength, numFeatures], // [frames, 63 features]
                    returnSequences: true,
                    name: 'lstm_1'
                }),
                tf.layers.dropout({rate: 0.3}),
                tf.layers.lstm({
                    units: 32,
                    returnSequences: false,
                    name: 'lstm_2'
                }),
                tf.layers.dropout({rate: 0.2}),
                tf.layers.dense({
                    units: numClasses,
                    activation: 'softmax',
                    name: 'output'
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    /**
     * Prepare static gesture data for training
     */
    prepareStaticTrainingData(trainingData) {
        const features = [];
        const labels = [];
        const labelMap = new Map();
        let labelIndex = 0;

        // Create label mappings
        Object.keys(trainingData).forEach(gesture => {
            if (!labelMap.has(gesture)) {
                labelMap.set(gesture, labelIndex++);
            }
        });

        // Convert data to tensors
        Object.keys(trainingData).forEach(gesture => {
            trainingData[gesture].forEach((landmarks, idx) => {
                // Debug first sample of each gesture
                if (idx === 0) {
                    console.log(`Sample for ${gesture}:`, landmarks);
                    console.log(`Sample type: ${typeof landmarks}, isArray: ${Array.isArray(landmarks)}`);
                }
                
                // Flatten landmarks: array of 21 {x,y,z} objects -> [x1,y1,z1,x2,y2,z2,...]
                let flattened = [];
                try {
                    // Check if landmarks is array of objects with x,y,z
                    if (Array.isArray(landmarks) && landmarks.length === 21) {
                        // Each landmark should have x, y, z properties
                        landmarks.forEach(landmark => {
                            if (landmark && typeof landmark === 'object') {
                                // Extract x, y, z values (handle both lowercase and uppercase)
                                // Ensure values are numbers, not strings
                                const x = parseFloat(landmark.x !== undefined ? landmark.x : (landmark.X !== undefined ? landmark.X : 0));
                                const y = parseFloat(landmark.y !== undefined ? landmark.y : (landmark.Y !== undefined ? landmark.Y : 0));
                                const z = parseFloat(landmark.z !== undefined ? landmark.z : (landmark.Z !== undefined ? landmark.Z : 0));
                                flattened.push(x, y, z);
                            } else if (Array.isArray(landmark)) {
                                // If landmark is already an array [x, y, z]
                                flattened.push(...landmark.map(v => parseFloat(v)));
                            }
                        });
                    } else if (Array.isArray(landmarks)) {
                        // Try to flatten as nested array
                        flattened = landmarks.flat().map(v => parseFloat(v));
                    }
                } catch (e) {
                    console.warn(`Failed to flatten landmarks for ${gesture}:`, e);
                    return;
                }
                
                if (flattened.length === 63) { // Ensure correct dimension
                    features.push(flattened);
                    labels.push(labelMap.get(gesture));
                } else {
                    console.warn(`Invalid landmark dimensions for ${gesture}: expected 63, got ${flattened.length}`);
                    if (idx === 0) {
                        console.log(`First landmark object:`, landmarks[0]);
                    }
                }
            });
        });

        this.gestureLabels = Array.from(labelMap.keys());
        
        console.log(`Prepared ${features.length} training samples for ${labelMap.size} classes`);
        console.log('Sample feature shape:', features[0]?.length);
        console.log('Labels:', Array.from(labelMap.keys()));
        
        if (features.length === 0) {
            throw new Error('No valid training data found - features array is empty');
        }
        
        if (labels.length === 0) {
            throw new Error('No valid training data found - labels array is empty');
        }

        // Convert to proper tensor types
        const xsTensor = tf.tensor2d(features, [features.length, 63], 'float32');
        // Convert labels to one-hot encoding for categorical crossentropy
        const ysTensor = tf.oneHot(tf.tensor1d(labels, 'int32'), labelMap.size);
        
        return {
            xs: xsTensor,
            ys: ysTensor,
            numClasses: labelMap.size,
            labelMap
        };
    }

    /**
     * Prepare motion gesture data for training
     */
    prepareMotionTrainingData(motionData, sequenceLength = 30) {
        const sequences = [];
        const labels = [];
        const labelMap = new Map();
        let labelIndex = 0;

        // Create label mappings
        Object.keys(motionData).forEach(gesture => {
            if (!labelMap.has(gesture)) {
                labelMap.set(gesture, labelIndex++);
            }
        });

        Object.keys(motionData).forEach(gesture => {
            motionData[gesture].forEach(sequence => {
                // Pad or truncate sequence to fixed length
                const paddedSequence = this.padSequence(sequence, sequenceLength);
                sequences.push(paddedSequence);
                labels.push(labelMap.get(gesture));
            });
        });

        return {
            xs: tf.tensor3d(sequences), // [samples, timesteps, features]
            ys: tf.oneHot(tf.tensor1d(labels, 'int32'), labelMap.size),
            numClasses: labelMap.size,
            labelMap
        };
    }

    /**
     * Pad or truncate sequence to target length
     */
    padSequence(sequence, targetLength) {
        const result = [];
        
        for (let i = 0; i < targetLength; i++) {
            if (i < sequence.length) {
                // Use existing frame
                result.push(sequence[i].landmarks.flat());
            } else {
                // Pad with last frame or zeros
                const lastFrame = sequence[sequence.length - 1];
                result.push(lastFrame ? lastFrame.landmarks.flat() : new Array(63).fill(0));
            }
        }
        
        return result;
    }

    /**
     * Train the static gesture model
     */
    async trainStaticModel(trainingData, epochs = 50, onProgress = null) {
        console.log('Preparing static training data...');
        const {xs, ys, numClasses} = this.prepareStaticTrainingData(trainingData);
        
        console.log('Creating static model...');
        this.staticModel = this.createStaticGestureModel(numClasses);
        
        // Verify model was created
        if (!this.staticModel) {
            throw new Error('Failed to create static model');
        }
        
        console.log('Model summary:');
        this.staticModel.summary();
        
        // Get baseline accuracy (random chance)
        const baselineAccuracy = 1 / numClasses;
        
        console.log('Training static model...');
        
        // Create a custom callback class for better control
        const progressCallback = {
            onEpochEnd: async (epoch, logs) => {
                // Wait for logs to be populated
                await tf.nextFrame();
                
                console.log('Training logs:', logs);
                
                // Access loss and accuracy - they might have different names
                const loss = logs?.loss ?? 0;
                const accuracy = logs?.acc ?? logs?.accuracy ?? 0;
                const valLoss = logs?.val_loss ?? 0;
                const valAccuracy = logs?.val_acc ?? logs?.val_accuracy ?? 0;
                
                console.log(`Epoch ${epoch + 1}: loss = ${loss.toFixed(4)}, accuracy = ${accuracy.toFixed(4)}`);
                
                // Call progress callback if provided
                if (onProgress) {
                    onProgress({
                        epoch: epoch + 1,
                        totalEpochs: epochs,
                        loss: loss,
                        accuracy: accuracy,
                        valLoss: valLoss,
                        valAccuracy: valAccuracy,
                        baselineAccuracy: baselineAccuracy
                    });
                }
            }
        };
        
        const history = await this.staticModel.fit(xs, ys, {
            epochs: epochs,
            validationSplit: 0.2,
            shuffle: true,
            callbacks: progressCallback
        });
        
        // Clean up tensors
        xs.dispose();
        ys.dispose();
        
        return history;
    }

    /**
     * Train the motion gesture model
     */
    async trainMotionModel(motionData, epochs = 50, sequenceLength = 30) {
        console.log('Preparing motion training data...');
        const {xs, ys, numClasses} = this.prepareMotionTrainingData(motionData, sequenceLength);
        
        console.log('Creating motion model...');
        this.motionModel = this.createMotionGestureModel(sequenceLength, 63, numClasses);
        
        console.log('Training motion model...');
        const history = await this.motionModel.fit(xs, ys, {
            epochs: epochs,
            validationSplit: 0.2,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    // Safely access loss and accuracy with fallbacks
                    const loss = logs.loss !== undefined ? logs.loss : 0;
                    const accuracy = logs.acc !== undefined ? logs.acc : (logs.accuracy !== undefined ? logs.accuracy : 0);
                    
                    console.log(`Epoch ${epoch + 1}: loss = ${loss.toFixed(4)}, accuracy = ${accuracy.toFixed(4)}`);
                }
            }
        });
        
        // Clean up tensors
        xs.dispose();
        ys.dispose();
        
        return history;
    }

    /**
     * Predict static gesture from landmarks
     */
    async predictStatic(landmarks) {
        if (!this.staticModel) {
            throw new Error('Static model not trained');
        }

        const flattened = landmarks.flat();
        if (flattened.length !== 63) {
            throw new Error('Invalid landmark data');
        }

        const prediction = this.staticModel.predict(tf.tensor2d([flattened]));
        const probabilities = await prediction.data();
        const predictedClass = tf.argMax(prediction, 1).dataSync()[0];
        
        prediction.dispose();
        
        return {
            gesture: this.gestureLabels[predictedClass],
            confidence: probabilities[predictedClass],
            probabilities: Array.from(probabilities)
        };
    }

    /**
     * Predict motion gesture from sequence
     */
    async predictMotion(sequence, sequenceLength = 30) {
        if (!this.motionModel) {
            throw new Error('Motion model not trained');
        }

        const paddedSequence = this.padSequence(sequence, sequenceLength);
        const prediction = this.motionModel.predict(tf.tensor3d([paddedSequence]));
        const probabilities = await prediction.data();
        const predictedClass = tf.argMax(prediction, 1).dataSync()[0];
        
        prediction.dispose();
        
        return {
            gesture: this.gestureLabels[predictedClass],
            confidence: probabilities[predictedClass],
            probabilities: Array.from(probabilities)
        };
    }

    /**
     * Save models to browser storage
     */
    async saveModels() {
        if (this.staticModel) {
            await this.staticModel.save('localstorage://static-gesture-model');
        }
        if (this.motionModel) {
            await this.motionModel.save('localstorage://motion-gesture-model');
        }
        
        // Save gesture labels
        localStorage.setItem('gesture-labels', JSON.stringify(this.gestureLabels));
    }

    /**
     * Load models from browser storage
     */
    async loadModels() {
        if (!this.tfAvailable) {
            console.warn('TensorFlow.js not available, cannot load models');
            return;
        }
        
        try {
            this.staticModel = await tf.loadLayersModel('localstorage://static-gesture-model');
            this.motionModel = await tf.loadLayersModel('localstorage://motion-gesture-model');
            this.gestureLabels = JSON.parse(localStorage.getItem('gesture-labels') || '[]');
            this.isLoaded = true;
            console.log('Models loaded successfully');
        } catch (error) {
            console.warn('Could not load saved models:', error.message);
            this.isLoaded = false;
        }
    }
}