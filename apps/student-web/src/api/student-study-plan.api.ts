const API_URL = 'http://localhost:4000/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem('student_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
};

export const fetchPublicExams = async () => {
  const res = await fetch(`${API_URL}/exams`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch exams');
  return data.data;
};

export const fetchAvailableExams = async () => {
  const res = await fetch(`${API_URL}/student/study-plans/available-exams`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch available exams');
  return data.data;
};

export const createStudentStudyPlan = async (payload: {
  examCycleId: string;
  planStartDate: string;
}) => {
  const res = await fetch(`${API_URL}/student/study-plans`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create plan');
  return data.data;
};

export const fetchActiveStudyPlan = async () => {
  const res = await fetch(`${API_URL}/student/study-plans/active`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(data.error?.message || 'Failed to fetch active plan');
  }
  return data.data;
};

export const fetchWeeklyPlanner = async () => {
  const res = await fetch(`${API_URL}/student/study-plans/active/weekly`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch weekly planner');
  return data.data;
};
