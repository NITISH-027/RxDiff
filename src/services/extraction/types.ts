import type { SourceDocument, DiffReport } from '../../types/medication.js';

export type ExtractionStage = 'IDLE' | 'UPLOAD' | 'EXTRACT' | 'VALIDATE' | 'COMPARE';

export interface ExtractionMetadata {
  provider: 'gemini' | 'mock_fixture';
  request_id: string;
  warnings: string[];
}

export interface LiveExtractionSuccess {
  success: true;
  beforeDoc: SourceDocument;
  afterDoc: SourceDocument;
  report: DiffReport;
  metadata: ExtractionMetadata;
}

export interface LiveExtractionFailure {
  success: false;
  error: string;
  requestId?: string;
  code?: string;
}

export type LiveExtractionResult = LiveExtractionSuccess | LiveExtractionFailure;

export interface ExtractionProvider {
  readonly id: string;
  readonly name: string;
}
