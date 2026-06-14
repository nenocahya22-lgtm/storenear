/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowLeft, MapPin, CreditCard, ShieldCheck, CheckCircle2, Copy } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { formatRupiah, PLACEHOLDER_IMAGE } from '../utils';
import { ShippingAddress, OrderItem, StatusHistoryItem, OrderStatus } from '../types';

export const Checkout: React.FC = () => {
  const { cart, clearCart, setView, currentUser, triggerToast, paymentMethods, cabangId, webstoreConfig } = useStore();
  const [address, setAddress] = useState<ShippingAddress>({
    name: currentUser?.displayName || '', phone: '', address: '', city: '', postalCode: ''
  });
  const defaultPayment = paymentMethods.length > 0 ? paymentMethods[0].name : 'Transfer Bank (BCA)';
  const [paymentMethod, setPaymentMethod] = useState<string>(defaultPayment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');

  // Hitung subtotal dengan diskon (sinkron dengan Cart.tsx)
  const subtotal = cart.reduce((sum, item) => {
    const discount = item.product.discountPercent || 0;
    const effectivePrice = discount > 0 ? item.product.price * (1 - discount / 100) : item.product.price;
    return sum + (effectivePrice * item.quantity);
  }, 0);
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { triggerToast('Gagal', 'Silakan masuk akun terlebih dahulu.'); return; }
    if (!address.name.trim() || !address.phone.trim() || !address.address.trim() || !address.city.trim()) {
      triggerToast('Data Alamat', 'Mohon lengkapi alamat pengiriman.'); return;
    }
    setIsSubmitting(true);
    try {
      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const orderRef = doc(db, 'orders', orderId);
      const initialHistory: StatusHistoryItem[] = [{
        status: 'Menunggu Pembayaran', updatedAt: new Date(),
        note: 'Pesanan berhasil dibuat. Silakan selesaikan pembayaran.'
      }];
      await runTransaction(db, async (transaction) => {
        let verifiedTotal = 0;
        const verifiedItems: OrderItem[] = [];
        for (const item of cart) {
          const productRef = doc(db, 'products', item.product.id);
          const prodDoc = await transaction.get(productRef);
          if (!prodDoc.exists()) throw new Error(`Produk "${item.product.name}" tidak ditemukan.`);
          const prodData = prodDoc.data() as any;
          const currentStock = prodData.stock || 0;
          if (currentStock < item.quantity) throw new Error(`Stok "${item.product.name}" tidak mencukupi. Tersisa ${currentStock}.`);
          // 🔒 Validasi harga sisi server — cegah manipulasi harga klien
          const serverPrice = prodData.price || 0;
          const discountPct = prodData.discountPercent || 0;
          const effectivePrice = discountPct > 0 ? serverPrice * (1 - discountPct / 100) : serverPrice;
          verifiedTotal += effectivePrice * item.quantity;
          verifiedItems.push({
            productId: item.product.id, name: item.product.name,
            price: effectivePrice, // Pakai harga server yang sudah tervalidasi
            quantity: item.quantity, imageUrl: item.product.imageUrl
          });
          transaction.update(productRef, { stock: currentStock - item.quantity });
        }
        transaction.set(orderRef, {
          id: orderId, userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Pembeli',
          userEmail: currentUser.email || 'buyer@example.com',
          items: verifiedItems, totalAmount: verifiedTotal, status: 'Menunggu Pembayaran' as OrderStatus,
          shippingAddress: address, paymentMethod: paymentMethod, paymentStatus: 'Belum Bayar',
          trackingNumber: '', statusHistory: initialHistory, cabangId: cabangId,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          id: notifRef.id, userId: currentUser.uid, title: 'Pesanan Dibuat',
          body: `Pesanan ${orderId} telah diajukan ke dapur.`, read: false, orderId: orderId, createdAt: serverTimestamp()
        });
      });
      // Kirim notifikasi ke ERP via erp_notifications collection
      try {
        const erpNotifRef = doc(collection(db, 'erp_notifications'));
        await setDoc(erpNotifRef, {
          id: erpNotifRef.id,
          type: 'new_order',
          title: '🛵 Pesanan Baru!',
          body: `${currentUser.displayName || 'Pembeli'} memesan ${totalQty} item — ${formatRupiah(subtotal)}`,
          orderId: orderId,
          cabangId: cabangId,
          cabangNama: cabangId === 'pusat' ? 'Pusat' : cabangId,
          amount: subtotal,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('Gagal kirim notifikasi ERP:', e);
      }

      clearCart();
      setPlacedOrderId(orderId);
      setOrderSuccess(true);
      triggerToast('Pesanan Dikirim', `Pesanan ${orderId} berhasil dibuat!`);
    } catch (err: any) {
      console.error(err);
      triggerToast('Gagal', err.message || 'Gagal memproses pesanan.');
    } finally { setIsSubmitting(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('Disalin', 'Nomor berhasil disalin.');
  };

  if (orderSuccess) {
    // Gunakan nilai dari state yang sudah di-set saat order — verifiedTotal sudah dihitung di server side
    const displayTotal = subtotal; // subtotal di-recalculate biar match dengan verifiedTotal (client-side sudah include diskon)
    const selectedPm = paymentMethods.find(pm => pm.name === paymentMethod);
    return (
      <div className="container-near py-16 text-center animate-fade-in">
        <div className="card max-w-xl mx-auto p-8 md:p-12">
          <div className="mx-auto w-14 h-14 bg-[var(--brand-green)] text-white rounded-full flex items-center justify-center mb-6 shadow-md">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-h1 text-[var(--brand-green)] mb-2">Pesanan Berhasil!</h2>
          <p className="text-[1.3rem] text-[var(--text-black-soft)] mb-6">Kode: <strong className="text-[var(--text-black)]">{placedOrderId}</strong></p>

          {selectedPm?.type === 'transfer_bank' && (
            <div className="bg-[var(--canvas-warm)] p-6 mb-8 text-left rounded-[var(--radius-card)]">
              <h4 className="text-[1rem] tracking-[var(--tracking-looser)] font-bold text-[var(--text-black-soft)] mb-3 border-b border-gray-200/30 pb-2 uppercase">Instruksi Transfer</h4>
              <p className="text-[1.3rem] text-[var(--text-black-soft)] mb-4">Transfer <strong className="text-[var(--text-black)]">{formatRupiah(subtotal)}</strong> ke:</p>
              <div className="space-y-3">
                {selectedPm.bankName && <div className="flex justify-between bg-white p-3 rounded-[var(--radius-card)] border border-gray-100"><span className="text-[1rem] text-[var(--text-black-soft)]">Bank</span><strong>{selectedPm.bankName}</strong></div>}
                {selectedPm.accountNumber && <div className="flex justify-between items-center bg-white p-3 rounded-[var(--radius-card)] border border-gray-100">
                  <div><span className="text-[1rem] text-[var(--text-black-soft)] block">No. Rekening</span><strong className="text-[var(--text-black)] tracking-wider">{selectedPm.accountNumber}</strong></div>
                  <button onClick={() => copyToClipboard(selectedPm.accountNumber || '')} className="btn btn-sm btn-outline-dark flex items-center gap-1"><Copy size={11} /> Salin</button>
                </div>}
                {selectedPm.accountName && <div className="flex justify-between bg-white p-3 rounded-[var(--radius-card)] border border-gray-100"><span className="text-[1rem] text-[var(--text-black-soft)]">Atas Nama</span><strong>{selectedPm.accountName}</strong></div>}
              </div>
            </div>
          )}
          {selectedPm?.type === 'ewallet' && (
            <div className="bg-[var(--canvas-warm)] p-6 mb-8 text-left rounded-[var(--radius-card)]">
              <h4 className="text-[1rem] tracking-[var(--tracking-looser)] font-bold text-[var(--text-black-soft)] mb-3 border-b border-gray-200/30 pb-2 uppercase">Pembayaran {selectedPm.name}</h4>
              <p className="text-[1.3rem] text-[var(--text-black-soft)] mb-4">Bayar <strong className="text-[var(--text-black)]">{formatRupiah(subtotal)}</strong> ke:</p>
              {selectedPm.phoneNumber && <div className="flex justify-between items-center bg-white p-3 rounded-[var(--radius-card)] border border-gray-100">
                <div><span className="text-[1rem] text-[var(--text-black-soft)]">Nomor</span><strong className="text-[var(--text-black)]">{selectedPm.phoneNumber}</strong></div>
                <button onClick={() => copyToClipboard(selectedPm.phoneNumber || '')} className="btn btn-sm btn-outline-dark flex items-center gap-1"><Copy size={11} /> Salin</button>
              </div>}
            </div>
          )}
          {selectedPm?.type === 'cod' && (
            <div className="bg-[var(--canvas-warm)] p-6 mb-8 text-left rounded-[var(--radius-card)]">
              <h4 className="text-[1rem] tracking-[var(--tracking-looser)] font-bold text-[var(--text-black-soft)] mb-3 border-b border-gray-200/30 pb-2 uppercase">COD</h4>
              <p className="text-[1.3rem] text-[var(--text-black-soft)]">Bayar <strong className="text-[var(--text-black)]">{formatRupiah(subtotal)}</strong> saat kurir tiba.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setView('orders')} className="btn btn-primary flex-1">Lacak Pesanan</button>
            <button onClick={() => setView('home')} className="btn btn-outline flex-1">Belanja Lagi</button>
          </div>
        </div>
      </div>
    );
  }

  const hasStockIssues = cart.some(item => item.quantity > (item.product.stock || 0));

  return (
    <div className="container-near py-6 pb-20">
      <div className="mb-6">
        <button onClick={() => setView('cart')} className="flex items-center gap-2 text-[1.3rem] font-semibold text-[var(--green-accent)] hover:text-[var(--brand-green)] transition-colors focus:outline-none cursor-pointer">
          <ArrowLeft size={14} /> Kembali
        </button>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="card p-6 md:p-8">
            <h3 className="text-h1 text-[var(--text-black)] mb-5 border-b border-gray-100 pb-3 flex items-center gap-2">
              <MapPin size={16} className="text-[var(--brand-green)]" /> Alamat Pengiriman
            </h3>
            <div className="space-y-4">
              <div>
                <label className="input-label">Nama Penerima</label>
                <input type="text" name="name" required value={address.name} onChange={handleInputChange} placeholder="Nama lengkap..." className="input-field" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">No. WhatsApp</label>
                  <input type="tel" name="phone" required value={address.phone} onChange={handleInputChange} placeholder="081234567890" className="input-field" />
                </div>
              </div>
              <div>
                <label className="input-label">Alamat Lengkap</label>
                <textarea name="address" required rows={3} value={address.address} onChange={handleInputChange} placeholder="Jalan, nomor, RT/RW, kelurahan..." className="input-field resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Kota</label>
                  <input type="text" name="city" required value={address.city} onChange={handleInputChange} placeholder="Kota" className="input-field" />
                </div>
                <div>
                  <label className="input-label">Kode Pos</label>
                  <input type="text" name="postalCode" value={address.postalCode} onChange={handleInputChange} placeholder="Kode Pos" className="input-field" />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <h3 className="text-h1 text-[var(--text-black)] mb-5 border-b border-gray-100 pb-3 flex items-center gap-2">
              <CreditCard size={16} className="text-[var(--brand-green)]" /> Metode Pembayaran
            </h3>
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <label key={pm.name} className={`block p-3.5 rounded-[var(--radius-card)] border cursor-pointer transition-colors ${
                  paymentMethod === pm.name ? 'border-[var(--brand-green)] bg-[var(--green-light)]/20' : 'border-gray-200 hover:bg-[var(--canvas-warm)]'
                }`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="paymentMethod" value={pm.name} checked={paymentMethod === pm.name}
                      onChange={() => setPaymentMethod(pm.name)} className="accent-[var(--brand-green)] h-4 w-4" />
                    <span className="text-[1.3rem] font-medium">{pm.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 card p-6 sticky top-24">
          <h3 className="text-[1.3rem] font-bold text-[var(--text-black)] mb-4 border-b border-gray-100 pb-3">Ringkasan Pesanan</h3>
          <div className="max-h-56 overflow-y-auto mb-4 border-b border-gray-100 space-y-3 pb-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex gap-3 justify-between items-center text-[1.3rem]">
                <div className="flex gap-2.5 items-center truncate">
                  <div className="w-9 h-9 rounded-[var(--radius-card)] bg-[var(--canvas-warm)] overflow-hidden shrink-0">
                    <img src={item.product.imageUrl || PLACEHOLDER_IMAGE} alt={item.product.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }} />
                  </div>
                  <span className="truncate max-w-[150px] font-medium">{item.product.name}</span>
                </div>
                <span className="shrink-0 font-bold">{formatRupiah(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-[1.3rem] pb-4 border-b border-gray-100">
            <div className="flex justify-between text-[var(--text-black-soft)]">
              <span>Subtotal</span><span className="font-bold text-[var(--text-black)]">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-black-soft)]">
              <span>Ongkir</span><span className="text-[var(--green-accent)] font-bold text-[1rem] tracking-[var(--tracking-looser)] uppercase">GRATIS</span>
            </div>
          </div>
          <div className="flex justify-between py-4 text-[1.6rem] font-bold">
            <span>Total</span><span>{formatRupiah(subtotal)}</span>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full text-[1.4rem] justify-center">
            {isSubmitting ? 'Memproses...' : <><ShieldCheck size={16} /> Kirim Pesanan</>}
          </button>
          <p className="text-[0.9rem] text-[var(--text-black-soft)] text-center mt-4">{webstoreConfig?.checkoutFooterText || 'Near Bakery & Co. — Kualitas Terjamin'}</p>
        </div>
      </form>
    </div>
  );
};
