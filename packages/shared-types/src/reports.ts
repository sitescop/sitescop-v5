export enum ReportType {
  BUILDING = 'BUILDING',
  PEST = 'PEST',
}

export enum ReportStatus {
  GENERATING = 'GENERATING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.BUILDING]: 'Building Inspection Report',
  [ReportType.PEST]: 'Timber Pest Inspection Report',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.GENERATING]: 'Generating',
  [ReportStatus.READY]: 'Ready',
  [ReportStatus.FAILED]: 'Failed',
};

export interface ReportSummary {
  id: string;
  reportType: ReportType;
  status: ReportStatus;
  fileName: string;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  inspectionId: string;
  inspectionNumber: string;
  jobId: string;
  jobNumber: string;
  jobType: string;
  propertyAddress: string | null;
  clientName: string | null;
  generatedByName: string;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportsListResponse {
  reports: ReportSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GenerateReportsResponse {
  reports: ReportSummary[];
}
