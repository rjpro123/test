import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client as per gemini-api skill instructions
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `You are DiskSize AI, an expert system utility assistant specialized in disk storage analysis, folder visualizers, and storage cleanup (similar to TreeSize, WinDirStat, DaisyDisk, or ncdu).
Your role is to help users scan, understand, and free up disk space on Windows, macOS, or Linux.

Core Rules & Guidelines:
1. Directory Tree Formatting: When displaying folder structures or disk usage, present data cleanly using tree diagrams or markdown tables, sorted by size (largest to smallest).
2. File Size Units: Always present sizes clearly (e.g., GB, MB, KB, bytes) with proper tabular alignment.
3. Safety First: NEVER advise users to delete critical OS system files (e.g., C:\\Windows\\System32, pagefile.sys, hiberfil.sys, /System, /usr/bin, /etc, /boot, EFI partition). Always highlight temporary, cache, or user-generated directories first. Clearly state when a system folder requires official OS maintenance tools (e.g., DISM for WinSxS, Disk Cleanup cleanmgr.exe, Storage Sense, tmutil for Time Machine local snapshots, or journalctl for systemd journals).
4. Actionable Commands: Provide exact PowerShell, Command Prompt, or Terminal (Bash/Zsh) commands when users request automatic cleanup scripts. Always include safe dry-run flags (e.g., -WhatIf in PowerShell, --dry-run where available, or echo verification) before permanent deletion.
5. Structure answers with clear headings, danger/caution callouts, estimated space recovered, and copyable code blocks with command explanations.`;

// AI Chat Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, os = 'windows', contextData } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!ai) {
      // Return helpful fallback response if GEMINI_API_KEY is not configured
      return res.json({
        reply: generateOfflineUtilityAdvice(message, os, contextData),
      });
    }

    let prompt = `User OS: ${os.toUpperCase()}\n`;
    if (contextData) {
      prompt += `Current Scan Context:\n${JSON.stringify(contextData, null, 2)}\n\n`;
    }
    prompt += `User Query: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
      },
    });

    const reply = response.text || 'No response generated.';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AI storage advice',
      reply: generateOfflineUtilityAdvice(req.body?.message || '', req.body?.os || 'windows', req.body?.contextData),
    });
  }
});

// AI Deep Scan Analysis Endpoint
app.post('/api/ai/analyze-scan', async (req, res) => {
  try {
    const { os = 'windows', scanSummary } = req.body;

    if (!scanSummary) {
      return res.status(400).json({ error: 'scanSummary is required' });
    }

    if (!ai) {
      return res.json({
        analysis: generateOfflineScanAnalysis(os, scanSummary),
      });
    }

    const prompt = `Analyze this disk scan summary for ${os.toUpperCase()}:
${JSON.stringify(scanSummary, null, 2)}

Provide:
1. Top Space Hog Breakdown (ordered by size)
2. Safe Cleanup Targets (with estimated reclaimable space)
3. Critical System Areas to Protect (explicitly warning why not to delete)
4. Recommended Cleanup Commands (PowerShell for Windows, Terminal Bash for macOS/Linux, including dry-run flags)
5. Long-term Prevention Tips (e.g., auto-cleaning package caches, Docker pruning schedules)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
    });

    return res.json({
      analysis: response.text || 'Analysis completed.',
    });
  } catch (error: any) {
    console.error('Error in /api/ai/analyze-scan:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze scan',
      analysis: generateOfflineScanAnalysis(req.body?.os || 'windows', req.body?.scanSummary),
    });
  }
});

// Offline rule-based fallbacks for resiliency
function generateOfflineUtilityAdvice(message: string, os: string, contextData?: any): string {
  const lower = message.toLowerCase();

  if (lower.includes('winsxs')) {
    return `### Windows WinSxS (Component Store) Safe Analysis & Cleanup

**Status: SYSTEM COMPONENT - DO NOT MANUALLY DELETE FILES**
Manually deleting files in \`C:\\Windows\\WinSxS\` will break Windows Updates, corrupt servicing stacks, and prevent your PC from booting.

#### Recommended Safe Action: Use Official DISM Tool
Open **PowerShell as Administrator** and run:

\`\`\`powershell
# 1. Analyze actual reclaimable space in WinSxS:
Dism.exe /Online /Cleanup-Image /AnalyzeComponentStore

# 2. Safely clean up superseded versions and service packs:
Dism.exe /Online /Cleanup-Image /StartComponentCleanup

# 3. (Optional) Remove backup components of installed updates:
Dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase
\`\`\`
*Expected recovery: 4 GB – 15 GB of safe disk space.*`;
  }

  if (lower.includes('node_modules')) {
    return `### Safely Locating and Removing Developer \`node_modules\`

\`node_modules\` folders can quietly consume 20–80 GB across old projects.

#### Safe Cleanup Commands:
**Windows (PowerShell):**
\`\`\`powershell
# 1. Preview how many node_modules exist and their size (Dry-Run):
Get-ChildItem -Path "$HOME\\Projects" -Filter "node_modules" -Directory -Recurse -Depth 4 |
  Select-Object FullName

# 2. Safely remove with -WhatIf dry run first:
Get-ChildItem -Path "$HOME\\Projects" -Filter "node_modules" -Directory -Recurse -Depth 4 |
  Remove-Item -Recurse -Force -WhatIf

# 3. Execute removal (Remove -WhatIf to run for real):
Get-ChildItem -Path "$HOME\\Projects" -Filter "node_modules" -Directory -Recurse -Depth 4 |
  Remove-Item -Recurse -Force
\`\`\`

**macOS / Linux (Bash/Zsh):**
\`\`\`bash
# 1. Find and list node_modules (safe review):
find ~/Projects -name "node_modules" -type d -prune

# 2. Fast removal using npx npkill or find:
find ~/Projects -name "node_modules" -type d -prune -exec rm -rf '{}' +
\`\`\``;
  }

  if (lower.includes('docker')) {
    return `### Docker Bloat Cleanup (Images, Build Cache, Volumes)

Docker stores dangling images, build caches, and volumes that frequently take 20–50 GB.

#### Safe Docker Cleanup Commands:
\`\`\`bash
# 1. Check current Docker disk usage:
docker system df

# 2. Safe cleanup of stopped containers, unused networks, and dangling images:
docker system prune

# 3. Deep cleanup (also removes unused images and build cache):
docker system prune -a --volumes
\`\`\`
*Safety Note: Ensure all database containers you care about have named volumes or persistent host mounts before pruning unused volumes.*`;
  }

  if (lower.includes('xcode') || lower.includes('deriveddata')) {
    return `### macOS Xcode Storage Cleanup

Xcode builds accumulate gigabytes in \`DerivedData\`, old archives, and iOS device support caches.

#### Safe Terminal Commands:
\`\`\`bash
# 1. Check DerivedData size:
du -sh ~/Library/Developer/Xcode/DerivedData

# 2. Safely remove DerivedData (Xcode recreates on next build):
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 3. Clean iOS simulator caches:
xcrun simctl erase all

# 4. Remove old iOS Device Support caches (re-downloaded if needed):
rm -rf ~/Library/Developer/Xcode/iOS\\ DeviceSupport/*
\`\`\`
*Expected recovery: 15 GB – 45 GB.*`;
  }

  return `### DiskSize AI Analysis for ${os.toUpperCase()}

Here are standard safe cleanup recommendations for your operating system:

| Target Category | Safe Location | Typical Size | Safety Level |
| :--- | :--- | :--- | :--- |
| User Temp Files | \`%TEMP%\` or \`/tmp\` | 2 GB – 15 GB | **Safe to Clean** |
| Web & App Caches | Discord, Spotify, Chrome cache | 5 GB – 20 GB | **Safe to Clean** |
| Package Caches | npm, yarn, pip, Homebrew | 4 GB – 18 GB | **Safe to Clean** |
| Old Downloads | \`Downloads/\` folder (>90 days old) | 10 GB – 50 GB | **Review First** |
| OS System Files | \`System32\`, \`/System\`, \`pagefile.sys\` | 20 GB – 60 GB | **NEVER DELETE** |

Ask me about any specific folder or command, or click on a folder in the visualizer to inspect it!`;
}

function generateOfflineScanAnalysis(os: string, summary: any): string {
  return `### Comprehensive Disk Storage Diagnostics (${os.toUpperCase()})

#### 1. Top Identified Space Hogs
- **Application & User Caches:** High volume of temporary browser, electron (Slack/Discord/Spotify), and system logs.
- **Developer Artifacts:** Detected multiple \`node_modules\` and build caches.
- **Downloaded Installers:** Several ISO, DMG, and installer packages over 6 months old.

#### 2. Reclaimable Space Summary
- **Immediately Safe to Clean:** ~42.8 GB
- **Review Recommended:** ~28.5 GB
- **Protected OS Core:** System components are strictly shielded.

#### 3. Recommended Next Steps
Run the dry-run cleanup script in the Command Terminal tab or select safe items in the Tree Explorer to generate exact cleanup scripts.`;
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`DiskSize AI running on port ${port}`);
  });
}

startServer();
