const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const log = require('electron-log');

const WEBSITE_URL = 'https://trustpay.co.ke/';

log.initialize();
log.info('Application starting...');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'TrustPay KE',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            zoomFactor: 1.0
        },
        show: false,
        backgroundColor: '#0d9488'
    });

    // Disable zoom
    mainWindow.webContents.setZoomFactor(1.0);
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
    mainWindow.webContents.setLayoutZoomLevelLimits(0, 0);

    // Block external navigation
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin !== new URL(WEBSITE_URL).origin) {
            event.preventDefault();
            require('electron').shell.openExternal(url);
        }
    });

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        log.info('Main window shown');
    });

    // Load the website
    mainWindow.loadURL(WEBSITE_URL);

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    log.info('Window created and loading URL:', WEBSITE_URL);
}

// Handle no internet connection
function showNoInternet() {
    if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, 'no-internet.html'));
    }
}

// Check internet connectivity
function checkInternet() {
    const { net } = require('electron');
    return net.isOnline();
}

app.whenReady().then(() => {
    createWindow();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
