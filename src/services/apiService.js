import axios from 'axios';

// 🚀 Tự động nhận diện môi trường: Nếu chạy trên localhost thì trỏ về backend local, ngược lại dùng Cloud
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8080'
        : 'https://koi-coffee-backend-x56d.onrender.com');

const API_URL = `${API_BASE_URL}/api`;

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 25000,
    headers: {
        'Content-Type': 'application/json'
    }
});

const handleResponse = (response) => response.data;

const buildQueryString = (params) => {
    if (!params) return '';
    if (typeof params === 'string') return params.startsWith('?') ? params : `?${params}`;
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.append(key, value);
        }
    });
    const qs = query.toString();
    return qs ? `?${qs}` : '';
};

export const apiService = {
    login: async (credentials) => {
        try {
            const response = await apiClient.post('/auth/login', credentials);
            return response.data;
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                throw new Error(error.response.data.message);
            }
            throw new Error("Lỗi kết nối server!");
        }
    },

    // 🚀 API Kiểm tra Session
    verifySession: (payload) => apiClient.post('/auth/verify-session', payload).then(handleResponse),

    // API HỆ THỐNG: Giữ backend thức
    ping: () => apiClient.get('/system/ping', { timeout: 15000 }).then(handleResponse),

    // Menu từ Cache (Chỉ query DB khi có cập nhật - 1 request lấy cả Categories + Products)
    getMenu: () => apiClient.get('/menu').then(handleResponse),

    // Sản phẩm: Hỗ trợ phân trang & lọc DB
    getProducts: (params) => apiClient.get(`/products${buildQueryString(params)}`).then(handleResponse),

    // Đơn hàng: Phân trang & Giới hạn từ SQL chống Slow Query
    getOrders: (params) => apiClient.get(`/orders${buildQueryString(params)}`).then(handleResponse),
    createOrder: (payload) => apiClient.post('/orders', payload).then(handleResponse),
    updateOrder: (id, payload) => apiClient.put(`/orders/${id}`, payload).then(handleResponse),
    payOrder: (id, method) => apiClient.put(`/orders/${id}/pay?method=${method}`).then(handleResponse),
    splitOrder: (id, payload) => apiClient.post(`/orders/${id}/split`, payload).then(handleResponse),

    // Thao tác nhanh đơn hàng
    changeOrderStatus: (id, status) => apiClient.put(`/orders/${id}/status?status=${status}`, {}).then(handleResponse),
    changePaymentMethod: (id, method) => apiClient.put(`/orders/${id}/payment-method?method=${method}`, {}).then(handleResponse),
    cancelOrder: (id) => apiClient.put(`/orders/${id}/cancel`, {}).then(handleResponse),
    restoreOrder: (id) => apiClient.put(`/orders/${id}/restore`, {}).then(handleResponse),

    // Ca làm việc
    getCurrentShift: () => apiClient.get('/shifts/current').then(handleResponse),
    openShift: (payload) => apiClient.post('/shifts/open', payload).then(handleResponse),
    closeShift: (payload) => apiClient.post('/shifts/close', payload).then(handleResponse),
    getLatestShiftCash: () => apiClient.get('/shifts/latest-cash').then(handleResponse),
    getShifts: (params) => apiClient.get(`/shifts${buildQueryString(params)}`).then(handleResponse),

    // Quản lý Ca (Admin)
    createAdminShift: (payload) => apiClient.post('/admin/shifts', payload).then(handleResponse),
    updateAdminShift: (id, payload) => apiClient.put(`/admin/shifts/${id}`, payload).then(handleResponse),
    deleteShift: (id) => apiClient.delete(`/admin/shifts/${id}`).then(handleResponse),

    // Quản lý Users (Cache + Phân trang)
    getUsers: (params) => apiClient.get(`/admin/users${buildQueryString(params)}`).then(handleResponse),
    createUser: (payload) => apiClient.post('/admin/users', payload).then(handleResponse),
    updateUser: (id, payload) => apiClient.put(`/admin/users/${id}`, payload).then(handleResponse),
    resetUserPassword: (id) => apiClient.put(`/admin/users/${id}/reset-password`).then(handleResponse),
    deleteUser: (id) => apiClient.delete(`/admin/users/${id}`).then(handleResponse),

    // Quản lý Danh mục (Cache)
    getCategories: (params) => apiClient.get(`/categories${buildQueryString(params)}`).then(handleResponse),
    createCategory: (payload) => apiClient.post('/admin/categories', payload).then(handleResponse),
    updateCategory: (id, payload) => apiClient.put(`/admin/categories/${id}`, payload).then(handleResponse),
    deleteCategory: (id) => apiClient.delete(`/admin/categories/${id}`).then(handleResponse),

    // Quản lý Sản phẩm Admin (Phân trang DB)
    getAdminProducts: (params) => apiClient.get(`/admin/products${buildQueryString(params)}`).then(handleResponse),
    createAdminProduct: (payload) => apiClient.post('/admin/products', payload).then(handleResponse),
    updateAdminProduct: (id, payload) => apiClient.put(`/admin/products/${id}`, payload).then(handleResponse),
    deleteAdminProduct: (id) => apiClient.delete(`/admin/products/${id}`).then(handleResponse),

    // Profile & Đơn hàng Admin (Phân trang DB)
    updateProfile: (id, payload) => apiClient.put(`/users/profile/${id}`, payload).then(handleResponse),
    getAdminOrders: (params) => apiClient.get(`/admin/orders${buildQueryString(params)}`).then(handleResponse),
    deleteOrder: (id) => apiClient.delete(`/admin/orders/${id}`).then(handleResponse),
    updateAdminOrder: (id, payload) => apiClient.put(`/admin/orders/${id}`, payload).then(handleResponse),

    // Thông báo
    getNotifications: (userId) => apiClient.get(`/notifications?userId=${userId}`).then(handleResponse),
    readNotification: (id) => apiClient.put(`/notifications/${id}/read`).then(handleResponse),
    sendAdminNotification: (payload) => apiClient.post('/admin/notifications/send', payload).then(handleResponse),
    getAdminNotifications: () => apiClient.get('/admin/notifications').then(handleResponse),
    editAdminNotification: (id, payload) => apiClient.put(`/admin/notifications/${id}`, payload).then(handleResponse),
    deleteAdminNotification: (id) => apiClient.delete(`/admin/notifications/${id}`).then(handleResponse)
};
