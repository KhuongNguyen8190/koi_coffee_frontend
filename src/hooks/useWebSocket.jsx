import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL } from '../services/apiService'; // Lấy IP tự động

export const useWebSocket = (topic, onMessageReceived) => {
    const callbackRef = useRef(onMessageReceived);

    useEffect(() => {
        callbackRef.current = onMessageReceived;
    }, [onMessageReceived]);

    useEffect(() => {
        // 🚀 Tự động nhận diện IP máy chủ: http://192.168.1.4:8080/ws
        const socketUrl = `${API_BASE_URL}/ws`;

        const stompClient = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log(`✅ [WebSocket] Đã kết nối STOMP tới ${socketUrl}`);
                stompClient.subscribe(topic, (message) => {
                    if (callbackRef.current) {
                        callbackRef.current(message.body);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('❌ [WebSocket] Lỗi kết nối STOMP: ', frame);
            }
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, [topic]); 
};