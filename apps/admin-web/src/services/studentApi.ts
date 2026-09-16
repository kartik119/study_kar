const API_BASE = '/api/v1/admin/students';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchStudents() {
  const res = await fetch(API_BASE, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch students');
  }
  
  // Return just the mapped data as an array like other APIs
  return data.data.map((user: any) => ({
    id: user.id,
    name: user.fullName || 'Unknown',
    email: user.email || 'N/A'
  }));
}
