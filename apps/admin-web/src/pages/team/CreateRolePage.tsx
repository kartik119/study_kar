import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Card, Input, Button, Badge } from '@study-karnataka/ui';
import { useRoles } from '../../hooks/useRoles';
import { ChevronLeft, LayoutDashboard, FileText, BookOpen, CheckSquare, Clock, Video, FileEdit, Users, CreditCard, Shield, Settings, HelpCircle, Check, X } from 'lucide-react';

const MODULES_MAP: Record<string, any> = {
  'dashboard': { name: 'Dashboard', icon: LayoutDashboard, desc: 'View dashboard and analytics' },
  'exams': { name: 'Exams', icon: FileText, desc: 'Manage exam content and schedules' },
  'study_materials': { name: 'Study Materials', icon: BookOpen, desc: 'Create and manage study materials' },
  'mcq': { name: 'MCQ Library & Tests', icon: CheckSquare, desc: 'Manage MCQ questions and tests' },
  'current_affairs': { name: 'Current Affairs', icon: Clock, desc: 'Manage current affairs content' },
  'quick_revision': { name: 'Quick Revision', icon: Video, desc: 'Manage quick revision content' },
  'study_plans': { name: 'Study Plans', icon: FileEdit, desc: 'Create and manage study plans' },
  'students': { name: 'Students', icon: Users, desc: 'View and manage assigned students' },
  'subscriptions': { name: 'Subscriptions & Payments', icon: CreditCard, desc: 'Manage subscriptions and payments' },
  'team': { name: 'Team', icon: Users, desc: 'Manage team members and roles' },
  'support': { name: 'Support', icon: HelpCircle, desc: 'Manage support tickets' },
  'settings': { name: 'Settings', icon: Settings, desc: 'Manage platform settings and configurations' },
};

const RESTRICTIONS_MAP: Record<string, string> = {
  'billing': 'No billing administration',
  'team_management': 'No team management',
  'platform_settings': 'No platform settings',
  'security_management': 'No security management'
};

export const CreateRolePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { permissions, fetchPermissions, createRole, updateRole, getRole } = useRoles();

  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set()); // stores permission codes
  const [activeModuleTab, setActiveModuleTab] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState<Set<string>>(new Set());
  const [scopePolicy, setScopePolicy] = useState('ASSIGNED_ITEMS_ONLY');

  useEffect(() => {
    fetchPermissions();
    if (id) {
      loadExistingRole(id);
    }
  }, [id]);

  const loadExistingRole = async (roleId: string) => {
    const role = await getRole(roleId);
    if (role) {
      setRoleName(role.name);
      setRoleCode(role.code);
      setDescription(role.description || '');
      setScopePolicy(role.scopePolicy || 'ALL_DATA');
      
      const actions = new Set<string>();
      const mods = new Set<string>();
      const rests = new Set<string>();

      (role.permissions || []).forEach((p: any) => {
        if (p.code.startsWith('restriction.')) {
          rests.add(p.code.split('.')[1]);
        } else {
          actions.add(p.code);
          const mod = p.code.split('.')[0];
          if (MODULES_MAP[mod]) mods.add(mod);
        }
      });
      
      setSelectedActions(actions);
      setSelectedModules(mods);
      setRestrictions(rests);
      
      if (mods.size > 0) setActiveModuleTab(Array.from(mods)[0]);
    }
  };

  const handleModuleToggle = (modKey: string) => {
    const newMods = new Set(selectedModules);
    if (newMods.has(modKey)) {
      newMods.delete(modKey);
      if (activeModuleTab === modKey) {
        setActiveModuleTab(newMods.size > 0 ? Array.from(newMods)[0] : null);
      }
      
      // also remove actions for this module
      const newActions = new Set(selectedActions);
      Array.from(newActions).forEach(act => {
        if (act.startsWith(`${modKey}.`)) newActions.delete(act);
      });
      setSelectedActions(newActions);
    } else {
      newMods.add(modKey);
      if (!activeModuleTab) setActiveModuleTab(modKey);
    }
    setSelectedModules(newMods);
  };

  const handleActionToggle = (permCode: string) => {
    const newActions = new Set(selectedActions);
    if (newActions.has(permCode)) {
      newActions.delete(permCode);
    } else {
      newActions.add(permCode);
    }
    setSelectedActions(newActions);
  };

  const handleRestrictionToggle = (restKey: string) => {
    const newRests = new Set(restrictions);
    if (newRests.has(restKey)) newRests.delete(restKey);
    else newRests.add(restKey);
    setRestrictions(newRests);
  };

  const handleSave = async () => {
    if (!roleName || !roleCode || !description) {
      alert('Please fill out basic information');
      return;
    }

    const allPermissions = Array.from(selectedActions);
    Array.from(restrictions).forEach(r => allPermissions.push(`restriction.${r}`));

    const payload = {
      name: roleName,
      code: roleCode,
      description,
      isActive: true,
      isSystem: false,
      scopePolicy,
      permissions: allPermissions
    };

    let success;
    if (id) {
      success = await updateRole(id, payload);
    } else {
      success = await createRole(payload);
    }

    if (success) {
      navigate('/team/roles-permissions');
    }
  };

  // Group permissions by module
  const modulePermissions = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    Object.keys(MODULES_MAP).forEach(k => grouped[k] = []);
    
    // Mocking standard permissions if backend returns empty or limited set during dev
    const standardPerms = [
      { code: 'dashboard.view', name: 'View Dashboard', desc: 'View dashboard and analytics' },
      { code: 'exams.manage', name: 'Manage Exams', desc: 'Manage exam content and schedules' },
      { code: 'study_materials.create', name: 'Create Materials', desc: 'Create and manage study materials' },
      { code: 'mcq.manage', name: 'Manage MCQs', desc: 'Manage MCQ questions and tests' },
      { code: 'students.view', name: 'View Students', desc: 'View student list and profiles' },
      { code: 'students.progress', name: 'View Student Progress', desc: 'View progress and performance' },
      { code: 'students.study_plans', name: 'View Study Plans', desc: 'View assigned study plans' },
      { code: 'students.mentor_notes', name: 'Add Mentor Notes', desc: 'Add notes and feedback' },
      { code: 'students.mentor_checkins', name: 'Manage Check-ins', desc: 'Conduct student check-ins' },
      { code: 'students.reports', name: 'View Reports', desc: 'View mentorship reports' },
      { code: 'study_plans.manage', name: 'Manage Plans', desc: 'Create and manage study plans' },
      { code: 'quick_revision.manage', name: 'Manage Revision', desc: 'Manage quick revision content' }
    ];

    const allPerms = permissions.length > 0 ? permissions : standardPerms;
    
    allPerms.forEach(p => {
      const mod = p.code.split('.')[0];
      if (grouped[mod]) {
        grouped[mod].push(p);
      }
    });
    return grouped;
  }, [permissions]);

  const activeModulePerms = activeModuleTab ? modulePermissions[activeModuleTab] : [];

  const getRoleIconColor = (code: string) => {
    if (!code) return '#EF4444';
    if (code === 'SUPER_ADMIN') return '#3B82F6';
    if (code === 'ADMIN') return '#F59E0B';
    if (code.includes('MANAGER')) return '#EC4899';
    if (code.includes('REVIEWER')) return '#06B6D4';
    if (code.includes('MENTOR')) return '#EF4444';
    if (code.includes('SUPPORT')) return '#10B981';
    return '#EF4444';
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <button 
            onClick={() => navigate('/team/roles-permissions')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#3B82F6', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <PageHeader
            title={id ? "Edit Role" : "Create New Role"}
            subtitle="Define a new role with permissions and access policies."
            breadcrumbItems={[
              { label: 'Admin', href: '/' },
              { label: 'Team', href: '/team' },
              { label: 'Roles & Permissions', href: '/team/roles-permissions' },
              { label: id ? "Edit Role" : "Create New Role" },
            ]}
          />
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          
          {/* LEFT SIDE - FORM (74%) */}
          <div style={{ flex: '0 0 74%' }}>
            
            {/* Section 1: Basic Information */}
            <Card style={{ padding: '32px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1E293B' }}>Basic Information</h3>
                  <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Enter the role details and a brief description.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '24px', marginLeft: '48px', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', color: '#1E293B', fontWeight: 600, marginBottom: '8px' }}>Role Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input 
                    value={roleName} 
                    onChange={e => setRoleName(e.target.value)} 
                    placeholder="e.g., Mentor"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', color: '#1E293B', fontWeight: 600, marginBottom: '8px' }}>Role Code <span style={{ color: '#EF4444' }}>*</span></label>
                  <input 
                    value={roleCode} 
                    onChange={e => setRoleCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))} 
                    placeholder="MENTOR"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none' }} 
                  />
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>Unique code (e.g., MENTOR)</p>
                </div>
              </div>
              
              <div style={{ marginLeft: '48px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#1E293B', fontWeight: 600, marginBottom: '8px' }}>Description <span style={{ color: '#EF4444' }}>*</span></label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Guide assigned students and monitor their preparation progress..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} 
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{description.length}/300</div>
              </div>
            </Card>

            {/* Section 2: Module Permissions */}
            <Card style={{ padding: '32px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1E293B' }}>Module Permissions</h3>
                  <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Select the modules this role can access and the actions they can perform.</p>
                </div>
              </div>
              
              <div style={{ marginLeft: '48px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {Object.entries(MODULES_MAP).map(([key, mod]) => {
                  const Icon = mod.icon;
                  const isSelected = selectedModules.has(key);
                  return (
                    <div 
                      key={key} 
                      onClick={() => handleModuleToggle(key)}
                      style={{ 
                        display: 'flex', gap: '12px', padding: '16px', borderRadius: '8px', 
                        border: isSelected ? '1px solid #3B82F6' : '1px solid #E2E8F0', 
                        backgroundColor: isSelected ? '#EFF6FF' : 'white', 
                        cursor: 'pointer', transition: 'all 0.2s' 
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        readOnly 
                        style={{ marginTop: '4px', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Icon size={18} color={isSelected ? '#3B82F6' : '#64748B'} />
                          <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '14px' }}>{mod.name}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>{mod.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Section 3: Module Actions */}
            {selectedModules.size > 0 && (
              <Card style={{ padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1E293B' }}>Module Actions</h3>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Define what actions this role can perform in each selected module.</p>
                  </div>
                </div>
                
                <div style={{ marginLeft: '48px', display: 'flex', gap: '32px' }}>
                  {/* Left Tabs */}
                  <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Array.from(selectedModules).map(modKey => {
                      const mod = MODULES_MAP[modKey];
                      const Icon = mod.icon;
                      const isActive = activeModuleTab === modKey;
                      return (
                        <div 
                          key={modKey} 
                          onClick={() => setActiveModuleTab(modKey)}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                            borderRadius: '8px', cursor: 'pointer',
                            backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                            color: isActive ? '#3B82F6' : '#64748B',
                            fontWeight: isActive ? 600 : 500,
                            borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent'
                          }}
                        >
                          <Icon size={18} />
                          <span style={{ fontSize: '14px' }}>{mod.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Right Actions */}
                  <div style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
                    {activeModuleTab && (
                      <>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1E293B' }}>{MODULES_MAP[activeModuleTab].name} Module Actions</h4>
                        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748B' }}>Select the actions this role can perform in {MODULES_MAP[activeModuleTab].name} module.</p>
                        
                        {activeModulePerms.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {activeModulePerms.map(perm => {
                              const isSelected = selectedActions.has(perm.code);
                              return (
                                <div 
                                  key={perm.code} 
                                  onClick={() => handleActionToggle(perm.code)}
                                  style={{ 
                                    display: 'flex', gap: '12px', padding: '16px', borderRadius: '8px', 
                                    backgroundColor: 'white', border: '1px solid #E2E8F0', cursor: 'pointer' 
                                  }}
                                >
                                  <div style={{ 
                                    width: '18px', height: '18px', borderRadius: '4px', border: isSelected ? 'none' : '1px solid #CBD5E1', 
                                    backgroundColor: isSelected ? '#3B82F6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                  }}>
                                    {isSelected && <Check size={14} color="white" />}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '14px', marginBottom: '4px' }}>{perm.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748B' }}>{perm.description || perm.desc}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                            No specific actions defined for this module in the mock data.
                            <br />
                            <Button variant="outline" size="small" style={{ marginTop: '16px' }} onClick={() => handleActionToggle(`${activeModuleTab}.manage`)}>Add Generic Manage Action</Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Section 4: Restrictions & Policies */}
            <Card style={{ padding: '32px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>4</div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1E293B' }}>Restrictions & Policies</h3>
                  <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Define what this role cannot access and set scope policies.</p>
                </div>
              </div>
              
              <div style={{ marginLeft: '48px', display: 'flex', gap: '48px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1E293B' }}>Access Restrictions</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>Select modules to explicitly restrict (even if selected above).</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {Object.entries(RESTRICTIONS_MAP).map(([key, label]) => (
                      <div 
                        key={key} 
                        onClick={() => handleRestrictionToggle(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      >
                        <div style={{ 
                          width: '18px', height: '18px', borderRadius: '4px', border: restrictions.has(key) ? 'none' : '1px solid #CBD5E1', 
                          backgroundColor: restrictions.has(key) ? '#3B82F6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                          {restrictions.has(key) && <Check size={14} color="white" />}
                        </div>
                        <span style={{ fontSize: '14px', color: '#475569' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1E293B' }}>Scope Policy</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>Define the data access scope for this role.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div onClick={() => setScopePolicy('ALL_DATA')} style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: scopePolicy === 'ALL_DATA' ? '5px solid #3B82F6' : '1px solid #CBD5E1', backgroundColor: 'white', marginTop: '2px' }}></div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>All Data</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Can access all data across the platform</div>
                      </div>
                    </div>
                    
                    <div onClick={() => setScopePolicy('ASSIGNED_ITEMS_ONLY')} style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: scopePolicy === 'ASSIGNED_ITEMS_ONLY' ? '5px solid #3B82F6' : '1px solid #CBD5E1', backgroundColor: 'white', marginTop: '2px' }}></div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>Assigned Items Only</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Can access only assigned students, exams or content</div>
                      </div>
                    </div>
                    
                    <div onClick={() => setScopePolicy('CUSTOM_SCOPE')} style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: scopePolicy === 'CUSTOM_SCOPE' ? '5px solid #3B82F6' : '1px solid #CBD5E1', backgroundColor: 'white', marginTop: '2px' }}></div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>Custom Scope</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Define custom access rules</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* RIGHT SIDE - PREVIEW (26%) */}
          <div style={{ flex: '0 0 26%', position: 'sticky', top: '24px' }}>
            
            {/* 1. Role Preview Card */}
            <Card style={{ padding: '24px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1E293B' }}>Role Preview</h4>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748B' }}>Review the role configuration before creating.</p>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: getRoleIconColor(roleCode) + '20', color: getRoleIconColor(roleCode), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1E293B' }}>{roleName || 'Role Name'}</h3>
                  <Badge variant="outline" style={{ color: '#475569', backgroundColor: '#F8FAFC', marginBottom: '12px', display: 'inline-block' }}>{roleCode || 'ROLE_CODE'}</Badge>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                    {description || 'No description provided.'}
                  </p>
                </div>
              </div>
            </Card>

            {/* 2. Allowed Modules */}
            <Card style={{ padding: '24px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#1E293B' }}>Allowed Modules ({selectedModules.size})</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Array.from(selectedModules).map(modKey => {
                  const mod = MODULES_MAP[modKey];
                  const Icon = mod.icon;
                  // Dynamic coloring for modules
                  const colors = ['#A855F7', '#10B981', '#EC4899', '#F59E0B', '#3B82F6'];
                  const color = colors[Array.from(selectedModules).indexOf(modKey) % colors.length];
                  
                  return (
                    <div key={modKey} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '100px', backgroundColor: color + '15', color: color, fontSize: '13px', fontWeight: 600 }}>
                      <Icon size={14} /> {mod.name}
                    </div>
                  );
                })}
                {selectedModules.size === 0 && <span style={{ color: '#94A3B8', fontSize: '13px' }}>None selected</span>}
              </div>
            </Card>

            {/* 3. Module Actions Summary */}
            <Card style={{ padding: '24px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#1E293B' }}>Module Actions Summary</h4>
              {selectedModules.size === 0 ? (
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>No actions configured</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Array.from(selectedModules).map(modKey => {
                    const mod = MODULES_MAP[modKey];
                    const Icon = mod.icon;
                    const actionCount = Array.from(selectedActions).filter(a => a.startsWith(`${modKey}.`)).length;
                    
                    return (
                      <div key={modKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{mod.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>{actionCount} actions selected</div>
                          </div>
                        </div>
                        <ChevronRight size={16} color="#CBD5E1" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* 4. Restrictions */}
            <Card style={{ padding: '24px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#1E293B' }}>Restrictions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from(restrictions).length === 0 ? (
                  <span style={{ color: '#94A3B8', fontSize: '13px' }}>No restrictions</span>
                ) : (
                  Array.from(restrictions).map(restKey => (
                    <div key={restKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '13px' }}>
                      <X size={16} /> {RESTRICTIONS_MAP[restKey]}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* 5. Scope Policy */}
            <Card style={{ padding: '24px', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#1E293B' }}>Scope Policy</h4>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ marginTop: '2px', color: '#10B981' }}><Check size={18} /></div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>
                    {scopePolicy === 'ALL_DATA' ? 'All Data' : scopePolicy === 'ASSIGNED_ITEMS_ONLY' ? 'Assigned Items Only' : 'Custom Scope'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    {scopePolicy === 'ALL_DATA' ? 'Can access all data across the platform.' : scopePolicy === 'ASSIGNED_ITEMS_ONLY' ? 'Can access only assigned students, exams or content.' : 'Define custom access rules.'}
                  </div>
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => navigate('/team/roles-permissions')} style={{ flex: 1, padding: '12px' }}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} style={{ flex: 1, padding: '12px' }}>{id ? 'Save Changes' : 'Create Role'}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
