/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, setDoc,
  doc, deleteDoc, updateDoc, serverTimestamp, arrayUnion, getDocs, runTransaction
} from 'firebase/firestore';
import { Product, Order, ChatRoom, ChatMessage, OrderStatus } from '../types';
import { PRESET_IMAGES, CATEGORIES } from '../data/presets';
import { formatRupiah, getStatusBadgeStyle } from '../utils';
import { 
  Plus, Trash2, Edit2, ShieldAlert, ShoppingBag, 
  ClipboardList, MessageSquare, Send, CheckCircle, Truck, 
  RefreshCcw, X, Star, BarChart3, Package, Croissant
} from 'lucide-react';

export const SellerDashboard: React.FC = () => {
  const { currentUser, userRole, triggerToast } = useStore();
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'chats' | 'reviews'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductIdForReviews, setSelectedProductIdForReviews] = useState<string>('');
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [loadingSellerReviews, setLoadingSellerReviews] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(CATEGORIES[0]);
  const [newProdPrice, setNewProdPrice] = useState(150000);
  const [newProdStock, setNewProdStock] = useState(10);
  const [newProdDescription, setNewProdDescription] = useState('');
  const [newProdImgUrl, setNewProdImgUrl] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [courierResi, setCourierResi] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Listeners
  useEffect(() => {
    if (!currentUser || userRole !== 'penjual') { setIsLoading(false); return; }
    const unsub1 = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach((d) => { const data = d.data(); list.push({ id: d.id, name: data.name, description: data.description, price: data.price, stock: data.stock, imageUrl: data.imageUrl, category: data.category, rating: data.rating, reviewCount: data.reviewCount, createdAt: data.createdAt }); });
      setProducts(list); setIsLoading(false);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'products'));
    return () => unsub1();
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!currentUser || userRole !== 'penjual') return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Order[] = [];
      snap.forEach((d) => { const data = d.data(); list.push({ id: d.id, userId: data.userId, userName: data.userName, userEmail: data.userEmail, items: data.items, totalAmount: data.totalAmount, status: data.status, shippingAddress: data.shippingAddress, paymentMethod: data.paymentMethod, paymentStatus: data.paymentStatus, trackingNumber: data.trackingNumber, statusHistory: data.statusHistory || [], createdAt: data.createdAt, updatedAt: data.updatedAt }); });
      setOrders(list);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'orders'));
    return () => unsub();
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!currentUser || userRole !== 'penjual') return;
    const q = query(collection(db, 'chats'), orderBy('lastMessageTime', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: ChatRoom[] = [];
      snap.forEach((d) => { const data = d.data(); list.push({ id: d.id, buyerId: data.buyerId, buyerName: data.buyerName, buyerEmail: data.buyerEmail, unreadBySeller: data.unreadBySeller, unreadByBuyer: data.unreadByBuyer, lastMessage: data.lastMessage, lastMessageTime: data.lastMessageTime }); });
      setChatRooms(list);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'chats'));
    return () => unsub();
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!activeChatId) { setChatMessages([]); return; }
    const q = query(collection(db, 'chats', activeChatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: ChatMessage[] = [];
      snap.forEach((d) => { const data = d.data(); list.push({ id: d.id, senderId: data.senderId, senderRole: data.senderRole, message: data.message, createdAt: data.createdAt }); });
      setChatMessages(list);
      try { updateDoc(doc(db, 'chats', activeChatId), { unreadBySeller: false }); } catch (e) { console.error(e); }
    }, (e) => handleFirestoreError(e, OperationType.LIST, `chats/${activeChatId}/messages`));
    return () => unsub();
  }, [activeChatId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Review sync
  useEffect(() => {
    if (!selectedProductIdForReviews) { setSellerReviews([]); return; }
    setLoadingSellerReviews(true);
    const q = query(collection(db, 'products', selectedProductIdForReviews, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = []; snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setSellerReviews(list); setLoadingSellerReviews(false);
    }, (e) => { console.error(e); setLoadingSellerReviews(false); });
    return () => unsub();
  }, [selectedProductIdForReviews]);

  useEffect(() => { if (products.length > 0 && !selectedProductIdForReviews) setSelectedProductIdForReviews(products[0].id); }, [products]);

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Hapus produk ini?')) return;
    try { await deleteDoc(doc(db, 'products', id)); triggerToast('Produk Dihapus', 'Produk berhasil dihapus.'); } catch (e) { console.error(e); }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdDescription.trim()) { triggerToast('Isi Data', 'Harap isi nama dan deskripsi.'); return; }
    try {
      const customId = 'PRD-' + Math.floor(100000 + Math.random() * 900000);
      await setDoc(doc(db, 'products', customId), {
        id: customId, name: newProdName, description: newProdDescription, price: Number(newProdPrice),
        stock: Number(newProdStock), imageUrl: newProdImgUrl || PRESET_IMAGES[0]?.url || '', category: newProdCategory,
        rating: 5.0, reviewCount: 0, createdAt: serverTimestamp()
      });
      setNewProdName(''); setNewProdDescription(''); setShowAddForm(false);
      triggerToast('Produk Ditambahkan', `"${newProdName}" berhasil ditambahkan.`);
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'products'); }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !adminReply.trim()) return;
    try {
      const msg = adminReply.trim(); setAdminReply('');
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), { senderId: 'admin', senderRole: 'seller', message: msg, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'chats', activeChatId), { lastMessage: msg, lastMessageTime: serverTimestamp(), unreadByBuyer: true, unreadBySeller: false });
    } catch (e) { console.error(e); }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;
    setIsUpdatingOrder(true);
    try {
      let log = `Pesanan diupdate ke: ${newStatus}.`;
      if (newStatus === 'Dikirim') {
        if (!courierResi.trim()) { triggerToast('Isi Resi', 'Masukkan nomor resi.'); setIsUpdatingOrder(false); return; }
        log = `Paket dikirim dengan resi: ${courierResi.trim()}.`;
      }
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus, trackingNumber: newStatus === 'Dikirim' ? courierResi.trim() : ord.trackingNumber || '',
        paymentStatus: newStatus === 'Selesai' ? 'Lunas' : ord.paymentStatus, updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({ status: newStatus, updatedAt: new Date(), note: log })
      });
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, { id: notifRef.id, userId: ord.userId, title: `Update Pesanan ${ord.id}`,
        body: `Status berubah menjadi "${newStatus}".${newStatus === 'Dikirim' ? ` Resi: ${courierResi}` : ''}`,
        read: false, orderId: ord.id, createdAt: serverTimestamp() });
      setCourierResi(''); setSelectedOrder(null);
      triggerToast('Status Diperbarui', `Pesanan ${orderId} → ${newStatus}`);
    } catch (e) { console.error(e); triggerToast('Gagal', 'Gagal update status.'); }
    finally { setIsUpdatingOrder(false); }
  };

  const handleDeleteReview = async (reviewId: string, oldRating: number) => {
    if (!selectedProductIdForReviews || !window.confirm('Hapus ulasan ini?')) return;
    try {
      const productDocRef = doc(db, 'products', selectedProductIdForReviews);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(productDocRef);
        if (!snap.exists()) throw new Error('Produk tidak ditemukan');
        const data = snap.data();
        const newCount = Math.max(0, (data.reviewCount || 0) - 1);
        const newRating = newCount === 0 ? 5.0 : (((data.rating || 5.0) * (data.reviewCount || 0)) - oldRating) / newCount;
        tx.delete(doc(db, 'products', selectedProductIdForReviews, 'reviews', reviewId));
        tx.update(productDocRef, { reviewCount: newCount, rating: Number(newRating.toFixed(1)) });
      });
      triggerToast('Ulasan Dihapus', 'Ulasan berhasil dimoderasi.');
    } catch (e) { console.error(e); triggerToast('Gagal', 'Gagal menghapus ulasan.'); }
  };

  const tabBtn = (key: string, icon: React.ReactNode, label: string, count?: number) => (
    <button onClick={() => setActiveTab(key as any)}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-[1.2rem] font-bold border-b-2 transition-colors focus:outline-none cursor-pointer ${
        activeTab === key ? 'border-[var(--brand-green)] text-[var(--brand-green)]' : 'border-transparent text-[var(--text-black-soft)] hover:text-[var(--text-black)]'
      }`}>
      {icon}<span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="h-4 min-w-[16px] rounded-full bg-[var(--red)] text-white font-bold text-[0.8rem] flex items-center justify-center px-1 leading-none">{count}</span>
      )}
    </button>
  );

  return (
    <div className="container-near py-6 pb-20">
      <div className="card overflow-hidden p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5 mb-6">
          <div>
            <h2 className="text-h1 text-[var(--brand-green)] flex items-center gap-1.5">
              <Croissant size={20} className="text-[var(--gold)]" />
              Near Bakery Admin
            </h2>
            <p className="text-[1.3rem] text-[var(--text-black-soft)] mt-1">Kelola produk, pesanan, dan chat pembeli.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-6 gap-2 overflow-x-auto">
          {tabBtn('products', <Package size={14} />, 'Produk')}
          {tabBtn('orders', <ClipboardList size={14} />, 'Pesanan', orders.filter(o => o.status === 'Menunggu Pembayaran' || o.status === 'Diproses').length)}
          {tabBtn('chats', <MessageSquare size={14} />, 'Chat', chatRooms.filter(r => r.unreadBySeller).length)}
          {tabBtn('reviews', <Star size={14} />, 'Ulasan')}
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--brand-green)] mx-auto"></div>
            <p className="text-[1.3rem] text-[var(--text-black-soft)] mt-2">Memuat...</p>
          </div>
        ) : (
          <>
            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-[var(--canvas-warm)] p-4 rounded-[var(--radius-card)]">
                  <span className="text-[1.3rem] text-[var(--text-black-soft)]"><strong className="text-[var(--text-black)]">{products.length}</strong> produk aktif</span>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary text-[1.2rem]">
                    <Plus size={14} /> Tambah Produk
                  </button>
                </div>
                {showAddForm && (
                  <form onSubmit={handleAddProduct} className="card p-5 space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <h3 className="text-[1.3rem] font-bold text-[var(--text-black)]">Tambah Produk Baru</h3>
                      <button type="button" onClick={() => setShowAddForm(false)} className="text-[var(--text-black-soft)] hover:text-[var(--text-black)]"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="input-label">Nama Produk</label><input type="text" required value={newProdName} onChange={(e) => setNewProdName(e.target.value)} placeholder="Nama produk..." className="input-field" /></div>
                      <div><label className="input-label">Kategori</label><select value={newProdCategory} onChange={(e) => setNewProdCategory(e.target.value)} className="input-field">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="input-label">Harga (Rp)</label><input type="number" required value={newProdPrice} onChange={(e) => setNewProdPrice(Number(e.target.value))} className="input-field" /></div>
                      <div><label className="input-label">Stok</label><input type="number" required value={newProdStock} onChange={(e) => setNewProdStock(Number(e.target.value))} className="input-field" /></div>
                    </div>
                    <div><label className="input-label">Gambar URL</label><input type="text" value={newProdImgUrl} onChange={(e) => setNewProdImgUrl(e.target.value)} placeholder="URL gambar..." className="input-field" /></div>
                    <div><label className="input-label">Deskripsi</label><textarea required rows={3} value={newProdDescription} onChange={(e) => setNewProdDescription(e.target.value)} placeholder="Deskripsi produk..." className="input-field resize-none" /></div>
                    <button type="submit" className="btn btn-primary">Unggah Produk</button>
                  </form>
                )}
                {/* Products table */}
                {products.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-[var(--radius-card)]">
                    <ShoppingBag size={40} className="mx-auto text-gray-200 mb-2" />
                    <h4 className="text-[1.3rem] font-bold text-[var(--text-black)]">Belum Ada Produk</h4>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[1.2rem] text-left">
                      <thead className="bg-[var(--canvas-warm)] text-[var(--text-black-soft)] font-bold text-[1rem] tracking-[var(--tracking-looser)] uppercase">
                        <tr><th className="px-4 py-3">Produk</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3 text-right">Harga</th><th className="px-4 py-3 text-center">Stok</th><th className="px-4 py-3 text-center">Rating</th><th className="px-4 py-3 text-center">Aksi</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products.map((p) => (
                          <tr key={p.id} className="hover:bg-[var(--canvas-warm)]">
                            <td className="px-4 py-3 flex items-center gap-3 font-medium text-[var(--text-black)]">
                              <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--canvas-warm)] overflow-hidden shrink-0">
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                              <span className="line-clamp-1 max-w-[200px]">{p.name}</span>
                            </td>
                            <td className="px-4 py-3 text-[var(--text-black-soft)]">{p.category}</td>
                            <td className="px-4 py-3 text-right font-bold text-[var(--brand-green)]">{formatRupiah(p.price)}</td>
                            <td className="px-4 py-3 text-center font-bold"><span className={p.stock > 0 ? 'text-[var(--text-black)]' : 'text-[var(--red)]'}>{p.stock}</span></td>
                            <td className="px-4 py-3 text-center text-[var(--gold)]">⭐ {(p.rating || 5.0).toFixed(1)}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 bg-red-50 hover:bg-[var(--red)] hover:text-white rounded-lg border border-red-100 text-[var(--red)] transition-all cursor-pointer">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-[var(--radius-card)]">
                    <ClipboardList size={40} className="mx-auto text-gray-200 mb-2" />
                    <h4 className="text-[1.3rem] font-bold text-[var(--text-black)]">Belum Ada Pesanan</h4>
                  </div>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.id} className="card p-4 border border-gray-100">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-50 pb-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-[var(--text-black)]">#{ord.id}</strong>
                          <span className="text-[1rem] text-[var(--text-black-soft)]">{ord.userEmail}</span>
                          <span className={`text-[0.9rem] px-2 py-0.5 rounded-[var(--button-radius)] border ${getStatusBadgeStyle(ord.status)}`}>{ord.status}</span>
                        </div>
                        <span className="text-[1rem] text-[var(--text-black-soft)]">{ord.createdAt ? new Date(ord.createdAt.seconds * 1000).toLocaleString('id-ID') : 'Baru'}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-[1.2rem] text-[var(--text-black-soft)]">
                        <div className="md:col-span-5">
                          <h4 className="font-bold text-[var(--text-black)] text-[1rem] uppercase mb-1">Pesanan</h4>
                          {ord.items.map((i, idx) => (
                            <div key={idx} className="flex justify-between text-[1.1rem]">
                              <span className="truncate max-w-[170px]">{i.name} (x{i.quantity})</span>
                              <strong className="text-[var(--text-black)]">{formatRupiah(i.price * i.quantity)}</strong>
                            </div>
                          ))}
                          <div className="border-t border-gray-100 pt-1.5 flex justify-between font-bold text-[var(--brand-green)] mt-2">
                            <span>Total</span><span>{formatRupiah(ord.totalAmount)}</span>
                          </div>
                        </div>
                        <div className="md:col-span-4 bg-[var(--canvas-warm)] p-3 rounded-[var(--radius-card)]">
                          <h4 className="font-bold text-[var(--text-black)] text-[0.9rem] uppercase mb-1">Alamat</h4>
                          <strong>{ord.shippingAddress.name} ({ord.shippingAddress.phone})</strong>
                          <p className="text-[1rem] mt-0.5">{ord.shippingAddress.address}, {ord.shippingAddress.city}</p>
                          <div className="mt-2 text-[1rem] border-t border-gray-200/60 pt-1">
                            <p>Bayar: <strong className="text-[var(--text-black)]">{ord.paymentMethod}</strong></p>
                            <p>Status: <strong className={ord.paymentStatus === 'Lunas' ? 'text-[var(--green-accent)]' : 'text-[var(--gold)]'}>{ord.paymentStatus}</strong></p>
                          </div>
                        </div>
                        <div className="md:col-span-3 flex flex-col gap-2 justify-center">
                          {ord.status !== 'Selesai' && ord.status !== 'Dibatalkan' ? (
                            selectedOrder?.id === ord.id ? (
                              <div className="space-y-2 bg-[var(--gold-lightest)] p-3 rounded-[var(--radius-card)] animate-fade-in">
                                {ord.status === 'Menunggu Pembayaran' && (
                                  <button onClick={() => handleUpdateOrderStatus(ord.id, 'Diproses')} className="btn btn-primary w-full text-[1.1rem]">Proses Pesanan</button>
                                )}
                                {ord.status === 'Diproses' && (
                                  <div className="space-y-1.5">
                                    <input type="text" placeholder="No. Resi" value={courierResi} onChange={(e) => setCourierResi(e.target.value)} className="input-field text-[1.1rem]" />
                                    <button onClick={() => handleUpdateOrderStatus(ord.id, 'Dikirim')} className="btn btn-primary w-full text-[1.1rem]">Kirim</button>
                                  </div>
                                )}
                                <button onClick={() => setSelectedOrder(null)} className="btn btn-outline w-full text-[1.1rem]">Batal</button>
                              </div>
                            ) : (
                              <button onClick={() => { setSelectedOrder(ord); if (ord.status === 'Dikirim') setCourierResi(ord.trackingNumber || ''); }}
                                className="btn btn-primary w-full text-[1.1rem]">Update Status</button>
                            )
                          ) : (
                            <div className="text-center p-3 bg-[var(--canvas-warm)] border border-dashed rounded-[var(--radius-card)] text-[var(--text-black-soft)] text-[1.1rem]">
                              {ord.status} {ord.trackingNumber && <p className="text-[0.9rem] mt-1">Resi: {ord.trackingNumber}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CHATS TAB */}
            {activeTab === 'chats' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[350px]">
                <div className="md:col-span-4 card p-3 space-y-2 overflow-y-auto max-h-[420px] border border-gray-100">
                  <h3 className="text-[1.1rem] font-bold text-[var(--text-black-soft)] uppercase tracking-[var(--tracking-looser)] mb-2 px-1">Percakapan</h3>
                  {chatRooms.length === 0 ? (
                    <div className="text-center py-10 text-[var(--text-black-soft)] text-[1.2rem]">Belum ada chat.</div>
                  ) : (
                    chatRooms.map((room) => (
                      <div key={room.id} onClick={() => setActiveChatId(room.id)}
                        className={`p-3 rounded-[var(--radius-card)] border cursor-pointer transition-all ${activeChatId === room.id ? 'border-[var(--brand-green)] bg-[var(--green-light)]/20' : 'border-gray-100 hover:bg-[var(--canvas-warm)]'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[1.2rem] font-bold truncate max-w-[130px]">{room.buyerName}</h4>
                          {room.unreadBySeller && <span className="h-2 w-2 rounded-full bg-[var(--red)] animate-pulse" />}
                        </div>
                        <p className="text-[1rem] text-[var(--text-black-soft)] truncate">{room.lastMessage || '...'}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="md:col-span-8 card flex flex-col justify-between max-h-[420px] border border-gray-100 overflow-hidden">
                  {activeChatId ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                        <div>
                          <strong className="text-[1.2rem] text-[var(--text-black)]">{chatRooms.find(r => r.id === activeChatId)?.buyerName}</strong>
                          <span className="text-[0.9rem] text-[var(--text-black-soft)] block">{chatRooms.find(r => r.id === activeChatId)?.buyerEmail}</span>
                        </div>
                        <span className="text-[1rem] bg-[var(--green-light)] text-[var(--brand-green)] px-2.5 py-0.5 rounded-[var(--button-radius)]">Konsumen</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--canvas-warm)]">
                        {chatMessages.map((msg) => {
                          const isSeller = msg.senderRole === 'seller';
                          return (
                            <div key={msg.id} className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[80%] px-3 py-2 text-[1.2rem] leading-relaxed rounded-[var(--radius-card)] ${
                                isSeller ? 'text-white rounded-br-none' : 'bg-white border border-gray-200 text-[var(--text-black)] rounded-bl-none'
                              }`} style={isSeller ? {backgroundColor: 'var(--brand-green)'} : {}}>
                                {msg.message}
                              </div>
                              <span className="text-[0.8rem] text-[var(--text-black-soft)] mt-0.5 px-1">
                                {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Baru'}
                              </span>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>
                      <form onSubmit={handleSendAdminReply} className="p-3 border-t border-gray-100 flex gap-2 bg-white">
                        <input type="text" placeholder="Balas..." value={adminReply} onChange={(e) => setAdminReply(e.target.value)}
                          className="flex-1 text-[1.2rem] px-3 border border-gray-200 rounded-[4px] bg-[var(--canvas-warm)] focus:bg-white text-[var(--text-black)] focus:outline-none focus:border-[var(--green-accent)]" />
                        <button type="submit" className="p-2.5 rounded-full flex items-center justify-center transition-colors" style={{backgroundColor: 'var(--green-accent)', color: 'white'}}>
                          <Send size={14} />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-black-soft)]">
                      <MessageSquare size={36} className="text-gray-200 mb-3" />
                      <h4 className="text-[1.3rem] font-semibold">Pilih Percakapan</h4>
                      <p className="text-[1.2rem] mt-1">Pilih chat pembeli di sebelah kiri.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-[var(--gold-lightest)] rounded-[var(--radius-card)] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-[1.2rem] font-bold text-[var(--text-black)]">Moderasi Ulasan</h3>
                    <p className="text-[1.1rem] text-[var(--text-black-soft)]">Kelola ulasan pelanggan.</p>
                  </div>
                  <select value={selectedProductIdForReviews} onChange={(e) => setSelectedProductIdForReviews(e.target.value)}
                    className="input-field w-full md:w-auto min-w-[250px]">
                    {products.map((p) => (<option key={p.id} value={p.id}>{p.name} (⭐{p.rating?.toFixed(1) || '5.0'})</option>))}
                  </select>
                </div>
                {selectedProductIdForReviews && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-4 card p-5 text-center">
                      {products.find(p => p.id === selectedProductIdForReviews) && (
                        <>
                          <div className="w-16 h-16 mx-auto rounded-[var(--radius-card)] overflow-hidden border border-gray-200 shadow-sm mb-3">
                            <img src={products.find(p => p.id === selectedProductIdForReviews)?.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <h4 className="text-[1.3rem] font-bold text-[var(--text-black)] line-clamp-2">{products.find(p => p.id === selectedProductIdForReviews)?.name}</h4>
                          <span className="text-[0.9rem] bg-[var(--green-light)] text-[var(--brand-green)] font-bold px-2 py-0.5 rounded-[var(--button-radius)] uppercase inline-block mt-1">{products.find(p => p.id === selectedProductIdForReviews)?.category}</span>
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <div className="text-[2.4rem] font-bold text-[var(--gold)] flex items-center justify-center gap-1">⭐ {products.find(p => p.id === selectedProductIdForReviews)?.rating?.toFixed(1) || '5.0'}</div>
                            <p className="text-[1rem] text-[var(--text-black-soft)]">{products.find(p => p.id === selectedProductIdForReviews)?.reviewCount || 0} ulasan</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="lg:col-span-8 card p-5">
                      <h4 className="text-[1.2rem] font-bold text-[var(--text-black)] border-b border-gray-100 pb-3 mb-4">Ulasan ({sellerReviews.length})</h4>
                      {loadingSellerReviews ? (
                        <div className="py-12 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[var(--brand-green)] mx-auto"></div>
                        </div>
                      ) : sellerReviews.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-gray-200 rounded-[var(--radius-card)]">
                          <Star size={24} className="mx-auto text-gray-200 mb-2" />
                          <p className="text-[1.2rem] text-[var(--text-black-soft)] italic">Belum ada ulasan.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[350px] overflow-y-auto">
                          {sellerReviews.map((rev) => (
                            <div key={rev.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[1.2rem] font-bold text-[var(--text-black)]">{rev.userName}</span>
                                    <span className="text-[0.9rem] text-[var(--text-black-soft)]">{rev.createdAt ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru'}</span>
                                  </div>
                                  <div className="flex text-[var(--gold)] gap-0.5 mt-1">
                                    {[1,2,3,4,5].map((st) => (
                                      <Star key={st} size={10} fill={st <= rev.rating ? 'currentColor' : 'none'} className={st <= rev.rating ? 'text-[var(--gold)]' : 'text-gray-200'} />
                                    ))}
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteReview(rev.id, rev.rating)}
                                  className="p-1 px-2 text-[0.9rem] text-[var(--red)] bg-red-50 hover:bg-[var(--red)] hover:text-white rounded-lg border border-red-100 transition-all flex items-center gap-1 font-bold cursor-pointer">
                                  <Trash2 size={10} /> Hapus
                                </button>
                              </div>
                              <p className="text-[1.2rem] text-[var(--text-black)] bg-[var(--canvas-warm)] p-3 rounded-[var(--radius-card)] mt-1.5">{rev.comment}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
