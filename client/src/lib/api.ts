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
  updateStatus: (yearId: number, data: unknown) =>
    apiClient.patch(`/years/${yearId}/status`, data),
};

// Terms endpoints
export const termsApi = {
  list: (yearId: number) => apiClient.get(`/academic-years/${yearId}/terms`),
};
