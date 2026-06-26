/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Space Gray", "128GB / Black"
  sku: string;
  price: number;
  image?: string;
  inStock: boolean;
  stockQuantity?: number;
}

export interface ProductReview {
  id: string;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  desc: string;
  image?: string; // Can be a local asset index, URL, or empty
  images?: string[]; // Array of image URLs for the product image carousel
  inStock: boolean;
  stockQuantity?: number;
  visible: boolean;
  createdAt: number;
  variants?: ProductVariant[];
  reviews?: ProductReview[];
}

export interface StoreSettings {
  storeName: string;
  storeDescription: string;
  whatsappNumber: string; // e.g., "96170123456"
  currency: string; // e.g., "USD" or "LBP"
  bannerColor: string; // Hex color code or Tailwind class name
  avatarText: string;
  avatarSubtext: string;
  avatarImage?: string; // Optional custom profile picture / logo image URL
  hideOutOfStock?: boolean;
  bannerVideo?: string;
  instagramUsername?: string; // e.g. "onlymobilestore.lb"
  storeLocationUrl?: string;  // Custom Google Maps Link
  phoneCallNumber?: string;   // Phone number for direct voice calls
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant; // Support adding specific variants
}

export interface OrderRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    priceAtOrder: number;
    variantName?: string;
    variantSku?: string;
  }[];
  totalPrice: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  createdAt: number;
}
