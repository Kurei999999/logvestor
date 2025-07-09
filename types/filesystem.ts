export interface FileSystemConfiguration {
  useFileSystemAPI: boolean;
  rootDirectoryName: string;
  enableFileWatching: boolean;
  enableAutomaticBackups: boolean;
  backupInterval: number;
  compressionLevel: number;
}

export interface FileSystemPermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  createDirectory: boolean;
}

export interface FileSystemCapabilities {
  fileSystemAccess: boolean;
  fileWatching: boolean;
  directoryPicker: boolean;
  nativeFileDialogs: boolean;
  backgroundSync: boolean;
}

export interface FileSystemStatus {
  isInitialized: boolean;
  hasDirectoryAccess: boolean;
  rootPath: string | null;
  capabilities: FileSystemCapabilities;
  permissions: FileSystemPermissions;
  lastError: string | null;
}