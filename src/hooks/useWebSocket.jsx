import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL } from '../services/apiService';

// Singleton connection manager
class WebSocketManager {
    constructor() {
        this.client = null;
        this.subscribers = new Map(); // topic -> Set of callbacks
        this.statusListeners = new Set();
        this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
        this.reconnectAttempts = 0;
    }

    notifyStatus(newStatus) {
        this.status = newStatus;
        this.statusListeners.forEach((listener) => {
            try {
                listener(newStatus);
            } catch (err) {
                console.error('[WebSocket] Error in status listener', err);
            }
        });
    }

    initClient() {
        if (this.client) return;

        const socketUrl = `${API_BASE_URL}/ws`;
        this.notifyStatus('connecting');

        this.client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            reconnectDelay: 4000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug: () => {}, // Tắt spam log ở console
            onConnect: () => {
                this.reconnectAttempts = 0;
                this.notifyStatus('connected');

                // Tự động subscribe lại tất cả các topic đang active
                this.subscribers.forEach((callbacks, topic) => {
                    this._subscribeTopic(topic);
                });
            },
            onDisconnect: () => {
                this.notifyStatus('disconnected');
            },
            onStompError: (frame) => {
                console.warn('[WebSocket] STOMP Error: ', frame.headers?.message || frame);
                this.notifyStatus('error');
            },
            onWebSocketClose: () => {
                this.reconnectAttempts++;
                this.notifyStatus(this.reconnectAttempts > 1 ? 'reconnecting' : 'disconnected');
            }
        });

        this.client.activate();
    }

    _subscribeTopic(topic) {
        if (!this.client || !this.client.connected) return;

        // Nếu đã có stomp subscription cho topic này, không subscribe đè
        if (this.stompSubscriptions?.has(topic)) return;

        if (!this.stompSubscriptions) {
            this.stompSubscriptions = new Map();
        }

        const sub = this.client.subscribe(topic, (message) => {
            let parsed = message.body;
            try {
                // Thử parse JSON nếu backend gửi WsEvent object
                if (typeof message.body === 'string' && (message.body.startsWith('{') || message.body.startsWith('['))) {
                    parsed = JSON.parse(message.body);
                }
            } catch (e) {
                parsed = message.body;
            }

            const callbacks = this.subscribers.get(topic);
            if (callbacks) {
                callbacks.forEach((cb) => {
                    try {
                        cb(parsed, message.body);
                    } catch (cbErr) {
                        console.error('[WebSocket] Error in message callback for ' + topic, cbErr);
                    }
                });
            }
        });

        this.stompSubscriptions.set(topic, sub);
    }

    subscribe(topic, callback) {
        if (!topic || !callback) return () => {};

        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Set());
        }
        this.subscribers.get(topic).add(callback);

        this.initClient();

        if (this.client && this.client.connected) {
            this._subscribeTopic(topic);
        }

        return () => {
            const set = this.subscribers.get(topic);
            if (set) {
                set.delete(callback);
                if (set.size === 0) {
                    this.subscribers.delete(topic);
                    const stompSub = this.stompSubscriptions?.get(topic);
                    if (stompSub) {
                        try {
                            stompSub.unsubscribe();
                        } catch (e) {}
                        this.stompSubscriptions.delete(topic);
                    }
                }
            }
        };
    }

    addStatusListener(listener) {
        this.statusListeners.add(listener);
        listener(this.status);
        return () => this.statusListeners.delete(listener);
    }

    publish(destination, body) {
        if (this.client && this.client.connected) {
            const payload = typeof body === 'object' ? JSON.stringify(body) : String(body);
            this.client.publish({ destination, body: payload });
        }
    }
}

const wsManager = new WebSocketManager();

/**
 * Hook lắng nghe WebSocket trên một topic cụ thể.
 * Tự động gom nhiều component vào chung 1 kết nối STOMP duy nhất!
 */
export const useWebSocket = (topic, onMessageReceived) => {
    const callbackRef = useRef(onMessageReceived);

    useEffect(() => {
        callbackRef.current = onMessageReceived;
    }, [onMessageReceived]);

    useEffect(() => {
        if (!topic) return;

        const unsubscribe = wsManager.subscribe(topic, (parsed, raw) => {
            if (callbackRef.current) {
                callbackRef.current(parsed, raw);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [topic]);

    const sendMessage = useCallback((destination, payload) => {
        wsManager.publish(destination, payload);
    }, []);

    return { sendMessage };
};

/**
 * Hook theo dõi trạng thái kết nối thời gian thực cho UI (Header, Badge)
 */
export const useWebSocketStatus = () => {
    const [status, setStatus] = useState(wsManager.status);

    useEffect(() => {
        return wsManager.addStatusListener(setStatus);
    }, []);

    return status; // 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error'
};
