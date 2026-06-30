import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';
import AdminProductManager from './AdminProductManager';
import StaffManager from './StaffManager';
import AdminOrderDashboard from './AdminOrderDashboard';
import ShiftConfig from './ShiftConfig'; 
import AdminNotificationPanel from './AdminNotificationPanel';

export default function AdminManagement({ users = [], categories = [], products = [], ordersHistory = [] }) {
    const [activeTab, setActiveTab] = useState('dashboard');

    const [adminCategories, setAdminCategories] = useState([]);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [catName, setCatName] = useState('');

    useEffect(() => {
        setAdminCategories(categories);
    }, [categories]);

    const fetchAdminCategories = async () => {
        try {
            const res = await apiService.getCategories();
            setAdminCategories(res.data || res || []);
        } catch (error) {
            console.error("Lỗi tải danh mục:", error);
        }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!catName.trim()) return toast.error("Vui lòng nhập tên danh mục!");

        try {
            if (editingCat) {
                const res = await apiService.updateCategory(editingCat.id, { name: catName });
                if (res.status === 'success');
            } else {
                const res = await apiService.createCategory({ name: catName });
                if (res.status === 'success');
            }
            setIsCatModalOpen(false);
            fetchAdminCategories(); 
        } catch (error) {
            toast.error("Thao tác thất bại!");
        }
    };

    const handleDeleteCategory = (id, name) => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl text-rose-500">🗑️</span>
                    <p className="font-black text-slate-800 text-lg">Xóa danh mục?</p>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Bạn đang xóa danh mục <strong className="text-rose-600">{name}</strong>. Hãy chắc chắn rằng danh mục này không còn chứa món ăn nào!
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
                                const res = await apiService.deleteCategory(id);
                                if (res.status === 'success') {
                                    fetchAdminCategories();
                                } else {
                                    toast.error(res.message || "Xóa thất bại!");
                                }
                            } catch (error) {
                                toast.error("Không thể xóa! Danh mục đang chứa món ăn.");
                            }
                        }} 
                        className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 shadow-md transition-all"
                    >
                        Tiếp tục Xóa
                    </button>
                </div>
            </div>
        ), { duration: Infinity, id: 'delete-category-confirm', position: 'top-center', style: { padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } });
    };

    const renderMenu = () => (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6 animate-in fade-in">
            {/* CỘT 1: QUẢN LÝ DANH MỤC */}
            <div className="xl:col-span-1 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-fit max-h-[45vh] md:max-h-[80vh] flex flex-col">
                <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h2 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wider">Danh Mục</h2>
                    <button 
                        onClick={() => { setEditingCat(null); setCatName(''); setIsCatModalOpen(true); }}
                        className="bg-emerald-600 text-white px-2.5 py-1 md:px-3 md:py-1.5 rounded font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        +
                    </button>
                </div>
                <ul className="divide-y divide-slate-100 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {adminCategories.length === 0 ? <li className="p-4 text-center text-slate-400 text-xs font-bold">Chưa có dữ liệu</li> : null}
                    {adminCategories.map((c) => (
                        <li key={c.id} className="p-3 md:p-4 hover:bg-slate-50 flex justify-between items-center group transition-colors">
                            <span className="font-bold text-xs md:text-sm text-slate-700 truncate pr-2">{c.name}</span>
                            <div className="flex gap-1.5 md:gap-2 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => { setEditingCat(c); setCatName(c.name); setIsCatModalOpen(true); }} 
                                    className="text-[10px] font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                >
                                    Sửa
                                </button>
                                <button 
                                    onClick={() => handleDeleteCategory(c.id, c.name)} 
                                    className="text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                                >
                                    Xóa
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: QUẢN LÝ MÓN ĂN */}
            <div className="xl:col-span-3">
                <AdminProductManager categories={adminCategories} />
            </div>

            {/* MODAL THÊM/SỬA DANH MỤC */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-5 md:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-4">
                            {editingCat ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
                        </h3>
                        <form onSubmit={handleSaveCategory}>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Nhập tên (VD: Trà Sữa...)"
                                value={catName}
                                onChange={e => setCatName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-4 md:mb-5"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCatModalOpen(false)} className="px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Hủy</button>
                                <button type="submit" className="px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">Lưu lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50">
            {/* 🚀 THANH TABS ĐÃ TỐI ƯU CHO MOBILE (Nhỏ gọn, cuộn mượt, không bị thô) */}
            <div className="bg-white border-b border-slate-200 px-3 py-2.5 md:px-6 md:py-4 flex gap-2 md:gap-4 overflow-x-auto shadow-sm shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`px-3 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold md:font-black text-[11px] md:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <span className="text-sm md:text-base">📊</span> Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('users')} 
                    className={`px-3 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold md:font-black text-[11px] md:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <span className="text-sm md:text-base">👥</span> Tài Khoản
                </button>
                <button 
                    onClick={() => setActiveTab('menu')} 
                    className={`px-3 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold md:font-black text-[11px] md:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${activeTab === 'menu' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <span className="text-sm md:text-base">🍔</span> Thực Đơn
                </button>
                <button 
                    onClick={() => setActiveTab('shifts')} 
                    className={`px-3 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold md:font-black text-[11px] md:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${activeTab === 'shifts' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <span className="text-sm md:text-base">🕒</span> Giao Ca
                </button>
                <button 
                    onClick={() => setActiveTab('notifications')} 
                    className={`px-3 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold md:font-black text-[11px] md:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${activeTab === 'notifications' ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <span className="text-sm md:text-base">📢</span> Thông Báo
                </button>
            </div>

            {/* 🚀 KHUNG CONTENT TỐI ƯU (Thu hẹp padding trên mobile để Table hiện to hơn) */}
            <div className="flex-1 overflow-y-auto p-2 md:p-6 bg-slate-100/50">
                {activeTab === 'dashboard' && <AdminOrderDashboard />}
                {activeTab === 'users' && <StaffManager users={users} />} 
                {activeTab === 'menu' && renderMenu()}
                {activeTab === 'shifts' && <ShiftConfig />}
                
                {activeTab === 'notifications' && (
                    <div className="flex justify-center items-start mt-4 animate-in fade-in zoom-in-95 duration-200">
                        <AdminNotificationPanel />
                    </div>
                )}
            </div>
        </div>
    );
}