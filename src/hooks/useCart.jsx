import { useState } from 'react';

export function useCart() {
    const [cart, setCart] = useState([]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1, note: '' }];
        });
    };

    const updateQuantity = (id, amount) => {
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item
        ).filter(item => item.quantity > 0));
    };

    const updateNote = (id, note) => {
        setCart(prev => prev.map(item => item.id === id ? { ...item, note } : item));
    };

    const clearCart = () => setCart([]);

    return { cart, addToCart, updateQuantity, updateNote, clearCart };
}