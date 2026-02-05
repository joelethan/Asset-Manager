import { schools } from "@/mock-data";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

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
    apiClient.get(`/schools/${schoolId}/classroom-definitions/${id}`),
  update: (schoolId: string, id: string, data: unknown) =>
    apiClient.patch(`/schools/${schoolId}/classroom-definitions/${id}`, data),
  delete: (schoolId: string, id: string) =>
    apiClient.delete(`/schools/${schoolId}/classroom-definitions/${id}`),
};

// Enrollments endpoints
export const enrollmentsApi = {
  list: (yearId: string, schoolId: string) =>
    apiClient.get(`/students/enrolled/by-classroom?schoolId=${schoolId}&academicYearId=${yearId}`),
  delete: (enrollmentId: string) =>
    apiClient.delete(`/enrollments/${enrollmentId}`),
  create: (classroomDefinitionId: string, schoolId: string, data: unknown) =>
    apiClient.post(`/classroom-definitions/${classroomDefinitionId}/enrollments?schoolId=${schoolId}`, data),
  bulkCreate: (classroomDefinitionId: string, schoolId: string, data: unknown) =>
    apiClient.post(`/classroom-definitions/${classroomDefinitionId}/enrollments/bulk?schoolId=${schoolId}`, data),
};

export const studentsApi = {
  list: (schoolId: string) =>
    apiClient.get(`/students?schoolId=${schoolId}`),
  create: (schoolId: string, data: unknown) =>
    apiClient.post(`/students?schoolId=${schoolId}`, data),
};
