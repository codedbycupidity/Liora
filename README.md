# ASL Gesture Recognition App

A web-based application that uses your camera to detect and recognize multiple ASL (American Sign Language) gestures with real-time hand tracking and bounding box visualization.

## Features

- Real-time hand tracking using MediaPipe with 21 landmark points
- Color-coded finger visualization:
  - Thumb: Red
  - Index: Teal
  - Middle: Blue
  - Ring: Yellow
  - Pinky: Purple
- Machine learning training mode to improve accuracy with your hand gestures
- Confidence meter showing detection accuracy
- Bounding box with gesture labels

## Supported Gestures

### 1. **Hello** 👋
- **Hand Position**: Open palm facing forward
- **Fingers**: All fingers extended and spread apart
- **Palm**: Facing the camera
- **Movement**: Can add a gentle wave motion

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
- **Hand Position**: Fist with thumb up
- **Fingers**: All fingers folded into palm
- **Thumb**: Extended upward
- **Orientation**: Thumb pointing to the sky

### 4. **Bad/Thumbs Down** 👎
- **Hand Position**: Fist with thumb down
- **Fingers**: All fingers folded into palm
- **Thumb**: Extended downward
- **Orientation**: Thumb pointing to the ground

### 5. **Yes** ✊
- **Hand Position**: Closed fist
- **Fingers**: All fingers and thumb folded tightly
- **Movement**: In ASL, typically moved up and down like knocking
- **Note**: Static detection shows closed fist

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

## How to Run

1. Navigate to the project directory:
   ```bash
   cd asl-gesture-app
   ```

2. Start a local web server. You can use Python's built-in server:
   ```bash
   python3 -m http.server 8000
   ```
   
   Or if you have Node.js installed:
   ```bash
   npx http-server -p 8000
   ```

3. Open your browser and go to `http://localhost:8000`

4. Click "Start Camera" and allow camera permissions when prompted

5. Try making different gestures to see them detected in real-time

## Technical Details

The app uses MediaPipe Hands for real-time hand tracking and landmark detection. Each gesture is recognized by analyzing the positions and relationships between 21 hand landmarks:
- Finger extension/flexion is determined by comparing tip and joint positions
- The bounding box is calculated from the minimum and maximum landmark coordinates
- Green connections show the hand skeleton structure
- Red dots indicate individual landmark points

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

Training data is stored locally in your browser and persists between sessions.

## Privacy

All processing happens locally in your browser. No video data is sent to any server.
