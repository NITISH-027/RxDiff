# RxDiff - Deterministic Medication Reconciliation

RxDiff is a clinical medication-reconciliation system designed with zero-hallucination, deterministic safety rules.

## Stage 1: Deterministic Engine & Verification Viewer

Stage 1 provides a production-ready React, TypeScript, Vite, Tailwind, and Vitest foundation alongside a strictly deterministic reconciliation diff engine and 3 synthetic demo cases.

### Scripts
- `npm run dev`: Launch local Vite dev server
- `npm run test`: Run Vitest unit test suite
- `npm run lint`: Run ESLint checks
- `npm run build`: Typecheck with `tsc -b` and produce production bundle

### Non-Negotiable Medical Safety Rules
1. **Never Recommend or Prescribe:** RxDiff never calculates, validates, starts, stops, or alters dosages automatically.
2. **Omission is Not Discontinuation:** A medication missing from the AFTER list is never categorized as stopped; it strictly becomes `needs_confirmation`.
3. **Explicit Stop Requirement:** `explicitly_stopped` requires explicit stop/hold/discontinue wording in the AFTER documentation.
4. **Null vs Known is Not a Change:** Discrepancies involving unspecified or missing data fields become `needs_confirmation`.
5. **Fuzzy Similarity is Not Equivalence:** Sound-alike / look-alike drug similarity creates a candidate for `needs_confirmation`, never equivalence.
6. **Transparent Alias Table Only:** Brand/generic equivalence comes strictly from a transparent local table (`glucophage -> metformin`), never unverified inferences.
7. **Complete Evidence Retention:** Every diff retains exact BEFORE and AFTER evidence quotes.
8. **Threshold Fallback:** Any confidence below 0.8, missing evidence, or ambiguous parse becomes `needs_confirmation`.
9. **Fixed Explanation Templates:** Fixed deterministic templates are used for all explanations.
10. **Multi-Field Conflict Precedence:** When multiple non-null fields differ, primary category priority follows `route > dose > strength > frequency`, while retaining all modified fields.

### Synthetic Demo Cases
- **Case A (Regimen Changes):** Metformin frequency changed, Amlodipine unchanged, Atorvastatin explicitly stopped, Rosuvastatin started, Pantoprazole unchanged.
- **Case B (Omission Safety):** Levothyroxine unchanged; Calcium carbonate absent from AFTER list yields `needs_confirmation`.
- **Case C (Alias & Duplicates):** Glucophage and Metformin matched via transparent alias table with `possible_duplicate` flagged for redundant AFTER orders.

## Stage 3: Live Image Extraction (Gemini 3.6 Flash)

Stage 3 adds real BEFORE/AFTER medication document image extraction via a secure Vercel-compatible serverless endpoint (`api/extract.ts`) and the verified `gemini-3.6-flash` model.

### Environment Setup
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the required environment variables in `.env.local`:
   ```env
   # Google Gemini API key (server-side only; never expose to client)
   GEMINI_API_KEY=your_api_key_here

   # Verified model ID for multimodal structured extraction
   GEMINI_MODEL=gemini-3.6-flash

   # Set to true for non-production automated mock testing
   RXDIFF_MOCK_EXTRACTION=false
   ```
   > `.env.local` is ignored by Git and must never be committed.

### Local Development & Vercel Deployment
- **Local Dev Server**: Run `npm run dev`. The Vite development server automatically routes `/api/extract` to the serverless handler and reads `.env.local`.
- **Vercel CLI**: Alternatively, run `vercel dev` to test in the exact Vercel local environment.
- **Production Deployment**: Deploy to Vercel via Git integration or `vercel deploy`. In the Vercel dashboard, configure `GEMINI_API_KEY` and `GEMINI_MODEL` under Project Settings → Environment Variables.

### Security, Privacy, and Fail-Closed Validation
- **Server-Side Only Secrets**: `GEMINI_API_KEY` is never bundled with Vite or exposed to the client.
- **In-Memory Processing**: Images are processed strictly in-memory (max 5 MB each; JPEG, PNG, WebP) and never written to disk or external storage.
- **Prompt Injection Defense**: Image content is treated as untrusted data, never instructions.
- **Verbatim Evidence Verification**: Every extracted mention must contain a non-empty `evidence_quote` matching the raw line text.
- **No Brand-to-Generic Mapping by Model**: `normalized_name` is strictly a deterministic lowercase cleanup of the printed name.
- **Model Never Classifies**: The model acts solely as an OCR and structured entity extractor; the deterministic `diffEngine` performs 100% of the medication reconciliation classification.

