import React, { useState, useEffect } from 'react';
import {
  PageHeader,
  MetricCard,
  Button,
  LoadingSpinner,
} from '@study-karnataka/ui';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Zap,
  Globe,
  Wallet,
  Building,
  Activity,
  X,
  Play,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  RazorpayApi,
  RazorpayMetrics,
  RazorpayConfiguration,
  WebhookLog,
} from '../../api/razorpay.api';

export const RazorpayPage: React.FC = () => {
  // Loading & Data states
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RazorpayMetrics | null>(null);
  const [config, setConfig] = useState<RazorpayConfiguration | null>(null);

  // Form edit states
  const [selectedEnv, setSelectedEnv] = useState<'TEST' | 'LIVE'>('TEST');
  const [accountMode, setAccountMode] = useState<'STANDARD' | 'ROUTE'>('STANDARD');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [isReplacingKeySecret, setIsReplacingKeySecret] = useState(false);

  const [currency, setCurrency] = useState('INR');
  const [captureMode, setCaptureMode] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isReplacingWebhookSecret, setIsReplacingWebhookSecret] = useState(false);

  const [paymentDescPrefix, setPaymentDescPrefix] = useState('Study Karnataka Subscription');
  const [orderExpiry, setOrderExpiry] = useState(15);
  const [retryEnabled, setRetryEnabled] = useState(true);

  // Payment method toggles
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [cardsEnabled, setCardsEnabled] = useState(true);
  const [netBankingEnabled, setNetBankingEnabled] = useState(true);
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [internationalEnabled, setInternationalEnabled] = useState(false);
  const [emiEnabled, setEmiEnabled] = useState(false);

  const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<string[]>([]);

  // Action states
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    status: string;
    error?: string;
  } | null>(null);

  // Copy helpers
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Modals & Drawers
  const [switchEnvModalOpen, setSwitchEnvModalOpen] = useState(false);
  const [pendingEnvSwitch, setPendingEnvSwitch] = useState<'TEST' | 'LIVE' | null>(null);
  const [webhookDrawerOpen, setWebhookDrawerOpen] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loadingWebhookLogs, setLoadingWebhookLogs] = useState(false);

  // Test payment modal
  const [testPaymentAmount, setTestPaymentAmount] = useState(1);
  const [creatingTestPayment, setCreatingTestPayment] = useState(false);
  const [testPaymentResult, setTestPaymentResult] = useState<any | null>(null);
  const [testPaymentResultModalOpen, setTestPaymentResultModalOpen] = useState(false);

  // Toast / notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch initial data
  const loadData = async (envToFetch?: 'TEST' | 'LIVE') => {
    try {
      setLoading(true);
      const [metricsData, configData] = await Promise.all([
        RazorpayApi.getMetrics(),
        RazorpayApi.getConfiguration(envToFetch),
      ]);

      setMetrics(metricsData);
      setConfig(configData);

      // Populate form fields
      setSelectedEnv(configData.environment);
      setAccountMode(configData.accountMode || 'STANDARD');
      setKeyId(configData.keyId || '');
      setCurrency(configData.currency || 'INR');
      setCaptureMode(configData.captureMode || 'AUTOMATIC');
      setPaymentDescPrefix(configData.paymentDescriptionPrefix || 'Study Karnataka Subscription');
      setOrderExpiry(configData.orderExpiryMinutes || 15);
      setRetryEnabled(configData.retryEnabled ?? true);

      setUpiEnabled(configData.upiEnabled ?? true);
      setCardsEnabled(configData.cardsEnabled ?? true);
      setNetBankingEnabled(configData.netBankingEnabled ?? true);
      setWalletEnabled(configData.walletEnabled ?? true);
      setInternationalEnabled(configData.internationalEnabled ?? false);
      setEmiEnabled(configData.emiEnabled ?? false);

      setSelectedWebhookEvents(configData.webhookEvents || configData.availableEvents);

      // Reset replace secret flags
      setIsReplacingKeySecret(false);
      setIsReplacingWebhookSecret(false);
      setKeySecret('');
      setWebhookSecret('');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to load Razorpay configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle environment tab change request
  const handleEnvChangeClick = (env: 'TEST' | 'LIVE') => {
    if (env === selectedEnv) return;
    setPendingEnvSwitch(env);
    setSwitchEnvModalOpen(true);
  };

  // Confirm environment switch
  const handleConfirmEnvSwitch = async () => {
    if (!pendingEnvSwitch) return;
    try {
      setSaving(true);
      await RazorpayApi.switchEnvironment(pendingEnvSwitch);
      showNotification('success', `Switched environment to ${pendingEnvSwitch === 'LIVE' ? 'Production (Live)' : 'Sandbox (Test)'}`);
      setSwitchEnvModalOpen(false);
      setPendingEnvSwitch(null);
      await loadData(pendingEnvSwitch);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to switch environment');
    } finally {
      setSaving(false);
    }
  };

  // Save Configuration
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const payload: any = {
        environment: selectedEnv,
        accountMode,
        keyId,
        currency,
        captureMode,
        paymentDescriptionPrefix: paymentDescPrefix,
        orderExpiryMinutes: Number(orderExpiry),
        retryEnabled,
        internationalEnabled,
        upiEnabled,
        cardsEnabled,
        netBankingEnabled,
        walletEnabled,
        emiEnabled,
        webhookEvents: selectedWebhookEvents,
      };

      if (isReplacingKeySecret && keySecret.trim()) {
        payload.keySecret = keySecret.trim();
      }
      if (isReplacingWebhookSecret && webhookSecret.trim()) {
        payload.webhookSecret = webhookSecret.trim();
      }

      const updated = await RazorpayApi.saveConfiguration(payload);
      setConfig(updated);
      setIsReplacingKeySecret(false);
      setIsReplacingWebhookSecret(false);
      setKeySecret('');
      setWebhookSecret('');
      showNotification('success', 'Razorpay configuration saved successfully');
      await loadData(selectedEnv);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionTestResult(null);
      const res = await RazorpayApi.testConnection(selectedEnv);
      setConnectionTestResult(res);
      if (res.success) {
        showNotification('success', 'Razorpay connection test succeeded!');
      } else {
        showNotification('error', res.error || 'Razorpay connection test failed');
      }
      // Refresh config to update lastVerifiedAt
      const updatedConfig = await RazorpayApi.getConfiguration(selectedEnv);
      setConfig(updatedConfig);
    } catch (err: any) {
      setConnectionTestResult({
        success: false,
        status: 'Connection Error',
        error: err.message,
      });
      showNotification('error', err.message || 'Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  // Open Webhook Logs Drawer
  const handleOpenWebhookLogs = async () => {
    setWebhookDrawerOpen(true);
    try {
      setLoadingWebhookLogs(true);
      const logs = await RazorpayApi.getWebhookLogs(25);
      setWebhookLogs(logs);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to load webhook logs');
    } finally {
      setLoadingWebhookLogs(false);
    }
  };

  // Create Test Payment (sandbox)
  const handleCreateTestPayment = async () => {
    try {
      setCreatingTestPayment(true);
      const res = await RazorpayApi.createTestPayment(testPaymentAmount);
      setTestPaymentResult(res);
      setTestPaymentResultModalOpen(true);
      // Refresh metrics to update counts
      const updatedMetrics = await RazorpayApi.getMetrics();
      setMetrics(updatedMetrics);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to execute test payment');
    } finally {
      setCreatingTestPayment(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, type: 'url' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Webhook event toggle
  const toggleWebhookEvent = (eventName: string) => {
    setSelectedWebhookEvents(prev =>
      prev.includes(eventName) ? prev.filter(e => e !== eventName) : [...prev, eventName]
    );
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Derive status badge
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Connected & Active
          </span>
        );
      case 'TEST_MODE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Test Mode (Sandbox)
          </span>
        );
      case 'CONNECTION_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} className="text-rose-600" />
            Connection Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertTriangle size={12} className="text-slate-500" />
            Configuration Required
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6 relative">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {notification.message}
          </div>
        )}

        {/* Page Header (Section 2) */}
        <PageHeader
          title="Razorpay Integration"

          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Subscriptions & Payments', href: '/subscriptions/refunds' },
            { label: 'Razorpay' },
          ]}
          actions={
            <a
              href="https://dashboard.razorpay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              View Razorpay Dashboard
              <ExternalLink size={16} className="text-slate-500" />
            </a>
          }
        />

        {/* 4 KPI Cards (Section 4, 5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Integration Status"
            value={metrics?.integrationStatus.label || 'Configuration Required'}
            icon={<ShieldCheck size={24} color="#2563EB" />}
            trend={{ value: 0, isPositive: true }}
          />
          <MetricCard
            title="Successful Payments"
            value={(metrics?.successfulPayments.value || 0).toLocaleString('en-IN')}
            icon={<CheckCircle2 size={24} color="#16A34A" />}
            trend={{ value: metrics?.successfulPayments.trend || 0, isPositive: true }}
          />
          <MetricCard
            title="Failed Payments"
            value={(metrics?.failedPayments.value || 0).toLocaleString('en-IN')}
            icon={<XCircle size={24} color="#DC2626" />}
            trend={{ value: metrics?.failedPayments.trend || 0, isPositive: false }}
          />
          <MetricCard
            title="Total Payment Volume"
            value={metrics?.totalPaymentVolume.formatted || '₹0'}
            icon={<CreditCard size={24} color="#0D9488" />}
            trend={{ value: 0, isPositive: true }}
          />
        </div>

        {/* ===================================================================== */}
        {/* MAIN LAYOUT: LEFT CONTENT (~70%) + RIGHT SIDEBAR (~30%)              */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ----------------------------------------------------------------- */}
          {/* LEFT / MAIN COLUMN (approx 70-75%)                                */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-6">
            {/* =============================================================== */}
            {/* CARD 1: Razorpay Credentials (Section 6-14, 98)                 */}
            {/* =============================================================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Razorpay Credentials</h2>
                    <p className="text-xs text-slate-500">
                      Enter your Razorpay API keys and configure the payment environment.
                    </p>
                  </div>
                </div>
                <a
                  href="https://dashboard.razorpay.com/app/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
                >
                  Get API Keys from Razorpay
                  <ExternalLink size={14} />
                </a>
              </div>

              <div className="p-6 space-y-6">
                {/* Environment Selector Radio Cards (Section 7, 8, 9) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Environment <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Test Mode Card */}
                    <div
                      onClick={() => handleEnvChangeClick('TEST')}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                        selectedEnv === 'TEST'
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="environment"
                        checked={selectedEnv === 'TEST'}
                        onChange={() => handleEnvChangeClick('TEST')}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">Test (Sandbox)</span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800">
                            Safe
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Simulate payments and webhooks without moving real money. Uses test keys (rzp_test_).
                        </p>
                      </div>
                    </div>

                    {/* Live Mode Card */}
                    <div
                      onClick={() => handleEnvChangeClick('LIVE')}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                        selectedEnv === 'LIVE'
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="environment"
                        checked={selectedEnv === 'LIVE'}
                        onChange={() => handleEnvChangeClick('LIVE')}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">Live (Production)</span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                            Real Money
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Accept real transactions from students. Uses live production keys (rzp_live_).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Mode (Section 10) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Account Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setAccountMode('STANDARD')}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        accountMode === 'STANDARD'
                          ? 'border-blue-600 bg-blue-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="accountMode"
                          checked={accountMode === 'STANDARD'}
                          onChange={() => setAccountMode('STANDARD')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Standard Account</div>
                          <div className="text-[11px] text-slate-500">Standard direct settlement to Study Karnataka</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input type="radio" disabled className="text-slate-400" />
                        <div>
                          <div className="text-xs font-bold text-slate-600">Route (Marketplace)</div>
                          <div className="text-[11px] text-slate-500">Split payments & vendor payouts</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-200/60">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key ID & Key Secret Fields (Section 11, 12, 13) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Key ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={keyId}
                        onChange={e => setKeyId(e.target.value)}
                        placeholder={selectedEnv === 'LIVE' ? 'rzp_live_xxxxxxxxxxxx' : 'rzp_test_xxxxxxxxxxxx'}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                      {keyId && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(keyId, 'key')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy Key ID"
                        >
                          {copiedKey ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Public API key provided by Razorpay for {selectedEnv === 'LIVE' ? 'Live' : 'Test'} environment.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Key Secret <span className="text-red-500">*</span>
                      </label>
                      {config?.hasKeySecret && !isReplacingKeySecret && (
                        <button
                          type="button"
                          onClick={() => setIsReplacingKeySecret(true)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Replace Secret
                        </button>
                      )}
                    </div>

                    {config?.hasKeySecret && !isReplacingKeySecret ? (
                      <div className="flex items-center justify-between px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-xs">
                        <span className="font-mono text-slate-600 tracking-wider">••••••••••••••••••••••••</span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Configured
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="password"
                          value={keySecret}
                          onChange={e => setKeySecret(e.target.value)}
                          placeholder="Enter new Key Secret..."
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                        {isReplacingKeySecret && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsReplacingKeySecret(false);
                              setKeySecret('');
                            }}
                            className="text-[10px] text-slate-500 hover:underline"
                          >
                            Cancel secret replacement
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">
                      Protected securely on the server. Never exposed to browser scripts.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* CARD 2: Payment Configuration (Section 15-28, 99)               */}
            {/* =============================================================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Payment Configuration</h2>
                  <p className="text-xs text-slate-500">
                    Configure payment settings for student subscription payments.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Row 1: Currency, Capture Mode, Webhook Secret */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Currency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="INR">INR - Indian Rupee (₹)</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Primary settlement currency.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Payment Capture <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={captureMode}
                      onChange={e => setCaptureMode(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="AUTOMATIC">Automatic (Recommended)</option>
                      <option value="MANUAL">Manual</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Instantly capture authorized transactions.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Webhook Secret <span className="text-red-500">*</span>
                      </label>
                      {config?.hasWebhookSecret && !isReplacingWebhookSecret && (
                        <button
                          type="button"
                          onClick={() => setIsReplacingWebhookSecret(true)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Replace
                        </button>
                      )}
                    </div>

                    {config?.hasWebhookSecret && !isReplacingWebhookSecret ? (
                      <div className="flex items-center justify-between px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-xs">
                        <span className="font-mono text-slate-600 tracking-wider">••••••••••••</span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Configured
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="password"
                          value={webhookSecret}
                          onChange={e => setWebhookSecret(e.target.value)}
                          placeholder="Webhook secret..."
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                        {isReplacingWebhookSecret && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsReplacingWebhookSecret(false);
                              setWebhookSecret('');
                            }}
                            className="text-[10px] text-slate-500 hover:underline"
                          >
                            Cancel replacement
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">Verifies Razorpay event signatures.</p>
                  </div>
                </div>

                {/* Row 2: Prefix, Order Expiry, Retry */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Payment Description Prefix
                    </label>
                    <input
                      type="text"
                      value={paymentDescPrefix}
                      onChange={e => setPaymentDescPrefix(e.target.value)}
                      placeholder="Study Karnataka Subscription"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Shown on Razorpay checkout header.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Order Expiry (Minutes) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={orderExpiry}
                      onChange={e => setOrderExpiry(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Time before open checkout expires.</p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="text-xs font-bold text-slate-800">Enable Payment Retry</div>
                        <div className="text-[11px] text-slate-500">Allow students to retry failed payments</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={retryEnabled}
                          onChange={e => setRetryEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section: Payment Method Toggles (Section 23-28) */}
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Payment Methods Enabled on Checkout
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* UPI */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                          UPI
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">UPI Payments</div>
                          <div className="text-[10px] text-slate-500">GPay, PhonePe, Paytm, BHIM</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={upiEnabled}
                          onChange={e => setUpiEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>

                    {/* Cards */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Cards</div>
                          <div className="text-[10px] text-slate-500">Credit & Debit (Visa, MC, RuPay)</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cardsEnabled}
                          onChange={e => setCardsEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>

                    {/* Net Banking */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Building size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Net Banking</div>
                          <div className="text-[10px] text-slate-500">All major Indian banks</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={netBankingEnabled}
                          onChange={e => setNetBankingEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>

                    {/* Wallets */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Wallet size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Wallets</div>
                          <div className="text-[10px] text-slate-500">Paytm, PhonePe, Mobikwik</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={walletEnabled}
                          onChange={e => setWalletEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>

                    {/* International */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Globe size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">International Cards</div>
                          <div className="text-[10px] text-slate-500">Foreign currency checkout</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={internationalEnabled}
                          onChange={e => setInternationalEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>

                    {/* EMI */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 opacity-60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">
                          EMI
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-700">EMI Plans</div>
                          <div className="text-[10px] text-slate-400">Credit card installments</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-200/60">
                        Not Configured
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* CARD 3: Webhook Configuration (Section 29-35, 100)               */}
            {/* =============================================================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Webhook Configuration</h2>
                  <p className="text-xs text-slate-500">
                    Configure webhook URL to receive payment events from Razorpay.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Webhook URL Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Webhook URL (Endpoint for Razorpay Dashboard)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={config?.webhookUrl || 'https://admin.studykarnataka.in/api/v1/webhooks/razorpay'}
                      className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 text-slate-800 outline-none select-all"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleCopyText(config?.webhookUrl || '', 'url')}
                      leftIcon={copiedUrl ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    >
                      {copiedUrl ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Add this exact URL in Razorpay Dashboard → Settings → Webhooks with your configured Webhook Secret.
                  </p>
                </div>

                {/* Webhook Events Multi-Select Chips (Section 31, 32) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Subscribed Webhook Events
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(config?.availableEvents || [
                      'payment.captured',
                      'payment.failed',
                      'order.paid',
                      'refund.created',
                      'refund.processed',
                      'refund.failed',
                    ]).map(evt => {
                      const isSelected = selectedWebhookEvents.includes(evt);
                      return (
                        <button
                          key={evt}
                          type="button"
                          onClick={() => toggleWebhookEvent(evt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 size={13} className="text-blue-600" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-slate-300" />
                          )}
                          {evt}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Razorpay pushes real-time status updates to these event listeners with cryptographic signature checks.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                isLoading={saving}
                leftIcon={<ShieldCheck size={16} />}
                className="px-6 py-2.5 shadow-sm"
              >
                Save Configuration
              </Button>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* RIGHT SIDEBAR COLUMN (approx 25-30%)                               */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-6">
            {/* =============================================================== */}
            {/* RIGHT CARD 1: Connection Status (Section 36-40, 101)             */}
            {/* =============================================================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Connection Status</h3>
                {renderStatusBadge(config?.status)}
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Environment</span>
                    <span className="font-semibold text-slate-900">
                      {config?.environment === 'LIVE' ? 'Production (Live)' : 'Sandbox (Test)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Key ID</span>
                    <span className="font-mono text-slate-800 font-semibold">{config?.maskedKeyId}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Key Secret</span>
                    <span className="font-mono text-slate-700">
                      {config?.hasKeySecret ? '••••••••••••' : 'Not Configured'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Webhook URL</span>
                    <span className="text-emerald-700 font-semibold text-[11px]">Ready</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Last Verified</span>
                    <span className="text-slate-800 font-semibold">
                      {config?.lastVerifiedAt
                        ? format(new Date(config.lastVerifiedAt), 'dd MMM yyyy, hh:mm a')
                        : 'Never verified'}
                    </span>
                  </div>
                </div>

                {/* Connection Test Result Feedback */}
                {connectionTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      connectionTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {connectionTestResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {connectionTestResult.status}
                    </div>
                    {connectionTestResult.error && (
                      <div className="mt-1 text-[11px]">{connectionTestResult.error}</div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  isLoading={testingConnection}
                  leftIcon={<RefreshCw size={14} className={testingConnection ? 'animate-spin' : ''} />}
                  className="w-full justify-center"
                >
                  Test Connection
                </Button>
              </div>
            </div>

            {/* =============================================================== */}
            {/* RIGHT CARD 2: Webhook Events (Section 41-44, 102)                */}
            {/* =============================================================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Webhook Events</h3>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>

              <div className="p-5 space-y-3">
                {[
                  { name: 'payment.captured', label: 'Payment Captured' },
                  { name: 'payment.failed', label: 'Payment Failed' },
                  { name: 'order.paid', label: 'Order Paid' },
                  { name: 'refund.processed', label: 'Refund Processed' },
                  { name: 'refund.created', label: 'Refund Created' },
                ].map(evt => (
                  <div key={evt.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="font-mono text-slate-700 text-[11px]">{evt.name}</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">Receiving events</span>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  onClick={handleOpenWebhookLogs}
                  leftIcon={<Activity size={14} />}
                  className="w-full justify-center text-xs mt-2 border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  View Recent Webhook Events
                </Button>
              </div>
            </div>

            {/* =============================================================== */}
            {/* RIGHT CARD 3: Supported Payment Methods (Section 45, 46, 103)    */}
            {/* =============================================================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Supported Payment Methods</h3>
                <span className="text-xs text-slate-400 font-medium">Gateway sync</span>
              </div>

              <div className="p-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="font-medium text-slate-800">UPI</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${upiEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    {upiEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="font-medium text-slate-800">Credit / Debit Cards</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${cardsEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    {cardsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="font-medium text-slate-800">Net Banking</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${netBankingEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    {netBankingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="font-medium text-slate-800">Wallets</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${walletEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    {walletEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="font-medium text-slate-800">International Cards</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${internationalEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    {internationalEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="font-medium text-slate-800">EMI</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-400">
                    Not Configured
                  </span>
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* RIGHT CARD 4: Test Payment (Section 47-50, 104)                  */}
            {/* =============================================================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play size={16} className="text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Test Payment</h3>
                </div>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Sandbox Only
                </span>
              </div>

              <div className="p-5 space-y-4">
                {selectedEnv === 'LIVE' ? (
                  <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600" />
                      Live Mode Active
                    </div>
                    <p className="text-[11px]">
                      Test payments are disabled in Live Production mode to prevent unintended real financial charges. Switch to Sandbox/Test mode to execute test checkouts.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">
                      Create a test payment in sandbox mode to verify transaction creation, order linking, and subscriptions.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Test Amount (INR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={50000}
                          value={testPaymentAmount}
                          onChange={e => setTestPaymentAmount(Number(e.target.value))}
                          className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleCreateTestPayment}
                      isLoading={creatingTestPayment}
                      leftIcon={<Zap size={14} />}
                      className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Create Test Payment
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: ENVIRONMENT SWITCH CONFIRMATION (Section 70, 71)               */}
      {/* ===================================================================== */}
      {switchEnvModalOpen && pendingEnvSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => !saving && setSwitchEnvModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  pendingEnvSwitch === 'LIVE' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {pendingEnvSwitch === 'LIVE'
                    ? 'Switch to Production (Live)?'
                    : 'Switch to Sandbox (Test)?'}
                </h3>
                <p className="text-xs text-slate-500">
                  {pendingEnvSwitch === 'LIVE'
                    ? 'You are switching Razorpay to Live Production mode. Real money will be collected from students.'
                    : 'You are switching Razorpay to Sandbox mode. Simulated test payments will be used.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Environment:</span>
                <span className="font-semibold text-slate-800">{selectedEnv}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">New Target Environment:</span>
                <span className="font-bold text-blue-600">{pendingEnvSwitch}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setSwitchEnvModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className={pendingEnvSwitch === 'LIVE' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={handleConfirmEnvSwitch}
                isLoading={saving}
              >
                Confirm Environment Switch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DRAWER: RECENT WEBHOOK EVENTS LOG (Section 42)                        */}
      {/* ===================================================================== */}
      {webhookDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setWebhookDrawerOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10 flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Webhook Events</h3>
                <p className="text-xs text-slate-500">Audit logs of incoming Razorpay event dispatches</p>
              </div>
              <button
                type="button"
                onClick={() => setWebhookDrawerOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingWebhookLogs ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : webhookLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No webhook events received yet. Incoming events from Razorpay will appear here.
                </div>
              ) : (
                webhookLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{log.eventType}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            log.status === 'PROCESSED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {log.receivedAt ? format(new Date(log.receivedAt), 'dd MMM, hh:mm a') : '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400">Event ID:</span>{' '}
                        <span className="font-mono">{log.eventId || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Order ID:</span>{' '}
                        <span className="font-mono">{log.orderId || '—'}</span>
                      </div>
                    </div>

                    {log.errorMessage && (
                      <div className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                        {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="outline" onClick={() => setWebhookDrawerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TEST PAYMENT RESULT MODAL (Section 50)                         */}
      {/* ===================================================================== */}
      {testPaymentResultModalOpen && testPaymentResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setTestPaymentResultModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Test Payment Successful</h3>
                <p className="text-xs text-slate-500">
                  Sandbox transaction created and verified successfully.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Number:</span>
                <span className="font-mono font-bold text-slate-800">{testPaymentResult.transactionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono text-slate-800">{testPaymentResult.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment ID:</span>
                <span className="font-mono text-slate-800">{testPaymentResult.paymentId}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-700">Amount Charged (Test):</span>
                <span className="text-emerald-700">₹{testPaymentResult.amount}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => setTestPaymentResultModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
