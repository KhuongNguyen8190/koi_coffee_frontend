import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/apiService';
import { useWebSocket } from '../hooks/useWebSocket';

export const usePOSLogic = () => {
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('user_session');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [isAuthChecked] = useState(true);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('current_tab') || 'pos');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isShiftOpen, setIsShiftOpen] = useState(() => {
        return localStorage.getItem('pos_is_shift_open') === 'true';
    });

    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem('pos_cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('pos_cart', JSON.stringify(cart));
    }, [cart]);

    const [ordersHistory, setOrdersHistory] = useState([]);
    const [lastShiftEnd, setLastShiftEnd] = useState(null);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => localStorage.setItem('current_tab', activeTab), [activeTab]);

    // =========================================================================
    // LOGIC KICKOUT KHI ĐĂNG NHẬP Ở THIẾT BỊ KHÁC
    // =========================================================================
    const forceKickOut = useCallback(() => {
        localStorage.setItem('kickout_penalty_until', (Date.now() + 10000).toString());
        toast.dismiss(); // Xóa sạch toast cũ
        toast.error("Tài khoản đang đăng nhập ở nơi khác!", {
            id: 'kickout_msg', duration: 5000, style: { fontWeight: 'bold' }
        });
        localStorage.removeItem('user_session');
        setCurrentUser(null);
        setActiveTab('pos');
    }, []);

    useWebSocket(currentUser?.id ? `/topic/kickout/${currentUser.id}` : null, (rawBody) => {
        if (!currentUser) return;
        const incomingSessionId = rawBody.replace(/"/g, '');
        if (currentUser.sessionId && incomingSessionId !== currentUser.sessionId) {
            forceKickOut();
        }
    });

    // =========================================================================
    // HÀM LẤY DỮ LIỆU & ĐỒNG BỘ TRẠNG THÁI CA TỪ SERVER
    // =========================================================================
    const extractSafeData = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        return [];
    };

    const fetchData = useCallback(async () => {
        try {
            const timestamp = new Date().getTime();

            // Lấy toàn bộ dữ liệu song song (bao gồm cả danh sách ca)
            const [ordersRes, productsRes, categoriesRes, shiftRes] = await Promise.all([
                apiService.getOrders(`?t=${timestamp}`).catch(() => null),
                apiService.getProducts(`?t=${timestamp}`).catch(() => null),
                apiService.getCategories(`?t=${timestamp}`).catch(() => null),
                apiService.getShifts(`?t=${timestamp}`).catch(() => null)
            ]);

            // 🚀 ĐỒNG BỘ CA: QUYẾT ĐỊNH DỰA VÀO DATABASE THAY VÌ TRÌNH DUYỆT
            if (shiftRes) {
                const shiftsData = extractSafeData(shiftRes);
                const hasOpenShift = shiftsData.some(shift => shift.status === 'OPEN' || shift.status === 'ĐANG TRỰC');

                setIsShiftOpen(hasOpenShift);
                if (hasOpenShift) {
                    localStorage.setItem('pos_is_shift_open', 'true');
                } else {
                    localStorage.removeItem('pos_is_shift_open');
                }
            }

            if (ordersRes && ordersRes.data) {
                setOrdersHistory(ordersRes.data || []);
                setLastShiftEnd(ordersRes.lastShiftEnd);
            }
            setProducts(extractSafeData(productsRes));
            setCategories(extractSafeData(categoriesRes));
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        }
    }, []);

    useEffect(() => {
        if (currentUser) fetchData();
    }, [currentUser, fetchData]);

    // =========================================================================
    // LẮNG NGHE WEBSOCKET THỜI GIAN THỰC
    // =========================================================================
    useWebSocket('/topic/public', (rawBody) => {
        if (!currentUser) return;
        const body = rawBody.replace(/"/g, '');

        // Tín hiệu từ Menu (Đã gắn ID để đè lên nhau, không kẹt màn hình)
        if (body.startsWith('MENU_NOTIFY:')) {
            const messageStr = body.substring(12);
            toast(messageStr, {
                id: 'menu_notify', // ID cứng giúp thông báo sau ghi đè thông báo trước
                icon: '📢',
                duration: 3500,
                style: { background: '#0ea5e9', color: '#fff', fontWeight: 'bold' }
            });
            fetchData();
        }
        else if (body === 'SHIFT_OPENED') {
            localStorage.setItem('pos_is_shift_open', 'true');
            setIsShiftOpen(true);
            toast.dismiss('shift_closed_toast');
            fetchData();
        }
        else if (body === 'SHIFT_CLOSED') {
            const ignoreUntil = localStorage.getItem('ignore_shift_closed_until');
            const isTriggeredByMe = ignoreUntil && (Date.now() < parseInt(ignoreUntil));

            if (!isTriggeredByMe) {
                localStorage.removeItem('pos_is_shift_open');
                localStorage.removeItem('pos_initial_cash');
                setIsShiftOpen(false);

                toast.dismiss(); // Xóa sạch để báo thông báo quan trọng
                toast('🔒 Máy khác vừa chốt ca. Hệ thống đã khóa!', {
                    id: 'shift_closed_toast',
                    icon: '⚠️', duration: 5000, style: { background: '#f59e0b', color: '#fff', fontWeight: 'bold' }
                });
                setTimeout(fetchData, 300);
            }
        }
        else if (body.startsWith('USER_LOCKED:')) {
            const lockedUsername = body.split(':')[1];
            if (currentUser && currentUser.username === lockedUsername) {
                toast.dismiss();
                toast.error("Tài khoản đã bị vô hiệu hóa!", { id: 'locked_toast', duration: 5000 });
                handleLogout();
            }
        }
        else if (body === 'USER_LIST_CHANGED') {
            window.dispatchEvent(new Event('FORCE_RELOAD_USERS'));
        }
        else if (body === 'DATA_CHANGED' || body === 'ORDER_CHANGED') {
            setTimeout(() => {
                fetchData();
                if (body === 'ORDER_CHANGED') {
                    const userRole = currentUser?.role?.toUpperCase() || '';
                    if (userRole !== 'ADMIN' && userRole !== 'ROLE_ADMIN') {
                        toast.success("Dữ liệu đơn vừa cập nhật!", { id: 'order_sync', duration: 1500 });
                    }
                }
            }, 300);
        }
    });

    const requireShiftOpen = () => {
        if (!isShiftOpen) {
            toast.error("Cửa hàng chưa mở ca!", { id: 'shift_required', duration: 2500 });
            setActiveTab('summary');
            return false;
        }
        return true;
    };

    // =========================================================================
    // HÀM ĐĂNG XUẤT VÀ KẾT CA
    // =========================================================================
    const handleLogout = () => {
        if (isProcessing) return;
        setIsProcessing(true);
        localStorage.removeItem('user_session');
        localStorage.removeItem('current_tab');
        toast.dismiss();
        setCurrentUser(null);
        setActiveTab('pos');

        setTimeout(() => toast.success("Đã đăng xuất!", { id: 'logout_ok', duration: 2000 }), 100);
        setIsProcessing(false);
    };

    const handleEndShift = () => {
        localStorage.removeItem('pos_is_shift_open');
        localStorage.removeItem('pos_initial_cash');
        localStorage.removeItem('user_session');
        localStorage.removeItem('current_tab');
        setIsShiftOpen(false);

        toast.dismiss();
        setCurrentUser(null);
        setActiveTab('pos');

        setTimeout(() => toast('Đã chốt ca & Đăng xuất!', { id: 'end_shift_ok', icon: '👋', duration: 3000 }), 100);
    };

    // =========================================================================
    // CÁC HÀM THAO TÁC POS (Dọn dẹp toast trước khi hiện cái mới)
    // =========================================================================
    const addToCart = (product) => {
        if (!requireShiftOpen()) return;
        toast.dismiss('add_cart_toast'); // Xóa thông báo thêm giỏ hàng cũ nếu bấm nhanh
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { ...product, quantity: 1, note: '' }];
        });
        toast.success(`Đã thêm ${product.name}`, { id: 'add_cart_toast', duration: 1500 });
    };

    const updateQuantity = (id, delta) => {
        if (!requireShiftOpen()) return;
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
    };

    const updateNote = (id, note) => {
        if (!requireShiftOpen()) return;
        setCart(prev => prev.map(item => item.id === id ? { ...item, note } : item));
    };

    const handleEditOrder = (order) => {
        if (!requireShiftOpen()) return;
        const mappedCart = order.orderDetails.map(detail => ({ id: detail.product.id, name: detail.product.name, price: detail.price, quantity: detail.quantity, note: detail.note || '' }));
        setCart(mappedCart);
        setEditingOrderId(order.id);
        setActiveTab('pos');
        toast.dismiss();
        toast.success(`Đang sửa đơn: ${order.code}`, { id: 'edit_order', duration: 2500 });
    };

    const cancelEdit = () => {
        setEditingOrderId(null);
        setCart([]);
        toast.dismiss();
        toast.error("Đã hủy sửa đơn!", { id: 'cancel_edit', duration: 2000 });
    };

    const handleCreateOrder = async (arg1, arg2) => {
        if (!requireShiftOpen()) return;
        if (arg1 && typeof arg1.preventDefault === 'function') arg1.preventDefault();
        const discountValue = Number(arg1) || 0;
        const discountType = arg2 === 'PERCENT' ? 'PERCENT' : 'AMOUNT';
        if (cart.length === 0) return toast.error("Giỏ hàng trống!", { id: 'empty_cart', duration: 2000 });

        let calculatedTotal = 0;
        const cleanItems = cart.map(item => {
            const safePrice = Number(item.price) || 0;
            const safeQty = Number(item.quantity) || 1;
            calculatedTotal += (safePrice * safeQty);
            return { id: Number(item.id) || 0, quantity: safeQty, price: safePrice, note: typeof item.note === 'string' ? item.note : '' };
        });

        let finalDiscountAmount = 0;
        if (discountValue > 0) {
            if (discountType === 'PERCENT') finalDiscountAmount = Math.round((calculatedTotal * discountValue) / 100);
            else finalDiscountAmount = discountValue;
        }
        if (finalDiscountAmount > calculatedTotal) finalDiscountAmount = calculatedTotal;

        const payload = {
            staffName: String(currentUser?.fullName || currentUser?.username || 'Nhân viên'),
            totalPrice: calculatedTotal,
            discount: finalDiscountAmount,
            items: cleanItems
        };

        try {
            const res = editingOrderId ? await apiService.updateOrder(editingOrderId, payload) : await apiService.createOrder(payload);
            if (res && res.status === 'success') {
                toast.dismiss(); // Xóa các toast rác
                toast.success(editingOrderId ? "Cập nhật thành công!" : "Tạo đơn thành công!", { id: 'order_success', duration: 2000 });
                setCart([]); setEditingOrderId(null); fetchData(); setActiveTab('history');
            } else toast.error("Thao tác thất bại!", { id: 'order_fail', duration: 2000 });
        } catch (error) { toast.error("Lỗi hệ thống!", { id: 'order_err', duration: 2000 }); }
    };

    const handleUpdateOrder = async (id, discountVal, discountType) => {
        if (!requireShiftOpen()) return;
        return handleCreateOrder(discountVal, discountType);
    };

    const handlePayOrder = async (orderId, method) => {
        if (!requireShiftOpen()) return;
        try {
            const res = await apiService.payOrder(orderId, method);
            if (res && res.status === 'success') {
                toast.dismiss();
                toast.success("Thanh toán thành công!", { id: 'pay_ok', duration: 2000 });
                fetchData();
            }
        } catch (error) { toast.error("Lỗi thanh toán!", { id: 'pay_err', duration: 2000 }); }
    };

    const handleSplitOrder = async (orderId, splitItems, method) => {
        if (!requireShiftOpen()) return;
        try {
            const payload = { items: splitItems, paymentMethod: method };
            const res = await apiService.splitOrder(orderId, payload);
            if (res && res.status === 'success') {
                toast.dismiss();
                toast.success("Tách món & thanh toán OK!", { id: 'split_ok', duration: 2000 });
                fetchData();
            }
        } catch (error) { toast.error("Lỗi tách đơn!", { id: 'split_err', duration: 2000 }); }
    };

    const handleCancelOrder = async (orderId) => {
        if (!requireShiftOpen()) return;
        try {
            const res = await apiService.cancelOrder(orderId);
            if (res && res.status === 'success') {
                toast.dismiss();
                toast.success('Đã Hủy đơn!', { id: 'cancel_ok', duration: 2000 });
                fetchData();
            }
        } catch (error) { toast.error('Lỗi hủy đơn!', { id: 'cancel_err', duration: 2000 }); }
    };

    const handleRestoreOrder = async (orderId) => {
        if (!requireShiftOpen()) return;
        try {
            const res = await apiService.restoreOrder(orderId);
            if (res && res.status === 'success') {
                toast.dismiss();
                toast.success('Đã khôi phục đơn!', { id: 'restore_ok', duration: 2000 });
                fetchData();
            }
        } catch (error) { toast.error('Lỗi khôi phục!', { id: 'restore_err', duration: 2000 }); }
    };

    const handleChangePaymentMethod = async (orderId, newMethod) => {
        if (!requireShiftOpen()) return;
        try {
            const res = await apiService.changePaymentMethod(orderId, newMethod);
            if (res && res.status === 'success') {
                toast.dismiss();
                toast.success(`Đổi sang: ${newMethod === 'CASH' ? 'Tiền mặt' : 'C.Khoản'}`, { id: 'method_ok', duration: 2000 });
                fetchData();
            }
        } catch (error) { toast.error('Lỗi đổi phương thức!', { id: 'method_err', duration: 2000 }); }
    };

    const handleChangeOrderStatus = async (orderId, newStatus) => {
        if (!requireShiftOpen()) return;
        try {
            const res = await apiService.changeOrderStatus(orderId, newStatus);
            if (res && res.status === 'success') {
                toast.dismiss();
                toast.success('Đã cập nhật trạng thái!', { id: 'status_ok', duration: 2000 });
                fetchData();
            }
        } catch (error) { toast.error('Lỗi cập nhật trạng thái!', { id: 'status_err', duration: 2000 }); }
    };

    return {
        currentUser, setCurrentUser, isAuthChecked, activeTab, setActiveTab,
        isShiftOpen, setIsShiftOpen, cart, ordersHistory, lastShiftEnd, editingOrderId,
        products, categories, fetchData, handleLogout, handleEndShift,
        addToCart, updateQuantity, updateNote, handleCreateOrder, handleUpdateOrder,
        handlePayOrder, handleSplitOrder, handleEditOrder, cancelEdit, handleCancelOrder,
        handleRestoreOrder, handleChangePaymentMethod, handleChangeOrderStatus
    };
};