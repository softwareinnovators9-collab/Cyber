/**
 * WebSocket Module
 * Manages real-time communication
 */

class WebSocketManager {
  constructor(config) {
    this.url = config.WEBSOCKET.URL;
    this.reconnectAttempts = config.WEBSOCKET.RECONNECT_ATTEMPTS;
    this.reconnectDelay = config.WEBSOCKET.RECONNECT_DELAY;
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectCount = 0;
  }

  connect(token) {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.url, {
          auth: {
            token
          },
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: this.reconnectDelay * 10,
          reconnectionAttempts: this.reconnectAttempts
        });

        this.socket.on('connect', () => {
          this.connected = true;
          this.reconnectCount = 0;
          console.log('WebSocket connected');
          this.emit('websocket-connected');
          resolve();
        });

        this.socket.on('authenticated', (data) => {
          if (data.success) {
            console.log('WebSocket authenticated');
            this.emit('websocket-authenticated');
          } else {
            console.warn('WebSocket authentication failed');
            reject(new Error('WebSocket authentication failed'));
          }
        });

        this.socket.on('disconnect', () => {
          this.connected = false;
          console.log('WebSocket disconnected');
          this.emit('websocket-disconnected');
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.emit('websocket-error', error);
        });

        // Setup event listeners
        this.setupEventListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  setupEventListeners() {
    // Threat events
    this.on('threat-detected', (data) => {
      this.emit('threat-detected', data.threat);
    });

    // Incident events
    this.on('incident-created', (data) => {
      this.emit('incident-created', data.incident);
    });

    this.on('incident-updated', (data) => {
      this.emit('incident-updated', data.incident);
    });

    // Device events
    this.on('device-status-changed', (data) => {
      this.emit('device-status-changed', data.device);
    });

    this.on('device-added', (data) => {
      this.emit('device-added', data.device);
    });

    // System events
    this.on('system-alert', (data) => {
      this.emit('system-alert', data.alert);
    });
  }

  on(event, callback) {
    if (!this.socket) return;

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(callback);
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }

    this.socket.off(event, callback);
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  subscribe(channel) {
    this.emit('subscribe', channel);
  }

  unsubscribe(channel) {
    this.emit('unsubscribe', channel);
  }

  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

// Initialize WebSocket manager
const wsManager = new WebSocketManager(CONFIG);