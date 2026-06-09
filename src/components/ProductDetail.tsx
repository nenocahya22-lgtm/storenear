/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, MessageSquare, Star, Plus, Minus, Send, User, Edit2, Trash2, X, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product, Review } from '../types';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc,
  doc, 
  serverTimestamp, 
  query, 
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatRupiah } from '../utils';

export const ProductDetail: React.FC = () => {
  const { 
    selectedProductId, 
    setView, 
    addToCart, 
    currentUser, 
    triggerToast 
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingOldRating, setEditingOldRating] = useState<number>(5);

  useEffect(() => {
    if (!selectedProductId) return;
    setIsLoading(true);
    const productRef = doc(db, 'products', selectedProductId);

    const unsubscribeProduct = onSnapshot(productRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProduct({
          id: snapshot.id,
          name: data.name,
          description: data.description,
          price: data.price,
          stock: data.stock,
          imageUrl: data.imageUrl,
          category: data.category,
          rating: data.rating,
          reviewCount: data.reviewCount,
          createdAt: data.createdAt
        });
      } else {
        triggerToast('Produk Tidak Ditemukan', 'Maaf, produk tidak lagi tersedia.');
        setView('home');
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `products/${selectedProductId}`);
    });

    const reviewsPath = `products/${selectedProductId}/reviews`;
    const reviewsQuery = query(collection(db, reviewsPath), orderBy('createdAt', 'desc'));

    const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
      const list: Review[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          productId: selectedProductId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt
        });
      });
      setReviews(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, reviewsPath);
    });

    return () => { unsubscribeProduct(); unsubscribeReviews(); };
  }, [selectedProductId]);

  if (isLoading || !product) {
    return (
      <div className="container-near py-20 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[var(--brand-green)]"></div>
        <p className="text-[var(--text-black-soft)] mt-4 font-semibold text-[1.4rem]">Memuat produk...</p>
      </div>
    );
  }

  const handleQtyIncrease = () => { if (quantity < product.stock) setQuantity(quantity + 1); };
  const handleQtyDecrease = () => { if (quantity > 1) setQuantity(quantity - 1); };

  const handleStartChat = async () => {
    if (!currentUser) {
      triggerToast('Akses Terbatas', 'Silakan masuk akun terlebih dahulu.');
      return;
    }
    const chatId = `${currentUser.uid}_admin`;
    const chatDocRef = doc(db, 'chats', chatId);
    try {
      await setDoc(chatDocRef, {
        id: chatId,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Pembeli',
        buyerEmail: currentUser.email || 'buyer@example.com',
        lastMessage: `Menanyakan tentang produk: ${product.name}`,
        lastMessageTime: serverTimestamp(),
        unreadBySeller: true,
        unreadByBuyer: false
      }, { merge: true });
      const messagesCol = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesCol, {
        senderId: currentUser.uid,
        senderRole: 'buyer',
        message: `Halo, saya tertarik dengan produk ini: "${product.name}". Apakah stok nya masih ada?`,
        createdAt: serverTimestamp()
      });
      triggerToast('Chat Terbuka', 'Terhubung langsung dengan Penjual.');
      setView('home');
      setTimeout(() => { document.getElementById('chat-floating-balloon')?.click(); }, 200);
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}`); }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { triggerToast('Gagal Mengulas', 'Silakan masuk akun terlebih dahulu.'); return; }
    if (!newComment.trim()) { triggerToast('Komentar Kosong', 'Silakan ketik komentar Anda.'); return; }
    setIsSubmittingReview(true);
    const productDocRef = doc(db, 'products', product.id);
    try {
      if (editingReviewId) {
        await runTransaction(db, async (transaction) => {
          const prodSnapshot = await transaction.get(productDocRef);
          if (!prodSnapshot.exists()) throw new Error('Produk tidak ditemukan!');
          const prodData = prodSnapshot.data();
          const currentCount = prodData.reviewCount || 0;
          const currentRating = prodData.rating || 5.0;
          const newRatingAverage = currentCount > 0 ? ((currentRating * currentCount) - editingOldRating + newRating) / currentCount : newRating;
          const reviewRef = doc(db, 'products', product.id, 'reviews', editingReviewId);
          transaction.update(reviewRef, { rating: newRating, comment: newComment.trim(), updatedAt: serverTimestamp() });
          transaction.update(productDocRef, { rating: Number(newRatingAverage.toFixed(1)) });
        });
        triggerToast('Ulasan Diperbarui', 'Ulasan Anda berhasil diperbarui!');
        setEditingReviewId(null);
      } else {
        await runTransaction(db, async (transaction) => {
          const prodSnapshot = await transaction.get(productDocRef);
          if (!prodSnapshot.exists()) throw new Error('Produk tidak ditemukan!');
          const prodData = prodSnapshot.data();
          const currentCount = prodData.reviewCount || 0;
          const currentRating = prodData.rating || 5.0;
          const newCount = currentCount + 1;
          const newRatingAverage = ((currentRating * currentCount) + newRating) / newCount;
          const newReviewRef = doc(collection(db, 'products', product.id, 'reviews'));
          transaction.set(newReviewRef, {
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Pembeli',
            rating: newRating,
            comment: newComment.trim(),
            createdAt: serverTimestamp()
          });
          transaction.update(productDocRef, { reviewCount: newCount, rating: Number(newRatingAverage.toFixed(1)) });
        });
        triggerToast('Ulasan Dikirim', 'Terima kasih atas ulasan Anda!');
      }
      setNewComment(''); setNewRating(5);
    } catch (error) {
      console.error(error);
      triggerToast('Error', 'Gagal mengirim ulasan.');
    } finally { setIsSubmittingReview(false); }
  };

  const handleDeleteReview = async (reviewId: string, oldRating: number) => {
    if (!currentUser) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus ulasan ini?')) return;
    try {
      const productDocRef = doc(db, 'products', product.id);
      await runTransaction(db, async (transaction) => {
        const prodSnapshot = await transaction.get(productDocRef);
        if (!prodSnapshot.exists()) throw new Error('Produk tidak ditemukan!');
        const prodData = prodSnapshot.data();
        const currentCount = prodData.reviewCount || 0;
        const currentRating = prodData.rating || 5.0;
        const newCount = Math.max(0, currentCount - 1);
        const newRatingAverage = newCount === 0 ? 5.0 : ((currentRating * currentCount) - oldRating) / newCount;
        const reviewRef = doc(db, 'products', product.id, 'reviews', reviewId);
        transaction.delete(reviewRef);
        transaction.update(productDocRef, { reviewCount: newCount, rating: Number(newRatingAverage.toFixed(1)) });
      });
      if (editingReviewId === reviewId) { setEditingReviewId(null); setNewComment(''); setNewRating(5); }
      triggerToast('Ulasan Dihapus', 'Ulasan berhasil dihapus.');
    } catch (e) { console.error(e); triggerToast('Gagal', 'Gagal menghapus ulasan.'); }
  };

  return (
    <div className="container-near py-8 pb-20">
      {/* Breadcrumb — Starbucks style */}
      <button 
        onClick={() => setView('home')} 
        className="flex items-center gap-2 text-[1.3rem] font-semibold text-[var(--green-accent)] hover:text-[var(--brand-green)] transition-colors mb-6 focus:outline-none cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>Kembali ke Menu</span>
      </button>

      {/* PDP Layout — Starbucks Inspired */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Product Image */}
        <div className="lg:col-span-5">
          <div className="card overflow-hidden bg-[var(--canvas-warm)]">
            <img 
              src={product.imageUrl} 
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full aspect-square object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>
        </div>

        {/* Right: Product Info */}
        <div className="lg:col-span-7">
          {/* Category tag */}
          <span className="inline-block text-[1rem] tracking-[var(--tracking-looser)] font-bold uppercase bg-[var(--green-light)] text-[var(--brand-green)] border border-[var(--green-light)] px-3 py-1 rounded-[var(--button-radius)] mb-4">
            {product.category}
          </span>

          {/* Product Name — Starbucks H1 style */}
          <h1 className="text-h1 text-[var(--brand-green)] mb-3">
            {product.name}
          </h1>

          {/* Rating Bar */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
            <div className="flex text-[var(--gold)] gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} fill={i <= (product.rating || 5.0) ? 'currentColor' : 'none'} className={i <= (product.rating || 5.0) ? 'text-[var(--gold)]' : 'text-gray-200'} />
              ))}
            </div>
            <span className="text-[1.3rem] font-bold text-[var(--text-black)]">{(product.rating || 5.0).toFixed(1)}</span>
            <span className="h-4 w-px bg-gray-200" />
            <span className="text-[1.2rem] text-[var(--text-black-soft)]"><strong>{product.reviewCount || 0}</strong> ulasan</span>
            <span className="h-4 w-px bg-gray-200" />
            <span className={`text-[1rem] font-bold tracking-[var(--tracking-looser)] uppercase ${product.stock > 0 ? 'text-[var(--text-black-soft)]' : 'text-[var(--red)]'}`}>
              {product.stock > 0 ? `Stok ${product.stock}` : 'Habis'}
            </span>
          </div>

          {/* Price Display */}
          <div className="bg-[var(--canvas-warm)] rounded-[var(--radius-card)] p-5 mb-5">
            <span className="text-[1rem] text-[var(--text-black-soft)] tracking-[var(--tracking-looser)] uppercase font-bold block mb-1">Harga</span>
            {product.discountPercent && product.discountPercent > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-[2.8rem] font-bold text-[var(--red)] tracking-[var(--tracking-tight)]">
                  {formatRupiah(product.price * (1 - product.discountPercent / 100))}
                </span>
                <span className="text-[1.6rem] text-gray-400 line-through">
                  {formatRupiah(product.price)}
                </span>
                <span className="px-2.5 py-1 bg-[var(--red)] text-white text-[1rem] font-bold rounded-full">
                  -{product.discountPercent}%
                </span>
              </div>
            ) : (
              <span className="text-[2.8rem] font-bold text-[var(--text-black)] tracking-[var(--tracking-tight)]">
                {formatRupiah(product.price)}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h4 className="text-[1rem] tracking-[var(--tracking-looser)] font-bold text-[var(--text-black-soft)] uppercase mb-2">Deskripsi</h4>
            <p className="text-body text-[var(--text-black)] leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* CTA Section */}
          <div className="pt-5 border-t border-gray-100">
            {product.stock > 0 ? (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Qty Stepper — Starbucks style */}
                <div className="flex items-center border border-gray-200 rounded-[var(--button-radius)] p-1 bg-white">
                  <button onClick={handleQtyDecrease} className="p-2 text-[var(--text-black-soft)] hover:text-[var(--text-black)] rounded-full hover:bg-[var(--canvas-warm)] transition-colors cursor-pointer">
                    <Minus size={12} />
                  </button>
                  <span className="w-10 text-center text-[1.4rem] font-bold text-[var(--text-black)] font-mono">{quantity}</span>
                  <button onClick={handleQtyIncrease} className="p-2 text-[var(--text-black-soft)] hover:text-[var(--text-black)] rounded-full hover:bg-[var(--canvas-warm)] transition-colors cursor-pointer">
                    <Plus size={12} />
                  </button>
                </div>

                <div className="flex w-full gap-3">
                  <button onClick={handleStartChat} className="btn btn-outline text-[1.3rem] flex-1">
                    <MessageSquare size={14} />
                    <span>Tanya Baker</span>
                  </button>
                  <button onClick={() => addToCart(product, quantity)} className="btn btn-primary text-[1.3rem] flex-[2]">
                    <ShoppingCart size={14} />
                    <span>Masukkan Keranjang</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={handleStartChat} className="btn btn-outline flex-1 text-[1.3rem]">
                  <MessageSquare size={14} /> Tanya Baker
                </button>
                <div className="flex-[2] bg-[var(--canvas-warm)] text-[var(--text-black-soft)] border border-gray-200 py-3 rounded-[var(--button-radius)] text-[1.3rem] font-semibold text-center">
                  Stok Habis
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── REVIEWS SECTION ─── */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Review Form */}
        <div className="lg:col-span-4 card p-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
            <h3 className="text-[1.3rem] font-bold text-[var(--text-black)] tracking-[var(--tracking-tight)]">
              {editingReviewId ? 'Edit Ulasan' : 'Beri Ulasan'}
            </h3>
            {editingReviewId && (
              <button onClick={() => { setEditingReviewId(null); setNewComment(''); setNewRating(5); }}
                className="text-[var(--text-black-soft)] hover:text-[var(--red)] text-[1.1rem] font-bold flex items-center gap-1">
                <X size={12} /> Batal
              </button>
            )}
          </div>
          {currentUser ? (
            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="text-[1rem] font-bold text-[var(--text-black-soft)] uppercase tracking-[var(--tracking-looser)] block mb-2">Rating</label>
                <div className="flex text-[var(--gold)] gap-1">
                  {[1,2,3,4,5].map((star) => (
                    <button type="button" key={star} onClick={() => setNewRating(star)}
                      className="hover:scale-110 transition-transform cursor-pointer">
                      <Star size={22} fill={star <= newRating ? 'currentColor' : 'none'} className={star <= newRating ? 'text-[var(--gold)]' : 'text-gray-200'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[1rem] font-bold text-[var(--text-black-soft)] uppercase tracking-[var(--tracking-looser)] block mb-1.5">Komentar</label>
                <textarea
                  placeholder="Ceritakan pengalaman Anda..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="input-field min-h-[95px] resize-none"
                />
              </div>
              <button type="submit" disabled={isSubmittingReview}
                className="btn btn-primary w-full text-[1.4rem]">
                {isSubmittingReview ? 'Mengirim...' : (editingReviewId ? 'Simpan' : 'Kirim Ulasan')}
              </button>
            </form>
          ) : (
            <div className="text-center py-8 bg-[var(--canvas-warm)] rounded-[var(--radius-card)]">
              <User className="mx-auto text-gray-300 mb-2" size={24} />
              <p className="text-[1.3rem] text-[var(--text-black-soft)] italic px-4">Silakan masuk untuk memberi ulasan.</p>
            </div>
          )}
        </div>

        {/* Right: Reviews List */}
        <div className="lg:col-span-8 card p-6">
          <h3 className="text-[1.3rem] font-bold text-[var(--text-black)] mb-4 border-b border-gray-100 pb-3 flex justify-between items-center">
            <span>Ulasan ({reviews.length})</span>
            {reviews.length > 0 && (
              <span className="text-[0.9rem] bg-[var(--brand-green)] text-white font-bold px-2.5 py-1 rounded-[var(--button-radius)] tracking-[var(--tracking-looser)] uppercase">
                Terverifikasi
              </span>
            )}
          </h3>
          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {reviews.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-[var(--radius-card)]">
                <Star className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-[1.3rem] text-[var(--text-black-soft)] italic">Belum ada ulasan. Jadilah yang pertama!</p>
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[1.3rem] font-bold text-[var(--text-black)]">{rev.userName}</span>
                        {currentUser && rev.userId === currentUser.uid && (
                          <span className="text-[0.9rem] bg-[var(--green-light)] text-[var(--brand-green)] font-medium px-1.5 py-0.5 rounded-[var(--button-radius)]">Anda</span>
                        )}
                        <span className="text-[0.9rem] text-[var(--text-black-soft)] font-mono">
                          {rev.createdAt ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru'}
                        </span>
                      </div>
                      <div className="flex text-[var(--gold)] gap-0.5 mt-1">
                        {[1,2,3,4,5].map((st) => (
                          <Star key={st} size={10} fill={st <= rev.rating ? 'currentColor' : 'none'} className={st <= rev.rating ? 'text-[var(--gold)]' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    {currentUser && rev.userId === currentUser.uid && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingReviewId(rev.id); setEditingOldRating(rev.rating); setNewComment(rev.comment); setNewRating(rev.rating); }}
                          className="p-1 text-[var(--text-black-soft)] hover:text-[var(--gold)] rounded transition-colors" title="Edit">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteReview(rev.id, rev.rating)}
                          className="p-1 text-[var(--text-black-soft)] hover:text-[var(--red)] rounded transition-colors" title="Hapus">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[1.3rem] text-[var(--text-black)] leading-relaxed bg-[var(--canvas-warm)] p-3 rounded-[var(--radius-card)] mt-1.5">
                    {rev.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
