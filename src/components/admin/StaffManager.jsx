import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';
import { useWebSocket } from '../../hooks/useWebSocket'; // 🚀 GỌI FILE SOCKET TẬP TRUNG

export default function StaffManager() {
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, username: '', fullName: '', role: 'STAFF', isActive: true });

    // Lấy thông tin tài khoản đang đăng nhập hiện tại
    const currentUser = JSON.parse(localStorage.getItem('user_session') || '{}');

    const fetchUsers = useCallback(async () => {
        try {
            const res = await apiService.getUsers(`?t=${new Date().getTime()}`);
            if (res && res.status === 'success') {
                setUsers([...res.data]);
            }
        } catch (error) { 
            console.error("Lỗi tải danh sách", error);
        }
    }, []);

    useEffect(() => { 
        fetchUsers(); 
    }, [fetchUsers]);

    // 🚀 CHỈ 1 ĐOẠN NGẮN GỌN ĐỂ NHẬN WEBSOCKET TỪ FILE CHUNG
    useWebSocket('/topic/public', (messageBody) => {
        if (messageBody === 'USER_LIST_CHANGED') {
            fetchUsers(); 
        } else if (messageBody.startsWith('USER_LOCKED:')) {
            const lockedUsername = messageBody.split(':')[1];
            const savedUserSession = localStorage.getItem('user_session');
            if (savedUserSession) {
                const sessionUser = JSON.parse(savedUserSession);
                // Nếu chính user đang đăng nhập bị Admin khóa -> Văng ra ngoài
                if (sessionUser.username === lockedUsername) {
                    toast.error("Tài khoản của bạn đã bị vô hiệu hóa!", { icon: '🚫', duration: 8000, style: { background: '#ef4444', color: '#fff' } });
                    localStorage.removeItem('user_session');
                    localStorage.removeItem('current_tab');
                    setTimeout(() => window.location.reload(), 1000); 
                }
            }
        }
    });

    // LƯU TÀI KHOẢN (THÊM/SỬA)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await apiService.updateUser(formData.id, formData);
                toast.success("Cập nhật thành công!");
            } else {
                await apiService.createUser(formData);
                toast.success("Tạo tài khoản thành công! Mật khẩu là 12345");
            }
            setIsModalOpen(false);
            await fetchUsers(); 
        } catch (error) { 
            toast.error(error.response?.data?.message || "Lỗi hệ thống!"); 
        }
    };

    // HÀM RESET MẬT KHẨU (GIAO DIỆN ĐẸP)
    const handleResetPassword = (id, fullName) => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl">🔑</span>
                    <p className="font-black text-slate-800 text-lg">Reset mật khẩu?</p>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Mật khẩu của <strong className="text-slate-700">{fullName}</strong> sẽ được đặt lại về mặc định là <strong className="text-rose-600 bg-rose-50 px-1 rounded">12345</strong>.
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
                                await apiService.resetUserPassword(id);
                                toast.success("Đã reset mật khẩu thành công!");
                                setIsModalOpen(false);
                            } catch (error) {
                                toast.error("Lỗi khi reset mật khẩu!");
                            }
                        }} 
                        className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 shadow-md transition-all"
                    >
                        Đồng ý Reset
                    </button>
                </div>
            </div>
        ), { duration: Infinity, id: 'reset-password-confirm', position: 'top-center', style: { padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } });
    };

    // HÀM XÓA TÀI KHOẢN (GIAO DIỆN ĐẸP)
    const handleDeleteUser = (id, username) => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl text-rose-500">🗑️</span>
                    <p className="font-black text-slate-800 text-lg">Xóa tài khoản?</p>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Bạn có chắc chắn muốn xóa tài khoản <strong className="text-rose-600">{username}</strong>? Hành động này không thể hoàn tác.
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
                                const res = await apiService.deleteUser(id); 
                                if (res.status === 'success') {
                                    toast.success("Đã xóa tài khoản!");
                                    fetchUsers(); 
                                } else {
                                    toast.error(res.message || "Xóa thất bại!");
                                }
                            } catch (error) {
                                toast.error("Không thể xóa tài khoản này!");
                            }
                        }} 
                        className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 shadow-md transition-all"
                    >
                        Tiếp tục Xóa
                    </button>
                </div>
            </div>
        ), { duration: Infinity, id: `delete-user-${id}`, position: 'top-center', style: { padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } });
    };

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-slate-800">Quản lý Tài Khoản</h2>
                <button 
                    onClick={() => { 
                        setFormData({ id: null, username: '', fullName: '', role: 'STAFF', isActive: true }); 
                        setIsModalOpen(true); 
                    }} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                    + Thêm mới
                </button>
            </div>

            <table className="w-full bg-white rounded-xl shadow-sm border border-slate-200 text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="p-4">Họ tên</th>
                        <th className="p-4">Tài khoản</th>
                        <th className="p-4">Quyền</th>
                        <th className="p-4">Trạng thái</th>
                        <th className="p-4 text-center">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(u => {
                        // Logic kiểm tra xem nút xóa có bị vô hiệu hóa không (Không cho xóa admin và không cho tự xóa mình)
                        const isDeleteDisabled = (u.username?.toLowerCase() === 'admin') || (u.username === currentUser.username);

                        return (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-sm text-slate-700">{u.fullName}</td>
                                <td className="p-4 text-slate-500 text-sm font-medium">{u.username}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1.5 rounded text-[10px] font-black tracking-wider ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1.5 rounded text-[10px] font-black tracking-wider ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {u.isActive ? 'HOẠT ĐỘNG' : 'ĐÃ KHÓA'}
                                    </span>
                                </td>
                                <td className="p-4 text-center space-x-3">
                                    <button 
                                        onClick={() => { 
                                            setFormData({ id: u.id, username: u.username, fullName: u.fullName, role: u.role, isActive: u.isActive }); 
                                            setIsModalOpen(true); 
                                        }} 
                                        className="text-blue-600 hover:text-blue-800 text-xs font-bold transition-colors"
                                    >
                                        Sửa
                                    </button>
                                    
                                    <button 
                                        onClick={() => !isDeleteDisabled && handleDeleteUser(u.id, u.username)} 
                                        disabled={isDeleteDisabled}
                                        title={isDeleteDisabled ? 'Không thể xóa tài khoản Admin hoặc tài khoản đang đăng nhập' : ''}
                                        className={`text-xs font-bold transition-colors ${
                                            isDeleteDisabled 
                                                ? 'text-slate-300 cursor-not-allowed' 
                                                : 'text-rose-600 hover:text-rose-800'
                                        }`}
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* MODAL FORM THÊM/SỬA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <form onSubmit={handleSubmit} className="bg-white p-7 rounded-3xl w-full max-w-md space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="font-black text-xl text-slate-800 border-b border-slate-100 pb-3">
                            {formData.id ? 'Sửa thông tin tài khoản' : 'Tạo tài khoản mới'}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Tài khoản đăng nhập *</label>
                                <input 
                                    disabled={!!formData.id} 
                                    className={`w-full border border-slate-200 p-3 rounded-xl font-medium transition-colors ${formData.id ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 focus:border-emerald-500 focus:bg-white outline-none'}`} 
                                    placeholder="Nhập tên đăng nhập..." 
                                    value={formData.username} 
                                    onChange={e => setFormData({...formData, username: e.target.value})} 
                                    required 
                                />
                            </div>
                            
                            {!formData.id ? (
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                                    <p className="text-xs text-amber-700 font-bold uppercase mb-1">Mật khẩu mặc định</p>
                                    <p className="text-sm text-amber-800 font-medium">Hệ thống sẽ cấp mật khẩu là <strong className="text-amber-600 text-base">12345</strong> (Được mã hóa an toàn).</p>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu</p>
                                        <p className="text-sm font-medium text-slate-600">Đã được mã hóa ẩn</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleResetPassword(formData.id, formData.fullName)}
                                        className="bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    >
                                        Reset về 12345
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Họ và tên nhân viên *</label>
                                <input className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-emerald-500 focus:bg-white font-medium transition-colors" placeholder="VD: Nguyễn Văn A" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Phân quyền</label>
                                    <select className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                        <option value="STAFF">STAFF</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Trạng thái</label>
                                    <select className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700" value={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.value === 'true' || e.target.value === true})}>
                                        <option value={true}>Hoạt động</option>
                                        <option value={false}>Khóa</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-5 border-t border-slate-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                            <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md">Lưu</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}