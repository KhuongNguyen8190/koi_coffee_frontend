import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../apiService'; // Nhớ trỏ đúng đường dẫn

export const useLogin = (onLoginSuccess) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!username || !password) {
            return toast.error('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
        }

        setIsLoading(true);
        try {
            // Gọi API thực tế
            const response = await apiService.login({ username, password });
            
            // Lưu session vào localStorage
            localStorage.setItem('user_session', JSON.stringify(response.data));
            
            // Gọi callback để truyền dữ liệu user về cho App.jsx
            if (onLoginSuccess) {
                onLoginSuccess(response.data);
            }
            
        } catch (error) {
            // 🚀 ĐÂY LÀ CHỖ CẦN SỬA:
            // error.message chính là dòng "Sai tên đăng nhập..." mà apiService ném ra
            toast.error(error.message || 'Lỗi kết nối đến máy chủ!');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        username,
        setUsername,
        password,
        setPassword,
        isLoading,
        handleLogin
    };
};