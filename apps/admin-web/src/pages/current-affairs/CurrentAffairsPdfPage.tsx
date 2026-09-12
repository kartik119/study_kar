import React, { useEffect, useState } from 'react';
import { Card, PageHeader, Button } from '@study-karnataka/ui';
import { currentAffairsApi } from '../../services/currentAffairsApi';

export const CurrentAffairsPdfPage: React.FC = () => {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPdfs();
  }, []);

  const fetchPdfs = async () => {
    setLoading(true);
    try {
      const res = await currentAffairsApi.getPdfs();
      setPdfs(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="PDF & Downloads"
        description="Manage Daily, Weekly, and Monthly PDFs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Current Affairs', href: '/current-affairs' },
          { label: 'PDF / Downloads' },
        ]}
        action={
          <Button variant="primary" onClick={() => alert('Add PDF Form modal')}>
            + Upload PDF
          </Button>
        }
      />

      <Card className="mt-6 bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading PDFs...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                <th className="p-4">Title</th>
                <th className="p-4">Type</th>
                <th className="p-4">Language</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pdfs.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{p.titleEn}</td>
                  <td className="p-4 text-gray-600">{p.type}</td>
                  <td className="p-4 text-gray-600">{p.language}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="outline" size="sm" className="mr-2">Edit</Button>
                  </td>
                </tr>
              ))}
              {pdfs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No PDFs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
