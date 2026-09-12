import os

file_path = r"c:\Users\Kartik\Downloads\LG-Study-Kar-August-main\LG-Study-Kar-August-main\apps\admin-web\src\pages\test-series\TestSeriesListPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Only append if the actual definition is not there
if "const TestSeriesActionMenu:" not in content:
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
    content += "\n" + menu_component
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed!")
else:
    print("Already fixed!")
