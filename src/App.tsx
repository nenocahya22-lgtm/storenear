/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { CategorySlider } from './components/CategorySlider';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { Cart } from './components/Cart';
import { Checkout } from './components/Checkout';
import { OrderTracking } from './components/OrderTracking';
import { LiveChat } from './components/LiveChat';
import { LoginModal } from './components/LoginModal';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Product } from './types';
import { 
  Home as HomeIcon, 
  ShoppingCart, 
  ClipboardCheck, 
  MessageCircle, 
  ShoppingBag, 
  HelpCircle, 
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Star,
  Croissant,
  Info,
  Shield
} from 'lucide-react';

function AppContent() {
  const {
    currentView,
    setView,
    userRole,
    setUserRole,
    searchQuery,
    activeCategory,
    currentUser,
    loginWithGoogle,
    toast,
    triggerToast,
    setLoginModalOpen,
    webstoreConfig
  } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Listen to Products database in real-time to render home catalog grid
  useEffect(() => {
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCol, (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          price: data.price,
          stock: data.stock,
          imageUrl: data.imageUrl,
          category: data.category,
          rating: data.rating,
          reviewCount: data.reviewCount,
          discountPercent: data.discountPercent,
          originalPrice: data.originalPrice,
          createdAt: data.createdAt
        });
      });
      setProducts(list);
      setDbLoading(false);
    }, (error) => {
      console.error('Error fetching homes products:', error);
      setDbLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, []);

  // Soft-filtering logic for Home view
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory ? p.category === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen font-primary text-[var(--text-black)] flex flex-col justify-between" style={{backgroundColor: 'var(--canvas-warm)'}}>
      {/* Top Banner, Utilities of the Nav */}
      <Navbar />

      {/* Primary app viewport container */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-1">
        
        {/* BUYER PORTAL VIEWS */}
          <div className="animate-fade-in duration-300">
            {currentView === 'home' && (
              <>
                {/* Visual Category picker header */}
                <CategorySlider />
                
                <div className="px-4 md:px-6 py-8 font-sans">
                  {/* Starbucks-Inspired Hero Banner — Warm Cream Canvas */}
                  <div className="feature-band rounded-[var(--radius-card)] p-8 md:p-12 mb-8 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 shadow-sm" style={{backgroundColor: webstoreConfig?.heroBgColor || 'var(--house-green)'}}>
                    {/* Subtle pattern overlay */}
                    <div className="absolute right-0 top-0 bottom-0 w-48 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.04] pointer-events-none" />
                    
                    <div className="max-w-2xl relative z-10 space-y-4 text-left">
                      <div className="flex items-center gap-2">
                        <Star size={12} className="text-[var(--gold)]" fill="var(--gold)" />
                        <span className="text-[var(--gold)] font-semibold text-[1.2rem] tracking-[var(--tracking-looser)] uppercase">{webstoreConfig?.heroTagline || 'Artisan Bakery Premium'}</span>
                      </div>
                      <h1 className="text-[2.8rem] md:text-[3.6rem] font-bold leading-tight text-white tracking-[var(--tracking-tight)]">
                        {webstoreConfig?.heroTitle || 'Roti & Pastry Hangat, Dipanggang Segar Setiap Hari'}
                      </h1>
                      <p className="text-[1.6rem] md:text-[1.9rem] text-white/70 leading-relaxed max-w-lg font-normal" style={{color: 'rgba(255,255,255,0.70)'}}>
                        {webstoreConfig?.heroDescription || 'Nikmati keaslian cita rasa Sourdough alami, croissant mentega renyah, dan aneka kue premium yang dibuat dengan sepenuh hati oleh baker berpengalaman.'}
                      </p>
                      
                      {!currentUser ? (
                        <div className="pt-3">
                          <button
                            onClick={() => setLoginModalOpen(true)}
                            className="btn btn-white text-[1.4rem] px-6 py-3"
                          >
                            <span>{webstoreConfig?.heroBtnText || 'Daftar & Pesan Sekarang'}</span>
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-4 items-center pt-2">
                          <span className="text-[1.1rem] tracking-[var(--tracking-looser)] uppercase bg-white/15 text-white border border-white/30 px-3 py-1.5 rounded-full font-semibold">Dapur Aktif</span>
                          <span className="text-[1.3rem] text-white/70 italic font-serif">Segar dari Oven</span>
                        </div>
                      )}
                    </div>

                    {/* Right art: Premium Badge — Rounded Rectangle Premium */}
                    <div 
                      className="hidden lg:flex flex-col items-center justify-center px-6 py-5 rounded-xl text-center relative shrink-0 shadow-lg backdrop-blur-sm min-w-[140px]"
                      style={{
                        backgroundColor: webstoreConfig?.badgeCircleBgColor || 'rgba(255,255,255,0.10)',
                        border: `${webstoreConfig?.badgeCircleBorderWidth ?? 2}px solid ${webstoreConfig?.badgeCircleBorderColor || 'rgba(203,162,88,0.5)'}`,
                      }}
                    >
                      {/* Icon bintang premium */}
                      <span className="text-[var(--gold)] text-[1.2rem] mb-1">★</span>
                      <div className="flex flex-col items-center justify-center space-y-0.5">
                        <span 
                          className="text-[0.85rem] tracking-[var(--tracking-looser)] uppercase font-bold"
                          style={{color: webstoreConfig?.badgeCircleTextColor || 'var(--gold)'}}
                        >
                          {webstoreConfig?.heroBadgeText1 || '100% ALAMI'}
                        </span>
                        <span className="font-serif italic text-[1.4rem] text-white my-0.5 leading-tight">
                          {webstoreConfig?.heroBadgeText2 || 'Ragi Alami'}
                        </span>
                        <span className="text-[0.7rem] text-white/60 font-semibold">
                          {webstoreConfig?.heroBadgeText3 || 'TANPA PENGAWET'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Promo Banner Section (dari webstoreConfig) */}
                  {webstoreConfig?.promos && webstoreConfig.promos.filter(p => p.active).length > 0 && (
                    <div className="mb-8 overflow-hidden rounded-[var(--radius-card)]">
                      <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-none">
                        {webstoreConfig.promos.filter(p => p.active).map((promo) => (
                          <div key={promo.id} className="min-w-[280px] md:min-w-[320px] snap-start rounded-[var(--radius-card)] overflow-hidden relative group cursor-pointer bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all">
                            {promo.image ? (
                              <img src={promo.image} alt={promo.title} className="w-full h-28 object-cover" />
                            ) : (
                              <div className="w-full h-28 bg-gradient-to-r from-[var(--brand-green)] to-[var(--house-green)] flex items-center justify-center">
                                <span className="text-3xl">🎉</span>
                              </div>
                            )}
                            <div className="p-3">
                              <h4 className="text-[1.2rem] font-bold text-[var(--text-black)]">{promo.title}</h4>
                              {promo.description && (
                                <p className="text-[1rem] text-[var(--text-black-soft)] mt-0.5 line-clamp-2">{promo.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products Grid list section */}
                  <div className="mb-6 flex items-center justify-between border-b border-stone-100 pb-4">
                    <h3 className="text-[2.4rem] font-semibold text-[var(--text-black)] tracking-[var(--tracking-tight)]">
                      <span>{activeCategory ? `${activeCategory}` : (webstoreConfig?.productGridTitle || 'Pilihan Hari Ini')}</span>
                    </h3>
                    <span className="text-[1.3rem] tracking-[var(--tracking-loose)] text-[var(--text-black-soft)] font-medium uppercase">{filteredProducts.length} Sajian</span>
                  </div>

                  {dbLoading ? (
                    <div className="py-20 text-center flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[var(--brand-green)]"></div>
                      <p className="text-[1.3rem] text-[var(--text-black-soft)] mt-2">Sedang menyinkronkan menu roti...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 card max-w-2xl mx-auto p-8">
                      <Croissant className="mx-auto text-gray-200 mb-3" size={48} />
                      <h4 className="text-h1 font-bold text-[var(--text-black)]">{webstoreConfig?.emptyStateTitle || 'Belum Ada Menu Tersedia'}</h4>
                      <p className="text-[1.3rem] text-[var(--text-black-soft)] mt-1.5 max-w-sm mx-auto leading-relaxed">
                        <span>Artisan Baker kami sedang menyiapkan hidangan segar berkualitas terbaik. Pantau terus halaman kami untuk pembaruan menu!</span>
                      </p>

                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 md:gap-6">
                      {filteredProducts.map((prod) => (
                        <ProductCard key={prod.id} product={prod} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {currentView === 'product-detail' && <ProductDetail />}
            {currentView === 'cart' && <Cart />}
            {currentView === 'checkout' && <Checkout />}
            {currentView === 'orders' && <OrderTracking />}
            {currentView === 'about' && <AboutPage />}
            {currentView === 'privacy' && <PrivacyPage />}
          </div>
      </main>

      {/* Floating customer-side LiveChat Bubble */}
      <LiveChat />

      {/* Bottom responsive layout navigation bar for mobile hp screens */}
      <footer className="md:hidden sticky bottom-0 z-30 w-full bg-white border-t border-gray-150 shadow-2xl py-1 px-4 flex justify-around items-center">
        <button
          onClick={() => {
            setUserRole('pembeli');
            setView('home');
          }}
          className={`flex flex-col items-center gap-0.5 p-1.5 focus:outline-hidden ${
            currentView === 'home' && userRole === 'pembeli' ? 'text-amber-800 font-extrabold' : 'text-gray-400'
          }`}
        >
          <HomeIcon size={19} />
          <span className="text-[9px] tracking-tight">Beranda</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) {
              triggerToast('Kunci', 'Masuk akun dahulu untuk melacak pesanan.');
              return;
            }
            setView('orders');
          }}
          className={`flex flex-col items-center gap-0.5 p-1.5 focus:outline-hidden ${
            currentView === 'orders' ? 'text-amber-800 font-extrabold' : 'text-gray-400'
          }`}
        >
          <ClipboardCheck size={19} />
          <span className="text-[9px] tracking-tight">Pesanan saya</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) {
              triggerToast('Akses Kunci', 'Masuk akun dahulu untuk berkirim pesan dengan Penjual.');
              return;
            }
            // Trigger clicking the floating chat box trigger
            const chatBall = document.getElementById('chat-floating-balloon');
            if (chatBall) {
              chatBall.click();
            } else {
              const bttn = document.getElementById('chat-tab-trigger');
              if (bttn) bttn.click();
            }
          }}
          className="flex flex-col items-center gap-0.5 p-1.5 text-gray-400 focus:outline-hidden"
        >
          <MessageCircle size={19} />
          <span className="text-[9px] tracking-tight font-medium">Chat</span>
        </button>


      </footer>

      {/* Global Login Modal Auth portal */}
      <LoginModal />

      {/* Global Toast Notifier wrapper */}                  {toast && toast.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--house-green)] border border-[var(--green-uplift)] text-white shadow-2xl rounded-[var(--radius-card)] px-5 py-3.5 flex items-center justify-between gap-5 max-w-sm w-[90%] md:w-auto animate-fade-in">
          <div>
            <strong className="text-[#cba258] uppercase tracking-[var(--tracking-looser)] text-[0.9rem] block font-bold mb-0.5">Near Bakery & Co.</strong>
            <p className="font-bold text-[1.3rem]">{toast.title}</p>
            <p className="text-[1.1rem] text-white/70 mt-0.5 leading-tight">{toast.message}</p>
          </div>
          <button 
            onClick={() => triggerToast('', '')} 
            className="btn btn-sm btn-outline-light text-[1.1rem]"
          >
            OK
          </button>
        </div>
      )}

      {/* Starbucks-Inspired Footer — Dark Green Bookend */}
      <div className="feature-band py-6 text-center">
        <div className="container-near">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Croissant size={16} className="text-[#cba258]" />                      <span className="font-bold text-[1.4rem] text-white tracking-[var(--tracking-tight)]">{webstoreConfig?.navbarBrandText || 'NEAR BAKERY &amp; CO.'}</span>
            </div>
            <p className="text-[1.2rem]" style={{color: 'rgba(255,255,255,0.70)'}}>
              {webstoreConfig?.footerCopyright || '© 2026 Near Bakery & Co. — Artisan Bakery Premium'}
            </p>
            <div className="flex items-center gap-4 text-[1.1rem]" style={{color: 'rgba(255,255,255,0.70)'}}>
              <button onClick={() => setView('about')} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none font-inherit">Tentang</button>
              <button onClick={() => setView('privacy')} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none font-inherit">Kebijakan</button>
              {(webstoreConfig?.footerLinks || ['Menu', 'Rewards', 'Gift Cards']).map((link, i) => (
                <span key={i}>{link}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  const { setView } = useStore();
  return (
    <div className="container-near py-12 animate-fade-in">
      <button onClick={() => setView('home')} className="flex items-center gap-2 text-[1.3rem] font-semibold text-[var(--green-accent)] hover:text-[var(--brand-green)] transition-colors mb-8 cursor-pointer">
        <ArrowRight size={14} className="rotate-180" />
        <span>Kembali</span>
      </button>
      <div className="card max-w-3xl mx-auto p-8 md:p-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-green)] flex items-center justify-center text-white">
            <Info size={24} />
          </div>
          <h1 className="text-h1 text-[var(--text-black)]">Tentang Near Bakery & Co.</h1>
        </div>
        <div className="space-y-4 text-[1.3rem] text-[var(--text-black-soft)] leading-relaxed">
          <p>
            <strong className="text-[var(--text-black)]">Near Bakery & Co.</strong> adalah toko roti artisan premium yang 
            menyajikan roti sourdough alami, croissant mentega renyah, dan aneka kue berkualitas tinggi. 
            Setiap produk dibuat dengan bahan-bahan pilihan tanpa pengawet dan dipanggang segar setiap hari.
          </p>
          <p>
            Berdiri dengan filosofi <em className="text-[var(--brand-green)]">"Quality First, Service Always"</em>, 
            kami berkomitmen untuk memberikan pengalaman bersantap terbaik bagi setiap pelanggan. 
            Dari dapur artisan kami hingga ke meja Anda — setiap gigitan adalah cerita cinta pada roti.
          </p>
          <div className="bg-[var(--canvas-warm)] rounded-[var(--radius-card)] p-5 mt-4">
            <h3 className="font-bold text-[var(--text-black)] mb-2">📍 Lokasi</h3>
            <p>Dapur Pusat — Sektor 12, DKI Jakarta</p>
            <p className="mt-3"><strong>Jam Operasional:</strong> Senin — Sabtu, 07.00 – 19.00 WIB</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyPage() {
  const { setView } = useStore();
  return (
    <div className="container-near py-12 animate-fade-in">
      <button onClick={() => setView('home')} className="flex items-center gap-2 text-[1.3rem] font-semibold text-[var(--green-accent)] hover:text-[var(--brand-green)] transition-colors mb-8 cursor-pointer">
        <ArrowRight size={14} className="rotate-180" />
        <span>Kembali</span>
      </button>
      <div className="card max-w-3xl mx-auto p-8 md:p-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--house-green)] flex items-center justify-center text-white">
            <Shield size={24} />
          </div>
          <h1 className="text-h1 text-[var(--text-black)]">Kebijakan Privasi</h1>
        </div>
        <div className="space-y-4 text-[1.3rem] text-[var(--text-black-soft)] leading-relaxed">
          <p>
            <strong className="text-[var(--text-black)]">Near Bakery & Co.</strong> menghormati privasi Anda. 
            Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda.
          </p>
          <h3 className="font-bold text-[var(--text-black)] mt-4">📋 Data yang Kami Kumpulkan</h3>
          <p>Kami hanya mengumpulkan data yang Anda berikan secara sukarela: nama, alamat email, nomor telepon, dan alamat pengiriman untuk memproses pesanan Anda.</p>
          <h3 className="font-bold text-[var(--text-black)] mt-4">🔒 Keamanan Data</h3>
          <p>Semua data transaksi disimpan di Firebase dengan enkripsi standar industri. Kami tidak membagikan data pribadi Anda kepada pihak ketiga tanpa izin Anda.</p>
          <h3 className="font-bold text-[var(--text-black)] mt-4">🍪 Cookie</h3>
          <p>Kami menggunakan cookie untuk pengalaman berbelanja yang lebih baik — termasuk menyimpan keranjang belanja dan preferensi Anda.</p>
          <p className="mt-6 text-[1.1rem]">Pertanyaan tentang privasi? Hubungi kami di <strong className="text-[var(--brand-green)]">hello@nearbakery.com</strong></p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
