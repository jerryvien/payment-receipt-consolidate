import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
});

export interface ClaimFile {
  id: number;
  claimId: number;
  fileName: string;
  storedPath: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface Claim {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  submittedBy: string;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  files: ClaimFile[];
}

export interface ClaimCreateDto {
  title: string;
  description?: string;
  amount: number;
  submittedBy: string;
}

export interface ClaimUpdateDto {
  title?: string;
  description?: string;
  amount?: number;
}

export interface ClaimReviewDto {
  reviewedBy: string;
  reviewNotes?: string;
}

export const claimsApi = {
  getAll: (status?: string) =>
    api.get<Claim[]>('/claims', { params: status ? { status } : {} }),

  getOne: (id: number) =>
    api.get<Claim>(`/claims/${id}`),

  create: (data: ClaimCreateDto) =>
    api.post<Claim>('/claims', data),

  update: (id: number, data: ClaimUpdateDto) =>
    api.put<Claim>(`/claims/${id}`, data),

  delete: (id: number) =>
    api.delete(`/claims/${id}`),

  uploadFiles: (id: number, files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return api.post<ClaimFile[]>(`/claims/${id}/files`, form);
  },

  deleteFile: (claimId: number, fileId: number) =>
    api.delete(`/claims/${claimId}/files/${fileId}`),

  getFileUrl: (claimId: number, fileId: number) =>
    `${API_BASE}/claims/${claimId}/files/${fileId}`,

  submit: (id: number) =>
    api.post<Claim>(`/claims/${id}/submit`),

  approve: (id: number, data: ClaimReviewDto) =>
    api.post<Claim>(`/claims/${id}/approve`, data),

  reject: (id: number, data: ClaimReviewDto) =>
    api.post<Claim>(`/claims/${id}/reject`, data),
};

export default api;
