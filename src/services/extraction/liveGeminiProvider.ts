import { SourceDocumentSchema } from '../../types/medication.js';
import { buildDiffReport } from '../../engine/diffEngine.js';
import type {
  ExtractionProvider,
  ExtractionStage,
  LiveExtractionResult,
} from './types.js';

export class LiveGeminiProvider implements ExtractionProvider {
  readonly id = 'live-gemini';
  readonly name = 'Live Gemini 3.6 Flash Extraction';

  async extract(
    beforeFile: File,
    afterFile: File,
    onStageChange?: (stage: ExtractionStage) => void,
    abortSignal?: AbortSignal
  ): Promise<LiveExtractionResult> {
    try {
      // 1. UPLOAD stage
      onStageChange?.('UPLOAD');

      const formData = new FormData();
      formData.append('before', beforeFile);
      formData.append('after', afterFile);

      // 2. EXTRACT stage
      onStageChange?.('EXTRACT');

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
        signal: abortSignal,
      });

      if (!response.ok) {
        let errorMsg = `Server error (HTTP ${response.status}). No medication comparison was produced.`;
        let reqId: string | undefined;
        try {
          const errJson = await response.json();
          if (errJson.error) errorMsg = errJson.error;
          if (errJson.request_id) reqId = errJson.request_id;
        } catch {
          // Fallback to text status
        }
        return {
          success: false,
          error: errorMsg,
          requestId: reqId,
        };
      }

      // 3. VALIDATE stage (Client-side defense validation)
      onStageChange?.('VALIDATE');

      const data = await response.json();

      if (!data.before || !data.after || !data.extraction_metadata) {
        return {
          success: false,
          error: 'Malformed extraction payload received from server. No medication comparison was produced.',
        };
      }

      // Strictly validate with client Zod schema
      const beforeParsed = SourceDocumentSchema.safeParse(data.before);
      const afterParsed = SourceDocumentSchema.safeParse(data.after);

      if (!beforeParsed.success || !afterParsed.success) {
        return {
          success: false,
          error: 'Extracted documents failed client schema validation. No medication comparison was produced.',
          requestId: data.extraction_metadata?.request_id,
        };
      }

      // 4. COMPARE stage: Pure deterministic diff engine execution (Model never classifies)
      onStageChange?.('COMPARE');

      const report = buildDiffReport(beforeParsed.data, afterParsed.data);

      return {
        success: true,
        beforeDoc: beforeParsed.data,
        afterDoc: afterParsed.data,
        report,
        metadata: data.extraction_metadata,
      };
    } catch (err: unknown) {
      if (
        abortSignal?.aborted ||
        (err instanceof Error &&
          (err.name === 'AbortError' ||
            err.message.toLowerCase().includes('abort') ||
            err.message.toLowerCase().includes('cancelled')))
      ) {
        return {
          success: false,
          error: 'Extraction was cancelled.',
        };
      }

      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected network error occurred. No medication comparison was produced.',
      };
    }
  }
}

export const liveGeminiProvider = new LiveGeminiProvider();
