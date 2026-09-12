import React, { useEffect, useState } from 'react';
import { Card, PageHeader, Button } from '@study-karnataka/ui';
import { currentAffairsApi } from '../../services/currentAffairsApi';

export const CurrentAffairsQuizPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await currentAffairsApi.getQuizzes();
      setQuizzes(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Daily Quizzes"
        description="Manage quizzes linked to current affairs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Current Affairs', href: '/current-affairs' },
          { label: 'Daily Quiz' },
        ]}
        action={
          <Button variant="primary" onClick={() => alert('Add Quiz Form modal')}>
            + Add Quiz
          </Button>
        }
      />

      <Card className="mt-6 bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading quizzes...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                <th className="p-4">Question (EN)</th>
                <th className="p-4">Related Article</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">
                    <div dangerouslySetInnerHTML={{ __html: q.questionTextEn }} />
                  </td>
                  <td className="p-4 text-gray-600">
                    {q.currentAffair ? q.currentAffair.titleEn : 'None'}
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="outline" size="sm" className="mr-2">Edit</Button>
                  </td>
                </tr>
              ))}
              {quizzes.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">No quizzes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
