import React, { useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import ProductBody from './components/ProductBody';
import CartSidebar from './components/CartSidebar';
import OrdersHistory from './components/OrdersHistory';
import ShiftSummary from './components/ShiftSummary';
import Login from './components/Login';
import AdminManagement from './components/admin/AdminManagement';

import { usePOSLogic } from './hooks/usePosLogic';

const MOCK_USERS = [
    { id: 1, username: 'admin', full_name: 'Quản Trị Viên Hệ Thống', role: 'ADMIN' },
    { id: 2, username: 'staff1', full_name: 'Nguyễn Nhân Viên Thu Ngân', role: 'STAFF' }
];

export default function App() {
    const {
        currentUser, setCurrentUser, isAuthChecked,
        activeTab, setActiveTab,
        isShiftOpen,
        cart, ordersHistory, lastShiftEnd, editingOrderId,
        menu, products, categories,
        handleLogout, handleEndShift,
        addToCart, updateQuantity, updateNote,
        handleCreateOrder, handlePayOrder, handleSplitOrder, handleEditOrder, cancelEdit,
        handleUpdateOrder,
        handleCancelOrder,
        handleRestoreOrder,
        handleChangePaymentMethod,
        handleChangeOrderStatus
    } = usePOSLogic();

    const currentShiftOrders = useMemo(() => {
        const lastTimestamp = lastShiftEnd ? new Date(lastShiftEnd).getTime() : 0;

        return ordersHistory.filter(order => {
            const createdTime = new Date(order.createdAt).getTime();
            const paidTime = order.paymentTime ? new Date(order.paymentTime).getTime() : 0;
            return order.status === 'PENDING' || createdTime > lastTimestamp || paidTime > lastTimestamp;
        });
    }, [ordersHistory, lastShiftEnd]);

    if (!isAuthChecked) return <div className="min-h-screen bg-slate-900 flex justify-center items-center text-white font-bold tracking-wider">ĐANG TẢI...</div>;

    // 🚀 Đã giới hạn maxToasts cho màn hình đăng nhập
    if (!currentUser) return (
        <>
            <Toaster maxToasts={1} toastOptions={{ duration: 2000, style: { maxWidth: '90vw', fontSize: '14px' } }} />
            <Login onLoginSuccess={setCurrentUser} />
        </>
    );

    return (
        <div className="flex flex-col h-[100dvh] w-full max-w-[100vw] bg-slate-100 font-sans text-slate-800 overflow-hidden">

            <Toaster
                position="top-center"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                    duration: 2000,
                    maxToasts: 1,
                    style: {
                        maxWidth: '90vw',
                        fontSize: '14px',
                        borderRadius: '16px'
                    }
                }}
            />

            {/* Header */}
            <Header currentUser={currentUser} onLogout={handleLogout} setCurrentUser={setCurrentUser} />

            <div className="flex flex-1 overflow-hidden flex-col-reverse md:flex-row relative">

                {/* THANH MENU */}
                <nav className="w-full h-[65px] md:w-20 md:h-full bg-slate-900 flex flex-row md:flex-col items-center justify-around md:justify-start md:py-6 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:shadow-xl z-40 shrink-0">
                    <button onClick={() => setActiveTab('pos')} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'pos' ? 'bg-[#00a67d] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                        <span className="text-lg md:text-xl">🛒</span><span className="text-[9px] font-bold">Order</span>
                    </button>

                    <button onClick={() => setActiveTab('history')} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative ${activeTab === 'history' ? 'bg-[#00a67d] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                        <span className="text-lg md:text-xl">📄</span><span className="text-[9px] font-bold">Đơn</span>
                        {ordersHistory.filter(o => o.status === 'PENDING').length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {ordersHistory.filter(o => o.status === 'PENDING').length}
                            </span>
                        )}
                    </button>

                    <button onClick={() => setActiveTab('summary')} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'summary' ? 'bg-[#00a67d] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                        <span className="text-lg md:text-xl">📊</span><span className="text-[9px] font-bold">Thống kê</span>
                    </button>

                    {currentUser?.role === 'ADMIN' && (
                        <button onClick={() => setActiveTab('admin')} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                            <span className="text-lg md:text-xl">⚙️</span><span className="text-[9px] font-bold">Admin</span>
                        </button>
                    )}
                </nav>

                {/* KHU VỰC HIỂN THỊ CHÍNH */}
                <main className="flex-1 flex flex-col overflow-hidden w-full">

                    {/* KHU VỰC BÁN HÀNG */}
                    {activeTab === 'pos' && (
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full relative">

                            {/* 🚀 OVERLAY CHẶN KHI CHƯA MỞ CA LÀM VIỆC */}
                            {!isShiftOpen && (
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[70] flex flex-col items-center justify-center p-4">
                                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm animate-in zoom-in-95 duration-300">
                                        <span className="text-6xl mb-4">🔒</span>
                                        <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">Chưa mở ca làm việc</h3>
                                        <p className="text-slate-500 font-medium text-sm md:text-base mb-6 leading-relaxed">
                                            Bạn không thể thêm món, sửa đơn hoặc thanh toán khi chưa xác nhận số tiền đầu ca.
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('summary')}
                                            className="bg-emerald-600 text-white font-black px-6 py-4 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all w-full uppercase tracking-wider text-sm md:text-base flex items-center justify-center gap-2"
                                        >
                                            <span>🔑</span> Tới trang Mở Ca Ngay
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Danh sách món ăn */}
                            <ProductBody
                                products={products}
                                categories={categories}
                                onAddToCart={addToCart}
                            />

                            {/* Giỏ hàng dạng Nắp trượt */}
                            <CartSidebar
                                cart={cart}
                                onUpdateQuantity={updateQuantity}
                                onUpdateNote={updateNote}
                                onCheckout={(discountVal, discountType) => {
                                    if (editingOrderId) {
                                        if (handleUpdateOrder) handleUpdateOrder(editingOrderId, discountVal, discountType);
                                    } else {
                                        handleCreateOrder(discountVal, discountType);
                                    }
                                }}
                                editingOrderId={editingOrderId}
                                onCancelEdit={cancelEdit}
                            />
                        </div>
                    )}

                    {/* LỊCH SỬ ĐƠN HÀNG */}
                    {activeTab === 'history' && (
                        <OrdersHistory
                            orders={ordersHistory}
                            lastShiftEnd={lastShiftEnd}
                            currentUser={currentUser}
                            onEditOrder={handleEditOrder}
                            onPayOrder={handlePayOrder}
                            onSplitOrder={handleSplitOrder}
                            onCancelOrder={handleCancelOrder}
                            onRestoreOrder={handleRestoreOrder}
                            onChangePaymentMethod={handleChangePaymentMethod}
                            onChangeOrderStatus={handleChangeOrderStatus}
                        />
                    )}

                    {/* THỐNG KÊ CA LÀM */}
                    {activeTab === 'summary' && (
                        <ShiftSummary
                            orders={currentShiftOrders}
                            onEndShift={handleEndShift}
                            currentUser={currentUser}
                        />
                    )}

                    {/* QUẢN TRỊ VIÊN */}
                    {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
                        <AdminManagement
                            users={MOCK_USERS}
                            categories={categories}
                            products={products}
                            ordersHistory={ordersHistory}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}