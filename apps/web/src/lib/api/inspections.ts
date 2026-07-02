import type {
  InspectionsListResponse,
  SyncInspectionRoomsRequest,
  UpdateInspectionRequest,
  UpdateInspectionRoomRequest,
  UpdateInspectionSectionRequest,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export const inspectionsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<InspectionsListResponse>(`/api/v1/inspections${query}`);
  },
  get: (id: string) => apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail }>(`/api/v1/inspections/${id}`),
  getByJob: (jobId: string) =>
    apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail | null }>(
      `/api/v1/inspections/by-job/${jobId}`,
    ),
  createFromJob: (jobId: string) =>
    apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail }>(
      `/api/v1/inspections/from-job/${jobId}`,
      { method: 'POST' },
    ),
  update: (id: string, body: UpdateInspectionRequest) =>
    apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail }>(`/api/v1/inspections/${id}`, {
      method: 'PATCH',
      body,
    }),
  updateSection: (id: string, body: UpdateInspectionSectionRequest) =>
    apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail }>(
      `/api/v1/inspections/${id}/sections`,
      { method: 'PATCH', body },
    ),
  syncRooms: (id: string, body: SyncInspectionRoomsRequest) =>
    apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail }>(
      `/api/v1/inspections/${id}/rooms/sync`,
      { method: 'POST', body },
    ),
  updateRoom: (id: string, roomId: string, body: UpdateInspectionRoomRequest) =>
    apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail }>(
      `/api/v1/inspections/${id}/rooms/${roomId}`,
      { method: 'PATCH', body },
    ),
  complete: (id: string) =>
    apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail }>(
      `/api/v1/inspections/${id}/complete`,
      { method: 'POST' },
    ),
  reopen: (id: string) =>
    apiRequest<{ inspection: import('@sitescop/shared-types').InspectionDetail }>(
      `/api/v1/inspections/${id}/reopen`,
      { method: 'POST' },
    ),
};
