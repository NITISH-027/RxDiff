import { LabReportDocumentSchema, type LabReportDocument } from '../types/labReport.js';

export interface SyntheticLabCase {
  id: 'lab-demo-a' | 'lab-demo-b' | 'lab-demo-c';
  title: string;
  badge: string;
  patientName: string;
  labName: string;
  description: string;
  report: LabReportDocument;
}

export const LAB_DEMO_A: SyntheticLabCase = {
  id: 'lab-demo-a',
  title: 'Lab Demo A: Single Abnormal Value (CBC)',
  badge: 'Isolated Low Flag',
  patientName: 'Jane Doe (Synthetic Patient - RxDiff Demo)',
  labName: 'RxDiff Synthetic Diagnostics - not a real patient',
  description:
    'Hemoglobin 9.2 g/dL (range 13.0 - 17.0) flags LOW with verifiable evidence anchoring. Other indices remain within normal reference bounds.',
  report: LabReportDocumentSchema.parse({
    document_id: 'lab-report',
    results: [
      {
        result_id: 'lab-a-001',
        raw_text: 'Hemoglobin: 9.2 g/dL | Ref: 13.0 - 17.0 g/dL',
        test_name_raw: 'Hemoglobin',
        test_key: 'hemoglobin',
        value_numeric: 9.2,
        value_text: null,
        unit: 'g/dL',
        reference_range_raw: '13.0 - 17.0',
        fasting: null,
        evidence_quote: 'Hemoglobin: 9.2 g/dL | Ref: 13.0 - 17.0 g/dL',
        user_edited: false,
      },
      {
        result_id: 'lab-a-002',
        raw_text: 'Platelets: 250 x10^9/L | Ref: 150 - 410 x10^9/L',
        test_name_raw: 'Platelets',
        test_key: 'other',
        value_numeric: 250,
        value_text: null,
        unit: 'x10^9/L',
        reference_range_raw: '150 - 410',
        fasting: null,
        evidence_quote: 'Platelets: 250 x10^9/L | Ref: 150 - 410 x10^9/L',
        user_edited: false,
      },
      {
        result_id: 'lab-a-003',
        raw_text: 'White Blood Cell Count: 6.8 x10^3/uL | Ref: 4.5 - 11.0 x10^3/uL',
        test_name_raw: 'White Blood Cell Count',
        test_key: 'other',
        value_numeric: 6.8,
        value_text: null,
        unit: 'x10^3/uL',
        reference_range_raw: '4.5 - 11.0',
        fasting: null,
        evidence_quote: 'White Blood Cell Count: 6.8 x10^3/uL | Ref: 4.5 - 11.0 x10^3/uL',
        user_edited: false,
      },
    ],
    extraction_warnings: [],
  }),
};

export const LAB_DEMO_B: SyntheticLabCase = {
  id: 'lab-demo-b',
  title: 'Lab Demo B: Metabolic Co-Abnormality Trigger',
  badge: 'Combination Prompt',
  patientName: 'Robert Smith (Synthetic Patient - RxDiff Demo)',
  labName: 'RxDiff Synthetic Diagnostics - not a real patient',
  description:
    'Fasting Glucose 142 mg/dL and HbA1c 7.1 % both exceed reference intervals, triggering a prototype co-abnormality review prompt. Creatinine 1.0 mg/dL serves as an in-range control.',
  report: LabReportDocumentSchema.parse({
    document_id: 'lab-report',
    results: [
      {
        result_id: 'lab-b-001',
        raw_text: 'Glucose, Fasting: 142 mg/dL | Biological Reference: 70 - 99 mg/dL',
        test_name_raw: 'Glucose, Fasting',
        test_key: 'glucose',
        value_numeric: 142,
        value_text: null,
        unit: 'mg/dL',
        reference_range_raw: '70 - 99',
        fasting: true,
        evidence_quote: 'Glucose, Fasting: 142 mg/dL | Biological Reference: 70 - 99 mg/dL',
        user_edited: false,
      },
      {
        result_id: 'lab-b-002',
        raw_text: 'HbA1c (Glycated Hemoglobin): 7.1 % | Ref: 4.0 - 5.6 %',
        test_name_raw: 'HbA1c',
        test_key: 'hba1c',
        value_numeric: 7.1,
        value_text: null,
        unit: '%',
        reference_range_raw: '4.0 - 5.6',
        fasting: null,
        evidence_quote: 'HbA1c (Glycated Hemoglobin): 7.1 % | Ref: 4.0 - 5.6 %',
        user_edited: false,
      },
      {
        result_id: 'lab-b-003',
        raw_text: 'Creatinine: 1.0 mg/dL | Ref: 0.7 - 1.3 mg/dL',
        test_name_raw: 'Creatinine',
        test_key: 'creatinine',
        value_numeric: 1.0,
        value_text: null,
        unit: 'mg/dL',
        reference_range_raw: '0.7 - 1.3',
        fasting: null,
        evidence_quote: 'Creatinine: 1.0 mg/dL | Ref: 0.7 - 1.3 mg/dL',
        user_edited: false,
      },
    ],
    extraction_warnings: [],
  }),
};

export const LAB_DEMO_C: SyntheticLabCase = {
  id: 'lab-demo-c',
  title: 'Lab Demo C: Fail-Closed & Qualitative Safeguards',
  badge: 'Safety Fail-Closed',
  patientName: 'Alex Rivera (Synthetic Patient - RxDiff Demo)',
  labName: 'RxDiff Synthetic Diagnostics - not a real patient',
  description:
    'Demonstrates strict fail-closed safety: unprinted range yields Can\'t assess, qualitative "Trace" albumin is displayed without artificial flagging, and inequality range (< 200) flags HIGH.',
  report: LabReportDocumentSchema.parse({
    document_id: 'lab-report',
    results: [
      {
        result_id: 'lab-c-001',
        raw_text: 'Total Cholesterol: 243 mg/dL | Desirable: < 200 mg/dL',
        test_name_raw: 'Total Cholesterol',
        test_key: 'other',
        value_numeric: 243,
        value_text: null,
        unit: 'mg/dL',
        reference_range_raw: '< 200',
        fasting: null,
        evidence_quote: 'Total Cholesterol: 243 mg/dL | Desirable: < 200 mg/dL',
        user_edited: false,
      },
      {
        result_id: 'lab-c-002',
        raw_text: 'Urine Albumin: Trace (Qualitative)',
        test_name_raw: 'Urine Albumin',
        test_key: 'other',
        value_numeric: null,
        value_text: 'Trace',
        unit: null,
        reference_range_raw: 'Negative',
        fasting: null,
        evidence_quote: 'Urine Albumin: Trace (Qualitative)',
        user_edited: false,
      },
      {
        result_id: 'lab-c-003',
        raw_text: 'Blood Group & Rh Type: O Positive',
        test_name_raw: 'Blood Group & Rh Type',
        test_key: 'other',
        value_numeric: null,
        value_text: 'O Positive',
        unit: null,
        reference_range_raw: null,
        fasting: null,
        evidence_quote: 'Blood Group & Rh Type: O Positive',
        user_edited: false,
      },
    ],
    extraction_warnings: [],
  }),
};

export const SYNTHETIC_LAB_CASES: Record<string, SyntheticLabCase> = {
  'lab-demo-a': LAB_DEMO_A,
  'lab-demo-b': LAB_DEMO_B,
  'lab-demo-c': LAB_DEMO_C,
};
