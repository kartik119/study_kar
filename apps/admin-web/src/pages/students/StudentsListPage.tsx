import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  MetricCard,
  Tabs,
  SearchInput,
  Select,
  Button,
  Table,
  Pagination,
  StatusBadge,
  DropdownMenu,
  IconButton
} from '@study-karnataka/ui';
import { useStudents } from '../../hooks/useStudents';

export const StudentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { students, deleteStudent, updateStudent } = useStudents();
  
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const [examFilter, setExamFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Tab Filter
      if (activeTab === 'active' && student.status !== 'ACTIVE') return false;
      if (activeTab === 'at_risk' && student.status !== 'AT_RISK') return false;
      if (activeTab === 'inactive' && student.status !== 'INACTIVE') return false;
      // Note: 'premium' is mocked as all active for now since we don't have a premium flag

      // Dropdown Filters
      if (examFilter !== 'all' && student.exam.toLowerCase() !== examFilter) return false;
      if (planFilter !== 'all' && !student.plan.toLowerCase().includes(planFilter)) return false;
      if (statusFilter !== 'all' && student.status.toLowerCase() !== statusFilter) return false;

      // Search Filter
      if (search) {
        const query = search.toLowerCase();
        return (
          student.name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query) ||
          student.phone.toLowerCase().includes(query) ||
          student.id.toLowerCase().includes(query) ||
          student.plan.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [students, activeTab, examFilter, planFilter, statusFilter, search]);

  const activeCount = students.filter(s => s.status === 'ACTIVE').length;
  const atRiskCount = students.filter(s => s.status === 'AT_RISK').length;
  const inactiveCount = students.filter(s => s.status === 'INACTIVE').length;

  const renderProgress = (val: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '13px', width: '32px' }}>{val}%</span>
      <div style={{ flex: 1, height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
        <div style={{ height: '100%', width: `${val}%`, backgroundColor: '#3B82F6', borderRadius: '3px' }} />
      </div>
    </div>
  );

  const getStatusBadge = (status: string) => {
    if (status === 'AT_RISK') return <StatusBadge status="At Risk" />;
    return <StatusBadge status={status} />;
  };

  const tableHeaders = [
    <input type="checkbox" key="all" />,
    'Student',
    'Email / Phone',
    'Exam',
    'Plan',
    'Join Date',
    'Progress',
    'Accuracy',
    'Status',
    'Last Active',
    'Actions'
  ];

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableRows = paginatedStudents.map(student => [
    <input type="checkbox" key={student.id} />,
    <div key="student" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748B' }}>
        {student.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '14px', cursor: 'pointer' }} onClick={() => navigate(`/students/${student.id}`)}>
          {student.name}
        </div>
        <div style={{ fontSize: '12px', color: '#64748B' }}>ID: {student.id}</div>
      </div>
    </div>,
    <div key="contact" style={{ fontSize: '13px' }}>
      <div>{student.email}</div>
      <div style={{ color: '#64748B' }}>{student.phone}</div>
    </div>,
    student.exam,
    <div key="plan" style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={student.plan}>
      {student.plan}
    </div>,
    student.joinDate,
    renderProgress(student.progress),
    <div key="acc">{student.accuracy}%</div>,
    getStatusBadge(student.status),
    <div key="active" style={{ fontSize: '13px', color: '#64748B' }}>{student.lastActive}</div>,
    <div key="actions" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <IconButton 
        ariaLabel="View" 
        icon={<span style={{fontSize: '16px'}}>👁️</span>} 
        size="sm" 
        onClick={() => navigate(`/students/${student.id}`)}
      />
      <IconButton 
        ariaLabel="Edit" 
        icon={<span style={{fontSize: '16px'}}>✏️</span>} 
        size="sm" 
        onClick={() => navigate(`/students/${student.id}/edit`)}
      />
      <DropdownMenu 
        trigger={<IconButton ariaLabel="More" icon={<span style={{fontSize: '16px'}}>⋮</span>} size="sm" />}
        items={[
          { label: 'View Profile', onClick: () => navigate(`/students/${student.id}`) },
          { label: 'Edit Student', onClick: () => navigate(`/students/${student.id}/edit`) },
          { label: student.status === 'ACTIVE' ? 'Suspend Student' : 'Activate Student', onClick: () => updateStudent(student.id, { status: student.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }) },
          { label: 'Delete Student', onClick: () => {
              if (window.confirm('Are you sure you want to delete this student?')) {
                deleteStudent(student.id);
              }
            }, 
            danger: true 
          }
        ]}
      />
    </div>
  ]);

  return (
    <div style={{ paddingBottom: '40px' }}>
      <PageHeader
        title="Students"
        subtitle="Manage all students, view their progress, plans and activity."
        breadcrumbItems={[
          { label: 'Dashboard', href: '/' },
          { label: 'Students' },
        ]}
        actions={
          <Button onClick={() => navigate('/students/new')}>+ Add Student</Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Total Students" value={students.length} changeLabel="+1 this week" icon={<span style={{fontSize: '20px'}}>👥</span>} />
        <MetricCard title="Active Students" value={activeCount} changeLabel={`${Math.round((activeCount/Math.max(1, students.length))*100)}% of total`} badgeText="Healthy" />
        <MetricCard title="Premium Students" value={activeCount} changeLabel="Same as active (Demo)" icon={<span style={{fontSize: '20px'}}>⭐</span>} />
        <MetricCard title="At Risk Students" value={atRiskCount} changeLabel="Need attention" badgeText="Warning" />
        <MetricCard title="Inactive Students" value={inactiveCount} changeLabel="Last 30 days" icon={<span style={{fontSize: '20px'}}>💤</span>} />
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '24px' }}>
        <Tabs
          activeTab={activeTab}
          onTabChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }}
          tabs={[
            { id: 'all', label: 'All Students' },
            { id: 'active', label: 'Active' },
            { id: 'premium', label: 'Premium' },
            { id: 'at_risk', label: 'At Risk' },
            { id: 'inactive', label: 'Inactive' },
          ]}
        />

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ flex: '1 1 240px' }}>
            <SearchInput 
              placeholder="Search students, email, phone, plans..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div style={{ width: '160px' }}>
            <Select 
              value={examFilter}
              onChange={(e) => { setExamFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { label: 'All Exams', value: 'all' },
                { label: 'KPSC', value: 'kpsc' },
                { label: 'UPSC', value: 'upsc' },
                { label: 'PSI', value: 'psi' },
                { label: 'FDA', value: 'fda' },
                { label: 'PDO', value: 'pdo' },
              ]} 
            />
          </div>
          <div style={{ width: '220px' }}>
            <Select 
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { label: 'All Plans', value: 'all' },
                { label: 'KPSC Prelims 90 Day', value: 'kpsc prelims 90' },
                { label: 'KPSC Intensive 60 Day', value: 'kpsc intensive 60' },
              ]} 
            />
          </div>
          <div style={{ width: '160px' }}>
            <Select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'At Risk', value: 'at_risk' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Suspended', value: 'suspended' },
              ]} 
            />
          </div>
          <Button variant="outline" onClick={() => {
            setSearch('');
            setExamFilter('all');
            setPlanFilter('all');
            setStatusFilter('all');
            setActiveTab('all');
          }}>Clear Filters</Button>
        </div>

        {paginatedStudents.length > 0 ? (
          <>
            <Table headers={tableHeaders} rows={tableRows} />
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            No students found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};
