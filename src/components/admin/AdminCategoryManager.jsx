import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

export default function AdminCategoryManager() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [name, setName] = useState('');

    // Gọi API lấy dữ liệu khi Component được render
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await apiService.getCategories();
            setCategories(res.data || res || []);
        } catch (error) {
            toast.error("Lỗi khi tải danh mục!");
        } finally {
            setLoading(false);
        }
    };

    // Mở Modal Thêm mới
    const handleAddNew = () => {
        setEditingCategory(null);
        setName('');
        setIsModalOpen(true);
    };

    // Mở Modal Chỉnh sửa
    const handleEdit = (cat) => {
        setEditingCategory(cat);
        setName(cat.name);
        setIsModalOpen(true);
    };

    // Xử lý Thêm / Sửa
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return toast.error("Vui lòng nhập tên danh mục!");

        try {
            if (editingCategory) {
                // Đang ở chế độ SỬA
                const res = await apiService.updateCategory(editingCategory.id, { name });
                if (res.status === 'success') toast.success("Đã cập nhật danh mục!");
            } else {
                // Đang ở chế độ THÊM
                const res = await apiService.createCategory({ name });
                if (res.status === 'success') toast.success("Đã thêm danh mục mới!");
            }
            setIsModalOpen(false);
            
            // 🚀 QUAN TRỌNG: Tự động tải lại trang sau 1 giây để đồng bộ 
            // danh mục mới cho cả Form thêm sản phẩm và trang POS nhân viên
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            toast.error("Thao tác thất bại!");
        }
    };

    // Xử lý Xóa
    const handleDelete = async (id, catName) => {
        if (!window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa danh mục "${catName}" không?`)) return;

        try {
            const res = await apiService.deleteCategory(id);
            if (res.status === 'success') {
                toast.success("Đã xóa danh mục!");
                setTimeout(() => window.location.reload(), 1000); // Tải lại trang để đồng bộ
            } else {
                toast.error(res.message || "Xóa thất bại!");
            }
        } catch (error) {
            // Spring Boot sẽ văng lỗi nếu danh mục này đang chứa Món ăn
            toast.error("Lỗi! Không thể xóa vì danh mục này đang chứa món ăn.");
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-fit flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh Mục</h2>
                <button onClick={handleAddNew} className="bg-emerald-600 text-white px-3 py-1.5 rounded font-bold text-xs hover:bg-emerald-700 shadow-sm transition-colors">
                    + Thêm
                </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
                {loading ? (
                    <p className="text-center text-xs font-bold text-slate-400 py-6">Đang tải...</p>
                ) : (
                    <ul className="space-y-1">
                        {categories.length === 0 && <li className="text-center text-xs font-bold text-slate-400 py-4">Chưa có danh mục</li>}
                        {categories.map(c => (
                            <li key={c.id} className="p-3 hover:bg-slate-50 flex justify-between items-center rounded-lg border border-transparent hover:border-slate-100 transition-colors group">
                                <span className="font-bold text-sm text-slate-700 truncate pr-2">{c.name}</span>
                                
                                {/* Ẩn hiện nút Sửa/Xóa khi di chuột vào (Rất chuyên nghiệp) */}
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(c)} className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">Sửa</button>
                                    <button onClick={() => handleDelete(c.id, c.name)} className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-colors">Xóa</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* MODAL THÊM / SỬA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-black text-slate-800 mb-4">
                            {editingCategory ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="Nhập tên (VD: Trà Sữa, Cà Phê...)"
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-5"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Hủy</button>
                                <button type="submit" className="px-4 py-2 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">Lưu lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}