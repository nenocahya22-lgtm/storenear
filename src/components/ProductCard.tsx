/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingCart, Star, Eye, Plus } from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { formatRupiah, PLACEHOLDER_IMAGE } from '../utils';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, setView, setSelectedProductId } = useStore();

  const handleCardClick = () => {
    setSelectedProductId(product.id);
    setView('product-detail');
  };

  const discountedPrice = product.discountPercent && product.discountPercent > 0
    ? product.price * (1 - product.discountPercent / 100)
    : null;

  return (
    <div 
      className="card overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer relative group bg-white"
      onClick={handleCardClick}
      style={{ borderRadius: 'var(--radius-card)' }}
    >
      {/* Category Tag — Starbucks green pill */}
      <span className="absolute top-3 left-3 z-10 bg-white/95 text-[var(--brand-green)] text-[0.9rem] tracking-[var(--tracking-looser)] font-bold uppercase px-2.5 py-1 rounded-[var(--button-radius)] shadow-xs border border-[var(--green-light)]">
        {product.category ? product.category.split(' ')[0] : 'Menu'}
      </span>

      {/* Discount Badge */}
      {product.discountPercent && product.discountPercent > 0 && (
        <span className="absolute top-3 right-3 z-10 bg-[var(--red)] text-white text-[0.9rem] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
          -{product.discountPercent}%
        </span>
      )}

      {/* Image Container with hover zoom */}
      <div className="w-full aspect-square overflow-hidden bg-[var(--canvas-warm)] relative">
        <img 
          src={product.imageUrl || PLACEHOLDER_IMAGE} 
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
        />
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-[var(--green-accent)] text-white px-3.5 py-2 rounded-[var(--button-radius)] text-[1.2rem] font-semibold flex items-center gap-1.5 shadow-md">
            <Eye size={13} />
            <span>Lihat</span>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col flex-1 bg-white">
        <h4 className="text-[1.3rem] md:text-[1.4rem] font-semibold text-[var(--text-black)] group-hover:text-[var(--brand-green)] transition-colors line-clamp-2 h-[3.6rem] mb-1.5 leading-snug tracking-[var(--tracking-tight)]">
          {product.name}
        </h4>
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <Star size={12} fill="#cba258" stroke="#cba258" />
          <span className="text-[1.2rem] font-bold text-[var(--text-black)]">
            {product.rating ? product.rating.toFixed(1) : '5.0'}
          </span>
          <span className="text-[1rem] text-[var(--text-black-soft)] border-l border-gray-200 pl-1.5 ml-1.5">
            {product.reviewCount || 0} ulasan
          </span>
        </div>

        {/* Price + Add to cart */}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100">
          <div className="text-left">
            {discountedPrice ? (
              <>
                <span className="text-[var(--text-black)] font-bold text-[1.6rem] md:text-[1.8rem] block tracking-[var(--tracking-tight)]">
                  {formatRupiah(discountedPrice)}
                </span>
                <span className="text-[1rem] text-gray-400 line-through block">
                  {formatRupiah(product.price)}
                </span>
              </>
            ) : (
              <span className="text-[var(--text-black)] font-bold text-[1.6rem] md:text-[1.8rem] block tracking-[var(--tracking-tight)]">
                {formatRupiah(product.price)}
              </span>
            )}
            <span className="text-[1rem] text-[var(--text-black-soft)]">
              Stok: <span className={product.stock > 0 ? 'text-[var(--green-accent)] font-semibold' : 'text-[var(--red)] font-semibold'}>{product.stock > 0 ? `${product.stock}` : 'Habis'}</span>
            </span>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (product.stock > 0) addToCart(product);
            }}
            disabled={product.stock <= 0}
            className="btn btn-primary !p-2.5 !rounded-full !w-9 !h-9 flex items-center justify-center shadow-sm"
            style={{ borderRadius: '50%', minWidth: 0, padding: '8px' }}
            title="Tambah Ke Keranjang"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
