import { useState, useCallback } from 'react';
import { workAssignmentApi } from '../api/work-assignment.api';

export const useWorkAssignments = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchAssignments = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      const res = await workAssignmentApi.getAssignments(filters);
      if (res.success) {
        setAssignments(res.data);
        setTotal(res.total);
      }
    } catch (error: any) {
      alert(error?.message || error?.response?.data?.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKpis = useCallback(async () => {
    try {
      const res = await workAssignmentApi.getKpis();
      if (res.success) {
        setKpis(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch KPIs', error);
    }
  }, []);

  const createAssignment = async (data: any) => {
    try {
      setLoading(true);
      const res = await workAssignmentApi.createAssignment(data);
      if (res.success) {
        alert('Assignment created successfully');
        return true;
      }
      return false;
    } catch (error: any) {
      alert(error?.message || error?.response?.data?.message || 'Failed to create assignment');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, comments?: string) => {
    try {
      const res = await workAssignmentApi.updateStatus(id, status, comments);
      if (res.success) {
        alert('Status updated');
        return true;
      }
      return false;
    } catch (error: any) {
      alert(error?.message || error?.response?.data?.message || 'Failed to update status');
      return false;
    }
  };

  return {
    assignments,
    kpis,
    loading,
    total,
    fetchAssignments,
    fetchKpis,
    createAssignment,
    updateStatus,
  };
};
