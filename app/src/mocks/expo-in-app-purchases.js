export const IAPResponseCode = { OK: 0, USER_CANCELED: 1, DEFERRED: 2, ERROR: 3 };
export const connectAsync = () => Promise.resolve();
export const disconnectAsync = () => Promise.resolve();
export const getProductsAsync = () => Promise.resolve({ results: [] });
export const purchaseItemAsync = () => Promise.resolve();
export const finishTransactionAsync = () => Promise.resolve();
export const getPurchaseHistoryAsync = () => Promise.resolve({ results: [] });
export const setPurchaseListener = () => {};
