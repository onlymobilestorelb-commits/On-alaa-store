/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, ShoppingBag, Zap, Scissors, Laptop, Sparkles, Box, Star, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, StoreSettings, CartItem, ProductVariant } from '../types';
import { Language, translations } from '../translations';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onAddToCart: (qty: number, variant?: ProductVariant) => void;
  onAddReview: (rating: number, comment: string, customerName: string) => void;
  settings: StoreSettings;
  language?: Language;
}

export default function ProductModal({
  product,
  isOpen,
  onClose,
  cart,
  onAddToCart,
  onAddReview,
  settings,
  language = 'en',
}: ProductModalProps) {
  const t = translations[language];
  const [quantity, setQuantity] = React.useState(1);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null);

  // Review Form States
  const [reviewRating, setReviewRating] = React.useState(5);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewName, setReviewName] = React.useState('');
  const [reviewSuccess, setReviewSuccess] = React.useState(false);

  // Initialize selected variant when product opens
  React.useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [product, isOpen]);

  // Dynamically compute active cart quantity for the selected product + variant combination
  const activeCartQty = React.useMemo(() => {
    if (!product) return 0;
    const found = cart.find(
      (item) => item.product.id === product.id && item.selectedVariant?.id === selectedVariant?.id
    );
    return found ? found.quantity : 0;
  }, [cart, product, selectedVariant]);

  // Sync state quantity with cart qty
  React.useEffect(() => {
    setQuantity(activeCartQty > 0 ? activeCartQty : 1);
  }, [activeCartQty, selectedVariant, product]);

  const carouselImages = React.useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    if (product.images && product.images.length > 0) {
      list.push(...product.images);
    } else if (product.image) {
      list.push(product.image);
    }
    return list;
  }, [product]);

  const [activeImgIdx, setActiveImgIdx] = React.useState(0);

  // Reset image index when product opens or changes
  React.useEffect(() => {
    setActiveImgIdx(0);
  }, [product, isOpen]);

  // Switch to the selected variant's image if it is part of the image list
  React.useEffect(() => {
    if (selectedVariant && selectedVariant.image) {
      const idx = carouselImages.indexOf(selectedVariant.image);
      if (idx !== -1) {
        setActiveImgIdx(idx);
      }
    }
  }, [selectedVariant, carouselImages]);

  if (!product) return null;

  // Derive active details based on selection
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const activeImage = carouselImages[activeImgIdx] || (selectedVariant && selectedVariant.image) || product.image;
  const currentStock = selectedVariant ? selectedVariant.inStock : product.inStock;
  const currentSku = selectedVariant ? selectedVariant.sku : null;

  // Calculate average rating
  const reviews = product.reviews || [];
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : null;

  // Helper to render category icon
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('power') || cat.includes('charge')) {
      return <Zap className="w-12 h-12 text-amber-500" />;
    }
    if (cat.includes('shaving') || cat.includes('trim') || cat.includes('clipper') || cat.includes('groom')) {
      return <Scissors className="w-12 h-12 text-teal-500" />;
    }
    if (cat.includes('accessories') || cat.includes('cable') || cat.includes('phone')) {
      return <Laptop className="w-12 h-12 text-blue-500" />;
    }
    return <Box className="w-12 h-12 text-slate-400" />;
  };

  const handleMinus = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handlePlus = () => {
    setQuantity((prev) => prev + 1);
  };

  const totalPrice = currentPrice * quantity;

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    onAddReview(reviewRating, reviewComment, reviewName);
    setReviewComment('');
    setReviewName('');
    setReviewRating(5);
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          {/* Backdrop Click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col gap-4 scrollbar-thin"
          >
            {/* Header Handle Indicator */}
            <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 shrink-0" />

            {/* Close Button */}
            <button
              onClick={onClose}
              id="close-product-modal-btn"
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Product Image Carousel */}
            <div className="mt-2 flex h-56 w-full items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 p-4 relative overflow-hidden shrink-0 group/carousel">
              {activeImage ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  {/* Active Image with slide/fade animation */}
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeImgIdx}
                      src={activeImage}
                      alt={product.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15, ease: 'easeInOut' }}
                      className="max-h-full max-w-full object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </AnimatePresence>

                  {/* Navigation Arrows */}
                  {carouselImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImgIdx((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-1.5 rounded-full shadow-md transition-all duration-200 hover:scale-110 active:scale-95 z-10"
                        title="Previous Image"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImgIdx((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-1.5 rounded-full shadow-md transition-all duration-200 hover:scale-110 active:scale-95 z-10"
                        title="Next Image"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Dot Indicators */}
                  {carouselImages.length > 1 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/10 backdrop-blur-xs px-2.5 py-1 rounded-full z-10">
                      {carouselImages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImgIdx(idx);
                          }}
                          className={`h-1.5 rounded-full transition-all duration-200 ${
                            idx === activeImgIdx 
                              ? 'w-3.5' 
                              : 'w-1.5 hover:bg-white/60'
                          }`}
                          style={{
                            backgroundColor: idx === activeImgIdx ? settings.bannerColor : 'rgba(255, 255, 255, 0.4)'
                          }}
                          title={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Fallback Icon Box if no image or broken */}
              {!activeImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                  {getCategoryIcon(product.category)}
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-100 shadow-xs uppercase tracking-wider">
                    {product.category}
                  </span>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {product.category}
                </span>
                {!currentStock ? (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {t.outOfStock}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {t.inStock}
                  </span>
                )}
                {currentSku && (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {t.idLabel}: {currentSku}
                  </span>
                )}
              </div>

              {/* Title & Star Rating Summary */}
              <div className="space-y-1">
                <h3 className="font-display text-xl font-extrabold text-slate-900 leading-tight">
                  {product.name}
                </h3>
                
                {/* Rating display */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const score = Number(avgRating || 0);
                      return (
                        <Star 
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= Math.round(score) ? 'fill-amber-400' : 'text-slate-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {avgRating ? avgRating : (language === 'ar' ? 'لا توجد تقييمات بعد' : 'No ratings yet')}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({reviews.length} {language === 'ar' ? 'تقييم' : reviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                {product.desc || (language === 'ar' ? 'لا يوجد وصف متوفر لهذا المنتج.' : 'No description provided for this catalog product.')}
              </p>
            </div>

            {/* VARIANT SELECTION SYSTEM */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block text-start">
                  {t.selectVariant}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`text-start p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{variant.name}</p>
                          <span className="text-[10px] font-black text-slate-900 bg-amber-200 px-1.5 py-0.2 rounded shrink-0">
                            ${variant.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] font-mono text-slate-400 truncate">{t.idLabel}: {variant.sku}</span>
                          <span className={`text-[9px] font-bold uppercase ${variant.inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                            {variant.inStock ? t.inStock : t.outOfStock}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Controls & Add to Cart Action */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{language === 'ar' ? 'اختر الكمية' : 'Choose Quantity'}</span>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <button
                    onClick={handleMinus}
                    id="modal-qty-minus"
                    className="px-3.5 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                    disabled={!currentStock}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span id="modal-qty-val" className="w-8 text-center text-xs font-bold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={handlePlus}
                    id="modal-qty-plus"
                    className="px-3.5 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                    disabled={!currentStock}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{language === 'ar' ? 'السعر الإجمالي' : 'Total Price'}</span>
                  <span className="font-display text-xl font-black text-slate-900">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>

                <button
                  id="modal-add-to-cart-action"
                  onClick={() => {
                    onAddToCart(quantity, selectedVariant || undefined);
                    onClose();
                  }}
                  disabled={!currentStock}
                  className="flex-1 rounded-xl py-3 px-4 text-center font-black text-slate-950 hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                  style={{ backgroundColor: settings.bannerColor }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{activeCartQty > 0 ? (language === 'ar' ? 'تحديث السلة' : 'Update Cart') : t.addToCart}</span>
                </button>
              </div>
            </div>

            {/* REVIEWS LISTING & SUBMISSION FORM SECTION */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">
                  {t.customerReviews} ({reviews.length})
                </h4>
              </div>

              {/* Review Submission Form */}
              <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 text-start">
                  {t.writeReview}
                </p>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">{t.rating}:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="text-amber-400 focus:outline-hidden hover:scale-110 transition-transform"
                      >
                        <Star 
                          className={`w-4 h-4 ${
                            star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder={t.yourName}
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <textarea
                    required
                    rows={2}
                    placeholder={t.comment}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <AnimatePresence>
                    {reviewSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
                        <span>{language === 'ar' ? 'تم تقديم التقييم بنجاح!' : 'Review submitted!'}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    className="ltr:ml-auto rtl:mr-auto bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all"
                  >
                    {t.submitReview}
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50/50 rounded-xl">
                    {t.noReviewsYet}
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1.5 text-start"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800">{rev.customerName}</span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star}
                            className={`w-3 h-3 ${
                              star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>

                      <p className="text-xs text-slate-600 italic leading-relaxed">
                        "{rev.comment}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
