/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Trash2, Settings, ClipboardList, Check, X, Layers, 
  Store, DollarSign, ShoppingBag, TrendingUp, Edit2, Save, 
  Eye, EyeOff, Sparkles, Phone, FileText, Info, HelpCircle,
  Image, Upload, Video, Download, Maximize2, ZoomIn, ZoomOut
} from 'lucide-react';
import { Product, StoreSettings, OrderRecord } from '../types';
import { Language, translations } from '../translations';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  exportProductsToSheets,
  exportOrdersToSheets,
  generateOrderInvoiceDoc,
  generateInventoryReportDoc
} from '../lib/workspace';

interface AdminDashboardViewProps {
  products: Product[];
  settings: StoreSettings;
  orders: OrderRecord[];
  categories: string[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateSettings: (settings: StoreSettings) => void;
  onUpdateOrderStatus: (orderId: string, status: 'Pending' | 'Completed' | 'Cancelled') => void;
  onAddCategory: (category: string) => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export default function AdminDashboardView({
  products,
  settings,
  orders,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateSettings,
  onUpdateOrderStatus,
  onAddCategory,
  language = 'en',
  onLanguageChange,
}: AdminDashboardViewProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = React.useState<'products' | 'orders' | 'settings' | 'workspace'>('products');

  // Google Workspace / Google Docs & Sheets State
  const [googleUser, setGoogleUser] = React.useState<User | null>(null);
  const [googleToken, setGoogleToken] = React.useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = React.useState(false);
  const [syncLoading, setSyncLoading] = React.useState<string | null>(null); // 'products' | 'orders' | 'invoice' | 'report' | null
  const [syncStatus, setSyncStatus] = React.useState<{ type: 'success' | 'error' | null; message: string; url?: string }>({ type: null, message: '' });

  React.useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsSigningInGoogle(true);
    setSyncStatus({ type: null, message: '' });
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setSyncStatus({ type: 'success', message: 'Successfully authenticated with your Google Account!' });
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', message: err.message || 'Google Authentication failed.' });
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      setSyncStatus({ type: 'success', message: 'Successfully signed out of Google Account.' });
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: err.message || 'Sign-out failed.' });
    }
  };

  const handleExportProductsToSheets = async () => {
    if (!googleUser) {
      setSyncStatus({ type: 'error', message: 'Please sign in with Google first.' });
      return;
    }
    setSyncLoading('products');
    setSyncStatus({ type: null, message: '' });
    try {
      const url = await exportProductsToSheets(products);
      setSyncStatus({
        type: 'success',
        message: 'Product Catalog successfully exported to Google Sheets!',
        url
      });
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setSyncLoading(null);
    }
  };

  const handleExportOrdersToSheets = async () => {
    if (!googleUser) {
      setSyncStatus({ type: 'error', message: 'Please sign in with Google first.' });
      return;
    }
    setSyncLoading('orders');
    setSyncStatus({ type: null, message: '' });
    try {
      const url = await exportOrdersToSheets(orders);
      setSyncStatus({
        type: 'success',
        message: 'Order history successfully exported to Google Sheets!',
        url
      });
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setSyncLoading(null);
    }
  };

  const handleGenerateInventoryReportDoc = async () => {
    if (!googleUser) {
      setSyncStatus({ type: 'error', message: 'Please sign in with Google first.' });
      return;
    }
    setSyncLoading('report');
    setSyncStatus({ type: null, message: '' });
    try {
      const url = await generateInventoryReportDoc(products, categories);
      setSyncStatus({
        type: 'success',
        message: 'Inventory report Google Doc generated successfully!',
        url
      });
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', message: err.message || 'Generation failed.' });
    } finally {
      setSyncLoading(null);
    }
  };

  const handleGenerateInvoiceDoc = async (order: OrderRecord) => {
    if (!googleUser) {
      setSyncStatus({ type: 'error', message: 'Please sign in with Google first.' });
      return;
    }
    setSyncLoading('invoice');
    setSyncStatus({ type: null, message: '' });
    try {
      const url = await generateOrderInvoiceDoc(order);
      setSyncStatus({
        type: 'success',
        message: `Invoice Google Doc for Order #${order.id.toUpperCase()} generated successfully!`,
        url
      });
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', message: err.message || 'Generation failed.' });
    } finally {
      setSyncLoading(null);
    }
  };

  // Order sorting/filtering/details state
  const [orderSortDir, setOrderSortDir] = React.useState<'desc' | 'asc'>('desc');
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>('all');
  const [orderSearch, setOrderSearch] = React.useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = React.useState<OrderRecord | null>(null);

  // Filtered and Sorted Orders memo
  const filteredAndSortedOrders = React.useMemo(() => {
    let result = [...orders];

    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      result = result.filter(o => 
        o.customerName.toLowerCase().includes(q) || 
        o.customerPhone.toLowerCase().includes(q) ||
        o.customerAddress.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }

    if (orderStatusFilter !== 'all') {
      result = result.filter(o => o.status === orderStatusFilter);
    }

    result.sort((a, b) => {
      if (orderSortDir === 'desc') {
        return b.createdAt - a.createdAt;
      } else {
        return a.createdAt - b.createdAt;
      }
    });

    return result;
  }, [orders, orderSearch, orderStatusFilter, orderSortDir]);

  // Add Product Form State
  const [name, setName] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [category, setCategory] = React.useState('Power bank');
  const [desc, setDesc] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [imageUrls, setImageUrls] = React.useState<string[]>([]);
  const [inStock, setInStock] = React.useState(true);
  const [stockQuantity, setStockQuantity] = React.useState('10');
  const [visible, setVisible] = React.useState(true);
  
  // Create Product Variants State List
  const [variants, setVariants] = React.useState<{
    name: string;
    sku: string;
    price: number;
    image: string;
    inStock: boolean;
  }[]>([]);
  
  // Single variant inputs for creation form
  const [varName, setVarName] = React.useState('');
  const [varSku, setVarSku] = React.useState('');
  const [varPrice, setVarPrice] = React.useState('');
  const [varImage, setVarImage] = React.useState('');
  const [varInStock, setVarInStock] = React.useState(true);

  // Custom category addition
  const [showNewCatInput, setShowNewCatInput] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');

  // Edit Product State
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editPrice, setEditPrice] = React.useState('');
  const [editCategory, setEditCategory] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');
  const [editImageUrl, setEditImageUrl] = React.useState('');
  const [editImageUrls, setEditImageUrls] = React.useState<string[]>([]);
  const [editStockQuantity, setEditStockQuantity] = React.useState('');

  // Edit Product Variants State List
  const [editVariants, setEditVariants] = React.useState<{
    id: string;
    name: string;
    sku: string;
    price: number;
    image: string;
    inStock: boolean;
  }[]>([]);

  // Single variant inputs for editing form
  const [editVarName, setEditVarName] = React.useState('');
  const [editVarSku, setEditVarSku] = React.useState('');
  const [editVarPrice, setEditVarPrice] = React.useState('');
  const [editVarImage, setEditVarImage] = React.useState('');
  const [editVarInStock, setEditVarInStock] = React.useState(true);
  const [settingsSuccess, setSettingsSuccess] = React.useState(false);

  // File Upload State & Refs for Create Product
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // File Upload State & Refs for Edit Product
  const [isEditDragging, setIsEditDragging] = React.useState(false);
  const editFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // 8K Resolution Interactive Lightbox State
  const [lightboxImageUrl, setLightboxImageUrl] = React.useState<string | null>(null);
  const [lightboxScale, setLightboxScale] = React.useState<number>(1);

  // Memory Optimization: track local object URLs so they can be revoked on unmount
  const objectUrlsRef = React.useRef<string[]>([]);
  const createLocalImageUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    return url;
  };

  React.useEffect(() => {
    return () => {
      // Cleanup all generated object URLs on unmount
      objectUrlsRef.current.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Helper function to read file as persistent Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const promises = (Array.from(files) as File[]).map((file) => fileToBase64(file));
      try {
        const base64s = await Promise.all(promises);
        setImageUrls((prev) => [...prev, ...base64s]);
      } catch (err) {
        console.error("Failed to convert files to base64", err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = (Array.from(files) as File[]).filter((file) => file.type.startsWith('image/'));
      const promises = imageFiles.map((file) => fileToBase64(file));
      try {
        const base64s = await Promise.all(promises);
        if (base64s.length > 0) {
          setImageUrls((prev) => [...prev, ...base64s]);
        }
      } catch (err) {
        console.error("Failed to convert dropped files to base64", err);
      }
    }
  };

  const handleRemoveImage = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const promises = (Array.from(files) as File[]).map((file) => fileToBase64(file));
      try {
        const base64s = await Promise.all(promises);
        setEditImageUrls((prev) => [...prev, ...base64s]);
      } catch (err) {
        console.error("Failed to convert edit files to base64", err);
      }
    }
  };

  const handleEditDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsEditDragging(true);
  };

  const handleEditDragLeave = () => {
    setIsEditDragging(false);
  };

  const handleEditDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsEditDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = (Array.from(files) as File[]).filter((file) => file.type.startsWith('image/'));
      const promises = imageFiles.map((file) => fileToBase64(file));
      try {
        const base64s = await Promise.all(promises);
        if (base64s.length > 0) {
          setEditImageUrls((prev) => [...prev, ...base64s]);
        }
      } catch (err) {
        console.error("Failed to convert dropped edit files to base64", err);
      }
    }
  };

  const handleEditRemoveImage = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    setEditImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Store Customizer Settings State
  const [storeName, setStoreName] = React.useState(settings.storeName);
  const [storeDesc, setStoreDesc] = React.useState(settings.storeDescription);
  const [whatsappNumber, setWhatsappNumber] = React.useState(settings.whatsappNumber);
  const [bannerColor, setBannerColor] = React.useState(settings.bannerColor);
  const [avatarText, setAvatarText] = React.useState(settings.avatarText);
  const [avatarSubtext, setAvatarSubtext] = React.useState(settings.avatarSubtext);
  const [hideOutOfStockSetting, setHideOutOfStockSetting] = React.useState(settings.hideOutOfStock ?? false);
  const [bannerVideo, setBannerVideo] = React.useState(settings.bannerVideo || '');
  const [isBannerDragging, setIsBannerDragging] = React.useState(false);
  const bannerVideoInputRef = React.useRef<HTMLInputElement | null>(null);

  const [avatarImage, setAvatarImage] = React.useState(settings.avatarImage || '');
  const [isAvatarDragging, setIsAvatarDragging] = React.useState(false);
  const avatarImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const [instagramUsername, setInstagramUsername] = React.useState(settings.instagramUsername || '');
  const [storeLocationUrl, setStoreLocationUrl] = React.useState(settings.storeLocationUrl || '');
  const [phoneCallNumber, setPhoneCallNumber] = React.useState(settings.phoneCallNumber || '');

  // Sync state if settings changed
  React.useEffect(() => {
    setStoreName(settings.storeName);
    setStoreDesc(settings.storeDescription);
    setWhatsappNumber(settings.whatsappNumber);
    setBannerColor(settings.bannerColor);
    setAvatarText(settings.avatarText);
    setAvatarSubtext(settings.avatarSubtext);
    setHideOutOfStockSetting(settings.hideOutOfStock ?? false);
    setBannerVideo(settings.bannerVideo || '');
    setAvatarImage(settings.avatarImage || '');
    setInstagramUsername(settings.instagramUsername || '');
    setStoreLocationUrl(settings.storeLocationUrl || '');
    setPhoneCallNumber(settings.phoneCallNumber || '');
  }, [settings]);

  const handleAvatarImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setAvatarImage(base64);
      } catch (err) {
        console.error("Failed to convert avatar image to base64", err);
      }
    }
  };

  const handleAvatarImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsAvatarDragging(true);
  };

  const handleAvatarImageDragLeave = () => {
    setIsAvatarDragging(false);
  };

  const handleAvatarImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsAvatarDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await fileToBase64(file);
        setAvatarImage(base64);
      } catch (err) {
        console.error("Failed to convert dropped avatar image to base64", err);
      }
    }
  };

  const handleClearAvatarImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAvatarImage('');
    if (avatarImageInputRef.current) {
      avatarImageInputRef.current.value = '';
    }
  };

  const handleBannerVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setBannerVideo(base64);
      } catch (err) {
        console.error("Failed to convert banner video to base64", err);
      }
    }
  };

  const handleBannerVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(true);
  };

  const handleBannerVideoDragLeave = () => {
    setIsBannerDragging(false);
  };

  const handleBannerVideoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsBannerDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      try {
        const base64 = await fileToBase64(file);
        setBannerVideo(base64);
      } catch (err) {
        console.error("Failed to convert dropped banner video to base64", err);
      }
    }
  };

  const handleClearBannerVideo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBannerVideo('');
    if (bannerVideoInputRef.current) {
      bannerVideoInputRef.current.value = '';
    }
  };

  // Handle Preset Image click for easier demo
  const handlePresetImage = (url: string) => {
    setImageUrl(url);
    setImageUrls((prev) => prev.includes(url) ? prev : [...prev, url]);
  };

  const handleAddVariantToForm = () => {
    if (!varName.trim() || !varPrice) return;
    setVariants((prev) => [
      ...prev,
      {
        name: varName.trim(),
        sku: varSku.trim() || 'SKU-' + Math.floor(Math.random() * 90000 + 10000),
        price: parseFloat(varPrice),
        image: varImage.trim(),
        inStock: varInStock,
      }
    ]);
    // reset single inputs
    setVarName('');
    setVarSku('');
    setVarPrice('');
    setVarImage('');
    setVarInStock(true);
  };

  const handleRemoveVariantFromForm = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddVariantToEdit = () => {
    if (!editVarName.trim() || !editVarPrice) return;
    setEditVariants((prev) => [
      ...prev,
      {
        id: 'var-' + Date.now() + Math.floor(Math.random() * 100).toString(),
        name: editVarName.trim(),
        sku: editVarSku.trim() || 'SKU-' + Math.floor(Math.random() * 90000 + 10000),
        price: parseFloat(editVarPrice),
        image: editVarImage.trim(),
        inStock: editVarInStock,
      }
    ]);
    // reset inputs
    setEditVarName('');
    setEditVarSku('');
    setEditVarPrice('');
    setEditVarImage('');
    setEditVarInStock(true);
  };

  const handleRemoveVariantFromEdit = (id: string) => {
    setEditVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    const finalImages = imageUrls.length > 0 ? imageUrls : (imageUrl.trim() ? [imageUrl.trim()] : []);

    onAddProduct({
      name: name.trim(),
      price: parseFloat(price),
      category,
      desc: desc.trim(),
      image: finalImages[0] || '',
      images: finalImages,
      inStock: inStock && (stockQuantity ? parseInt(stockQuantity) > 0 : true),
      stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
      visible,
      variants: variants.map((v) => ({ ...v, id: 'var-' + Math.floor(Math.random() * 100000).toString() })),
    });

    // Reset Form
    setName('');
    setPrice('');
    setDesc('');
    setImageUrl('');
    setImageUrls([]);
    setInStock(true);
    setStockQuantity('10');
    setVisible(true);
    setVariants([]);
  };

  const handleStartEdit = (p: Product) => {
    setEditingProductId(p.id);
    setEditName(p.name);
    setEditPrice(p.price.toString());
    setEditCategory(p.category);
    setEditDesc(p.desc);
    setEditImageUrl(p.image || '');
    setEditImageUrls(p.images || (p.image ? [p.image] : []));
    setEditVariants(p.variants || []);
    setEditStockQuantity(p.stockQuantity !== undefined ? p.stockQuantity.toString() : '10');
  };

  const handleSaveEdit = (p: Product) => {
    if (!editName.trim() || !editPrice) return;
    const parsedStock = editStockQuantity ? parseInt(editStockQuantity) : undefined;
    const finalImages = editImageUrls.length > 0 ? editImageUrls : (editImageUrl.trim() ? [editImageUrl.trim()] : []);

    onUpdateProduct({
      ...p,
      name: editName.trim(),
      price: parseFloat(editPrice),
      category: editCategory,
      desc: editDesc.trim(),
      image: finalImages[0] || '',
      images: finalImages,
      variants: editVariants,
      stockQuantity: parsedStock,
      inStock: parsedStock !== undefined ? parsedStock > 0 : p.inStock,
    });
    setEditingProductId(null);
    setEditVariants([]);
    setEditStockQuantity('');
    setEditImageUrls([]);
  };

  const handleSaveSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      storeName: storeName.trim(),
      storeDescription: storeDesc.trim(),
      whatsappNumber: whatsappNumber.trim(),
      currency: 'USD',
      bannerColor: bannerColor.trim(),
      avatarText: avatarText.trim(),
      avatarSubtext: avatarSubtext.trim(),
      avatarImage,
      hideOutOfStock: hideOutOfStockSetting,
      bannerVideo,
      instagramUsername: instagramUsername.trim(),
      storeLocationUrl: storeLocationUrl.trim(),
      phoneCallNumber: phoneCallNumber.trim(),
    });
    setSettingsSuccess(true);
    setTimeout(() => {
      setSettingsSuccess(false);
    }, 3000);
  };

  const exportOrdersToCSV = () => {
    if (orders.length === 0) return;

    // CSV headers
    const headers = [
      'Order ID',
      'Date & Time',
      'Customer Name',
      'Customer Phone',
      'Customer Address',
      'Items Purchased',
      'Total Price',
      'Status'
    ];

    // Helper to escape CSV cell values
    const escapeCSV = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = orders.map(order => {
      const formattedDate = new Date(order.createdAt).toLocaleString();
      const itemsDescription = order.items
        .map(item => {
          const variantSuffix = item.variantName ? ` (${item.variantName})` : '';
          return `${item.quantity}x ${item.productName}${variantSuffix}`;
        })
        .join('; '); // Semicolon works beautifully to group items without breaking column boundaries

      return [
        order.id,
        formattedDate,
        order.customerName,
        order.customerPhone,
        order.customerAddress,
        itemsDescription,
        `$${order.totalPrice.toFixed(2)}`,
        order.status
      ];
    });

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `store_orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowNewCatInput(false);
    }
  };

  // Preset image collections
  const imagePresets = [
    { name: 'Pocket Powerbank', url: 'https://images.unsplash.com/photo-1609592424085-f5596667ff46?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Grooming Razor', url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Transparent Charger', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Premium Cable', url: 'https://images.unsplash.com/photo-1541667590928-18634acfea58?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' }
  ];

  // Calculated Stats
  const stats = React.useMemo(() => {
    const totalProducts = products.length;
    const activeOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'Completed');
    const revenue = completedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    return { totalProducts, activeOrders, revenue };
  }, [products, orders]);

  return (
    <div className="mx-auto w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden my-4">
      
      {/* Top Banner Header with live Video background if uploaded */}
      <div className="bg-[#0F172A] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 shrink-0 relative overflow-hidden min-h-[90px]">
        {bannerVideo && (
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            src={bannerVideo}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )}
        {/* Transparent overlay for high readability */}
        {bannerVideo && (
          <div className="absolute inset-0 bg-slate-950/60 z-0" />
        )}

        <div className="flex items-center gap-3 z-10">
          {avatarImage ? (
            <img 
              src={avatarImage} 
              alt="Logo" 
              className="w-11 h-11 object-cover rounded-xl shadow-md border border-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="bg-[#FCD34D] text-slate-900 font-black p-2.5 rounded-lg leading-none flex items-center justify-center font-display text-lg shadow-sm">
              A
            </div>
          )}
          <div>
            <h1 className="font-display font-black text-lg tracking-tight text-white uppercase">
              Admin Control Center
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
              ALAA E-Commerce System
            </p>
          </div>
        </div>

        {/* Inner Tabs navigation */}
        <div className="flex bg-[#1E293B]/80 backdrop-blur-xs p-1 rounded-xl border border-white/5 self-start md:self-auto z-10">
          <button
            onClick={() => setActiveTab('products')}
            id="tab-btn-products"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'products'
                ? 'bg-[#FCD34D] text-[#0F172A] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Products</span>
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            id="tab-btn-orders"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === 'orders'
                ? 'bg-[#FCD34D] text-[#0F172A] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Orders</span>
            {orders.filter(o => o.status === 'Pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {orders.filter(o => o.status === 'Pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            id="tab-btn-settings"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-[#FCD34D] text-[#0F172A] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Store Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('workspace')}
            id="tab-btn-workspace"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'workspace'
                ? 'bg-[#FCD34D] text-[#0F172A] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Docs & Sheets</span>
          </button>
        </div>
      </div>

      {/* Overview Analytics Banner */}
      <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 border-b border-slate-100">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catalog</p>
            <p className="text-xl font-black text-slate-800 font-display mt-0.5">{stats.totalProducts} Items</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders</p>
            <p className="text-xl font-black text-slate-800 font-display mt-0.5">{stats.activeOrders} Total</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="bg-green-50 p-2.5 rounded-xl text-green-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
            <p className="text-xl font-black text-slate-800 font-display mt-0.5">${stats.revenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER BODY */}
      <div className="p-6 flex-1 bg-white">
        
        {/* ========================================== */}
        {/* TAB 1: ADD & MANAGE PRODUCTS               */}
        {/* ========================================== */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT SIDE: ADD PRODUCT FORM */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-500" />
                  <span>Add New Product</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in your product coordinates to deploy to the live store link.
                </p>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Product Name *
                  </label>
                  <input 
                    type="text" 
                    id="product-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                    placeholder="e.g. Green Lion Pro Trim Duo" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none text-sm"
                  />
                </div>

                {/* Price and Category Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Price (USD) *
                    </label>
                    <input 
                      type="number" 
                      id="product-price-input"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      step="0.01" 
                      required 
                      placeholder="e.g. 25.00" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                      <span>Category</span>
                      <button 
                        type="button"
                        onClick={() => setShowNewCatInput(!showNewCatInput)}
                        className="text-[10px] text-amber-600 hover:underline font-bold"
                      >
                        {showNewCatInput ? 'Cancel' : '+ New'}
                      </button>
                    </label>
                    
                    {!showNewCatInput ? (
                      <div>
                        <select 
                          id="product-category-select"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none text-sm font-semibold text-slate-750"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        
                        {/* Quick Presets Selection Grid */}
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Quick Preset Selectors:</span>
                          <div className="flex flex-wrap gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-150 max-h-24 overflow-y-auto">
                            {['Power Bank', 'Watch', 'Mobile', 'Cables', 'Stand', 'Projector', 'Gadgets', 'Charger', 'DJI', 'Hyperx', 'Headphones'].map((item) => {
                              const exists = categories.includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    if (!exists) {
                                      onAddCategory(item);
                                    }
                                    setCategory(item);
                                  }}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                                    category === item 
                                      ? 'bg-amber-400 text-slate-900 border border-amber-500 shadow-sm' 
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {item} {!exists && '+'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            placeholder="Category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <button 
                            type="button" 
                            onClick={handleAddCategorySubmit}
                            className="px-2.5 bg-amber-400 text-slate-900 rounded-lg text-xs font-bold"
                          >
                            Add
                          </button>
                        </div>
                        
                        {/* Quick Presets List for easy adding */}
                        <div className="mt-1 space-y-1">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Quick Preset Creator:</span>
                          <div className="flex flex-wrap gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-150 max-h-24 overflow-y-auto">
                            {['Power Bank', 'Watch', 'Mobile', 'Cables', 'Stand', 'Projector', 'Gadgets', 'Charger', 'DJI', 'Hyperx', 'Headphones'].map((item) => {
                              const exists = categories.includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    if (!exists) {
                                      onAddCategory(item);
                                    }
                                    setCategory(item);
                                    setShowNewCatInput(false);
                                  }}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                                    exists 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-white hover:bg-amber-50 text-slate-600 border border-slate-200 hover:border-amber-300'
                                  }`}
                                >
                                  {item} {exists ? '✓' : '+'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                 {/* Photo / Image Local File Upload Dropzone */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Product Image
                  </label>
                  
                  {/* Drag and drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                      isDragging 
                        ? 'border-amber-400 bg-amber-50/50' 
                        : imageUrls.length > 0 
                          ? 'border-slate-200 bg-slate-50/50' 
                          : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {/* Hidden file input with multiple allowed */}
                    <input 
                      type="file" 
                      id="form-image-file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden" 
                      multiple
                    />

                    {imageUrls.length > 0 ? (
                      <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* 8K Ultra-HD Active Preview Viewport */}
                        <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900 aspect-video flex flex-col items-center justify-center group shadow-md p-1">
                          <img 
                            src={imageUrls[0]} 
                            alt="Active 8K UHD Preview"
                            className="max-h-full max-w-full object-contain select-none image-render-auto rounded-lg"
                            style={{ imageRendering: 'auto' }}
                          />
                          <div className="absolute top-3 left-3 bg-slate-950/90 text-[#38BDF8] text-[9px] font-black px-2 py-1 rounded-md border border-sky-500/30 flex items-center gap-1 shadow-md select-none uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
                            <span>8K UHD Crisp Render</span>
                          </div>
                          
                          <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxImageUrl(imageUrls[0]);
                                setLightboxScale(1);
                              }}
                              className="bg-white hover:bg-slate-50 text-slate-900 font-black text-[9px] px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-200 flex items-center gap-1 uppercase tracking-wider select-none transition"
                            >
                              <Maximize2 className="w-3 h-3 text-slate-700" />
                              <span>Inspect 8K Detail</span>
                            </button>
                          </div>
                        </div>

                        {/* Thumbnails grid */}
                        <div className="grid grid-cols-4 gap-2.5">
                          {imageUrls.map((url, idx) => (
                            <div key={idx} className="relative group aspect-square bg-white border border-slate-200 rounded-lg p-1 shadow-sm overflow-hidden flex items-center justify-center">
                              <img 
                                src={url} 
                                alt={`Preview ${idx + 1}`} 
                                className="max-h-full max-w-full object-contain rounded cursor-pointer hover:scale-105 transition duration-150"
                                onClick={() => {
                                  // Move clicked thumbnail to index 0 (main active preview position)
                                  const updated = [...imageUrls];
                                  const temp = updated[0];
                                  updated[0] = updated[idx];
                                  updated[idx] = temp;
                                  setImageUrls(updated);
                                }}
                              />
                              <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider">
                                {idx === 0 ? 'Active' : `${idx + 1}`}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveImage(e, idx)}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                                title="Remove Image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center justify-center gap-2 pt-1 border-t border-slate-100/50">
                          <span className="font-semibold text-slate-700">{imageUrls.length} Image(s) Selected</span>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageUrls([]);
                              setImageUrl('');
                            }}
                            className="text-red-500 hover:text-red-700 font-extrabold text-[10px] uppercase tracking-wide bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition"
                          >
                            Clear All
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">
                          Click above thumbnails to set active 8K preview. Click outer dropzone area to add more images.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 space-y-2">
                        <Image className="w-8 h-8 text-slate-400" />
                        <p className="text-xs text-slate-600 font-medium">
                          Click or drag to upload product images (multiple allowed)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          PNG, JPG, or GIF up to 5MB
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Preset Quick select for demo */}
                  <div className="mt-2.5">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      Quick Demo Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {imagePresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handlePresetImage(preset.url)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md border border-slate-200 transition-all font-medium"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea 
                    id="product-desc-textarea"
                    rows={3} 
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Optional specs, color options, or warranties details buyers should know..." 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none text-sm"
                  />
                </div>

                {/* Product Variants (Add Product Form) */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Product Options / Variants
                  </span>
                  
                  {variants.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto bg-white border border-slate-100 rounded-lg p-2">
                      {variants.map((v, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded border-b border-slate-100 last:border-0">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-800">{v.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">SKU: {v.sku}</span>
                            <span className="text-[10px] text-slate-500 ml-2">${v.price.toFixed(2)}</span>
                            {!v.inStock && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded ml-2 uppercase font-extrabold">No Stock</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantFromForm(i)}
                            className="text-red-400 hover:text-red-600 font-bold px-1"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Add New Variant option:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={varName}
                        onChange={(e) => setVarName(e.target.value)}
                        placeholder="Option Name (e.g. 20,000mAh Black)"
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <input
                        type="text"
                        value={varSku}
                        onChange={(e) => setVarSku(e.target.value)}
                        placeholder="SKU (e.g. PB-20K-BLK)"
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <input
                        type="number"
                        value={varPrice}
                        onChange={(e) => setVarPrice(e.target.value)}
                        step="0.01"
                        placeholder="Variant Price ($)"
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-600 uppercase">
                        <input
                          type="checkbox"
                          checked={varInStock}
                          onChange={(e) => setVarInStock(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-500 rounded focus:ring-amber-400"
                        />
                        <span>In Stock</span>
                      </label>
                    </div>
                    <input
                      type="url"
                      value={varImage}
                      onChange={(e) => setVarImage(e.target.value)}
                      placeholder="Variant Image URL (Optional)"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariantToForm}
                      disabled={!varName.trim() || !varPrice}
                      className="w-full bg-slate-800 text-white text-xs py-2 rounded-lg font-bold hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                      + Add Option
                    </button>
                  </div>
                </div>

                {/* Stock Quantity Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Stock Quantity
                  </label>
                  <input 
                    type="number" 
                    id="product-stock-quantity-input"
                    value={stockQuantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStockQuantity(val);
                      if (val !== '' && parseInt(val) === 0) {
                        setInStock(false);
                      } else if (val !== '' && parseInt(val) > 0) {
                        setInStock(true);
                      }
                    }}
                    placeholder="e.g. 10" 
                    min="0"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none text-sm font-semibold"
                  />
                </div>

                {/* In stock and visible toggles */}
                <div className="flex items-center gap-6 pt-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-600 uppercase">
                    <input 
                      type="checkbox" 
                      id="product-stock-checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                      className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-400"
                    /> 
                    <span>In Stock</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-600 uppercase">
                    <input 
                      type="checkbox" 
                      id="product-visible-checkbox"
                      checked={visible}
                      onChange={(e) => setVisible(e.target.checked)}
                      className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-400"
                    /> 
                    <span>Visible in Catalog</span>
                  </label>
                </div>

                {/* Submits */}
                <div className="pt-2 flex gap-2">
                  <button 
                    type="submit" 
                    id="product-submit-btn"
                    className="flex-1 bg-[#FCD34D] text-[#0F172A] font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-md shadow-yellow-500/10 font-display text-xs uppercase tracking-wider"
                  >
                    Add Product
                  </button>
                  <button 
                    type="reset" 
                    onClick={() => {
                      setName('');
                      setPrice('');
                      setDesc('');
                      setImageUrl('');
                      setInStock(true);
                      setVisible(true);
                    }}
                    className="px-5 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-500 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT SIDE: MANAGE PRODUCTS LIST */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h2 className="text-lg font-extrabold text-slate-900 font-display">
                    Manage Products
                  </h2>
                  <p className="text-xs text-slate-500">
                    Audit existing catalog records. Edit details or remove items instantly.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  {products.length} Products
                </span>
              </div>

              {/* Google Sync Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 pl-1 text-left">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Google Sync:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportProductsToSheets}
                    disabled={!googleUser || syncLoading !== null}
                    title={!googleUser ? "Sign in to Google inside the Docs & Sheets tab first" : "Export current list to Google Sheets"}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-2.5 h-2.5" />
                    <span>{syncLoading === 'products' ? 'Syncing...' : 'Sync to Sheets'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateInventoryReportDoc}
                    disabled={!googleUser || syncLoading !== null}
                    title={!googleUser ? "Sign in to Google inside the Docs & Sheets tab first" : "Generate inventory report in Google Docs"}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-2.5 h-2.5" />
                    <span>{syncLoading === 'report' ? 'Drafting...' : 'Draft Report Doc'}</span>
                  </button>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold text-slate-600">No products in your catalog yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Use the form on the left to add your first product!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {products.map((item) => {
                    const isEditing = editingProductId === item.id;
                    const isLowStock = item.stockQuantity !== undefined && item.stockQuantity <= 5;
                    return (
                      <div 
                        key={item.id}
                        className={`p-4 border rounded-2xl transition-all ${
                          isEditing 
                            ? 'border-amber-400 bg-amber-50/20' 
                            : isLowStock
                              ? 'border-red-350 bg-red-50/30 hover:border-red-400 hover:shadow-sm'
                              : 'border-slate-150 bg-white hover:border-slate-250 hover:shadow-xs'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Product Name</label>
                                <input 
                                  type="text" 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold mt-0.5"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Price ($)</label>
                                <input 
                                  type="number" 
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold mt-0.5"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                                <select 
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs mt-0.5"
                                >
                                  {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Product Image</label>
                                <div
                                  onDragOver={handleEditDragOver}
                                  onDragLeave={handleEditDragLeave}
                                  onDrop={handleEditDrop}
                                  onClick={() => editFileInputRef.current?.click()}
                                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200 ${
                                    isEditDragging 
                                      ? 'border-amber-400 bg-amber-50/50' 
                                      : editImageUrls.length > 0 
                                        ? 'border-slate-200 bg-slate-50/50' 
                                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                                  }`}
                                >
                                  {/* Hidden edit file input with multiple allowed */}
                                  <input 
                                    type="file" 
                                    id="edit-form-image-file" 
                                    accept="image/*" 
                                    ref={editFileInputRef}
                                    onChange={handleEditFileChange}
                                    className="hidden" 
                                    multiple
                                  />

                                  {editImageUrls.length > 0 ? (
                                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                      {/* 8K Ultra-HD Active Preview Viewport (Edit Form) */}
                                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900 aspect-video flex flex-col items-center justify-center group shadow-md p-1">
                                        <img 
                                          src={editImageUrls[0]} 
                                          alt="Active Edit 8K UHD Preview"
                                          className="max-h-full max-w-full object-contain select-none image-render-auto rounded-lg"
                                          style={{ imageRendering: 'auto' }}
                                        />
                                        <div className="absolute top-2.5 left-2.5 bg-slate-950/90 text-[#38BDF8] text-[9px] font-black px-2 py-0.5 rounded border border-sky-500/30 flex items-center gap-1 shadow-md select-none uppercase tracking-widest">
                                          <span className="w-1 h-1 bg-sky-400 rounded-full animate-pulse" />
                                          <span>8K UHD Crisp Render</span>
                                        </div>
                                        
                                        <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setLightboxImageUrl(editImageUrls[0]);
                                              setLightboxScale(1);
                                            }}
                                            className="bg-white hover:bg-slate-50 text-slate-900 font-black text-[9px] px-2 py-1 rounded shadow-lg border border-slate-200 flex items-center gap-1 uppercase tracking-wider select-none transition"
                                          >
                                            <Maximize2 className="w-2.5 h-2.5 text-slate-700" />
                                            <span>Inspect 8K Detail</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Thumbnails grid */}
                                      <div className="grid grid-cols-4 gap-2">
                                        {editImageUrls.map((url, idx) => (
                                          <div key={idx} className="relative group aspect-square bg-white border border-slate-200 rounded-lg p-1 shadow-sm overflow-hidden flex items-center justify-center">
                                            <img 
                                              src={url} 
                                              alt={`Preview ${idx + 1}`} 
                                              className="max-h-full max-w-full object-contain rounded cursor-pointer hover:scale-105 transition duration-150"
                                              onClick={() => {
                                                // Swap clicked thumbnail to index 0 (main active preview position)
                                                const updated = [...editImageUrls];
                                                const temp = updated[0];
                                                updated[0] = updated[idx];
                                                updated[idx] = temp;
                                                setEditImageUrls(updated);
                                              }}
                                            />
                                            <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider">
                                              {idx === 0 ? 'Active' : `${idx + 1}`}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => handleEditRemoveImage(e, idx)}
                                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                                              title="Remove Image"
                                            >
                                              <X className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1 border-t border-slate-100/50">
                                        <span className="font-semibold text-slate-700">{editImageUrls.length} Image(s)</span>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditImageUrls([]);
                                            setEditImageUrl('');
                                          }}
                                          className="text-red-500 hover:text-red-700 font-extrabold text-[9px] uppercase tracking-wide bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition"
                                        >
                                          Clear All
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center space-y-1 py-1">
                                      <Image className="w-6 h-6 text-slate-400" />
                                      <p className="text-[11px] text-slate-600 font-medium">
                                        Click or drag to upload product images (multiple allowed)
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Stock Quantity</label>
                              <input 
                                type="number" 
                                value={editStockQuantity}
                                onChange={(e) => setEditStockQuantity(e.target.value)}
                                min="0"
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs mt-0.5 font-semibold"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                              <textarea 
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                rows={2}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs mt-0.5"
                              />
                            </div>

                            {/* Manage variants of editing product */}
                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2 mt-1">
                              <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                Options / Variants ({editVariants.length})
                              </span>
                              
                              {editVariants.length > 0 && (
                                <div className="space-y-1 bg-white border border-slate-100 rounded p-1.5 max-h-28 overflow-y-auto">
                                  {editVariants.map((ev) => (
                                    <div key={ev.id} className="flex justify-between items-center text-[11px] p-1 border-b border-slate-50 last:border-0">
                                      <div className="flex-1 min-w-0 text-left">
                                        <span className="font-semibold text-slate-700">{ev.name}</span>
                                        <span className="text-[9px] text-slate-400 font-mono ml-2">SKU: {ev.sku}</span>
                                        <span className="text-[10px] font-bold text-slate-800 ml-2">${ev.price.toFixed(2)}</span>
                                        {!ev.inStock && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded ml-2 uppercase font-extrabold">No Stock</span>}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVariantFromEdit(ev.id)}
                                        className="text-red-500 hover:text-red-700 text-[10px]"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                                <p className="text-[9px] text-slate-400 font-bold uppercase text-left">Add Variant Option:</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <input
                                    type="text"
                                    value={editVarName}
                                    onChange={(e) => setEditVarName(e.target.value)}
                                    placeholder="Option Name (e.g. 10,000mAh)"
                                    className="p-1.5 bg-white border border-slate-200 rounded text-[11px] outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={editVarSku}
                                    onChange={(e) => setEditVarSku(e.target.value)}
                                    placeholder="Option SKU (Optional)"
                                    className="p-1.5 bg-white border border-slate-200 rounded text-[11px] outline-none font-mono"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 items-center">
                                  <input
                                    type="number"
                                    value={editVarPrice}
                                    onChange={(e) => setEditVarPrice(e.target.value)}
                                    step="0.01"
                                    placeholder="Option Price ($)"
                                    className="p-1.5 bg-white border border-slate-200 rounded text-[11px] outline-none"
                                  />
                                  <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-500 uppercase">
                                    <input
                                      type="checkbox"
                                      checked={editVarInStock}
                                      onChange={(e) => setEditVarInStock(e.target.checked)}
                                      className="w-3 h-3 text-amber-500 rounded focus:ring-amber-400"
                                    />
                                    <span>In Stock</span>
                                  </label>
                                </div>
                                <input
                                  type="url"
                                  value={editVarImage}
                                  onChange={(e) => setEditVarImage(e.target.value)}
                                  placeholder="Option Image URL (Optional)"
                                  className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddVariantToEdit}
                                  disabled={!editVarName.trim() || !editVarPrice}
                                  className="w-full bg-slate-700 text-white text-[10px] py-1.5 rounded font-bold hover:bg-slate-600 transition disabled:opacity-50"
                                >
                                  + Add Variant Option
                                </button>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={() => handleSaveEdit(item)}
                                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Save
                              </button>
                              <button
                                onClick={() => setEditingProductId(null)}
                                className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 justify-between items-start">
                            <div className="flex gap-3 min-w-0">
                              {/* Product Thumbnail representation */}
                              <div className="w-14 h-14 bg-slate-50 border border-slate-150 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="max-h-full max-w-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[9px] font-extrabold text-slate-400">Box</span>
                                )}
                              </div>
                              
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    {item.category}
                                  </span>
                                  {!item.inStock && (
                                    <span id={`out-of-stock-${item.id}`} className="text-[8px] bg-red-50 text-red-600 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                      Out of Stock
                                    </span>
                                  )}
                                  {isLowStock && (
                                    <span id={`low-stock-red-${item.id}`} className="text-[8px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 border border-red-700">
                                      ⚠️ Low Stock ({item.stockQuantity} Left)
                                    </span>
                                  )}
                                  {!item.visible && (
                                    <span className="text-[8px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                      <EyeOff className="w-2.5 h-2.5" /> Hidden
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm truncate max-w-xs md:max-w-md mt-0.5">
                                  {item.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <p className="text-xs font-display font-extrabold text-slate-900">
                                    ${item.price.toFixed(2)}
                                  </p>
                                  <span className="text-[10px] text-slate-400">|</span>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    Stock: <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>{item.stockQuantity !== undefined ? `${item.stockQuantity} units` : 'Unlimited'}</span>
                                  </p>
                                </div>

                                {/* Variants Summary display */}
                                {item.variants && item.variants.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 mt-2">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Options:</span>
                                    {item.variants.map((v) => (
                                      <span key={v.id} className="text-[9px] bg-slate-50 text-slate-700 px-1.5 py-0.2 rounded border border-slate-150">
                                        {v.name} (${v.price.toFixed(2)})
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Reviews & Ratings Summary for Admin */}
                                {item.reviews && item.reviews.length > 0 ? (
                                  <div className="mt-3.5 border-t border-slate-100 pt-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                                      Customer Reviews ({item.reviews.length})
                                    </span>
                                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                                      {item.reviews.map((rev) => (
                                        <div key={rev.id} className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100 text-left">
                                          <div className="flex justify-between items-center text-slate-600 font-bold">
                                            <span>{rev.customerName || 'Anonymous'}</span>
                                            <span className="text-amber-500">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                                          </div>
                                          <p className="text-slate-500 italic mt-0.5">"{rev.comment}"</p>
                                          <span className="text-[8px] text-slate-400 font-mono mt-0.5 block">{new Date(rev.createdAt).toLocaleDateString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic mt-2 text-left">No reviews yet for this product.</p>
                                )}
                              </div>
                            </div>

                            {/* Control toggles and actions */}
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  title="Edit details"
                                  className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-250 transition-all"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteProduct(item.id)}
                                  title="Delete product"
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 border border-transparent hover:border-red-150 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onUpdateProduct({ ...item, inStock: !item.inStock })}
                                  className={`text-[9px] font-bold px-2 py-1 rounded border transition-colors ${
                                    item.inStock 
                                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  }`}
                                >
                                  {item.inStock ? 'In Stock' : 'No Stock'}
                                </button>

                                <button
                                  onClick={() => onUpdateProduct({ ...item, visible: !item.visible })}
                                  className={`text-[9px] font-bold px-2 py-1 rounded border transition-colors ${
                                    item.visible 
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  {item.visible ? 'Visible' : 'Hidden'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
          {/* ========================================== */}
        {/* TAB 2: STORE ORDERS LIST & HISTORY         */}
        {/* ========================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-500" />
                  <span>Store Order History</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Browse, search, and manage customer orders placed through the storefront via WhatsApp.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={exportOrdersToCSV}
                  disabled={orders.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl shadow-xs transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Export all orders to a CSV file"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportOrdersToSheets}
                  disabled={!googleUser || orders.length === 0 || syncLoading !== null}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer"
                  title={!googleUser ? "Sign in to Google inside the Docs & Sheets tab first" : "Sync orders with Google Sheets live"}
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                  <span>{syncLoading === 'orders' ? 'Syncing...' : 'Sync to Sheets'}</span>
                </button>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  {orders.length} Records
                </span>
              </div>
            </div>

            {/* Filter and Sort Controls Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
              {/* Search Customer Input */}
              <div className="flex-1">
                <input
                  type="text"
                  id="order-search-filter-input"
                  placeholder="Search customer name, phone, or address..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full p-2 px-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-300 font-semibold"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                  <select
                    id="order-status-filter-select"
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold cursor-pointer focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="all">All Orders</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Date Sorting */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort Date:</span>
                  <select
                    id="order-sort-dir-select"
                    value={orderSortDir}
                    onChange={(e) => setOrderSortDir(e.target.value as 'asc' | 'desc')}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold cursor-pointer focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredAndSortedOrders.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 max-w-lg mx-auto">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 text-sm">No matching orders found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {orders.length === 0 
                    ? "Once users place an order via the customer storefront, details are saved in this history."
                    : "Try adjusting your search query or filters to find the record you are looking for."}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs">
                {filteredAndSortedOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-white hover:bg-slate-50/50 transition duration-150">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          #{order.id.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-450 font-medium">
                          {new Date(order.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Status dropdown */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                          <select
                            value={order.status}
                            onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as any)}
                            className={`text-xs font-bold p-1 px-1.5 rounded-lg border outline-none ${
                              order.status === 'Pending' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : order.status === 'Completed'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* View Full Details Button */}
                        <button
                          onClick={() => setSelectedOrderDetail(order)}
                          id={`btn-view-details-${order.id}`}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm uppercase tracking-wider"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-50 pt-3">
                      {/* Customer Info */}
                      <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                          👤 Customer Info
                        </p>
                        <p className="text-xs font-bold text-slate-800">{order.customerName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{order.customerPhone}</p>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2" title={order.customerAddress}>
                          {order.customerAddress}
                        </p>
                      </div>

                      {/* Items & Price */}
                      <div className="md:col-span-2 space-y-1.5">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider text-left">
                          🛍️ Ordered Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
                        </p>
                        <div className="space-y-1 text-left">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-slate-600 font-medium">
                                <strong className="text-slate-900 font-bold">{item.quantity}x</strong> {item.productName}
                                {item.variantName ? <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded ml-1 font-bold">{item.variantName}</span> : null}
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                ${(item.priceAtOrder * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center mt-2">
                          <span className="text-xs font-bold text-slate-500">Order Revenue:</span>
                          <span className="text-sm font-black text-slate-900 font-display">
                            ${order.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: STORE CUSTOMIZATION SETTINGS        */}
        {/* ========================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-500" />
                <span>Branding & Coordinates Customizer</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize your store name, description, WhatsApp destination number, and branding appearance.
              </p>
            </div>

            <form onSubmit={handleSaveSettingsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Store Title Name *
                  </label>
                  <input 
                    type="text" 
                    id="setting-storename-input"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none text-sm font-bold"
                  />
                </div>

                {/* WhatsApp number */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>WhatsApp Phone Number *</span>
                    <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" title="Enter standard country-code format (e.g., 96170123456)" />
                  </label>
                  <input 
                    type="tel" 
                    id="setting-whatsapp-input"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    required
                    placeholder="96170123456"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none text-sm font-mono"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                    No symbols or plus sign (e.g., 96170123456 for Lebanon).
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Store Description
                </label>
                <textarea 
                  id="setting-desc-input"
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none text-sm"
                />
              </div>

              {/* Instagram Link-in-Bio Connectivity Coordinates */}
              <div className="bg-[#FAF9F6] border border-slate-200 p-4 rounded-xl space-y-3.5">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">Instagram "Link-in-Bio" Optimization</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Instagram Username */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Instagram Username
                    </label>
                    <input 
                      type="text"
                      id="setting-instagram-username"
                      value={instagramUsername}
                      onChange={(e) => setInstagramUsername(e.target.value)}
                      placeholder="onlymobilestore.lb"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none text-xs font-medium"
                    />
                  </div>

                  {/* Direct Dial / Telephone Call Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Voice Call Hotline
                    </label>
                    <input 
                      type="tel"
                      id="setting-phone-call-number"
                      value={phoneCallNumber}
                      onChange={(e) => setPhoneCallNumber(e.target.value)}
                      placeholder="96170123456"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none text-xs font-medium"
                    />
                  </div>

                  {/* Store Maps / Google Location Link */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Google Maps URL
                    </label>
                    <input 
                      type="url"
                      id="setting-location-url"
                      value={storeLocationUrl}
                      onChange={(e) => setStoreLocationUrl(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none text-xs font-medium"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  These coordinates populate the fast-action connection buttons at the top of your mobile Link-in-Bio page, boosting customer direct communication and local store traffic.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {/* Banner Color */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Banner Theme Color
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      id="setting-color-picker"
                      value={bannerColor.startsWith('#') ? bannerColor : '#FCD34D'}
                      onChange={(e) => setBannerColor(e.target.value)}
                      className="w-10 h-10 border border-slate-300 rounded-lg cursor-pointer flex-shrink-0"
                    />
                    <input 
                      type="text" 
                      id="setting-color-text"
                      value={bannerColor}
                      onChange={(e) => setBannerColor(e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Avatar text */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Avatar Logo Title
                  </label>
                  <input 
                    type="text" 
                    id="setting-avatar-text-input"
                    value={avatarText}
                    onChange={(e) => setAvatarText(e.target.value)}
                    maxLength={10}
                    placeholder="ON ALAA"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>

                {/* Avatar subtext */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Avatar Logo Subtitle
                  </label>
                  <input 
                    type="text" 
                    id="setting-avatar-subtext-input"
                    value={avatarSubtext}
                    onChange={(e) => setAvatarSubtext(e.target.value)}
                    maxLength={10}
                    placeholder="STORE"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {/* Storefront Custom Assets Uploaders (Profile Picture + Banner Video) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store Profile Picture Customizer */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Store Profile Picture (4K Ultra-HD Supported)
                  </label>
                  <div
                    onDragOver={handleAvatarImageDragOver}
                    onDragLeave={handleAvatarImageDragLeave}
                    onDrop={handleAvatarImageDrop}
                    onClick={() => avatarImageInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 h-52 flex flex-col justify-center items-center ${
                      isAvatarDragging 
                        ? 'border-amber-400 bg-amber-50/50 shadow-inner' 
                        : avatarImage 
                          ? 'border-slate-200 bg-slate-50/50' 
                          : 'border-[#FCD34D] bg-[#FCD34D]/10 hover:bg-[#FCD34D]/20'
                    }`}
                  >
                    <input 
                      type="file" 
                      id="admin-avatar-image" 
                      accept="image/*" 
                      ref={avatarImageInputRef}
                      onChange={handleAvatarImageChange}
                      className="hidden" 
                    />

                    {avatarImage ? (
                      <div className="flex flex-col items-center justify-center space-y-3 w-full h-full">
                        {/* Image Preview Container */}
                        <div className="relative group w-28 h-28 bg-white border border-slate-200 rounded-full overflow-hidden shadow-sm flex items-center justify-center">
                          <img 
                            src={avatarImage} 
                            alt="Profile Preview"
                            className="w-full h-full object-cover rounded-full image-render-auto"
                            style={{ imageRendering: 'auto' }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                            <button
                              type="button"
                              onClick={handleClearAvatarImage}
                              className="text-white bg-red-600 hover:bg-red-700 p-1.5 rounded-full shadow-md transition"
                              title="Clear Image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                          Active 4K Profile Picture
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                          <Upload className="w-5 h-5 animate-bounce" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] text-slate-700 font-extrabold uppercase tracking-wide">
                            Upload 4K Profile Picture
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium leading-normal">
                            Ultra-HD quality (PNG, JPG, SVG up to 10MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Storefront Banner Video Customizer */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Storefront Banner Video
                  </label>
                  <div
                    onDragOver={handleBannerVideoDragOver}
                    onDragLeave={handleBannerVideoDragLeave}
                    onDrop={handleBannerVideoDrop}
                    onClick={() => bannerVideoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 h-52 flex flex-col justify-center items-center ${
                      isBannerDragging 
                        ? 'border-amber-400 bg-amber-50/50 shadow-inner' 
                        : bannerVideo 
                          ? 'border-slate-200 bg-slate-50/50' 
                          : 'border-[#FCD34D] bg-[#FCD34D]/10 hover:bg-[#FCD34D]/20'
                    }`}
                  >
                    <input 
                      type="file" 
                      id="admin-banner-video" 
                      accept="video/*" 
                      ref={bannerVideoInputRef}
                      onChange={handleBannerVideoChange}
                      className="hidden" 
                    />

                    {bannerVideo ? (
                      <div className="flex flex-col items-center justify-center space-y-3 w-full h-full">
                        {/* Video Preview Container */}
                        <div className="relative group w-full max-w-[200px] h-24 bg-black border border-slate-200 rounded-lg overflow-hidden shadow-sm flex items-center justify-center">
                          <video 
                            src={bannerVideo} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 right-1 z-10">
                            <button
                              type="button"
                              onClick={handleClearBannerVideo}
                              className="text-white bg-red-600 hover:bg-red-700 p-1 rounded-md text-[8px] shadow-md transition uppercase tracking-wider flex items-center gap-0.5"
                            >
                              <Trash2 className="w-2.5 h-2.5" /> Clear
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                          Active Banner Video
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                          <Video className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] text-slate-700 font-extrabold uppercase tracking-wide">
                            Upload Banner Promo Video
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium">
                            Accepts standard video formats (MP4, etc.)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Logo Design Live Preview */}
              <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Logo Live Preview (Crisp 4K Resolution Preview)
                </span>
                <div className="bg-white p-2 rounded-full shadow-lg border border-slate-100/80 flex items-center justify-center">
                  <div className="bg-white rounded-full w-28 h-28 flex flex-col justify-center items-center select-none overflow-hidden leading-none border border-slate-50 relative">
                    {avatarImage ? (
                      <img 
                        src={avatarImage} 
                        alt="Logo Preview" 
                        className="w-full h-full object-cover rounded-full image-render-auto"
                        style={{ imageRendering: 'auto' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        {/* "ON ALAA" Row */}
                        <div className="flex items-center justify-center gap-1">
                          {avatarText.toUpperCase().startsWith('O') ? (
                            <>
                              {/* Custom 'O' with Play icon */}
                              <div className="w-6 h-6 bg-[#FF0000] rounded-full flex items-center justify-center shrink-0 shadow-xs">
                                <div className="w-0 h-0 border-t-[4.5px] border-t-transparent border-b-[4.5px] border-b-transparent border-l-[8px] border-l-white ml-[1px]" />
                              </div>
                              {/* Rest of the text in bold red */}
                              <span className="text-sm font-black tracking-tight text-[#FF0000] font-sans uppercase">
                                {avatarText.toUpperCase().substring(1)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-black tracking-tight text-[#FF0000] font-sans uppercase">
                              {avatarText}
                            </span>
                          )}
                        </div>
                        
                        {/* "STORE" Row */}
                        <span className="text-[11px] font-black tracking-[0.25em] text-black font-sans uppercase mt-1.5 mr-[-0.25em]">
                          {avatarSubtext || 'STORE'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Global Catalog Setting */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Global Catalog Setting
                </span>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={hideOutOfStockSetting}
                    onChange={(e) => setHideOutOfStockSetting(e.target.checked)}
                    className="w-4 h-4 text-slate-900 bg-white border-slate-200 rounded focus:ring-amber-300 focus:ring-2 mt-0.5 cursor-pointer transition-colors"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                      Hide Out of Stock by Default
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium leading-relaxed">
                      Automatically hide products from the public storefront as soon as they go out of stock or hit 0 quantity.
                    </span>
                  </div>
                </label>
              </div>

              {/* Save Button */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="submit"
                  id="save-settings-btn"
                  className="bg-[#FCD34D] hover:opacity-90 text-[#0F172A] font-black py-3 px-6 rounded-xl transition duration-150 shadow-md font-display flex items-center gap-2 uppercase tracking-wider text-xs"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{language === 'ar' ? 'حفظ إعدادات المتجر' : 'Save Store Configurations'}</span>
                </button>
                {settingsSuccess && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl"
                  >
                    <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                    <span>
                      {language === 'ar' ? 'تم حفظ تكوينات المتجر بنجاح!' : 'Store configurations saved successfully!'}
                    </span>
                  </motion.div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: GOOGLE WORKSPACE SYNC DASHBOARD     */}
        {/* ========================================== */}
        {activeTab === 'workspace' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="text-left">
                <h2 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                  <span>Google Workspace Integration</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Connect your store to Google Docs and Google Sheets to automate catalogs, log order receipts, and generate inventory reports.
                </p>
              </div>

              {googleUser ? (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  {googleUser.photoURL ? (
                    <img 
                      src={googleUser.photoURL} 
                      alt="Google User" 
                      className="w-8 h-8 rounded-full shadow-xs border border-slate-150"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                      {googleUser.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {googleUser.displayName || 'Authorized Account'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {googleUser.email}
                    </p>
                  </div>
                  <button
                    onClick={handleGoogleLogout}
                    className="ml-2 text-[10px] bg-white hover:bg-red-50 hover:text-red-600 text-slate-500 font-bold px-2 py-1 rounded-md border border-slate-200 hover:border-red-200 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isSigningInGoogle}
                  className="gsi-material-button scale-95 origin-right cursor-pointer"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #dadce0',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    color: '#3c4043',
                    cursor: 'pointer',
                    fontFamily: '"Google Sans",arial,sans-serif',
                    fontSize: '14px',
                    height: '40px',
                    letterSpacing: '0.25px',
                    outline: 'none',
                    overflow: 'hidden',
                    padding: '0 12px',
                    position: 'relative',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    width: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  <div className="gsi-material-button-icon" style={{ height: '20px', width: '20px', minWidth: '20px', display: 'flex', alignItems: 'center' }}>
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    {isSigningInGoogle ? 'Connecting...' : 'Sign in with Google'}
                  </span>
                </button>
              )}
            </div>

            {/* SYNC STATUS NOTIFICATION CARD */}
            {syncStatus.type && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border ${
                  syncStatus.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                    : 'bg-red-50 border-red-150 text-red-800'
                }`}
              >
                <div className="flex items-start gap-3 text-left">
                  <div className="mt-0.5">
                    {syncStatus.type === 'success' ? (
                      <span className="text-emerald-500 font-bold">✓</span>
                    ) : (
                      <span className="text-red-500 font-bold">✕</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold leading-relaxed">{syncStatus.message}</p>
                    {syncStatus.url && (
                      <a 
                        href={syncStatus.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition uppercase tracking-wider cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Document</span>
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* CHANNELS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* GOOGLE SHEETS PORT */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-xs text-left">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase">
                      Google Sheets Integrations
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Structured Spreadsheet Ledger
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Automatically structure or backup entire collections of orders and stock catalogs in live spreadsheets. Easy to filter, analyze, or import.
                </p>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleExportProductsToSheets}
                    disabled={!googleUser || syncLoading !== null}
                    className="w-full flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed group text-left cursor-pointer"
                  >
                    <div>
                      <span className="block text-xs font-bold text-slate-700 group-hover:text-emerald-700 transition">
                        Export Product Catalog
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Writes all {products.length} current products with details & categories.
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-emerald-600 transition font-bold font-mono">
                      {syncLoading === 'products' ? 'Writing...' : 'Export →'}
                    </span>
                  </button>

                  <button
                    onClick={handleExportOrdersToSheets}
                    disabled={!googleUser || syncLoading !== null}
                    className="w-full flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed group text-left cursor-pointer"
                  >
                    <div>
                      <span className="block text-xs font-bold text-slate-700 group-hover:text-emerald-700 transition">
                        Export Store Orders ledger
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Exports all {orders.length} order entries, delivery addresses & timestamps.
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-emerald-600 transition font-bold font-mono">
                      {syncLoading === 'orders' ? 'Writing...' : 'Export →'}
                    </span>
                  </button>
                </div>
              </div>

              {/* GOOGLE DOCS PORT */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-xs text-left">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase">
                      Google Docs Integrations
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Professional Documents & Reports
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Draft beautifully structured store summaries, supply audits, and customer invoice receipts directly into editable Google Docs.
                </p>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleGenerateInventoryReportDoc}
                    disabled={!googleUser || syncLoading !== null}
                    className="w-full flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed group text-left cursor-pointer"
                  >
                    <div>
                      <span className="block text-xs font-bold text-slate-700 group-hover:text-blue-700 transition">
                        Draft Inventory Report
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Drafts stats, low stock warnings, and grouped category catalogs.
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-blue-600 transition font-bold font-mono">
                      {syncLoading === 'report' ? 'Drafting...' : 'Draft →'}
                    </span>
                  </button>
                </div>
              </div>

            </div>

            {/* PREVIEW LOCK SIGNIN TIP */}
            {!googleUser && (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-150 p-6">
                <p className="text-xs font-bold text-slate-600">
                  🔒 Google Workspace Integration locked
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed text-center">
                  Authenticate using the "Sign in with Google" button above to activate secure Sheets and Docs sync pipelines on behalf of your Google Account.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Detailed Order View Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0"
            onClick={() => setSelectedOrderDetail(null)}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-55 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
              <div>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                  Order Details
                </span>
                <h3 className="font-display text-base font-extrabold text-slate-900 mt-1">
                  ID: #{selectedOrderDetail.id.toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                id="btn-close-order-modal"
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
              {/* Status and Timestamp */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date & Time</span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                    {new Date(selectedOrderDetail.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Order Status</span>
                  <select
                    id="modal-order-status-select"
                    value={selectedOrderDetail.status}
                    onChange={(e) => {
                      onUpdateOrderStatus(selectedOrderDetail.id, e.target.value as any);
                      setSelectedOrderDetail(prev => prev ? { ...prev, status: e.target.value as any } : null);
                    }}
                    className={`text-xs font-bold p-1 rounded border outline-none mt-1 w-full ${
                      selectedOrderDetail.status === 'Pending' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : selectedOrderDetail.status === 'Completed'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Customer Profile */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer Profile
                </span>
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{selectedOrderDetail.customerName}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                    <span className="font-mono font-bold bg-slate-100 p-1 rounded">{selectedOrderDetail.customerPhone}</span>
                    <div className="flex gap-2">
                      <a
                        href={`tel:${selectedOrderDetail.customerPhone}`}
                        className="text-blue-600 hover:underline font-bold text-xs"
                      >
                        📞 Call
                      </a>
                      <a
                        href={`https://wa.me/${selectedOrderDetail.customerPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline font-bold text-xs"
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 mt-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Delivery Address</span>
                    <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-line leading-relaxed">
                      {selectedOrderDetail.customerAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Purchased */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ordered Items List ({selectedOrderDetail.items.length})
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {selectedOrderDetail.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-slate-800 truncate">{item.productName}</p>
                        {item.variantName ? (
                          <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-bold inline-block mt-0.5">
                            Option: {item.variantName} {item.variantSku ? `(SKU: ${item.variantSku})` : ''}
                          </span>
                        ) : null}
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          ${item.priceAtOrder.toFixed(2)} x {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        ${(item.priceAtOrder * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order total */}
              <div className="flex justify-between items-center bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-md">
                <span className="text-xs font-semibold text-slate-400">Total Revenue:</span>
                <span className="font-display text-lg font-black text-white">
                  ${selectedOrderDetail.totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex gap-2 shrink-0">
              <button
                onClick={() => {
                  let receipt = `ORDER #${selectedOrderDetail.id.toUpperCase()}\n`;
                  receipt += `Date: ${new Date(selectedOrderDetail.createdAt).toLocaleString()}\n`;
                  receipt += `Customer: ${selectedOrderDetail.customerName}\n`;
                  receipt += `Phone: ${selectedOrderDetail.customerPhone}\n`;
                  receipt += `Address: ${selectedOrderDetail.customerAddress}\n\n`;
                  receipt += `Items:\n`;
                  selectedOrderDetail.items.forEach(item => {
                    const variant = item.variantName ? ` (${item.variantName})` : '';
                    receipt += `- ${item.quantity}x ${item.productName}${variant} @ $${item.priceAtOrder.toFixed(2)}\n`;
                  });
                  receipt += `\nTotal: $${selectedOrderDetail.totalPrice.toFixed(2)}\n`;
                  receipt += `Status: ${selectedOrderDetail.status}`;
                  
                  navigator.clipboard.writeText(receipt);
                  alert('Receipt text copied to clipboard!');
                }}
                id="btn-copy-receipt"
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-lg text-xs transition uppercase tracking-wider cursor-pointer"
              >
                Copy Receipt
              </button>
              <button
                onClick={() => handleGenerateInvoiceDoc(selectedOrderDetail)}
                disabled={!googleUser || syncLoading !== null}
                id="btn-generate-invoice-doc"
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2 px-3 rounded-lg text-xs transition uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                title={!googleUser ? "Sign in to Google inside the Docs & Sheets tab first" : "Generate invoice Google Doc"}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{syncLoading === 'invoice' ? 'Drafting...' : 'Save to Docs'}</span>
              </button>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                id="btn-close-order-detail"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs transition uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 8K Ultra-HD Interactive Studio Lightbox */}
      {lightboxImageUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 select-none animate-fadeIn">
          {/* Header Bar */}
          <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400 text-slate-950 rounded-lg p-1.5 font-black text-[10px] tracking-wider uppercase">
                8K Studio
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Ultra-HD Master Lightbox
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Resolution: 7680 x 4320 (8K UHD) • Lossless Texture Preview
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setLightboxImageUrl(null);
                setLightboxScale(1);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg p-2 transition shadow-md"
              title="Close Viewer (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Viewport Canvas */}
          <div className="flex-1 my-4 overflow-auto flex items-center justify-center p-4 relative bg-slate-900/30 border border-slate-800/30 rounded-2xl shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
            
            <div className="max-w-full max-h-[70vh] flex items-center justify-center overflow-auto rounded-xl">
              <img 
                src={lightboxImageUrl} 
                alt="8K UHD Zoom Inspect" 
                className="max-h-[70vh] object-contain shadow-2xl transition-transform duration-150 rounded-lg image-render-auto"
                style={{ 
                  transform: `scale(${lightboxScale})`, 
                  imageRendering: 'auto' 
                }}
              />
            </div>
          </div>

          {/* Footer Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 gap-3 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setLightboxScale(prev => Math.max(0.5, prev - 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-mono font-bold text-white min-w-[60px] text-center">
                  {Math.round(lightboxScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxScale(prev => Math.min(4, prev + 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setLightboxScale(1)}
                className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700/50 transition font-bold uppercase tracking-wider"
              >
                Reset Zoom (100%)
              </button>
            </div>

            <div className="flex items-center gap-2 select-none">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-400 font-mono block">COLOR RANGE: AdobeRGB 100%</span>
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block">★ MASTER GRADE PREVIEW</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
