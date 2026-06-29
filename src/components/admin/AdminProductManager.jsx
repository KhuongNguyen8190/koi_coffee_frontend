import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

export default function AdminProductManager({ categories = [] }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({ name: '', price: '', sku: '', categoryId: '', status: 'ACTIVE' });

    // =========================================================================
    // STATE PHÂN TRANG (PAGINATION)
    // =========================================================================
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Mặc định 10 món/trang

    useEffect(() => {
        fetchAdminProducts();
    }, []);

    // Tự động Reset về Trang 1 nếu thay đổi số lượng hiển thị
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const fetchAdminProducts = async () => {
        setLoading(true);
        try {
            const res = await apiService.getAdminProducts();
            // Tự động sắp xếp món mới (ID lớn) lên đầu
            const sortedProducts = (res.data || res || []).sort((a, b) => b.id - a.id);
            setProducts(sortedProducts);
        } catch (error) {
            toast.error("Lỗi khi tải danh sách món!");
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // XỬ LÝ DỮ LIỆU PHÂN TRANG
    // =========================================================================
    const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(products.length / itemsPerPage);
    
    const paginatedProducts = useMemo(() => {
        if (itemsPerPage === 'ALL') return products;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return products.slice(startIndex, startIndex + itemsPerPage);
    }, [products, currentPage, itemsPerPage]);

    const handleAddNew = () => {
        setEditingProduct(null);
        setFormData({ 
            name: '', price: '', sku: '', 
            categoryId: categories.length > 0 ? categories[0].id : '', 
            status: 'ACTIVE'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (prod) => {
        setEditingProduct(prod);
        setFormData({
            name: prod.name, price: prod.price, sku: prod.sku || '',
            categoryId: prod.category ? prod.category.id : '',
            status: prod.status ? prod.status.toUpperCase() : 'ACTIVE'
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price || !formData.categoryId) {
            return toast.error("Vui lòng điền đủ thông tin!");
        }

        try {
            if (editingProduct) {
                const res = await apiService.updateAdminProduct(editingProduct.id, formData);
                if (res.status === 'success') toast.success("Cập nhật thành công!");
            } else {
                const res = await apiService.createAdminProduct(formData);
                if (res.status === 'success') {
                    toast.success("Thêm món mới thành công!");
                    setCurrentPage(1); // Thêm mới thì nhảy về trang 1 để xem ngay
                }
            }
            setIsModalOpen(false);
            fetchAdminProducts(); // Dữ liệu tải lại ngầm, Toast vẫn hiện bình thường
        } catch (error) {
            toast.error("Thao tác thất bại!");
        }
    };

    const handleDeleteProduct = (id, name) => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl text-rose-500">🍔</span>
                    <p className="font-black text-slate-800 text-lg">Xóa món ăn?</p>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Bạn đang xóa món <strong className="text-rose-600">{name}</strong>. Hãy chắc chắn món này chưa từng nằm trong hóa đơn nào!
                </p>
                <div className="flex gap-2 mt-2">
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                        Hủy
                    </button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                const res = await apiService.deleteAdminProduct(id);
                                if (res.status === 'success') {
                                    toast.success("Đã xóa món ăn khỏi thực đơn!");
                                    fetchAdminProducts(); 
                                } else {
                                    toast.error(res.message || "Xóa thất bại!");
                                }
                            } catch (error) {
                                toast.error("Không thể xóa vì sản phẩm này đã nằm trong hóa đơn cũ!");
                            }
                        }} 
                        className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 shadow-md transition-all"
                    >
                        Xóa Món
                    </button>
                </div>
            </div>
        ), { duration: Infinity, id: `delete-product-${id}` });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg md:text-xl font-black text-slate-800">Quản Lý Thực Đơn</h2>
                <button onClick={handleAddNew} className="bg-emerald-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-emerald-700 transition-colors shadow-sm">
                    + Thêm Món
                </button>
            </div>

            {loading ? (
                <div className="text-center text-slate-400 py-10 font-bold">Đang tải dữ liệu...</div>
            ) : (
                <div className="w-full border border-slate-200 rounded-xl flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-left text-xs md:text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] md:text-xs border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Tên món</th>
                                    <th className="px-4 py-3 hidden md:table-cell">Danh mục</th>
                                    <th className="px-4 py-3">Giá</th>
                                    <th className="px-4 py-3 text-center">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedProducts.length === 0 && (
                                    <tr><td colSpan="6" className="text-center py-8 text-slate-400">Chưa có món ăn nào.</td></tr>
                                )}
                                {paginatedProducts.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-400">#{p.id}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{p.name}</td>
                                        <td className="px-4 py-3 hidden md:table-cell">{p.category?.name || '---'}</td>
                                        <td className="px-4 py-3 font-bold text-emerald-600 whitespace-nowrap">{p.price.toLocaleString()} đ</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-md text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap ${p.status?.toUpperCase() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {p.status?.toUpperCase() === 'ACTIVE' ? 'Đang bán' : 'Hết món'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                                            <button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-700 font-bold bg-blue-50 px-2 md:px-3 py-1 rounded-lg">Sửa</button>
                                            <button onClick={() => handleDeleteProduct(p.id, p.name)} className="text-rose-500 hover:text-rose-700 font-bold bg-rose-50 px-2 md:px-3 py-1 rounded-lg">Xóa</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* --- THANH ĐIỀU HƯỚNG PHÂN TRANG --- */}
                    {products.length > 0 && (
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-center justify-between rounded-b-xl">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                <span>Hiển thị:</span>
                                <select 
                                    value={itemsPerPage} 
                                    onChange={(e) => setItemsPerPage(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                    className="border border-slate-200 bg-white p-1.5 rounded-lg outline-none focus:border-emerald-500 text-slate-700 cursor-pointer"
                                >
                                    <option value={10}>10 món/trang</option>
                                    <option value={20}>20 món/trang</option>
                                    <option value={50}>50 món/trang</option>
                                    <option value="ALL">Tất cả</option>
                                </select>
                                <span className="hidden sm:inline">/ Tổng số {products.length} món</span>
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
                </div>
            )}

            {/* MODAL THÊM / SỬA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-slate-800 mb-4">
                            {editingProduct ? 'Chỉnh Sửa Món' : 'Thêm Món Mới'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tên món ăn <span className="text-red-500">*</span></label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Giá bán (VNĐ) <span className="text-red-500">*</span></label>
                                    <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Mã SKU</label>
                                    <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Danh mục <span className="text-red-500">*</span></label>
                                    <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                                        <option value="" disabled>-- Chọn --</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Trạng thái</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                                        <option value="ACTIVE">Đang bán (Active)</option>
                                        <option value="INACTIVE">Hết món (Inactive)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Hủy</button>
                                <button type="submit" className="px-4 py-2 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">Lưu Thay Đổi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}