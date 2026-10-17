import { DiskNode, StorageCategory } from '../types/disk';
import { evaluatePathSafety } from './safetyRules';

/**
 * Categorize a file based on extension and name
 */
export function categorizeFile(name: string): StorageCategory {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (['mp4', 'mov', 'mkv', 'avi', 'webm', 'wmv', 'flv'].includes(ext)) return 'media';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'media';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'raw', 'psd'].includes(ext)) return 'media';
  if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'iso', 'dmg', 'pkg', 'msi'].includes(ext)) return 'archives';
  if (['log', 'dmp', 'crash', 'audit', 'err', 'out'].includes(ext)) return 'logs';
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'json', 'yaml', 'toml', 'lock'].includes(ext)) return 'developer';
  if (['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'csv'].includes(ext)) return 'documents';
  if (['cache', 'tmp', 'temp'].includes(ext) || name.includes('cache') || name.includes('temp')) return 'caches';

  return 'other';
}

/**
 * Scan a real local directory using the browser's File System Access API
 */
export async function scanLocalDirectory(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (count: number, currentPath: string) => void,
  maxDepth = 6
): Promise<DiskNode> {
  let fileCountTotal = 0;

  async function walk(
    handle: FileSystemDirectoryHandle,
    currentPath: string,
    depth: number
  ): Promise<DiskNode> {
    const children: DiskNode[] = [];
    let dirSize = 0;
    let localFileCount = 0;
    let localDirCount = 0;

    for await (const entry of (handle as any).values()) {
      const entryPath = `${currentPath}/${entry.name}`;

      if (entry.kind === 'file') {
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          const fileSize = file.size;
          dirSize += fileSize;
          localFileCount++;
          fileCountTotal++;

          if (fileCountTotal % 20 === 0 && onProgress) {
            onProgress(fileCountTotal, entryPath);
          }

          const cat = categorizeFile(entry.name);
          const safety = evaluatePathSafety(entryPath, entry.name);

          children.push({
            id: `local-f-${Math.random().toString(36).substring(2, 9)}`,
            name: entry.name,
            path: entryPath,
            size: fileSize,
            isDirectory: false,
            category: cat,
            safetyRating: safety.rating,
            safetyReason: safety.reason,
            lastModified: new Date(file.lastModified).toISOString().split('T')[0],
            extension: entry.name.split('.').pop()?.toLowerCase(),
          });
        } catch {
          // File might be locked by another process
        }
      } else if (entry.kind === 'directory') {
        localDirCount++;
        if (depth < maxDepth) {
          try {
            const subNode = await walk(entry as FileSystemDirectoryHandle, entryPath, depth + 1);
            dirSize += subNode.size;
            localFileCount += subNode.fileCount || 0;
            localDirCount += subNode.dirCount || 0;
            children.push(subNode);
          } catch {
            // Permission or read error
          }
        }
      }
    }

    // Sort children by size descending (Key Guideline 1: sorted by size, largest to smallest)
    children.sort((a, b) => b.size - a.size);

    const safety = evaluatePathSafety(currentPath, handle.name);

    return {
      id: `local-d-${Math.random().toString(36).substring(2, 9)}`,
      name: handle.name,
      path: currentPath,
      size: dirSize,
      isDirectory: true,
      children,
      fileCount: localFileCount,
      dirCount: localDirCount,
      category: 'documents',
      safetyRating: safety.rating,
      safetyReason: safety.reason,
    };
  }

  const root = await walk(dirHandle, dirHandle.name, 1);
  return root;
}
