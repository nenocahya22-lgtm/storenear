/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, Image, Copy, X } from 'lucide-react';
import { uploadPaymentProofCustomer, getPaymentProofStatus, removePaymentProofCustomer } from '../lib/payment-proof';

interface PaymentProofUploadProps {
  orderId: string;
  onProofSubmitted?: (url: string) => void;
  rekeningBank?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
}

export const PaymentProofUpload: React.FC<PaymentProofUploadProps> = ({
  orderId,
  onProofSubmitted,
  rekeningBank,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingProofUrl, setExistingProofUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  React.useEffect(() => {
    getPaymentProofStatus(orderId).then((status) => {
      if (status.hasProof && status.paymentProofUrl) {
        setExistingProofUrl(status.paymentProofUrl);
        if (status.isApproved) {
          setMessage({ text: '✅ Bukti sudah diverifikasi!', type: 'success' });
          setUploadState('success');
        } else {
          setMessage({ text: '⏳ Bukti sudah diupload, menunggu verifikasi admin.', type: 'info' });
        }
      }
    });
  }, [orderId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: '✅ No. rekening disalin!', type: 'success' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setExistingProofUrl(null);
    if (!file.type.startsWith('image/')) {
      setMessage({ text: 'Hanya file gambar yang diperbolehkan (JPG/PNG)', type: 'error' });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadState('uploading');
    try {
      const result = await uploadPaymentProofCustomer(orderId, file);
      if (result.success && result.downloadUrl) {
        setUploadState('success');
        setPreviewUrl(result.downloadUrl);
        setMessage({ text: '✅ Bukti berhasil diupload! Kami akan verifikasi dalam 1×24 jam.', type: 'success' });
        onProofSubmitted?.(result.downloadUrl);
      } else {
        setUploadState('error');
        setMessage({ text: result.message, type: 'error' });
        setPreviewUrl(null);
      }
    } catch (err: any) {
      setUploadState('error');
      setMessage({ text: 'Gagal upload: ' + (err.message || 'Coba lagi'), type: 'error' });
      setPreviewUrl(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleRemove = async () => {
    const result = await removePaymentProofCustomer(orderId);
    if (result.success) {
      setUploadState('idle');
      setPreviewUrl(null);
      setExistingProofUrl(null);
      setMessage({ text: 'Bukti dihapus. Silakan upload ulang.', type: 'info' });
    }
  };

  return (
    <div className="bg-[var(--canvas-warm)] p-6 mb-8 text-left rounded-[var(--radius-card)]">
      <h4 className="text-[1rem] tracking-[var(--tracking-looser)] font-bold text-[var(--text-black-soft)] mb-4 border-b border-gray-200/30 pb-2 uppercase flex items-center gap-2">
        <Upload size={14} /> Upload Bukti Transfer
      </h4>

      {rekeningBank && uploadState !== 'success' && (
        <div className="bg-white p-3 rounded-[var(--radius-card)] border border-gray-100 mb-4 space-y-2">
          <p className="text-[0.9rem] text-[var(--text-black-soft)]">Transfer ke:</p>
          {rekeningBank.bankName && (
            <div className="flex justify-between items-center">
              <span className="text-[1rem] text-[var(--text-black-soft)]">Bank</span>
              <strong>{rekeningBank.bankName}</strong>
            </div>
          )}
          {rekeningBank.accountNumber && (
            <div className="flex justify-between items-center">
              <span className="text-[1rem] text-[var(--text-black-soft)]">No. Rekening</span>
              <div className="flex items-center gap-2">
                <strong className="tracking-wider">{rekeningBank.accountNumber}</strong>
                <button onClick={() => copyToClipboard(rekeningBank.accountNumber || '')} className="btn btn-sm btn-outline-dark flex items-center gap-1 p-1.5 rounded">
                  <Copy size={12} />
                </button>
              </div>
            </div>
          )}
          {rekeningBank.accountName && (
            <div className="flex justify-between items-center">
              <span className="text-[1rem] text-[var(--text-black-soft)]">Atas Nama</span>
              <strong>{rekeningBank.accountName}</strong>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-[var(--radius-card)] mb-4 text-[0.95rem] flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' :
          message.type === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {existingProofUrl && uploadState !== 'success' && (
        <div className="mb-4">
          <p className="text-[0.9rem] text-[var(--text-black-soft)] mb-2">Bukti sebelumnya:</p>
          <div className="relative inline-block">
            <img src={existingProofUrl} alt="Bukti sebelumnya" className="w-32 h-32 object-cover rounded-[var(--radius-card)] border border-gray-200" />
            <button onClick={handleRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
              <X size={12} />
            </button>
          </div>
          <p className="text-[0.85rem] text-[var(--text-black-soft)] mt-2">Upload ulang jika bukti kurang jelas.</p>
        </div>
      )}

      {(uploadState === 'idle' || uploadState === 'error') && !existingProofUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-[var(--radius-card)] p-6 text-center cursor-pointer hover:border-[var(--brand-green)] hover:bg-white/50 transition-all"
        >
          <Image size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-[1rem] font-medium text-[var(--text-black-soft)]">Klik untuk pilih foto bukti transfer</p>
          <p className="text-[0.85rem] text-gray-400 mt-1">JPG/PNG — Otomatis dikompres</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="text-center py-4">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-[var(--brand-green)]/20 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[var(--brand-green)] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[1rem] text-[var(--text-black-soft)]">Mengompres & mengupload...</p>
          </div>
        </div>
      )}

      {uploadState === 'success' && previewUrl && (
        <div>
          <div className="relative inline-block mb-3">
            <img src={previewUrl} alt="Bukti transfer" className="w-40 h-40 object-cover rounded-[var(--radius-card)] border-2 border-green-300 shadow-sm" />
            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-md">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <button onClick={handleRemove} className="text-[0.85rem] text-red-500 hover:text-red-700 transition-colors">
            Upload ulang
          </button>
        </div>
      )}

      <p className="text-[0.8rem] text-gray-400 mt-3">
        File akan dikompres otomatis. Max 5MB.
      </p>
    </div>
  );
};
