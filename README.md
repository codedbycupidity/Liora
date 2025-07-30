# ASL Gesture Recognition App

A web-based application that uses your camera to detect and recognize multiple ASL (American Sign Language) gestures with real-time hand tracking, bounding box visualization, and machine learning capabilities for personalized accuracy.

## Features

- Real-time hand tracking using MediaPipe Holistic (face, pose, and hands)
- Color-coded finger visualization:
  - Thumb: Red
  - Index: Teal
  - Middle: Blue
  - Ring: Yellow
  - Pinky: Purple
- Motion tracking for movement-based gestures:
  - **Thank You**: Tracks hand movement from chin forward/down
  - **Yes**: Detects up/down knocking motion with fist
  - **Hello**: Detects side-to-side waving motion
- Face tracking for accurate chin position detection (Thank You gesture)
- Gesture persistence - last gesture stays displayed until new one detected
- Minimum display time for motion gestures (prevents rapid switching)
- Machine learning training mode to improve accuracy with your hand gestures
- Confidence meter showing detection accuracy
- Visual feedback during motion gestures
- Bounding box with gesture labels
- Automatic loading of training data from previous sessions
- Export/import training data for backup and sharing
- Persistent storage using both localStorage and file system
- Clean, minimalist interface with blue accent colors

## Supported Gestures

### 1. **Hello** 👋
- **Hand Position**: Open palm
- **Fingers**: All fingers extended and spread apart
- **Movement**: Wave side to side (1+ waves)
- **Motion Detection**: Tracks horizontal movement (left-right)
- **Note**: Only shows "Hello" after completing wave motion

### 2. **I Love You** 🤟
- **Hand Position**: Face palm forward
- **Fingers**: 
  - Thumb: Extended outward
  - Index: Extended upward
  - Middle: Folded down
  - Ring: Folded down
  - Pinky: Extended upward
- **Note**: Forms the letters I, L, and Y simultaneously

### 3. **Good/Thumbs Up** 👍
- **Hand Position**: Fist with thumb clearly extended upward
- **Fingers**: All fingers tightly folded into palm
- **Thumb**: Fully extended upward and away from fist
- **Orientation**: Thumb must be significantly above the hand base
- **Note**: Requires clear thumb extension to distinguish from a regular fist

### 4. **Bad/Thumbs Down** 👎
- **Hand Position**: Fist with thumb clearly extended downward
- **Fingers**: All fingers tightly folded into palm
- **Thumb**: Fully extended downward and away from fist
- **Orientation**: Thumb must be significantly below the hand base
- **Note**: Requires clear thumb extension to distinguish from a regular fist

### 5. **Yes** ✊
- **Hand Position**: Closed fist
- **Fingers**: All fingers folded tightly into palm
- **Thumb**: Must be folded close to fingers (not extended)
- **Movement**: Up and down knocking motion (2+ bounces)
- **Motion Detection**: Only displays when knocking motion is completed
- **Display Duration**: Shows for 1 second minimum after motion detected
- **Note**: Static fist alone will not trigger - requires knocking motion

### 6. **I/I'm/Me** ☝️
- **Hand Position**: Pointing to self
- **Fingers**:
  - Index: Extended straight up
  - Other fingers: Folded into palm
- **Direction**: Index finger pointing upward/toward self
- **Note**: In conversation, would point to chest

### 7. **No** ✌️
- **Hand Position**: Two fingers extended
- **Fingers**:
  - Index: Extended
  - Middle: Extended
  - Others: Folded
- **Movement**: In ASL, fingers tap together with thumb
- **Note**: Similar to peace sign

### 8. **Okay/OK** 👌
- **Hand Position**: Circle with thumb and index
- **Fingers**:
  - Thumb tip touching index finger tip
  - Middle, ring, pinky: Extended upward
- **Shape**: Forms an "O" with thumb and index

### 9. **Thank You** 🙏
- **Hand Position**: Open hand at chin
- **Fingers**: All fingers extended (flat hand)
- **Movement**: Hand moves forward and down from chin
- **Motion Detection**: Uses face tracking to detect actual chin position
- **Note**: Requires face to be visible for accurate chin detection

## How to Run

### Desktop App (Electron)

#### Installation
```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Or with developer tools open
npm run dev
```

#### Building the Desktop App
```bash
# Build for your current platform
npm run build

# Build for specific platforms
npm run build-mac    # macOS
npm run build-win    # Windows  
npm run build-linux  # Linux

# The built app will be in the 'dist' folder
```

#### Features in Desktop Mode
- Native file dialogs for import/export
- Menu bar with keyboard shortcuts
- Training data stored in app data folder
- Runs without external dependencies

### Web Browser Setup
1. Navigate to the project directory:
   ```bash
   cd asl-gesture-app
   ```

2. Start a local web server:
   ```bash
   python3 -m http.server 8000
   ```
   
   Or if you have Node.js installed:
   ```bash
   npx http-server -p 8000
   ```

3. Open your browser and go to `http://localhost:8000`

4. Click "Start Camera" and allow camera permissions when prompted

### Full Setup (With Training Data Persistence)
1. Start the Python server for training data storage:
   ```bash
   python3 server.py
   ```
   This enables:
   - Automatic loading of existing training data
   - Saving new training samples to disk
   - Persistent storage in the `training-data/` folder

2. Open your browser and go to `http://localhost:8000`

3. The app will automatically load any existing training data from previous sessions

## Technical Details

### Architecture
The app is built with a modular architecture:
- `app.js` - Main application coordinator
- `modules/gestures.js` - Gesture detection algorithms
- `modules/visualization.js` - Hand tracking visualization
- `modules/training.js` - Machine learning and data management
- `modules/camera.js` - MediaPipe camera integration
- `modules/ui.js` - User interface management
- `modules/motion.js` - Motion tracking for movement-based gestures
- `server.py` - Python server for training data persistence

### Hand Tracking
The app uses MediaPipe Holistic for comprehensive tracking:
- 21 hand landmarks tracked in 3D (x, y, z coordinates)
- Face landmarks for accurate chin position detection
- Pose landmarks for body context (optional)
- Finger extension/flexion determined by comparing tip and joint positions
- Bounding box calculated from min/max landmark coordinates
- Colored connections show hand skeleton structure
- Each finger has a unique color for easy identification

### Gesture Recognition
1. **Rule-based detection**: Primary detection using geometric analysis of hand landmarks
2. **ML Enhancement**: Training data improves accuracy by:
   - Calculating distance between current pose and stored samples
   - Converting distance to confidence score (0-1)
   - Lower distance = higher confidence
3. **Motion Tracking**: For movement-based gestures:
   - Tracks hand position history over time
   - Detects motion patterns (up/down for Yes, forward/down for Thank You)
   - Uses state machines to track gesture phases
   - Provides real-time feedback during motion
   - **Accurate Chin Detection**: When face is visible, uses actual chin position (landmark 152)
   - Falls back to estimated position (upper 40% of frame) when face not detected

## Browser Compatibility

Works best in modern browsers with WebRTC support:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Training Mode

The app includes a training mode to improve gesture recognition accuracy:

1. Click "Train Mode" button
2. Select a gesture from the list
3. Make the gesture with your hand
4. Click "Capture Sample" to save it
5. Repeat for better accuracy (5-10 samples recommended per gesture)

### Data Storage
Training data is stored in two ways:
1. **localStorage**: Immediate access, survives page refreshes
2. **File System**: When server.py is running, samples are saved to `training-data/` folder
   - Each gesture has its own folder
   - Samples saved as individual JSON files
   - Automatically loaded on app startup

### Exporting Training Data
You can export training data for backup or sharing:
- "Export Gesture" - Downloads current gesture's training data
- "Export All Data" - Downloads all training data as JSON

## Privacy

All processing happens locally:
- Video processing occurs entirely in your browser
- No video data is sent to external servers
- Training data is stored locally (browser + optional local file system)
- The Python server (if used) only saves to your local machine

## Tips for Better Recognition

1. **Lighting**: Ensure good lighting on your hand
2. **Background**: Use a contrasting background
3. **Distance**: Keep hand at comfortable distance from camera
4. **Training**: Capture 5-10 samples per gesture for best results
5. **Orientation**: Try to maintain consistent hand orientation
