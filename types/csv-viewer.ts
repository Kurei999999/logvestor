export interface CSVRecord {
  id: string;
  rowData: Record<string, any>;
  metadata: {
    fileName: string;
    importedAt: string;
    rowNumber: number;
  };
}

export interface CSVDocument {
  id: string;
  name: string;
  headers: string[];
  records: CSVRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CSVColumn {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'auto';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface CSVViewerConfig {
  id: string;
  documentId: string;
  columns: CSVColumn[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  pageSize: number;
  currentPage: number;
}

export interface CSVViewerState {
  documents: CSVDocument[];
  currentDocument: CSVDocument | null;
  config: CSVViewerConfig | null;
  loading: boolean;
  error: string | null;
}

export interface CSVUploadResult {
  success: boolean;
  document?: CSVDocument;
  errors?: string[];
}

export interface CSVEditAction {
  type: 'update_cell' | 'add_row' | 'delete_row' | 'add_column' | 'delete_column';
  recordId?: string;
  columnId?: string;
  value?: any;
  oldValue?: any;
  position?: number;
}

export interface CSVExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeHeaders: boolean;
  selectedRows?: string[];
  selectedColumns?: string[];
}