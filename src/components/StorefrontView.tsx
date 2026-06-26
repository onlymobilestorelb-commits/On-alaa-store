/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Search, Plus, Zap, Scissors, Laptop, Box, MessageSquare, 
  Share2, ArrowRight, Check, EyeOff, Sparkles, Filter, Star,
  Instagram, MapPin, PhoneCall, MessageCircle
} from 'lucide-react';
import { Product, StoreSettings, CartItem, ProductVariant } from '../types';
import { Language, translations } from '../translations';

interface StorefrontViewProps {
  products: Product[];
  settings: StoreSettings;
  cart: CartItem[];
  onAddToCart: (productId: string, qty: number, variant?: ProductVariant) => void;
  onOpenProduct: (product: Product) => void;
  onOpenCheckout: () => void;
  language?: Language;
}

export default function StorefrontView({
  products,
  settings,
  cart,
  onAddToCart,
  onOpenProduct,
  onOpenCheckout,
  language = 'en',
}: StorefrontViewProps) {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [copied, setCopied] = React.useState(false);
  const [hideOutOfStock, setHideOutOfStock] = React.useState(settings.hideOutOfStock ?? false);

  React.useEffect(() => {
    setHideOutOfStock(settings.hideOutOfStock ?? false);
  }, [settings.hideOutOfStock]);

  // Derive unique categories from active visible products
  const categories = React.useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.visible) {
        // If hideOutOfStock is checked, only include category if there is at least one in-stock item
        if (hideOutOfStock && !p.inStock) return;
        list.add(p.category);
      }
    });
    return ['All', ...Array.from(list)];
  }, [products, hideOutOfStock]);

  // Filter products based on search query, category and out-of-stock settings
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      if (!p.visible) return false;
      if (hideOutOfStock && !p.inStock) return false;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory, hideOutOfStock]);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cart.reduce((acc, item) => {
    const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
    return acc + itemPrice * item.quantity;
  }, 0);

  // Copy app URL to clipboard
  const handleShare = async () => {
    try {
      const shareUrl = window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleWhatsappContact = () => {
    const cleanNum = settings.whatsappNumber.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hello! I'm browsing the ${settings.storeName} catalog and would like to ask a question.`);
    window.open(`https://wa.me/${cleanNum}?text=${message}`, '_blank');
  };

  // Helper to render category icon
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('power') || cat.includes('charge')) {
      return <Zap className="w-6 h-6 text-amber-500" />;
    }
    if (cat.includes('shaving') || cat.includes('trim') || cat.includes('clipper') || cat.includes('groom')) {
      return <Scissors className="w-6 h-6 text-teal-500" />;
    }
    if (cat.includes('accessories') || cat.includes('cable') || cat.includes('phone')) {
      return <Laptop className="w-6 h-6 text-blue-500" />;
    }
    return <Box className="w-6 h-6 text-slate-400" />;
  };

  return (
    <div className="mx-auto w-full max-w-md bg-white rounded-[40px] border-[8px] border-[#0F172A] shadow-2xl overflow-hidden relative pb-28 flex flex-col min-h-[820px] my-6">
      
      {/* Banner Section */}
      <div 
        className="h-32 w-full relative transition-colors duration-300 shrink-0 overflow-hidden"
        style={{ backgroundColor: settings.bannerColor }}
      >
        {settings.bannerVideo && (
          <video 
            id="storefront-bg-video" 
            autoPlay 
            loop 
            muted 
            playsInline 
            src={settings.bannerVideo}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )}

        <div className="absolute right-4 top-4 flex gap-2 z-10">
          {/* Whatsapp Button */}
          <button 
            onClick={handleWhatsappContact}
            title="Chat on WhatsApp"
            id="whatsapp-contact-btn"
            className="bg-white/95 backdrop-blur shadow-md hover:scale-105 p-2 rounded-full text-green-600 transition hover:bg-white active:scale-95"
          >
            <MessageSquare className="w-4 h-4 stroke-[2.2]" />
          </button>
          
          {/* Share Button */}
          <button 
            onClick={handleShare}
            title="Copy Store Link"
            id="share-store-btn"
            className="bg-white/95 backdrop-blur shadow-md hover:scale-105 p-2 rounded-full text-slate-700 transition hover:bg-white active:scale-95 flex items-center justify-center min-w-[32px]"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Store Avatar Logo */}
        <div className="absolute -bottom-14 ltr:left-6 rtl:right-6 bg-white p-2 rounded-full shadow-2xl border border-slate-100/90 flex items-center justify-center z-10">
          <div className="bg-white rounded-full w-28 h-28 flex flex-col justify-center items-center select-none overflow-hidden leading-none relative">
            {settings.avatarImage ? (
              <img 
                src={settings.avatarImage} 
                alt={settings.storeName} 
                className="w-full h-full object-cover rounded-full image-render-auto"
                style={{ imageRendering: 'auto' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                {/* "ON ALAA" Row */}
                <div className="flex items-center justify-center gap-1">
                  {(settings.avatarText || 'ON ALAA').toUpperCase().startsWith('O') ? (
                    <>
                      {/* Custom 'O' with Play icon */}
                      <div className="w-6 h-6 bg-[#FF0000] rounded-full flex items-center justify-center shrink-0 shadow-xs">
                        <div className="w-0 h-0 border-t-[4.5px] border-t-transparent border-b-[4.5px] border-b-transparent border-l-[8px] border-l-white ml-[1px]" />
                      </div>
                      {/* Rest of the text in bold red */}
                      <span className="text-sm font-black tracking-tight text-[#FF0000] font-sans uppercase">
                        {(settings.avatarText || 'ON ALAA').toUpperCase().substring(1)}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-black tracking-tight text-[#FF0000] font-sans uppercase">
                      {settings.avatarText || 'ON ALAA'}
                    </span>
                  )}
                </div>
                
                {/* "STORE" Row */}
                <span className="text-[11px] font-black tracking-[0.25em] text-black font-sans uppercase mt-1.5 mr-[-0.25em]">
                  {settings.avatarSubtext || 'STORE'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meta Title Section */}
      <div className="pt-16 px-6 pb-2">
        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 font-display">
          {settings.storeName}
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
          {settings.storeDescription}
        </p>

        {/* Instagram Bio Link-in-Bio Quick Links Panel */}
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{t.connectInBio}</span>
            <span className="flex-1 h-px bg-slate-100" />
            <span className="text-[9px] font-black text-amber-500 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">{t.liveConnections}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp Card */}
            <a 
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent("Hello! I'm browsing your store via your Instagram Bio link and have a question.")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-2 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition active:scale-95 text-emerald-950 shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm text-white">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800 leading-none">{t.whatsApp}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-0.5 truncate">{t.chatLive}</p>
              </div>
            </a>

            {/* Instagram Card */}
            <a 
              href={`https://instagram.com/${settings.instagramUsername || 'onlymobilestore.lb'}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-2 rounded-xl border border-pink-100 bg-pink-50/30 hover:bg-pink-50/70 transition active:scale-95 text-pink-950 shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm text-white">
                <Instagram className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-pink-700 leading-none">{t.instagram}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-0.5 truncate">@{settings.instagramUsername || 'onlymobilestore.lb'}</p>
              </div>
            </a>

            {/* Store Location Card */}
            <a 
              href={settings.storeLocationUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.storeName)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-2 rounded-xl border border-sky-100 bg-sky-50/30 hover:bg-sky-50/70 transition active:scale-95 text-sky-950 shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shrink-0 shadow-sm text-white">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-sky-800 leading-none">{t.ourLocation}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-0.5 truncate">{t.googleMaps}</p>
              </div>
            </a>

            {/* Call hotline Card */}
            <a 
              href={`tel:${settings.phoneCallNumber || settings.whatsappNumber}`}
              className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition active:scale-95 text-slate-950 shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 shadow-sm text-white">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-800 leading-none">{t.callStore}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-0.5 truncate">{t.directDial}</p>
              </div>
            </a>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col gap-2.5 mt-4">
          <div className="relative flex-1">
            <Search className="absolute ltr:left-3.5 rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm focus:bg-white"
            />
          </div>
          
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={hideOutOfStock}
                onChange={(e) => setHideOutOfStock(e.target.checked)}
                className="w-4 h-4 text-slate-900 bg-slate-50 border-slate-200 rounded focus:ring-amber-300 focus:ring-2 cursor-pointer transition-colors"
              />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                {t.hideOutOfStockLabel}
              </span>
            </label>
            {hideOutOfStock && (
              <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 tracking-wider">
                {language === 'ar' ? 'مصفى' : 'Filtered'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="px-6 py-2 overflow-x-auto scrollbar-none flex gap-2 border-b border-slate-50">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedCategory === category
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {category === 'All' ? t.allCategories : category}
          </button>
        ))}
      </div>

      {/* Products Catalog Grid */}
      <div className="px-5 py-4 flex-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider font-display">
            {selectedCategory === 'All' ? t.recentArrivals : selectedCategory}
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {filteredProducts.length} {t.itemsCount}
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-100">
            <Box className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-slate-700">{t.noProductsFound}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3" id="storefront-products-grid">
            {filteredProducts.map((item) => {
              const inCartItem = cart.find((c) => c.product.id === item.id);
              const reviews = item.reviews || [];
              const avgRating = reviews.length > 0 
                ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                : null;
              const hasVariants = item.variants && item.variants.length > 0;

              return (
                <motion.div
                  key={item.id}
                  onClick={() => onOpenProduct(item)}
                  layout
                  className="bg-white border border-slate-100 rounded-2xl p-3 relative shadow-xs flex flex-col justify-between hover:shadow-md transition cursor-pointer"
                >
                  <div>
                    {/* Item Image or Category Placeholder */}
                    <div className="bg-slate-50 rounded-xl h-32 flex flex-col items-center justify-center mb-2.5 p-2 relative overflow-hidden">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="max-h-full max-w-full object-contain rounded-lg z-10 relative"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) {
                              fallback.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                        {getCategoryIcon(item.category)}
                      </div>
                      
                      {!item.inStock && (
                        <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-[10px] font-black text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block truncate">
                        {item.category}
                      </span>
                      {hasVariants && (
                        <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100 shrink-0 uppercase tracking-tight">
                          {item.variants?.length} Options
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-slate-800 mt-0.5 line-clamp-2 leading-tight min-h-[2rem]">
                      {item.name}
                    </h3>

                    {/* Ratings display on product card */}
                    <div className="flex items-center gap-1 mt-1">
                      <Star className={`w-3 h-3 ${avgRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      <span className="text-[10px] font-extrabold text-slate-700">
                        {avgRating ? avgRating : '0.0'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        ({reviews.length})
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-slate-400 leading-none">{t.price}</span>
                      <span className="text-sm font-black text-slate-900 font-display mt-0.5">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>

                    {item.inStock ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasVariants) {
                            // Prompt variant selection first
                            onOpenProduct(item);
                          } else {
                            onAddToCart(item.id, 1);
                          }
                        }}
                        id={`add-to-cart-${item.id}`}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                          inCartItem 
                            ? 'bg-slate-900 border-slate-900 text-white' 
                            : 'bg-white border-slate-200 text-slate-700 hover:scale-105 hover:bg-slate-50'
                        }`}
                      >
                        {inCartItem ? (
                          <span className="text-xs font-bold font-mono">+{inCartItem.quantity}</span>
                        ) : (
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalCartItems > 0 && (
        <div 
          id="storefront-cart-strip"
          className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-100 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-40 flex items-center justify-between rounded-b-[32px] animate-fade-in"
        >
          <div>
            <p className="text-xs text-slate-500 font-semibold" id="cart-item-count">
              {totalCartItems} {language === 'ar' ? 'منتج مضاف' : totalCartItems > 1 ? 'items' : 'item'}
            </p>
            <p className="text-lg font-black text-slate-900 font-display" id="cart-item-total">
              ${totalCartPrice.toFixed(2)}
            </p>
          </div>
          <button 
            onClick={onOpenCheckout}
            id="view-cart-checkout-btn"
            className="hover:opacity-90 active:scale-98 text-slate-950 font-black px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md font-display text-sm"
            style={{ backgroundColor: settings.bannerColor }}
          >
            <span>{t.cartLabel}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
