import { useState, useCallback, useEffect } from 'react';
import { teamApi, TeamMemberQuery, InviteMemberData } from '../api/team.api';

export const useTeam = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<any>({ total: 0, active: 0, suspended: 0, roleCount: 0 });
  const [loading, setLoading] = useState(false);

  const fetchKPIs = useCallback(async () => {
    try {
      const res = await teamApi.getKPIs();
      if (res.success) {
        setKpis(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch team KPIs', error);
    }
  }, []);

  const fetchMembers = useCallback(async (query: TeamMemberQuery) => {
    setLoading(true);
    try {
      const res = await teamApi.getMembers(query);
      if (res.success) {
        setMembers(res.data.members);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMemberDetails = async (id: string) => {
    try {
      const res = await teamApi.getMember(id);
      if (res.success) return res.data;
      return null;
    } catch (error) {
      console.error('Failed to load member details');
      return null;
    }
  };

  const getActivityLogs = async (id: string, page = 1, limit = 10) => {
    try {
      const res = await teamApi.getMemberActivity(id, page, limit);
      if (res.success) return res.data;
      return null;
    } catch (error) {
      console.error('Failed to load activity logs');
      return null;
    }
  };

  const inviteMember = async (data: InviteMemberData) => {
    try {
      const res = await teamApi.inviteMember(data);
      if (res.success) {
        // alert('Member invited successfully');
        fetchKPIs();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error(error.response?.data?.message || 'Failed to invite member');
      alert(error.response?.data?.message || 'Failed to invite member');
      return false;
    }
  };

  const resendInvite = async (id: string) => {
    try {
      const res = await teamApi.resendInvite(id);
      if (res.success) {
        // alert('Invitation resent');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to resend invitation');
      return false;
    }
  };

  const cancelInvite = async (id: string) => {
    try {
      const res = await teamApi.cancelInvite(id);
      if (res.success) {
        // alert('Invitation cancelled');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to cancel invitation');
      return false;
    }
  };

  const suspendMember = async (id: string) => {
    try {
      const res = await teamApi.suspendMember(id);
      if (res.success) {
        fetchKPIs();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to suspend member');
      return false;
    }
  };

  const reactivateMember = async (id: string) => {
    try {
      const res = await teamApi.reactivateMember(id);
      if (res.success) {
        fetchKPIs();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to reactivate member');
      return false;
    }
  };

  const deactivateMember = async (id: string) => {
    try {
      const res = await teamApi.deactivateMember(id);
      if (res.success) {
        fetchKPIs();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to deactivate member');
      return false;
    }
  };

  return {
    members,
    total,
    kpis,
    loading,
    fetchKPIs,
    fetchMembers,
    getMemberDetails,
    getActivityLogs,
    inviteMember,
    resendInvite,
    cancelInvite,
    suspendMember,
    reactivateMember,
    deactivateMember
  };
};
