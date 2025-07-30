#!/usr/bin/env python3
"""
Electron-compatible server for ASL Gesture App
Handles training data in the user's app data directory
"""

import os
import json
import http.server
import socketserver
import sys
from datetime import datetime
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8000

# Determine the correct directory for training data
if hasattr(sys, '_MEIPASS'):
    # Running as a bundled exe
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # Running as a script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# For Electron, we want to use the app's user data directory
# This will be passed as an argument or use current directory as fallback
if len(sys.argv) > 1:
    TRAINING_DATA_DIR = os.path.join(sys.argv[1], "training-data")
else:
    TRAINING_DATA_DIR = os.path.join(BASE_DIR, "training-data")

class ASLRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom request handler for Electron app
    """
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve files from
        super().__init__(*args, directory=BASE_DIR, **kwargs)
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/training-data/load':
            # API endpoint to load all training data from disk
            try:
                all_training_data = {}
                
                if os.path.exists(TRAINING_DATA_DIR):
                    # Iterate through gesture folders
                    for gesture_folder in os.listdir(TRAINING_DATA_DIR):
                        gesture_path = os.path.join(TRAINING_DATA_DIR, gesture_folder)
                        
                        if os.path.isdir(gesture_path):
                            # Convert folder name back to gesture name
                            gesture_name = gesture_folder.replace('_', '/')
                            all_training_data[gesture_name] = []
                            
                            # Read all JSON files in the gesture folder
                            for filename in os.listdir(gesture_path):
                                if filename.endswith('.json'):
                                    filepath = os.path.join(gesture_path, filename)
                                    try:
                                        with open(filepath, 'r') as f:
                                            data = json.load(f)
                                            if 'landmarks' in data:
                                                all_training_data[gesture_name].append(data['landmarks'])
                                    except Exception as e:
                                        print(f"Error reading {filepath}: {e}")
                
                # Send successful response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(all_training_data).encode())
                
            except Exception as e:
                # Send error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            # Default file serving
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/training-data':
            # API endpoint to save training data
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Parse JSON data
                data = json.loads(post_data)
                gesture = data.get('gesture', 'unknown')
                timestamp = data.get('timestamp', datetime.now().isoformat())
                
                # Create directories if they don't exist
                gesture_dir = os.path.join(TRAINING_DATA_DIR, gesture.replace('/', '_'))
                os.makedirs(gesture_dir, exist_ok=True)
                
                # Save the sample
                filename = f"{gesture}_{timestamp.replace(':', '-')}.json"
                filepath = os.path.join(gesture_dir, filename)
                
                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'file': filepath}).encode())
                
            except Exception as e:
                # Send error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            # Unknown endpoint
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Override to suppress logs in production"""
        if '--verbose' in sys.argv:
            super().log_message(format, *args)

if __name__ == "__main__":
    # Create training data directory if it doesn't exist
    os.makedirs(TRAINING_DATA_DIR, exist_ok=True)
    
    # Try to find an available port if default is taken
    port = PORT
    max_attempts = 10
    
    for attempt in range(max_attempts):
        try:
            # Set up and start the server
            Handler = ASLRequestHandler
            with socketserver.TCPServer(("", port), Handler) as httpd:
                print(f"Server running at http://localhost:{port}/")
                print(f"Training data directory: {os.path.abspath(TRAINING_DATA_DIR)}")
                print("Ready for connections...")
                sys.stdout.flush()  # Ensure output is sent to Electron
                
                # Run server until interrupted
                httpd.serve_forever()
                break
        except OSError as e:
            if e.errno == 48:  # Address already in use
                port += 1
                if attempt < max_attempts - 1:
                    print(f"Port {port-1} in use, trying {port}...")
                    continue
            raise