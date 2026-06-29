import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';
import { useWebSocket } from '../../hooks/useWebSocket'; 

export default function AdminOrderDashboard() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // State cho Modal Xem chi tiết
    const [selectedOrder, setSelectedOrder] = useState(null);

    // =========================================================================
    // STATE CHO TÍNH NĂNG SỬA TRẠNG THÁI HÓA ĐƠN
    // =========================================================================
    const [editingAdminOrder, setEditingAdminOrder] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [editFormData, setEditFormData] = useState({
        status: '',
        paymentMethod: '',
        note: ''
    });

    // =========================================================================
    // STATE LỌC & TÌM KIẾM
    // =========================================================================
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('DAY'); // DAY, MONTH, YEAR, RANGE, ALL
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    const [dateValue, setDateValue] = useState(`${yyyy}-${mm}-${dd}`);
    const [monthValue, setMonthValue] = useState(`${yyyy}-${mm}`);
    const [yearValue, setYearValue] = useState(`${yyyy}`);
    const [startDate, setStartDate] = useState(`${yyyy}-${mm}-01`);
    const [endDate, setEndDate] = useState(`${yyyy}-${mm}-${dd}`);

    // =========================================================================
    // STATE PHÂN TRANG (PAGINATION)
    // =========================================================================
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Mặc định 10 đơn, có thể đổi thành 'ALL'

    // =========================================================================
    // FETCH DỮ LIỆU CHÍNH
    // =========================================================================
    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiService.getOrders(`?t=${new Date().getTime()}`);
            if (res && (res.data || Array.isArray(res))) {
                const data = res.data || res;
                const sorted = data.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
                setOrders(sorted);
            }
        } catch (error) {
            toast.error("Không thể tải danh sách đơn hàng!", { id: 'fetch_order_err' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // WebSocket Lắng nghe thay đổi
    useWebSocket('/topic/public', (messageBody) => {
        if (messageBody === 'DATA_CHANGED' || messageBody === 'ORDER_CHANGED' || messageBody === 'SHIFT_CLOSED') {
            fetchOrders();
        }
    });

    // =========================================================================
    // LOGIC SỬA TRẠNG THÁI ĐƠN HÀNG
    // =========================================================================
    const handleOpenEdit = (order) => {
        setEditingAdminOrder(order);
        setEditFormData({
            status: order.status || 'PENDING',
            paymentMethod: order.paymentMethod || 'CASH',
            note: order.note || ''
        });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        toast.dismiss(); 
        
        setIsSaving(true);
        try {
            const res = await apiService.updateAdminOrder(editingAdminOrder.id, editFormData);
            if (res.status === 'success') {
                toast.success("Cập nhật trạng thái thành công!", { id: 'update_status_ok', duration: 2000 });
                setEditingAdminOrder(null);
                fetchOrders(); 
            } else {
                toast.error(res.message || "Cập nhật thất bại!", { id: 'update_status_fail', duration: 2500 });
            }
        } catch (error) {
            toast.error("Lỗi hệ thống khi cập nhật trạng thái!", { id: 'update_status_sys_err', duration: 2500 });
        } finally {
            setIsSaving(false);
        }
    };

    // =========================================================================
    // LỌC VÀ THỐNG KÊ DOANH THU (Chỉ chạy khi dữ liệu thay đổi, không chạy lại khi đổi trang)
    // =========================================================================
    const { filteredOrders, metrics } = useMemo(() => {
        let result = orders;

        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(o => 
                (o.code && o.code.toLowerCase().includes(lowerTerm)) || 
                (o.staffName && o.staffName.toLowerCase().includes(lowerTerm))
            );
        }

        result = result.filter(order => {
            if (filterType === 'ALL') return true;
            
            const oDate = new Date(order.createdAt || order.created_at);
            if (isNaN(oDate.getTime())) return true;

            const oY = oDate.getFullYear();
            const oM = String(oDate.getMonth() + 1).padStart(2, '0');
            const oD = String(oDate.getDate()).padStart(2, '0');
            const oDateStr = `${oY}-${oM}-${oD}`;
            const oMonthStr = `${oY}-${oM}`;

            if (filterType === 'DAY') return oDateStr === dateValue;
            if (filterType === 'MONTH') return oMonthStr === monthValue;
            if (filterType === 'YEAR') return String(oY) === yearValue;
            if (filterType === 'RANGE') {
                return oDateStr >= startDate && oDateStr <= endDate;
            }
            return true;
        });

        const validStatuses = ['PAID', 'COMPLETED', 'HOÀN THÀNH'];
        const pendingStatuses = ['PENDING', 'MỚI', 'PROCESSING', 'ĐANG XỬ LÝ', 'SHIPPING', 'ĐANG GIAO'];
        const cancelledStatuses = ['CANCELLED', 'HỦY']; 

        const completedOrders = result.filter(o => validStatuses.includes(String(o.status).toUpperCase()));
        const pendingOrders = result.filter(o => pendingStatuses.includes(String(o.status).toUpperCase()));
        const cancelledOrders = result.filter(o => cancelledStatuses.includes(String(o.status).toUpperCase()));
        
        const getFinalPrice = (o) => Math.max(0, (o.totalPrice || 0) - (o.discount || 0));

        const totalRevenue = completedOrders.reduce((sum, o) => sum + getFinalPrice(o), 0);
        const cashRevenue = completedOrders.filter(o => ['CASH', 'TIỀN MẶT'].includes(String(o.paymentMethod).toUpperCase())).reduce((sum, o) => sum + getFinalPrice(o), 0);
        const transferRevenue = completedOrders.filter(o => ['TRANSFER', 'CHUYỂN KHOẢN'].includes(String(o.paymentMethod).toUpperCase())).reduce((sum, o) => sum + getFinalPrice(o), 0);
        const pendingRevenue = pendingOrders.reduce((sum, o) => sum + getFinalPrice(o), 0);

        return { 
            filteredOrders: result, 
            metrics: { 
                totalRevenue, 
                cashRevenue, 
                transferRevenue, 
                pendingRevenue, 
                totalOrders: result.length, 
                completedOrders: completedOrders.length,
                cancelledCount: cancelledOrders.length 
            } 
        };
    }, [orders, searchTerm, filterType, dateValue, monthValue, yearValue, startDate, endDate]);

    // Tự động Reset về Trang 1 nếu thay đổi bộ lọc tìm kiếm
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, dateValue, monthValue, yearValue, startDate, endDate, itemsPerPage]);

    // =========================================================================
    // XỬ LÝ DỮ LIỆU PHÂN TRANG (Cắt mảng dựa trên Current Page)
    // =========================================================================
    const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(filteredOrders.length / itemsPerPage);
    
    const paginatedOrders = useMemo(() => {
        if (itemsPerPage === 'ALL') return filteredOrders;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredOrders, currentPage, itemsPerPage]);

    // =========================================================================
    // TIỆN ÍCH HIỂN THỊ
    // =========================================================================
    const formatCurrency = (amount) => Number(amount || 0).toLocaleString('vi-VN') + ' đ';
    const formatDate = (dateString) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleString('vi-VN', { 
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' 
        });
    };

    const getStatusStyle = (status) => {
        const s = String(status).toUpperCase();
        if (s === 'PENDING' || s === 'MỚI') return { text: 'Chờ thanh toán', class: 'bg-sky-100 text-sky-700' };
        if (s === 'PROCESSING' || s === 'ĐANG XỬ LÝ') return { text: 'Đang xử lý', class: 'bg-blue-100 text-blue-700' };
        if (s === 'SHIPPING' || s === 'ĐANG GIAO') return { text: 'Đang giao', class: 'bg-amber-100 text-amber-700' };
        if (s === 'PAID' || s === 'COMPLETED' || s === 'HOÀN THÀNH') return { text: 'Đã thanh toán', class: 'bg-emerald-100 text-emerald-700' };
        if (s === 'CANCELLED' || s === 'HỦY') return { text: 'Hủy bỏ', class: 'bg-rose-100 text-rose-700' };
        return { text: status || 'Không rõ', class: 'bg-slate-100 text-slate-700' };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. THANH TÌM KIẾM & LỌC */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap lg:flex-nowrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Tìm kiếm đơn hàng</label>
                    <input 
                        type="text" 
                        placeholder="Nhập mã đơn, tên nhân viên..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full border border-slate-200 bg-slate-50 p-2.5 rounded-xl outline-none focus:border-[#00a67d] font-medium text-sm transition-colors"
                    />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Chế độ lọc</label>
                    <select 
                        value={filterType} 
                        onChange={e => setFilterType(e.target.value)}
                        className="border border-slate-200 bg-slate-50 p-2.5 rounded-xl outline-none focus:border-[#00a67d] font-bold text-sm text-slate-700 cursor-pointer transition-colors"
                    >
                        <option value="DAY">Theo Ngày</option>
                        <option value="MONTH">Theo Tháng</option>
                        <option value="YEAR">Theo Năm</option>
                        <option value="RANGE">Từ ngày - Đến ngày</option>
                        <option value="ALL">Tất cả thời gian</option>
                    </select>
                </div>

                {filterType === 'DAY' && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Chọn ngày</label>
                        <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} className="border border-slate-200 bg-slate-50 p-2.5 rounded-xl outline-none focus:border-[#00a67d] font-medium text-sm" />
                    </div>
                )}
                {filterType === 'MONTH' && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Chọn tháng</label>
                        <input type="month" value={monthValue} onChange={e => setMonthValue(e.target.value)} className="border border-slate-200 bg-slate-50 p-2.5 rounded-xl outline-none focus:border-[#00a67d] font-medium text-sm" />
                    </div>
                )}
                {filterType === 'YEAR' && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Chọn năm</label>
                        <input type="number" min="2020" max="2100" value={yearValue} onChange={e => setYearValue(e.target.value)} className="w-24 border border-slate-200 bg-slate-50 p-2.5 rounded-xl outline-none focus:border-[#00a67d] font-medium text-sm text-center" />
                    </div>
                )}
                {filterType === 'RANGE' && (
                    <div className="flex gap-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Từ ngày</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-200 bg-slate-50 p-2.5 rounded-xl outline-none focus:border-[#00a67d] font-medium text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Đến ngày</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-200 bg-slate-50 p-2.5 rounded-xl outline-none focus:border-[#00a67d] font-medium text-sm" />
                        </div>
                    </div>
                )}
            </div>

            {/* 2. THỐNG KÊ DOANH THU */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-[#00a67d]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Đã Thu Thực Tế</p>
                    <h3 className="text-xl font-black text-[#00a67d]">{formatCurrency(metrics.totalRevenue)}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiền Mặt</p>
                    <h3 className="text-xl font-black text-slate-700">{formatCurrency(metrics.cashRevenue)}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chuyển Khoản</p>
                    <h3 className="text-xl font-black text-blue-600">{formatCurrency(metrics.transferRevenue)}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chờ Thanh Toán</p>
                    <h3 className="text-xl font-black text-amber-500">{formatCurrency(metrics.pendingRevenue)}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-rose-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Đơn Bị Hủy</p>
                    <h3 className="text-xl font-black text-rose-600">
                        {metrics.cancelledCount} <span className="text-xs font-bold text-slate-400">đơn</span>
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-indigo-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng Đơn Hàng</p>
                    <h3 className="text-xl font-black text-indigo-600">
                        {metrics.totalOrders} <span className="text-xs font-bold text-slate-400">({metrics.completedOrders} xong)</span>
                    </h3>
                </div>
            </div>

            {/* 3. BẢNG DANH SÁCH ĐƠN HÀNG */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Mã đơn</th>
                                <th className="px-6 py-4">Thời gian</th>
                                <th className="px-6 py-4">Nhân viên</th>
                                <th className="px-6 py-4">Tạm tính</th>
                                <th className="px-6 py-4 text-rose-500">Chiết khấu</th>
                                <th className="px-6 py-4">Thực thu</th>
                                <th className="px-6 py-4">Phương thức</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {isLoading ? (
                                <tr><td colSpan="9" className="text-center py-10 text-slate-400 font-bold">Đang tải dữ liệu...</td></tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr><td colSpan="9" className="text-center py-10 text-slate-400 font-bold italic">Không tìm thấy đơn hàng nào!</td></tr>
                            ) : (
                                paginatedOrders.map(order => {
                                    const stt = getStatusStyle(order.status);
                                    const finalPrice = Math.max(0, (order.totalPrice || 0) - (order.discount || 0));
                                    
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-black text-slate-800">{order.code}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(order.createdAt || order.created_at)}</td>
                                            <td className="px-6 py-4">{order.staffName}</td>
                                            
                                            {/* Cột tiền */}
                                            <td className={`px-6 py-4 font-bold text-slate-400 ${order.discount > 0 ? 'line-through text-xs' : ''}`}>
                                                {formatCurrency(order.totalPrice)}
                                            </td>
                                            <td className="px-6 py-4 font-black text-rose-500">
                                                {order.discount > 0 ? `- ${formatCurrency(order.discount)}` : ''}
                                            </td>
                                            <td className="px-6 py-4 font-black text-[#00a67d]">
                                                {formatCurrency(finalPrice)}
                                            </td>
                                            
                                            <td className="px-6 py-4">
                                                {order.paymentMethod === 'CASH' ? '💵 Tiền mặt' : order.paymentMethod === 'TRANSFER' ? '🏦 Chuyển khoản' : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${stt.class}`}>
                                                    {stt.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center space-x-2">
                                                <button 
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                >
                                                    Xem
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenEdit(order)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2"
                                                >
                                                    Đổi STT
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- THANH ĐIỀU HƯỚNG PHÂN TRANG --- */}
                {filteredOrders.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                            <span>Hiển thị:</span>
                            <select 
                                value={itemsPerPage} 
                                onChange={(e) => setItemsPerPage(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                className="border border-slate-200 bg-white p-1.5 rounded-lg outline-none focus:border-[#00a67d] text-slate-700 cursor-pointer"
                            >
                                <option value={10}>10 đơn/trang</option>
                                <option value={20}>20 đơn/trang</option>
                                <option value={50}>50 đơn/trang</option>
                                <option value="ALL">Tất cả đơn</option>
                            </select>
                            <span className="hidden sm:inline">/ Tổng số {filteredOrders.length} đơn</span>
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

            {/* 4. MODAL CHI TIẾT ĐƠN HÀNG */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Chi tiết đơn {selectedOrder.code}</h3>
                                <p className="text-xs font-bold text-slate-500 mt-1">{formatDate(selectedOrder.createdAt || selectedOrder.created_at)}</p>
                            </div>
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${getStatusStyle(selectedOrder.status).class}`}>
                                {getStatusStyle(selectedOrder.status).text}
                            </span>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Nhân viên phục vụ</p>
                                    <p className="font-bold text-slate-700 text-sm mt-0.5">{selectedOrder.staffName || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Phương thức thanh toán</p>
                                    <p className="font-bold text-slate-700 text-sm mt-0.5">
                                        {selectedOrder.paymentMethod === 'CASH' ? 'Tiền mặt' : selectedOrder.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Chưa thanh toán'}
                                    </p>
                                </div>
                            </div>

                            <h4 className="text-xs font-black text-slate-800 uppercase mb-3">Danh sách món ({selectedOrder.orderDetails?.length || 0})</h4>
                            <div className="space-y-3">
                                {selectedOrder.orderDetails?.map((item, idx) => (
                                    <div key={item.id || idx} className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-bold text-sm text-slate-700">{item.product?.name || 'Món đã xóa'}</p>
                                            <div className="flex gap-3 text-xs font-medium text-slate-500 mt-0.5">
                                                <span>SL: {item.quantity}</span>
                                                <span>Giá: {formatCurrency(item.price)}</span>
                                            </div>
                                            {item.note && <p className="text-[10px] text-amber-600 bg-amber-50 inline-block px-2 py-0.5 rounded mt-1 font-bold">Ghi chú: {item.note}</p>}
                                        </div>
                                        <p className="font-black text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                            <div className="flex justify-between items-center mb-2 text-sm font-bold text-slate-500">
                                <span>Tạm tính:</span>
                                <span>{formatCurrency(selectedOrder.totalPrice)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3 text-sm font-bold text-rose-500">
                                <span>Giảm giá (Chiết khấu):</span>
                                <span>- {formatCurrency(selectedOrder.discount || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200">
                                <span className="text-base font-black text-slate-800 uppercase">Khách cần trả:</span>
                                <span className="text-2xl font-black text-[#00a67d]">
                                    {formatCurrency(Math.max(0, (selectedOrder.totalPrice || 0) - (selectedOrder.discount || 0)))}
                                </span>
                            </div>
                            
                            <button 
                                onClick={() => setSelectedOrder(null)} 
                                className="w-full mt-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-md"
                            >
                                Đóng cửa sổ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. MODAL SỬA TRẠNG THÁI VÀ PHƯƠNG THỨC THANH TOÁN */}
            {editingAdminOrder && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-xl font-black text-slate-800">Cập nhật đơn {editingAdminOrder.code}</h3>
                            <p className="text-xs font-bold text-slate-500 mt-1">Chỉnh sửa trạng thái thanh toán hoặc Hủy đơn</p>
                        </div>
                        
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Trạng thái thanh toán</label>
                                <select 
                                    value={editFormData.status}
                                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                                    className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:border-[#00a67d] font-bold text-sm bg-slate-50"
                                >
                                    <option value="PENDING">Chưa thanh toán</option>
                                    <option value="PAID">Đã thanh toán (Hoàn thành)</option>
                                    <option value="CANCELLED">Hủy bỏ</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setEditingAdminOrder(null)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Đóng
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-[#00a67d] text-white rounded-xl font-bold hover:bg-[#00916d] transition-colors disabled:opacity-50 shadow-md"
                                >
                                    {isSaving ? 'Đang lưu...' : 'Lưu cập nhật'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}