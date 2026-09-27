const fs = require('fs');

let content = fs.readFileSync('apps/admin-web/src/pages/team/TeamMembersPage.tsx', 'utf8');

// Update imports
content = content.replace(
  "import { Search, Plus, Filter, Users, Shield, UserCheck, UserX, MoreHorizontal, ChevronLeft, ChevronRight, Check } from 'lucide-react';",
  "import { Search, Plus, Filter, Users, Shield, UserCheck, UserX, MoreHorizontal, ChevronLeft, ChevronRight, Check, Eye, Edit, Ban, RefreshCw, Trash2, Mail, XSquare, Clock } from 'lucide-react';"
);

// Add state for menu
content = content.replace(
  "const [selectedMember, setSelectedMember] = useState<any>(null);",
  "const [selectedMember, setSelectedMember] = useState<any>(null);\n  const [openMenuId, setOpenMenuId] = useState<string | null>(null);"
);

// Close menu when clicking outside logic
content = content.replace(
  "const openDetails = (member: any) => {",
  "useEffect(() => {\n    const closeMenu = () => setOpenMenuId(null);\n    document.addEventListener('click', closeMenu);\n    return () => document.removeEventListener('click', closeMenu);\n  }, []);\n\n  const openDetails = (member: any) => {"
);

// Update table rows onClick logic to ignore menu clicks
content = content.replace(
  "if ((e.target as HTMLElement).closest('input[type=\"checkbox\"]') || (e.target as HTMLElement).closest('button')) return;",
  "if ((e.target as HTMLElement).closest('input[type=\"checkbox\"]') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.actions-menu')) return;"
);

// Update actions cell
const oldCell = `<td style={{ padding: '16px', textAlign: 'center' }}>
                          <Button variant="ghost" style={{ padding: '6px' }}>
                            <MoreHorizontal size={18} color="#64748B" />
                          </Button>
                        </td>`;
                        
const newCell = `<td style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
                          <div className="actions-menu" style={{ display: 'inline-block' }} onClick={(e) => { e.stopPropagation(); }}>
                            <Button 
                              variant="ghost" 
                              style={{ padding: '6px' }} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === member.id ? null : member.id);
                              }}
                            >
                              <MoreHorizontal size={18} color="#64748B" />
                            </Button>
                            
                            {openMenuId === member.id && (
                              <div style={{
                                position: 'absolute',
                                right: '16px',
                                top: '50px',
                                backgroundColor: '#fff',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                zIndex: 50,
                                minWidth: '180px',
                                textAlign: 'left',
                                padding: '8px 0'
                              }}>
                                <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }} onClick={() => { setOpenMenuId(null); openDetails(member); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Eye size={16} /> View Details
                                </div>
                                <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Edit size={16} /> Edit Member
                                </div>
                                <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Shield size={16} /> Edit Scope
                                </div>
                                <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Clock size={16} /> View Activity
                                </div>
                                
                                <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />
                                
                                {member.status === 'ACTIVE' && (
                                  <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EAB308' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEFCE8'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <Ban size={16} /> Suspend Member
                                  </div>
                                )}
                                {(member.status === 'SUSPENDED' || member.status === 'INACTIVE') && (
                                  <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#10B981' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#ECFDF5'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <RefreshCw size={16} /> Reactivate
                                  </div>
                                )}
                                {(member.status === 'PENDING_INVITE' || member.status === 'Pending Invite') && (
                                  <>
                                    <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#3B82F6' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#EFF6FF'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <Mail size={16} /> Resend Invite
                                    </div>
                                    <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EF4444' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEF2F2'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <XSquare size={16} /> Cancel Invite
                                    </div>
                                  </>
                                )}
                                
                                {member.status !== 'PENDING_INVITE' && member.status !== 'Pending Invite' && (
                                  <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EF4444' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEF2F2'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <Trash2 size={16} /> Deactivate
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>`;
                        
content = content.replace(oldCell, newCell);

fs.writeFileSync('apps/admin-web/src/pages/team/TeamMembersPage.tsx', content);
console.log('Update applied');
