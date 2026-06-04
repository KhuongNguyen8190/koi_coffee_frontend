import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/apiService';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Header({ currentUser, onLogout, setCurrentUser }) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const [fullName, setFullName] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // 🚀 STATE MỚI: Quản lý ẩn/hiện chấm đỏ trên chuông và hẹn giờ 10 phút
    const [hideBellDot, setHideBellDot] = useState(false);
    const [bellOpenedAt, setBellOpenedAt] = useState(null);

    useEffect(() => {
        if (currentUser) {
            setFullName(currentUser.fullName || '');
        }
    }, [currentUser, isProfileOpen]);

    const fetchNotifications = async () => {
        try {
            if (!currentUser?.id) return;
            const res = await apiService.getNotifications(currentUser.id);

            const rawData = res.data ? res.data : res;

            if (Array.isArray(rawData)) {
                // 🚀 YÊU CẦU 1: Chỉ lấy 20 thông báo gần nhất bằng .slice(0, 20)
                const normalizedData = rawData.map(n => ({
                    ...n,
                    isRead: n.isRead === true || n.read === true
                })).slice(0, 20);

                setNotifications(normalizedData);
            }
        } catch (error) {
            console.error("Lỗi tải thông báo", error);
        }
    };

    useEffect(() => {
        if (currentUser?.id) {
            fetchNotifications();
        }
    }, [currentUser]);

    useWebSocket('/topic/public', (message) => {
        if (message === 'DATA_CHANGED') {
            console.log('🔔 Có dữ liệu mới! Đang tải lại thông báo...');
            setHideBellDot(false); // Hiện lại chấm đỏ trên chuông khi có tin mới
            fetchNotifications();
        }
    });

    // 🚀 YÊU CẦU 3 (Phần 1): Tự động xóa chấm đỏ bên trong sau 10 phút
    useEffect(() => {
        if (bellOpenedAt) {
            const timer = setTimeout(() => {
                setNotifications(prev => {
                    const unread = prev.filter(n => !n.isRead);

                    // Gọi API ngầm để đánh dấu đã đọc trên Database
                    unread.forEach(n => {
                        apiService.readNotification(n.id).catch(() => { });
                    });

                    // Xóa chấm đỏ (isRead = true) trên giao diện
                    return prev.map(n => ({ ...n, isRead: true }));
                });
            }, 10 * 60 * 1000); // 10 phút = 600.000 ms

            return () => clearTimeout(timer); // Xóa timer nếu component unmount hoặc thay đổi
        }
    }, [bellOpenedAt]);

    const handleToggleBell = () => {
        if (!isNotifOpen) {
            setIsNotifOpen(true);
            // 🚀 YÊU CẦU 2: Mất chấm đỏ trên chuông khi bấm vào
            setHideBellDot(true);
            // Bắt đầu tính giờ 10 phút
            setBellOpenedAt(Date.now());
        } else {
            setIsNotifOpen(false);
        }
    };

    const handleReadNotification = async (id) => {
        try {
            await apiService.readNotification(id);
            // 🚀 YÊU CẦU 3 (Phần 2): Click vào là mất chấm đỏ của chính nó ngay lập tức
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            console.error("Lỗi cập nhật thông báo", error);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Logic: Chỉ hiện chấm trên chuông nếu có tin chưa đọc VÀ chưa bị người dùng bấm vào xem
    const showBellDot = unreadCount > 0 && !hideBellDot;

    const handleLogoutClick = () => {
        toast.dismiss();

        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl">👋</span>
                    <p className="font-black text-slate-800 text-lg">Xác nhận đăng xuất?</p>
                </div>
                <p className="text-sm text-slate-500 font-medium mb-3">Bạn sẽ cần đăng nhập lại để sử dụng hệ thống.</p>
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                        Trở lại
                    </button>
                    <button
                        onClick={() => {
                            toast.dismiss();
                            onLogout();
                        }}
                        className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 shadow-md transition-all"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        ), {
            duration: 5000,
            id: 'logout-confirm',
            position: 'top-center',
            style: { padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }
        });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        if (!fullName.trim()) return toast.error("Họ và tên không được để trống!");

        if (newPassword || confirmPassword || oldPassword) {
            if (!oldPassword) return toast.error("Vui lòng nhập mật khẩu hiện tại!");
            if (!newPassword) return toast.error("Vui lòng nhập mật khẩu mới!");
            if (newPassword.length < 5) return toast.error("Mật khẩu mới phải từ 5 ký tự trở lên!");
            if (newPassword !== confirmPassword) return toast.error("Mật khẩu xác nhận không khớp!");
        }

        setIsSubmitting(true);
        try {
            const payload = {
                fullName: fullName.trim(),
                oldPassword: oldPassword ? oldPassword : null,
                newPassword: newPassword ? newPassword : null
            };

            const res = await apiService.updateProfile(currentUser.id, payload);

            if (res.status === 'success') {
                toast.success("Cập nhật thông tin cá nhân thành công!");

                const updatedUser = { ...currentUser, fullName: fullName.trim() };
                localStorage.setItem('user_session', JSON.stringify(updatedUser));

                if (setCurrentUser) {
                    setCurrentUser(updatedUser);
                } else {
                    window.location.reload();
                }

                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setIsProfileOpen(false);
            } else {
                toast.error(res.message || "Cập nhật thất bại!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Mật khẩu hiện tại không đúng!");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <header className="bg-white border-b border-slate-200 px-3 md:px-6 py-2.5 md:py-4 flex justify-between items-center shadow-sm shrink-0 relative z-[60] w-full">

                {/* Logo & Tiêu đề */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-base md:text-xl shadow-md shrink-0">
                        ☕
                    </div>
                    <div className="shrink-0">
                        <h1 className="text-[15px] md:text-xl font-black text-slate-800 tracking-tight leading-none">KOI COFFEE</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 hidden sm:block">Hệ thống POS</p>
                    </div>
                </div>

                {/* Khu vực Nút chức năng */}
                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    <div className="relative flex items-center shrink-0">
                        <button
                            onClick={handleToggleBell}
                            className="relative p-1.5 md:p-2 text-lg md:text-xl text-slate-600 hover:bg-slate-100 rounded-full transition-colors outline-none shrink-0"
                        >
                            🔔
                            {showBellDot && (
                                <span className="absolute top-0 right-0 md:top-1 md:right-1 bg-rose-500 text-white text-[8px] md:text-[9px] font-black w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center border md:border-[1.5px] border-white shadow-sm animate-pulse">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {isNotifOpen && (
                            <>
                                {/* Overlay bấm ra ngoài để đóng */}
                                <div className="fixed inset-0 z-[90]" onClick={() => setIsNotifOpen(false)}></div>

                                <div className="fixed sm:absolute top-[70px] sm:top-12 left-4 right-4 sm:left-auto sm:right-0 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h4 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-wider">Thông báo</h4>
                                        {unreadCount > 0 && <span className="text-[9px] md:text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">{unreadCount} tin mới</span>}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                                        {notifications.length === 0 ? (
                                            <div className="py-6 text-center">
                                                <p className="text-3xl mb-2 opacity-50">📭</p>
                                                <p className="text-slate-400 text-xs font-bold">Bạn không có thông báo nào!</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => !n.isRead && handleReadNotification(n.id)}
                                                    className={`p-3 rounded-xl transition-all border ${n.isRead ? 'bg-white border-slate-100' : 'bg-emerald-50/70 border-emerald-100 cursor-pointer hover:bg-emerald-100 hover:shadow-sm'}`}
                                                >
                                                    <p className={`text-xs md:text-sm leading-relaxed ${n.isRead ? 'text-slate-500' : 'text-emerald-900 font-bold'}`}>
                                                        {n.content}
                                                    </p>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-[9px] md:text-[10px] text-slate-400 font-medium">
                                                            {new Date(n.createdAt).toLocaleString('vi-VN')}
                                                        </span>
                                                        {!n.isRead && <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500"></span>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="w-px h-5 md:h-6 bg-slate-200 mx-0.5 md:mx-1 shrink-0"></div>

                    <div
                        onClick={() => setIsProfileOpen(true)}
                        className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-slate-50 p-1 md:p-1.5 pr-1 md:pr-3 rounded-2xl transition-colors border border-transparent hover:border-slate-100 shrink-0"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-700">{currentUser?.fullName || 'Nhân viên'}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 inline-block px-2 py-0.5 rounded mt-0.5">
                                {currentUser?.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-sm md:text-lg shadow-inner shrink-0">
                            👤
                        </div>
                    </div>

                    <div className="w-px h-5 md:h-6 bg-slate-200 mx-0.5 md:mx-1 shrink-0 hidden sm:block"></div>

                    <button
                        onClick={handleLogoutClick}
                        className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 text-xs font-bold p-1.5 md:py-2.5 md:px-4 rounded-lg md:rounded-xl transition-colors flex items-center gap-2 shadow-sm shrink-0"
                    >
                        <span className="text-base">🚪</span> <span className="hidden sm:inline">Đăng xuất</span>
                    </button>
                </div>
            </header>

            {isProfileOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg md:text-xl font-black text-slate-800">Thông tin cá nhân</h3>
                            <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center bg-slate-200 rounded-full">
                                ✖
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="p-5 md:p-6 space-y-5 md:space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider">Hồ sơ cơ bản</h4>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Tài khoản đăng nhập</label>
                                    <input
                                        type="text"
                                        value={currentUser?.username || ''}
                                        disabled
                                        className="w-full border border-slate-200 bg-slate-100 text-slate-500 p-3 rounded-xl font-medium cursor-not-allowed text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Họ và tên hiển thị *</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full border border-slate-200 bg-white p-3 rounded-xl focus:border-emerald-500 outline-none font-bold text-slate-700 transition-colors text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100"></div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider">Đổi mật khẩu (Bỏ trống nếu không đổi)</h4>
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Mật khẩu hiện tại"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl focus:border-amber-500 focus:bg-white outline-none font-medium text-sm transition-colors mb-2 md:mb-3"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Mật khẩu MỚI"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl focus:border-amber-500 focus:bg-white outline-none font-medium text-sm transition-colors mb-2 md:mb-3"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Nhập lại mật khẩu MỚI"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl focus:border-amber-500 focus:bg-white outline-none font-medium text-sm transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition-colors disabled:opacity-50 text-sm"
                                >
                                    {isSubmitting ? 'Đang lưu...' : 'Lưu cập nhật'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}