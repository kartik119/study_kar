// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Check, X } from 'lucide-react';
import { useWorkAssignments } from '../../hooks/useWorkAssignments';
import { format } from 'date-fns';

export default function WorkAssignmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateStatus } = useWorkAssignments();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Direct API call inside component because hook doesn't expose fetch single
      import('../../api/work-assignment.api').then(({ workAssignmentApi }) => {
        workAssignmentApi.getAssignmentById(id)
          .then(res => {
            if (res.success) setAssignment(res.data);
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      });
    }
  }, [id]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;
  if (!assignment) return <div className="p-10 text-center text-red-500">Assignment not found</div>;

  const handleStatusChange = async (newStatus: string) => {
    const success = await updateStatus(assignment.id, newStatus);
    if (success) {
      setAssignment({ ...assignment, status: newStatus });
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-sm text-gray-500 mb-1">Admin / Team / Assignment / {assignment.assignmentCode}</div>
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {assignment.status !== 'COMPLETED' && (
             <button onClick={() => handleStatusChange('COMPLETED')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2">
               <Check size={18} /> Mark Complete
             </button>
          )}
          <button onClick={() => navigate(`/team/work-assignments/${id}/edit`)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Edit2 size={18} /> Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h2 className="text-lg font-bold text-gray-900 mb-4">Assignment Details</h2>
             <div className="space-y-4">
               <div>
                 <div className="text-sm text-gray-500">Description</div>
                 <div className="text-gray-900">{assignment.description || 'No description provided.'}</div>
               </div>
               <div>
                 <div className="text-sm text-gray-500">Instructions</div>
                 <div className="text-gray-900 bg-gray-50 p-3 rounded mt-1 border border-gray-100">{assignment.instructions || 'None'}</div>
               </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h2 className="text-lg font-bold text-gray-900 mb-4">Target Audience</h2>
             <div className="text-gray-700">
               {assignment.targetStudents?.length} student(s) assigned.
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
             <h3 className="font-bold text-gray-900 border-b pb-2">Status & Meta</h3>
             <div className="flex justify-between">
               <span className="text-gray-500 text-sm">Status</span>
               <span className="font-medium text-gray-900">{assignment.status}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-gray-500 text-sm">Priority</span>
               <span className="font-medium text-gray-900">{assignment.priority}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-gray-500 text-sm">Created</span>
               <span className="font-medium text-gray-900">{format(new Date(assignment.createdAt), 'dd MMM yyyy')}</span>
             </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
             <h3 className="font-bold text-gray-900 border-b pb-2">Assignee Information</h3>
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                 {assignment.assignee?.avatarUrl ? <img src={assignment.assignee.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : assignment.assignee?.fullName.charAt(0)}
               </div>
               <div>
                 <div className="font-medium text-gray-900">{assignment.assignee?.fullName}</div>
                 <div className="text-xs text-gray-500">{assignment.role?.name}</div>
               </div>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-100">
               <div className="text-sm text-gray-500">Reporting Manager</div>
               <div className="font-medium text-gray-900 mt-1">{assignment.reportingManager?.fullName || 'None'}</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
