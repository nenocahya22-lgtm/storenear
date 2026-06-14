/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trash2, ArrowLeft, ShoppingBag, Plus, Minus, ArrowRight, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupiah, PLACEHOLDER_IMAGE } from '../utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const Cart: React.FC = () => {
  const { cart, updateCartQty, removeFromCart, setView, clearCart } = useStore();

  // ─── CEK STOK REAL-TIME DARI FIRESTORE ───
  const [stockWarnings, setStockWarnings] = useState<Record<string, number>>({});
  useEffect(() => {
    const checkStock = async () => {
      const warnings: Record<string, number> = {};
      for (const item of cart) {
        try {
          const prodRef = doc(db, 'products', item.product.id);
          const snap = await getDoc(prodRef);
          if (snap.exists()) {
            const currentStock = snap.data().stock || 0;
            if (currentStock < item.quantity) {
              warnings[item.product.id] = currentStock;
            }
          }
        } catch (e) {
          // silent — offline mode
        }
      }
      setStockWarnings(warnings);
    };
    checkStock();
  }, [JSON.stringify(cart.map(i => ({ id: i.product.id, qty: i.quantity })))]);

  // Hitung subtotal dengan memperhitungkan diskon
  const subtotal = cart.reduce((sum, item) => {
    const discount = item.product.discountPercent || 0;
    const effectivePrice = discount > 0 ? item.product.price * (1 - discount / 100) : item.product.price;
    return sum + (effectivePrice * item.quantity);
  }, 0);
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="container-near py-20 text-center flex flex-col items-center animate-fade-in">
        <div className="card p-8 max-w-md mx-auto">
          <ShoppingCart className="mx-auto text-gray-200 mb-3" size={48} />
          <h3 className="text-h1 text-[var(--text-black)] mb-1.5">Keranjang Kosong</h3>
          <p className="text-[1.3rem] text-[var(--text-black-soft)] mb-6 max-w-sm leading-relaxed">
            Yuk isi dengan menu lezat kesukaanmu!
          </p>
          <button onClick={() => setView('home')} className="btn btn-primary">Lihat Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-near py-8 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <button onClick={() => setView('home')} className="flex items-center gap-2 text-[1.3rem] font-semibold text-[var(--green-accent)] hover:text-[var(--brand-green)] transition-colors focus:outline-none cursor-pointer">
          <ArrowLeft size={14} />
          <span>Kembali</span>
        </button>
        <div className="flex items-center justify-between w-full md:w-auto">
          <h2 className="text-h1 text-[var(--text-black)]">Keranjang ({totalQty})</h2>
          <button onClick={clearCart} className="ml-5 text-[1.2rem] font-bold text-[var(--red)] hover:text-[var(--red)]/80 cursor-pointer">Kosongkan</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div key={item.product.id} className="card p-4 flex gap-4 hover:shadow-md transition-shadow">
              <div className="w-20 h-20 bg-[var(--canvas-warm)] rounded-[var(--radius-card)] overflow-hidden shrink-0">
                <img src={item.product.imageUrl} alt={item.product.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" 
                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }} />
              </div>
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-[1.3rem] font-bold text-[var(--text-black)] truncate pr-4">{item.product.name}</h4>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-[var(--text-black-soft)] hover:text-[var(--red)] transition-colors shrink-0 cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span className="text-[1rem] text-[var(--text-black-soft)] tracking-[var(--tracking-looser)] uppercase mt-1 block">{item.product.category}</span>
                  {stockWarnings[item.product.id] !== undefined && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[1rem] text-[var(--red)] font-bold bg-red-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Stok tersisa {stockWarnings[item.product.id]}, tidak cukup untuk pesanan ini
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                  <span className="text-[1.6rem] font-bold text-[var(--text-black)]">{formatRupiah(item.product.price)}</span>
                  <div className="flex items-center border border-gray-200 rounded-[var(--button-radius)] p-0.5 bg-white">
                    <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="p-1.5 text-[var(--text-black-soft)] hover:text-[var(--text-black)] rounded-full hover:bg-[var(--canvas-warm)] cursor-pointer">
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-[1.3rem] font-bold text-[var(--text-black)] font-mono">{item.quantity}</span>
                    <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="p-1.5 text-[var(--text-black-soft)] hover:text-[var(--text-black)] rounded-full hover:bg-[var(--canvas-warm)] cursor-pointer">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-4 card p-6">
          <h3 className="text-[1.3rem] font-bold text-[var(--text-black)] mb-4 border-b border-gray-100 pb-3">Ringkasan</h3>
          <div className="space-y-3 pb-4 border-b border-gray-100 text-[1.3rem] text-[var(--text-black-soft)]">
            <div className="flex justify-between">
              <span>Subtotal ({totalQty} item)</span>
              <span className="font-semibold text-[var(--text-black)]">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ongkos Kirim</span>
              <span className="text-[var(--green-accent)] font-bold text-[1rem] tracking-[var(--tracking-looser)] uppercase">GRATIS</span>
            </div>
          </div>
          <div className="flex justify-between py-4 text-[1.6rem] font-bold text-[var(--text-black)]">
            <span>Total</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <button onClick={() => setView('checkout')} className="btn btn-black w-full justify-center text-[1.4rem]">
            <span>Lanjut ke Pembayaran</span>
            <ArrowRight size={14} />
          </button>
          <p className="mt-4 text-[0.9rem] text-[var(--text-black-soft)] text-center">
            🛡️ Transaksi aman Near Bakery & Co.
          </p>
        </div>
      </div>
    </div>
  );
};
