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
    // 🚀 LOGIC KICKOUT KHI ĐĂNG NHẬP Ở THIẾT BỊ / TAB KHÁC
    // =========================================================================
    
    // Hàm thực thi đuổi cổ và phạt 10s
    const forceKickOut = useCallback(() => {
        // Đặt án phạt 10 giây
        localStorage.setItem('kickout_penalty_until', (Date.now() + 10000).toString());
        
        toast.dismiss();
        toast.error("Tài khoản của bạn vừa được đăng nhập ở thiết bị khác!", {
            duration: 6000, style: { fontWeight: 'bold' }, id: 'kickout_msg'
        });

        localStorage.removeItem('user_session');
        setCurrentUser(null);
        setActiveTab('pos');
    }, []);

    // 1. Lắng nghe qua WebSocket (để chặn 2 Thiết Bị khác nhau)
    useWebSocket(currentUser?.id ? `/topic/kickout/${currentUser.id}` : null, (rawBody) => {
        if (!currentUser) return;
        const incomingSessionId = rawBody.replace(/"/g, ''); 
        
        // Nếu SessionId của máy nhận được tin nhắn KHÁC với SessionId mới nhất -> Bị văng
        if (currentUser.sessionId && incomingSessionId !== currentUser.sessionId) {
            forceKickOut();
        }
    });

    // 2. Lắng nghe Storage (để chặn 2 Tab trên CÙNG 1 Trình duyệt)
    useEffect(() => {
        const handleStorageChange = (e) => {
            // Nếu tab bên cạnh bị phạt kickout, tab này cũng tự động văng luôn
            if (e.key === 'kickout_penalty_until' && e.newValue) {
                setCurrentUser(null);
            }
            // Nếu tab bên cạnh tự Đăng Xuất bình thường, tab này văng (nhưng ko bị phạt 10s)
            if (e.key === 'user_session' && e.oldValue && !e.newValue) {
                setCurrentUser(null);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);


    // =========================================================================
    // HÀM LẤY DỮ LIỆU
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
            
            const [ordersRes, productsRes, categoriesRes] = await Promise.all([
                apiService.getOrders(`?t=${timestamp}`).catch(() => null),
                apiService.getProducts(`?t=${timestamp}`).catch(() => null),
                apiService.getCategories(`?t=${timestamp}`).catch(() => null)
            ]);

            if (ordersRes && ordersRes.data) {
                setOrdersHistory(ordersRes.data || []);
                setLastShiftEnd(ordersRes.lastShiftEnd);
            }
            
            setProducts(extractSafeData(productsRes));
            setCategories(extractSafeData(categoriesRes));

        } catch (error) {
            console.error("Lỗi khi tải dữ liệu hệ thống:", error);
        }
    }, []); 

    useEffect(() => {
        if (currentUser) {
            fetchData(); 
        }
    }, [currentUser, fetchData]);

    // =========================================================================
    // LẮNG NGHE WEBSOCKET CẬP NHẬT GIAO DIỆN CHUNG
    // =========================================================================
    useWebSocket('/topic/public', (rawBody) => {
        if (!currentUser) return; 
        
        const body = rawBody.replace(/"/g, ''); 
        
        if (body === 'SHIFT_CLOSED') {
            const ignoreUntil = localStorage.getItem('ignore_shift_closed_until');
            const now = Date.now();
            const isTriggeredByMe = ignoreUntil && (now < parseInt(ignoreUntil));

            if (!isTriggeredByMe) {
                localStorage.removeItem('pos_is_shift_open');
                localStorage.removeItem('pos_initial_cash');

                toast.dismiss('shift_closed_toast'); 
                toast('🔒 Một thiết bị khác vừa chốt ca. Giao diện đang được làm mới!', {
                    id: 'shift_closed_toast', 
                    icon: '⚠️', duration: 5000, style: { background: '#f59e0b', color: '#fff', fontWeight: 'bold' }
                });
                setTimeout(fetchData, 300);
            } 
        } 
        else if (body.startsWith('USER_LOCKED:')) {
            const lockedUsername = body.split(':')[1];
            if (currentUser && currentUser.username === lockedUsername) {
                toast.error("Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên!", {
                    id: 'locked_toast',
                    icon: '🚫', duration: 6000, style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
                });
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
                        toast.success("Dữ liệu đơn hàng vừa được thay đổi!", { icon: '🔄', duration: 2000 });
                    }
                }
            }, 300);
        }
    });

    // =========================================================================
    // CÁC HÀM TIỆN ÍCH XỬ LÝ NGHIỆP VỤ POS
    // =========================================================================
    const handleLogout = () => {
        localStorage.removeItem('user_session');
        localStorage.removeItem('current_tab');
        
        // Cố tình bỏ qua (không set) kickout_penalty_until để tránh phạt 10s khi tự đăng xuất
        toast.dismiss(); 

        setCurrentUser(null);
        setActiveTab('pos');
        
        setTimeout(() => {
            toast.success("Đã đăng xuất an toàn!", {
                duration: 3000,
                style: { borderRadius: '16px', background: '#1e293b', color: '#fff', padding: '16px 24px', fontWeight: 'bold' },
                iconTheme: { primary: '#10b981', secondary: '#fff' },
            });
        }, 100);
    };

    const handleEndShift = () => {
        localStorage.removeItem('pos_is_shift_open');
        localStorage.removeItem('pos_initial_cash');
        localStorage.removeItem('user_session');
        localStorage.removeItem('current_tab');
        
        toast.dismiss(); 
        
        setCurrentUser(null);
        setActiveTab('pos');
        
        setTimeout(() => {
            toast('Đã chốt ca & Đăng xuất an toàn. Hẹn gặp lại!', {
                icon: '👋',
                duration: 4000,
                style: { borderRadius: '16px', background: '#1e293b', color: '#fff', fontWeight: 'bold' }
            });
        }, 100);
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { ...product, quantity: 1, note: '' }];
        });
        toast.success(`Đã thêm ${product.name || 'món'}`, { id: 'add_cart_toast' });
    };

    const updateQuantity = (id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
    
    const updateNote = (id, note) => setCart(prev => prev.map(item => item.id === id ? { ...item, note } : item));

    const handleEditOrder = (order) => {
        const mappedCart = order.orderDetails.map(detail => ({ 
            id: detail.product.id, 
            name: detail.product.name, 
            price: detail.price, 
            quantity: detail.quantity, 
            note: detail.note || '' 
        }));
        setCart(mappedCart);
        setEditingOrderId(order.id);
        setActiveTab('pos');
        toast.success(`Đang sửa đơn: ${order.code}`);
    };

    const cancelEdit = () => { 
        setEditingOrderId(null); 
        setCart([]); 
        toast.error("Đã hủy sửa đơn!"); 
    };

    const handleCreateOrder = async (arg1, arg2) => {
        if (arg1 && typeof arg1.preventDefault === 'function') arg1.preventDefault();
        
        const discountValue = Number(arg1) || 0;
        const discountType = arg2 === 'PERCENT' ? 'PERCENT' : 'AMOUNT';

        if (cart.length === 0) return toast.error("Giỏ hàng trống!");
        
        let calculatedTotal = 0;
        const cleanItems = cart.map(item => {
            const safePrice = Number(item.price) || 0;
            const safeQty = Number(item.quantity) || 1;
            calculatedTotal += (safePrice * safeQty);
            return { id: Number(item.id) || 0, quantity: safeQty, price: safePrice, note: typeof item.note === 'string' ? item.note : '' };
        });

        let finalDiscountAmount = 0;
        if (discountValue > 0) {
            if (discountType === 'PERCENT') {
                finalDiscountAmount = Math.round((calculatedTotal * discountValue) / 100);
            } else {
                finalDiscountAmount = discountValue;
            }
        }

        if (finalDiscountAmount > calculatedTotal) {
            finalDiscountAmount = calculatedTotal;
        }

        const payload = { 
            staffName: String(currentUser?.fullName || currentUser?.username || 'Nhân viên'), 
            totalPrice: calculatedTotal, 
            discount: finalDiscountAmount,
            items: cleanItems 
        };

        try {
            const res = editingOrderId ? await apiService.updateOrder(editingOrderId, payload) : await apiService.createOrder(payload);
            if (res && res.status === 'success') {
                toast.success(editingOrderId ? "Cập nhật thành công!" : "Tạo đơn thành công!");
                setCart([]); 
                setEditingOrderId(null); 
                fetchData(); 
                setActiveTab('history'); 
            } else toast.error("Thao tác thất bại!");
        } catch (error) { toast.error("Lỗi hệ thống!"); }
    };

    const handleUpdateOrder = async (id, discountVal, discountType) => {
        return handleCreateOrder(discountVal, discountType);
    };

    const handlePayOrder = async (orderId, method) => {
        try {
            const res = await apiService.payOrder(orderId, method);
            if (res && res.status === 'success') { 
                toast.success("Thanh toán thành công!"); 
                fetchData(); 
            }
        } catch (error) { toast.error("Lỗi thanh toán!"); }
    };

    const handleSplitOrder = async (orderId, splitItems, method) => {
        try {
            const payload = { items: splitItems, paymentMethod: method };
            const res = await apiService.splitOrder(orderId, payload);
            if (res && res.status === 'success') { 
                toast.success("Tách món và thanh toán thành công!"); 
                fetchData(); 
            }
        } catch (error) { toast.error("Lỗi khi tách đơn!"); }
    };

    const handleCancelOrder = async (orderId) => {
        try {
            const res = await apiService.cancelOrder(orderId);
            if (res && res.status === 'success') {
                toast.success('Đã chuyển đơn sang trạng thái Hủy!');
                fetchData(); 
            }
        } catch (error) { toast.error('Lỗi khi hủy đơn hàng!'); }
    };

    const handleRestoreOrder = async (orderId) => {
        try {
            const res = await apiService.restoreOrder(orderId);
            if (res && res.status === 'success') {
                toast.success('Đã khôi phục đơn hàng về chờ thanh toán!');
                fetchData(); 
            }
        } catch (error) { toast.error('Lỗi khi khôi phục đơn hàng!'); }
    };

    const handleChangePaymentMethod = async (orderId, newMethod) => {
        try {
            const res = await apiService.changePaymentMethod(orderId, newMethod);
            if (res && res.status === 'success') {
                toast.success(`Đã đổi sang: ${newMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}`);
                fetchData(); 
            }
        } catch (error) { toast.error('Lỗi khi đổi phương thức thanh toán!'); }
    };

    const handleChangeOrderStatus = async (orderId, newStatus) => {
        try {
            const res = await apiService.changeOrderStatus(orderId, newStatus);
            if (res && res.status === 'success') {
                toast.success('Đã cập nhật trạng thái đơn hàng!');
                fetchData(); 
            }
        } catch (error) { toast.error('Lỗi khi thay đổi trạng thái!'); }
    };

    return { 
        currentUser, setCurrentUser, isAuthChecked, 
        activeTab, setActiveTab, 
        cart, ordersHistory, lastShiftEnd, editingOrderId, 
        products, categories, 
        fetchData, handleLogout, handleEndShift, 
        addToCart, updateQuantity, updateNote, 
        handleCreateOrder, handleUpdateOrder, handlePayOrder, handleSplitOrder, handleEditOrder, cancelEdit,
        handleCancelOrder, handleRestoreOrder, handleChangePaymentMethod, handleChangeOrderStatus
    };
};