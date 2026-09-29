// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useWorkAssignments } from '../../hooks/useWorkAssignments';

export default function WorkAssignmentsPage() {
  const navigate = useNavigate();
  const { assignments, kpis, loading, fetchAssignments, fetchKpis, total } = useWorkAssignments();
  const [filters, setFilters] = useState({
    search: '',
    assignmentType: '',
    roleId: '',
    status: '',
    examScopeId: '',
    priority: '',
    page: 1,
  });

  useEffect(() => {
    fetchKpis();
    fetchAssignments(filters);
  }, [filters, fetchAssignments, fetchKpis]);

  const handleReset = () => {
    setFilters({ search: '', assignmentType: '', roleId: '', status: '', examScopeId: '', priority: '', page: 1 });
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      ACTIVE: 'bg-emerald-100 text-emerald-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      PENDING_REVIEW: 'bg-amber-100 text-amber-700',
      SCHEDULED: 'bg-gray-100 text-gray-700',
      COMPLETED: 'bg-purple-100 text-purple-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityBadge = (priority: string) => {
    const map: any = {
      HIGH: 'text-orange-600',
      URGENT: 'text-red-600 font-bold',
      MEDIUM: 'text-blue-600',
      LOW: 'text-gray-500',
    };
    return map[priority] || 'text-gray-600';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-500 mb-1">Admin / Team / Work Assignments</div>
          <h1 className="text-2xl font-bold text-gray-900">Work Assignments</h1>
          <p className="text-gray-600 mt-1">Assign operational responsibility to mentors, reviewers, support staff, and content teams.</p>
        </div>
        <button
          onClick={() => navigate('/team/work-assignments/create')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Create Assignment
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <span className="font-medium">Total Assignments</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{kpis?.total || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Across all team members</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="font-medium">Active Assignments</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{kpis?.active || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Currently in progress</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="font-medium">Pending Review</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{kpis?.pendingReview || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Awaiting review or approval</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="font-medium">Overdue Assignments</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{kpis?.overdue || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Past due date</div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Left Area (78%) */}
        <div className="flex-1 space-y-4">
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search assignment, assignee..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              />
            </div>
            
            <select className="border border-gray-300 rounded-lg px-3 py-2 outline-none" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value, page: 1}))}>
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select className="border border-gray-300 rounded-lg px-3 py-2 outline-none" value={filters.priority} onChange={e => setFilters(f => ({...f, priority: e.target.value, page: 1}))}>
              <option value="">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <button onClick={handleReset} className="text-gray-600 hover:text-gray-900 px-3 py-2">Reset</button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
              <Filter size={18} /> Apply Filters
            </button>
          </div>

          {/* Directory Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Assignment Directory</h2>
                <p className="text-sm text-gray-500">Manage and track all team assignments across operations.</p>
              </div>
              <div className="text-sm text-gray-500 font-medium">{total} assignments</div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded" /></th>
                    <th className="px-4 py-3 font-medium">Assignment ID</th>
                    <th className="px-4 py-3 font-medium">Assignee</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Exam Scope</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-10 text-gray-500">Loading assignments...</td></tr>
                  ) : assignments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <div className="text-gray-500 mb-4">No work assignments yet.</div>
                        <button onClick={() => navigate('/team/work-assignments/create')} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium">
                          + Create your first assignment
                        </button>
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment: any) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><input type="checkbox" className="rounded" /></td>
                        <td className="px-4 py-3 font-medium text-gray-900">{assignment.assignmentCode}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {assignment.assignee?.avatarUrl ? <img src={assignment.assignee.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : assignment.assignee?.fullName.charAt(0)}
                            </div>
                            <span className="text-gray-700">{assignment.assignee?.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">
                            {assignment.role?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{assignment.assignmentType.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {assignment.examScopes?.length > 0 
                            ? assignment.examScopes.map((s:any) => s.examProgramme.nameEn).join(', ') 
                            : 'All Exams'}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className={getPriorityBadge(assignment.priority)}>{assignment.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(assignment.status)}`}>
                            {assignment.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors" onClick={() => navigate(`/team/work-assignments/${assignment.id}`)}>
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600">
              <div>Showing {assignments.length} of {total} assignments</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled={filters.page === 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Previous</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled={assignments.length < 10} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary Area (22%) */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-1">Assignment Summary</h3>
            <p className="text-xs text-gray-500 mb-6">Overview of team capacity and insights.</p>

            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Assignment Types</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Student Mentorship</span>
                    <span className="font-medium text-gray-900">{total}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
               <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                 <div className="text-xs font-semibold text-amber-800 uppercase mb-1">Due This Week</div>
                 <div className="text-2xl font-bold text-amber-600">0</div>
               </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Team Capacity</h4>
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">Mentors</span>
                  <span className="text-gray-900 font-bold">15 / 50</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '30%' }}></div>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-right">30% Utilized</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
