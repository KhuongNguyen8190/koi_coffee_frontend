import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

export function useAuth() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    useEffect(() => {
        const session = Cookies.get('user_session');
        if (session) {
            try {
                setCurrentUser(JSON.parse(session));
            } catch (e) {
                Cookies.remove('user_session');
            }
        }
        setIsAuthChecked(true);
    }, []);

    const logout = () => {
        Cookies.remove('user_session');
        setCurrentUser(null);
        toast.success('Đã đăng xuất!');
    };

    return { currentUser, setCurrentUser, isAuthChecked, logout };
}