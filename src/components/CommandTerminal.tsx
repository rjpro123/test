import React, { useState } from 'react';
import {
  Terminal as TerminalIcon,
  Copy,
  Check,
  Download,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DiskNode, OperatingSystem } from '../types/disk';
import { formatBytes } from '../utils/formatters';

interface CommandTerminalProps {
  os: OperatingSystem;
  selectedNodes: DiskNode[];
  onClearSelection: () => void;
  onAskAi: (prompt: string) => void;
}

export const CommandTerminal: React.FC<CommandTerminalProps> = ({
  os,
  selectedNodes,
  onClearSelection,
  onAskAi,
}) => {
  const [shell, setShell] = useState<'powershell' | 'cmd' | 'bash'>(
    os === 'windows' ? 'powershell' : 'bash'
  );
  const [isDryRun, setIsDryRun] = useState<boolean>(true);
  const [useRecycleBin, setUseRecycleBin] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedQuickScript, setSelectedQuickScript] = useState<string | null>(null);

  // Total selected size
  const totalSelectedBytes = selectedNodes.reduce((sum, n) => sum + n.size, 0);

  // Build the script content
  function generateScript(): string {
    if (selectedQuickScript) {
      return getQuickScriptContent(selectedQuickScript, shell, isDryRun);
    }

    if (selectedNodes.length === 0) {
      return getTemplateScript(os, shell, isDryRun);
    }

    if (shell === 'powershell') {
      let script = `# =====================================================================\n`;
      script += `# DiskSize AI - Safe Storage Cleanup Script (PowerShell)\n`;
      script += `# Generated for: Windows (${selectedNodes.length} items selected)\n`;
      script += `# Estimated Space Reclaimed: ${formatBytes(totalSelectedBytes)}\n`;
      script += `# Safety Mode: ${isDryRun ? 'DRY-RUN (-WhatIf enabled, preview only)' : 'LIVE EXECUTION'}\n`;
      script += `# =====================================================================\n\n`;

      if (isDryRun) {
        script += `Write-Host ">>> Starting DiskSize AI Cleanup Preview (-WhatIf)..." -ForegroundColor Cyan\n\n`;
      } else {
        script += `Write-Host ">>> Starting DiskSize AI Safe Cleanup..." -ForegroundColor Yellow\n\n`;
      }

      for (const node of selectedNodes) {
        if (node.safetyRating === 'system-critical') {
          script += `# SKIPPED PROTECTED SYSTEM ITEM: ${node.path}\n`;
          script += `# Never delete core Windows files. Use official DISM or Disk Cleanup.\n\n`;
          continue;
        }

        const escapedPath = node.path.replace(/"/g, '`"');

        if (node.name.toLowerCase() === 'node_modules') {
          script += `# Target: Developer dependencies (${formatBytes(node.size)})\n`;
          script += `if (Test-Path "${escapedPath}") {\n`;
          script += `    Write-Host "Cleaning: ${escapedPath}" -ForegroundColor Gray\n`;
          script += `    Remove-Item -Path "${escapedPath}" -Recurse -Force${isDryRun ? ' -WhatIf' : ''}\n`;
          script += `}\n\n`;
        } else if (/winsxs/i.test(node.path)) {
          script += `# Target: WinSxS Component Store Safe Servicing\n`;
          if (isDryRun) {
            script += `Dism.exe /Online /Cleanup-Image /AnalyzeComponentStore\n\n`;
          } else {
            script += `Dism.exe /Online /Cleanup-Image /StartComponentCleanup\n\n`;
          }
        } else {
          script += `# Target: ${node.name} (${formatBytes(node.size)})\n`;
          script += `if (Test-Path "${escapedPath}") {\n`;
          if (useRecycleBin && !isDryRun) {
            script += `    # Safely send to Windows Recycle Bin\n`;
            script += `    Add-Type -AssemblyName Microsoft.VisualBasic\n`;
            script += `    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory("${escapedPath}", 'OnlyErrorDialogs', 'SendToRecycleBin')\n`;
          } else {
            script += `    Remove-Item -Path "${escapedPath}" -Recurse -Force${isDryRun ? ' -WhatIf' : ''}\n`;
          }
          script += `}\n\n`;
        }
      }

      script += `Write-Host ">>> Cleanup operations complete." -ForegroundColor Green\n`;
      return script;
    }

    if (shell === 'cmd') {
      let script = `:: =====================================================================\n`;
      script += `:: DiskSize AI - Storage Cleanup Batch Script (Windows CMD)\n`;
      script += `:: Estimated Space Reclaimed: ${formatBytes(totalSelectedBytes)}\n`;
      script += `:: Mode: ${isDryRun ? 'DRY RUN (Preview Only)' : 'LIVE EXECUTION'}\n`;
      script += `:: =====================================================================\n@echo off\n\n`;

      for (const node of selectedNodes) {
        if (node.safetyRating === 'system-critical') {
          script += `:: SKIPPED: ${node.path} is a protected system item\n\n`;
          continue;
        }
        if (isDryRun) {
          script += `echo [DRY-RUN] Would remove: "${node.path}"\n`;
        } else {
          if (node.isDirectory) {
            script += `if exist "${node.path}" (\n    echo Removing: "${node.path}"\n    rd /s /q "${node.path}"\n)\n\n`;
          } else {
            script += `if exist "${node.path}" (\n    del /f /q "${node.path}"\n)\n\n`;
          }
        }
      }
      script += `echo Finished.\npause\n`;
      return script;
    }

    // Bash / Zsh for macOS / Linux
    let script = `#!/usr/bin/env bash\n`;
    script += `# =====================================================================\n`;
    script += `# DiskSize AI - Storage Cleanup Script (macOS / Linux)\n`;
    script += `# Estimated Space Reclaimed: ${formatBytes(totalSelectedBytes)}\n`;
    script += `# Safety Mode: ${isDryRun ? 'DRY-RUN (Simulated, no deletions)' : 'LIVE'}\n`;
    script += `# =====================================================================\n\n`;
    script += `set -euo pipefail\n\n`;

    for (const node of selectedNodes) {
      if (node.safetyRating === 'system-critical') {
        script += `# SKIPPED PROTECTED OS CORE: ${node.path}\n\n`;
        continue;
      }
      if (isDryRun) {
        script += `echo "[DRY RUN] Would delete: ${node.path} (${formatBytes(node.size)})"\n`;
      } else {
        script += `if [ -e "${node.path}" ]; then\n`;
        script += `  echo "Removing ${node.path}..."\n`;
        script += `  rm -rf "${node.path}"\n`;
        script += `fi\n\n`;
      }
    }

    script += `echo "All requested cleanups finished safely."\n`;
    return script;
  }

  function getTemplateScript(osName: string, sh: string, dry: boolean): string {
    if (sh === 'powershell') {
      return `# No individual items selected yet.\n# Select items in the 'Directory Explorer' tab or pick a preset utility below:\n\n# 1. Clean Windows User Temp folder safely:\nGet-ChildItem -Path "$env:TEMP\\*" -Recurse -Force${dry ? ' -WhatIf' : ''} | Remove-Item -Recurse -Force${dry ? ' -WhatIf' : ''}\n\n# 2. Clean npm and yarn caches:\nnpm cache clean --force\nyarn cache clean\n\n# 3. Clean Docker dangling images & build cache:\ndocker system prune -f\n`;
    }
    return `#!/usr/bin/env bash\n# No individual items selected yet.\n# Select items in the 'Directory Explorer' tab or pick a preset utility below:\n\n# 1. Clear user cache:\n${dry ? 'echo "Dry run: rm -rf ~/.cache/*"' : 'rm -rf ~/.cache/*'}\n\n# 2. Prune Docker:\ndocker system prune\n`;
  }

  function getQuickScriptContent(type: string, sh: string, dry: boolean): string {
    switch (type) {
      case 'npm-caches':
        return sh === 'powershell'
          ? `# Safe cleanup of JavaScript / Node package caches\nWrite-Host "Cleaning npm cache..." -ForegroundColor Cyan\nnpm cache clean --force\n\nWrite-Host "Cleaning pnpm store..." -ForegroundColor Cyan\npnpm store prune\n\nWrite-Host "Done!" -ForegroundColor Green\n`
          : `# Safe cleanup of JavaScript / Node package caches\necho "Cleaning npm cache..."\nnpm cache clean --force\n\necho "Cleaning yarn cache..."\nyarn cache clean 2>/dev/null || true\n\necho "Cleaning pnpm store..."\npnpm store prune 2>/dev/null || true\n`;

      case 'winsxs-dism':
        return `# Safe Windows Component Store (WinSxS) Servicing\n# Requires PowerShell as Administrator\n\n# 1. Analyze Component Store:\nDism.exe /Online /Cleanup-Image /AnalyzeComponentStore\n\n# 2. Safely remove superseded updates:\nDism.exe /Online /Cleanup-Image /StartComponentCleanup\n`;

      case 'docker-deep':
        return `# Safe Docker Storage Pruning\n# Check usage first:\ndocker system df\n\n# Deep cleanup of stopped containers, unused networks, and build caches:\ndocker system prune -a --volumes${dry ? ' --dry-run' : ''}\n`;

      case 'xcode-clean':
        return `#!/usr/bin/env bash\n# macOS Xcode Storage Deep Clean\necho "Purging DerivedData..."\nrm -rf ~/Library/Developer/Xcode/DerivedData/*\n\necho "Erasing inactive simulator runtimes..."\nxcrun simctl erase all\n\necho "Removing old device support caches..."\nrm -rf ~/Library/Developer/Xcode/iOS\\ DeviceSupport/*\n\necho "Xcode clean complete!"\n`;

      case 'journalctl':
        return `#!/usr/bin/env bash\n# Linux systemd Journal Log Vacuum\n# Reduce journal log consumption to 500 MB max:\nsudo journalctl --vacuum-size=500M\n\n# Clean apt package archive cache:\nsudo apt-get clean\n`;

      default:
        return '';
    }
  }

  const scriptOutput = generateScript();

  function handleCopy() {
    navigator.clipboard.writeText(scriptOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const ext = shell === 'powershell' ? 'ps1' : shell === 'cmd' ? 'bat' : 'sh';
    const blob = new Blob([scriptOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disksize-cleanup-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6">
      {/* Top Banner & Options */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Actionable Cleanup Hub</span>
            <span aria-hidden="true">·</span>
            <span>Key Guideline 4: Exact executable commands</span>
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TerminalIcon className="w-5 h-5 text-cyan-400" />
            <span>Storage Cleanup Script Generator</span>
          </h2>
        </div>

        {/* Shell Switcher & Mode Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shell choice */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setShell('powershell');
                setSelectedQuickScript(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                shell === 'powershell'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PowerShell
            </button>
            <button
              onClick={() => {
                setShell('cmd');
                setSelectedQuickScript(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                shell === 'cmd'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CMD (.bat)
            </button>
            <button
              onClick={() => {
                setShell('bash');
                setSelectedQuickScript(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                shell === 'bash'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Terminal (Bash/Zsh)
            </button>
          </div>

          {/* Dry Run Toggle */}
          <button
            onClick={() => setIsDryRun(!isDryRun)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
              isDryRun
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isDryRun ? 'Dry-Run Mode (Safe -WhatIf)' : 'Live Delete Mode'}</span>
          </button>
        </div>
      </div>

      {/* Quick Utility Presets Strip */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
        <span className="text-xs text-slate-400 font-medium mr-1">Quick Presets:</span>
        <button
          onClick={() => setSelectedQuickScript('npm-caches')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            selectedQuickScript === 'npm-caches'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          npm / yarn / pnpm cache clean
        </button>
        <button
          onClick={() => setSelectedQuickScript('winsxs-dism')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            selectedQuickScript === 'winsxs-dism'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          Windows DISM WinSxS Cleanup
        </button>
        <button
          onClick={() => setSelectedQuickScript('docker-deep')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            selectedQuickScript === 'docker-deep'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          Docker System Prune
        </button>
        <button
          onClick={() => setSelectedQuickScript('xcode-clean')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            selectedQuickScript === 'xcode-clean'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          macOS Xcode &amp; Simulators
        </button>
        <button
          onClick={() => setSelectedQuickScript('journalctl')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            selectedQuickScript === 'journalctl'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          Linux journalctl &amp; apt clean
        </button>
      </div>

      {/* Selected Items Summary Bar */}
      {selectedNodes.length > 0 && (
        <div className="flex items-center justify-between p-3 mb-4 bg-cyan-950/20 border border-cyan-500/30 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-cyan-300">
              {selectedNodes.length} items targeted for cleanup
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-white font-bold tabular-nums">
              Estimated Space Reclaimable: {formatBytes(totalSelectedBytes)}
            </span>
          </div>
          <button
            onClick={onClearSelection}
            className="text-slate-400 hover:text-white underline font-medium"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Terminal Script Code Viewer */}
      <div className="flex-1 flex flex-col rounded-lg border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-slate-400 text-[11px] ml-2">
              {shell === 'powershell'
                ? 'cleanup.ps1 (PowerShell)'
                : shell === 'cmd'
                ? 'cleanup.bat (Windows CMD)'
                : 'cleanup.sh (Bash / Zsh)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors text-[11px]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Command</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded transition-colors text-[11px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Script</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-4 overflow-y-auto text-slate-300 leading-relaxed font-mono whitespace-pre-wrap select-text">
          {scriptOutput}
        </div>
      </div>

      {/* Safety Notice Footer */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          Safety Protocol Enforced: Core OS components (System32, /System, pagefile.sys) are automatically shielded and omitted from script generation.
        </span>
      </div>
    </div>
  );
};
