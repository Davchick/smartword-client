import { apiPost, apiGet } from './api';

export type PlanId = 'month' | 'half_year' | 'year';

export type PaymentMethod = 'card' | 'sbp' | 'sberpay' | 'tpay';

export interface CreatePaymentResponse {
  payment_id: string;
  status: string;
  confirmation_url: string | null;
  payment_method_type: string | null;
  requested_method?: PaymentMethod;
  requested_payment_method_type?: string | null;
}

export interface SubscriptionStatus {
  subscription_type: string | null;
  subscription_expires_at: string | null;
  is_premium: boolean;
}

export interface PaymentStatusResponse extends SubscriptionStatus {
  payment_id: string;
  status: string;
  plan_id: string;
  amount: number | null;
  created_at: string;
}

export async function createSubscriptionPayment(
  planId: PlanId,
  method: PaymentMethod,
): Promise<CreatePaymentResponse> {
  return apiPost<CreatePaymentResponse>('/billing/create-payment', { planId, method });
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiGet<SubscriptionStatus>('/billing/subscription');
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  return apiGet<PaymentStatusResponse>(`/billing/payment-status/${encodeURIComponent(paymentId)}`);
}

