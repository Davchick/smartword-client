export const PRODUCT_IDS = {
  MONTHLY: 'smartword_premium_monthly',
  YEARLY: 'smartword_premium_yearly',
  LIFETIME: 'smartword_premium_lifetime',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

// Безопасная загрузка нативного модуля — в Expo Go и на dev он недоступен
const getIAP = (): typeof import('../mocks/expo-in-app-purchases') | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../mocks/expo-in-app-purchases');
  } catch {
    return null;
  }
};

let purchaseListenerSet = false;

export const initIAP = async (): Promise<any[]> => {
  try {
    const IAP = getIAP();
    if (!IAP) return [];

    await IAP.connectAsync();

    if (!purchaseListenerSet) {
      purchaseListenerSet = true;
      IAP.setPurchaseListener(async ({ responseCode, results }: any) => {
        if (responseCode === IAP.IAPResponseCode.OK && results) {
          for (const purchase of results) {
            if (!purchase.acknowledged) {
              await IAP.finishTransactionAsync(purchase, false);
            }
          }
        }
      });
    }

    const { results } = await IAP.getProductsAsync(Object.values(PRODUCT_IDS));
    return results ?? [];
  } catch {
    return [];
  }
};

export const purchaseProduct = async (productId: ProductId): Promise<{ error: string | null }> => {
  try {
    const IAP = getIAP();
    if (!IAP) return { error: 'Покупки недоступны в этом окружении' };
    await IAP.purchaseItemAsync(productId);
    return { error: null };
  } catch (error) {
    return { error: String(error) };
  }
};

export const disconnectIAP = async () => {
  try {
    const IAP = getIAP();
    if (!IAP) return;
    await IAP.disconnectAsync();
    purchaseListenerSet = false;
  } catch {
    // ignore
  }
};
