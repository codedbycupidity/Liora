# Liora - Advanced ASL Gesture Recognition Application

A powerful desktop application that uses computer vision and machine learning to recognize American Sign Language (ASL) gestures in real-time. Built with Electron, MediaPipe, TensorFlow.js, and AWS S3 integration.

## 🌟 Key Features

### Real-Time Hand Tracking
- **MediaPipe Holistic Integration**: Tracks face, pose, and hands simultaneously
- **21 Hand Landmarks**: Precise 3D coordinate tracking for each hand point
- **Color-coded Finger Visualization**:
  - Thumb: Red
  - Index: Teal
  - Middle: Blue
  - Ring: Yellow
  - Pinky: Purple
- **Bounding Box Display**: Visual feedback around detected hands

### Dual Recognition Systems
1. **Legacy Pattern Recognition**: Pre-configured detection for immediate use
2. **TensorFlow.js Neural Network**: Trainable ML model for personalized accuracy

### Machine Learning Capabilities
- **In-Browser Training**: Train custom models without server requirements
- **AWS S3 Integration**: Cloud storage for training data backup and sharing
- **Auto-Training**: Automatically trains when loading S3 data
- **Model Persistence**: Saves trained models to browser localStorage
- **93%+ Accuracy**: Achieved with proper training data

### Advanced UI Panels
- **Training Metrics Dashboard**:
  - Real-time loss and accuracy graphs
  - Epoch progress tracking
  - Before/after accuracy comparison
- **Live Landmarks Panel**:
  - 21 landmark coordinates in real-time
  - Visual hand skeleton preview (300x200px canvas)
  - Model predictions with confidence scores
- **Confidence Visualization**:
  - Live confidence chart over time
  - 70% threshold indicator
  - Color-coded confidence levels

## 🤟 Supported Gestures

### Static Gestures (Hand Poses)
- **I Love You**: Thumb, index, and pinky extended
- **Good**: Thumbs up
- **Bad**: Thumbs down  
- **I/I'm**: Index finger pointing up
- **No**: Index and middle fingers extended
- **Okay**: Thumb and index forming circle

### Motion Gestures (Dynamic)
- **Hello**: Side-to-side waving motion with open palm
- **Yes**: Up/down knocking motion with closed fist
- **Thank You**: Hand movement from chin forward/down (uses face tracking)

## 🚀 Installation

### Prerequisites
- Node.js v14 or higher
- npm or yarn
- Git
- AWS account (optional, for S3 features)

### Setup Steps

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/liora.git
cd liora
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure AWS S3 (Optional)**:
Create a `.env` file in the root directory:
```env
AWS_REGION=us-east-1
S3_BUCKET=liora-training-data
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

4. **Configure S3 CORS** (if using S3):
Apply the configuration from `s3-cors-config.json` to your S3 bucket:
```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://s3-cors-config.json
```

## 📖 Usage Guide

### Starting the Application
```bash
npm start
```

### Training Mode

#### For Static Gestures:
1. Toggle to "Training Mode" using the switch
2. Select a gesture from the dropdown menu
3. Position your hand in the gesture
4. Click "Capture Sample"
5. Repeat 10-20 times for best results

#### For Motion Gestures:
1. Select a motion gesture (Hello, Yes, Thank You)
2. Click "Start Recording"
3. Perform the motion
4. Click "Stop Recording"
5. Capture multiple variations

### Detection Mode
1. Switch to "Detect Mode"
2. If training data exists, models auto-train (watch the progress)
3. Show your hand to the camera for real-time recognition
4. View confidence scores and predictions

### S3 Cloud Features
- **Save to Cloud**: Menu → "Export to S3"
- **Load from Cloud**: Menu → "Load from S3"
- **Configure S3**: Menu → "S3 Config"
- **Clear Local Data**: Menu → "Clear Samples"

## 🎛️ UI Components

### Main Video Panel
- Live camera feed with overlay
- Hand skeleton visualization
- Bounding box with gesture label
- Capture button (training mode)

### Right Panel (Collapsible)
- **Mode Switch**: Toggle between Detect/Train
- **Gesture Selector**: Dropdown for training
- **Training Info**: Sample counts and instructions

### Debug Panels (Toggle via Menu)
- **Training Metrics**: Loss, accuracy, progress
- **Live Landmarks**: Coordinates and preview
- **Training Data Summary**: Sample distribution

### Status Bar
- Real-time status messages
- Training progress updates
- Error notifications

## 🏗️ Architecture

### Technology Stack
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Desktop**: Electron
- **Computer Vision**: MediaPipe Holistic
- **Machine Learning**: TensorFlow.js
- **Cloud Storage**: AWS S3
- **Local Storage**: Browser localStorage

### Neural Network Architecture
```
Input Layer: 63 features (21 landmarks × 3 coordinates)
Hidden Layer 1: 128 units (ReLU) + Dropout(0.3)
Hidden Layer 2: 64 units (ReLU) + Dropout(0.2)
Output Layer: N classes (Softmax)
```

### Project Structure
```
liora/
├── app.js                    # Main application controller
├── index.html               # UI layout and structure
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables
├── s3-cors-config.json    # S3 CORS configuration
└── modules/
    ├── camera.js          # Camera management
    ├── gesture-models.js  # TensorFlow.js model definitions
    ├── gesture-recognition.js # Recognition logic
    ├── motion.js          # Motion gesture detection
    ├── s3-storage.js      # AWS S3 integration
    ├── training.js        # Training data management
    └── ui.js              # UI controllers and updates
```

## 🔧 Development

### Adding New Gestures

1. **Static Gesture**:
   - Add to gesture array in `index.html`
   - Collect training samples
   - Retrain model

2. **Motion Gesture**:
   - Add to motion gestures array
   - Implement detection logic in `motion.js`
   - Update `isMotionGesture()` in `gesture-recognition.js`

### Performance Optimization
- Good lighting improves tracking accuracy
- Keep hand 1-2 feet from camera
- Capture samples from different angles
- Use 15-20 samples minimum per gesture

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Camera not working | Check browser/system camera permissions |
| S3 400 errors | Verify CORS configuration on bucket |
| Low accuracy | Capture more diverse training samples |
| Gestures not detecting | Ensure good lighting and full hand visibility |
| Training shows 0% | Check console for data format errors |

### Debug Mode
Press F12 to open developer console for detailed logs and error messages.

## 📊 Performance Metrics

- **Detection Speed**: 15-30 FPS
- **Training Time**: ~30 seconds for 150 samples
- **Accuracy**: 93%+ with proper training
- **Supported Browsers**: Chrome, Edge (Chromium-based)

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **MediaPipe Team** - Hand tracking technology
- **TensorFlow.js Team** - Browser-based machine learning
- **AWS** - S3 cloud storage services
- **ASL Community** - Gesture references and validation

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Include console logs when reporting bugs

---

**Note**: This application requires a webcam and modern browser with WebGL support. Performance may vary based on hardware capabilities.