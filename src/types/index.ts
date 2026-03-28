export interface UnifiedRecord {
  order_id: string;
  order_date: string;
  product_name: string;
  option?: string;
  quantity: number;
  sales_amount: number;
  payment_amount: number;
  discount: number;
  shipping_fee: number;
  commission: number;
  settlement: number;
  platform: 'coupang' | 'naver' | 'gmarket';
  category?: string;
  status?: string;
}

export interface ColumnMapping {
  source: string;
  target: string;
  confidence: number;
}

export interface CacheEntry {
  platform: string;
  mapping: ColumnMapping[];
  confirmedAt: string;
  useCount: number;
}

export interface MappingCache {
  [fingerprint: string]: CacheEntry;
}

export interface InsightPayload {
  platforms: string[];
  dateRange: { from: string; to: string };
  perPlatform: {
    platform: string;
    totalRevenue: number;
    totalCommission: number;
    commissionRate: number;
    orderCount: number;
    avgOrderValue: number;
  }[];
  topProducts: { name: string; revenue: number; commission: number; margin: number }[];
  totalRecords: number;
}

export interface SankeyNode {
  name: string;
  category?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export type AppPhase =
  | 'IDLE'
  | 'FILE_ATTACHED'
  | 'PARSING'
  | 'FINGERPRINTING'
  | 'MAPPING'
  | 'CACHE_HIT'
  | 'CONFIRMING'
  | 'TRANSFORMING'
  | 'DASHBOARD';

export type MessageType =
  | 'text'
  | 'file'
  | 'step'
  | 'mapping'
  | 'templates'
  | 'action'
  | 'insight'
  | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  type: MessageType;
  content: string;
  timestamp: number;
  data?: {
    files?: ParsedFile[];
    mappings?: ColumnMapping[];
    templates?: string[];
    insightItems?: string[];
    stepNumber?: number;
    totalSteps?: number;
    confidence?: number;
  };
}

export interface ParsedFile {
  name: string;
  encoding: string;
  rows: number;
  columns: string[];
  rawData: Record<string, unknown>[];
  sampleRows: Record<string, unknown>[];
}

export interface AppState {
  phase: AppPhase;
  messages: ChatMessage[];
  files: ParsedFile[];
  records: UnifiedRecord[];
  mappings: ColumnMapping[];
  currentFingerprint: string | null;
  selectedTemplates: string[];
  activeTab: number;
  isStreaming: boolean;
  isPreview: boolean;
}

export type AppAction =
  | { type: 'SET_PHASE'; phase: AppPhase }
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; id: string; content: string }
  | { type: 'ADD_FILES'; files: ParsedFile[] }
  | { type: 'SET_RECORDS'; records: UnifiedRecord[] }
  | { type: 'ADD_RECORDS'; records: UnifiedRecord[] }
  | { type: 'SET_MAPPINGS'; mappings: ColumnMapping[] }
  | { type: 'SET_FINGERPRINT'; fingerprint: string }
  | { type: 'SET_TEMPLATES'; templates: string[] }
  | { type: 'SET_ACTIVE_TAB'; tab: number }
  | { type: 'SET_STREAMING'; streaming: boolean }
  | { type: 'SET_PREVIEW'; preview: boolean }
  | { type: 'RESET' };
