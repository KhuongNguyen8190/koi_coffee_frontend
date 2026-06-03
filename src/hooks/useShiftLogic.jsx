import { useState, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/apiService';

export const useShiftLogic = (orders, currentUser, onEndShift) => {
    const [initialCash, setInitialCash] = useState('');
    const [actualCash, setActualCash] = useState('');
    const [note, setNote] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 🚀 KHÓA CHỐNG BẤM ĐÚP (SPAM CLICK)
    const isExecutingRef = useRef(false);

    // Tính toán Doanh thu theo thực tế (Chỉ dùng hiển thị UI)
    const { totalRevenue, cashRevenue, transferRevenue } = useMemo(() => {
        const paidOrders = orders.filter(order => order.status === 'PAID');
        const getFinalPrice = (order) => Math.max(0, (order.totalPrice || 0) - (order.discount || 0));

        const total = paidOrders.reduce((sum, order) => sum + getFinalPrice(order), 0);
        const cash = paidOrders
            .filter(order => order.paymentMethod === 'CASH' || !order.paymentMethod)
            .reduce((sum, order) => sum + getFinalPrice(order), 0);
        const transfer = paidOrders
            .filter(order => order.paymentMethod === 'TRANSFER' || order.paymentMethod === 'BANKING')
            .reduce((sum, order) => sum + getFinalPrice(order), 0);

        return { totalRevenue: total, cashRevenue: cash, transferRevenue: transfer };
    }, [orders]);

    // Hàm gọi API thực tế lên Backend
    const executeEndShift = async (actualCashInput) => {
        // Nếu hàm đang chạy rồi thì chặn đứng mọi cú click tiếp theo
        if (isExecutingRef.current) return;
        
        isExecutingRef.current = true;
        setIsSubmitting(true);

        // Cắm cờ để máy thu ngân hiện tại không bị tự refresh bởi chính tín hiệu của nó
        localStorage.setItem('ignore_shift_closed_until', (Date.now() + 10000).toString());

        const payload = {
            actualCash: actualCashInput,
            note: note
        };

        try {
            const res = await apiService.closeShift(payload);
            if (res.status === 'success') {
                // Xóa trạng thái lưu tạm ở máy hiện tại
                localStorage.removeItem('pos_is_shift_open');
                localStorage.removeItem('pos_initial_cash');

                // 🚀 BƯỚC 1: Quét sạch mọi thông báo cũ đang treo (bao gồm cả bảng xác nhận)
                toast.dismiss();

                // 🚀 BƯỚC 2: Hiện thông báo thành công
                toast.success("Đã kết ca và làm mới doanh thu!", {
                    style: { borderRadius: '16px', background: '#1e293b', color: '#fff', padding: '16px 24px', fontWeight: 'bold' }
                });

                // Tắt trạng thái loading để giao diện không bị kẹt
                setIsSubmitting(false);
                isExecutingRef.current = false;

                // 🚀 BƯỚC 3: Đợi 1.5 giây cho người dùng xem xong thông báo rồi mới Đăng xuất
                setTimeout(() => {
                    if (onEndShift) onEndShift(); 
                }, 1500);

                return; // Ngắt hàm tại đây
            }
        } catch (error) {
            const msg = error.response?.data?.message;
            // Xử lý thanh lịch: Nếu lỗi là do ca đã đóng rồi
            if (msg === "Không tìm thấy ca nào đang mở!") {
                localStorage.removeItem('pos_is_shift_open');
                localStorage.removeItem('pos_initial_cash');
                
                toast.dismiss(); // Quét thông báo cũ
                toast.success("Ca làm việc đã được đóng an toàn!");
                
                setIsSubmitting(false);
                isExecutingRef.current = false;
                
                // Cũng đợi 1.5 giây rồi văng ra
                setTimeout(() => {
                    if (onEndShift) onEndShift();
                }, 1500);
                return;
            } else {
                toast.error(msg || "Lỗi hệ thống khi kết ca!");
            }
        } finally {
            setIsSubmitting(false);
            isExecutingRef.current = false; // Mở khóa lại nếu có lỗi xảy ra
        }
    };

    const handleConfirmEndShift = (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        
        const initCashInput = parseInt(initialCash) || 0;
        const actualCashInput = parseInt(actualCash);

        if (isNaN(actualCashInput) || actualCashInput < 0) {
            return toast.error("Vui lòng nhập số tiền thực thu tại két hợp lệ!");
        }

        const expectedCash = initCashInput + cashRevenue;
        const variance = actualCashInput - expectedCash;
        const isNegative = variance < 0;

        // Bật Toast xác nhận chốt ca
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl">🔒</span>
                    <p className="font-black text-slate-800 text-lg">Xác nhận chốt ca?</p>
                </div>
                
                {/* Review Lệch Két Cho Thu Ngân Xem Trực Quan */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm mb-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Lệch két:</span>
                        <span className={`text-base font-black ${variance === 0 ? 'text-slate-500' : isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {variance > 0 ? '+' : ''}{variance.toLocaleString('vi-VN')} đ
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Hành động này sẽ lưu lại báo cáo doanh thu và đưa thiết bị về ca làm việc mới.</p>
                </div>
                
                <div className="flex gap-2 mt-2">
                    <button 
                        type="button"
                        onClick={() => toast.dismiss(t.id)} 
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            toast.dismiss(t.id);
                            executeEndShift(actualCashInput);
                        }} 
                        className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 shadow-md transition-all"
                    >
                        Chốt ca ngay
                    </button>
                </div>
            </div>
        ), { 
            duration: Infinity, 
            id: 'endshift-custom-confirm',
            position: 'top-center', 
            style: { padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } 
        });
    };

    return { initialCash, setInitialCash, actualCash, setActualCash, note, setNote, isConfirming, setIsConfirming, isSubmitting, totalRevenue, cashRevenue, transferRevenue, handleConfirmEndShift };
};