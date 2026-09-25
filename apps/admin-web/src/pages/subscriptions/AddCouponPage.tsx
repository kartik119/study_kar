import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Percent,
  Check,
  CheckCircle2,
  Users,
  ChevronDown,
  X,
  AlertCircle,
  Layers
} from 'lucide-react';
import { couponsApi } from '../../api/coupons.api';
import { SubscriptionModulesApi, SubscriptionModule } from '../../api/subscription-modules.api';
import { PlansApi, SubscriptionPlan } from '../../api/plans.api';

export const AddCouponPage: React.FC = () => {
  const navigate = useNavigate();

  // Reference data
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [_loadingData, setLoadingData] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [maximumDiscount, setMaximumDiscount] = useState<string>('');

  // Applicability state
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState<boolean>(false);
  const [planDropdownOpen, setPlanDropdownOpen] = useState<boolean>(false);

  // Validity state
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const thirtyDaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 29);
    return d.toISOString().slice(0, 10);
  }, []);

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(thirtyDaysStr);

  // Usage Limit state
  const [usageType, setUsageType] = useState<'LIMITED' | 'UNLIMITED'>('LIMITED');
  const [maximumUsage, setMaximumUsage] = useState<string>('');
  const [usagePerStudent, setUsagePerStudent] = useState<string>('1');

  // Additional Settings state
  const [isActive, setIsActive] = useState<boolean>(true);
  const [showPublicly, setShowPublicly] = useState<boolean>(true);
  const [minimumOrderAmount, setMinimumOrderAmount] = useState<string>('0');
  const [firstTimeOnly, setFirstTimeOnly] = useState<boolean>(false);

  // Internal Notes state
  const [internalNotes, setInternalNotes] = useState<string>('');

  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const planDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(e.target as Node)) {
        setModuleDropdownOpen(false);
      }
      if (planDropdownRef.current && !planDropdownRef.current.contains(e.target as Node)) {
        setPlanDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch modules and plans
  useEffect(() => {
    const loadRefData = async () => {
      try {
        setLoadingData(true);
        const [modRes, planRes] = await Promise.all([
          SubscriptionModulesApi.getModules({ pageSize: 100 }).catch(() => ({ items: [] })),
          PlansApi.getPlans({ pageSize: 100 }).catch(() => ({ items: [] }))
        ]);
        const fetchedModules = modRes.items || [];
        const fetchedPlans = planRes.items || [];
        setModules(fetchedModules);
        setPlans(fetchedPlans);

        // Pre-select first module matching UPSC or default
        if (fetchedModules.length > 0) {
          const upscMod = fetchedModules.find(m => m.name.toLowerCase().includes('upsc')) || fetchedModules[0];
          setSelectedModuleIds([upscMod.id]);

          // Pre-select plans belonging to that module
          const modPlans = fetchedPlans.filter(p => p.moduleId === upscMod.id);
          if (modPlans.length > 0) {
            setSelectedPlanIds(modPlans.slice(0, 3).map(p => p.id));
          }
        }
      } catch (err: any) {
        console.error('Failed to load modules/plans:', err);
      } finally {
        setLoadingData(false);
      }
    };
    loadRefData();
  }, []);

  // Calculate Total Validity days
  const totalValidityDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  }, [startDate, endDate]);

  // Format date display for Preview: "01 Sep 2026"
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Filter plans available for selection (based on selected modules if any)
  const availablePlans = useMemo(() => {
    if (selectedModuleIds.length === 0) return plans;
    return plans.filter(p => selectedModuleIds.includes(p.moduleId));
  }, [plans, selectedModuleIds]);

  // Selected names for preview
  const selectedModuleNames = useMemo(() => {
    if (selectedModuleIds.length === 0) return 'All Modules';
    return modules
      .filter(m => selectedModuleIds.includes(m.id))
      .map(m => m.name)
      .join(', ');
  }, [modules, selectedModuleIds]);

  const selectedPlanNames = useMemo(() => {
    if (selectedPlanIds.length === 0) return 'All Plans in Module';
    return plans
      .filter(p => selectedPlanIds.includes(p.id))
      .map(p => p.name)
      .join(', ');
  }, [plans, selectedPlanIds]);

  // Handlers for module multi-select
  const toggleModule = (id: string) => {
    setSelectedModuleIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const removeModule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedModuleIds(prev => prev.filter(mId => mId !== id));
  };

  // Handlers for plan multi-select
  const togglePlan = (id: string) => {
    setSelectedPlanIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const removePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlanIds(prev => prev.filter(pId => pId !== id));
  };

  // Submit Handler
  const handleSave = async (submitStatus: 'ACTIVE' | 'DRAFT') => {
    if (!code.trim()) {
      setError('Please provide a coupon code.');
      return;
    }
    if (!name.trim()) {
      setError('Please provide a coupon name.');
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      setError('Please provide a valid discount value greater than 0.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let scopeType: 'ALL_PLANS' | 'SELECTED_MODULES' | 'SELECTED_PLANS' | 'SELECTED_MODULES_AND_PLANS' = 'ALL_PLANS';
      if (selectedModuleIds.length > 0 && selectedPlanIds.length > 0) {
        scopeType = 'SELECTED_MODULES_AND_PLANS';
      } else if (selectedModuleIds.length > 0) {
        scopeType = 'SELECTED_MODULES';
      } else if (selectedPlanIds.length > 0) {
        scopeType = 'SELECTED_PLANS';
      }

      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        discountType,
        discountValue: Number(discountValue),
        maximumDiscount: Number(maximumDiscount) > 0 ? Number(maximumDiscount) : null,
        minimumOrderAmount: Number(minimumOrderAmount) > 0 ? Number(minimumOrderAmount) : null,
        scopeType,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        usageType,
        maximumUsage: usageType === 'LIMITED' ? Number(maximumUsage || 1) : null,
        usagePerStudent: Number(usagePerStudent || 1),
        firstTimeOnly,
        isActive: submitStatus === 'ACTIVE' ? isActive : false,
        showPublicly,
        status: submitStatus,
        internalNotes: internalNotes.trim() || undefined,
        applicableModules: selectedModuleIds,
        applicablePlans: selectedPlanIds,
      };

      const res = await couponsApi.createCoupon(payload);
      if (res.success || res.data) {
        navigate('/subscriptions/coupons');
      } else {
        setError(res.message || 'Failed to save coupon.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '16px 32px 40px 32px' }}>
      {/* 1. Header & Breadcrumb */}
      <div style={{ maxWidth: '1440px', margin: '0 auto', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '10px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Admin</span>
          <span>/</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/subscriptions/coupons')}>Subscriptions & Payments</span>
          <span>/</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/subscriptions/coupons')}>Coupons</span>
          <span>/</span>
          <span style={{ color: '#0F172A', fontWeight: 600 }}>Add Coupon</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Add Coupon
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/subscriptions/coupons')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <ArrowLeft size={16} />
            Back to Coupons
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div style={{ maxWidth: '1440px', margin: '0 auto 20px auto', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', color: '#B91C1C' }}>
          <AlertCircle size={20} />
          <div style={{ fontSize: '13px', fontWeight: 500 }}>{error}</div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.85fr) minmax(360px, 1fr)',
          gap: '28px',
          alignItems: 'start'
        }}
      >
        {/* ========================================================================= */}
        {/* LEFT COLUMN: THE FORM SECTIONS 1 TO 6                                    */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* SECTION 1: Basic Information */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                1
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Basic Information
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1: Coupon Code & Coupon Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Coupon Code <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="UPSC20"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Enter a unique coupon code (e.g., UPSC20)
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Coupon Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="UPSC Launch Offer"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    A short name for internal reference
                  </span>
                </div>
              </div>

              {/* Row 2: Description */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Get 20% discount on all UPSC Full Access plans."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  {description.length}/500
                </div>
              </div>

              {/* Row 3: Coupon Type, Discount Value, Maximum Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Coupon Type <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="PERCENTAGE">Percentage Discount</option>
                    <option value="FIXED_AMOUNT">Flat Amount Discount</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Discount Value <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder="20"
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: '1px',
                        width: '32px',
                        height: 'calc(100% - 2px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#F1F5F9',
                        color: '#64748B',
                        borderTopRightRadius: '7px',
                        borderBottomRightRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 600
                      }}
                    >
                      {discountType === 'PERCENTAGE' ? '%' : '₹'}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Maximum Discount (Optional)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '1px',
                        width: '32px',
                        height: 'calc(100% - 2px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#F1F5F9',
                        color: '#64748B',
                        borderTopLeftRadius: '7px',
                        borderBottomLeftRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 600
                      }}
                    >
                      ₹
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={maximumDiscount}
                      onChange={e => setMaximumDiscount(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 40px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Leave 0 for no limit
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Applicability */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                2
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Applicability
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Applicable Modules */}
              <div ref={moduleDropdownRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Applicable Modules <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div
                  onClick={() => setModuleDropdownOpen(prev => !prev)}
                  style={{
                    minHeight: '42px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                    {selectedModuleIds.length === 0 ? (
                      <span style={{ color: '#94A3B8', fontSize: '14px' }}>All Modules (Click to select)</span>
                    ) : (
                      selectedModuleIds.map(id => {
                        const m = modules.find(item => item.id === id);
                        return (
                          <span
                            key={id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '2px 8px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            {m?.name || 'Module'}
                            <X
                              size={13}
                              style={{ cursor: 'pointer' }}
                              onClick={e => removeModule(id, e)}
                            />
                          </span>
                        );
                      })
                    )}
                  </div>
                  <ChevronDown size={16} color="#64748B" />
                </div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Select modules this coupon can be used for
                </span>

                {/* Dropdown Menu */}
                {moduleDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      marginTop: '4px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '4px'
                    }}
                  >
                    {modules.map(mod => {
                      const isSelected = selectedModuleIds.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleModule(mod.id)}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                            color: isSelected ? '#1D4ED8' : '#1E293B',
                            fontSize: '13px',
                            fontWeight: isSelected ? 600 : 400
                          }}
                        >
                          <span>{mod.name}</span>
                          {isSelected && <Check size={14} color="#1D4ED8" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Applicable Plans */}
              <div ref={planDropdownRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Applicable Plans <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div
                  onClick={() => setPlanDropdownOpen(prev => !prev)}
                  style={{
                    minHeight: '42px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                    {selectedPlanIds.length === 0 ? (
                      <span style={{ color: '#94A3B8', fontSize: '14px' }}>All Plans (Click to specify)</span>
                    ) : (
                      selectedPlanIds.map(id => {
                        const p = plans.find(item => item.id === id);
                        return (
                          <span
                            key={id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '2px 8px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            {p?.name || 'Plan'}
                            <X
                              size={13}
                              style={{ cursor: 'pointer' }}
                              onClick={e => removePlan(id, e)}
                            />
                          </span>
                        );
                      })
                    )}
                  </div>
                  <ChevronDown size={16} color="#64748B" />
                </div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Select specific plans or keep empty for all plans of selected modules
                </span>

                {/* Dropdown Menu */}
                {planDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      marginTop: '4px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '4px'
                    }}
                  >
                    {availablePlans.map(pl => {
                      const isSelected = selectedPlanIds.includes(pl.id);
                      return (
                        <div
                          key={pl.id}
                          onClick={() => togglePlan(pl.id)}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                            color: isSelected ? '#1D4ED8' : '#1E293B',
                            fontSize: '13px',
                            fontWeight: isSelected ? 600 : 400
                          }}
                        >
                          <div>
                            <div>{pl.name}</div>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>₹{pl.price}</span>
                          </div>
                          {isSelected && <Check size={14} color="#1D4ED8" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Validity Period */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                3
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Validity Period
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Start Date <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  End Date <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Total Validity Badge Card */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Total Validity
                </label>
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    height: '42px',
                    boxSizing: 'border-box'
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#2563EB' }}>
                    {totalValidityDays} Days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Usage Limit */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                4
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Usage Limit
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Usage Type <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={usageType}
                  onChange={e => setUsageType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="LIMITED">Limited Usage</option>
                  <option value="UNLIMITED">Unlimited</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Maximum Usage <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={usageType === 'UNLIMITED' ? '' : maximumUsage}
                  disabled={usageType === 'UNLIMITED'}
                  onChange={e => setMaximumUsage(e.target.value)}
                  placeholder={usageType === 'UNLIMITED' ? 'Unlimited' : '500'}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: usageType === 'UNLIMITED' ? '#F1F5F9' : '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Total number of times this coupon can be used
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Usage Per Student <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={usagePerStudent}
                  onChange={e => setUsagePerStudent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="1">Single Use</option>
                  <option value="2">2 Times</option>
                  <option value="3">3 Times</option>
                  <option value="5">5 Times</option>
                  <option value="999">Unlimited</option>
                </select>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  How many times a single student can use this coupon
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: Additional Settings */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                5
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Additional Settings
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left Column: Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Active Toggle */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                    Active
                  </div>
                  <div
                    onClick={() => setIsActive(prev => !prev)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '22px',
                        borderRadius: '12px',
                        backgroundColor: isActive ? '#2563EB' : '#CBD5E1',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        flexShrink: 0
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          position: 'absolute',
                          top: '3px',
                          left: isActive ? '23px' : '3px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '13px', color: '#475569' }}>
                      Enable this coupon for use
                    </span>
                  </div>
                </div>

                {/* Show on Website / App Toggle */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                    Show on Website / App
                  </div>
                  <div
                    onClick={() => setShowPublicly(prev => !prev)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '22px',
                        borderRadius: '12px',
                        backgroundColor: showPublicly ? '#2563EB' : '#CBD5E1',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        flexShrink: 0
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          position: 'absolute',
                          top: '3px',
                          left: showPublicly ? '23px' : '3px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '13px', color: '#475569' }}>
                      Display this coupon to students
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Minimum Order & First Time User */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Minimum Order Amount (Optional)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '1px',
                        width: '32px',
                        height: 'calc(100% - 2px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#F1F5F9',
                        color: '#64748B',
                        borderTopLeftRadius: '7px',
                        borderBottomLeftRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 600
                      }}
                    >
                      ₹
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={minimumOrderAmount}
                      onChange={e => setMinimumOrderAmount(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 40px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Minimum plan amount required to apply this coupon
                  </span>
                </div>

                {/* First Time User Only Toggle */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                    First Time User Only
                  </div>
                  <div
                    onClick={() => setFirstTimeOnly(prev => !prev)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '22px',
                        borderRadius: '12px',
                        backgroundColor: firstTimeOnly ? '#2563EB' : '#CBD5E1',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        flexShrink: 0
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          position: 'absolute',
                          top: '3px',
                          left: firstTimeOnly ? '23px' : '3px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '13px', color: '#475569' }}>
                      Allow only new students to use this coupon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: Internal Notes (Optional) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                6
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Internal Notes (Optional)
              </h2>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Notes
              </label>
              <textarea
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value.slice(0, 500))}
                placeholder="Add any internal notes about this coupon..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                {internalNotes.length}/500
              </div>
            </div>
          </div>

          {/* Form Action Buttons Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '32px' }}>
            <button
              type="button"
              onClick={() => navigate('/subscriptions/coupons')}
              style={{
                padding: '10px 24px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              Cancel
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave('DRAFT')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#2563EB',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave('ACTIVE')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)'
                }}
              >
                {submitting ? 'Creating...' : 'Create Coupon'}
              </button>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: COUPON PREVIEW (STICKY)                                     */}
        {/* ========================================================================= */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 14px 0' }}>
            Coupon Preview
          </h3>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            {/* Top Ticket-styled Card */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1.5px dashed #93C5FD',
                borderRadius: '12px',
                padding: '18px 20px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Semi-circle Ticket Cutouts on left & right */}
              <div
                style={{
                  position: 'absolute',
                  left: '-10px',
                  top: '115px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px dashed #93C5FD'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '-10px',
                  top: '115px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px dashed #93C5FD'
                }}
              />

              {/* Code & Status Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>
                  {code || 'COUPON'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9',
                    color: isActive ? '#15803D' : '#64748B'
                  }}
                >
                  {isActive ? 'Active' : 'Draft'}
                </span>
              </div>

              {/* Discount Amount Headline */}
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#2563EB', margin: '8px 0 2px 0' }}>
                {discountType === 'PERCENTAGE'
                  ? `${discountValue || 0}% OFF`
                  : `₹${discountValue || 0} OFF`}
              </div>

              {/* Coupon Name */}
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                {name || 'Coupon Name'}
              </div>

              {/* Description */}
              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 18px 0', lineHeight: '1.4' }}>
                {description || 'No description provided.'}
              </p>

              {/* Dashed line separator */}
              <div style={{ borderTop: '1px dashed #CBD5E1', margin: '0 -20px 14px -20px' }} />

              {/* Validity row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Valid From</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                    {formatDateDisplay(startDate)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Valid Till</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                    {formatDateDisplay(endDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown Below Ticket */}
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 1. Applies To */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  <Layers size={14} color="#2563EB" />
                  <span>Applies To</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Module</span>
                    <span style={{ fontWeight: 600, color: '#0F172A', textAlign: 'right', maxWidth: '180px' }}>
                      {selectedModuleNames}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Plans</span>
                    <span style={{ fontWeight: 600, color: '#0F172A', textAlign: 'right', maxWidth: '180px' }}>
                      {selectedPlanNames}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9' }} />

              {/* 2. Discount Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  <Percent size={14} color="#2563EB" />
                  <span>Discount Details</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Discount Type</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {discountType === 'PERCENTAGE' ? 'Percentage Discount' : 'Flat Amount Discount'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Discount Value</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {discountType === 'PERCENTAGE' ? `${discountValue || 0}%` : `₹${discountValue || 0}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Maximum Discount</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {Number(maximumDiscount) > 0 ? `₹${maximumDiscount}` : 'No Limit'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Minimum Order Amount</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {Number(minimumOrderAmount) > 0 ? `₹${minimumOrderAmount}` : 'No Minimum'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9' }} />

              {/* 3. Usage Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  <Users size={14} color="#2563EB" />
                  <span>Usage Details</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Usage Type</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {usageType === 'LIMITED' ? 'Limited Usage' : 'Unlimited'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Maximum Usage</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {usageType === 'LIMITED' ? (maximumUsage || '0') : 'Unlimited'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Usage Per Student</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {usagePerStudent === '1' ? 'Single Use' : usagePerStudent === '999' ? 'Unlimited' : `${usagePerStudent} Uses`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>First Time User Only</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {firstTimeOnly ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9' }} />

              {/* 4. Status */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  <CheckCircle2 size={14} color="#16A34A" />
                  <span>Status</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Active</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {isActive ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Show on Website/App</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {showPublicly ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
