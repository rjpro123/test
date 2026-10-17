import { DiskNode, SafetyRating } from '../types/disk';

/**
 * List of critical system path patterns that must NEVER be deleted.
 * Key Guideline 3: NEVER advise users to delete critical OS system files.
 */
export const CRITICAL_PROTECTED_PATTERNS = [
  /system32/i,
  /syswow64/i,
  /winerror/i,
  /bootmgr/i,
  /pagefile\.sys/i,
  /hiberfil\.sys/i,
  /swapfile\.sys/i,
  /c:\\windows\\registry/i,
  /^\/system/i,
  /^\/usr\/bin/i,
  /^\/usr\/sbin/i,
  /^\/sbin/i,
  /^\/etc/i,
  /^\/boot/i,
  /^\/dev/i,
  /^\/proc/i,
  /^\/sys/i,
  /^\/bin/i,
  /^\/library\/kernel/i,
  /^\/system\/library\/extensions/i,
];

/**
 * Common known safe cache and bloat directories
 */
export const SAFE_CLEANUP_PATTERNS = [
  /node_modules/i,
  /\\appdata\\local\\temp/i,
  /\/tmp/i,
  /\\windows\\temp/i,
  /\.cache/i,
  /deriveddata/i,
  /crashdumps/i,
  /softwaredistribution\\download/i,
  /discord\\cache/i,
  /spotify\\data/i,
  /slack\\cache/i,
  /chrome\\user data\\default\\cache/i,
  /var\/log.*\.gz/i,
  /apt\/archives/i,
  /\.gradle\/caches/i,
  /\.m2\/repository/i,
  /target\/debug/i,
  /target\/release/i,
  /yarn\\cache/i,
  /npm-cache/i,
  /pip\\cache/i,
  /homebrew\/caches/i,
  /library\/caches/i,
];

/**
 * Evaluates the safety rating of a given file or directory path
 */
export function evaluatePathSafety(path: string, name: string): { rating: SafetyRating; reason: string } {
  const normalized = path.replace(/\//g, '\\');

  // Check critical OS protected items first
  for (const pattern of CRITICAL_PROTECTED_PATTERNS) {
    if (pattern.test(path) || pattern.test(normalized) || pattern.test(name)) {
      return {
        rating: 'system-critical',
        reason: 'Protected Operating System component. Deletion will cause boot failure or system crash.',
      };
    }
  }

  // Check special cases like WinSxS
  if (/winsxs/i.test(path)) {
    return {
      rating: 'system-critical',
      reason: 'Windows Component Store. Do NOT manually delete. Clean only using DISM.exe /Online /Cleanup-Image.',
    };
  }

  // Check known safe patterns
  for (const pattern of SAFE_CLEANUP_PATTERNS) {
    if (pattern.test(path) || pattern.test(normalized) || pattern.test(name)) {
      return {
        rating: 'safe',
        reason: 'Temporary cache or generated build artifacts. Safe to clean without affecting installed programs.',
      };
    }
  }

  // Default caution for user directories or other unknown paths
  return {
    rating: 'caution',
    reason: 'Contains user files, game libraries, or configuration. Review items before removing.',
  };
}

/**
 * Generates exact safe cleanup commands with dry-run support
 * Key Guideline 4: Actionable Commands with exact PowerShell/Cmd/Bash syntax
 */
export function generateCleanupCommand(node: DiskNode, os: 'windows' | 'macos' | 'linux', dryRun: boolean = true) {
  const p = node.path;
  const name = node.name;

  if (node.safetyRating === 'system-critical') {
    return {
      shell: os === 'windows' ? 'PowerShell' : 'Terminal (Bash)',
      command: `# PROTECTED: Cannot delete ${p}\n# This file/directory is a critical system component.`,
      warning: 'Protected OS item. Deleting will break the operating system.',
      isSafe: false,
    };
  }

  // Specific smart handling for WinSxS
  if (/winsxs/i.test(p)) {
    return {
      shell: 'PowerShell (Admin)',
      command: dryRun
        ? `# Analyze reclaimable space in WinSxS:\nDism.exe /Online /Cleanup-Image /AnalyzeComponentStore`
        : `# Safely clean superseded Windows components:\nDism.exe /Online /Cleanup-Image /StartComponentCleanup`,
      warning: 'Never manually delete files in WinSxS. Only use the DISM utility shown above.',
      isSafe: true,
    };
  }

  // Specific smart handling for node_modules
  if (name.toLowerCase() === 'node_modules') {
    if (os === 'windows') {
      return {
        shell: 'PowerShell',
        command: dryRun
          ? `Remove-Item -Path "${p}" -Recurse -Force -WhatIf`
          : `Remove-Item -Path "${p}" -Recurse -Force`,
        warning: 'Deletes node_modules. Run npm install or pnpm install to regenerate.',
        isSafe: true,
      };
    } else {
      return {
        shell: 'Terminal (Bash)',
        command: dryRun
          ? `echo "Dry run: would remove ${p}"`
          : `rm -rf "${p}"`,
        warning: 'Deletes node_modules. Run npm install or pnpm install to regenerate.',
        isSafe: true,
      };
    }
  }

  // Specific smart handling for Docker
  if (/docker/i.test(p)) {
    return {
      shell: os === 'windows' ? 'PowerShell' : 'Terminal (Bash)',
      command: dryRun
        ? `docker system df`
        : `docker system prune -a --volumes`,
      warning: 'Removes unused containers, networks, images, and volumes.',
      isSafe: true,
    };
  }

  // General safe directory command
  if (os === 'windows') {
    const isDir = node.isDirectory;
    if (dryRun) {
      return {
        shell: 'PowerShell',
        command: isDir
          ? `Remove-Item -Path "${p}\\*" -Recurse -Force -WhatIf`
          : `Remove-Item -Path "${p}" -Force -WhatIf`,
        warning: 'Dry-run preview mode (-WhatIf). No files will be modified yet.',
        isSafe: true,
      };
    } else {
      return {
        shell: 'PowerShell',
        command: isDir
          ? `Remove-Item -Path "${p}\\*" -Recurse -Force`
          : `Remove-Item -Path "${p}" -Force`,
        warning: 'Permanently removes selected items.',
        isSafe: true,
      };
    }
  } else {
    const isDir = node.isDirectory;
    if (dryRun) {
      return {
        shell: 'Terminal (Bash)',
        command: `echo "DRY RUN: would remove ${p}"`,
        warning: 'Dry-run preview. No files will be modified.',
        isSafe: true,
      };
    } else {
      return {
        shell: 'Terminal (Bash)',
        command: isDir ? `rm -rf "${p}"/*` : `rm -f "${p}"`,
        warning: 'Permanently removes selected files.',
        isSafe: true,
      };
    }
  }
}
