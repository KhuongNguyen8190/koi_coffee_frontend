import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { apiService, API_BASE_URL } from '../services/apiService';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function useOrders(currentUser, cart, clearCart) {
    const [ordersHistory, setOrdersHistory] = useState([]);
    const [lastShiftEnd, setLastShiftEnd] = useState(null); 
    
    const stompClientRef = useRef(null);

    const fetchOrders = useCallback(async () => {
        if (!currentUser) return; 

        try {
            const result = await apiService.getOrders();
            if (result && result.status === 'success') {
                setLastShiftEnd(result.lastShiftEnd);

                const mappedOrders = result.data
                    .map(o => {
                        const cleanItems = (o.orderDetails || []).filter(item => item.quantity > 0);
                        
                        return {
                            ...o,
                            time: o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : 'Chưa rõ thời gian',
                            items: cleanItems,
                            orderDetails: cleanItems 
                        };
                    })
                    .filter(o => o.orderDetails.length > 0); 

                setOrdersHistory(mappedOrders);
            } else {
                toast.error('Cấu trúc dữ liệu đơn hàng không hợp lệ!');
            }
        } catch (error) {
            console.error("Lỗi chi tiết khi fetchOrders:", error);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        if (!currentUser) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
            reconnectDelay: 5000, 
            heartbeatIncoming: 4000, 
            heartbeatOutgoing: 4000,
            onConnect: () => {
                client.subscribe('/topic/public', (message) => {
                    if (message.body === 'SHIFT_CLOSED') {
                        toast('🔒 Một thiết bị khác vừa chốt ca. Giao diện đang được làm mới!', {
                            icon: '⚠️',
                            duration: 5000,
                            style: { background: '#f59e0b', color: '#fff', fontWeight: 'bold' }
                        });
                    }
                    setTimeout(() => fetchOrders(), 300);
                });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            client.deactivate();
            stompClientRef.current = null;
        }
    }, [currentUser, fetchOrders]);

    const notifyChange = useCallback(() => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.publish({ destination: '/topic/public', body: 'DATA_CHANGED' });
        }
    }, []);

    const handleCreateOrder = async (discountValue = 0, discountType = 'AMOUNT') => {
        if (cart.length === 0) return toast.error('Giỏ hàng trống!');
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discountAmount = 0;
        if (discountValue > 0) {
            if (discountType === 'PERCENT') discountAmount = Math.round((subtotal * discountValue) / 100);
            else discountAmount = parseInt(discountValue) || 0;
        }
        if (discountAmount > subtotal) discountAmount = subtotal;

        const orderPayload = {
            staffName: currentUser.fullName,
            totalPrice: subtotal, 
            discount: discountAmount, 
            items: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.price, note: item.note }))
        };

        try {
            const result = await apiService.createOrder(orderPayload);
            if (result.status === 'success') {
                toast.success(`Đã tạo đơn ${result.data.code} và gửi bếp!`, { icon: '🛎️' });
                clearCart(); 
                notifyChange();
            } else toast.error('Lỗi khi tạo đơn hàng!');
        } catch (error) { toast.error('Mất kết nối với máy chủ!'); }
    };

    const handlePayOrder = async (orderId, method) => {
        try {
            const result = await apiService.payOrder(orderId, method);
            if (result.status === 'success') {
                toast.success('Thanh toán thành công!', { icon: '💰' });
                notifyChange(); 
            }
        } catch (error) { toast.error('Lỗi kết nối máy chủ!'); }
    };

    const handleSplitOrder = async (orderId, paidItems, method) => {
        const payload = { paymentMethod: method, items: paidItems };
        try {
            const result = await apiService.splitOrder(orderId, payload);
            if (result.status === 'success') {
                toast.success("Tách món thu tiền thành công!");
                notifyChange(); 
            }
        } catch (error) { toast.error("Không thể tách đơn lúc này!"); }
    };

    const handleCancelOrder = async (orderId) => {
        try {
            const result = await apiService.cancelOrder(orderId);
            if (result && result.status === 'success') {
                toast.success('Đã chuyển đơn sang trạng thái Hủy!');
                notifyChange(); 
                fetchOrders(); 
            }
        } catch (error) { toast.error('Lỗi khi hủy đơn hàng!'); }
    };

    const handleRestoreOrder = async (orderId) => {
        try {
            const result = await apiService.restoreOrder(orderId);
            if (result && result.status === 'success') {
                toast.success('Đã khôi phục đơn hàng về chờ thanh toán!');
                notifyChange(); 
                fetchOrders(); 
            }
        } catch (error) { toast.error('Lỗi khi khôi phục đơn hàng!'); }
    };

    const handleChangePaymentMethod = async (orderId, newMethod) => {
        try {
            const result = await apiService.changePaymentMethod(orderId, newMethod);
            if (result && result.status === 'success') {
                toast.success(`Đã đổi sang: ${newMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}`);
                notifyChange(); 
                fetchOrders(); 
            }
        } catch (error) { toast.error('Lỗi khi đổi phương thức thanh toán!'); }
    };

    const handleChangeOrderStatus = async (orderId, newStatus) => {
        try {
            const result = await apiService.changeOrderStatus(orderId, newStatus);
            if (result && result.status === 'success') {
                toast.success('Đã cập nhật trạng thái đơn hàng!');
                notifyChange(); 
                fetchOrders(); 
            }
        } catch (error) { toast.error('Lỗi khi thay đổi trạng thái!'); }
    };

    return { 
        ordersHistory, 
        lastShiftEnd, 
        handleCreateOrder, 
        handlePayOrder, 
        handleSplitOrder, 
        handleCancelOrder,
        handleRestoreOrder,
        handleChangePaymentMethod,
        handleChangeOrderStatus
    };
}