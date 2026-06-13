/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useStore } from '../context/StoreContext';
import { Wheat, Croissant, Cake, Cookie, Coffee, Package, Sparkles } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  wheat: <Wheat size={14} />,
  croissant: <Croissant size={14} />,
  cake: <Cake size={14} />,
  cookie: <Cookie size={14} />,
  coffee: <Coffee size={14} />,
  package: <Package size={14} />,
};

export const CategorySlider: React.FC = () => {
  const { activeCategory, setActiveCategory, categories, categoryIcons } = useStore();

  const getIcon = (cat: string) => {
    const iconName = categoryIcons[cat];
    return iconName ? ICON_MAP[iconName] : null;
  };

  return (
    <div className="w-full bg-[var(--canvas-ceramic)] border-b border-gray-200/50 py-6">
      <div className="container-near">
        {/* Starbucks-style section label */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-[var(--gold)]" />
          <span className="text-[1.1rem] tracking-[var(--tracking-looser)] font-semibold text-[var(--text-black-soft)] uppercase">
            Pilih Kategori
          </span>
        </div>
        
        {/* Pill-style category buttons */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
          <button
            key="all-categories"
            onClick={() => setActiveCategory(null)}
            className={`px-5 py-2.5 rounded-[var(--button-radius)] text-[1.3rem] font-semibold tracking-[var(--tracking-tight)] transition-all duration-200 cursor-pointer snap-start whitespace-nowrap flex items-center gap-1.5 border ${
              activeCategory === null
                ? 'bg-[var(--brand-green)] text-white border-[var(--brand-green)] shadow-sm'
                : 'bg-white text-[var(--text-black)] border-gray-200 hover:bg-[var(--canvas-warm)] hover:text-[var(--brand-green)]'
            }`}
          >
            <span>Semua</span>
          </button>

          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            const icon = getIcon(cat);
            
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-[var(--button-radius)] text-[1.3rem] font-semibold tracking-[var(--tracking-tight)] transition-all duration-200 cursor-pointer snap-start whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[var(--brand-green)] text-white border-[var(--brand-green)] shadow-sm'
                    : 'bg-white text-[var(--text-black)] border-gray-200 hover:bg-[var(--canvas-warm)] hover:text-[var(--brand-green)]'
                }`}
              >
                {icon && <span className={isSelected ? 'text-white' : 'text-[var(--text-black-soft)]'}>{icon}</span>}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
