/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Shield, ShoppingBag, Eye, Heart, ExternalLink } from 'lucide-react';

import StorefrontView from './components/StorefrontView';
import AdminDashboardView from './components/AdminDashboardView';
import AdminGate from './components/AdminGate';
import ProductModal from './components/ProductModal';
import CheckoutModal from './components/CheckoutModal';

import { Product, StoreSettings, CartItem, OrderRecord, ProductVariant } from './types';
import { Language, translations } from './translations';

// Seeding Default Products from Prompt Mockup
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Green Lion Pocket 10000mAh',
    price: 20.00,
    category: 'Power bank',
    desc: 'LED power indicators, integrated heavy-duty lightning cable strap, ultra-compact pocket-friendly form factor with 22.5W Power Delivery.',
    inStock: true,
    stockQuantity: 2,
    visible: true,
    createdAt: Date.now() - 3 * 3600 * 1000,
  },
  {
    id: '2',
    name: 'Green Lion Transparent Pro',
    price: 20.00,
    category: 'Power bank',
    desc: 'Futuristic transparent cyberpunk aesthetic shell casing revealing its internal high-performance motherboard. Double USB-C charge delivery.',
    inStock: true,
    stockQuantity: 12,
    visible: true,
    createdAt: Date.now() - 2 * 3600 * 1000,
  },
  {
    id: '3',
    name: 'Green Lion Pro Trim Duo Hair Clipper',
    price: 45.00,
    category: 'Shaving Machines',
    desc: 'Professional-grade personal grooming bundle with self-sharpening micro-blades, high-torque rotary motor, travel-lock triggers, and LCD charge diagnostics.',
    inStock: false,
    stockQuantity: 0,
    visible: true,
    createdAt: Date.now() - 1 * 3600 * 1000,
  },
];

// Seeding Default Storefront Configurations
const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'ON ALAA STORE',
  storeDescription: 'Your premium Lebanese hub for ultimate smart accessories, power delivery hubs, and personal grooming appliances.',
  whatsappNumber: '96170123456', // Lebanon country code e.g.
  currency: 'USD',
  bannerColor: '#FCD34D', // Amber/Yellow-300 from Tailwind palette
  avatarText: 'ON ALAA',
  avatarSubtext: 'STORE',
  hideOutOfStock: false,
  instagramUsername: 'onlymobilestore.lb',
  storeLocationUrl: 'https://www.google.com/maps/search/?api=1&query=Only+Mobile+Store+Lebanon',
  phoneCallNumber: '96170123456',
};

const DEFAULT_CATEGORIES = [
  'Power Bank',
  'Watch',
  'Mobile',
  'Cables',
  'Stand',
  'Projector',
  'Gadgets',
  'Charger',
  'DJI',
  'Hyperx',
  'Headphones'
];

export default function App() {
  const [view, setView] = React.useState<'storefront' | 'dashboard'>('storefront');
  const [language, setLanguage] = React.useState<Language>('en');
  
  // State variables loaded from localStorage to preserve catalog modifications
  const [products, setProducts] = React.useState<Product[]>([]);
  const [settings, setSettings] = React.useState<StoreSettings>(DEFAULT_SETTINGS);
  const [orders, setOrders] = React.useState<OrderRecord[]>([]);
  const [categories, setCategories] = React.useState<string[]>(DEFAULT_CATEGORIES);

  // Client-side shopping cart state
  const [cart, setCart] = React.useState<CartItem[]>([]);

  // Modal views controllers
  const [activeProduct, setActiveProduct] = React.useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);

  // Initialize data on boot
  React.useEffect(() => {
    // 0. Language
    const savedLanguage = localStorage.getItem('store_language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
      setLanguage(savedLanguage);
    }

    // 1. Products
    const savedProducts = localStorage.getItem('catalog_products');
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
      } catch (err) {
        setProducts(DEFAULT_PRODUCTS);
      }
    } else {
      setProducts(DEFAULT_PRODUCTS);
      localStorage.setItem('catalog_products', JSON.stringify(DEFAULT_PRODUCTS));
    }

    // 2. Settings
    const savedSettings = localStorage.getItem('store_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (err) {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('store_settings', JSON.stringify(DEFAULT_SETTINGS));
    }

    // 3. Orders
    const savedOrders = localStorage.getItem('store_orders');
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
      } catch (err) {
        setOrders([]);
      }
    }

    // 4. Categories
    const savedCategories = localStorage.getItem('store_categories');
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories) as string[];
        // Auto-merge newly requested defaults to ensure they exist even for returning users
        const merged = Array.from(new Set([...parsed, ...DEFAULT_CATEGORIES]));
        setCategories(merged);
        localStorage.setItem('store_categories', JSON.stringify(merged));
      } catch (err) {
        setCategories(DEFAULT_CATEGORIES);
      }
    } else {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem('store_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
  }, []);

  // Sync state helpers to localStorage
  const updateProductsState = (newProds: Product[]) => {
    setProducts(newProds);
    localStorage.setItem('catalog_products', JSON.stringify(newProds));
  };

  const updateSettingsState = (newSettings: StoreSettings) => {
    setSettings(newSettings);
    localStorage.setItem('store_settings', JSON.stringify(newSettings));
  };

  const updateOrdersState = (newOrders: OrderRecord[]) => {
    setOrders(newOrders);
    localStorage.setItem('store_orders', JSON.stringify(newOrders));
  };

  const updateCategoriesState = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem('store_categories', JSON.stringify(newCats));
  };

  const updateLanguageState = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('store_language', newLang);
  };

  // CART ACTIONS
  const handleAddToCart = (productId: string, qtyToAdd: number, variant?: ProductVariant) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.product.id === productId && item.selectedVariant?.id === variant?.id
      );

      if (existingIdx > -1) {
        if (qtyToAdd <= 0) {
          return prevCart.filter((_, idx) => idx !== existingIdx);
        }
        return prevCart.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: qtyToAdd } : item
        );
      } else {
        if (qtyToAdd <= 0) return prevCart;
        return [...prevCart, { product, quantity: qtyToAdd, selectedVariant: variant }];
      }
    });
  };

  const handleUpdateCartQty = (productId: string, newQty: number, variantId?: string) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.product.id === productId && item.selectedVariant?.id === variantId
      );
      if (existingIdx === -1) return prevCart;

      if (newQty <= 0) {
        return prevCart.filter((_, idx) => idx !== existingIdx);
      }
      return prevCart.map((item, idx) =>
        idx === existingIdx ? { ...item, quantity: newQty } : item
      );
    });
  };

  const handleRemoveCartItem = (productId: string, variantId?: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.product.id === productId && item.selectedVariant?.id === variantId))
    );
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // REVIEW ACTIONS
  const handleAddReview = (productId: string, rating: number, comment: string, customerName: string) => {
    const review = {
      id: 'rev-' + Date.now().toString(),
      customerName: customerName || 'Anonymous',
      rating,
      comment,
      createdAt: Date.now(),
    };

    const updated = products.map((p) => {
      if (p.id === productId) {
        const reviews = p.reviews ? [...p.reviews, review] : [review];
        return { ...p, reviews };
      }
      return p;
    });
    updateProductsState(updated);
    
    // Also update activeProduct if it is currently open
    if (activeProduct && activeProduct.id === productId) {
      setActiveProduct((prev) => {
        if (!prev) return null;
        const reviews = prev.reviews ? [...prev.reviews, review] : [review];
        return { ...prev, reviews };
      });
    }
  };

  // PRODUCT MANAGEMENT ACTIONS
  const handleAddProduct = (newProdData: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    const updated = [newProduct, ...products];
    updateProductsState(updated);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const updated = products.map((p) => (p.id === updatedProd.id ? updatedProd : p));
    updateProductsState(updated);
  };

  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    updateProductsState(updated);
    // clean cart if deleted product was in it
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleAddCategory = (newCat: string) => {
    if (!categories.includes(newCat)) {
      const updated = [...categories, newCat];
      updateCategoriesState(updated);
    }
  };

  // ORDER SUBMISSION ACTION (Fired from CheckoutModal)
  const handleOrderSubmitted = (custInfo: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
  }) => {
    const newOrder: OrderRecord = {
      id: 'ORD-' + Math.floor(Math.random() * 900000 + 100000).toString(),
      customerName: custInfo.customerName,
      customerPhone: custInfo.customerPhone,
      customerAddress: custInfo.customerAddress,
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        priceAtOrder: item.selectedVariant ? item.selectedVariant.price : item.product.price,
        variantName: item.selectedVariant?.name,
        variantSku: item.selectedVariant?.sku,
      })),
      totalPrice: cart.reduce((acc, item) => acc + (item.selectedVariant ? item.selectedVariant.price : item.product.price) * item.quantity, 0),
      status: 'Pending',
      createdAt: Date.now(),
    };

    const updated = [newOrder, ...orders];
    updateOrdersState(updated);
  };

  const handleUpdateOrderStatus = (orderId: string, status: 'Pending' | 'Completed' | 'Cancelled') => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    updateOrdersState(updated);
  };

  // Share active item's qty if in cart, or 1
  const getProductCartQty = (productId: string) => {
    const item = cart.find((c) => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  const t = translations[language];

  return (
    <div 
      dir={language === 'ar' ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-[#F3F4F6] flex flex-col text-slate-900 selection:bg-[#FCD34D]/50 font-sans transition-all duration-200"
    >
      
      {/* SYSTEM NAVIGATION BAR */}
      <div className="h-14 w-full bg-[#0F172A] text-white flex items-center justify-between px-4 md:px-8 border-b border-white/10 sticky top-0 z-50 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FCD34D] rounded flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-[#0F172A] font-black text-lg font-display">A</span>
          </div>
          <span className="font-display font-black tracking-tight text-xs md:text-sm text-white hidden sm:inline">{t.logoSystem}</span>
        </div>

        <div className="flex gap-1 bg-[#1E293B] p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setView('storefront')}
            id="btn-storefront"
            className={`py-1.5 px-3 rounded-lg text-[10px] md:text-xs font-black tracking-wide uppercase transition duration-200 flex items-center gap-1.5 ${
              view === 'storefront'
                ? 'bg-[#FCD34D] text-[#0F172A] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{t.publicStorefront}</span>
          </button>
          
          <button 
            onClick={() => setView('dashboard')}
            id="btn-dashboard"
            className={`py-1.5 px-3 rounded-lg text-[10px] md:text-xs font-black tracking-wide uppercase transition duration-200 flex items-center gap-1.5 ${
              view === 'dashboard'
                ? 'bg-[#FCD34D] text-[#0F172A] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t.adminDashboard}</span>
          </button>
        </div>

        <div className="flex gap-2 items-center">
          {/* Dedicated Language Selector Switcher */}
          <button
            onClick={() => updateLanguageState(language === 'en' ? 'ar' : 'en')}
            id="btn-toggle-lang"
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] md:text-xs font-black tracking-wider uppercase transition duration-150 text-[#FCD34D] flex items-center gap-1"
          >
            <span className="text-xs">🌐</span>
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 text-[9px] font-extrabold uppercase tracking-widest text-slate-300">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            <span>{t.serverOn}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
            <span>{t.idLabel}: 992-04</span>
          </div>
        </div>
      </div>

      {/* CORE DISPLAY STAGE */}
      <main className="flex-1 w-full py-4 px-2 md:px-4">
        <AnimatePresence mode="wait">
          {view === 'storefront' ? (
            <motion.div
              key="storefront"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <StorefrontView
                products={products}
                settings={settings}
                cart={cart}
                onAddToCart={handleAddToCart}
                onOpenProduct={(p) => setActiveProduct(p)}
                onOpenCheckout={() => setIsCheckoutOpen(true)}
                language={language}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AdminGate>
                <AdminDashboardView
                  products={products}
                  settings={settings}
                  orders={orders}
                  categories={categories}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onUpdateSettings={updateSettingsState}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onAddCategory={handleAddCategory}
                  language={language}
                  onLanguageChange={updateLanguageState}
                />
              </AdminGate>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* DIALOG POPUPS */}
      <ProductModal
        product={activeProduct}
        isOpen={activeProduct !== null}
        onClose={() => setActiveProduct(null)}
        cart={cart}
        onAddToCart={(qty, variant) => activeProduct && handleAddToCart(activeProduct.id, qty, variant)}
        onAddReview={(rating, comment, name) => activeProduct && handleAddReview(activeProduct.id, rating, comment, name)}
        settings={settings}
        language={language}
      />

      <CheckoutModal
        cart={cart}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onOrderSubmitted={handleOrderSubmitted}
        settings={settings}
        language={language}
      />

      {/* Ambient Footer */}
      <footer className="py-6 text-center text-[11px] text-slate-400 font-medium">
        <p>© 2026 {settings.storeName}. {t.allRightsReserved}</p>
        <p className="mt-1 text-slate-300">{t.poweredBy}</p>
      </footer>
    </div>
  );
}
