# ASL Gesture Recognition App

A web-based application that uses your camera to detect and recognize multiple ASL (American Sign Language) gestures with real-time hand tracking and bounding box visualization.

## Features

- Real-time hand tracking using MediaPipe with 21 landmark points
- Bounding box visualization around detected hands with gesture labels
- Recognition of multiple ASL gestures:
  - **Hello**: Open palm with all fingers extended
  - **I Love You**: Thumb, index, and pinky extended; middle and ring fingers down
  - **Good**: Thumbs up with other fingers folded
  - **Bad**: Thumbs down with other fingers folded
- Visual feedback with hand landmarks and skeletal connections
- Simple and intuitive user interface

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

## Privacy

All processing happens locally in your browser. No video data is sent to any server.# asl-reader
