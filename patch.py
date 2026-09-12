import os
import re

file_path = r"c:\Users\Kartik\Downloads\LG-Study-Kar-August-main\LG-Study-Kar-August-main\apps\admin-web\src\pages\test-series\TestSeriesListPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports
if "lucide-react" not in content:
    content = content.replace(
        "import { TestSeriesApi } from '../../api/test-series.api';",
        "import { TestSeriesApi } from '../../api/test-series.api';\nimport { MoreVertical, Edit2, Send, Globe, CheckCircle, Edit3, RotateCw, Archive, Trash2 } from 'lucide-react';"
    )

# 2. Add handleAction inside the component
handle_action_code = """
  const handleWorkflowAction = async (id: string, action: string) => {
    try {
      if (action === 'submit') {
        // Not implemented in API yet, skipping
      } else if (action === 'approve') {
        await TestSeriesApi.approveSeries(id);
      } else if (action === 'publish') {
        await TestSeriesApi.publishSeries(id);
      } else if (action === 'request-changes') {
        // Not implemented in API yet
      } else if (action === 'archive') {
        await TestSeriesApi.archiveSeries(id);
      } else if (action === 'reopen') {
        await TestSeriesApi.reopenSeries(id);
      } else if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete this test series?')) return;
        await TestSeriesApi.deleteSeries(id);
      }
      loadTestSeries();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };
"""

if "handleWorkflowAction" not in content:
    content = content.replace(
        "const loadTestSeries = async () => {",
        handle_action_code + "\n  const loadTestSeries = async () => {"
    )

# 3. Replace the Manage button column
manage_col_old = """<td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => navigate(`/mcq-library/test-series/${s.id}`)}
                      style={{ padding: '4px 12px', backgroundColor: 'white', border: '1px solid #DCE6EE', color: '#084B7A', fontSize: '12px', fontWeight: 500, borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Manage
                    </button>
                  </td>"""
manage_col_new = """<td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/mcq-library/test-series/${s.id}`)}
                        style={{ padding: '4px 12px', backgroundColor: 'white', border: '1px solid #DCE6EE', color: '#084B7A', fontSize: '12px', fontWeight: 500, borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Manage
                      </button>
                      <TestSeriesActionMenu
                        series={s}
                        onAction={handleWorkflowAction}
                        onEdit={() => navigate(`/mcq-library/test-series/${s.id}`)}
                      />
                    </div>
                  </td>"""

# Using regex to replace the td block, taking indentation into account
# Let's just find and replace based on the actual substring we know is there
content = re.sub(
    r'<td style=\{\{\s*padding:\s*\'16px\',\s*textAlign:\s*\'right\'\s*\}\}>\s*<button\s*onClick=\{\(\)\s*=>\s*navigate\(`/mcq-library/test-series/\$\{s\.id\}`\)\}\s*style=\{\{.*?\}\}\s*>\s*Manage\s*</button>\s*</td>',
    manage_col_new,
    content,
    flags=re.DOTALL
)

# 4. Append TestSeriesActionMenu component
menu_component = """
const TestSeriesActionMenu: React.FC<{ series: any; onAction: (id: string, action: string) => void; onEdit: () => void }> = ({ series, onAction, onEdit }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="More Actions"
        style={{
          border: '1px solid #E2E8F0',
          backgroundColor: isOpen ? '#F1F5F9' : '#FFFFFF',
          borderRadius: '6px',
          padding: '6px 8px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748B',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isOpen ? '#F1F5F9' : '#FFFFFF')}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '6px',
              minWidth: '200px',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => { setIsOpen(false); onEdit(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                color: '#334155', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Edit2 size={15} color="#334155" />
              <span>Edit / Manage</span>
            </button>

            {(series.status === 'DRAFT' || series.status === 'CHANGES_REQUESTED') && (
              <>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onAction(series.id, 'publish'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                    color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                    textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Globe size={15} color="#059669" />
                  <span>Publish Directly</span>
                </button>
              </>
            )}

            {series.status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(series.id, 'publish'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Globe size={15} color="#059669" />
                <span>Publish Series</span>
              </button>
            )}

            {(series.status === 'PUBLISHED' || series.status === 'APPROVED') && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(series.id, 'reopen'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#2563EB', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RotateCw size={15} color="#2563EB" />
                <span>Retake and Edit</span>
              </button>
            )}

            {series.status === 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(series.id, 'archive'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#D97706', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFBEB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Archive size={15} color="#D97706" />
                <span>Archive Series</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setIsOpen(false); onAction(series.id, 'delete'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                color: '#EF4444', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Trash2 size={15} color="#EF4444" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
"""

if "TestSeriesActionMenu" not in content:
    content += "\n" + menu_component

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
