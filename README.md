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
