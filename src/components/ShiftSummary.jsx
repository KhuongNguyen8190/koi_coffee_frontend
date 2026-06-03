import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useShiftLogic } from '../hooks/useShiftLogic';
import { apiService } from '../services/apiService'; 
import { useWebSocket } from '../hooks/useWebSocket'; 

export default function ShiftSummary({ orders = [], onEndShift, currentUser }) {
    const {
        initialCash, setInitialCash,
        actualCash, setActualCash,
        note, setNote,
        isConfirming, setIsConfirming,
        isSubmitting,
        totalRevenue, cashRevenue, transferRevenue,
        handleConfirmEndShift
    } = useShiftLogic(orders, currentUser, onEndShift);

    const [closingTime, setClosingTime] = useState(null);
    const [isShiftOpen, setIsShiftOpen] = useState(false);
    const [isLoadingShift, setIsLoadingShift] = useState(true);
    const [isOpeningShift, setIsOpeningShift] = useState(false);

    // =========================================================================
    // 1. HÀM KIỂM TRA TRẠNG THÁI CA LÀM VIỆC TỪ BACKEND
    // =========================================================================
    const checkCurrentShift = useCallback(async () => {
        try {
            const res = await apiService.getCurrentShift();
            if (res && res.data) {
                // TRƯỜNG HỢP 1: ĐANG CÓ CA MỞ -> Hiện số tiền đang có trong ca
                setIsShiftOpen(true);
                setInitialCash(res.data.initialCash.toString()); 
            } else {
                // 🚀 TRƯỜNG HỢP 2: CHƯA MỞ CA -> Đi móc số tiền vật lý cũ từ két lên điền sẵn
                setIsShiftOpen(false);
                try {
                    const cashRes = await apiService.getLatestShiftCash();
                    if (cashRes && cashRes.status === 'success') {
                        setInitialCash(cashRes.latestCash.toString());
                    } else {
                        setInitialCash('');
                    }
                } catch (e) {
                    setInitialCash('');
                }
                
                setActualCash(''); 
                setNote('');       
                setIsConfirming(false); 
            }
        } catch (error) {
            setIsShiftOpen(false);
            setIsConfirming(false);
        } finally {
            setIsLoadingShift(false);
        }
    }, [setInitialCash, setActualCash, setNote, setIsConfirming]);

    // Load lần đầu khi mở giao diện
    useEffect(() => {
        checkCurrentShift();
    }, [checkCurrentShift]);

    // =========================================================================
    // 2. LẮNG NGHE WEBSOCKET TỪ BACKEND
    // =========================================================================
    useWebSocket('/topic/public', (rawBody) => {
        const body = rawBody.replace(/"/g, ''); 
        if (body === 'SHIFT_OPENED' || body === 'SHIFT_CLOSED') {
            console.log("🔔 Nhận tín hiệu thay đổi ca. Đang đồng bộ lại màn hình...");
            checkCurrentShift();
        }
    });

    // =========================================================================
    // 3. HÀM XỬ LÝ MỞ CA
    // =========================================================================
    const handleOpenShift = async () => {
        if (initialCash === '' || initialCash < 0) {
            return toast.error("Vui lòng nhập số tiền mặt đầu ca hợp lệ!");
        }
        
        setIsOpeningShift(true);
        try {
            const res = await apiService.openShift({ 
                initialCash: Number(initialCash),
                staffName: currentUser?.fullName || currentUser?.username || 'Nhân viên'
            });
            
            if(res.status === 'success' || res) {
                setIsShiftOpen(true);
                toast.success("Mở ca thành công! Bắt đầu bán hàng thôi.");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi mở ca. Vui lòng thử lại!");
        } finally {
            setIsOpeningShift(false);
        }
    };

    const expectedCash = (Number(initialCash) || 0) + cashRevenue;

    const onFinalSubmit = (e) => {
        e.preventDefault();
        if (handleConfirmEndShift) {
            handleConfirmEndShift(e);
        }
    };

    if (isLoadingShift) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-bold">Đang đồng bộ dữ liệu ca làm việc...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-6">
                <h2 className="text-xl font-bold text-slate-800">
                    {isShiftOpen ? 'Tổng Kết Ca & Đối Soát Doanh Thu' : 'Khai Báo Đầu Ca Làm Việc'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-5 rounded-2xl border border-slate-200 shadow-sm transition-colors ${isShiftOpen ? 'bg-white' : 'bg-slate-100 opacity-60'}`}>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Tổng Doanh Thu Ca</span>
                        <span className="text-2xl font-black text-slate-800">
                            {totalRevenue.toLocaleString('vi-VN')} <span className="text-sm font-normal">Đ</span>
                        </span>
                    </div>

                    <div className={`p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500 transition-colors ${isShiftOpen ? 'bg-white' : 'bg-slate-100 opacity-60'}`}>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Doanh Thu Tiền Mặt</span>
                        <span className="text-xl font-bold text-emerald-600">
                            {cashRevenue.toLocaleString('vi-VN')} <span className="text-xs font-normal">Đ</span>
                        </span>
                    </div>

                    <div className={`p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500 transition-colors ${isShiftOpen ? 'bg-white' : 'bg-slate-100 opacity-60'}`}>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Doanh Thu Chuyển Khoản</span>
                        <span className="text-xl font-bold text-blue-600">
                            {transferRevenue.toLocaleString('vi-VN')} <span className="text-xs font-normal">Đ</span>
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 relative">
                    {!isShiftOpen && (
                        <div className="absolute top-4 right-6 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                            Vui lòng mở ca để bán hàng
                        </div>
                    )}

                    <div className="border-b border-slate-100 pb-4 mb-6">
                        <h3 className="font-bold text-slate-700 text-lg">
                            {isShiftOpen ? 'Kiểm Két Bàn Giao' : 'Tiền Mặt Ban Đầu'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {isShiftOpen 
                                ? 'Đối chiếu số tiền mặt dự tính và số tiền thực tế có trong két để hoàn tất ca làm việc.' 
                                : 'Nhập chính xác số tiền mặt hiện có trong két để lưu vào hệ thống làm mốc đối soát.'}
                        </p>
                    </div>

                    {!isConfirming ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                                    <div>
                                        <label className={`text-xs font-bold uppercase block mb-2 ${isShiftOpen ? 'text-slate-400' : 'text-blue-600'}`}>
                                            Tiền mặt đầu ca {isShiftOpen ? '(Đã Lưu Database)' : '*'}
                                        </label>
                                        <div className="relative rounded-lg shadow-sm">
                                            <input
                                                type="number"
                                                min="0"
                                                value={initialCash}
                                                onChange={(e) => setInitialCash(e.target.value)}
                                                disabled={isShiftOpen} 
                                                className={`w-full border p-3 pr-12 rounded-xl font-bold text-base transition-colors ${
                                                    isShiftOpen 
                                                    ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed' 
                                                    : 'border-blue-300 bg-blue-50/30 focus:border-blue-500 focus:outline-none text-slate-800'
                                                }`}
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                <span className={`${isShiftOpen ? 'text-slate-400' : 'text-blue-600'} font-bold text-sm`}>VNĐ</span>
                                            </div>
                                        </div>
                                    </div>

                                    {isShiftOpen && (
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Tiền mặt dự tính cuối ca
                                            </p>
                                            <p className="text-2xl font-black text-slate-800">
                                                {expectedCash.toLocaleString('vi-VN')} <span className="text-base text-slate-500 font-bold">VNĐ</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100 italic">
                                                = Đầu ca + <strong className="text-emerald-600">{cashRevenue.toLocaleString('vi-VN')}đ</strong> (Doanh thu TM)
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-5 relative">
                                    {!isShiftOpen && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
                                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest text-center px-4">
                                                🔒 Xác nhận Mở Ca <br/> để mở khóa phần này
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-emerald-600 uppercase block mb-2">
                                            Tiền mặt đếm được thực tế *
                                        </label>
                                        <div className="relative rounded-lg shadow-sm">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Nhập tổng số tiền có trong két..."
                                                value={actualCash}
                                                onChange={(e) => setActualCash(e.target.value)}
                                                disabled={!isShiftOpen}
                                                className="w-full border-2 border-emerald-200 bg-emerald-50/30 p-4 pr-12 rounded-xl focus:border-emerald-500 focus:outline-none font-black text-slate-800 text-lg transition-colors disabled:opacity-50"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                <span className="text-emerald-600 font-bold text-sm">VNĐ</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                                            Ghi chú (Bắt buộc nếu có chênh lệch)
                                        </label>
                                        <textarea
                                            rows="3"
                                            placeholder="Ví dụ: Rút 50,000đ mua đá viên, thừa 5,000đ không rõ lý do..."
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            disabled={!isShiftOpen}
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:outline-emerald-500 text-sm text-slate-700 resize-none bg-slate-50 focus:bg-white transition-colors disabled:opacity-50"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                {!isShiftOpen ? (
                                    <button
                                        type="button"
                                        onClick={handleOpenShift}
                                        disabled={isOpeningShift}
                                        className="bg-blue-600 text-white font-bold text-sm px-10 py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/30 disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {isOpeningShift ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                ĐANG MỞ CA...
                                            </>
                                        ) : 'MỞ CA BÁN HÀNG'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!actualCash) return toast.error("Vui lòng nhập tiền mặt thực tế kiểm đếm!");
                                            setClosingTime(new Date()); 
                                            setIsConfirming(true);
                                        }}
                                        className="bg-slate-800 text-white font-bold text-sm px-10 py-3.5 rounded-xl hover:bg-slate-700 transition-colors shadow-md"
                                    >
                                        TÍNH TOÁN ĐỐI SOÁT (KẾT CA)
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={onFinalSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5 shadow-inner animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                                <h4 className="font-bold text-slate-800 text-lg">Phiếu Báo Cáo Két Tiền</h4>
                                
                                {closingTime && (
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thời gian chốt ca</p>
                                        <p className="text-sm font-black text-emerald-600">{closingTime.toLocaleString('vi-VN')}</p>
                                    </div>
                                )}
                            </div>

                            <div className="text-sm space-y-3 text-slate-600">
                                <div className="flex justify-between">
                                    <span>Tiền mặt đầu ca:</span>
                                    <span className="text-slate-800 font-medium">{(Number(initialCash) || 0).toLocaleString('vi-VN')} Đ</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>+ Doanh thu tiền mặt phát sinh:</span>
                                    <span className="text-emerald-600 font-medium">+{cashRevenue.toLocaleString('vi-VN')} Đ</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-3 border-dashed">
                                    <span className="font-semibold text-slate-700">(=) Tiền mặt dự tính phải có:</span>
                                    <strong className="text-slate-800 text-base">{expectedCash.toLocaleString('vi-VN')} Đ</strong>
                                </div>

                                <div className="flex justify-between bg-white p-3 border border-slate-200 rounded-lg text-base mt-3 shadow-sm">
                                    <span className="font-bold">Thực tế nhân viên đếm được:</span>
                                    <strong className="text-slate-800">{(Number(actualCash) || 0).toLocaleString('vi-VN')} Đ</strong>
                                </div>

                                <div className="flex justify-between pt-3 text-base font-black">
                                    <span>CHÊNH LỆCH KÉT:</span>
                                    <strong className={(Number(actualCash) || 0) - expectedCash >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                        {((Number(actualCash) || 0) - expectedCash > 0 ? "+" : "")}
                                        {((Number(actualCash) || 0) - expectedCash).toLocaleString('vi-VN')} Đ
                                    </strong>
                                </div>

                                {note && (
                                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                                        <span className="font-bold block mb-1">Ghi chú của bạn:</span> {note}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 pt-5 border-t border-slate-200 mt-5">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsConfirming(false)}
                                    className="flex-1 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors disabled:opacity-50"
                                >
                                    Quay lại sửa
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md disabled:bg-emerald-400"
                                >
                                    {isSubmitting ? 'Đang lưu báo cáo...' : 'Xác nhận Khớp két & Đăng xuất'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}