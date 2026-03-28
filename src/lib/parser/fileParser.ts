import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ParsedFile } from '@/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

async function readFileAsText(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 50MB를 초과합니다.');
  }
  const text = await file.text();
  if (!text.includes('\ufffd') && text.length > 0) return text;
  const buffer = await file.arrayBuffer();
  return new TextDecoder('euc-kr').decode(buffer);
}

function detectEncoding(file: File, text: string): string {
  if (text.includes('\ufffd')) return 'CP949';
  return 'UTF-8';
}

async function parseCSV(file: File): Promise<ParsedFile> {
  const rawText = await file.text();
  const hasReplacement = rawText.includes('\ufffd');
  const text = hasReplacement
    ? new TextDecoder('euc-kr').decode(await file.arrayBuffer())
    : rawText;
  const encoding = hasReplacement ? 'CP949' : 'UTF-8';

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (!result.data || result.data.length === 0) {
    throw new Error('파일을 파싱할 수 없습니다. 데이터가 비어있습니다.');
  }

  const columns = result.meta.fields || [];
  const rawData = result.data as Record<string, unknown>[];

  return {
    name: file.name,
    encoding,
    rows: rawData.length,
    columns,
    rawData,
    sampleRows: rawData.slice(0, 5),
  };
}

async function parseXLSX(file: File): Promise<ParsedFile> {
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];

    if (!rawData || rawData.length === 0) {
      throw new Error('엑셀 파일을 파싱할 수 없습니다. 데이터가 비어있습니다.');
    }

    const columns = Object.keys(rawData[0]);

    return {
      name: file.name,
      encoding: 'XLSX',
      rows: rawData.length,
      columns,
      rawData,
      sampleRows: rawData.slice(0, 5),
    };
  } catch (e) {
    if (e instanceof Error && e.message.includes('파싱')) throw e;
    throw new Error('엑셀 파일을 읽을 수 없습니다. 파일이 손상되었을 수 있습니다.');
  }
}

export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 50MB를 초과합니다.');
  }

  const ext = file.name.toLowerCase().split('.').pop();

  if (ext === 'csv' || ext === 'txt') {
    return parseCSV(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseXLSX(file);
  } else {
    throw new Error('지원하지 않는 파일 형식입니다. CSV 또는 XLSX 파일을 업로드해주세요.');
  }
}
