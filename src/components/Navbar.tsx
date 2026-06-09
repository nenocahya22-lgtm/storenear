/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingCart, Bell, MessageSquare, LogOut, Search, Store, LogIn, Croissant, User, Menu, X, MapPin } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    userRole,
    setUserRole,
    cart,
    setView,
    currentView,
    searchQuery,
    setSearchQuery,
    notifications,
    unreadNotificationCount,
    markNotificationsAsRead,
    loginWithGoogle,
    logout,
    triggerToast,
    setLoginModalOpen,
    setActiveCategory,
    storeName,
  } = useStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const isAdmin = currentUser?.email === 'nenocahya22@gmail.com' || currentUser?.email === 'seller@webstore.com';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (currentView !== 'home') {
      setView('home');
    }
  };

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      markNotificationsAsRead();
    }
  };

  return (
    <>
      {/* Starbucks-Inspired Global Nav */}
      <header className="sticky top-0 z-40 w-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_2px_2px_rgba(0,0,0,0.06),0_0_2px_rgba(0,0,0,0.07)]">
        <div className="container-near flex items-center justify-between min-h-[64px] md:min-h-[83px] lg:min-h-[99px]">
          
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo + Primary Nav Links */}
          <div className="flex items-center gap-8">
            <button
              id="nav-logo"
              onClick={() => { setView('home'); setSearchQuery(''); }}
              className="flex items-center gap-2 select-none focus:outline-none shrink-0 group"
            >
              <div className="bg-[var(--brand-green)] text-white p-2.5 rounded-full group-hover:bg-[var(--green-accent)] transition-all flex items-center justify-center shadow-sm">
                <Croissant size={20} className="stroke-[2]" />
              </div>
              <div className="text-left">
                <span className="font-bold text-[1.4rem] tracking-[var(--tracking-tight)] text-[var(--text-black)] block leading-tight group-hover:text-[var(--brand-green)] transition-colors">
                  NEAR BAKERY
                </span>
                <span className="text-[0.9rem] text-[var(--text-black-soft)] tracking-[var(--tracking-tight)] font-medium leading-tight block">
                  &amp; CO.
                </span>
              </div>
            </button>

            {/* Desktop Primary Nav Links */}
            <nav className="hidden md:flex items-center gap-6 ml-4">
              <button
                onClick={() => { setView('home'); setActiveCategory(null); }}
                className={`text-[1.4rem] font-semibold tracking-[var(--tracking-tight)] transition-colors ${
                  currentView === 'home' && userRole === 'pembeli' ? 'text-[var(--brand-green)]' : 'text-[var(--text-black)] hover:text-[var(--brand-green)]'
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => {
                  if (!currentUser) { setLoginModalOpen(true); return; }
                  setView('orders');
                }}
                className={`text-[1.4rem] font-semibold tracking-[var(--tracking-tight)] transition-colors ${
                  currentView === 'orders' ? 'text-[var(--brand-green)]' : 'text-[var(--text-black)] hover:text-[var(--brand-green)]'
                }`}
              >
                Pesanan Saya
              </button>
            </nav>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Search (desktop) */}
            <div className="hidden lg:block relative">
              <input
                type="text"
                placeholder="Cari menu artisan..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-[200px] pl-3.5 pr-8 py-2 rounded-full bg-[var(--canvas-warm)] border border-transparent text-[var(--text-black)] placeholder-[var(--text-black-soft)] text-[1.3rem] focus:outline-none focus:border-[var(--green-accent)] focus:bg-white transition-all"
              />
              <Search className="absolute right-3 top-2.5 text-[var(--text-black-soft)]" size={14} />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                id="nav-bell"
                onClick={handleBellClick}
                className="p-2 rounded-full hover:bg-[var(--canvas-warm)] text-[var(--text-black-soft)] hover:text-[var(--text-black)] transition-all relative focus:outline-none"
                title="Notifikasi"
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[var(--red)] text-white text-[8px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-[var(--radius-card)] shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 bg-[var(--canvas-warm)] border-b border-gray-100 flex justify-between items-center">
                    <span className="text-[1.3rem] font-bold text-[var(--text-black)]">Notifikasi</span>
                    <button onClick={() => setShowNotifications(false)} className="text-[var(--text-black-soft)] hover:text-[var(--text-black)] text-[1.2rem] cursor-pointer">Tutup</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[var(--text-black-soft)] text-[1.3rem] italic">
                        Belum ada notifikasi.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 border-b border-gray-100 hover:bg-[var(--canvas-warm)] cursor-pointer transition-colors ${!notif.read ? 'bg-[var(--green-light)]/20 font-medium' : ''}`}
                          onClick={() => { if (notif.orderId) setView('orders'); setShowNotifications(false); }}
                        >
                          <h4 className="font-semibold text-[var(--brand-green)] text-[1.3rem]">{notif.title}</h4>
                          <p className="text-[var(--text-black-soft)] text-[1.2rem] mt-0.5">{notif.body}</p>
                          <span className="text-[0.9rem] text-[var(--text-black-soft)] block mt-1 font-mono">
                            {notif.createdAt ? new Date(notif.createdAt.seconds * 1000).toLocaleString('id-ID') : 'Baru saja'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart */}
            <button
              id="nav-cart"
              onClick={() => setView('cart')}
              className="relative p-2 rounded-full hover:bg-[var(--canvas-warm)] text-[var(--text-black-soft)] hover:text-[var(--text-black)] transition-all focus:outline-none"
            >
              <ShoppingCart size={18} />
              {cartItemsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[var(--green-accent)] text-white text-[8px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 hidden md:block" />

            {/* Find a store / Location */}
            <button className="hidden md:flex items-center gap-1.5 text-[1.3rem] font-semibold text-[var(--text-black)] hover:text-[var(--brand-green)] transition-colors">
              <MapPin size={16} />
              <span>Temukan Toko</span>
            </button>

            {/* Auth buttons (desktop) */}
            {currentUser ? (
              <div className="hidden md:flex items-center gap-2">
                {/* Admin toggle */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (userRole === 'pembeli') { setUserRole('penjual'); setView('seller'); }
                      else { setUserRole('pembeli'); setView('home'); }
                    }}
                    className="btn btn-sm btn-outline text-[1.2rem]"
                  >
                    <Store size={12} />
                    <span>{userRole === 'pembeli' ? 'Admin' : 'Toko'}</span>
                  </button>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--canvas-warm)] rounded-full text-[1.2rem] font-medium text-[var(--text-black)]">
                  <User size={14} />
                  <span className="max-w-[80px] truncate">{currentUser.displayName || currentUser.email?.split('@')[0]}</span>
                </div>
                <button onClick={logout} className="p-2 rounded-full hover:bg-red-50 text-[var(--text-black-soft)] hover:text-[var(--red)] transition-colors" title="Keluar">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setLoginModalOpen(true)} className="btn btn-outline-dark text-[1.4rem]">Sign in</button>
                <button onClick={() => { setLoginModalOpen(true); }} className="btn btn-black text-[1.4rem]">Join now</button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile bottom search */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari menu artisan..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-3.5 pr-8 py-2.5 rounded-full bg-[var(--canvas-warm)] text-[var(--text-black)] placeholder-[var(--text-black-soft)] text-[1.3rem] focus:outline-none focus:border-[var(--green-accent)] focus:bg-white border border-transparent focus:border transition-all"
            />
            <Search className="absolute right-3.5 top-3 text-[var(--text-black-soft)]" size={14} />
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl animate-fade-in p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-[1.6rem] text-[var(--brand-green)]">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-1">
              <MobileNavItem onClick={() => { setView('home'); setMobileMenuOpen(false); }} label="Menu" />
              <MobileNavItem onClick={() => { if (!currentUser) { setLoginModalOpen(true); return; } setView('orders'); setMobileMenuOpen(false); }} label="Pesanan Saya" />
              {isAdmin && (
                <MobileNavItem onClick={() => { setUserRole('penjual'); setView('seller'); setMobileMenuOpen(false); }} label="Dashboard Admin" />
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100">
              {currentUser ? (
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-[var(--red)] font-semibold text-[1.4rem]">
                  <LogOut size={16} /> Keluar
                </button>
              ) : (
                <button onClick={() => { setLoginModalOpen(true); setMobileMenuOpen(false); }} className="btn btn-primary w-full justify-center">Masuk / Daftar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function MobileNavItem({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2.5 text-[1.4rem] font-medium text-[var(--text-black)] hover:bg-[var(--canvas-warm)] rounded-lg transition-colors">
      {label}
    </button>
  );
}

// Helper needed since we use setActiveCategory here

