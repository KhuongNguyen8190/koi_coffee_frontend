import React from 'react';
export default function MenuManager({ categories, products }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(cat => (
                <div key={cat.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-emerald-600 uppercase text-xs mb-3">{cat.name}</h4>
                    {products.filter(p => p.categoryId === cat.id).map(p => (
                        <div key={p.id} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                            <span className="text-sm font-medium">{p.name}</span>
                            <span className="font-bold text-sm text-slate-700">{p.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}