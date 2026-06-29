import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

export default function AdminNotificationPanel() {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notifications, setNotifications] = useState([]);
    
    // Quản lý theo ID để sửa/xóa chính xác dòng đang click
    const [editingId, setEditingId] = useState(null);
    const [editInput, setEditInput] = useState('');

    // =========================================================================
    // STATE PHÂN TRANG (PAGINATION)
    // =========================================================================
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Mặc định 10 dòng/trang

    const fetchNotifications = async () => {
        try {
            const res = await apiService.getAdminNotifications();
            // Sắp xếp thông báo mới nhất lên đầu
            const sortedNotifs = (res.data || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setNotifications(sortedNotifs);
        } catch (error) {
            console.error("Lỗi lấy danh sách thông báo:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    // Tự động Reset về Trang 1 nếu thay đổi số lượng hiển thị
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    // =========================================================================
    // XỬ LÝ DỮ LIỆU PHÂN TRANG
    // =========================================================================
    const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(notifications.length / itemsPerPage);
    
    const paginatedNotifications = useMemo(() => {
        if (itemsPerPage === 'ALL') return notifications;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return notifications.slice(startIndex, startIndex + itemsPerPage);
    }, [notifications, currentPage, itemsPerPage]);

    // 1. Gửi thông báo mới
    const handleSendNotification = async (e) => {
        e.preventDefault();
        if (!message.trim()) return toast.error("Vui lòng nhập nội dung thông báo!");

        setIsSubmitting(true);
        try {
            const res = await apiService.sendAdminNotification({ content: message });
            if (res.status === 'success') {
                toast.success("Đã phát thông báo!");
                setMessage('');
                fetchNotifications();
                setCurrentPage(1); // Phát xong thì về trang 1 xem cho rõ
            } else {
                toast.error(res.message || "Không thể gửi thông báo!");
            }
        } catch (error) {
            toast.error("Lỗi kết nối đến máy chủ!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 2. Chỉnh sửa thông báo bằng ID
    const handleSaveEdit = async (id) => {
        if (!editInput.trim()) return toast.error("Nội dung không được để trống!");
        
        try {
            const res = await apiService.editAdminNotification(id, { newContent: editInput });
            if (res.status === 'success') {
                toast.success("Đã cập nhật đợt thông báo này!");
                setEditingId(null);
                fetchNotifications();
            } else {
                toast.error("Cập nhật thất bại!");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra khi cập nhật!");
        }
    };

    // 3. Thu hồi
    const handleRecall = (id) => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl text-rose-500">⚠️</span>
                    <p className="font-black text-slate-800 text-lg">Thu hồi thông báo?</p>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Đợt thông báo này sẽ bị thu hồi và biến mất khỏi máy của tất cả nhân viên.
                </p>
                <div className="flex gap-2 mt-2">
                    <button 
                        onClick={() => toast.dismiss(t.id)} 
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                const res = await apiService.deleteAdminNotification(id);
                                if (res.status === 'success') {
                                    toast.success("Đã thu hồi thành công!");
                                    fetchNotifications();
                                }
                            } catch (error) {
                                toast.error("Thu hồi thất bại!");
                            }
                        }} 
                        className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 shadow-md"
                    >
                        Xác nhận Thu hồi
                    </button>
                </div>
            </div>
        ), { duration: Infinity, id: 'recall-confirm' });
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl">
            {/* KHỐI 1: FORM GỬI THÔNG BÁO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="mb-5">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        📢 Phát Thông Báo Khẩn
                    </h3>
                </div>
                
                <form onSubmit={handleSendNotification} className="space-y-4">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ví dụ: Tối nay quán có sự kiện sinh nhật, các bạn chuẩn bị dọn bàn nhé!"
                        rows="2"
                        className="w-full p-4 border border-slate-200 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none text-sm font-bold text-slate-700 resize-none bg-slate-50 focus:bg-white transition-all shadow-inner"
                    ></textarea>
                    
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-sky-500 text-white font-black text-sm rounded-xl hover:bg-sky-600 hover:-translate-y-0.5 shadow-lg shadow-sky-500/30 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? '⏳ Đang phát...' : '🚀 GỬI THÔNG BÁO NGAY'}
                        </button>
                    </div>
                </form>
            </div>

            {/* KHỐI 2: LỊCH SỬ THÔNG BÁO CỦA ADMIN */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        Thông báo bạn đã tạo ({notifications.length})
                    </h3>
                </div>
                
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white shadow-sm z-10">
                            <tr className="text-slate-400 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                                <th className="p-4 w-24">ID</th>
                                <th className="p-4 w-40">Thời gian tạo</th>
                                <th className="p-4">Nội dung thông báo</th>
                                <th className="p-4 text-right w-48">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedNotifications.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 font-bold">Chưa có thông báo nào.</td>
                                </tr>
                            )}
                            {paginatedNotifications.map(n => (
                                <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-xs font-black text-slate-400">#{n.id}</td>
                                    <td className="p-4 text-xs font-bold text-slate-500">
                                        {new Date(n.createdAt).toLocaleString('vi-VN')}
                                    </td>
                                    
                                    <td className="p-4">
                                        {editingId === n.id ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text"
                                                    value={editInput}
                                                    onChange={(e) => setEditInput(e.target.value)}
                                                    className="flex-1 border border-sky-300 bg-white px-3 py-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => handleSaveEdit(n.id)}
                                                    className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600"
                                                >
                                                    Lưu
                                                </button>
                                                <button 
                                                    onClick={() => setEditingId(null)}
                                                    className="bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-300"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-bold text-slate-700 block">
                                                {n.content}
                                            </span>
                                        )}
                                    </td>
                                    
                                    <td className="p-4 text-right space-x-2">
                                        <button 
                                            onClick={() => {
                                                setEditingId(n.id);
                                                setEditInput(n.content);
                                            }}
                                            className="text-[10px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors border border-sky-200/50"
                                            disabled={editingId !== null}
                                        >
                                            Chỉnh sửa
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleRecall(n.id)}
                                            className="text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors border border-rose-200/50"
                                            disabled={editingId !== null}
                                        >
                                            Thu hồi
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- THANH ĐIỀU HƯỚNG PHÂN TRANG --- */}
                {notifications.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                            <span>Hiển thị:</span>
                            <select 
                                value={itemsPerPage} 
                                onChange={(e) => setItemsPerPage(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                className="border border-slate-200 bg-white p-1.5 rounded-lg outline-none focus:border-sky-500 text-slate-700 cursor-pointer"
                            >
                                <option value={10}>10 dòng/trang</option>
                                <option value={20}>20 dòng/trang</option>
                                <option value={50}>50 dòng/trang</option>
                                <option value="ALL">Tất cả</option>
                            </select>
                            <span className="hidden sm:inline">/ Tổng số {notifications.length} bản ghi</span>
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
        </div>
    );
}