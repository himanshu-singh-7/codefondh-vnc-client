/**
 * Codefondh VNC Client
 * Web-based VNC client using noVNC
 */

// Global variables
let rfb = null;
let isConnected = false;
let isFullscreen = false;

// DOM Elements
const elements = {
    host: null,
    port: null,
    password: null,
    encrypt: null,
    resize: null,
    viewOnly: null,
    btnConnect: null,
    btnDisconnect: null,
    btnSettings: null,
    btnFullscreen: null,
    toggleAdvanced: null,
    advancedSettings: null,
    connectionPanel: null,
    screenContainer: null,
    screen: null,
    loadingOverlay: null,
    statusIndicator: null,
    alert: null,
    alertText: null
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    loadURLParameters();
    checkRFBAvailability();
});

// Initialize DOM elements
function initializeElements() {
    elements.host = document.getElementById('host');
    elements.port = document.getElementById('port');
    elements.password = document.getElementById('password');
    elements.encrypt = document.getElementById('encrypt');
    elements.resize = document.getElementById('resize');
    elements.viewOnly = document.getElementById('view-only');
    elements.btnConnect = document.getElementById('btn-connect');
    elements.btnDisconnect = document.getElementById('btn-disconnect');
    elements.btnSettings = document.getElementById('btn-settings');
    elements.btnFullscreen = document.getElementById('btn-fullscreen');
    elements.toggleAdvanced = document.getElementById('toggle-advanced');
    elements.advancedSettings = document.getElementById('advanced-settings');
    elements.connectionPanel = document.getElementById('connection-panel');
    elements.screenContainer = document.getElementById('screen-container');
    elements.screen = document.getElementById('screen');
    elements.loadingOverlay = document.getElementById('loading-overlay');
    elements.statusIndicator = document.getElementById('status-indicator');
    elements.alert = document.getElementById('alert');
    elements.alertText = document.getElementById('alert-text');
}

// Setup event listeners
function setupEventListeners() {
    elements.btnConnect.addEventListener('click', connect);
    elements.btnDisconnect.addEventListener('click', disconnect);
    elements.btnSettings.addEventListener('click', showSettings);
    elements.btnFullscreen.addEventListener('click', toggleFullscreen);
    elements.toggleAdvanced.addEventListener('click', toggleAdvancedSettings);

    // Enter key to connect
    [elements.host, elements.port, elements.password].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isConnected) {
                connect();
            }
        });
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// Check if RFB is available
function checkRFBAvailability() {
    const checkInterval = setInterval(() => {
        if (typeof window.RFB !== 'undefined') {
            clearInterval(checkInterval);
            console.log('✅ noVNC RFB loaded successfully');
            showAlert('Ready to connect', 'success');
        }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
        if (typeof window.RFB === 'undefined') {
            clearInterval(checkInterval);
            showAlert('Failed to load VNC library. Please refresh the page.', 'error');
            console.error('❌ RFB not available');
        }
    }, 10000);
}

// Load URL parameters
function loadURLParameters() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('host')) {
        elements.host.value = params.get('host');
    }
    if (params.get('port')) {
        elements.port.value = params.get('port');
    }
    if (params.get('password')) {
        elements.password.value = params.get('password');
    }
    if (params.get('encrypt') === 'true') {
        elements.encrypt.checked = true;
    }
    if (params.get('autoconnect') === 'true') {
        setTimeout(connect, 500);
    }
}

// Toggle advanced settings
function toggleAdvancedSettings() {
    const isVisible = elements.advancedSettings.style.display !== 'none';
    elements.advancedSettings.style.display = isVisible ? 'none' : 'block';
}

// Show alert message
function showAlert(message, type = 'info') {
    elements.alertText.textContent = message;
    elements.alert.className = 'alert ' + type;
    elements.alert.style.display = 'block';

    // Auto-hide success/info messages after 5 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            elements.alert.style.display = 'none';
        }, 5000);
    }
}

// Update status indicator
function updateStatus(status, text) {
    elements.statusIndicator.className = 'status-indicator ' + status;
    elements.statusIndicator.querySelector('.status-text').textContent = text;
}

// Connect to VNC server
function connect() {
    const host = elements.host.value.trim();
    const port = elements.port.value.trim();
    const password = elements.password.value;

    // Validation
    if (!host) {
        showAlert('Please enter a server address', 'error');
        elements.host.focus();
        return;
    }

    if (!port) {
        showAlert('Please enter a port number', 'error');
        elements.port.focus();
        return;
    }

    // Check if RFB is available
    if (typeof window.RFB === 'undefined') {
        showAlert('VNC library not loaded. Please refresh the page.', 'error');
        return;
    }

    // Disconnect existing connection
    if (rfb) {
        rfb.disconnect();
        rfb = null;
    }

    // Build WebSocket URL
    const protocol = elements.encrypt.checked ? 'wss://' : 'ws://';
    const path = ''; // Add path if needed, e.g., '/websockify'
    const url = `${protocol}${host}:${port}${path}`;

    console.log('🔌 Connecting to:', url);
    showAlert('Connecting to VNC server...', 'info');
    updateStatus('connecting', 'Connecting...');

    // Disable connect button
    elements.btnConnect.disabled = true;
    elements.btnConnect.textContent = 'Connecting...';

    // Show screen container
    elements.connectionPanel.style.display = 'none';
    elements.screenContainer.style.display = 'block';
    elements.loadingOverlay.style.display = 'flex';

    try {
        // Create RFB connection
        rfb = new window.RFB(elements.screen, url, {
            credentials: { password: password || '' },
            repeaterID: '',
            shared: true,
            wsProtocols: ['binary']
        });

        // Configure RFB settings
        rfb.scaleViewport = true;
        rfb.resizeSession = elements.resize.checked;
        rfb.viewOnly = elements.viewOnly.checked;
        rfb.showDotCursor = true;
        rfb.clipViewport = false;

        // Set quality
        rfb.qualityLevel = 6;
        rfb.compressionLevel = 2;

        // Setup event handlers
        setupRFBEventHandlers();

    } catch (error) {
        console.error('❌ Connection error:', error);
        showAlert('Failed to connect: ' + error.message, 'error');
        handleConnectionError();
    }
}

// Setup RFB event handlers
function setupRFBEventHandlers() {
    if (!rfb) return;

    // Connection successful
    rfb.addEventListener('connect', () => {
        console.log('✅ Connected to VNC server');
        isConnected = true;
        elements.loadingOverlay.style.display = 'none';
        elements.btnConnect.disabled = false;
        elements.btnConnect.textContent = 'Connect';
        elements.btnDisconnect.style.display = 'block';
        showAlert('Connected successfully!', 'success');
        updateStatus('connected', 'Connected');

        // Save connection settings
        saveConnectionSettings();
    });

    // Disconnected
    rfb.addEventListener('disconnect', (e) => {
        console.log('🔌 Disconnected:', e.detail);
        isConnected = false;
        
        if (e.detail.clean) {
            showAlert('Disconnected from VNC server', 'info');
            updateStatus('', 'Disconnected');
        } else {
            showAlert('Connection lost: ' + (e.detail.reason || 'Unknown error'), 'error');
            updateStatus('error', 'Connection Lost');
        }

        handleConnectionError();
    });

    // Credentials required
    rfb.addEventListener('credentialsrequired', () => {
        console.warn('⚠️ Authentication required');
        showAlert('Authentication failed. Please check your password.', 'error');
        handleConnectionError();
    });

    // Security failure
    rfb.addEventListener('securityfailure', (e) => {
        console.error('❌ Security failure:', e.detail);
        showAlert('Security failure: ' + (e.detail.reason || 'Unknown error'), 'error');
        handleConnectionError();
    });

    // Clipboard events
    rfb.addEventListener('clipboard', (e) => {
        console.log('📋 Clipboard data received');
    });

    // Bell (notification)
    rfb.addEventListener('bell', () => {
        console.log('🔔 Bell received from server');
    });

    // Desktop name
    rfb.addEventListener('desktopname', (e) => {
        console.log('🖥️ Desktop name:', e.detail.name);
        document.title = 'Codefondh VNC - ' + e.detail.name;
    });
}

// Handle connection error
function handleConnectionError() {
    isConnected = false;
    elements.btnConnect.disabled = false;
    elements.btnConnect.textContent = 'Connect';
    elements.btnDisconnect.style.display = 'none';
    elements.screenContainer.style.display = 'none';
    elements.connectionPanel.style.display = 'block';
    elements.loadingOverlay.style.display = 'flex';

    if (rfb) {
        rfb.disconnect();
        rfb = null;
    }
}

// Disconnect from VNC server
function disconnect() {
    if (rfb) {
        console.log('🔌 Disconnecting...');
        rfb.disconnect();
        rfb = null;
    }
    
    isConnected = false;
    elements.btnDisconnect.style.display = 'none';
    elements.screenContainer.style.display = 'none';
    elements.connectionPanel.style.display = 'block';
    showAlert('Disconnected', 'info');
    updateStatus('', 'Disconnected');
}

// Show settings (return to connection panel)
function showSettings() {
    if (isConnected) {
        const confirm = window.confirm('Disconnect from current session?');
        if (confirm) {
            disconnect();
        }
    } else {
        elements.connectionPanel.style.display = 'block';
        elements.screenContainer.style.display = 'none';
    }
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!isFullscreen) {
        // Enter fullscreen
        if (elements.screenContainer.requestFullscreen) {
            elements.screenContainer.requestFullscreen();
        } else if (elements.screenContainer.webkitRequestFullscreen) {
            elements.screenContainer.webkitRequestFullscreen();
        } else if (elements.screenContainer.msRequestFullscreen) {
            elements.screenContainer.msRequestFullscreen();
        }
        isFullscreen = true;
        document.body.classList.add('fullscreen');
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        isFullscreen = false;
        document.body.classList.remove('fullscreen');
    }
}

// Handle fullscreen change
document.addEventListener('fullscreenchange', () => {
    isFullscreen = document.fullscreenElement !== null;
    if (!isFullscreen) {
        document.body.classList.remove('fullscreen');
    }
});

// Handle visibility change
function handleVisibilityChange() {
    if (document.hidden && isConnected) {
        console.log('⏸️ Page hidden, maintaining connection');
    } else if (!document.hidden && isConnected) {
        console.log('▶️ Page visible, connection active');
    }
}

// Save connection settings to localStorage
function saveConnectionSettings() {
    try {
        const settings = {
            host: elements.host.value,
            port: elements.port.value,
            encrypt: elements.encrypt.checked,
            resize: elements.resize.checked,
            lastConnected: new Date().toISOString()
        };
        localStorage.setItem('codefondh_vnc_settings', JSON.stringify(settings));
    } catch (e) {
        console.warn('Could not save settings:', e);
    }
}

// Load connection settings from localStorage
function loadConnectionSettings() {
    try {
        const settings = localStorage.getItem('codefondh_vnc_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            // Don't auto-fill, but could use for suggestions
            console.log('Previous settings loaded:', parsed);
        }
    } catch (e) {
        console.warn('Could not load settings:', e);
    }
}

// Quick connect function (called from HTML)
function quickConnect(host, port) {
    elements.host.value = host;
    elements.port.value = port;
    elements.host.focus();
    showAlert('Host and port pre-filled. Enter password and connect.', 'info');
}

// Send Ctrl+Alt+Del
function sendCtrlAltDel() {
    if (rfb && isConnected) {
        rfb.sendCtrlAltDel();
        showAlert('Ctrl+Alt+Del sent', 'success');
    }
}

// Send clipboard
function sendClipboard(text) {
    if (rfb && isConnected) {
        rfb.clipboardPasteFrom(text);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (rfb && isConnected && elements.resize.checked) {
        // RFB handles this automatically with resizeSession: true
        console.log('🔄 Window resized');
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', (e) => {
    if (isConnected) {
        e.preventDefault();
        e.returnValue = 'You are currently connected to a VNC session. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+Alt+D = Send Ctrl+Alt+Del
    if (e.ctrlKey && e.altKey && e.key === 'd' && isConnected) {
        e.preventDefault();
        sendCtrlAltDel();
    }
    
    // Escape = Exit fullscreen
    if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
    }
    
    // F11 = Toggle fullscreen
    if (e.key === 'F11' && isConnected) {
        e.preventDefault();
        toggleFullscreen();
    }
});

// Export functions for HTML onclick
window.quickConnect = quickConnect;
window.sendCtrlAltDel = sendCtrlAltDel;

// Initialize settings on load
loadConnectionSettings();

console.log('🚀 Codefondh VNC Client initialized');
console.log('📝 Version: 1.0.0');
console.log('🔗 GitHub: https://github.com/codefondh/vnc-client')
