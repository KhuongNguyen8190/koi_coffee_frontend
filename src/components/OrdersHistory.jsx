import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';

const BANK_CONFIG = {
    BANK_ID: "MB",
    ACCOUNT_NO: "9704229201697779848",
    ACCOUNT_NAME: "Nguyen Duy Khuong"
};

export default function OrdersHistory({ 
    orders, lastShiftEnd, onPayOrder, onSplitOrder, currentUser, 
    onEditOrder, onCancelOrder, onRestoreOrder, onChangePaymentMethod, onChangeOrderStatus 
}) {
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [splitItems, setSplitItems] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterShift, setFilterShift] = useState('CURRENT');
    const [filterDateRange, setFilterDateRange] = useState('TODAY'); 

    const [openDropdownId, setOpenDropdownId] = useState(null);

    const [qrModal, setQrModal] = useState({
        isOpen: false, amount: 0, description: "", onConfirm: null
    });

    // =========================================================================
    // STATE PHÂN TRANG (PAGINATION)
    // =========================================================================
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12; // Cố định 12 đơn mỗi trang

    useEffect(() => {
        if (selectedOrder) {
            const updatedOrder = orders.find(o => o.id === selectedOrder.id);
            if (updatedOrder) {
                setSelectedOrder(updatedOrder); 
            } else {
                setSelectedOrder(null); 
                setSplitItems({});
            }
        }
    }, [orders, selectedOrder]);

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Tự động Reset về Trang 1 khi thay đổi bất kỳ bộ lọc nào
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterShift, filterDateRange]);

    const processedOrders = useMemo(() => {
        let result = [...orders];
        const lastShiftEndTimestamp = lastShiftEnd ? new Date(lastShiftEnd).getTime() : 0;
        
        const now = new Date();
        now.setHours(0, 0, 0, 0); 
        let startTimestamp = now.getTime();

        if (filterDateRange === '3_DAYS') {
            startTimestamp = new Date(now).setDate(now.getDate() - 3);
        } else if (filterDateRange === '7_DAYS') {
            startTimestamp = new Date(now).setDate(now.getDate() - 7);
        }

        result = result.filter(order => {
            // Đơn thuộc ca hiện tại nếu: Chưa từng chốt ca HOẶC đang chờ thanh toán HOẶC tạo ở ca này HOẶC thanh toán ở ca này.
            const isCurrentShiftOrder = 
                lastShiftEndTimestamp === 0 || 
                order.status === 'PENDING' || 
                new Date(order.createdAt).getTime() > lastShiftEndTimestamp || 
                (order.paymentTime && new Date(order.paymentTime).getTime() > lastShiftEndTimestamp);

            if (filterShift === 'CURRENT') {
                return isCurrentShiftOrder;
            } else { 
                const createdTime = new Date(order.createdAt).getTime();
                const isAfterSelectedDate = createdTime >= startTimestamp;
                
                // Phải CHẮC CHẮN KHÔNG PHẢI đơn ca hiện tại thì mới được xuất hiện ở đây
                return !isCurrentShiftOrder && isAfterSelectedDate;
            }
        });

        if (filterStatus !== 'ALL' && filterShift === 'CURRENT') {
            result = result.filter(order => order.status === filterStatus);
        }
        
        if (searchTerm.trim() !== '') {
            result = result.filter(order => order.code.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [orders, filterShift, filterStatus, searchTerm, lastShiftEnd, filterDateRange]);

    // =========================================================================
    // XỬ LÝ DỮ LIỆU PHÂN TRANG
    // =========================================================================
    const totalPages = Math.ceil(processedOrders.length / ITEMS_PER_PAGE) || 1;
    
    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return processedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [processedOrders, currentPage]);

    const handleSelectOrder = (order) => {
        setSelectedOrder(order);
        setSplitItems({});
    };

    const handleCloseModal = () => {
        setSelectedOrder(null);
        setSplitItems({});
    };

    const handleCancelConfirm = (order) => {
        if (!onCancelOrder) {
            toast.error("LỖI CODE: Component cha chưa truyền 'onCancelOrder' vào <OrdersHistory />", { duration: 5000 });
            return;
        }

        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl text-rose-500">⚠️</span>
                    <p className="font-black text-slate-800 text-lg">Xác nhận Hủy Đơn?</p>
                </div>
                <p className="text-sm text-slate-500 font-medium">
                    Đơn hàng <strong className="text-rose-600">{order.code}</strong> sẽ bị hủy.
                </p>
                <div className="flex gap-2 mt-2">
                    <button 
                        onClick={() => toast.dismiss(t.id)} 
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                        Quay lại
                    </button>
                    <button 
                        onClick={() => {
                            toast.dismiss(t.id);
                            onCancelOrder(order.id);
                            handleCloseModal();
                        }} 
                        className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 shadow-md transition-colors"
                    >
                        Xác nhận Hủy
                    </button>
                </div>
            </div>
        ), { duration: Infinity, position: 'top-center' });
    };

    const totalOrderQuantity = selectedOrder?.orderDetails?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const currentSplitQuantity = Object.values(splitItems).reduce((sum, qty) => sum + qty, 0);
    const isSplittable = totalOrderQuantity > 1;
    const isSplittingAll = currentSplitQuantity === totalOrderQuantity;

    const splitTotalAmount = useMemo(() => {
        return Object.entries(splitItems).reduce((sum, [id, qty]) => {
            const originalItem = selectedOrder?.orderDetails?.find(item => item.id === parseInt(id));
            return sum + ((originalItem?.price || 0) * qty);
        }, 0);
    }, [splitItems, selectedOrder]);

    const handleToggleSplitItem = (itemId, maxQuantity) => {
        if (!isSplittable) return toast.error("Đơn hàng chỉ có 1 sản phẩm, vui lòng thanh toán trực tiếp!");
        setSplitItems(prev => {
            const currentObj = { ...prev };
            if (!currentObj[itemId]) currentObj[itemId] = 1;
            else if (currentObj[itemId] < maxQuantity) currentObj[itemId]++;
            else delete currentObj[itemId];
            return currentObj;
        });
    };

    const handleTriggerFullTransfer = (order) => {
        const originalTotal = Number(order.totalPrice) || 0;
        const discountVal = Number(order.discount) || 0;
        const finalAmount = originalTotal - discountVal;
        
        setQrModal({
            isOpen: true,
            amount: finalAmount,
            description: `KOPOS ${order.code}`,
            onConfirm: () => {
                onPayOrder(order.id, 'TRANSFER');
                handleCloseModal();
            }
        });
    };

    const handleTriggerSplitTransfer = () => {
        if (isSplittingAll) return toast.error("Không thể tách toàn bộ đơn!");
        const payloadItems = Object.entries(splitItems).map(([id, qty]) => {
            const originalItem = selectedOrder.orderDetails.find(item => item.id === parseInt(id));
            return { productId: originalItem.product.id, quantity: qty, price: originalItem.price, note: originalItem.note };
        });
        if (payloadItems.length === 0) return toast.error("Chưa chọn món nào để tách!");

        setQrModal({
            isOpen: true,
            amount: splitTotalAmount,
            description: `KOPOS TACH ${selectedOrder.code}`,
            onConfirm: () => {
                onSplitOrder(selectedOrder.id, payloadItems, 'TRANSFER');
                setSplitItems({}); 
            }
        });
    };

    const qrImageUrl = useMemo(() => {
        if (!qrModal.isOpen) return "";
        return `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-compact.png?amount=${qrModal.amount}&addInfo=${encodeURIComponent(qrModal.description)}&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;
    }, [qrModal.isOpen, qrModal.amount, qrModal.description]);

    const isLocked = filterShift === 'PREVIOUS';

    return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm space-y-3 z-10 shrink-0">
                <div className="flex flex-wrap lg:flex-nowrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Tìm mã hóa đơn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                        />
                    </div>
                    
                    <select
                        value={filterShift}
                        onChange={(e) => { 
                            setFilterShift(e.target.value); 
                            setSelectedOrder(null); 
                            setSplitItems({}); 
                            setFilterStatus('ALL'); 
                            if(e.target.value === 'PREVIOUS') setFilterDateRange('TODAY');
                        }}
                        className="bg-slate-100 border-none rounded-xl text-sm px-4 py-2.5 font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="CURRENT">⏱️ Ca Hiện Tại</option>
                        <option value="PREVIOUS">⏳ Ca Trước Đó</option>
                    </select>

                    {filterShift === 'PREVIOUS' && (
                        <select
                            value={filterDateRange}
                            onChange={(e) => { setFilterDateRange(e.target.value); setSelectedOrder(null); setSplitItems({}); }}
                            className="bg-slate-100 border-none rounded-xl text-sm px-4 py-2.5 font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-emerald-500 animate-in fade-in"
                        >
                            <option value="TODAY">📅 Hôm nay</option>
                            <option value="3_DAYS">📅 3 ngày trước</option>
                            <option value="7_DAYS">📅 7 ngày trước</option>
                        </select>
                    )}
                </div>

                {filterShift === 'CURRENT' && (
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-max flex-wrap animate-in fade-in">
                        <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${filterStatus === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Tất cả</button>
                        <button onClick={() => setFilterStatus('PENDING')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${filterStatus === 'PENDING' ? 'bg-amber-100 text-amber-700 shadow' : 'text-slate-500'}`}>Chưa TT</button>
                        <button onClick={() => setFilterStatus('PAID')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${filterStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700 shadow' : 'text-slate-500'}`}>Đã Xong</button>
                        <button onClick={() => setFilterStatus('CANCELLED')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${filterStatus === 'CANCELLED' ? 'bg-rose-100 text-rose-700 shadow' : 'text-slate-500'}`}>Đã Hủy</button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
                {processedOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 h-full text-center opacity-60">
                        <p className="text-6xl mb-4">📄</p>
                        <p className="font-bold text-lg">Không có dữ liệu hóa đơn nào phù hợp!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {paginatedOrders.map(order => {
                            const originalPrice = Number(order.totalPrice) || 0;
                            const orderDiscount = Number(order.discount) || 0;
                            const finalPrice = originalPrice - orderDiscount;
                            const isMenuOpen = openDropdownId === order.id;

                            return (
                                <div 
                                    key={order.id} 
                                    onClick={() => handleSelectOrder(order)} 
                                    className="bg-white p-5 rounded-2xl border border-slate-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300 transition-all flex flex-col group relative"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="font-black text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">{order.code}</span>
                                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                Tạo: {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                                {order.paymentTime && ` • TT: ${new Date(order.paymentTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {order.status === 'PENDING' ? (
                                                <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md uppercase tracking-wider">Chưa TT</span>
                                            ) : order.status === 'CANCELLED' ? (
                                                <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md uppercase tracking-wider">Đã Hủy</span>
                                            ) : (
                                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md uppercase tracking-wider">Đã xong</span>
                                            )}

                                            {!isLocked && (
                                                <div className="relative">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenDropdownId(isMenuOpen ? null : order.id);
                                                        }}
                                                        className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors outline-none focus:ring-2 focus:ring-emerald-500"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="1.5"></circle>
                                                            <circle cx="12" cy="5" r="1.5"></circle>
                                                            <circle cx="12" cy="19" r="1.5"></circle>
                                                        </svg>
                                                    </button>

                                                    {isMenuOpen && (
                                                        <div 
                                                            className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-[50] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                onClick={() => { setOpenDropdownId(null); onEditOrder(order); }}
                                                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                                            >
                                                                <span>✏️</span> Chỉnh sửa món
                                                            </button>
                                                            
                                                            {order.status === 'PAID' && onChangePaymentMethod && (
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        onChangePaymentMethod(order.id, order.paymentMethod === 'CASH' ? 'TRANSFER' : 'CASH');
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2 border-t border-slate-50"
                                                                >
                                                                    <span>💳</span> Đổi thành {order.paymentMethod === 'CASH' ? 'Chuyển khoản' : 'Tiền mặt'}
                                                                </button>
                                                            )}

                                                            {order.status === 'PAID' && onChangeOrderStatus && (
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        onChangeOrderStatus(order.id, 'PENDING');
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-2 border-t border-slate-50"
                                                                >
                                                                    <span>⏪</span> Hoàn tác về Chưa TT
                                                                </button>
                                                            )}

                                                            {order.status === 'CANCELLED' && onRestoreOrder && (
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        onRestoreOrder(order.id);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2 border-t border-slate-50"
                                                                >
                                                                    <span>🔄</span> Khôi phục đơn hàng
                                                                </button>
                                                            )}

                                                            {order.status !== 'CANCELLED' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        handleCancelConfirm(order);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 border-t border-slate-50"
                                                                >
                                                                    <span>❌</span> Hủy bỏ đơn hàng
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col mt-auto pt-3 border-t border-slate-100 border-dashed items-end">
                                        {orderDiscount > 0 && (
                                            <div className="flex items-center gap-2 justify-end mb-0.5">
                                                <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">
                                                    - {orderDiscount.toLocaleString('vi-VN')} đ
                                                </span>
                                                <span className="text-xs text-slate-400 line-through font-bold">
                                                    {originalPrice.toLocaleString('vi-VN')} đ
                                                </span>
                                            </div>
                                        )}
                                        <div className={`font-black text-xl ${order.status === 'CANCELLED' ? 'text-rose-500 line-through' : 'text-[#00a67d]'}`}>
                                            {finalPrice.toLocaleString('vi-VN')} đ
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- THANH ĐIỀU HƯỚNG PHÂN TRANG CỐ ĐỊNH Ở ĐÁY --- */}
            {processedOrders.length > 0 && (
                <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap gap-4 items-center justify-between z-10 shrink-0">
                    <div className="text-sm font-bold text-slate-500">
                        Hiển thị {paginatedOrders.length} / Tổng số {processedOrders.length} hóa đơn
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm"
                            >
                                Trước
                            </button>
                            <span className="px-4 py-1.5 text-sm font-black text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm">
                                Trang {currentPage} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>
            )}

            {selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        
                        {(() => {
                            const currentTotal = Number(selectedOrder.totalPrice) || 0;
                            const currentDiscount = Number(selectedOrder.discount) || 0;
                            const currentFinal = currentTotal - currentDiscount;

                            return (
                                <>
                                    <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start shrink-0 relative">
                                        <div>
                                            <h3 className="font-black text-2xl text-slate-800">{selectedOrder.code}</h3>
                                            <div className="flex flex-col gap-1 mt-2">
                                                <p className="text-xs text-slate-500 font-medium">🕒 Tạo lúc: <span className="font-bold text-slate-700">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</span></p>
                                                {selectedOrder.paymentTime && (
                                                    <p className="text-xs text-slate-500 font-medium">✅ Thanh toán: <span className="font-bold text-emerald-600">{new Date(selectedOrder.paymentTime).toLocaleString('vi-VN')}</span></p>
                                                )}
                                                <p className="text-xs text-slate-500 font-medium">👤 Thu ngân: <span className="font-bold text-slate-700">{selectedOrder.staffName}</span></p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {isLocked && (
                                                <span className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-black border border-slate-300 hidden sm:flex items-center gap-1 uppercase tracking-widest shadow-inner">
                                                    🔒 Đã chốt ca
                                                </span>
                                            )}

                                            {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'PAID') && !isLocked && (
                                                <>
                                                    <button 
                                                        onClick={() => { onEditOrder(selectedOrder); handleCloseModal(); }} 
                                                        className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors border border-blue-200"
                                                    >
                                                        ✏️ Sửa Đơn
                                                    </button>
                                                    <button 
                                                        onClick={() => { handleCancelConfirm(selectedOrder); }} 
                                                        className="bg-rose-100 text-rose-700 hover:bg-rose-200 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors border border-rose-200 hidden sm:block"
                                                    >
                                                        ❌ Hủy Đơn
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={handleCloseModal}
                                                className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors shadow-sm"
                                            >
                                                ✖
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 bg-white">
                                        {selectedOrder.orderDetails?.map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => selectedOrder.status === 'PENDING' && !isLocked && handleToggleSplitItem(item.id, item.quantity)}
                                                className={`flex justify-between items-start pb-4 border-b border-slate-100 last:border-0 ${selectedOrder.status === 'PENDING' && !isLocked ? 'cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded transition-colors' : ''}`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {selectedOrder.status === 'PENDING' && !isLocked && (
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-bold ${splitItems[item.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                                                {splitItems[item.id] ? splitItems[item.id] : ''}
                                                            </div>
                                                        )}
                                                        <span className={`font-bold text-base ${(!isSplittable || isLocked) && selectedOrder.status === 'PENDING' ? 'text-slate-400' : 'text-slate-700'}`}>
                                                            {item.product?.name || 'Sản phẩm lỗi'}
                                                        </span>
                                                    </div>
                                                    <div className={`text-sm text-slate-500 mt-1 ${selectedOrder.status === 'PENDING' && !isLocked ? 'pl-7' : ''}`}>
                                                        {item.quantity} x {item.price.toLocaleString('vi-VN')} đ
                                                    </div>
                                                    {item.note && (
                                                        <div className={`text-xs text-amber-600 font-bold mt-1 ${selectedOrder.status === 'PENDING' && !isLocked ? 'pl-7' : ''}`}>
                                                            * Ghi chú: {item.note}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-black text-slate-800 mt-1 text-base">
                                                    {(item.quantity * item.price).toLocaleString('vi-VN')} đ
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-200 shrink-0">
                                        {selectedOrder.status === 'CANCELLED' ? (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                                    <span className="text-slate-500 font-bold text-sm">Tạm tính:</span>
                                                    <span className="text-xl font-bold text-slate-400 line-through">{currentTotal.toLocaleString('vi-VN')} đ</span>
                                                </div>
                                                <div className="bg-rose-100 text-rose-700 py-4 rounded-2xl flex items-center justify-center font-black text-sm uppercase tracking-wider">
                                                    ❌ Đơn Hàng Đã Bị Hủy Bỏ
                                                </div>
                                            </div>
                                        ) : selectedOrder.status === 'PENDING' && Object.keys(splitItems).length > 0 ? (
                                            <div className="space-y-4">
                                                {isSplittingAll ? (
                                                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center mb-3">
                                                        <span className="text-sm font-bold text-rose-600">Không thể tách toàn bộ đơn. Hãy thanh toán trực tiếp ở bên dưới!</span>
                                                    </div>
                                                ) : (
                                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex justify-between items-center mb-3 shadow-inner">
                                                        <span className="text-sm font-bold text-amber-800">Đang tách {currentSplitQuantity} món</span>
                                                        <span className="text-lg font-black text-amber-700">{splitTotalAmount.toLocaleString('vi-VN')} đ</span>
                                                    </div>
                                                )}
                                                <div className="flex gap-3">
                                                    <button 
                                                        disabled={isSplittingAll} 
                                                        onClick={() => {
                                                            onSplitOrder(selectedOrder.id, Object.entries(splitItems).map(([id, qty]) => { const originalItem = selectedOrder.orderDetails.find(i => i.id === parseInt(id)); return { productId: originalItem.product.id, quantity: qty, price: originalItem.price, note: originalItem.note }; }), 'CASH');
                                                            setSplitItems({});
                                                        }} 
                                                        className={`flex-1 py-4 text-white rounded-xl font-black text-sm tracking-wide shadow-md transition-colors ${isSplittingAll ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-slate-800 hover:bg-slate-900'}`}
                                                    >
                                                        TÁCH TIỀN MẶT
                                                    </button>
                                                    <button 
                                                        disabled={isSplittingAll} 
                                                        onClick={handleTriggerSplitTransfer} 
                                                        className={`flex-1 py-4 text-white rounded-xl font-black text-sm tracking-wide shadow-md transition-colors ${isSplittingAll ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'}`}
                                                    >
                                                        TÁCH CHUYỂN KHOẢN
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                                    <span className="text-slate-500 font-bold text-sm">Tạm tính (Tiền gốc):</span>
                                                    <span className="text-lg font-bold text-slate-700">{currentTotal.toLocaleString('vi-VN')} đ</span>
                                                </div>
                                                
                                                {(currentDiscount > 0) && (
                                                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                                        <span className="text-rose-500 font-bold text-sm flex items-center gap-2">
                                                            <span>Được giảm giá:</span>
                                                            <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded font-black uppercase border border-rose-200">Đã áp dụng</span>
                                                        </span>
                                                        <span className="text-xl font-black text-rose-500">- {currentDiscount.toLocaleString('vi-VN')} đ</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center pt-2">
                                                    <span className="text-slate-800 font-black uppercase tracking-wide">
                                                        {selectedOrder.status === 'PAID' ? 'Tổng đã thu:' : 'Khách cần thanh toán:'}
                                                    </span>
                                                    <span className="text-3xl font-black text-[#00a67d]">
                                                        {currentFinal.toLocaleString('vi-VN')} <span className="text-lg underline">đ</span>
                                                    </span>
                                                </div>
                                                
                                                {selectedOrder.status === 'PENDING' ? (
                                                    <>
                                                        <div className="flex gap-3 mt-4">
                                                            <button 
                                                                onClick={() => { onPayOrder(selectedOrder.id, 'CASH'); handleCloseModal(); }} 
                                                                className="flex-[1.5] py-4 bg-[#00a67d] text-white rounded-xl font-black tracking-widest shadow-lg shadow-emerald-600/30 hover:bg-[#00916d] hover:-translate-y-0.5 transition-all"
                                                            >
                                                                💵 TIỀN MẶT
                                                            </button>
                                                            <button 
                                                                onClick={() => handleTriggerFullTransfer(selectedOrder)} 
                                                                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
                                                            >
                                                                💳 CHUYỂN KHOẢN
                                                            </button>
                                                        </div>
                                                        {!isSplittable ? (
                                                            <p className="text-center text-[11px] text-rose-500 font-bold uppercase mt-3 tracking-widest">Đơn hàng 1 món không thể tách bill</p>
                                                        ) : (
                                                            <p className="text-center text-[11px] text-slate-400 font-bold uppercase mt-3 tracking-widest">Click vào món ở trên để tách bill</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="mt-5 space-y-3">
                                                        <div className="bg-emerald-100 text-emerald-800 p-4 rounded-xl flex items-center justify-center font-black text-sm border border-emerald-200 tracking-wider">
                                                            ✅ ĐÃ THU BẰNG: {selectedOrder.paymentMethod === 'TRANSFER' ? 'CHUYỂN KHOẢN' : 'TIỀN MẶT'}
                                                        </div>

                                                        {onChangePaymentMethod && !isLocked && (
                                                            <div className="flex gap-3 animate-in fade-in pt-2">
                                                                {selectedOrder.paymentMethod === 'CASH' ? (
                                                                    <button 
                                                                        onClick={() => { onChangePaymentMethod(selectedOrder.id, 'TRANSFER'); handleCloseModal(); }} 
                                                                        className="flex-1 py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl font-bold text-xs transition-colors border border-blue-200 flex items-center justify-center gap-2"
                                                                    >
                                                                        <span>🔄</span> Đổi sang Chuyển Khoản
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => { onChangePaymentMethod(selectedOrder.id, 'CASH'); handleCloseModal(); }} 
                                                                        className="flex-1 py-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl font-bold text-xs transition-colors border border-emerald-200 flex items-center justify-center gap-2"
                                                                    >
                                                                        <span>🔄</span> Đổi sang Tiền Mặt
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {qrModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-slate-900 p-4 text-white text-center">
                            <h4 className="font-black text-sm uppercase tracking-wider">Mã QR Chuyển Khoản</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Vui lòng yêu cầu khách quét mã dưới đây</p>
                        </div>
                        <div className="p-6 flex flex-col items-center bg-slate-50">
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200/60 flex items-center justify-center aspect-square w-64">
                                <img src={qrImageUrl} alt="VietQR Code" className="w-full h-full object-contain" loading="lazy" />
                            </div>
                            <div className="mt-5 w-full space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-400 uppercase">Số tiền:</span>
                                    <span className="text-lg font-black text-emerald-600">{qrModal.amount.toLocaleString('vi-VN')} đ</span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-t border-dashed border-slate-100 pt-2">
                                    <span className="font-bold text-slate-400 uppercase">Nội dung:</span>
                                    <span className="font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{qrModal.description}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    if (qrModal.onConfirm) qrModal.onConfirm();
                                    setQrModal(prev => ({ ...prev, isOpen: false }));
                                    toast.success("Ghi nhận hóa đơn chuyển khoản thành công!");
                                }}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-xl shadow-md shadow-emerald-600/20 tracking-wide transition-colors"
                            >
                                ✅ HOÀN TẤT
                            </button>
                            <button
                                onClick={() => setQrModal(prev => ({ ...prev, isOpen: false }))}
                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl text-center transition-colors"
                            >
                                Hủy bỏ (Chưa nhận được tiền)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}