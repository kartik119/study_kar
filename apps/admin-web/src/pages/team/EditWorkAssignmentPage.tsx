// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkAssignments } from '../../hooks/useWorkAssignments';
import { teamApi } from '../../api/team.api';

export default function EditWorkAssignmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    assignmentType: 'STUDENT_MENTORSHIP',
    description: '',
    assigneeId: '',
    roleId: '',
    reportingManagerId: '',
    priority: 'MEDIUM',
    status: 'SCHEDULED',
    startDate: '',
    dueDate: '',
    visibleToAssignee: true,
    reviewRequired: false,
    autoNotifyAssignee: true,
    escalateIfOverdue: false,
    slaValue: 7,
    slaUnit: 'Days',
    instructions: '',
    internalNotes: '',
  });

  useEffect(() => {
    Promise.all([
      teamApi.getMembers({}),
      teamApi.getRoles(),
      import('../../api/work-assignment.api').then(({ workAssignmentApi }) => workAssignmentApi.getAssignmentById(id!))
    ]).then(([membersRes, rolesRes, assignmentRes]) => {
      if (membersRes.success) setTeamMembers(membersRes.data?.members || []);
      if (rolesRes.success) setRoles(rolesRes.data?.data || []);
      if (assignmentRes.success) {
        const a = assignmentRes.data;
        setFormData({
          title: a.title,
          assignmentType: a.assignmentType,
          description: a.description || '',
          assigneeId: a.assigneeId,
          roleId: a.roleId,
          reportingManagerId: a.reportingManagerId || '',
          priority: a.priority,
          status: a.status,
          startDate: new Date(a.startDate).toISOString().split('T')[0],
          dueDate: a.dueDate ? new Date(a.dueDate).toISOString().split('T')[0] : '',
          visibleToAssignee: a.visibleToAssignee,
          reviewRequired: a.reviewRequired,
          autoNotifyAssignee: a.autoNotifyAssignee,
          escalateIfOverdue: a.escalateIfOverdue,
          slaValue: a.slaValue || 7,
          slaUnit: a.slaUnit || 'Days',
          instructions: a.instructions || '',
          internalNotes: a.internalNotes || '',
        });
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const selectedAssignee = teamMembers.find(m => m.id === formData.assigneeId);

  const handleSubmit = async () => {
    if (!formData.title || !formData.assigneeId || !formData.roleId) {
      alert("Please fill required fields: Title, Assignee, Role");
      return;
    }
    
    // In a real application, we would call an updateAssignment API endpoint. 
    // Since we only have create/status update right now, we will just simulate success.
    setSaving(true);
    setTimeout(() => {
       alert('Assignment updated successfully (mocked)');
       setSaving(false);
       navigate(`/team/work-assignments/${id}`);
    }, 1000);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-sm text-gray-500 mb-1">Admin / Team / Work Assignments / Edit</div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Assignment</h1>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Left Area (76%) */}
        <div className="flex-1 space-y-6">
          
          {/* Section 1 */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span> Basic Information
            </h2>
            
            <div className="space-y-4 ml-8 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Title *</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full border border-gray-300 rounded-lg p-2 h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> Assignee & Role
            </h2>
            
            <div className="grid grid-cols-2 gap-4 ml-8 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.assigneeId} onChange={e => setFormData({...formData, assigneeId: e.target.value})}>
                  <option value="">Select Team Member...</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Manager</label>
                <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.reportingManagerId} onChange={e => setFormData({...formData, reportingManagerId: e.target.value})}>
                  <option value="">None / Auto</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span> Schedule & Priority
            </h2>
            <div className="grid grid-cols-2 gap-4 ml-8 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg p-2" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg p-2" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ACTIVE">Active</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 5 & 6 (Workflow & Notes) */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span> Workflow & Notes
            </h2>
            <div className="space-y-4 ml-8 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea className="w-full border border-gray-300 rounded-lg p-2 h-20" value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})}></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes (Admin only)</label>
                <textarea className="w-full border border-gray-300 rounded-lg p-2 h-20 bg-gray-50" value={formData.internalNotes} onChange={e => setFormData({...formData, internalNotes: e.target.value})}></textarea>
              </div>
            </div>
          </section>

          {/* Bottom Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <button onClick={() => navigate(-1)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
