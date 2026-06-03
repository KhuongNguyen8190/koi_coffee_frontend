import axios from 'axios';

export const API_BASE_URL = 'http://192.168.1.8:8080';
const API_URL = `${API_BASE_URL}/api`;

const handleResponse = (response) => response.data;

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

    getMenu: () => axios.get(`${API_URL}/menu`).then(handleResponse),
    getProducts: () => axios.get(`${API_URL}/products`).then(handleResponse),
    getOrders: () => axios.get(`${API_URL}/orders`).then(handleResponse),
    createOrder: (payload) => axios.post(`${API_URL}/orders`, payload).then(handleResponse),
    updateOrder: (id, payload) => axios.put(`${API_URL}/orders/${id}`, payload).then(handleResponse),
    payOrder: (id, method) => axios.put(`${API_URL}/orders/${id}/pay?method=${method}`).then(handleResponse),
    splitOrder: (id, payload) => axios.post(`${API_URL}/orders/${id}/split`, payload).then(handleResponse),
    
    // CÁC API THAO TÁC NHANH (SỬA TRẠNG THÁI / PHƯƠNG THỨC / HỦY / KHÔI PHỤC)
    changeOrderStatus: (id, status) => axios.put(`${API_URL}/orders/${id}/status?status=${status}`, {}).then(handleResponse),
    changePaymentMethod: (id, method) => axios.put(`${API_URL}/orders/${id}/payment-method?method=${method}`, {}).then(handleResponse),
    cancelOrder: (id) => axios.put(`${API_URL}/orders/${id}/cancel`, {}).then(handleResponse),
    restoreOrder: (id) => axios.put(`${API_URL}/orders/${id}/restore`, {}).then(handleResponse), // <-- Thêm hàm này

    getCurrentShift: () => axios.get(`${API_URL}/shifts/current`).then(handleResponse),
    openShift: (payload) => axios.post(`${API_URL}/shifts/open`, payload).then(handleResponse),
    closeShift: (payload) => axios.post(`${API_URL}/shifts/close`, payload).then(handleResponse),
    getLatestShiftCash: () => axios.get(`${API_URL}/shifts/latest-cash`).then(handleResponse),
    getShifts: () => axios.get(`${API_URL}/shifts`).then(handleResponse), 
    
    createAdminShift: (payload) => axios.post(`${API_URL}/admin/shifts`, payload).then(handleResponse),
    updateAdminShift: (id, payload) => axios.put(`${API_URL}/admin/shifts/${id}`, payload).then(handleResponse),
    deleteShift: (id) => axios.delete(`${API_URL}/admin/shifts/${id}`).then(handleResponse),    
    getUsers: (query = '') => axios.get(`${API_URL}/admin/users${query}`).then(handleResponse),
    createUser: (payload) => axios.post(`${API_URL}/admin/users`, payload).then(handleResponse),
    updateUser: (id, payload) => axios.put(`${API_URL}/admin/users/${id}`, payload).then(handleResponse),
    resetUserPassword: (id) => axios.put(`${API_URL}/admin/users/${id}/reset-password`).then(handleResponse),
    deleteUser: (id) => axios.delete(`${API_URL}/admin/users/${id}`).then(handleResponse),
    getCategories: () => axios.get(`${API_URL}/categories`).then(handleResponse),
    createCategory: (payload) => axios.post(`${API_URL}/admin/categories`, payload).then(handleResponse),
    updateCategory: (id, payload) => axios.put(`${API_URL}/admin/categories/${id}`, payload).then(handleResponse),
    deleteCategory: (id) => axios.delete(`${API_URL}/admin/categories/${id}`).then(handleResponse),
    getAdminProducts: () => axios.get(`${API_URL}/admin/products`).then(handleResponse),
    createAdminProduct: (payload) => axios.post(`${API_URL}/admin/products`, payload).then(handleResponse),
    updateAdminProduct: (id, payload) => axios.put(`${API_URL}/admin/products/${id}`, payload).then(handleResponse),
    deleteAdminProduct: (id) => axios.delete(`${API_URL}/admin/products/${id}`).then(handleResponse),
    updateProfile: (id, payload) => axios.put(`${API_URL}/users/profile/${id}`, payload).then(handleResponse),
    deleteOrder: (id) => axios.delete(`${API_URL}/admin/orders/${id}`).then(handleResponse),
    updateAdminOrder: (id, payload) => axios.put(`${API_URL}/admin/orders/${id}`, payload).then(handleResponse),
    getNotifications: (userId) => axios.get(`${API_URL}/notifications?userId=${userId}`).then(handleResponse),
    readNotification: (id) => axios.put(`${API_URL}/notifications/${id}/read`).then(handleResponse),
    sendAdminNotification: (payload) => axios.post(`${API_URL}/admin/notifications/send`, payload).then(handleResponse),
    getAdminNotifications: () => axios.get(`${API_URL}/admin/notifications`).then(handleResponse),
    editAdminNotification: (id, payload) => axios.put(`${API_URL}/admin/notifications/${id}`, payload).then(handleResponse),
    deleteAdminNotification: (id) => axios.delete(`${API_URL}/admin/notifications/${id}`).then(handleResponse)
};