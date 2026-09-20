const API_BASE_URL = 'http://localhost:6565/api/v1/admin/study-plans';

const getHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const fetchStudyPlannerRules = async () => {
  const response = await fetch(`${API_BASE_URL}/rules`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch rules');
  const data = await response.json();
  return data.data;
};

export const createStudyPlannerRule = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/rules`, { 
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to create rule');
  return data.data;
};

export const updateStudyPlannerRule = async (id: string, payload: any) => {
  const response = await fetch(`${API_BASE_URL}/rules/${id}`, { 
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update rule');
  return data.data;
};

export const fetchStudyPlanTemplates = async () => {
  const response = await fetch(`${API_BASE_URL}/templates`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch templates');
  const data = await response.json();
  return data.data;
};

export const createStudyPlanTemplate = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/templates`, { 
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to create template');
  return data.data;
};

export const updateStudyPlanTemplate = async (id: string, payload: any) => {
  const response = await fetch(`${API_BASE_URL}/templates/${id}`, { 
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update template');
  return data.data;
};

export const deleteStudyPlanTemplate = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/templates/${id}`, { 
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete template');
  return data;
};

export const fetchAssignedPlans = async () => {
  const response = await fetch(`${API_BASE_URL}/assigned`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch assigned plans');
  const data = await response.json();
  return data.data;
};

export const updateAssignedPlan = async (id: string, payload: any) => {
  const response = await fetch(`${API_BASE_URL}/assigned/${id}`, { 
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update assigned plan');
  return data.data;
};

export const deleteAssignedPlan = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/assigned/${id}`, { 
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete assigned plan');
  return data;
};

export const generateInitialPlan = async (planId: string) => {
  const response = await fetch(`${API_BASE_URL}/${planId}/generate`, { 
    method: 'POST',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to generate plan schedule');
  const data = await response.json();
  return data.data;
};

export const simulateTemplateGeneration = async (payload: {
  templateId: string;
  planStartDate: string;
  selectedDailyMinutes: number;
}) => {
  const response = await fetch(`${API_BASE_URL}/simulate`, { 
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to simulate template generation');
  return data.data;
};

export const fetchPlanSchedule = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/assigned/${id}/schedule`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch plan schedule');
  const data = await response.json();
  return data.data;
};

export const calculatePlanPreview = async (payload: { planStartDate: string, examDate: string, selectedDailyMinutes: number, totalTopics?: number, forceRuleId?: string }) => {
  const response = await fetch(`${API_BASE_URL}/calculate-preview`, { 
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to calculate preview');
  return data.data;
};

export const createStudyPlan = async (payload: { 
  studentId: string, 
  examCycleId: string, 
  planStartDate: string, 
  examDate: string, 
  selectedDailyMinutes: number,
  templateId?: string,
  examStageId?: string,
  totalTopics?: number,
  forceRuleId?: string
}) => {
  const response = await fetch(`${API_BASE_URL}/`, { 
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to create plan');
  return data.data;
};
