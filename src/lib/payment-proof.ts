/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface UploadResult {
  success: boolean;
  downloadUrl?: string;
  message: string;
}

/**
 * Memuat file gambar ke Image element.
 */
function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal memuat gambar')); };
    img.src = url;
  });
}

/**
 * Konversi Canvas ke Blob via Promise.
 */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Kompres gambar via Canvas API.
 * - Resize proporsional ke max 1600px (sisi terpanjang)
 * - Turunkan quality JPEG bertahap sampai < targetSize
 * - Fallback: resize ke 800px jika masih terlalu besar
 */
async function compressImage(
  file: File,
  targetSize: number = 600 * 1024,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10);

  const img = await createImageFromFile(file);
  onProgress?.(25);

  let { width, height } = img;

  // Resize proporsional — max 1600px di sisi terpanjang
  const MAX_DIM = 1600;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  onProgress?.(40);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  onProgress?.(50);

  // Kompresi bertahap: turunkan quality sampai < targetSize
  let quality = 0.8;
  let blob: Blob | null = null;

  while (quality >= 0.2) {
    blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size <= targetSize) break;
    quality = Math.round((quality - 0.15) * 10) / 10;
  }

  // Fallback: resize ke 800px jika masih > targetSize di quality minimum
  if (blob && blob.size > targetSize && (width > 800 || height > 800)) {
    const scale = Math.min(800 / width, 800 / height, 0.7);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    quality = 0.5;
    while (quality >= 0.3) {
      blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= targetSize) break;
      quality -= 0.1;
    }
  }

  onProgress?.(85);

  // Jika masih > targetSize, resize ke 400px
  if (blob && blob.size > targetSize && (width > 400 || height > 400)) {
    const scale = Math.min(400 / width, 400 / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    blob = await canvasToBlob(canvas, 0.4);
  }

  onProgress?.(100);

  if (!blob) throw new Error('Gagal mengkompres gambar');
  return blob;
}

/**
 * Upload bukti transfer oleh customer untuk order tertentu.
 * File dikompres via Canvas API, dikonversi ke base64, disimpan di Firestore.
 *
 * @param orderId - ID order dari Firestore
 * @param file - File gambar
 * @param onProgress - Callback progress (0-100)
 * @returns UploadResult
 */
export async function uploadPaymentProofCustomer(
  orderId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      return { success: false, message: 'Hanya file gambar yang diperbolehkan (JPG/PNG)' };
    }

    // Kompres gambar
    const compressedBlob = await compressImage(file, 600 * 1024, onProgress);

    // Konversi ke base64
    const reader = new FileReader();
    const base64DataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(compressedBlob);
    });

    // Validasi ukuran base64 (Firestore limit 1MB per doc)
    if (base64DataUrl.length > 900 * 1024) {
      return { success: false, message: 'Gambar terlalu besar setelah dikompres. Coba gunakan gambar dengan resolusi lebih rendah.' };
    }

    // Simpan ke Firestore
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, {
      paymentProofUrl: base64DataUrl,
      proofNeedsReview: true,
      proofUploadedAt: new Date().toISOString(),
    }, { merge: true });

    return { success: true, downloadUrl: base64DataUrl, message: 'Bukti berhasil diupload!' };
  } catch (err: any) {
    console.error('Upload payment proof error:', err);
    if (err.code === 'permission-denied') {
      return { success: false, message: 'Akses ditolak. Silakan coba lagi atau hubungi admin.' };
    }
    return { success: false, message: err.message || 'Gagal upload bukti transfer. Coba lagi.' };
  }
}

/**
 * Cek status bukti transfer untuk order tertentu.
 */
export async function getPaymentProofStatus(orderId: string): Promise<{
  hasProof: boolean;
  isApproved: boolean;
  paymentProofUrl?: string;
}> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) return { hasProof: false, isApproved: false };

    const data = snap.data();
    const hasProof = !!data.paymentProofUrl;
    const isApproved = data.paymentStatus === 'Lunas';

    return { hasProof, isApproved, paymentProofUrl: data.paymentProofUrl };
  } catch {
    return { hasProof: false, isApproved: false };
  }
}

/**
 * Hapus bukti transfer (jika ingin upload ulang).
 */
export async function removePaymentProofCustomer(orderId: string): Promise<UploadResult> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, {
      paymentProofUrl: '',
      proofNeedsReview: false,
      proofUploadedAt: '',
    }, { merge: true });

    return { success: true, message: 'Bukti berhasil dihapus.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menghapus bukti.' };
  }
}
