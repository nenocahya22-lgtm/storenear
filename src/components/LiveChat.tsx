/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ChatMessage, ChatRoom } from '../types';
import { Send, X, MessageSquare, Minimize2, ShoppingBag } from 'lucide-react';

export const LiveChat: React.FC = () => {
  const { currentUser, setView, triggerToast } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = currentUser ? `${currentUser.uid}_admin` : null;

  // Listen to product chat triggers
  useEffect(() => {
    const triggerBtn = document.getElementById('chat-tab-trigger');
    if (triggerBtn) {
      const handleTrigger = () => { setIsOpen(true); setIsMinimized(false); };
      triggerBtn.addEventListener('click', handleTrigger);
      return () => triggerBtn.removeEventListener('click', handleTrigger);
    }
  }, []);

  // Listen to messages
  useEffect(() => {
    if (!currentUser || !chatId || !isOpen) return;

    const messagesColPath = `chats/${chatId}/messages`;
    const messagesQuery = query(
      collection(db, messagesColPath),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          senderId: data.senderId,
          senderRole: data.senderRole,
          message: data.message,
          createdAt: data.createdAt
        });
      });
      setMessages(list);
      
      const chatRoomRef = doc(db, 'chats', chatId);
      try { updateDoc(chatRoomRef, { unreadByBuyer: false }); } catch (e) { console.error(e); }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, messagesColPath);
    });

    const chatRoomRef = doc(db, 'chats', chatId);
    const unsubscribeRoom = onSnapshot(chatRoomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveRoom({
          id: docSnap.id,
          buyerId: data.buyerId,
          buyerName: data.buyerName,
          buyerEmail: data.buyerEmail,
          unreadByBuyer: data.unreadByBuyer,
          unreadBySeller: data.unreadBySeller,
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
    });

    return () => { unsubscribeMessages(); unsubscribeRoom(); };
  }, [currentUser, chatId, isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !chatId) {
      triggerToast('Akses Terbatas', 'Harap masuk akun untuk memulai chat.');
      return;
    }
    if (!newMessage.trim()) return;

    const chatRoomRef = doc(db, 'chats', chatId);
    const messagesCol = collection(db, 'chats', chatId, 'messages');

    try {
      const messageText = newMessage.trim();
      setNewMessage('');

      await addDoc(messagesCol, {
        senderId: currentUser.uid,
        senderRole: 'buyer',
        message: messageText,
        createdAt: serverTimestamp()
      });

      await setDoc(chatRoomRef, {
        id: chatId,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Pelanggan',
        buyerEmail: currentUser.email || 'customer@webstore.com',
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        unreadBySeller: true,
        unreadByBuyer: false
      }, { merge: true });

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  if (!currentUser) return null;

  // ─── Starbucks-Inspired Frap Floating Button ───
  if (!isOpen) {
    return (
      <button
        id="chat-floating-balloon"
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="frap-btn"
        title="Chat dengan Baker"
      >
        <ShoppingBag size={22} />
        {activeRoom?.unreadByBuyer && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-[var(--gold)] rounded-full border-2 border-white" />
        )}
      </button>
    );
  }

  return (
    <div 
      className="fixed right-6 z-50 bg-white shadow-xl flex flex-col transition-all duration-300"
      style={{
        borderRadius: 'var(--radius-card)',
        width: '320px',
        maxWidth: '85vw',
        bottom: '2.4rem',
        height: isMinimized ? '56px' : '440px',
        boxShadow: 'var(--frap-shadow-base), var(--frap-shadow-ambient)',
      }}
    >
      {/* Header — Starbucks dark green */}
      <div 
        className="px-4 py-3 text-white flex justify-between items-center cursor-pointer rounded-t-[12px]"
        style={{ backgroundColor: 'var(--house-green)' }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[var(--green-accent)] animate-pulse" />
          <div className="leading-tight">
            <h4 className="text-[1.3rem] font-bold tracking-[var(--tracking-tight)]">Near Bakery Chat</h4>
            <span className="text-[0.9rem] tracking-[var(--tracking-looser)] block mt-0.5" style={{color: 'rgba(255,255,255,0.70)'}}>ARTISAN BAKER</span>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white">
            <Minimize2 size={12} />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--canvas-warm)]">
            {messages.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                <MessageSquare size={24} className="text-gray-300 mb-2.5" />
                <p className="text-[1.2rem] text-[var(--text-black-soft)] italic max-w-[180px] leading-relaxed text-center">
                  Mulai obrolan dengan baker kami...
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderRole === 'buyer';
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`max-w-[85%] px-3 py-2 text-[1.2rem] leading-relaxed ${
                        isMe 
                          ? 'text-white rounded-tl-[12px] rounded-tr-[12px] rounded-bl-[12px]' 
                          : 'bg-white border border-gray-200 text-[var(--text-black)] rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px]'
                      }`}
                      style={isMe ? { backgroundColor: 'var(--brand-green)' } : {}}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[0.8rem] text-[var(--text-black-soft)] font-mono mt-0.5 px-0.5">
                      {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}) : 'Baru saja'}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 flex gap-2 bg-white rounded-b-[12px]">
            <input
              type="text"
              placeholder="Tulis pesan..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 text-[1.3rem] px-3 py-2 border border-gray-200 rounded-[4px] bg-[var(--canvas-warm)] focus:bg-white text-[var(--text-black)] focus:outline-none focus:border-[var(--green-accent)]"
            />
            <button
              type="submit"
              className="p-2.5 flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--green-accent)', borderRadius: 'var(--button-radius)', color: 'white' }}
            >
              <Send size={14} />
            </button>
          </form>
        </>
      )}

      <button id="chat-tab-trigger" className="hidden">Open Chat</button>
    </div>
  );
};
