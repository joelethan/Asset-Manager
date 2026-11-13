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

  async download(endpoint: string) {
    const url = `${baseUrl}${endpoint}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return fetch(url, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
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
  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post("/auth/reset-password", { token, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post("/auth/change-password", { currentPassword, newPassword }),
};

// Schools endpoints
export const schoolsApi = {
  list: () => apiClient.get("/schools"),
  create: (data: unknown) => apiClient.post("/schools", data),
  get: (id: string) => apiClient.get(`/schools/${id}`),
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
  updateStatus: (yearId: string, status: unknown) =>
    apiClient.patch(`/years/${yearId}/status`, { status }),
};

// Terms endpoints
export const termsApi = {
  list: (yearId: string) => apiClient.get(`/academic-years/${yearId}/terms`),
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
  studentDetails: (schoolId: string, studentNoOrRegNo: string) =>
    apiClient.get(`/students/identity/${studentNoOrRegNo}?schoolId=${schoolId}`),
  addGuardian: (studentId: string, data: unknown) =>
    apiClient.post(`/guardians/${studentId}/guardians`, data),
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
    apiClient.get(`/schools/${schoolId}/assessments?yearId=${yearId}&termItemId=${termId}&definitionId=${classroomDefinitionId}`),
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

export const guardiansApi = {
  create: (data: unknown) => apiClient.post(`/guardians`, data),
  getGuardians: (schoolId: string) => apiClient.get(`/guardians?schoolId=${schoolId}`),
  delete: (guardianId: string) => apiClient.delete(`/guardians/${guardianId}`),
  update: (guardianId: string, data: unknown) => apiClient.patch(`/guardians/${guardianId}`, data),
  setPrimary: (studentId: string, guardianId: string) =>
    apiClient.patch(`/guardians/${studentId}/guardians/${guardianId}/set-primary`),
  sendMessageToStudentGuardians: (studentId: string, data: unknown) =>
    apiClient.post(`/students/${studentId}/guardians/messages`, data),
};

export const dashboardApi = {
  getSchoolDashboard: (schoolId: string) =>
    apiClient.get(`/dashboard/school/${schoolId}`),
};

export const adminApi = {
  createSchoolAdmin: (data: unknown) => apiClient.post("/admins/school", data),
  listSchoolAdmins: (schoolId?: string) =>
    apiClient.get(`/admins/school${schoolId ? `?schoolId=${schoolId}` : ""}`),
  listSuperAdmins: () => apiClient.get("/admins/super"),
  triggerUserPasswordReset: (userId: string) =>
    apiClient.post(`/users/${userId}/reset-password`, {}),
};

export const reportCardsApi = {
  // Generate report cards (single, multiple, or classroom)
  generate: (schoolId: string, data: {
    academicYearId: string;
    termTemplateItemId: string;
    studentId?: string;
    studentIds?: string[];
    classroomDefinitionId?: string;
    includeRank?: boolean;
    autoPublish?: boolean;
  }) => apiClient.post(`/schools/${schoolId}/report-cards`, data),

  // Fetch list of report cards
  list: (schoolId: string) => apiClient.get(`/schools/${schoolId}/report-cards`),

  // Fetch specific report card details
  get: (schoolId: string, reportCardId: string) =>
    apiClient.get(`/schools/${schoolId}/report-cards/${reportCardId}`),

  // Publish a report card
  publish: (schoolId: string, reportCardId: string) =>
    apiClient.patch(`/schools/${schoolId}/report-cards/${reportCardId}/publish`),

  // Download PDF
  downloadPDF: (schoolId: string, reportCardId: string) =>
    apiClient.download(`/schools/${schoolId}/report-cards/${reportCardId}/pdf`),

  // Generate and download PDF in a single request
  downloadDirectly: (schoolId: string, data: {
    studentId: string;
    academicYearId: string;
    termTemplateItemId: string;
  }) => apiClient.post(`/schools/${schoolId}/report-cards/download`, data),

  // Download PDF by student identity using the results endpoint
  downloadByIdentity: (
    schoolId: string,
    yearId: string,
    termId: string,
    identity: string,
  ) => apiClient.download(`/schools/${schoolId}/report-cards/by-identity/auto/pdf?yearId=${yearId}&termId=${termId}&identity=${identity}`),
};
// ) => apiClient.download(`/schools/${schoolId}/report-card-2/dummy/pdf?yearId=${yearId}&termId=${termId}&identity=${identity}`),
// ) => apiClient.download(`/schools/${schoolId}/report-cards/by-identity/auto/pdf?yearId=${yearId}&termId=${termId}&identity=${identity}`),

// Billing endpoints
export const billingApi = {
  options: (schoolId: string) => apiClient.get(`/schools/${schoolId}/billing/options`),

  listCategories: (schoolId: string) => apiClient.get(`/schools/${schoolId}/fee-categories`),
  createCategory: (schoolId: string, data: unknown) => apiClient.post(`/schools/${schoolId}/fee-categories`, data),
  updateCategory: (schoolId: string, id: string, data: unknown) =>
    apiClient.patch(`/schools/${schoolId}/fee-categories/${id}`, data),
  setCategoryActive: (schoolId: string, id: string, active: boolean) =>
    apiClient.post(`/schools/${schoolId}/fee-categories/${id}/${active ? "activate" : "deactivate"}`),
  seedDefaultCategories: (schoolId: string) => apiClient.post(`/schools/${schoolId}/fee-categories/seed-defaults`),

  listStructures: (schoolId: string, params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString();
    return apiClient.get(`/schools/${schoolId}/fee-structures${qs ? `?${qs}` : ""}`);
  },
  createStructure: (schoolId: string, data: unknown) => apiClient.post(`/schools/${schoolId}/fee-structures`, data),
  updateStructure: (schoolId: string, id: string, data: unknown) =>
    apiClient.patch(`/schools/${schoolId}/fee-structures/${id}`, data),
  setStructureActive: (schoolId: string, id: string, active: boolean) =>
    apiClient.post(`/schools/${schoolId}/fee-structures/${id}/${active ? "activate" : "deactivate"}`),
  copyStructures: (schoolId: string, data: unknown) => apiClient.post(`/schools/${schoolId}/fee-structures/copy`, data),

  eligibleStudents: (schoolId: string, structureId: string) =>
    apiClient.get(`/schools/${schoolId}/fee-structures/${structureId}/eligible-students`),
  assignStudents: (schoolId: string, data: { fee_structure_id: string; student_ids: string[] }) =>
    apiClient.post(`/schools/${schoolId}/fee-assignments`, data),
  updateAssignment: (schoolId: string, id: string, data: unknown) =>
    apiClient.patch(`/schools/${schoolId}/fee-assignments/${id}`, data),
  removeAssignment: (schoolId: string, id: string) => apiClient.post(`/schools/${schoolId}/fee-assignments/${id}/remove`),

  previewInvoices: (schoolId: string, data: unknown) => apiClient.post(`/schools/${schoolId}/invoices/generate/preview`, data),
  generateInvoices: (schoolId: string, data: unknown) => apiClient.post(`/schools/${schoolId}/invoices/generate`, data),
  issueBatch: (schoolId: string, batchId: string) => apiClient.post(`/schools/${schoolId}/invoices/batches/${batchId}/issue`),
  discardBatch: (schoolId: string, batchId: string) => apiClient.delete(`/schools/${schoolId}/invoices/batches/${batchId}`),
  listInvoices: (schoolId: string, params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString();
    return apiClient.get(`/schools/${schoolId}/invoices${qs ? `?${qs}` : ""}`);
  },
  getInvoice: (schoolId: string, id: string) => apiClient.get(`/schools/${schoolId}/invoices/${id}`),
  updateInvoice: (schoolId: string, id: string, data: unknown) => apiClient.patch(`/schools/${schoolId}/invoices/${id}`, data),
  issueInvoice: (schoolId: string, id: string) => apiClient.post(`/schools/${schoolId}/invoices/${id}/issue`),
  cancelInvoice: (schoolId: string, id: string, reason: string) =>
    apiClient.post(`/schools/${schoolId}/invoices/${id}/cancel`, { reason }),
  deleteInvoice: (schoolId: string, id: string) => apiClient.delete(`/schools/${schoolId}/invoices/${id}`),

  recordPayment: (schoolId: string, invoiceId: string, data: unknown, idempotencyKey: string) =>
    apiClient.request(`/schools/${schoolId}/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  reversePayment: (schoolId: string, paymentId: string, reason: string) =>
    apiClient.post(`/schools/${schoolId}/payments/${paymentId}/reverse`, { reason }),
  listPayments: (schoolId: string, params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString();
    return apiClient.get(`/schools/${schoolId}/payments${qs ? `?${qs}` : ""}`);
  },
  getReceipt: (schoolId: string, paymentId: string) => apiClient.get(`/schools/${schoolId}/payments/${paymentId}/receipt`),

  summary: (schoolId: string, params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString();
    return apiClient.get(`/schools/${schoolId}/billing/summary${qs ? `?${qs}` : ""}`);
  },
  byClass: (schoolId: string, params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString();
    return apiClient.get(`/schools/${schoolId}/billing/by-class${qs ? `?${qs}` : ""}`);
  },
  statement: (schoolId: string, studentId: string, academicYearId?: string) =>
    apiClient.get(`/schools/${schoolId}/students/${studentId}/statement${academicYearId ? `?academicYearId=${academicYearId}` : ""}`),
  exportCsv: (schoolId: string, kind: "invoices" | "payments", params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString();
    return apiClient.download(`/schools/${schoolId}/billing/export/${kind}.csv${qs ? `?${qs}` : ""}`);
  },
};
