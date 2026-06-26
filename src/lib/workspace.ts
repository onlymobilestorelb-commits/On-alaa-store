import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, OrderRecord } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Auth Provider configured with required Workspace scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/documents');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Listen to auth state changes and manage token caching
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we are already signed in to Firebase but don't have token cached yet
        // we can try retrieving it or wait for a sign-in interaction
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Creates a Google Sheets Spreadsheet with the catalog items.
 */
export async function exportProductsToSheets(products: Product[]): Promise<string> {
  const token = cachedAccessToken;
  if (!token) throw new Error('You must be signed in with Google first.');

  // 1. Create Spreadsheet
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `On Alaa Store - Products Catalog (${new Date().toLocaleDateString()})`
      }
    })
  });

  if (!createResponse.ok) {
    const errData = await createResponse.json();
    throw new Error(errData.error?.message || 'Failed to create Google Sheet');
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. Format Data Rows
  const headers = ['ID', 'Product Name', 'Category', 'Price (USD)', 'Stock Status', 'Quantity Available', 'Description'];
  const rows = products.map(p => [
    p.id,
    p.name,
    p.category,
    p.price,
    p.inStock ? 'In Stock' : 'Out of Stock',
    p.stockQuantity !== undefined ? p.stockQuantity : 'Unlimited',
    p.desc || ''
  ]);

  // 3. Write Data to Spreadsheet
  const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: 'Sheet1!A1',
      majorDimension: 'ROWS',
      values: [headers, ...rows]
    })
  });

  if (!writeResponse.ok) {
    const errData = await writeResponse.json();
    throw new Error(errData.error?.message || 'Failed to populate Google Sheet values');
  }

  return spreadsheetUrl;
}

/**
 * Creates a Google Sheets Spreadsheet with the Order History.
 */
export async function exportOrdersToSheets(orders: OrderRecord[]): Promise<string> {
  const token = cachedAccessToken;
  if (!token) throw new Error('You must be signed in with Google first.');

  // 1. Create Spreadsheet
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `On Alaa Store - Order History Export (${new Date().toLocaleDateString()})`
      }
    })
  });

  if (!createResponse.ok) {
    const errData = await createResponse.json();
    throw new Error(errData.error?.message || 'Failed to create Google Sheet for orders');
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. Format Data Rows
  const headers = ['Order ID', 'Timestamp', 'Customer Name', 'Phone Number', 'Delivery Address', 'Ordered Items Summary', 'Total Price (USD)', 'Status'];
  const rows = orders.map(o => {
    const itemsSummary = o.items.map(item => `${item.quantity}x ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`).join(', ');
    return [
      o.id.toUpperCase(),
      new Date(o.createdAt).toLocaleString(),
      o.customerName,
      o.customerPhone,
      o.customerAddress,
      itemsSummary,
      o.totalPrice,
      o.status
    ];
  });

  // 3. Write Data to Spreadsheet
  const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: 'Sheet1!A1',
      majorDimension: 'ROWS',
      values: [headers, ...rows]
    })
  });

  if (!writeResponse.ok) {
    const errData = await writeResponse.json();
    throw new Error(errData.error?.message || 'Failed to populate order data rows in Google Sheet');
  }

  return spreadsheetUrl;
}

/**
 * Generates a beautiful order Invoice directly inside a Google Doc.
 */
export async function generateOrderInvoiceDoc(order: OrderRecord): Promise<string> {
  const token = cachedAccessToken;
  if (!token) throw new Error('You must be signed in with Google first.');

  // 1. Create a Document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `Invoice - Order #${order.id.toUpperCase()} (${order.customerName})`
    })
  });

  if (!createResponse.ok) {
    const errData = await createResponse.json();
    throw new Error(errData.error?.message || 'Failed to create Google Doc Invoice');
  }

  const doc = await createResponse.json();
  const documentId = doc.documentId;
  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // 2. Construct beautifully aligned invoice content
  let text = '';
  text += `================================================================\n`;
  text += `                     ON ALAA STORE INVOICE                      \n`;
  text += `================================================================\n\n`;
  text += `Order Reference: #${order.id.toUpperCase()}\n`;
  text += `Placed on: ${new Date(order.createdAt).toLocaleString()}\n`;
  text += `Current Order Status: ${order.status.toUpperCase()}\n\n`;
  
  text += `----------------------------------------------------------------\n`;
  text += `CUSTOMER DETAILS\n`;
  text += `----------------------------------------------------------------\n`;
  text += `Name:     ${order.customerName}\n`;
  text += `Phone:    ${order.customerPhone}\n`;
  text += `Address:  ${order.customerAddress}\n\n`;

  text += `----------------------------------------------------------------\n`;
  text += `ORDER SUMMARY\n`;
  text += `----------------------------------------------------------------\n`;
  
  order.items.forEach((item, index) => {
    const num = index + 1;
    const variantStr = item.variantName ? ` [Option: ${item.variantName}]` : '';
    text += `${num}. ${item.quantity} x ${item.productName}${variantStr}\n`;
    text += `   Unit Price: $${item.priceAtOrder.toFixed(2)} | Subtotal: $${(item.priceAtOrder * item.quantity).toFixed(2)}\n`;
  });
  
  text += `\n`;
  text += `================================================================\n`;
  text += `GRAND TOTAL: $${order.totalPrice.toFixed(2)}\n`;
  text += `================================================================\n\n`;
  text += `Thank you for shopping with ON ALAA STORE!\n`;
  text += `If you have questions, contact us via WhatsApp: 96170123456\n`;

  // 3. BatchUpdate Google Doc with structured updates
  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: {
              index: 1
            },
            text: text
          }
        }
      ]
    })
  });

  if (!updateResponse.ok) {
    const errData = await updateResponse.json();
    throw new Error(errData.error?.message || 'Failed to insert invoice content to Google Doc');
  }

  return docUrl;
}

/**
 * Generates an Inventory Status summary inside a Google Doc.
 */
export async function generateInventoryReportDoc(products: Product[], categories: string[]): Promise<string> {
  const token = cachedAccessToken;
  if (!token) throw new Error('You must be signed in with Google first.');

  // 1. Create a Document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `Inventory Report - On Alaa Store (${new Date().toLocaleDateString()})`
    })
  });

  if (!createResponse.ok) {
    const errData = await createResponse.json();
    throw new Error(errData.error?.message || 'Failed to create Google Doc Inventory Report');
  }

  const doc = await createResponse.json();
  const documentId = doc.documentId;
  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // 2. Construct text Report
  const totalItems = products.length;
  const lowStockCount = products.filter(p => p.stockQuantity !== undefined && p.stockQuantity <= 5).length;
  const outOfStockCount = products.filter(p => !p.inStock).length;

  let text = '';
  text += `================================================================\n`;
  text += `               ON ALAA STORE - LATEST INVENTORY REPORT          \n`;
  text += `               Generated: ${new Date().toLocaleString()}        \n`;
  text += `================================================================\n\n`;
  
  text += `SUMMARY METRICS\n`;
  text += `----------------------------------------------------------------\n`;
  text += `- Total Unique Catalog Items:  ${totalItems}\n`;
  text += `- Low Stock Items (<= 5 units): ${lowStockCount}\n`;
  text += `- Out of Stock Items:          ${outOfStockCount}\n\n`;

  text += `CATALOG DETAILS BY CATEGORY\n`;
  text += `----------------------------------------------------------------\n`;

  // Group products by category
  categories.forEach(cat => {
    const catProds = products.filter(p => p.category.toLowerCase() === cat.toLowerCase());
    if (catProds.length === 0) return;

    text += `\n>> CATEGORY: ${cat.toUpperCase()} (${catProds.length} items)\n`;
    text += `----------------------------------------------------------------\n`;
    
    catProds.forEach(p => {
      const stockStr = p.inStock ? `${p.stockQuantity !== undefined ? `${p.stockQuantity} Left` : 'Unlimited'}` : 'OUT OF STOCK';
      text += `- ${p.name}\n`;
      text += `  Price: $${p.price.toFixed(2)} | Stock: ${stockStr}\n`;
      if (p.desc) {
        text += `  Description: ${p.desc}\n`;
      }
      text += `\n`;
    });
  });

  text += `\nReport completed. Use this to review catalog, supply chains, and orders.\n`;

  // 3. Update Doc
  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: {
              index: 1
            },
            text: text
          }
        }
      ]
    })
  });

  if (!updateResponse.ok) {
    const errData = await updateResponse.json();
    throw new Error(errData.error?.message || 'Failed to insert inventory report content to Google Doc');
  }

  return docUrl;
}
