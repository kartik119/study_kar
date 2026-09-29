// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Target, Info, FileText } from 'lucide-react';
import { useWorkAssignments } from '../../hooks/useWorkAssignments';
import { teamApi } from '../../api/team.api';

export default function CreateWorkAssignmentPage() {
  const navigate = useNavigate();
  const { createAssignment, loading } = useWorkAssignments();
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    assignmentType: 'STUDENT_MENTORSHIP',
    description: '',
    assigneeId: '',
    roleId: '',
    reportingManagerId: '',
    priority: 'MEDIUM',
    status: 'SCHEDULED',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    visibleToAssignee: true,
    reviewRequired: false,
    autoNotifyAssignee: true,
    escalateIfOverdue: false,
    slaValue: 7,
    slaUnit: 'Days',
    instructions: '',
    internalNotes: '',
    examScopeIds: [] as string[],
    moduleCodes: [] as string[],
    targetStudentIds: [] as string[],
  });

  useEffect(() => {
    // Load team members and roles
    teamApi.getMembers({}).then(res => {
      if (res.success) setTeamMembers(res.data?.members || []);
    }).catch(console.error);

    teamApi.getRoles().then(res => {
      if (res.success) setRoles(res.data?.data || []);
    }).catch(console.error);
  }, []);

  const selectedAssignee = teamMembers.find(m => m.id === formData.assigneeId);

  const handleSubmit = async () => {
    if (!formData.title || !formData.assigneeId || !formData.roleId) {
      alert("Please fill required fields: Title, Assignee, Role");
      return;
    }
    const success = await createAssignment(formData);
    if (success) {
      navigate('/team/work-assignments');
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-sm text-gray-500 mb-1">Admin / Team / Work Assignments / Create</div>
          <h1 className="text-2xl font-bold text-gray-900">Create Assignment</h1>
          <p className="text-gray-600 mt-1">Assign operational responsibility to team members.</p>
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
            <p className="text-sm text-gray-500 mb-4 ml-8">Provide the basic details of the work assignment.</p>
            
            <div className="space-y-4 ml-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Title *</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. UPSC Mentorship - Oct 2026 Batch" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Type *</label>
                <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.assignmentType} onChange={e => setFormData({...formData, assignmentType: e.target.value})}>
                  <option value="STUDENT_MENTORSHIP">Student Mentorship</option>
                  <option value="STUDENT_FOLLOW_UP">Student Follow-up</option>
                  <option value="CONTENT_REVIEW_QUEUE">Content Review Queue</option>
                </select>
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
            <p className="text-sm text-gray-500 mb-4 ml-8">Select the team member, role and set workload capacity.</p>
            
            <div className="grid grid-cols-2 gap-4 ml-8">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})}>
                  <option value="">Select Role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
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
              {selectedAssignee && selectedAssignee.mentorProfile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <div className="p-2 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                    {selectedAssignee.mentorProfile.activeStudentCount} / {selectedAssignee.mentorProfile.maxCapacity || 'Unlimited'} assigned students
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span> Assignment Scope
            </h2>
            <p className="text-sm text-gray-500 mb-4 ml-8">Define the modules, exam scope and target for this assignment.</p>
            
            <div className="space-y-4 ml-8">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                Assignment scope is limited by selected team member role permissions.
              </div>
              
              {/* Mocking Target Selector for brevity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                  <Target size={16} /> Select Targets ({formData.targetStudentIds.length} selected)
                </button>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span> Schedule & Priority
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status *</label>
                <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 5 & 6 (Workflow & Notes) */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">5</span> Workflow & Notes
            </h2>
            <div className="space-y-4 ml-8 mt-4">
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.reviewRequired} onChange={e => setFormData({...formData, reviewRequired: e.target.checked})} className="rounded text-indigo-600" />
                  <span className="text-sm text-gray-700">Review Required</span>
                </label>
              </div>
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
            <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>

        </div>

        {/* Right Preview Area (24%) */}
        <div className="w-[320px] shrink-0 space-y-4 sticky top-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-1">Assignment Preview</h3>
            <p className="text-xs text-gray-500 mb-4">Review the details before creating.</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                  {selectedAssignee ? (selectedAssignee.name || selectedAssignee.fullName || '?').charAt(0) : '?'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{selectedAssignee ? (selectedAssignee.name || selectedAssignee.fullName) : 'No Assignee'}</div>
                  <div className="text-xs text-gray-500">{formData.assignmentType.replace(/_/g, ' ')}</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Title</span>
                  <span className="text-gray-900 font-medium truncate ml-4">{formData.title || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Priority</span>
                  <span className="text-gray-900 font-medium">{formData.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="text-gray-900 font-medium">{formData.status}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm mt-4">
                <h4 className="font-semibold text-blue-800 mb-1">Quick Insights</h4>
                <ul className="list-disc pl-4 text-blue-700 space-y-1 text-xs">
                  <li>This assignment will be linked to {formData.targetStudentIds.length} target records.</li>
                  {formData.reviewRequired && <li>Completion requires manager review.</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
