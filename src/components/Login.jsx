import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/apiService';

export default function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 🚀 SỬA LỖI F5: Lấy thời gian đếm ngược ngay khi vừa load web để không bị chớp màn hình/mất số giây
    const [cooldown, setCooldown] = useState(() => {
        const penaltyUntil = localStorage.getItem('kickout_penalty_until');
        if (penaltyUntil) {
            const timeLeft = Math.ceil((parseInt(penaltyUntil) - Date.now()) / 1000);
            return timeLeft > 0 ? timeLeft : 0;
        }
        return 0;
    });

    // Effect đếm ngược liên tục mỗi giây
    useEffect(() => {
        const interval = setInterval(() => {
            const penaltyUntil = localStorage.getItem('kickout_penalty_until');
            if (penaltyUntil) {
                const timeLeft = Math.ceil((parseInt(penaltyUntil) - Date.now()) / 1000);
                if (timeLeft > 0) {
                    setCooldown(timeLeft);
                } else {
                    setCooldown(0);
                    localStorage.removeItem('kickout_penalty_until');
                }
            } else {
                setCooldown(0);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        toast.dismiss();
        // 1. KIỂM TRA PHẠT 10S NGAY KHI BẤM NÚT (Dù cho phép bấm nút, hàm này vẫn chặn API lại)
        const penaltyUntil = localStorage.getItem('kickout_penalty_until');
        if (penaltyUntil) {
            const timeLeft = Math.ceil((parseInt(penaltyUntil) - Date.now()) / 1000);
            if (timeLeft > 0) {
                return toast.error(`Tài khoản vừa bị đăng nhập ở nơi khác. Vui lòng đợi ${timeLeft}s để thử lại!`, { id: 'cooldown' });
            } else {
                localStorage.removeItem('kickout_penalty_until');
            }
        }

        if (!username || !password) {
            return toast.error("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
        }

        setIsLoading(true);
        try {
            const res = await apiService.login({ username, password });

            if (res && res.data) {
                toast.success("Đăng nhập thành công!");
                localStorage.setItem('user_session', JSON.stringify(res.data));

                // Đảm bảo xóa sạch án phạt sau khi đăng nhập thành công
                localStorage.removeItem('kickout_penalty_until');
                setTimeout(() => {
                    onLoginSuccess(res.data);
                }, 2000);
                onLoginSuccess(res.data);
            } else {
                toast.error("Sai tài khoản hoặc mật khẩu!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg mb-4">
                        ☕
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">KOI COFFEE POS</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Đăng nhập hệ thống</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tài khoản</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nhập tên đăng nhập..."
                            className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-slate-700"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu..."
                            className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-slate-700"
                        />
                    </div>

                    {/* 🚀 CHỈNH SỬA Ở ĐÂY: Cho phép bấm vào khi đang cooldown, chuyển nút sang màu cam để cảnh báo */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md flex justify-center items-center gap-2
                            ${isLoading
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                : cooldown > 0
                                    ? 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-amber-500/30'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-600/30'
                            }`}
                    >
                        {isLoading ? (
                            'ĐANG XỬ LÝ...'
                        ) : cooldown > 0 ? (
                            `⏳ ĐỢI ${cooldown}S ĐỂ ĐĂNG NHẬP`
                        ) : (
                            'ĐĂNG NHẬP'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}