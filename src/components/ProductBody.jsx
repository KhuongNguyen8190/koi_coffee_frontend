import React, { useState, useMemo } from 'react';

const CATEGORY_ICONS = {
    'cà phê': '☕',
    'coffee': '☕',
    'trà': '🍵',
    'tea': '🍵',
    'trà sữa': '🧋',
    'bánh': '🍰',
    'cake': '🍰',
    'nước ép': '🧃',
    'sinh tố': '🥤',
    'smoothie': '🥤',
    'đá xay': '🍧'
};

const getCategoryIcon = (name) => {
    if (!name) return '☕';
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return '🍽️';
};

export default function ProductBody({ products = [], categories = [], onAddToCart }) {
    const [activeCat, setActiveCat] = useState('ALL');
    const [search, setSearch] = useState('');

    const categoryCounts = useMemo(() => {
        const counts = { ALL: products.length };
        products.forEach(p => {
            const catId = p.category ? p.category.id : 'NONE';
            counts[catId] = (counts[catId] || 0) + 1;
        });
        return counts;
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const catId = p.category ? p.category.id : null;
            const matchCat = activeCat === 'ALL' || catId === activeCat;
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
            return matchCat && matchSearch;
        });
    }, [products, activeCat, search]);

    return (
        <div className="flex-1 flex flex-col bg-slate-100 p-3 md:p-6 overflow-hidden">
            {/* Vùng điều khiển: Thanh tìm kiếm & Tabs danh mục */}
            <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center text-slate-400 text-base md:text-lg">🔍</span>
                    <input
                        type="text"
                        placeholder="Tìm theo tên món hoặc mã SKU..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 md:pl-12 pr-10 py-2.5 md:py-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm md:text-base font-bold text-slate-700 outline-none transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-bold"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-2 scrollbar-hide">
                    <button
                        onClick={() => setActiveCat('ALL')}
                        className={`px-4 md:px-5 py-2 whitespace-nowrap rounded-xl font-black text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                            activeCat === 'ALL'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70 shadow-xs'
                        }`}
                    >
                        <span>✨ Tất cả</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeCat === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {categoryCounts.ALL || 0}
                        </span>
                    </button>
                    {categories.map(c => {
                        const count = categoryCounts[c.id] || 0;
                        const icon = getCategoryIcon(c.name);
                        const isActive = activeCat === c.id;
                        return (
                            <button
                                key={c.id}
                                onClick={() => setActiveCat(c.id)}
                                className={`px-4 md:px-5 py-2 whitespace-nowrap rounded-xl font-black text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]'
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70 shadow-xs'
                                }`}
                            >
                                <span>{icon} {c.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Vùng hiển thị Lưới sản phẩm */}
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 pb-24">
                {filteredProducts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-16">
                        <span className="text-6xl animate-bounce">☕</span>
                        <p className="font-black text-slate-600 text-base md:text-lg">Không tìm thấy món nào!</p>
                        <p className="text-xs text-slate-400">Hãy thử tìm với từ khóa hoặc chọn danh mục khác.</p>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors"
                            >
                                Xóa tìm kiếm
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 md:gap-4">
                        {filteredProducts.map(p => {
                            const isSoldOut = p.status?.toUpperCase() !== 'ACTIVE';
                            const icon = getCategoryIcon(p.category?.name);

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        if (!isSoldOut) onAddToCart(p);
                                    }}
                                    className={`bg-white p-3 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full select-none relative transition-all duration-200
                                        ${isSoldOut 
                                            ? 'opacity-60 grayscale cursor-not-allowed bg-slate-50' 
                                            : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 group' 
                                        }
                                    `}
                                >
                                    {/* BADGE BÁO HẾT MÓN */}
                                    {isSoldOut && (
                                        <div className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs z-10">
                                            HẾT HÀNG
                                        </div>
                                    )}

                                    {/* HÌNH ẢNH */}
                                    <div className="aspect-[4/3] md:aspect-square w-full bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl mb-2 md:mb-3 flex items-center justify-center text-3xl md:text-5xl transition-transform duration-300 group-hover:scale-105 border border-amber-100/50">
                                        {icon}
                                    </div>
                                    
                                    {/* TÊN MÓN */}
                                    <h3 className={`font-black text-xs md:text-sm leading-tight mb-1 line-clamp-2 ${isSoldOut ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-emerald-700 transition-colors'}`}>
                                        {p.name}
                                    </h3>
                                    
                                    {/* DANH MỤC & SKU */}
                                    <div className="flex items-center gap-1.5 mb-2 md:mb-3">
                                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                                            {p.category?.name || 'Khác'}
                                        </p>
                                        {p.sku && (
                                            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                                {p.sku}
                                            </span>
                                        )}
                                    </div>

                                    {/* GIÁ TIỀN & NÚT CỘNG NẰM Ở ĐÁY */}
                                    <div className="mt-auto flex justify-between items-end pt-1 border-t border-slate-100">
                                        <span className={`font-black text-sm md:text-base ${isSoldOut ? 'text-slate-400' : 'text-emerald-600'}`}>
                                            {p.price.toLocaleString('vi-VN')} <span className="text-[10px] md:text-xs font-bold">đ</span>
                                        </span>
                                        
                                        {!isSoldOut && (
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-emerald-50 text-emerald-600 font-black group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 flex items-center justify-center shadow-xs text-base">
                                                +
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
