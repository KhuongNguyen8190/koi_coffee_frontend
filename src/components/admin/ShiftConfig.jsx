import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';
import { useWebSocket } from '../../hooks/useWebSocket'; 

export default function ShiftConfig() {
    const [shifts, setShifts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // =====================================
    // STATE PHÂN TRANG (PAGINATION)
    // =====================================
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // =====================================
    // STATE MODAL (VIEW HOẶC EDIT)
    // =====================================
    const [modalMode, setModalMode] = useState(null); // 'view' | 'edit' | null
    const [editingShift, setEditingShift] = useState(null);
    
    const [formData, setFormData] = useState({ 
        staffName: '', startTime: '', endTime: '', initialCash: 0, 
        batchCashRevenue: 0, transferRevenue: 0, actualCash: 0, note: '' 
    });

    const toDatetimeLocal = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };

    const fetchShifts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiService.getShifts(`?t=${new Date().getTime()}`);
            if (res && res.status === 'success') {
                // Sắp xếp ca mới nhất lên đầu (Dựa vào startTime)
                const sortedShifts = (res.data || []).sort((a, b) => {
                    const timeA = new Date(a.startTime || a.start_time || 0).getTime();
                    const timeB = new Date(b.startTime || b.start_time || 0).getTime();
                    return timeB - timeA;
                });
                setShifts(sortedShifts);
            }
        } catch (error) { console.error("Lỗi tải ca", error); } 
        finally { setIsLoading(false); }
    }, []);

    // CHỈ GỌI FETCH LẦN ĐẦU
    useEffect(() => { 
        fetchShifts(); 
    }, [fetchShifts]);

    // Tự động Reset về Trang 1 nếu thay đổi số lượng hiển thị
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    // ====================================================================
    // LẮNG NGHE WEBSOCKET
    // ====================================================================
    useWebSocket('/topic/public', (message) => {
        const body = message.replace(/"/g, ''); 
        if (body === 'SHIFT_OPENED' || body === 'SHIFT_CLOSED' || body === 'DATA_CHANGED') {
            fetchShifts(); 
        }
    });

    // =========================================================================
    // XỬ LÝ DỮ LIỆU PHÂN TRANG
    // =========================================================================
    const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(shifts.length / itemsPerPage);
    
    const paginatedShifts = useMemo(() => {
        if (itemsPerPage === 'ALL') return shifts;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return shifts.slice(startIndex, startIndex + itemsPerPage);
    }, [shifts, currentPage, itemsPerPage]);

    // Mở Modal Xem Chi Tiết
    const openViewModal = (shift) => {
        setEditingShift(shift);
        setModalMode('view');
    };

    // Mở Modal Chỉnh Sửa
    const openEditModal = (shift) => {
        setEditingShift(shift);
        setFormData({
            staffName: shift.staffName || '',
            startTime: toDatetimeLocal(shift.startTime || shift.start_time || ''),
            endTime: toDatetimeLocal(shift.endTime || shift.end_time || ''),
            initialCash: shift.initialCash || 0,
            batchCashRevenue: shift.batchCashRevenue || 0,
            transferRevenue: shift.transferRevenue || 0,
            actualCash: shift.actualCash || 0,
            note: shift.note || ''
        });
        setModalMode('edit');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                ...formData, 
                startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
                endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null 
            };
            await apiService.updateAdminShift(editingShift.id, payload);
            toast.success("Cập nhật ca làm việc thành công!");
            setModalMode(null);
            fetchShifts();
        } catch (error) { toast.error("Lỗi khi lưu ca làm việc!"); }
    };

    const handleDelete = (shift) => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl text-rose-500">⚠️</span>
                    <p className="font-black text-slate-800 text-lg">Xóa lịch sử ca?</p>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Bạn có chắc chắn muốn xóa bản ghi ca làm việc của <strong className="text-rose-600">{shift.staffName}</strong>? Hành động này không thể hoàn tác.
                </p>
                <div className="flex gap-2 mt-2">
                    <button 
                        onClick={() => toast.dismiss(t.id)} 
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                await apiService.deleteShift(shift.id);
                                toast.success("Đã xóa lịch sử ca làm việc!");
                                fetchShifts(); 
                            } catch (error) { 
                                toast.error("Lỗi khi xóa!"); 
                            }
                        }} 
                        className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 shadow-md transition-all"
                    >
                        Xác nhận Xóa
                    </button>
                </div>
            </div>
        ), { duration: Infinity, id: 'delete-shift-confirm', position: 'top-center', style: { padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } });
    };

    const formatCurrency = (amount) => Number(amount || 0).toLocaleString('vi-VN') + ' đ';
    const formatDate = (dateString) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Tính toán Tự động khi đang gõ trong form Sửa
    const calculatedTotalRev = Number(formData.batchCashRevenue) + Number(formData.transferRevenue);
    const calculatedVariance = Number(formData.actualCash) - (Number(formData.initialCash) + calculatedTotalRev);

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-lg font-black text-slate-800">Lịch Sử Giao Ca</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">Giám sát doanh thu và độ lệch két tiền mặt</p>
                </div>
                <button onClick={fetchShifts} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors">
                    🔄 Làm mới
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-4">Nhân viên</th>
                                <th className="px-5 py-4">Giờ mở ca</th>
                                <th className="px-5 py-4">Giờ kết ca</th>
                                <th className="px-5 py-4">Tổng doanh thu</th>
                                <th className="px-5 py-4">Thực thu tại Két</th>
                                <th className="px-5 py-4">Lệch két</th>
                                <th className="px-5 py-4 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {isLoading ? (
                                <tr><td colSpan="7" className="text-center py-10 text-slate-400 font-bold">Đang tải dữ liệu...</td></tr>
                            ) : paginatedShifts.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-10 text-slate-400 font-bold italic">Chưa có dữ liệu chốt ca!</td></tr>
                            ) : (
                                paginatedShifts.map((s) => {
                                    const isNeg = s.variance < 0;
                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4 font-black text-slate-800">{s.staffName || '---'}</td>
                                            <td className="px-5 py-4 text-xs font-bold text-slate-500">{formatDate(s.startTime || s.start_time)}</td>
                                            <td className="px-5 py-4 text-xs font-bold text-slate-600">{formatDate(s.endTime || s.end_time)}</td>
                                            <td className="px-5 py-4 text-emerald-600 font-black">{formatCurrency(s.totalRevenue)}</td>
                                            <td className="px-5 py-4 text-blue-600 font-black">{formatCurrency(s.actualCash)}</td>
                                            <td className="px-5 py-4">
                                                {s.variance === 0 ? <span className="text-slate-400 font-bold">Khớp két (0 đ)</span> : 
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black ${isNeg ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {isNeg ? '' : '+'}{formatCurrency(s.variance)}
                                                </span>}
                                            </td>
                                            <td className="px-5 py-4 text-center space-x-2">
                                                <button onClick={() => openViewModal(s)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Chi tiết</button>
                                                <button onClick={() => openEditModal(s)} className="text-blue-500 hover:text-blue-700 text-xs font-bold px-2">Sửa</button>
                                                <button onClick={() => handleDelete(s)} className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2">Xóa</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- THANH ĐIỀU HƯỚNG PHÂN TRANG --- */}
                {shifts.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                            <span>Hiển thị:</span>
                            <select 
                                value={itemsPerPage} 
                                onChange={(e) => setItemsPerPage(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                className="border border-slate-200 bg-white p-1.5 rounded-lg outline-none focus:border-blue-500 text-slate-700 cursor-pointer"
                            >
                                <option value={10}>10 dòng/trang</option>
                                <option value={20}>20 dòng/trang</option>
                                <option value={50}>50 dòng/trang</option>
                                <option value="ALL">Tất cả</option>
                            </select>
                            <span className="hidden sm:inline">/ Tổng số {shifts.length} bản ghi</span>
                        </div>

                        {itemsPerPage !== 'ALL' && totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm"
                                >
                                    Trước
                                </button>
                                <span className="px-4 py-1.5 text-sm font-black text-slate-700 bg-white border border-slate-100 rounded-lg shadow-sm">
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
            </div>

            {/* ========================================================= */}
            {/* MODAL: XEM CHI TIẾT CA LÀM VIỆC                             */}
            {/* ========================================================= */}
            {modalMode === 'view' && editingShift && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-800">Chi Tiết Báo Cáo Ca</h3>
                            <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-wider ${editingShift.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {editingShift.status === 'OPEN' ? 'ĐANG TRỰC' : 'ĐÃ CHỐT'}
                            </span>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-sm font-bold text-slate-500">Người trực ca:</span>
                                <span className="text-sm font-black text-slate-800">{editingShift.staffName}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-sm font-bold text-slate-500">Giờ mở ca:</span>
                                <span className="text-sm font-bold text-slate-800">{formatDate(editingShift.startTime || editingShift.start_time)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-sm font-bold text-slate-500">Giờ kết ca:</span>
                                <span className="text-sm font-bold text-slate-800">{formatDate(editingShift.endTime || editingShift.end_time)}</span>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Tiền Két đầu ca:</span>
                                    <span className="text-sm font-bold text-slate-700">{formatCurrency(editingShift.initialCash)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Doanh thu Tiền mặt:</span>
                                    <span className="text-sm font-bold text-slate-700">{formatCurrency(editingShift.batchCashRevenue)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Doanh thu Chuyển khoản:</span>
                                    <span className="text-sm font-bold text-blue-600">{formatCurrency(editingShift.transferRevenue)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                    <span className="text-sm font-black text-slate-800">TỔNG DOANH THU:</span>
                                    <span className="text-lg font-black text-emerald-600">{formatCurrency(editingShift.totalRevenue)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <span className="text-sm font-bold text-blue-800">Khai báo thực thu Két:</span>
                                <span className="text-lg font-black text-blue-700">{formatCurrency(editingShift.actualCash)}</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <span className="text-sm font-bold text-slate-600">Trạng thái Lệch két:</span>
                                <span className={`text-lg font-black ${editingShift.variance < 0 ? 'text-rose-600' : editingShift.variance > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    {editingShift.variance > 0 ? '+' : ''}{formatCurrency(editingShift.variance)}
                                </span>
                            </div>

                            {editingShift.note && (
                                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                    <span className="text-xs font-bold text-amber-800 block mb-1">Ghi chú của thu ngân:</span>
                                    <span className="text-sm font-medium text-amber-900">{editingShift.note}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setModalMode(null)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors">Đóng cửa sổ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: CHỈNH SỬA CA LÀM VIỆC (Dành cho Admin fix lỗi)     */}
            {/* ========================================================= */}
            {modalMode === 'edit' && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <form onSubmit={handleSaveEdit} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h3 className="text-xl font-black text-slate-800">Chỉnh sửa Ca làm việc</h3>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nhân viên trực ca *</label>
                                    <input type="text" value={formData.staffName} onChange={e => setFormData({...formData, staffName: e.target.value})} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-sm" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Giờ mở ca</label>
                                    <input type="datetime-local" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Giờ kết ca *</label>
                                    <input type="datetime-local" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-sm" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tiền đầu ca</label>
                                    <input type="number" value={formData.initialCash} onChange={e => setFormData({...formData, initialCash: Number(e.target.value)})} className="w-full border border-slate-200 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Doanh thu Tiền mặt</label>
                                    <input type="number" value={formData.batchCashRevenue} onChange={e => setFormData({...formData, batchCashRevenue: Number(e.target.value)})} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Doanh thu C.Khoản</label>
                                    <input type="number" value={formData.transferRevenue} onChange={e => setFormData({...formData, transferRevenue: Number(e.target.value)})} className="w-full border border-blue-200 bg-blue-50 text-blue-700 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">TỔNG DOANH THU (TỰ TÍNH)</label>
                                    <p className="font-black text-emerald-700 text-lg">{formatCurrency(calculatedTotalRev)}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase block mb-1">Thực thu tại Két</label>
                                    <input type="number" value={formData.actualCash} onChange={e => setFormData({...formData, actualCash: Number(e.target.value)})} className="w-full border border-blue-300 bg-white text-blue-700 p-3 rounded-xl focus:border-blue-500 outline-none font-black text-lg" />
                                </div>
                            </div>

                            <div className={`p-4 mt-2 rounded-xl border ${calculatedVariance < 0 ? 'bg-rose-50 border-rose-200' : calculatedVariance > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'} flex justify-between items-center transition-colors`}>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Lệch két (Tự tính)</p>
                                    <p className="text-[10px] font-medium opacity-60">Thực thu - (Đầu ca + Doanh thu Tiền mặt)</p>
                                </div>
                                <span className={`text-2xl font-black ${calculatedVariance < 0 ? 'text-rose-600' : calculatedVariance > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                    {calculatedVariance > 0 ? '+' : ''}{formatCurrency(calculatedVariance)}
                                </span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ghi chú (Tùy chọn)</label>
                                <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl focus:border-blue-500 outline-none font-medium text-sm h-16 resize-none" placeholder="Lý do chỉnh sửa..." />
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setModalMode(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 transition-colors">Hủy bỏ</button>
                            <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors">Lưu thay đổi</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}