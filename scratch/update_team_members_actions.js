const fs = require('fs');

let content = fs.readFileSync('apps/admin-web/src/pages/team/TeamMembersPage.tsx', 'utf8');

// Update useTeam extraction
content = content.replace(
  "const { members, kpi, fetchMembers, fetchKPIs, isLoading, error } = useTeam();",
  "const { members, kpi, fetchMembers, fetchKPIs, isLoading, error, suspendMember, reactivateMember, deactivateMember, resendInvite, cancelInvite } = useTeam();"
);

// Update Suspend Member onClick
content = content.replace(
  /onClick=\{\(\) => setOpenMenuId\(null\)\} onMouseOver=\{e => e\.currentTarget\.style\.backgroundColor = '#FEFCE8'\}/g,
  "onClick={async () => { setOpenMenuId(null); await suspendMember(member.id); loadData(); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEFCE8'}"
);

// Update Reactivate onClick
content = content.replace(
  /onClick=\{\(\) => setOpenMenuId\(null\)\} onMouseOver=\{e => e\.currentTarget\.style\.backgroundColor = '#ECFDF5'\}/g,
  "onClick={async () => { setOpenMenuId(null); await reactivateMember(member.id); loadData(); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#ECFDF5'}"
);

// Update Resend Invite onClick
content = content.replace(
  /onClick=\{\(\) => setOpenMenuId\(null\)\} onMouseOver=\{e => e\.currentTarget\.style\.backgroundColor = '#EFF6FF'\}/g,
  "onClick={async () => { setOpenMenuId(null); await resendInvite(member.id); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}"
);

// Update Cancel Invite onClick (red items) - Note: Deactivate is also red but uses different logic, let's fix them precisely
content = content.replace(
  /<div style=\{\{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EF4444' \}\} onClick=\{\(\) => setOpenMenuId\(null\)\} onMouseOver=\{e => e\.currentTarget\.style\.backgroundColor = '#FEF2F2'\} onMouseOut=\{e => e\.currentTarget\.style\.backgroundColor = 'transparent'\}>\s*<XSquare size=\{16\} \/> Cancel Invite\s*<\/div>/g,
  `<div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EF4444' }} onClick={async () => { setOpenMenuId(null); await cancelInvite(member.id); loadData(); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEF2F2'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <XSquare size={16} /> Cancel Invite
                                    </div>`
);

content = content.replace(
  /<div style=\{\{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EF4444' \}\} onClick=\{\(\) => setOpenMenuId\(null\)\} onMouseOver=\{e => e\.currentTarget\.style\.backgroundColor = '#FEF2F2'\} onMouseOut=\{e => e\.currentTarget\.style\.backgroundColor = 'transparent'\}>\s*<Trash2 size=\{16\} \/> Deactivate\s*<\/div>/g,
  `<div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EF4444' }} onClick={async () => { setOpenMenuId(null); await deactivateMember(member.id); loadData(); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEF2F2'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <Trash2 size={16} /> Deactivate
                                  </div>`
);

fs.writeFileSync('apps/admin-web/src/pages/team/TeamMembersPage.tsx', content);
console.log('Actions updated');
