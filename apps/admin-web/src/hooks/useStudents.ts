import { useState, useEffect } from 'react';

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  exam: string;
  plan: string;
  joinDate: string;
  progress: number;
  accuracy: number;
  status: string;
  lastActive: string;
  language?: string;
  subscriptionType?: string;
  subscriptionEndDate?: string;
  assignedMentor?: string;
  planDetails?: any;
}

const API_BASE = '/api/v1/admin/students';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const useStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch students');
      }
      
      const mapped = data.data.map((user: any) => {
        const profile = user.studentProfile || {};
        return {
          id: user.id,
          name: user.fullName || 'Unknown',
          email: user.email || 'N/A',
          phone: user.mobile || 'N/A',
          exam: user.chosenExam || 'N/A',
          plan: user.studyPlanName || 'N/A',
          planDetails: user.planDetails || null,
          joinDate: new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          progress: 0,
          accuracy: 0,
          status: user.status === 'ACTIVE' ? 'ACTIVE' : user.status === 'SUSPENDED' ? 'INACTIVE' : user.status,
          lastActive: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never',
          language: profile.preparationLanguage || 'english',
          subscriptionType: 'Premium',
          subscriptionEndDate: '2026-11-30',
          assignedMentor: 'Unassigned',
        };
      });
      setStudents(mapped);
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const addStudent = (student: Omit<Student, 'id' | 'joinDate' | 'progress' | 'accuracy' | 'lastActive'>) => {
    // Implement API call
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    // Implement API call
  };

  const deleteStudent = (id: string) => {
    // Implement API call
  };

  const getStudent = (id: string) => {
    return students.find(s => s.id === id);
  };

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudent,
    refreshStudents: fetchStudents,
  };
};
