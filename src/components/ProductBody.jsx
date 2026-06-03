import React, { useState } from 'react';

export default function ProductBody({ products = [], categories = [], onAddToCart }) {
    const [activeCat, setActiveCat] = useState('ALL');
    const [search, setSearch] = useState('');

    const filteredProducts = products.filter(p => {
        const catId = p.category ? p.category.id : null;
        const matchCat = activeCat === 'ALL' || catId === activeCat;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <div className="flex-1 flex flex-col bg-slate-100 p-3 md:p-6 overflow-hidden">
            {/* Vùng điều khiển: Thanh tìm kiếm & Tabs danh mục */}
            <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center text-slate-400 text-base md:text-lg">🔍</span>
                    <input
                        type="text"
                        placeholder="Tìm tên món ăn, thức uống..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-emerald-500 text-sm md:text-base font-bold text-slate-700 outline-none transition-all"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-2 scrollbar-hide">
                    <button
                        onClick={() => setActiveCat('ALL')}
                        className={`px-4 md:px-5 py-1.5 md:py-2 whitespace-nowrap rounded-lg font-black text-xs md:text-sm transition-colors ${activeCat === 'ALL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white text-slate-500 hover:bg-slate-200 shadow-sm'}`}
                    >
                        Tất cả
                    </button>
                    {categories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveCat(c.id)}
                            className={`px-4 md:px-5 py-1.5 md:py-2 whitespace-nowrap rounded-lg font-black text-xs md:text-sm transition-colors ${activeCat === c.id ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white text-slate-500 hover:bg-slate-200 shadow-sm'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Vùng hiển thị Lưới sản phẩm - CÓ THÊM pb-24 ĐỂ KHÔNG BỊ NÚT GIỎ HÀNG CHE KHUẤT */}
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 pb-24">
                {filteredProducts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <span className="text-5xl md:text-6xl">🍔</span>
                        <p className="font-bold text-sm md:text-base">Không tìm thấy món ăn nào!</p>
                        <p className="text-[10px] md:text-xs">Hãy thử tìm với từ khóa khác.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-4">
                        {filteredProducts.map(p => {
                            const isSoldOut = p.status?.toUpperCase() !== 'ACTIVE';

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        if (!isSoldOut) onAddToCart(p);
                                    }}
                                    className={`bg-white p-2 md:p-4 rounded-xl md:rounded-2xl shadow-sm flex flex-col h-full select-none relative transition-all duration-200
                                        ${isSoldOut 
                                            ? 'opacity-60 grayscale cursor-not-allowed bg-slate-50' 
                                            : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:ring-1 md:hover:ring-2 hover:ring-emerald-500 group' 
                                        }
                                    `}
                                >
                                    {/* BADGE BÁO HẾT MÓN */}
                                    {isSoldOut && (
                                        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-red-500 text-white text-[9px] md:text-[10px] font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded shadow-sm z-10 animate-pulse">
                                            HẾT MÓN
                                        </div>
                                    )}

                                    {/* HÌNH ẢNH (Bóp dẹt aspect-[4/3] trên Mobile để tiết kiệm chiều dọc) */}
                                    <div className="aspect-[4/3] md:aspect-square w-full bg-slate-100 rounded-lg md:rounded-xl mb-1.5 md:mb-3 flex items-center justify-center text-3xl md:text-5xl transition-transform group-hover:scale-105">
                                        ☕
                                    </div>
                                    
                                    {/* TÊN MÓN - Giới hạn 2 dòng (line-clamp-2) */}
                                    <h3 className={`font-black text-[11px] md:text-sm leading-tight mb-0.5 md:mb-1 line-clamp-2 ${isSoldOut ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                        {p.name}
                                    </h3>
                                    
                                    {/* DANH MỤC */}
                                    <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 md:mb-3 truncate">
                                        {p.category?.name || 'Khác'}
                                    </p>

                                    {/* GIÁ TIỀN & NÚT CỘNG NẰM Ở ĐÁY */}
                                    <div className="mt-auto flex justify-between items-end">
                                        <span className={`font-black text-sm md:text-lg ${isSoldOut ? 'text-slate-400' : 'text-emerald-600'}`}>
                                            {p.price.toLocaleString('vi-VN')} <span className="text-[10px] md:text-xs underline">đ</span>
                                        </span>
                                        
                                        {!isSoldOut && (
                                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors text-base md:text-lg pb-0.5 md:pb-0">
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