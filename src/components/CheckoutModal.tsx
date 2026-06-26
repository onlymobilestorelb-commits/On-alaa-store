/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, Trash2, MapPin, User, Phone, CheckCircle, Send } from 'lucide-react';
import { CartItem, StoreSettings } from '../types';
import { Language, translations } from '../translations';

interface CheckoutModalProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQty: (productId: string, quantity: number, variantId?: string) => void;
  onRemoveItem: (productId: string, variantId?: string) => void;
  onClearCart: () => void;
  onOrderSubmitted: (order: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
  }) => void;
  settings: StoreSettings;
  language?: Language;
}

export default function CheckoutModal({
  cart,
  isOpen,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderSubmitted,
  settings,
  language = 'en',
}: CheckoutModalProps) {
  const t = translations[language];
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Restore cached customer details for convenient repeat ordering
  React.useEffect(() => {
    if (isOpen) {
      const savedName = localStorage.getItem('customer_name') || '';
      const savedPhone = localStorage.getItem('customer_phone') || '';
      const savedAddress = localStorage.getItem('customer_address') || '';
      setName(savedName);
      setPhone(savedPhone);
      setAddress(savedAddress);
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sum takes variant prices into account
  const totalSum = cart.reduce((acc, item) => {
    const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
    return acc + itemPrice * item.quantity;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim() || cart.length === 0) return;

    // Cache customer details
    localStorage.setItem('customer_name', name);
    localStorage.setItem('customer_phone', phone);
    localStorage.setItem('customer_address', address);

    // Build WhatsApp message text
    let itemsText = '';
    cart.forEach((item) => {
      const price = item.selectedVariant ? item.selectedVariant.price : item.product.price;
      const variantSuffix = item.selectedVariant ? ` (${item.selectedVariant.name}${item.selectedVariant.sku ? `, SKU: ${item.selectedVariant.sku}` : ''})` : '';
      itemsText += `• *${item.quantity}x* ${item.product.name}${variantSuffix} ($${(price * item.quantity).toFixed(2)})\n`;
    });

    const cleanWhatsapp = settings.whatsappNumber.replace(/[^0-9]/g, '');

    const message = language === 'ar'
      ? `🛍️ *${settings.storeName.toUpperCase()} - طلب جديد*

*تفاصيل الزبون:*
👤 *الاسم:* ${name.trim()}
📞 *رقم الهاتف:* ${phone.trim()}
📍 *العنوان:* ${address.trim()}

*المنتجات المطلوبة:*
${itemsText}
💰 *الإجمالي: $${totalSum.toFixed(2)}*

_تم إنشاء الطلب عبر نظام آلاء للتجارة الإلكترونية_`
      : `🛍️ *${settings.storeName.toUpperCase()} - NEW ORDER*

*Customer Details:*
👤 *Name:* ${name.trim()}
📞 *Phone:* ${phone.trim()}
📍 *Address:* ${address.trim()}

*Order Items:*
${itemsText}
💰 *Total: $${totalSum.toFixed(2)}*

_Order created via ALAA E-Commerce System_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodedMessage}`;

    // Callback to save order record in dashboard
    onOrderSubmitted({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerAddress: address.trim(),
    });

    // Open WhatsApp link in new tab safely
    window.open(whatsappUrl, '_blank');

    setIsSuccess(true);
    setTimeout(() => {
      onClearCart();
      onClose();
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <h3 className="font-display text-lg font-extrabold text-slate-900">
              {isSuccess ? 'Order Dispatched!' : 'Complete WhatsApp Order'}
            </h3>
            <button
              onClick={onClose}
              id="close-checkout-modal-btn"
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSuccess ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center animate-fade-in"
            >
              <CheckCircle className="w-16 h-16 text-green-500 mb-4 stroke-[2.5]" />
              <h4 className="text-xl font-bold text-slate-900 mb-2">
                {language === 'ar' ? 'شكراً لك!' : 'Thank you!'}
              </h4>
              <p className="text-sm text-slate-500 max-w-xs">
                {language === 'ar' 
                  ? 'طلبك جاهز تماماً. جاري فتح تطبيق واتساب لتأكيد وإرسال طلبك...' 
                  : 'Your order is ready. We are launching WhatsApp to complete your transaction...'}
              </p>
            </motion.div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Order Items Review */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block text-start">
                  {t.yourShoppingCart} ({cart.length})
                </span>

                {cart.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">{t.cartEmpty}</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50 max-h-48 overflow-y-auto">
                    {cart.map((item) => {
                      const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
                      const itemKey = `${item.product.id}-${item.selectedVariant?.id || 'base'}`;
                      return (
                        <div
                          key={itemKey}
                          className="p-3 flex items-center justify-between text-sm gap-2 bg-white animate-fade-in"
                        >
                          <div className="flex-1 min-w-0 text-start">
                            <p className="font-semibold text-slate-800 truncate">
                              {item.product.name}
                            </p>
                            {item.selectedVariant ? (
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-bold">
                                  {item.selectedVariant.name}
                                </span>
                                {item.selectedVariant.sku && (
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {t.idLabel}: {item.selectedVariant.sku}
                                  </span>
                                )}
                              </div>
                            ) : null}
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              ${itemPrice.toFixed(2)} {language === 'ar' ? 'للقطعة' : 'each'}
                            </p>
                          </div>

                          {/* Quantity controls */}
                          <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 scale-90 shrink-0">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.product.id, item.quantity - 1, item.selectedVariant?.id)}
                              className="p-1 px-2 text-slate-500 hover:bg-slate-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-xs text-slate-800 min-w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.product.id, item.quantity + 1, item.selectedVariant?.id)}
                              className="p-1 px-2 text-slate-500 hover:bg-slate-100"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-bold text-slate-900 ltr:text-right rtl:text-left min-w-16 shrink-0">
                            ${(itemPrice * item.quantity).toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.product.id, item.selectedVariant?.id)}
                            className="text-red-400 hover:text-red-600 p-1 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-medium text-slate-600">{t.total}:</span>
                  <span className="font-display text-lg font-black text-slate-900">
                    ${totalSum.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Delivery Details Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block text-start">
                  {t.customerInformation}
                </span>

                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      id="customer-fullname-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder={t.fullNamePlaceholder}
                      className="w-full ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="tel"
                      id="customer-phone-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder={t.phonePlaceholder}
                      className="w-full ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>

                  <div className="relative">
                    <MapPin className="absolute ltr:left-3 rtl:right-3 top-3 text-slate-400 w-4 h-4" />
                    <textarea
                      id="customer-address-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      rows={2}
                      placeholder={t.addressPlaceholder}
                      className="w-full ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="checkout-submit-btn"
                  disabled={cart.length === 0}
                  className="w-full bg-[#25D366] hover:bg-green-600 text-white font-black py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 uppercase tracking-wider text-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.btnConfirmOrder}</span>
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
