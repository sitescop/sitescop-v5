import type {
  BuildingInspectionFormData,
  InspectionFormDataV2,
  InspectionFormRealm,
  InspectionSectionKey,
  RoomEngineType,
} from '@sitescop/room-engine-core';
import { JobType } from './jobs.js';

export enum InspectionStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  [InspectionStatus.DRAFT]: 'Draft',
  [InspectionStatus.IN_PROGRESS]: 'In Progress',
  [InspectionStatus.COMPLETED]: 'Completed',
};

export enum InspectionRoomType {
  BEDROOM = 'BEDROOM',
  BATHROOM = 'BATHROOM',
  LIVING = 'LIVING',
  GARAGE = 'GARAGE',
}

export const INSPECTION_ROOM_TYPE_LABELS: Record<InspectionRoomType, string> = {
  [InspectionRoomType.BEDROOM]: 'Bedroom',
  [InspectionRoomType.BATHROOM]: 'Bathroom',
  [InspectionRoomType.LIVING]: 'Living Area',
  [InspectionRoomType.GARAGE]: 'Garage',
};

export const ROOM_ENGINE_TO_INSPECTION_ROOM: Record<RoomEngineType, InspectionRoomType> = {
  bedroom: InspectionRoomType.BEDROOM,
  bathroom: InspectionRoomType.BATHROOM,
  living: InspectionRoomType.LIVING,
  garage: InspectionRoomType.GARAGE,
};

export interface InspectionRoomSummary {
  id: string;
  roomType: InspectionRoomType;
  roomIndex: number;
  label: string;
}

export interface InspectionSummary {
  id: string;
  inspectionNumber: string;
  status: InspectionStatus;
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  jobType: JobType;
  propertyAddress: string | null;
  clientName: string | null;
  inspectorName: string | null;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionDetail extends InspectionSummary {
  formData: InspectionFormDataV2;
  rooms: InspectionRoomDetail[];
  createdByName: string;
}

export interface InspectionRoomDetail extends InspectionRoomSummary {
  data: Record<string, unknown>;
}

export interface InspectionsListResponse {
  inspections: InspectionSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateInspectionRequest {
  formData?: InspectionFormDataV2;
  status?: InspectionStatus;
}

export interface UpdateInspectionSectionRequest {
  realm: InspectionFormRealm;
  section: string;
  data: Record<string, unknown>;
}

export interface UpdateInspectionRoomRequest {
  data: Record<string, unknown>;
  label?: string;
}

export interface SyncInspectionRoomsRequest {
  bedroomCount: number;
  bathroomCount: number;
  livingAreaCount: number;
  garageCount: number;
}

export type { BuildingInspectionFormData, InspectionFormDataV2, InspectionFormRealm, InspectionSectionKey };
