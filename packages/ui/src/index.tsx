import React from 'react';
import ReactDOM from 'react-dom';
import { colors, radius, shadows, typography } from '@study-karnataka/config';

/* -------------------------------------------------------------------------- */
/* 1. BUTTON & ICON BUTTON                                                    */
/* -------------------------------------------------------------------------- */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    fontFamily: typography.fontFamily,
    fontWeight: 600,
    borderRadius: radius.control,
    border: '1px solid transparent',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.15s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    outline: 'none',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: colors.primaryBlue, color: '#FFFFFF', borderColor: colors.primaryBlue },
    secondary: { backgroundColor: '#FFFFFF', color: colors.bodyText, borderColor: colors.border },
    outline: { backgroundColor: 'transparent', color: colors.bodyText, borderColor: colors.border },
    ghost: { backgroundColor: 'transparent', color: colors.bodyText },
    danger: { backgroundColor: colors.softRed, color: colors.error, borderColor: colors.softRed },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '14px 24px', fontSize: '16px' },
  };

  return (
    <button
      style={{ ...baseStyle, ...variantStyles[variant], ...sizeStyles[size], ...style }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <LoadingSpinner size="sm" /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  ariaLabel: string;
  variant?: 'ghost' | 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  ariaLabel,
  variant = 'ghost',
  size = 'md',
  style,
  ...props
}) => {
  const sizeDim: Record<string, string> = { sm: '32px', md: '40px', lg: '48px' };
  const variantStyles: Record<string, React.CSSProperties> = {
    ghost: { backgroundColor: 'transparent', color: colors.bodyText, border: 'none' },
    outline: { backgroundColor: '#FFFFFF', color: colors.darkHeading, border: `1px solid ${colors.border}` },
    filled: { backgroundColor: colors.softBlue, color: colors.primaryBlue, border: 'none' },
  };

  return (
    <button
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        width: sizeDim[size],
        height: sizeDim[size],
        borderRadius: radius.control,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {icon}
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. INPUTS, SELECT, CHECKBOX, RADIO, TEXTAREA & FORM FIELD                 */
/* -------------------------------------------------------------------------- */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({ error, style, ...props }) => (
  <input
    style={{
      width: '100%',
      padding: '10px 14px',
      borderRadius: radius.control,
      border: `1px solid ${error ? colors.error : colors.border}`,
      backgroundColor: '#FFFFFF',
      color: colors.darkHeading,
      fontFamily: typography.fontFamily,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s ease',
      ...style,
    }}
    {...props}
  />
);

export const SearchInput: React.FC<InputProps> = ({ style, ...props }) => (
  <div style={{ position: 'relative', width: '100%' }}>
    <Input style={{ paddingLeft: '36px', ...style }} placeholder="Search..." {...props} />
    <span
      style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: colors.secondaryText,
        fontSize: '14px',
      }}
    >
      🔍
    </span>
  </div>
);

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({ options, style, ...props }) => (
  <select
    style={{
      width: '100%',
      padding: '10px 14px',
      borderRadius: radius.control,
      border: `1px solid ${colors.border}`,
      backgroundColor: '#FFFFFF',
      color: colors.darkHeading,
      fontFamily: typography.fontFamily,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      ...style,
    }}
    {...props}
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

export interface ComboboxOption {
  value: string;
  label: string;
  subtitle?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  searchable?: boolean;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  isLoading = false,
  searchable = true,
  style,
  className,
  id,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(term))
    );
  }, [options, search]);

  const handleSelect = (optValue: string) => {
    if (disabled || isLoading) return;
    onChange(optValue);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div
      ref={containerRef}
      id={id}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        fontFamily: typography.fontFamily,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled && !isLoading) setIsOpen(!isOpen);
        }}
        onKeyDown={(e) => {
          if (disabled || isLoading) return;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          minHeight: '42px',
          borderRadius: radius.control,
          border: `1px solid ${isOpen ? colors.primaryBlue : colors.border}`,
          boxShadow: isOpen ? '0 0 0 3px rgba(8, 75, 122, 0.15)' : shadows.sm,
          backgroundColor: disabled ? '#F8FAFC' : '#FFFFFF',
          color: selectedOption ? colors.darkHeading : colors.secondaryText,
          fontSize: '14px',
          fontWeight: selectedOption ? 500 : 400,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s ease-in-out',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <span
              style={{
                fontSize: '10px',
                color: colors.secondaryText,
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              ▼
            </span>
          )}
        </div>
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 120,
            backgroundColor: colors.cardBackground,
            borderRadius: radius.control,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.lg,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px',
            boxSizing: 'border-box',
          }}
        >
          {searchable && options.length > 5 && (
            <div style={{ padding: '4px', marginBottom: '6px', borderBottom: `1px solid ${colors.border}` }}>
              <input
                type="text"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search..."
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: typography.fontFamily,
                }}
              />
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: '13px', color: colors.secondaryText, textAlign: 'center' }}>
              No options found
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt.value);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? colors.selectedBg : 'transparent',
                    color: isSelected ? colors.selectedText : colors.darkHeading,
                    fontWeight: isSelected ? 600 : 400,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.pageBackground;
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{opt.label}</span>
                    {isSelected && <span style={{ fontSize: '12px' }}>✓</span>}
                  </div>
                  {opt.subtitle && (
                    <span style={{ fontSize: '11px', color: colors.secondaryText, fontWeight: 400 }}>
                      {opt.subtitle}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};


export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, id, style, ...props }) => {
  const inputId = id || `cb-${Math.random().toString(36).substring(2, 9)}`;
  return (
    <label
      htmlFor={inputId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        color: colors.bodyText,
      }}
    >
      <input
        type="checkbox"
        id={inputId}
        style={{ accentColor: colors.primaryBlue, width: '16px', height: '16px', ...style }}
        {...props}
      />
      {label}
    </label>
  );
};

export interface RadioGroupProps {
  name: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ name, options, selectedValue, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {options.map((opt) => (
      <label
        key={opt.value}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          color: colors.bodyText,
        }}
      >
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={selectedValue === opt.value}
          onChange={() => onChange(opt.value)}
          style={{ accentColor: colors.primaryBlue }}
        />
        {opt.label}
      </label>
    ))}
  </div>
);

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ error, style, ...props }) => (
  <textarea
    style={{
      width: '100%',
      padding: '10px 14px',
      borderRadius: radius.control,
      border: `1px solid ${error ? colors.error : colors.border}`,
      backgroundColor: '#FFFFFF',
      color: colors.darkHeading,
      fontFamily: typography.fontFamily,
      fontSize: '14px',
      minHeight: '80px',
      outline: 'none',
      boxSizing: 'border-box',
      ...style,
    }}
    {...props}
  />
);

export interface FormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, helperText, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
    <label style={{ fontSize: '14px', fontWeight: 500, color: colors.darkHeading }}>
      {label}
      {required && <span style={{ color: colors.primaryRed, marginLeft: '4px' }}>*</span>}
    </label>
    {children}
    {error ? (
      <span style={{ fontSize: '12px', color: colors.error }}>{error}</span>
    ) : helperText ? (
      <span style={{ fontSize: '12px', color: colors.secondaryText }}>{helperText}</span>
    ) : null}
  </div>
);

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled = false }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '40px',
        height: '22px',
        borderRadius: radius.pill,
        backgroundColor: checked ? colors.primaryBlue : colors.border,
        position: 'relative',
        transition: 'background-color 0.2s ease',
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          position: 'absolute',
          top: '2px',
          left: checked ? '20px' : '2px',
          transition: 'left 0.2s ease',
          boxShadow: shadows.sm,
        }}
      />
    </div>
    {label && <span style={{ fontSize: '14px', fontWeight: 500, color: colors.darkHeading }}>{label}</span>}
  </label>
);

/* -------------------------------------------------------------------------- */
/* 3. BADGES & STATUS BADGES                                                  */
/* -------------------------------------------------------------------------- */
export interface BadgeProps {
  label: string;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'info' }) => {
  const styles: Record<string, React.CSSProperties> = {
    info: { backgroundColor: colors.softBlue, color: colors.info },
    success: { backgroundColor: colors.softGreen, color: colors.success },
    warning: { backgroundColor: colors.softOrange, color: colors.warmOrange },
    error: { backgroundColor: colors.softRed, color: colors.primaryRed },
    neutral: { backgroundColor: colors.pageBackground, color: colors.secondaryText },
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: radius.pill,
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...styles[variant],
      }}
    >
      {label}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string }> = ({ status }) => {
  const variantMap: Record<string, BadgeProps['variant']> = {
    ACTIVE: 'success',
    INACTIVE: 'neutral',
    SUSPENDED: 'error',
  };
  return <Badge label={status} variant={variantMap[status] || 'info'} />;
};

/* -------------------------------------------------------------------------- */
/* 4. CARDS & METRIC CARDS                                                    */
/* -------------------------------------------------------------------------- */
export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, style }) => (
  <div
    style={{
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      border: `1px solid ${colors.border}`,
      padding: '20px',
      boxShadow: shadows.card,
      ...style,
    }}
  >
    {title && (
      <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: colors.darkHeading }}>
        {title}
      </h3>
    )}
    {subtitle && (
      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: colors.secondaryText }}>{subtitle}</p>
    )}
    {children}
  </div>
);

export interface MetricCardProps {
  title: string;
  value: string | number;
  changeLabel?: string;
  icon?: React.ReactNode;
  badgeText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, changeLabel, icon, badgeText }) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
      <span style={{ fontSize: '14px', fontWeight: 500, color: colors.secondaryText }}>{title}</span>
      {badgeText ? <Badge label={badgeText} variant="neutral" /> : icon}
    </div>
    <div style={{ fontSize: '28px', fontWeight: 700, color: colors.darkHeading }}>{value}</div>
    {changeLabel && (
      <span style={{ fontSize: '12px', color: colors.secondaryText, marginTop: '4px', display: 'block' }}>
        {changeLabel}
      </span>
    )}
  </Card>
);

/* -------------------------------------------------------------------------- */
/* 5. ALERT, MODAL, DRAWER, DROPDOWN                                          */
/* -------------------------------------------------------------------------- */
export interface AlertProps {
  title?: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export const Alert: React.FC<AlertProps> = ({ title, message, variant = 'info' }) => {
  const styles: Record<string, React.CSSProperties> = {
    info: { backgroundColor: colors.softBlue, borderColor: colors.info, color: '#1E40AF' },
    success: { backgroundColor: colors.softGreen, borderColor: colors.success, color: '#065F46' },
    warning: { backgroundColor: colors.softOrange, borderColor: colors.warmOrange, color: '#92400E' },
    error: { backgroundColor: colors.softRed, borderColor: colors.primaryRed, color: colors.darkRed },
  };

  return (
    <div
      role="alert"
      style={{
        padding: '12px 16px',
        borderRadius: radius.control,
        borderLeft: '4px solid',
        fontSize: '14px',
        ...styles[variant],
      }}
    >
      {title && <strong style={{ display: 'block', marginBottom: '2px' }}>{title}</strong>}
      {message}
    </div>
  );
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: radius.panel,
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: shadows.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.5)', zIndex: 90 }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          width: '320px',
          backgroundColor: '#FFFFFF',
          padding: '20px',
          boxShadow: shadows.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: { label: string; onClick: () => void; danger?: boolean }[];
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, right: 0, bottom: 0, isRight: true, isUp: false });

  React.useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };

    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceOnRight = window.innerWidth - rect.right;
        const isRightAligned = spaceOnRight < 120;
        const estimatedHeight = items.length * 36 + 16;
        const spaceBelow = window.innerHeight - rect.bottom;
        const isUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

        setCoords({
          top: rect.bottom + 4,
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          right: window.innerWidth - rect.right,
          isRight: isRightAligned,
          isUp,
        });
      }
    };

    updatePosition();
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>
      {open && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            ...(coords.isRight ? { right: coords.right } : { left: coords.left }),
            ...(coords.isUp ? { bottom: coords.bottom } : { top: coords.top }),
            backgroundColor: '#FFFFFF',
            borderRadius: radius.control,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.card,
            minWidth: '120px',
            zIndex: 9999,
            padding: '4px 0',
          }}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 14px',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '14px',
                color: item.danger ? colors.error : colors.darkHeading,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 6. TABLE, PAGINATION, TABS, BREADCRUMB                                     */
/* -------------------------------------------------------------------------- */
export interface TableProps {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}

export const Table: React.FC<TableProps> = ({ headers, rows }) => (
  <div style={{ overflowX: 'auto', borderRadius: radius.card, border: `1px solid ${colors.border}` }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF', fontSize: '14px' }}>
      <thead style={{ backgroundColor: colors.pageBackground, borderBottom: `1px solid ${colors.border}` }}>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: colors.secondaryText }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rIdx) => (
          <tr key={rIdx} style={{ borderBottom: rIdx === rows.length - 1 ? 'none' : `1px solid ${colors.border}` }}>
            {row.map((cell, cIdx) => (
              <td key={cIdx} style={{ padding: '12px 16px', color: colors.bodyText }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
    <span style={{ fontSize: '14px', color: colors.secondaryText }}>{`Page ${currentPage} of ${totalPages}`}</span>
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
        Previous
      </Button>
      <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
        Next
      </Button>
    </div>
  </div>
);

export interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => (
  <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, gap: '16px', marginBottom: '16px' }}>
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '10px 4px',
            border: 'none',
            borderBottom: isActive ? `2px solid ${colors.primaryBlue}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: isActive ? colors.primaryBlue : colors.secondaryText,
            fontWeight: isActive ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <nav
    aria-label="Breadcrumb"
    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: colors.secondaryText, marginBottom: '12px' }}
  >
    {items.map((item, idx) => (
      <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        {idx > 0 && <span>/</span>}
        {item.href ? (
          <a href={item.href} style={{ color: colors.secondaryText, textDecoration: 'none' }}>
            {item.label}
          </a>
        ) : (
          <span style={{ color: colors.darkHeading, fontWeight: 500 }}>{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

/* -------------------------------------------------------------------------- */
/* 7. LOADING, SKELETON, EMPTY STATE, ERROR STATE                            */
/* -------------------------------------------------------------------------- */
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dims: Record<string, string> = { sm: '16px', md: '24px', lg: '40px' };
  return (
    <div
      style={{
        width: dims[size],
        height: dims[size],
        border: `2px solid ${colors.border}`,
        borderTopColor: colors.primaryBlue,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        display: 'inline-block',
      }}
    />
  );
};

export const Skeleton: React.FC<{ width?: string; height?: string; borderRadius?: string }> = ({
  width = '100%',
  height = '20px',
  borderRadius = radius.control,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      backgroundColor: colors.border,
      opacity: 0.6,
    }}
  />
);

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionLabel, onAction }) => (
  <div
    style={{
      padding: '48px 24px',
      textAlign: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      border: `1px dashed ${colors.border}`,
    }}
  >
    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📁</div>
    <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.darkHeading, margin: '0 0 6px 0' }}>{title}</h3>
    <p style={{ fontSize: '14px', color: colors.secondaryText, maxWidth: '400px', margin: '0 auto 16px auto' }}>
      {description}
    </p>
    {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
  </div>
);

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title = 'Failed to load content', message, onRetry }) => (
  <div
    style={{
      padding: '32px 24px',
      textAlign: 'center',
      backgroundColor: colors.softRed,
      borderRadius: radius.card,
      border: `1px solid ${colors.softRed}`,
    }}
  >
    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
    <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.darkRed, margin: '0 0 4px 0' }}>{title}</h3>
    <p style={{ fontSize: '14px', color: colors.bodyText, marginBottom: '16px' }}>{message}</p>
    {onRetry && (
      <Button variant="danger" size="sm" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/* 8. PAGE HEADER & SECTION HEADER                                            */
/* -------------------------------------------------------------------------- */
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbItems?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, breadcrumbItems }) => (
  <div style={{ marginBottom: '24px' }}>
    {breadcrumbItems && <Breadcrumb items={breadcrumbItems} />}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.darkHeading, margin: '0 0 4px 0' }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: '14px', color: colors.secondaryText, margin: 0 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '12px' }}>{actions}</div>}
    </div>
  </div>
);

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.darkHeading, margin: '0 0 2px 0' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '13px', color: colors.secondaryText, margin: 0 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);
