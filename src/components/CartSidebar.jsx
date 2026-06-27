import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function CartSidebar({ 
    cart = [], 
    onUpdateQuantity, 
    onUpdateNote, 
    onCheckout, 
    editingOrderId, 
    onCancelEdit 
}) {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState('AMOUNT');

    useEffect(() => {
        if (editingOrderId) {
            setIsCartOpen(true);
        }
    }, [editingOrderId]);

    const { subtotal, discountAmount, finalTotal } = useMemo(() => {
        const sub = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discAmt = 0;
        
        const val = parseInt(discountValue) || 0;
        if (val > 0) {
            if (discountType === 'PERCENT') {
                discAmt = Math.round((sub * val) / 100);
            } else {
                discAmt = val;
            }
        }

        if (discAmt > sub) discAmt = sub;

        return {
            subtotal: sub,
            discountAmount: discAmt,
            finalTotal: sub - discAmt
        };
    }, [cart, discountValue, discountType]);

    const handleCheckoutClick = () => {
        if (cart.length === 0) return toast.error("Giỏ hàng trống!");
        onCheckout(parseInt(discountValue) || 0, discountType);
        
        setIsCartOpen(false);
        setDiscountValue('');
    };

    // Hàm xử lý nhập Chiết khấu: Ngăn nhập chữ, chặn số 0 ở đầu và xử lý %
    const handleDiscountChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, ''); // Xóa toàn bộ ký tự không phải số
        if (rawValue === '') {
            setDiscountValue('');
            return;
        }

        const numValue = Number(rawValue); // Chuyển thành số để mất số 0 ở đầu (0100 -> 100)
        
        if (discountType === 'PERCENT') {
            // Nếu là phần trăm, không cho nhập quá 100
            setDiscountValue((numValue > 100 ? 100 : numValue).toString());
        } else {
            setDiscountValue(numValue.toString());
        }
    };

    return (
        <>
            {/* NÚT MỞ GIỎ HÀNG NỔI */}
            <div 
                className={`fixed bottom-[85px] md:bottom-8 right-4 md:right-8 z-30 transition-all duration-300 ease-in-out ${isCartOpen ? 'translate-x-[150%] opacity-0' : 'translate-x-0 opacity-100'}`}
            >
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="w-14 h-14 md:w-16 md:h-16 bg-[#00a67d] text-white rounded-full shadow-[0_8px_25px_rgba(0,166,125,0.4)] flex items-center justify-center hover:bg-[#00916d] hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,166,125,0.6)] transition-all relative group"
                >
                    <span className="text-2xl md:text-3xl relative -left-0.5">🛒</span>
                    
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-rose-500 text-white text-[10px] md:text-xs font-black w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full border-2 border-white shadow-md animate-pulse">
                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* LỚP MỜ (BACKDROP) */}
            {isCartOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[90] transition-opacity duration-300"
                    onClick={() => setIsCartOpen(false)}
                />
            )}

            {/* BẢNG GIỎ HÀNG TRƯỢT */}
            <div className={`fixed top-0 right-0 h-[100dvh] w-full sm:w-[400px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.15)] z-[100] transform transition-transform duration-300 ease-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* HEADER GIỎ HÀNG */}
                <div className="p-3 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 gap-2">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-1.5 md:gap-2 truncate">
                            🛒 Giỏ Hàng
                            <span className="bg-emerald-100 text-[#00a67d] text-[10px] md:text-xs px-2 py-0.5 rounded-full shrink-0">
                                {cart.reduce((sum, item) => sum + item.quantity, 0)} món
                            </span>
                        </h2>
                        {editingOrderId && (
                            <p className="text-[10px] md:text-[11px] font-bold text-amber-600 mt-1 uppercase tracking-wider truncate">
                                Đang sửa đơn: {editingOrderId}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                        {editingOrderId && (
                            <button 
                                onClick={() => { onCancelEdit(); setIsCartOpen(false); }}
                                className="text-[10px] md:text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1.5 md:px-3 md:py-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                            >
                                Hủy Sửa
                            </button>
                        )}
                        <button 
                            onClick={() => setIsCartOpen(false)}
                            className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold hover:bg-rose-100 hover:text-rose-600 transition-colors shadow-sm"
                        >
                            ✖
                        </button>
                    </div>
                </div>

                {/* DANH SÁCH MÓN TRONG GIỎ */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-slate-50/50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                            <span className="text-5xl md:text-6xl">🛍️</span>
                            <p className="font-bold text-xs md:text-sm">Chưa có món nào được chọn</p>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 relative group">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight break-words">{item.name}</h4>
                                        <p className="text-[#00a67d] font-black text-sm mt-0.5">{item.price.toLocaleString('vi-VN')} đ</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 md:gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100 shrink-0">
                                        <button 
                                            onClick={() => onUpdateQuantity(item.id, -1)}
                                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-md bg-white text-slate-600 font-black shadow-sm hover:bg-slate-200 hover:text-rose-600"
                                        >-</button>
                                        <span className="w-5 md:w-6 text-center font-black text-slate-800 text-xs md:text-sm">{item.quantity}</span>
                                        <button 
                                            onClick={() => onUpdateQuantity(item.id, 1)}
                                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-md bg-white text-slate-600 font-black shadow-sm hover:bg-slate-200 hover:text-[#00a67d]"
                                        >+</button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                    <input 
                                        type="text" 
                                        placeholder="Ghi chú (VD: Ít đá, nhiều sữa...)" 
                                        value={item.note || ''}
                                        onChange={(e) => onUpdateNote(item.id, e.target.value)}
                                        className="flex-1 text-xs bg-slate-50 border border-slate-100 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-600 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* VÙNG THANH TOÁN (Footer) */}
                <div className="p-4 md:p-5 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] shrink-0">
                    <div className="mb-4 bg-slate-50 p-2.5 md:p-3 rounded-xl border border-slate-100">
                        <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Chiết khấu / Giảm giá</label>
                        <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                            <button 
                                onClick={() => {
                                    setDiscountType(prev => prev === 'AMOUNT' ? 'PERCENT' : 'AMOUNT');
                                    setDiscountValue('');
                                }}
                                className="bg-slate-100 px-2 md:px-3 py-2 text-xs md:text-sm font-black text-slate-700 hover:bg-slate-200 transition-colors border-r border-slate-200 w-12 md:w-14 text-center shrink-0"
                            >
                                {discountType === 'AMOUNT' ? 'VNĐ' : '%'}
                            </button>
                            <input 
                                type="text"
                                inputMode="numeric" // Gọi bàn phím số trên điện thoại
                                placeholder={discountType === 'AMOUNT' ? 'Nhập số tiền...' : 'Nhập %...'}
                                // Định dạng thêm dấu phẩy nếu là dạng tiền tệ
                                value={discountType === 'AMOUNT' && discountValue ? Number(discountValue).toLocaleString('en-US') : discountValue}
                                onChange={handleDiscountChange}
                                className="flex-1 px-3 py-2 text-xs md:text-sm font-bold text-slate-800 outline-none w-full bg-transparent"
                            />
                            {discountValue && (
                                <button onClick={() => setDiscountValue('')} className="px-3 text-slate-400 hover:text-rose-500 font-bold">✕</button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs md:text-sm font-bold text-slate-500">Tạm tính:</span>
                            <span className="text-sm md:text-base font-bold text-slate-700">{subtotal.toLocaleString('vi-VN')} đ</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between items-center text-rose-500">
                                <span className="text-xs md:text-sm font-bold">Được giảm:</span>
                                <span className="text-sm md:text-base font-bold">- {discountAmount.toLocaleString('vi-VN')} đ</span>
                            </div>
                        )}
                        <div className="flex justify-between items-end pt-2 border-t border-slate-200 border-dashed">
                            <span className="text-xs md:text-sm font-black text-slate-800 uppercase">Khách cần trả:</span>
                            <span className="text-xl md:text-2xl font-black text-[#00a67d]">
                                {finalTotal.toLocaleString('vi-VN')} <span className="text-xs md:text-sm underline text-emerald-500">đ</span>
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={handleCheckoutClick}
                        disabled={cart.length === 0}
                        className={`w-full py-3.5 md:py-4 rounded-xl font-black text-sm md:text-base uppercase tracking-wider transition-all shadow-lg
                            ${cart.length === 0 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-[#00a67d] text-white hover:bg-[#00916d] shadow-emerald-600/30'
                            }
                        `}
                    >
                        {editingOrderId ? '💾 LƯU ĐƠN SỬA' : '🔔 XUẤT HÓA ĐƠN'}
                    </button>
                </div>
            </div>
        </>
    );
}