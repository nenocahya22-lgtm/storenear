/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  discountPercent?: number;
  originalPrice?: number;
  createdAt?: any; // Firestore Timestamp
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface StatusHistoryItem {
  status: OrderStatus;
  updatedAt: any; // Firestore Timestamp
  note: string;
}

export type OrderStatus = 'Menunggu Pembayaran' | 'Diproses' | 'Dikirim' | 'Selesai' | 'Dibatalkan';

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: 'Belum Bayar' | 'Lunas';
  trackingNumber?: string;
  statusHistory: StatusHistoryItem[];
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: any; // Firestore Timestamp
}

export interface ChatRoom {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  lastMessage?: string;
  lastMessageTime?: any; // HTML/Firestore Timestamp
  unreadBySeller?: boolean;
  unreadByBuyer?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'buyer' | 'seller';
  message: string;
  createdAt: any; // Firestore Timestamp
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  orderId?: string;
  createdAt: any; // Firestore Timestamp
}

// ===== Web Store Config Types (synced from ERP Firestore) =====

export interface PaymentMethod {
  id: string;
  type: 'transfer_bank' | 'ewallet' | 'cod';
  name: string;
  label: string;
  active: boolean;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  phoneNumber?: string;
  order: number;
}

export interface WebStoreProduct {
  productName: string;
  active: boolean;
  displayImage: string;
  description: string;
  kategori: string;
  discountPercent?: number; // 0-100, 0 = no discount
}

export interface WebStorePromo {
  id: string;
  title: string;
  description: string;
  image: string;
  active: boolean;
}

export interface WebStoreConfig {
  // Store Identity — Navbar
  storeName: string;
  navbarBrandText: string;
  slogan: string;
  logo: string;
  contactWhatsApp: string;
  contactEmail: string;
  contactInstagram: string;
  alamat: string;
  searchPlaceholder: string;
  storeLocatorText: string;
  
  // Hero Banner
  heroTagline: string;
  heroTitle: string;
  heroDescription: string;
  heroBtnText: string;
  heroBadgeText1: string;
  heroBadgeText2: string;
  heroBadgeText3: string;
  heroBgColor: string;
  
  // Products
  products: WebStoreProduct[];
  productGridTitle: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  
  // Theme Colors — matching Web Store design system
  colorBrandGreen: string;
  colorGreenAccent: string;
  colorHouseGreen: string;
  colorGold: string;
  colorCanvasWarm: string;
  
  // Badge Premium Circle Styling (from ERP)
  badgeCircleBgColor?: string;
  badgeCircleTextColor?: string;
  badgeCircleBorderColor?: string;
  badgeCircleBorderWidth?: number;
  badgeCircleSize?: 'sm' | 'md' | 'lg';

  // Category Circle Styling (from ERP)
  categoryCircleBgColor?: string;
  categoryCircleTextColor?: string;
  categoryCircleBorderColor?: string;
  categoryCircleSize?: 'sm' | 'md' | 'lg';
  categoryCircleGap?: 'tight' | 'normal' | 'loose';

  // Categories (managed from ERP, synced to Web Store)
  categories: string[];
  categoryIcons: Record<string, string>; // category name → icon name
  
  // Promotions
  promos: WebStorePromo[];
  
  // Payment Methods
  paymentMethods: PaymentMethod[];

  // Branch
  cabangId: string;
  branchSubdomain: string;

  // Footer
  footerCopyright: string;
  footerLinks: string[];
  checkoutFooterText: string;
  
  // Timestamp
  lastUpdated: string;
}
