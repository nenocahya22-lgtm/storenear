/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { formatRupiah, getStatusBadgeStyle } from '../utils';
import { Order, OrderStatus } from '../types';
import { Package, Truck, CheckCircle, Clock, ShoppingBag, MapPin, Eye, Star } from 'lucide-react';

export const OrderTracking: React.FC = () => {
  const { currentUser, setView, setSelectedProductId, triggerToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id, userId: data.userId, userName: data.userName, userEmail: data.userEmail,
          items: data.items, totalAmount: data.totalAmount, status: data.status,
          shippingAddress: data.shippingAddress, paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus, trackingNumber: data.trackingNumber,
          statusHistory: data.statusHistory || [], createdAt: data.createdAt, updatedAt: data.updatedAt
        });
      });
      setOrders(list);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading orders:', error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      // 🔒 Hanya auto-Lunas untuk COD. Transfer Bank harus diverifikasi admin.
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) { triggerToast('Error', 'Pesanan tidak ditemukan.'); return; }
      const ordData = orderDoc.data() as any;
      const isCod = ordData.paymentMethod?.toLowerCase().includes('cod');
      const noteStr = 'Pesanan telah diterima oleh Pembeli.';
      const updateData: any = {
        status: 'Selesai' as OrderStatus,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({ status: 'Selesai' as OrderStatus, updatedAt: new Date(), note: noteStr })
      };
      // Hanya set Lunas jika COD (pembayaran di tempat sudah lunas saat diterima)
      if (isCod) {
        updateData.paymentStatus = 'Lunas';
      }
      await updateDoc(orderRef, updateData);
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id, userId: currentUser.uid, title: 'Pesanan Selesai 🎉',
        body: `Pesanan #${orderId} telah selesai!`, read: false, orderId: orderId, createdAt: serverTimestamp()
      });
      triggerToast('Pesanan Selesai', 'Terima kasih!');
    } catch (e) { console.error(e); triggerToast('Gagal', 'Terjadi kesalahan.'); }
  };

  const getTimelineIcon = (status: OrderStatus, activeStatus: OrderStatus) => {
    const statuses: OrderStatus[] = ['Menunggu Pembayaran', 'Diproses', 'Dikirim', 'Selesai'];
    const activeIdx = statuses.indexOf(activeStatus);
    const thisIdx = statuses.indexOf(status);
    const isActive = thisIdx <= activeIdx && activeStatus !== 'Dibatalkan';
    const iconStyle = { backgroundColor: isActive ? 'var(--brand-green)' : 'var(--canvas-warm)', color: isActive ? 'white' : 'var(--text-black-soft)', border: `1px solid ${isActive ? 'var(--brand-green)' : '#e5e7eb'}` };
    const icons: Record<string, React.ReactNode> = {
      'Menunggu Pembayaran': <Clock size={14} />, 'Diproses': <Package size={14} />,
      'Dikirim': <Truck size={14} />, 'Selesai': <CheckCircle size={14} />
    };
    return <div className="w-8 h-8 rounded-full flex items-center justify-center" style={iconStyle}>{icons[status]}</div>;
  };

  if (!currentUser) return (
    <div className="container-near py-20 text-center">
      <div className="card max-w-md mx-auto p-8">
        <Package size={32} className="mx-auto text-gray-200 mb-3" />
        <h3 className="text-h1 text-[var(--text-black)] mb-1.5">Masuk untuk Melacak</h3>
        <p className="text-[1.3rem] text-[var(--text-black-soft)]">Silakan masuk untuk melihat pesanan Anda.</p>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="container-near py-20 text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[var(--brand-green)] mx-auto"></div>
      <p className="text-[1.3rem] text-[var(--text-black-soft)] mt-4">Memuat pesanan...</p>
    </div>
  );

  return (
    <div className="container-near py-8 pb-20">
      <h2 className="text-h1 text-[var(--text-black)] mb-8 flex items-center gap-2 border-b border-gray-100 pb-3">
        <Truck size={18} className="text-[var(--brand-green)]" /> Pesanan Saya
      </h2>

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag className="mx-auto text-gray-200 mb-3" size={36} />
          <h3 className="text-h1 text-[var(--text-black)]">Belum Ada Pesanan</h3>
          <p className="text-[1.3rem] text-[var(--text-black-soft)] mt-2">Anda belum memesan apapun.</p>
          <button onClick={() => setView('home')} className="btn btn-primary mt-5">Belanja Sekarang</button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div key={ord.id} className="card overflow-hidden">
              <div className={`p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer transition-colors ${activeOrderId === ord.id ? 'bg-[var(--canvas-warm)] border-b border-gray-100' : ''}`}
                onClick={() => setActiveOrderId(activeOrderId === ord.id ? null : ord.id)}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[1.3rem] text-[var(--text-black)]">#{ord.id}</span>
                    <span className="text-[1.1rem] text-[var(--text-black-soft)] font-mono">{ord.createdAt ? new Date(ord.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru'}</span>
                    <span className={`text-[1rem] font-bold tracking-[var(--tracking-looser)] uppercase px-2.5 py-0.5 rounded-[var(--button-radius)] border ${getStatusBadgeStyle(ord.status)}`}>{ord.status}</span>
                  </div>
                  <p className="text-[1.2rem] text-[var(--text-black-soft)] mt-1.5 truncate max-w-md">{ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[0.9rem] text-[var(--text-black-soft)] block font-bold tracking-[var(--tracking-looser)] uppercase">Total</span>
                    <strong className="text-[1.4rem] text-[var(--text-black)]">{formatRupiah(ord.totalAmount)}</strong>
                  </div>
                  <Eye size={16} className="text-[var(--text-black-soft)]" />
                </div>
              </div>

              {activeOrderId === ord.id && (
                <div className="p-6 bg-white border-t border-gray-100">
                  {/* Timeline */}
                  <div className="mb-8 max-w-xl mx-auto">
                    <h4 className="text-[1rem] tracking-[var(--tracking-looser)] font-bold text-[var(--text-black-soft)] uppercase text-center mb-6">Status Pesanan</h4>
                    <div className="relative flex justify-between items-center px-4">
                      <div className="absolute left-10 right-10 h-[2px] bg-gray-200 top-4 -z-10" />
                      {['Menunggu Pembayaran', 'Diproses', 'Dikirim', 'Selesai'].map((s) => (
                        <div key={s} className="flex flex-col items-center gap-2">
                          {getTimelineIcon(s as OrderStatus, ord.status)}
                          <span className="text-[0.9rem] font-bold text-[var(--text-black-soft)] max-w-[70px] text-center leading-tight">
                            {s === 'Menunggu Pembayaran' ? 'Bayar' : s === 'Diproses' ? 'Dibuat' : s === 'Dikirim' ? 'Dikirim' : 'Selesai'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                    <div className="space-y-4">
                      <h4 className="text-[1.1rem] font-bold text-[var(--text-black)] flex items-center gap-1.5 mb-2">
                        <MapPin size={14} className="text-[var(--text-black-soft)]" /> Alamat Pengiriman
                      </h4>
                      <div className="card p-4 space-y-1">
                        <strong className="text-[var(--text-black)]">{ord.shippingAddress.name}</strong>
                        <p className="text-[var(--text-black-soft)] text-[1.2rem]">{ord.shippingAddress.address}</p>
                        <p className="text-[var(--text-black-soft)] text-[1.1rem]">{ord.shippingAddress.city}, {ord.shippingAddress.postalCode}</p>
                        <p className="text-[1.1rem] text-[var(--text-black-soft)] font-bold mt-1">Telp: {ord.shippingAddress.phone}</p>
                      </div>
                      {ord.trackingNumber && (
                        <div className="card p-4 flex justify-between items-center">
                          <div>
                            <span className="text-[0.9rem] text-[var(--text-black-soft)] block tracking-[var(--tracking-looser)] uppercase font-bold">Resi</span>
                            <strong className="text-[var(--text-black)] tracking-wider">{ord.trackingNumber}</strong>
                          </div>
                          <span className="text-[0.9rem] font-bold bg-[var(--canvas-warm)] px-2.5 py-1 rounded-[var(--button-radius)]">Dikirim</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between">
                      <h4 className="text-[1.1rem] font-bold text-[var(--text-black)] mb-2">Pesanan</h4>
                      <div className="card p-4 space-y-2 max-h-40 overflow-y-auto">
                        {ord.items.map((i) => (
                          <div key={i.productId} className="flex justify-between items-center text-[1.2rem]">
                            <span className="text-[var(--text-black-soft)] truncate max-w-[140px] hover:text-[var(--brand-green)] cursor-pointer"
                              onClick={() => { setSelectedProductId(i.productId); setView('product-detail'); }}>
                              {i.name} (x{i.quantity})
                            </span>
                            <span className="font-bold text-[var(--text-black)]">{formatRupiah(i.price * i.quantity)}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                          <span>Total</span><span className="text-[var(--text-black)]">{formatRupiah(ord.totalAmount)}</span>
                        </div>
                      </div>
                      {ord.status === 'Dikirim' && (
                        <button onClick={() => handleCompleteOrder(ord.id)} className="btn btn-primary w-full mt-4 text-[1.3rem]">
                          Konfirmasi Pesanan Diterima
                        </button>
                      )}
                      {ord.status === 'Selesai' && (
                        <div className="mt-4 bg-[var(--canvas-warm)] p-3 rounded-[var(--radius-card)] text-center text-[var(--text-black)]">
                          <span className="font-medium text-[1.1rem] flex items-center justify-center gap-1">
                            <Star size={12} className="text-[var(--gold)]" fill="currentColor" />
                            Pesanan Selesai! Silakan beri ulasan.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
