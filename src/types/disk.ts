export type SafetyRating = 'safe' | 'caution' | 'system-critical';

export type StorageCategory =
  | 'system'
  | 'developer'
  | 'caches'
  | 'media'
  | 'archives'
  | 'documents'
  | 'games'
  | 'logs'
  | 'other';

export type OperatingSystem = 'windows' | 'macos' | 'linux';

export interface DiskNode {
  id: string;
  name: string;
  path: string;
  size: number; // in bytes
  isDirectory: boolean;
  children?: DiskNode[];
  fileCount?: number;
  dirCount?: number;
  category: StorageCategory;
  safetyRating: SafetyRating;
  safetyReason?: string;
  lastModified?: string;
  extension?: string;
  recommendedAction?: 'clean' | 'review' | 'protect';
  suggestedCommand?: {
    powershell?: string;
    cmd?: string;
    bash?: string;
  };
}

export interface DriveMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  safeReclaimableBytes: number;
  cautionReclaimableBytes: number;
  criticalProtectedBytes: number;
  totalFiles: number;
  totalDirectories: number;
}

export interface CleanupTarget {
  id: string;
  path: string;
  size: number;
  category: StorageCategory;
  safetyRating: SafetyRating;
  reason: string;
  command: {
    powershell: string;
    cmd?: string;
    bash: string;
  };
}
