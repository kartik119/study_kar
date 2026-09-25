import { useState, useCallback } from 'react';
import { teamApi } from '../api/team.api';

export const useRoles = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({ totalRoles: 0, activeRoles: 0, totalPermissions: 0, modulesCovered: 0 });
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoles = useCallback(async (query?: any) => {
    setLoading(true);
    try {
      const res = await teamApi.getRoles(query);
      if (res.success) {
        setRoles(res.data.data);
        setKpis(res.data.kpi);
      }
    } catch (error) {
      console.error('Failed to fetch roles', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRole = async (id: string) => {
    try {
      const res = await teamApi.getRole(id);
      if (res.success) return res.data;
      return null;
    } catch (error) {
      console.error('Failed to fetch role details', error);
      return null;
    }
  };

  const createRole = async (data: any) => {
    try {
      const res = await teamApi.createRole(data);
      if (res.success) return true;
      return false;
    } catch (error: any) {
      console.error('Failed to create role', error);
      alert(error.message || 'Failed to create role');
      return false;
    }
  };

  const updateRole = async (id: string, data: any) => {
    try {
      const res = await teamApi.updateRole(id, data);
      if (res.success) return true;
      return false;
    } catch (error: any) {
      console.error('Failed to update role', error);
      alert(error.message || 'Failed to update role');
      return false;
    }
  };

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await teamApi.getPermissions();
      if (res.success) {
        setPermissions(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch permissions', error);
    }
  }, []);

  return {
    roles,
    kpis,
    permissions,
    loading,
    fetchRoles,
    getRole,
    createRole,
    updateRole,
    fetchPermissions
  };
};
