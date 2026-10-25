import type { LabReportDocument } from '../../types/labReport.js';

export type LabExtractionStage = 'IDLE' | 'UPLOAD' | 'EXTRACT' | 'VALIDATE';

export interface LabExtractionMetadata {
  provider: 'gemini' | 'mock_fixture';
  request_id: string;
  warnings: string[];
}

export interface LiveLabExtractionSuccess {
  success: true;
  report: LabReportDocument;
  metadata: LabExtractionMetadata;
}

export interface LiveLabExtractionFailure {
  success: false;
  error: string;
  requestId?: string;
  code?: string;
}

export type LiveLabExtractionResult =
  | LiveLabExtractionSuccess
  | LiveLabExtractionFailure;

export interface LabExtractionProvider {
  readonly id: string;
  readonly name: string;
}
