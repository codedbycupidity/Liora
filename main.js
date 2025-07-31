/**
 * Electron main process
 * Manages application lifecycle and creates browser windows
 */

const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;
let pythonProcess;

// Enable live reload for Electron in development
const isDev = process.argv.includes('--dev');

/**
 * Create the main application window
 */
function createWindow() {
    // Create the browser window with Photo Booth-like dimensions
    mainWindow = new BrowserWindow({
        width: 860,      // Photo Booth default width
        height: 640,     // Photo Booth default height
        resizable: false, // Fixed size like Photo Booth
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        backgroundColor: '#ffffff',
        // Make window stay on top (optional, Photo Booth doesn't do this by default)
        // alwaysOnTop: true,
        // Center the window on screen
        center: true
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

/**
 * Start the Python server for training data management
 */
function startPythonServer() {
    // Use electron-compatible server
    const serverPath = isDev 
        ? path.join(__dirname, 'server-electron.py')
        : path.join(process.resourcesPath, 'server-electron.py');

    // Fallback to regular server if electron version doesn't exist
    const fallbackPath = isDev 
        ? path.join(__dirname, 'server.py')
        : path.join(process.resourcesPath, 'server.py');

    const finalServerPath = fs.existsSync(serverPath) ? serverPath : fallbackPath;

    // Check if server exists
    if (!fs.existsSync(finalServerPath)) {
        console.error('Python server not found at:', finalServerPath);
        return;
    }

    // Get app data path for storing training data
    const userDataPath = app.getPath('userData');

    // Spawn Python process with user data path as argument
    pythonProcess = spawn('python3', [finalServerPath, userDataPath], {
        cwd: isDev ? __dirname : process.resourcesPath
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python server: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python server error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python server exited with code ${code}`);
        pythonProcess = null;
    });
}

/**
 * Stop the Python server
 */
function stopPythonServer() {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
}

/**
 * Create application menu
 */
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Export Training Data',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export-data');
                    }
                },
                {
                    label: 'Import Training Data',
                    accelerator: 'CmdOrCtrl+I',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'JSON Files', extensions: ['json'] }
                            ]
                        });

                        if (!result.canceled && result.filePaths.length > 0) {
                            mainWindow.webContents.send('menu-import-data', result.filePaths[0]);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Actual Size',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.setZoomLevel(0);
                    }
                },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About ASL Gesture Recognition',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About ASL Gesture Recognition',
                            message: 'ASL Gesture Recognition',
                            detail: 'Learn American Sign Language with real-time hand tracking and machine learning.\n\nBuilt with Electron, MediaPipe, and love.',
                            buttons: ['OK']
                        });
                    }
                },
                {
                    label: 'View on GitHub',
                    click: () => {
                        shell.openExternal('https://github.com/yourusername/asl-gesture-app');
                    }
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { label: 'About ' + app.getName(), selector: 'orderFrontStandardAboutPanel:' },
                { type: 'separator' },
                { label: 'Services', submenu: [] },
                { type: 'separator' },
                { label: 'Hide ' + app.getName(), accelerator: 'Command+H', selector: 'hide:' },
                { label: 'Hide Others', accelerator: 'Command+Shift+H', selector: 'hideOtherApplications:' },
                { label: 'Show All', selector: 'unhideAllApplications:' },
                { type: 'separator' },
                { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers for renderer process communication
ipcMain.handle('get-app-path', () => {
    return app.getPath('userData');
});

ipcMain.handle('show-save-dialog', async (event, defaultFileName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultFileName,
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ]
    });
    return result;
});

// App event handlers
app.whenReady().then(() => {
    createWindow();
    createMenu();
    startPythonServer();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopPythonServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopPythonServer();
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // In development, ignore certificate errors
    if (isDev) {
        event.preventDefault();
        callback(true);
    } else {
        // In production, use default behavior
        callback(false);
    }
});