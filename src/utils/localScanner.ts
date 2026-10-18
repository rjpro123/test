import { DiskNode, StorageCategory } from '../types/disk';
import { evaluatePathSafety } from './safetyRules';

/**
 * Categorize a file based on extension and name
 */
export function categorizeFile(name: string): StorageCategory {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (['mp4', 'mov', 'mkv', 'avi', 'webm', 'wmv', 'flv'].includes(ext)) return 'media';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'media';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'raw', 'psd', 'ico'].includes(ext)) return 'media';
  if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'iso', 'dmg', 'pkg', 'msi', 'cab'].includes(ext)) return 'archives';
  if (['log', 'dmp', 'crash', 'audit', 'err', 'out'].includes(ext)) return 'logs';
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'cs', 'json', 'yaml', 'toml', 'xml'].includes(ext)) return 'developer';
  if (['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'csv', 'rtf'].includes(ext)) return 'documents';
  if (['cache', 'tmp', 'temp'].includes(ext) || name.includes('cache') || name.includes('temp')) return 'caches';

  return 'other';
}

/**
 * Scan a real local directory using the browser's File System Access API (showDirectoryPicker)
 */
export async function scanLocalDirectory(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (count: number, currentPath: string) => void,
  maxDepth = 8
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
      const entryPath = `${currentPath}\\${entry.name}`;

      if (entry.kind === 'file') {
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          const fileSize = file.size;
          dirSize += fileSize;
          localFileCount++;
          fileCountTotal++;

          if (fileCountTotal % 25 === 0 && onProgress) {
            onProgress(fileCountTotal, entryPath);
          }

          const cat = categorizeFile(entry.name);
          const safety = evaluatePathSafety(entryPath, entry.name);

          children.push({
            id: `f-${Math.random().toString(36).substring(2, 9)}`,
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
            // Permission or lock error
          }
        }
      }
    }

    // Sort children by size descending (largest to smallest)
    children.sort((a, b) => b.size - a.size);

    const safety = evaluatePathSafety(currentPath, handle.name);

    return {
      id: `d-${Math.random().toString(36).substring(2, 9)}`,
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

/**
 * Scan real files selected via HTML5 <input type="file" webkitdirectory /> or Drag & Drop
 */
export function scanFileList(files: FileList | File[], rootName = 'Scanned Folder'): DiskNode {
  interface TempNode {
    name: string;
    path: string;
    size: number;
    isDirectory: boolean;
    children?: Map<string, TempNode>;
    fileCount: number;
    lastModified?: string;
    extension?: string;
  }

  const rootTemp: TempNode = {
    name: rootName,
    path: rootName,
    size: 0,
    isDirectory: true,
    children: new Map(),
    fileCount: 0,
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.replace(/\//g, '\\').split('\\');

    let current = rootTemp;
    let currentPathAccum = rootName;

    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      const isLast = p === parts.length - 1;
      currentPathAccum += `\\${part}`;

      if (isLast) {
        // It's a file
        current.children!.set(part, {
          name: part,
          path: currentPathAccum,
          size: file.size,
          isDirectory: false,
          fileCount: 1,
          lastModified: new Date(file.lastModified).toISOString().split('T')[0],
          extension: part.split('.').pop()?.toLowerCase(),
        });
        current.size += file.size;
        current.fileCount += 1;
      } else {
        // Directory
        if (!current.children!.has(part)) {
          current.children!.set(part, {
            name: part,
            path: currentPathAccum,
            size: 0,
            isDirectory: true,
            children: new Map(),
            fileCount: 0,
          });
        }
        const nextNode = current.children!.get(part)!;
        nextNode.size += file.size;
        nextNode.fileCount += 1;
        current = nextNode;
      }
    }
  }

  // Convert TempNode to DiskNode recursively
  function convert(node: TempNode): DiskNode {
    const childrenList: DiskNode[] = [];
    if (node.children) {
      for (const [, child] of node.children.entries()) {
        childrenList.push(convert(child));
      }
    }

    childrenList.sort((a, b) => b.size - a.size);
    const cat = categorizeFile(node.name);
    const safety = evaluatePathSafety(node.path, node.name);

    return {
      id: `real-${Math.random().toString(36).substring(2, 9)}`,
      name: node.name,
      path: node.path,
      size: node.size,
      isDirectory: node.isDirectory,
      children: childrenList.length > 0 ? childrenList : undefined,
      fileCount: node.fileCount,
      category: cat,
      safetyRating: safety.rating,
      safetyReason: safety.reason,
      lastModified: node.lastModified,
      extension: node.extension,
    };
  }

  return convert(rootTemp);
}

/**
 * Parses real output from Windows `dir /s` or PowerShell `Get-ChildItem -Recurse`
 */
export function parseWindowsDirOutput(text: string): DiskNode | null {
  const lines = text.split('\n');
  const files: { path: string; size: number; name: string }[] = [];

  let currentDir = 'C:\\';

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Match "Directory of C:\path..."
    const dirMatch = line.match(/^Directory of\s+(.+)$/i);
    if (dirMatch) {
      currentDir = dirMatch[1].trim();
      continue;
    }

    // Match Windows dir line: "10/14/2026  03:15 PM     1,428,500 filename.ext"
    const fileMatch = line.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}\s+[\d:]+\s+[AP]M\s+([\d,]+)\s+(.+)$/i);
    if (fileMatch) {
      const sizeStr = fileMatch[1].replace(/,/g, '');
      const size = parseInt(sizeStr, 10);
      const name = fileMatch[2].trim();

      if (!isNaN(size) && name && name !== '.' && name !== '..') {
        files.push({
          path: `${currentDir}\\${name}`,
          size,
          name,
        });
      }
    }
  }

  if (files.length === 0) return null;

  // Build tree from parsed real files
  const root: DiskNode = {
    id: 'parsed-root',
    name: currentDir,
    path: currentDir,
    size: files.reduce((s, f) => s + f.size, 0),
    isDirectory: true,
    fileCount: files.length,
    category: 'documents',
    safetyRating: 'caution',
    children: files.map((f) => {
      const cat = categorizeFile(f.name);
      const safety = evaluatePathSafety(f.path, f.name);
      return {
        id: `pf-${Math.random().toString(36).substring(2, 9)}`,
        name: f.name,
        path: f.path,
        size: f.size,
        isDirectory: false,
        category: cat,
        safetyRating: safety.rating,
        safetyReason: safety.reason,
      };
    }),
  };

  root.children!.sort((a, b) => b.size - a.size);
  return root;
}
