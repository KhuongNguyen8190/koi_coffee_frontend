import axios from 'axios';

// 🚀 Tự động nhận diện môi trường: Nếu chạy trên localhost thì trỏ về backend local, ngược lại dùng Cloud
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8080'
        : 'https://koi-coffee-backend-cbvi.onrender.com');

const API_URL = `${API_BASE_URL}/api`;

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
            const response = await axios.post(`${API_URL}/auth/login`, credentials);
            return response.data;
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                throw new Error(error.response.data.message);
            }
            throw new Error("Lỗi kết nối server!");
        }
    },

    // 🚀 API Kiểm tra Session
    verifySession: (payload) => axios.post(`${API_URL}/auth/verify-session`, payload).then(handleResponse),

    // API HỆ THỐNG: Giữ backend thức
    ping: () => axios.get(`${API_URL}/system/ping`).then(handleResponse),

    // Menu từ Cache (Chỉ query DB khi có cập nhật)
    getMenu: () => axios.get(`${API_URL}/menu`).then(handleResponse),

    // Sản phẩm: Hỗ trợ phân trang & lọc DB
    getProducts: (params) => axios.get(`${API_URL}/products${buildQueryString(params)}`).then(handleResponse),

    // Đơn hàng: Phân trang & Giới hạn từ SQL chống Slow Query
    getOrders: (params) => axios.get(`${API_URL}/orders${buildQueryString(params)}`).then(handleResponse),
    createOrder: (payload) => axios.post(`${API_URL}/orders`, payload).then(handleResponse),
    updateOrder: (id, payload) => axios.put(`${API_URL}/orders/${id}`, payload).then(handleResponse),
    payOrder: (id, method) => axios.put(`${API_URL}/orders/${id}/pay?method=${method}`).then(handleResponse),
    splitOrder: (id, payload) => axios.post(`${API_URL}/orders/${id}/split`, payload).then(handleResponse),

    // Thao tác nhanh đơn hàng
    changeOrderStatus: (id, status) => axios.put(`${API_URL}/orders/${id}/status?status=${status}`, {}).then(handleResponse),
    changePaymentMethod: (id, method) => axios.put(`${API_URL}/orders/${id}/payment-method?method=${method}`, {}).then(handleResponse),
    cancelOrder: (id) => axios.put(`${API_URL}/orders/${id}/cancel`, {}).then(handleResponse),
    restoreOrder: (id) => axios.put(`${API_URL}/orders/${id}/restore`, {}).then(handleResponse),

    // Ca làm việc
    getCurrentShift: () => axios.get(`${API_URL}/shifts/current`).then(handleResponse),
    openShift: (payload) => axios.post(`${API_URL}/shifts/open`, payload).then(handleResponse),
    closeShift: (payload) => axios.post(`${API_URL}/shifts/close`, payload).then(handleResponse),
    getLatestShiftCash: () => axios.get(`${API_URL}/shifts/latest-cash`).then(handleResponse),
    getShifts: (params) => axios.get(`${API_URL}/shifts${buildQueryString(params)}`).then(handleResponse),

    // Quản lý Ca (Admin)
    createAdminShift: (payload) => axios.post(`${API_URL}/admin/shifts`, payload).then(handleResponse),
    updateAdminShift: (id, payload) => axios.put(`${API_URL}/admin/shifts/${id}`, payload).then(handleResponse),
    deleteShift: (id) => axios.delete(`${API_URL}/admin/shifts/${id}`).then(handleResponse),

    // Quản lý Users (Cache + Phân trang)
    getUsers: (params) => axios.get(`${API_URL}/admin/users${buildQueryString(params)}`).then(handleResponse),
    createUser: (payload) => axios.post(`${API_URL}/admin/users`, payload).then(handleResponse),
    updateUser: (id, payload) => axios.put(`${API_URL}/admin/users/${id}`, payload).then(handleResponse),
    resetUserPassword: (id) => axios.put(`${API_URL}/admin/users/${id}/reset-password`).then(handleResponse),
    deleteUser: (id) => axios.delete(`${API_URL}/admin/users/${id}`).then(handleResponse),

    // Quản lý Danh mục (Cache)
    getCategories: (params) => axios.get(`${API_URL}/categories${buildQueryString(params)}`).then(handleResponse),
    createCategory: (payload) => axios.post(`${API_URL}/admin/categories`, payload).then(handleResponse),
    updateCategory: (id, payload) => axios.put(`${API_URL}/admin/categories/${id}`, payload).then(handleResponse),
    deleteCategory: (id) => axios.delete(`${API_URL}/admin/categories/${id}`).then(handleResponse),

    // Quản lý Sản phẩm Admin (Phân trang DB)
    getAdminProducts: (params) => axios.get(`${API_URL}/admin/products${buildQueryString(params)}`).then(handleResponse),
    createAdminProduct: (payload) => axios.post(`${API_URL}/admin/products`, payload).then(handleResponse),
    updateAdminProduct: (id, payload) => axios.put(`${API_URL}/admin/products/${id}`, payload).then(handleResponse),
    deleteAdminProduct: (id) => axios.delete(`${API_URL}/admin/products/${id}`).then(handleResponse),

    // Profile & Đơn hàng Admin (Phân trang DB)
    updateProfile: (id, payload) => axios.put(`${API_URL}/users/profile/${id}`, payload).then(handleResponse),
    getAdminOrders: (params) => axios.get(`${API_URL}/admin/orders${buildQueryString(params)}`).then(handleResponse),
    deleteOrder: (id) => axios.delete(`${API_URL}/admin/orders/${id}`).then(handleResponse),
    updateAdminOrder: (id, payload) => axios.put(`${API_URL}/admin/orders/${id}`, payload).then(handleResponse),

    // Thông báo
    getNotifications: (userId) => axios.get(`${API_URL}/notifications?userId=${userId}`).then(handleResponse),
    readNotification: (id) => axios.put(`${API_URL}/notifications/${id}/read`).then(handleResponse),
    sendAdminNotification: (payload) => axios.post(`${API_URL}/admin/notifications/send`, payload).then(handleResponse),
    getAdminNotifications: () => axios.get(`${API_URL}/admin/notifications`).then(handleResponse),
    editAdminNotification: (id, payload) => axios.put(`${API_URL}/admin/notifications/${id}`, payload).then(handleResponse),
    deleteAdminNotification: (id) => axios.delete(`${API_URL}/admin/notifications/${id}`).then(handleResponse)
};
