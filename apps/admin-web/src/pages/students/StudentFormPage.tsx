import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Card,
  FormField,
  Input,
  Select,
  Button
} from '@study-karnataka/ui';
import { useStudents } from '../../hooks/useStudents';
import { fetchAuthorities } from '../../services/examApi';

export const StudentFormPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(studentId);
  const { addStudent, getStudent, updateStudent, students } = useStudents();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    exam: '',
    plan: '',
    language: 'english',
    status: 'ACTIVE',
    joinDate: '',
    progress: 0,
    accuracy: 0,
    lastActive: '',
  });

  const [authorities, setAuthorities] = useState<any[]>([]);

  useEffect(() => {
    fetchAuthorities().then(setAuthorities).catch(console.error);
  }, []);

  useEffect(() => {
    if (isEdit && studentId) {
      const student = getStudent(studentId);
      if (student) {
        setFormData({
          name: student.name,
          email: student.email,
          phone: student.phone,
          exam: student.exam,
          plan: student.plan,
          language: student.language || 'english',
          status: student.status,
          joinDate: student.joinDate || '',
          progress: student.progress || 0,
          accuracy: student.accuracy || 0,
          lastActive: student.lastActive || '',
        });
      }
    }
  }, [isEdit, studentId, students]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (isEdit && studentId) {
      updateStudent(studentId, formData);
      navigate(`/students/${studentId}`);
    } else {
      addStudent(formData);
      navigate('/students');
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <PageHeader
        title={isEdit ? 'Edit Student' : 'Add New Student'}
        subtitle={isEdit ? `Update profile for ${studentId}` : 'Register a new student into the platform manually.'}
        breadcrumbItems={[
          { label: 'Dashboard', href: '/' },
          { label: 'Students', href: '/students' },
          { label: isEdit ? 'Edit' : 'Add New' },
        ]}
      />

      <Card style={{ maxWidth: '800px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <FormField label="Full Name" required>
            <Input 
              placeholder="Enter full name" 
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </FormField>
          
          <FormField label="Email" required>
            <Input 
              type="email" 
              placeholder="Student email" 
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </FormField>
          
          <FormField label="Mobile Number" required>
            <Input 
              placeholder="Mobile number" 
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </FormField>
          
          <FormField label="Exam" required>
            <Select 
              value={formData.exam}
              onChange={(e) => handleChange('exam', e.target.value)}
              options={[
                { label: 'Select Exam', value: '' },
                ...authorities.map(a => ({ label: a.nameEn, value: a.code }))
              ]}
            />
          </FormField>
          
          <FormField label="Study Plan">
            <Select 
              value={formData.plan}
              onChange={(e) => handleChange('plan', e.target.value)}
              options={[
                { label: 'Select Study Plan', value: '' },
                { label: 'KPSC Prelims 90 Day Plan', value: 'KPSC Prelims 90 Day Plan' },
                { label: 'KPSC Intensive 60 Day Plan', value: 'KPSC Intensive 60 Day Plan' },
                { label: 'UPSC Prelims 120 Day Plan', value: 'UPSC Prelims 120 Day Plan' },
              ]}
            />
          </FormField>
          
          <FormField label="Preferred Language">
            <Select 
              value={formData.language}
              onChange={(e) => handleChange('language', e.target.value)}
              options={[
                { label: 'Kannada', value: 'kannada' },
                { label: 'English', value: 'english' },
              ]}
            />
          </FormField>
          
          <FormField label="Account Status">
            <Select 
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              options={[
                { label: 'Active', value: 'ACTIVE' },
                { label: 'At Risk', value: 'AT_RISK' },
                { label: 'Inactive', value: 'INACTIVE' },
                { label: 'Suspended', value: 'SUSPENDED' },
              ]}
            />
          </FormField>

          <FormField label="Join Date">
            <Input 
              type="text" 
              placeholder="e.g., 25 Aug 2026" 
              value={formData.joinDate}
              onChange={(e) => handleChange('joinDate', e.target.value)}
            />
          </FormField>
          
          <FormField label="Progress (%)">
            <Input 
              type="number" 
              placeholder="0 - 100" 
              value={formData.progress.toString()}
              onChange={(e) => handleChange('progress', parseInt(e.target.value) || 0)}
            />
          </FormField>

          <FormField label="Accuracy (%)">
            <Input 
              type="number" 
              placeholder="0 - 100" 
              value={formData.accuracy.toString()}
              onChange={(e) => handleChange('accuracy', parseInt(e.target.value) || 0)}
            />
          </FormField>

          <FormField label="Last Active">
            <Input 
              type="text" 
              placeholder="e.g., 12/09/2026, 10:30:00" 
              value={formData.lastActive}
              onChange={(e) => handleChange('lastActive', e.target.value)}
            />
          </FormField>

          {!isEdit && (
            <FormField label="Password" helperText="Leave empty to auto-generate and email.">
              <Input type="password" placeholder="Set password" />
            </FormField>
          )}
        </div>

        <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.name || !formData.email || !formData.phone || !formData.exam}>{isEdit ? 'Update Student' : 'Register Student'}</Button>
        </div>
      </Card>
    </div>
  );
};
