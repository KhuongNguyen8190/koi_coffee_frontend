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
        this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'
        this.reconnectAttempts = 0;
        this.isDeactivated = false;
        this.pauseUntil = 0;
    }

    notifyStatus(newStatus) {
        if (this.status === newStatus) return;
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
        // Nếu không có ai đăng ký topic nào thì không cần kết nối
        if (this.subscribers.size === 0) return;
        if (this.client && this.client.active) return;
        if (Date.now() < this.pauseUntil) return;

        this.isDeactivated = false;
        const socketUrl = `${API_BASE_URL}/ws`;
        this.notifyStatus('connecting');

        this.client = new Client({
            // SockJS với danh sách transport giới hạn tránh spam fallback làm kích hoạt 429
            webSocketFactory: () => new SockJS(socketUrl, null, {
                transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
                timeout: 10000
            }),
            reconnectDelay: 8000, // Đợi tối thiểu 8 giây trước khi thử kết nối lại
            heartbeatIncoming: 15000,
            heartbeatOutgoing: 15000,
            debug: () => {}, // Không spam log ở console
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
                this.notifyStatus('error');
            },
            onWebSocketClose: () => {
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= 5) {
                    // Nếu thất bại liên tiếp 5 lần (ví dụ server sleep hoặc rate-limit), tạm ngưng 25s
                    this.pauseUntil = Date.now() + 25000;
                    this.notifyStatus('disconnected');
                    try {
                        this.client?.deactivate();
                    } catch (e) {}
                    this.client = null;

                    setTimeout(() => {
                        if (this.subscribers.size > 0 && !this.client) {
                            this.reconnectAttempts = 0;
                            this.initClient();
                        }
                    }, 25000);
                    return;
                }
                this.notifyStatus('reconnecting');
            }
        });

        try {
            this.client.activate();
        } catch (err) {
            console.warn('[WebSocket] Activation failed:', err?.message);
        }
    }

    _subscribeTopic(topic) {
        if (!this.client || !this.client.connected) return;

        if (!this.stompSubscriptions) {
            this.stompSubscriptions = new Map();
        }

        // Nếu đã có stomp subscription cho topic này, không subscribe trùng
        if (this.stompSubscriptions.has(topic)) return;

        try {
            const sub = this.client.subscribe(topic, (message) => {
                let parsed = message.body;
                try {
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
        } catch (err) {
            console.warn('[WebSocket] Subscribe error on ' + topic, err?.message);
        }
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

            // Nếu không còn ai subscribe topic nào, ngắt kết nối websocket giải phóng tài nguyên
            if (this.subscribers.size === 0 && this.client) {
                try {
                    this.client.deactivate();
                } catch (e) {}
                this.client = null;
                this.notifyStatus('disconnected');
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
