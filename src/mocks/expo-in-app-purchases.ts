/**
 * Mock для expo-in-app-purchases — модуль пока не установлен.
 * Все функции возвращают заглушки чтобы приложение не падало.
 * API соответствует реальному expo-in-app-purchases.
 */

export const ResponseCode = {
  OK: 'OK',
  USER_CANCELED: 'USER_CANCELED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  ITEM_ALREADY_OWNED: 'ITEM_ALREADY_OWNED',
  DEVELOPER_ERROR: 'DEVELOPER_ERROR',
  GENERAL_ERROR: 'GENERAL_ERROR',
  DEFERRED_PAYMENT: 'DEFERRED_PAYMENT',
};

// Алиас для совместимости с кодом который использует IAP.IAPResponseCode
export const IAPResponseCode = ResponseCode;

export const ProductType = {
  IN_APP: 'inapp',
  SUBSCRIPTION: 'subs',
};

export const PurchaseState = {
  PURCHASED: 'PURCHASED',
  PENDING: 'PENDING',
};

export const connectAsync = async () => ({ responseCode: ResponseCode.OK });
export const disconnectAsync = async () => {};

export const getProductsAsync = async (_productIds: string[]) => ({
  responseCode: ResponseCode.OK,
  results: [],
});

export const getPurchaseHistoryAsync = async () => ({
  responseCode: ResponseCode.OK,
  results: [],
});

export const purchaseItemAsync = async (_productId: string) => ({
  responseCode: ResponseCode.OK,
});

export const consumeItemAsync = async (_purchaseToken: string) => ({
  responseCode: ResponseCode.OK,
});

export const finishTransactionAsync = async (_purchase: any, _consume: boolean) => ({
  responseCode: ResponseCode.OK,
});

export const addPurchaseListener = (_callback: Function) => {};
export const removePurchaseListener = (_callback: Function) => {};

// Алиас для совместимости с кодом который использует setPurchaseListener
export const setPurchaseListener = addPurchaseListener;
