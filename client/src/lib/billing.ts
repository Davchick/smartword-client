import { apiGet, apiPost } from './api';

export type PlanId = 'month' | 'half_year' | 'year';

export type PaymentMethod = 'card' | 'sbp' | 'sberpay' | 'tpay';

export interface CreatePaymentResponse {
  payment_id: string;
  status: string;
  confirmation_url: string | null;
}

export interface SubscriptionInfo {
  subscription_type: string | null;
  subscription_expires_at: string | null;
  is_premium: boolean;
}

export async function createSubscriptionPayment(
  planId: PlanId,
  method: PaymentMethod,
): Promise<CreatePaymentResponse> {
  return apiPost<CreatePaymentResponse>('/billing/create-payment', { planId, method });
}

export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  return apiGet<SubscriptionInfo>('/billing/subscription');
}

