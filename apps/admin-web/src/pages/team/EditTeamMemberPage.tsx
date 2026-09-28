// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Input, Button, Badge } from '@study-karnataka/ui';
import { useTeam } from '../../hooks/useTeam';
import { useRoles } from '../../hooks/useRoles';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, User, Shield, Info, Send, Save, Eye, ChevronDown } from 'lucide-react';

export const EditTeamMemberPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loadingMember, setLoadingMember] = useState(true);
  const { inviteMember, members, fetchMembers } = useTeam();
  const { roles, fetchRoles } = useRoles();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '+91',
    employeeId: '',
    department: '',
    designation: '',
    roleId: '',
    status: 'ACTIVE',
    reportingManagerId: '',
    memberModuleScope: [] as string[],
    examScope: [] as string[],
    mentorshipMode: '1-to-1 Mentorship',
    maxCapacity: '50',
    sendEmailInvite: true,
    welcomeMessage: '',
    joinDate: new Date().toISOString().split('T')[0],
    invitationExpiry: '7 days',
  });

  const [selectedRole, setSelectedRole] = useState<any>(null);
  
  useEffect(() => {
    fetchRoles({ status: 'ACTIVE' });
    fetchMembers({ limit: 100, status: 'ACTIVE' });
  }, []);

  useEffect(() => {
    if (formData.roleId) {
      const role = roles.find((r: any) => r.id === formData.roleId);
      if (role) {
        setSelectedRole(role);
        setFormData(prev => ({
          ...prev,
          memberModuleScope: role.modules || [],
        }));
      }
    } else {
      setSelectedRole(null);
      setFormData(prev => ({ ...prev, memberModuleScope: [] }));
    }
  }, [formData.roleId, roles]);

  const toggleModule = (mod: string) => {
    setFormData(prev => ({
      ...prev,
      memberModuleScope: prev.memberModuleScope.includes(mod)
        ? prev.memberModuleScope.filter(m => m !== mod)
        : [...prev.memberModuleScope, mod]
    }));
  };
  
  const toggleExam = (exam: string) => {
    setFormData(prev => ({
      ...prev,
      examScope: prev.examScope.includes(exam)
        ? prev.examScope.filter(e => e !== exam)
        : [...prev.examScope, exam]
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email || !formData.roleId) {
      alert("Please fill out Name, Email, and Role.");
      return;
    }
    
    // Validate module scope against role allowed modules
    if (selectedRole?.modules) {
      const invalidModules = formData.memberModuleScope.filter(m => !selectedRole.modules.includes(m));
      if (invalidModules.length > 0) {
        alert("Selected module scope exceeds the allowed modules for this role.");
        return;
      }
    }

    const payload = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      employeeId: formData.employeeId,
      department: formData.department,
      designation: formData.designation,
      role: selectedRole?.name || "",
      adminModuleAccess: formData.memberModuleScope,
      examScope: formData.examScope,
      reportingManagerId: formData.reportingManagerId,
      status: formData.status,
      inviteSettings: {
        sendEmail: formData.sendEmailInvite,
        welcomeMessage: formData.welcomeMessage,
        joinDate: formData.joinDate,
        expiry: formData.invitationExpiry
      },
      mentorSettings: selectedRole?.code === 'MENTOR' ? {
        mentorshipMode: formData.mentorshipMode,
        maxCapacity: formData.maxCapacity
      } : undefined
    };

    const success = await inviteMember(payload);
    if (success) {
      // In a real app we would use a toast here
      alert("Invitation sent successfully.");
      navigate('/team/members');
    }
  };

  const initials = formData.fullName ? formData.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  const commonCardStyle = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  };
  
  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '24px'
  };
  
  const numberBadgeStyle = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#EFF6FF',
    color: '#3B82F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    flexShrink: 0
  };

  return (
    <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '24px', paddingBottom: '100px' }}>
      {/* Breadcrumb and Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '13px', marginBottom: '16px' }}>
          <span>Admin</span>
          <span>/</span>
          <span>Team</span>
          <span>/</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/team/members')}>Team Members</span>
          <span>/</span>
          <span style={{ color: '#0F172A', fontWeight: 500 }}>Edit Team Member</span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <Button variant="outline" onClick={() => navigate('/team/members')} style={{ padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>Edit Team Member</h1>
            <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>Add a new team member and assign role, scope and additional settings.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* LEFT COLUMN - 70% */}
        <div style={{ flex: '7' }}>
          
          {/* Section 1 - Basic Information */}
          <div style={commonCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={numberBadgeStyle}>1</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>Basic Information</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Enter the team member's basic details.</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. Meera Joshi" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Work Email <span style={{ color: '#EF4444' }}>*</span></label>
                <Input type="email" disabled style={{ backgroundColor: "#F1F5F9" }} name="email" value={formData.email} onChange={handleChange} placeholder="meera@studykarnataka.in" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Phone Number</label>
                <div style={{ display: 'flex' }}>
                  <select 
                    name="phoneCode" 
                    style={{ width: '80px', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '6px 0 0 6px', borderRight: 'none', outline: 'none', backgroundColor: '#F8FAFC' }}
                  >
                    <option value="+91">+91</option>
                  </select>
                  <Input name="phone" value={formData.phone.replace('+91', '')} onChange={(e) => setFormData(p => ({...p, phone: '+91' + e.target.value}))} placeholder="9876543210" style={{ borderRadius: '0 6px 6px 0' }} />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Employee ID</label>
                <Input name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="EMP-1028" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Department</label>
                <select name="department" value={formData.department} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}>
                  <option value="">Select Department</option>
                  <option value="Academic Operations">Academic Operations</option>
                  <option value="Content Team">Content Team</option>
                  <option value="Support">Support</option>
                  <option value="Management">Management</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Designation</label>
                <Input name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. Senior Mentor" />
              </div>
            </div>
          </div>

          {/* Section 2 - Role & Scope */}
          <div style={commonCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={numberBadgeStyle}>2</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>Role & Scope</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Assign a role and define the working scope for this team member.</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Role <span style={{ color: '#EF4444' }}>*</span></label>
                <select name="roleId" value={formData.roleId} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}>
                  <option value="">Select Role</option>
                  {roles?.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Status <span style={{ color: '#EF4444' }}>*</span></label>
                <select name="status" value={formData.status} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING_INVITE">Pending Invite</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Reporting Manager</label>
                <select name="reportingManagerId" value={formData.reportingManagerId} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}>
                  <option value="">Select Manager</option>
                  {members?.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.role?.name || m.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Module Scope <span style={{ color: '#EF4444' }}>*</span></label>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px', marginTop: 0 }}>
                Select the modules this member can work in. Options are limited to modules allowed by the {selectedRole?.name || 'selected'} role.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['Students', 'Study Plans', 'MCQ Library & Tests', 'Quick Revision', 'Study Materials', 'Current Affairs'].map(mod => {
                  const isAllowed = !selectedRole || (selectedRole.modules && selectedRole.modules.includes(mod));
                  const isChecked = formData.memberModuleScope.includes(mod);
                  return (
                    <label key={mod} style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', 
                      border: isChecked ? '1px solid #3B82F6' : '1px solid #E2E8F0', 
                      borderRadius: '8px', backgroundColor: isChecked ? '#EFF6FF' : (isAllowed ? '#fff' : '#F8FAFC'),
                      cursor: isAllowed ? 'pointer' : 'not-allowed', opacity: isAllowed ? 1 : 0.6
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        disabled={!isAllowed}
                        onChange={() => toggleModule(mod)} 
                        style={{ width: '16px', height: '16px', cursor: isAllowed ? 'pointer' : 'not-allowed' }}
                      />
                      <span style={{ fontSize: '14px', color: isChecked ? '#1D4ED8' : '#334155', fontWeight: isChecked ? 500 : 400 }}>{mod}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: selectedRole?.code === 'MENTOR' ? '24px' : '0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Exam Scope <span style={{ color: '#EF4444' }}>*</span></label>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px', marginTop: 0 }}>Select the exams this member can work on.</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['UPSC', 'KPSC', 'KAS', 'Others'].map(exam => {
                  const isChecked = formData.examScope.includes(exam);
                  return (
                    <label key={exam} style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', 
                      border: isChecked ? '1px solid #3B82F6' : '1px solid #E2E8F0', 
                      borderRadius: '8px', backgroundColor: isChecked ? '#EFF6FF' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => toggleExam(exam)} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: isChecked ? '#1D4ED8' : '#334155', fontWeight: isChecked ? 500 : 400 }}>{exam}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedRole?.code === 'MENTOR' && (
              <div style={{ backgroundColor: '#F0F9FF', borderRadius: '12px', padding: '20px', border: '1px solid #BAE6FD' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Mentor Settings</h4>
                    <p style={{ fontSize: '12px', color: '#0284C7', margin: 0 }}>Additional settings for mentor.</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ flex: '1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '6px' }}>Mentorship Mode <span style={{ color: '#EF4444' }}>*</span></label>
                    <select name="mentorshipMode" value={formData.mentorshipMode} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #BAE6FD', outline: 'none', fontSize: '14px' }}>
                      <option value="1-to-1 Mentorship">1-to-1 Mentorship</option>
                      <option value="Group Mentorship">Group Mentorship</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                  <div style={{ flex: '1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '6px' }}>Maximum Student Capacity <span style={{ color: '#EF4444' }}>*</span></label>
                    <Input type="number" name="maxCapacity" value={formData.maxCapacity} onChange={handleChange} style={{ border: '1px solid #BAE6FD' }} />
                  </div>
                  <div style={{ flex: '1', backgroundColor: '#E0F2FE', padding: '12px 16px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#0369A1', lineHeight: '1.4' }}>Students can be assigned later from Team → Work Assignments.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3 - Inherited Role Access */}
          <div style={commonCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={numberBadgeStyle}>3</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>Inherited Role Access</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>This member will inherit the following permissions from the selected role.</p>
              </div>
            </div>
            
            {selectedRole ? (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FCE7F3', color: '#DB2777', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{selectedRole.name}</h4>
                        <Badge variant="info">System Role</Badge>
                      </div>
                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{selectedRole.description || 'System configured role.'}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/team/roles-permissions/${selectedRole.id}`, '_blank')}>View Role Details</Button>
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '0 0 12px 0' }}>Allowed Modules ({selectedRole.modules?.length || 0})</h5>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedRole.modules?.map((mod: string) => (
                      <span key={mod} style={{ padding: '4px 12px', borderRadius: '16px', backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: 500 }}>{mod}</span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '0 0 4px 0' }}>Scope Policy</h5>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{selectedRole.scopePolicy || 'No policy defined'}</p>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Shield size={18} color="#64748B" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '2px' }}>View Inherited Permissions <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Read Only)</span></div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Permissions are managed under Team → Roles & Permissions.</div>
                    </div>
                  </div>
                  <ChevronDown size={20} color="#64748B" />
                </div>
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                <Shield size={32} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 500, color: '#475569', margin: '0 0 4px 0' }}>No Role Selected</h4>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Select a role above to view inherited permissions.</p>
              </div>
            )}
          </div>

          {/* Section 4 - Invite Settings */}
          <div style={commonCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={numberBadgeStyle}>4</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>Invite Settings</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Configure invitation options.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '24px', borderRadius: '12px', backgroundColor: formData.sendEmailInvite ? '#3B82F6' : '#CBD5E1', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setFormData(p => ({...p, sendEmailInvite: !p.sendEmailInvite}))}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '2px', left: formData.sendEmailInvite ? '18px' : '2px', transition: 'all 0.2s' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>Send Email Invitation</span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 24px 0', paddingLeft: '52px' }}>An invitation link will be sent to the team member's email.</p>
              </div>
              
              <div style={{ flex: '2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>Welcome Message (Optional)</label>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>{formData.welcomeMessage.length}/500</span>
                  </div>
                  <textarea 
                    name="welcomeMessage" 
                    value={formData.welcomeMessage} 
                    onChange={handleChange} 
                    maxLength={500}
                    placeholder="Hi Meera,

You have been invited to join Study Karnataka.
Please set up your account using the secure link in this email."
                    style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Join Date</label>
                  <Input type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Invitation Expiry</label>
                  <select name="invitationExpiry" value={formData.invitationExpiry} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}>
                    <option value="3 days">3 days</option>
                    <option value="7 days">7 days</option>
                    <option value="14 days">14 days</option>
                    <option value="30 days">30 days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* RIGHT COLUMN - 30% */}
        <div style={{ flex: '3', position: 'sticky', top: '24px' }}>
          
          <div style={commonCardStyle}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>Invite Preview</h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 24px 0' }}>Review the team member details and settings.</p>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#FCE7F3', color: '#DB2777', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 600, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: 0 }}>{formData.fullName || 'Member Name'}</h4>
                  <Badge variant="success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                    Active
                  </Badge>
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>{formData.email || 'email@studykarnataka.in'}</div>
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>{formData.phone}</div>
                <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{formData.employeeId || 'No Emp ID'}</span>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <span>{selectedRole?.name || 'No Role'}</span>
                </div>
                {formData.department && (
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{formData.department}</span>
                    <span style={{ color: '#CBD5E1' }}>•</span>
                    <span>{formData.designation || selectedRole?.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: '0 0 16px 0' }}>Role & Scope</h4>
              
              <div style={{ display: 'flex', marginBottom: '12px' }}>
                <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Role</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{selectedRole?.name || '—'}</div>
              </div>
              
              <div style={{ display: 'flex', marginBottom: '12px' }}>
                <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Module Scope</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {formData.memberModuleScope.length > 0 ? formData.memberModuleScope.map(m => (
                    <span key={m} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: '12px' }}>{m}</span>
                  )) : <span style={{ fontSize: '13px', color: '#1E293B' }}>—</span>}
                </div>
              </div>
              
              <div style={{ display: 'flex', marginBottom: '12px' }}>
                <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Exam Scope</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {formData.examScope.length > 0 ? formData.examScope.map(e => (
                    <span key={e} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: '12px' }}>{e}</span>
                  )) : <span style={{ fontSize: '13px', color: '#1E293B' }}>—</span>}
                </div>
              </div>
              
              <div style={{ display: 'flex' }}>
                <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Reporting Manager</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>
                  {formData.reportingManagerId ? members.find((m: any) => m.id === formData.reportingManagerId)?.fullName : '—'}
                </div>
              </div>
            </div>
            
            {selectedRole?.code === 'MENTOR' && (
              <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: '0 0 16px 0' }}>Mentor Settings</h4>
                <div style={{ display: 'flex', marginBottom: '12px' }}>
                  <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Mentorship Mode</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{formData.mentorshipMode}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Maximum Capacity</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{formData.maxCapacity} students</div>
                </div>
              </div>
            )}
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: '0 0 16px 0', borderTop: selectedRole?.code !== 'MENTOR' ? '1px solid #E2E8F0' : 'none', paddingTop: selectedRole?.code !== 'MENTOR' ? '20px' : '0' }}>Invite Settings</h4>
              <div style={{ display: 'flex', marginBottom: '12px' }}>
                <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Send Email Invitation</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{formData.sendEmailInvite ? 'Yes' : 'No'}</div>
              </div>
              <div style={{ display: 'flex', marginBottom: '12px' }}>
                <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Join Date</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{new Date(formData.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ width: '120px', fontSize: '13px', color: '#64748B' }}>Invitation Expiry</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{formData.invitationExpiry}</div>
              </div>
            </div>
          </div>
          
          <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #DCFCE7', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#166534', margin: 0 }}>Inherited Role Permissions</h3>
            </div>
            
            {selectedRole ? (
              <div style={{ marginTop: '16px' }}>
                {selectedRole.permissions?.map((p: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <Check size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#166534' }}>{p}</span>
                  </div>
                ))}
                
                {selectedRole.restrictions?.length > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #DCFCE7' }}>
                    {selectedRole.restrictions.map((r: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <X size={16} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: '#991B1B' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#166534', margin: '16px 0 0 0' }}>Select a role to preview the permissions that will be inherited.</p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => navigate('/team/members')} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Send size={16} /> Send Invitation
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

