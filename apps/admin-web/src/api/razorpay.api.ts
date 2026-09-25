class RazorpayApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'RazorpayApiError';
  }
}

const API_BASE_URL = '/api/v1/admin/subscriptions/razorpay';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      throw new RazorpayApiError(data.error?.message || data.message || 'API Error', response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof RazorpayApiError) throw error;
    throw new Error('Network error or server is down');
  }
}

export interface RazorpayMetrics {
  integrationStatus: {
    value: string;
    label: string;
    helperText: string;
  };
  successfulPayments: {
    value: number;
    trend: number;
  };
  failedPayments: {
    value: number;
    trend: number;
  };
  totalPaymentVolume: {
    value: number;
    formatted: string;
  };
  activeEnvironment: 'TEST' | 'LIVE';
}

export interface RazorpayConfiguration {
  id: string;
  gateway: string;
  environment: 'TEST' | 'LIVE';
  accountMode: 'STANDARD' | 'ROUTE';
  keyId: string;
  maskedKeyId: string;
  hasKeySecret: boolean;
  maskedKeySecret: string;
  hasWebhookSecret: boolean;
  maskedWebhookSecret: string;
  currency: string;
  captureMode: 'AUTOMATIC' | 'MANUAL';
  paymentDescriptionPrefix: string;
  orderExpiryMinutes: number;
  retryEnabled: boolean;
  internationalEnabled: boolean;
  upiEnabled: boolean;
  cardsEnabled: boolean;
  netBankingEnabled: boolean;
  walletEnabled: boolean;
  emiEnabled: boolean;
  webhookUrl: string;
  webhookEvents: string[];
  isActive: boolean;
  status: string;
  lastVerifiedAt: string | null;
  lastVerificationStatus: string | null;
  lastVerificationError: string | null;
  availableEvents: string[];
}

export interface WebhookLog {
  id: string;
  gateway: string;
  eventId: string | null;
  eventType: string;
  paymentId: string | null;
  orderId: string | null;
  refundId: string | null;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  errorMessage: string | null;
  retryCount: number;
  receivedAt: string;
  processedAt: string | null;
}

export const RazorpayApi = {
  async getMetrics(): Promise<RazorpayMetrics> {
    const res = await fetchWithAuth(`${API_BASE_URL}/metrics`);
    return res.data;
  },

  async getConfiguration(environment?: 'TEST' | 'LIVE'): Promise<RazorpayConfiguration> {
    const query = environment ? `?environment=${environment}` : '';
    const res = await fetchWithAuth(`${API_BASE_URL}/configuration${query}`);
    return res.data;
  },

  async saveConfiguration(payload: {
    environment?: 'TEST' | 'LIVE';
    accountMode?: 'STANDARD' | 'ROUTE';
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
    currency?: string;
    captureMode?: 'AUTOMATIC' | 'MANUAL';
    paymentDescriptionPrefix?: string;
    orderExpiryMinutes?: number;
    retryEnabled?: boolean;
    internationalEnabled?: boolean;
    upiEnabled?: boolean;
    cardsEnabled?: boolean;
    netBankingEnabled?: boolean;
    walletEnabled?: boolean;
    emiEnabled?: boolean;
    webhookEvents?: string[];
  }): Promise<RazorpayConfiguration> {
    const res = await fetchWithAuth(`${API_BASE_URL}/configuration`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async switchEnvironment(environment: 'TEST' | 'LIVE'): Promise<RazorpayConfiguration> {
    const res = await fetchWithAuth(`${API_BASE_URL}/environment/switch`, {
      method: 'POST',
      body: JSON.stringify({ environment }),
    });
    return res.data;
  },

  async testConnection(environment: 'TEST' | 'LIVE'): Promise<{
    success: boolean;
    status: string;
    lastVerifiedAt: string;
    error?: string;
  }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/connection/test`, {
      method: 'POST',
      body: JSON.stringify({ environment }),
    });
    return res.data;
  },

  async getWebhookLogs(limit = 20): Promise<WebhookLog[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/webhooks/logs?limit=${limit}`);
    return res.data;
  },

  async createTestPayment(amount = 1): Promise<{
    success: boolean;
    transactionNumber: string;
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
  }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/test-payment`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return res.data;
  },
};
