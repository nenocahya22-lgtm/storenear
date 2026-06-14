/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrderStatus } from './types';

/**
 * Formats a number to Indonesian Rupiah currency format.
 * Example: 150000 -> Rp 150.000
 */
export const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Returns Tailwind CSS classes for order status badges.
 */
/**
 * Placeholder SVG image untuk produk tanpa gambar.
 * Menampilkan icon croissant sederhana dengan warna brand.
 */
export const PLACEHOLDER_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#f2f0eb"/>
    <circle cx="200" cy="180" r="60" fill="#d4e9e2"/>
    <path d="M160 240 Q200 280 240 240" stroke="#d4e9e2" stroke-width="4" fill="none"/>
    <text x="200" y="310" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" fill="#006241" font-weight="600">Near Bakery &amp; Co.</text>
  </svg>`
);

export const getStatusBadgeStyle = (status: OrderStatus): string => {
  switch (status) {
    case 'Menunggu Pembayaran':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Diproses':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Dikirim':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Selesai':
      return 'bg-green-150 text-green-800 border-green-250';
    case 'Dibatalkan':
      return 'bg-red-100 text-red-800 border-red-250';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
