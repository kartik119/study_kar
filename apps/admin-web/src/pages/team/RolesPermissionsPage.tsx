// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Input, Button, Badge } from '@study-karnataka/ui';
import { useRoles } from '../../hooks/useRoles';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Shield, ShieldCheck, Key, Grid, MoreHorizontal, ChevronLeft, ChevronRight, Eye, Edit, Copy, Users, Power, PowerOff, Trash2 } from 'lucide-react';
import { RoleDetailsDrawer } from './RoleDetailsDrawer';

export const RolesPermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { roles, kpis, loading, fetchRoles, updateRole } = useRoles();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [moduleFilter, setModuleFilter] = useState('All Modules');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  const [drawerRoleId, setDrawerRoleId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchRoles();
    loadData();
  }, []);

  const loadData = () => {
    fetchRoles({
      search: search || undefined,
      type: roleFilter !== 'All Types' ? roleFilter : undefined,
      status: statusFilter !== 'All Statuses' ? statusFilter : undefined,
      module: moduleFilter !== 'All Modules' ? moduleFilter : undefined,
    });
  };

  const handleApplyFilters = () => {
    setPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('All Types');
    setStatusFilter('All Statuses');
    setModuleFilter('All Modules');
    setPage(1);
    setTimeout(() => {
      fetchRoles();
    }, 0);
  };

  const handleRowSelect = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === roles.length && roles.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(roles.map(r => r.id)));
    }
  };

  const handleToggleStatus = async (role: any) => {
    const success = await updateRole(role.id, {
      name: role.name,
      code: role.code,
      description: role.description,
      scopePolicy: role.scopePolicy,
      isActive: !role.isActive
    });
    if (success) {
      loadData();
    }
    setOpenMenuId(null);
  };

  const openDrawer = (id: string) => {
    setDrawerRoleId(id);
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  // Pagination logic (client-side for now if backend returns all, or slice)
  const paginatedRoles = roles.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(roles.length / limit) || 1;

  const getRoleIconColor = (code: string) => {
    if (!code) return '#6366F1';
    if (code === 'SUPER_ADMIN') return '#3B82F6';
    if (code === 'ADMIN') return '#F59E0B';
    if (code.includes('MANAGER')) return '#EC4899';
    if (code.includes('REVIEWER')) return '#06B6D4';
    if (code.includes('MENTOR')) return '#EF4444';
    if (code.includes('SUPPORT')) return '#10B981';
    return '#6366F1';
  };

  return (
    <div style={{ paddingBottom: '100px', width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <PageHeader
          title="Roles & Permissions"
          subtitle="Manage staff roles, define module permissions and control how team members can access Study Karnataka."
          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Team', href: '/team' },
            { label: 'Roles & Permissions' },
          ]}
        />
        <Button 
          variant="primary" 
          onClick={() => navigate('/team/roles/create')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Create New Role
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Total Roles</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpis?.totalRoles || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>All configured roles</div>
          </div>
        </Card>
        
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Active Roles</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpis?.activeRoles || 0}</div>
            <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>Currently active</div>
          </div>
        </Card>

        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316' }}>
            <Key size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Total Permissions</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpis?.totalPermissions || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Across all roles</div>
          </div>
        </Card>

        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A855F7' }}>
            <Grid size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Modules Covered</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpis?.modulesCovered || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Platform modules</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Search</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: '9px', color: '#94A3B8' }}><Search size={18} /></div>
            <input 
              type="text" 
              placeholder="Search by name, code or description..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none' }}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
            />
          </div>
        </div>

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', backgroundColor: '#fff' }}
          >
            <option>All Statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Role Type</label>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', backgroundColor: '#fff' }}
          >
            <option>All Types</option>
            <option>System Role</option>
            <option>Custom Role</option>
          </select>
        </div>

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Module</label>
          <select 
            value={moduleFilter} 
            onChange={(e) => setModuleFilter(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', backgroundColor: '#fff' }}
          >
            <option>All Modules</option>
            <option>Students</option>
            <option>Study Plans</option>
            <option>Exams</option>
            <option>MCQ Library & Tests</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
          <Button variant="primary" onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <input type="checkbox" checked={selectedRows.size === roles.length && roles.length > 0} onChange={handleSelectAll} />
                </th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>#</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Role Code</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Assigned Members</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Modules</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Permissions</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Last Updated</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>Loading roles...</td>
                </tr>
              ) : paginatedRoles.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '48px 32px', textAlign: 'center', color: '#64748B' }}>
                    <Shield size={48} style={{ margin: '0 auto 16px auto', color: '#CBD5E1' }} />
                    <h3 style={{ margin: '0 0 8px 0', color: '#1E293B' }}>No roles configured</h3>
                    <p style={{ margin: '0 0 16px 0' }}>Create your first role to define staff access.</p>
                    <Button variant="primary" onClick={() => navigate('/team/roles/create')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Plus size={18} /> Create New Role
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedRoles.map((role, idx) => (
                  <tr key={role.id} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: selectedRows.has(role.id) ? '#F1F5F9' : 'white', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px' }}>
                      <input type="checkbox" checked={selectedRows.has(role.id)} onChange={() => handleRowSelect(role.id)} />
                    </td>
                    <td style={{ padding: '16px', color: '#64748B' }}>{(page - 1) * limit + idx + 1}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: getRoleIconColor(role.code) + '20', color: getRoleIconColor(role.code), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Shield size={16} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#1E293B' }}>{role.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge variant="neutral" style={{ color: '#475569', backgroundColor: '#F8FAFC' }}>{role.code}</Badge>
                    </td>
                    <td style={{ padding: '16px', color: '#64748B', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {role.description || '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#1E293B', fontWeight: 500, textAlign: 'center' }}>
                      {role.assignedMembers || 0}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: '#3B82F6', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
                        {role.modules?.length > 0 ? (role.modules.length === kpis?.modulesCovered ? 'All Modules' : `${role.modules.length} Modules`) : '0 Modules'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#1E293B', fontWeight: 500, textAlign: 'center' }}>
                      {role.permissionsCount || 0}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge variant={role.isSystem ? 'primary' : 'outline'} style={{ backgroundColor: role.isSystem ? '#EFF6FF' : '#F8FAFC', color: role.isSystem ? '#3B82F6' : '#64748B' }}>
                        {role.isSystem ? 'System Role' : 'Custom Role'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: role.isActive ? '#10B981' : '#64748B', fontWeight: 500 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: role.isActive ? '#10B981' : '#CBD5E1' }}></div>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>
                      <div style={{ color: '#1E293B' }}>{new Date(role.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div>{new Date(role.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === role.id ? null : role.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#64748B' }}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      
                      {openMenuId === role.id && (
                        <div style={{ position: 'absolute', right: '30px', top: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', zIndex: 10, width: '220px', padding: '8px', textAlign: 'left' }}>
                          <button onClick={() => openDrawer(role.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#1E293B', fontSize: '14px', borderRadius: '4px' }}><Eye size={16} /> View Details</button>
                          <button onClick={() => navigate(`/team/roles/${role.id}`)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#1E293B', fontSize: '14px', borderRadius: '4px' }}><Edit size={16} /> Edit Role</button>
                          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#1E293B', fontSize: '14px', borderRadius: '4px' }}><Copy size={16} /> Duplicate Role</button>
                          <button onClick={() => openDrawer(role.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#1E293B', fontSize: '14px', borderRadius: '4px' }}><Users size={16} /> View Assigned Members</button>
                          
                          <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }}></div>
                          
                          {role.isActive ? (
                            <button onClick={() => handleToggleStatus(role)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B', fontSize: '14px', borderRadius: '4px' }}><PowerOff size={16} /> Deactivate</button>
                          ) : (
                            <button onClick={() => handleToggleStatus(role)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#10B981', fontSize: '14px', borderRadius: '4px' }}><Power size={16} /> Activate</button>
                          )}
                          
                          {!role.isSystem && (
                            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '14px', borderRadius: '4px' }}><Trash2 size={16} /> Archive Custom Role</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {roles.length > 0 && (
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <div style={{ color: '#64748B', fontSize: '14px' }}>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, roles.length)} of {roles.length} roles
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '14px' }}>
                Rows per page
                <select 
                  value={limit} 
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #E2E8F0', outline: 'none' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)} style={{ padding: '6px' }}><ChevronLeft size={16} /></Button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button 
                      key={p} 
                      onClick={() => setPage(p)}
                      style={{ 
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: 'none', cursor: 'pointer',
                        backgroundColor: p === page ? '#3B82F6' : 'transparent',
                        color: p === page ? 'white' : '#475569',
                        fontWeight: p === page ? 600 : 400
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px' }}><ChevronRight size={16} /></Button>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      <RoleDetailsDrawer 
        roleId={drawerRoleId} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </div>
  );
};
