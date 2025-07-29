#!/usr/bin/env python3
"""
Simple server for ASL Gesture App with training data saving capability
Run with: python3 server.py
"""

import os
import json
import http.server
import socketserver
from datetime import datetime
from urllib.parse import urlparse, parse_qs

PORT = 8000
TRAINING_DATA_DIR = "training-data"

class ASLRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/training-data':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                gesture = data.get('gesture', 'unknown')
                timestamp = data.get('timestamp', datetime.now().isoformat())
                
                # Create gesture directory if it doesn't exist
                gesture_dir = os.path.join(TRAINING_DATA_DIR, gesture.replace('/', '_'))
                os.makedirs(gesture_dir, exist_ok=True)
                
                # Save the sample
                filename = f"{gesture}_{timestamp.replace(':', '-')}.json"
                filepath = os.path.join(gesture_dir, filename)
                
                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'file': filepath}).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    # Create training data directory if it doesn't exist
    os.makedirs(TRAINING_DATA_DIR, exist_ok=True)
    
    Handler = ASLRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print(f"Training data will be saved to: {os.path.abspath(TRAINING_DATA_DIR)}/")
        print("Press Ctrl-C to stop")
        httpd.serve_forever()