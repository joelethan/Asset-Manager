const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:3000/api";

export const apiClient = {
  async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${baseUrl}${endpoint}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: "include",
    });
  },

  async get(endpoint: string) {
    return this.request(endpoint, { method: "GET" });
  },

  async post(endpoint: string, data?: unknown) {
    return this.request(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  // Post a FormData payload (multipart/form-data).
  // Do NOT set Content-Type header so the browser can add boundary.
  async postForm(endpoint: string, formData: FormData) {
    const url = `${baseUrl}${endpoint}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
  },

  async patch(endpoint: string, data?: unknown) {
    return this.request(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async put(endpoint: string, data?: unknown) {
    return this.request(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async delete(endpoint: string) {
    return this.request(endpoint, { method: "DELETE" });
  },
};

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),
  register: (data: unknown) => apiClient.post("/auth/register", data),
  profile: () => apiClient.get("/auth/profile"),
  logout: () => apiClient.post("/auth/logout"),
  // Request the server to resend the email verification link for the current user
  resendVerification: () => apiClient.post("/auth/resend-verification"),
};

// Schools endpoints
export const schoolsApi = {
  list: () => apiClient.get("/schools"),
  create: (data: unknown) => apiClient.post("/schools", data),
  get: (id: number) => apiClient.get(`/schools/${id}`),
};

// Term Templates endpoints
export const termTemplatesApi = {
  list: (schoolId: string) =>
    apiClient.get(`/schools/${schoolId}/term-templates`),
  create: (schoolId: string, data: unknown) =>
    apiClient.post(`/schools/${schoolId}/term-templates`, data),
  get: (schoolId: string, id: string) =>
    apiClient.get(`/schools/${schoolId}/term-templates/${id}`),
  update: (schoolId: string, id: string, data: unknown) =>
    apiClient.patch(`/schools/${schoolId}/term-templates/${id}`, data),
  delete: (schoolId: string, id: string) =>
    apiClient.delete(`/schools/${schoolId}/term-templates/${id}`),
};

// Academic Years endpoints
export const academicYearsApi = {
  list: (schoolId: string) =>
    apiClient.get(`/schools/${schoolId}/years`),
  create: (schoolId: string, data: unknown) =>
    apiClient.post(`/schools/${schoolId}/years`, data),
  updateStatus: (yearId: number, status: unknown) =>
    apiClient.patch(`/years/${yearId}/status`, { status }),
};

// Terms endpoints
export const termsApi = {
  list: (yearId: number) => apiClient.get(`/academic-years/${yearId}/terms`),
};

// Classroom Definitions endpoints
export const classroomDefinitionsApi = {
  list: (schoolId: string) =>
    apiClient.get(`/schools/${schoolId}/classroom-definitions`),
  create: (schoolId: string, data: unknown) =>
    apiClient.post(`/schools/${schoolId}/classroom-definitions`, data),
  get: (schoolId: string, id: string) =>
    apiClient.get(`/classroom-definitions/${id}`),
  update: (schoolId: string, id: string, data: unknown) =>
    apiClient.patch(`/classroom-definitions/${id}`, data),
  delete: (schoolId: string, id: string) =>
    apiClient.delete(`/classroom-definitions/${id}`),
};

// Enrollments endpoints
export const enrollmentsApi = {
  list: (yearId: string, schoolId: string) =>
    apiClient.get(`/students/enrolled/by-classroom?schoolId=${schoolId}&academicYearId=${yearId}`),
  delete: (enrollmentId: string) =>
    apiClient.delete(`/enrollments/${enrollmentId}`),
  create: (definitionId: string, schoolId: string, data: unknown) =>
    apiClient.post(`/classroom-definitions/${definitionId}/enrollments?schoolId=${schoolId}`, data),
  bulkCreate: (yearId: string, definitionId: string, schoolId: string, data: unknown) =>
    apiClient.post(`/years/${yearId}/classroom-definitions/${definitionId}/enrollments/bulk?schoolId=${schoolId}`, data),
  enrolledStudents: (schoolId: string, assessmentId: string) =>
    apiClient.get(`/schools/${schoolId}/assessments/${assessmentId}/enrolled-students`),
};

export const studentsApi = {
  list: (schoolId: string) =>
    apiClient.get(`/students/new?schoolId=${schoolId}`),
  create: (schoolId: string, data: unknown) =>
    apiClient.post(`/students?schoolId=${schoolId}`, data),
  templateDownload: () => apiClient.get(`/students/import/template`),
  importStudents: (schoolId: string, formData: FormData) =>
    // Use postForm so multipart/form-data is sent correctly
    apiClient.postForm(`/students/import/validate?schoolId=${schoolId}`, formData),
};

export const subjectsApi = {
  list: (schoolId: string) =>
    apiClient.get(`/schools/${schoolId}/subjects`),
  create: (schoolId: string, data: unknown) =>
    apiClient.post(`/schools/${schoolId}/subjects`, data),
  get: (schoolId: string, id: string) =>
    apiClient.get(`/schools/${schoolId}/subjects/${id}`),
  update: (schoolId: string, id: string, data: unknown) =>
    apiClient.patch(`/schools/${schoolId}/subjects/${id}`, data),
  delete: (schoolId: string, id: string) =>
    apiClient.delete(`/schools/${schoolId}/subjects/${id}`),
};

export const assessmentsApi = {
  list: (schoolId: string, yearId?: string, termItemId?: string) => {
    const params = new URLSearchParams();
    if (yearId) params.append('yearId', yearId);
    if (termItemId) params.append('termItemId', termItemId);
    const queryString = params.toString();
    return apiClient.get(`/schools/${schoolId}/assessments${queryString ? '?' + queryString : ''}`);
  },
  create: (schoolId: string, data: unknown) =>
    apiClient.post(`/schools/${schoolId}/assessments`, data),
  get: (schoolId: string, id: string) =>
    apiClient.get(`/schools/${schoolId}/assessments/${id}`),
  update: (schoolId: string, id: string, data: unknown) =>
    apiClient.patch(`/schools/${schoolId}/assessments/${id}`, data),
  delete: (schoolId: string, id: string) =>
    apiClient.delete(`/schools/${schoolId}/assessments/${id}`),
  getClassroomAssessments: (schoolId: string, yearId: string, termId: string, classroomDefinitionId: string) =>
    apiClient.get(`/schools/${schoolId}/assessments?yearId=${yearId}&termItemId=${termId}`),
};

export const gradesApi = {
  bulkCreate: (schoolId: string, data: unknown) =>
    apiClient.post(`/schools/${schoolId}/grades/bulk`, data),
  getStructure: (schoolId: string) =>
    apiClient.get(`/schools/${schoolId}/structure`),
  fetchForAssessment: (schoolId: string, assessmentId: string) =>
    apiClient.get(`/schools/${schoolId}/grades?assessmentId=${assessmentId}`),
  resultsByIdentity: (schoolId: string, yearId: string, termId: string, identity: string) =>
    apiClient.get(`/schools/${schoolId}/results/by-identity?yearId=${yearId}&termId=${termId}&identity=${identity}`),
  resultsByClassroom: (schoolId: string, yearId: string, termId: string, definitionId: string) =>
    apiClient.get(`/schools/${schoolId}/results/by-classroom?yearId=${yearId}&termId=${termId}&definitionId=${definitionId}`),
};
