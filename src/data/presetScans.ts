import { DiskNode, OperatingSystem } from '../types/disk';

export interface PresetProfile {
  id: string;
  os: OperatingSystem;
  driveLabel: string;
  totalCapacity: number; // bytes
  freeSpace: number; // bytes
  rootNode: DiskNode;
}

// 1. Windows 11 NVMe SSD (512 GB)
const windowsScan: DiskNode = {
  id: 'win-c',
  name: 'OS (C:)',
  path: 'C:\\',
  size: 388705000000, // ~362 GB
  isDirectory: true,
  fileCount: 412950,
  dirCount: 48210,
  category: 'system',
  safetyRating: 'caution',
  children: [
    {
      id: 'win-steam',
      name: 'Program Files (x86)',
      path: 'C:\\Program Files (x86)',
      size: 142800000000, // ~133 GB
      isDirectory: true,
      category: 'games',
      safetyRating: 'caution',
      fileCount: 88400,
      children: [
        {
          id: 'win-steam-common',
          name: 'Steam',
          path: 'C:\\Program Files (x86)\\Steam',
          size: 138500000000,
          isDirectory: true,
          category: 'games',
          safetyRating: 'caution',
          fileCount: 82300,
          children: [
            {
              id: 'win-steam-bg3',
              name: 'steamapps\\common\\Baldurs Gate 3',
              path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Baldurs Gate 3',
              size: 122400000000,
              isDirectory: true,
              category: 'games',
              safetyRating: 'caution',
              fileCount: 64200,
            },
            {
              id: 'win-steam-downloading',
              name: 'steamapps\\downloading',
              path: 'C:\\Program Files (x86)\\Steam\\steamapps\\downloading',
              size: 12800000000, // ~11.9 GB leftover download cache
              isDirectory: true,
              category: 'caches',
              safetyRating: 'safe',
              fileCount: 840,
              safetyReason: 'Leftover interrupted download caches. Safe to remove or verify integrity in Steam.',
            },
            {
              id: 'win-steam-shadercache',
              name: 'steamapps\\shadercache',
              path: 'C:\\Program Files (x86)\\Steam\\steamapps\\shadercache',
              size: 3300000000,
              isDirectory: true,
              category: 'caches',
              safetyRating: 'safe',
              fileCount: 17260,
              safetyReason: 'Pre-compiled shader cache. Re-generated automatically by graphics driver.',
            },
          ],
        },
      ],
    },
    {
      id: 'win-users',
      name: 'Users',
      path: 'C:\\Users',
      size: 128600000000, // ~119.7 GB
      isDirectory: true,
      category: 'documents',
      safetyRating: 'caution',
      fileCount: 218400,
      children: [
        {
          id: 'win-user-riley',
          name: 'Riley',
          path: 'C:\\Users\\Riley',
          size: 128200000000,
          isDirectory: true,
          category: 'documents',
          safetyRating: 'caution',
          fileCount: 217900,
          children: [
            {
              id: 'win-projects',
              name: 'Projects',
              path: 'C:\\Users\\Riley\\Projects',
              size: 61400000000, // ~57 GB
              isDirectory: true,
              category: 'developer',
              safetyRating: 'caution',
              fileCount: 142000,
              children: [
                {
                  id: 'win-proj-node-modules-1',
                  name: 'ai-portal\\node_modules',
                  path: 'C:\\Users\\Riley\\Projects\\ai-portal\\node_modules',
                  size: 16800000000, // 15.6 GB
                  isDirectory: true,
                  category: 'developer',
                  safetyRating: 'safe',
                  fileCount: 46200,
                  safetyReason: 'Dependency folder. Can be reinstalled with npm install.',
                },
                {
                  id: 'win-proj-node-modules-2',
                  name: 'ecommerce-engine\\node_modules',
                  path: 'C:\\Users\\Riley\\Projects\\ecommerce-engine\\node_modules',
                  size: 14200000000, // 13.2 GB
                  isDirectory: true,
                  category: 'developer',
                  safetyRating: 'safe',
                  fileCount: 41800,
                  safetyReason: 'Inactive repo node_modules. Safe to delete.',
                },
                {
                  id: 'win-proj-rust-target',
                  name: 'rust-storage-service\\target',
                  path: 'C:\\Users\\Riley\\Projects\\rust-storage-service\\target',
                  size: 18400000000, // 17.1 GB
                  isDirectory: true,
                  category: 'developer',
                  safetyRating: 'safe',
                  fileCount: 22100,
                  safetyReason: 'Cargo build cache. Can be purged via cargo clean.',
                },
                {
                  id: 'win-proj-src',
                  name: 'Source Code & Repositories',
                  path: 'C:\\Users\\Riley\\Projects\\src',
                  size: 12000000000,
                  isDirectory: true,
                  category: 'developer',
                  safetyRating: 'caution',
                  fileCount: 31900,
                },
              ],
            },
            {
              id: 'win-appdata',
              name: 'AppData',
              path: 'C:\\Users\\Riley\\AppData',
              size: 44200000000, // ~41 GB
              isDirectory: true,
              category: 'caches',
              safetyRating: 'caution',
              fileCount: 62400,
              children: [
                {
                  id: 'win-temp',
                  name: 'Local\\Temp',
                  path: 'C:\\Users\\Riley\\AppData\\Local\\Temp',
                  size: 14800000000, // 13.8 GB
                  isDirectory: true,
                  category: 'caches',
                  safetyRating: 'safe',
                  fileCount: 18900,
                  safetyReason: 'Temporary application files and setup unpacks. Highly safe to clean.',
                },
                {
                  id: 'win-chrome-cache',
                  name: 'Local\\Google\\Chrome\\User Data\\Default\\Cache',
                  path: 'C:\\Users\\Riley\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache',
                  size: 8400000000, // 7.8 GB
                  isDirectory: true,
                  category: 'caches',
                  safetyRating: 'safe',
                  fileCount: 14200,
                  safetyReason: 'Web browser cached images and assets. Safe to clean.',
                },
                {
                  id: 'win-crashdumps',
                  name: 'Local\\CrashDumps',
                  path: 'C:\\Users\\Riley\\AppData\\Local\\CrashDumps',
                  size: 6200000000, // 5.7 GB
                  isDirectory: true,
                  category: 'logs',
                  safetyRating: 'safe',
                  fileCount: 18,
                  safetyReason: 'Old application memory crash dumps (.dmp). Safe to delete.',
                },
                {
                  id: 'win-spotify-cache',
                  name: 'Local\\Spotify\\Data',
                  path: 'C:\\Users\\Riley\\AppData\\Local\\Spotify\\Data',
                  size: 5600000000, // 5.2 GB
                  isDirectory: true,
                  category: 'caches',
                  safetyRating: 'safe',
                  fileCount: 7100,
                  safetyReason: 'Offline cached audio streams. Safe to purge in Spotify settings.',
                },
                {
                  id: 'win-discord-cache',
                  name: 'Roaming\\discord\\Cache',
                  path: 'C:\\Users\\Riley\\AppData\\Roaming\\discord\\Cache',
                  size: 3800000000, // 3.5 GB
                  isDirectory: true,
                  category: 'caches',
                  safetyRating: 'safe',
                  fileCount: 4600,
                  safetyReason: 'Discord media cache. Safe to purge.',
                },
                {
                  id: 'win-npm-cache',
                  name: 'Local\\npm-cache',
                  path: 'C:\\Users\\Riley\\AppData\\Local\\npm-cache',
                  size: 5400000000, // 5.0 GB
                  isDirectory: true,
                  category: 'caches',
                  safetyRating: 'safe',
                  fileCount: 17600,
                  safetyReason: 'npm tarball cache. Safe to clean with npm cache clean --force.',
                },
              ],
            },
            {
              id: 'win-downloads',
              name: 'Downloads',
              path: 'C:\\Users\\Riley\\Downloads',
              size: 22600000000, // ~21 GB
              isDirectory: true,
              category: 'archives',
              safetyRating: 'caution',
              fileCount: 13500,
              children: [
                {
                  id: 'win-iso-ubuntu',
                  name: 'ubuntu-24.04.1-desktop-amd64.iso',
                  path: 'C:\\Users\\Riley\\Downloads\\ubuntu-24.04.1-desktop-amd64.iso',
                  size: 6100000000,
                  isDirectory: false,
                  category: 'archives',
                  safetyRating: 'safe',
                  safetyReason: 'Large ISO downloaded 8 months ago. Can be deleted if already flashed.',
                },
                {
                  id: 'win-zip-dataset',
                  name: 'synthetic-dataset-2025.zip',
                  path: 'C:\\Users\\Riley\\Downloads\\synthetic-dataset-2025.zip',
                  size: 8400000000,
                  isDirectory: false,
                  category: 'archives',
                  safetyRating: 'safe',
                  safetyReason: 'Extracted dataset archive downloaded 5 months ago.',
                },
                {
                  id: 'win-installers',
                  name: 'Old Installers (.exe, .msi)',
                  path: 'C:\\Users\\Riley\\Downloads\\Installers',
                  size: 8100000000,
                  isDirectory: true,
                  category: 'archives',
                  safetyRating: 'safe',
                  fileCount: 42,
                  safetyReason: 'Past installer files no longer needed after setup.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'win-windows-dir',
      name: 'Windows',
      path: 'C:\\Windows',
      size: 48900000000, // ~45.5 GB
      isDirectory: true,
      category: 'system',
      safetyRating: 'system-critical',
      fileCount: 94200,
      children: [
        {
          id: 'win-winsxs',
          name: 'WinSxS (Side-by-Side Component Store)',
          path: 'C:\\Windows\\WinSxS',
          size: 19400000000, // 18.0 GB
          isDirectory: true,
          category: 'system',
          safetyRating: 'system-critical',
          fileCount: 56200,
          safetyReason: 'DO NOT MANUALLY DELETE. Clean safely only via DISM /Online /Cleanup-Image /StartComponentCleanup.',
        },
        {
          id: 'win-system32',
          name: 'System32',
          path: 'C:\\Windows\\System32',
          size: 8600000000,
          isDirectory: true,
          category: 'system',
          safetyRating: 'system-critical',
          fileCount: 22400,
          safetyReason: 'CRITICAL SYSTEM FOLDER. Deleting any file here will crash Windows and prevent boot.',
        },
        {
          id: 'win-software-distribution',
          name: 'SoftwareDistribution\\Download',
          path: 'C:\\Windows\\SoftwareDistribution\\Download',
          size: 7800000000, // 7.2 GB
          isDirectory: true,
          category: 'caches',
          safetyRating: 'safe',
          fileCount: 1420,
          safetyReason: 'Downloaded Windows updates already applied. Safe to clean after stopping wuauserv.',
        },
        {
          id: 'win-sys-temp',
          name: 'Temp',
          path: 'C:\\Windows\\Temp',
          size: 4200000000,
          isDirectory: true,
          category: 'caches',
          safetyRating: 'safe',
          fileCount: 3100,
          safetyReason: 'System-level temporary files. Safe to delete.',
        },
        {
          id: 'win-other-sys',
          name: 'Other System Libraries',
          path: 'C:\\Windows\\SysWOW64 & Drivers',
          size: 8900000000,
          isDirectory: true,
          category: 'system',
          safetyRating: 'system-critical',
          fileCount: 11080,
          safetyReason: 'Protected drivers and subsystem runtimes.',
        },
      ],
    },
    {
      id: 'win-pagefile',
      name: 'pagefile.sys',
      path: 'C:\\pagefile.sys',
      size: 8589934592, // 8.0 GB
      isDirectory: false,
      category: 'system',
      safetyRating: 'system-critical',
      safetyReason: 'Windows Virtual Memory paging file. Protected by OS kernel.',
    },
    {
      id: 'win-hiberfil',
      name: 'hiberfil.sys',
      path: 'C:\\hiberfil.sys',
      size: 6871947673, // 6.4 GB
      isDirectory: false,
      category: 'system',
      safetyRating: 'caution',
      safetyReason: 'Hibernate state file. Can be safely disabled via command: powercfg -h off.',
    },
  ],
};

// 2. macOS Apple Silicon SSD (512 GB)
const macScan: DiskNode = {
  id: 'mac-root',
  name: 'Macintosh HD',
  path: '/',
  size: 395400000000, // ~368 GB used
  isDirectory: true,
  fileCount: 541000,
  dirCount: 68200,
  category: 'system',
  safetyRating: 'caution',
  children: [
    {
      id: 'mac-users',
      name: 'Users/riley',
      path: '/Users/riley',
      size: 284000000000, // ~264 GB
      isDirectory: true,
      category: 'documents',
      safetyRating: 'caution',
      fileCount: 428000,
      children: [
        {
          id: 'mac-developer',
          name: 'Library/Developer',
          path: '/Users/riley/Library/Developer',
          size: 68200000000, // 63.5 GB
          isDirectory: true,
          category: 'developer',
          safetyRating: 'caution',
          fileCount: 184000,
          children: [
            {
              id: 'mac-derived-data',
              name: 'Xcode/DerivedData',
              path: '/Users/riley/Library/Developer/Xcode/DerivedData',
              size: 34200000000, // 31.8 GB
              isDirectory: true,
              category: 'developer',
              safetyRating: 'safe',
              fileCount: 96000,
              safetyReason: 'Xcode intermediate build index and caches. Xcode recreates automatically on next build.',
            },
            {
              id: 'mac-ios-device-support',
              name: 'Xcode/iOS DeviceSupport',
              path: '/Users/riley/Library/Developer/Xcode/iOS DeviceSupport',
              size: 18400000000, // 17.1 GB
              isDirectory: true,
              category: 'developer',
              safetyRating: 'safe',
              fileCount: 38000,
              safetyReason: 'Old debug symbol cache for past iOS versions. Safe to clean.',
            },
            {
              id: 'mac-core-simulator',
              name: 'CoreSimulator/Caches',
              path: '/Users/riley/Library/Developer/CoreSimulator/Caches',
              size: 15600000000, // 14.5 GB
              isDirectory: true,
              category: 'caches',
              safetyRating: 'safe',
              fileCount: 50000,
              safetyReason: 'Simulator runtime caches. Cleanable via xcrun simctl erase all.',
            },
          ],
        },
        {
          id: 'mac-docker-vm',
          name: 'Library/Containers/Docker.raw',
          path: '/Users/riley/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw',
          size: 42000000000, // 39.1 GB
          isDirectory: false,
          category: 'developer',
          safetyRating: 'caution',
          safetyReason: 'Virtual disk allocated for Docker engine. Cleanable via docker system prune -a --volumes.',
        },
        {
          id: 'mac-library-caches',
          name: 'Library/Caches',
          path: '/Users/riley/Library/Caches',
          size: 38600000000, // 35.9 GB
          isDirectory: true,
          category: 'caches',
          safetyRating: 'safe',
          fileCount: 62000,
          children: [
            {
              id: 'mac-homebrew-cache',
              name: 'Homebrew',
              path: '/Users/riley/Library/Caches/Homebrew',
              size: 14800000000, // 13.7 GB
              isDirectory: true,
              category: 'caches',
              safetyRating: 'safe',
              fileCount: 4200,
              safetyReason: 'Downloaded Homebrew bottle tarballs. Safe to clean via brew cleanup -s.',
            },
            {
              id: 'mac-yarn-cache',
              name: 'Yarn & npm',
              path: '/Users/riley/Library/Caches/Yarn',
              size: 11200000000, // 10.4 GB
              isDirectory: true,
              category: 'caches',
              safetyRating: 'safe',
              fileCount: 32000,
              safetyReason: 'Package manager caches. Cleanable via yarn cache clean.',
            },
            {
              id: 'mac-adobe-cache',
              name: 'Adobe Media Cache',
              path: '/Users/riley/Library/Caches/Adobe',
              size: 12600000000,
              isDirectory: true,
              category: 'caches',
              safetyRating: 'safe',
              fileCount: 25800,
              safetyReason: 'Video playback conform files and peak files. Re-generated upon opening projects.',
            },
          ],
        },
        {
          id: 'mac-movies-fcp',
          name: 'Movies/Final Cut Backups & Render',
          path: '/Users/riley/Movies/Final Cut Pro Render Files',
          size: 58400000000, // 54.3 GB
          isDirectory: true,
          category: 'media',
          safetyRating: 'caution',
          fileCount: 4200,
          safetyReason: 'Generated optical flow and render caches. Can be safely deleted inside Final Cut Pro.',
        },
        {
          id: 'mac-downloads',
          name: 'Downloads',
          path: '/Users/riley/Downloads',
          size: 38200000000, // 35.5 GB
          isDirectory: true,
          category: 'archives',
          safetyRating: 'caution',
          fileCount: 2200,
          children: [
            {
              id: 'mac-dmg-files',
              name: 'Old Disk Images (*.dmg, *.pkg)',
              path: '/Users/riley/Downloads/*.dmg',
              size: 21400000000, // 19.9 GB
              isDirectory: true,
              category: 'archives',
              safetyRating: 'safe',
              fileCount: 28,
              safetyReason: 'Software installation installers already completed.',
            },
            {
              id: 'mac-zip-archives',
              name: 'Archives & Zip files',
              path: '/Users/riley/Downloads/*.zip',
              size: 16800000000,
              isDirectory: true,
              category: 'archives',
              safetyRating: 'caution',
              fileCount: 45,
            },
          ],
        },
        {
          id: 'mac-node-modules',
          name: 'Projects/monorepo/node_modules',
          path: '/Users/riley/Projects/monorepo/node_modules',
          size: 38600000000, // 35.9 GB
          isDirectory: true,
          category: 'developer',
          safetyRating: 'safe',
          fileCount: 94000,
          safetyReason: 'Monorepo dependencies. Rebuilt with pnpm install.',
        },
      ],
    },
    {
      id: 'mac-system',
      name: 'System (Read-Only APFS Snapshot)',
      path: '/System',
      size: 26800000000, // 25 GB
      isDirectory: true,
      category: 'system',
      safetyRating: 'system-critical',
      fileCount: 78000,
      safetyReason: 'macOS Sealed System Volume (SSV). Cryptographically signed and read-only. NEVER TOUCH.',
    },
    {
      id: 'mac-library',
      name: 'Library',
      path: '/Library',
      size: 32400000000,
      isDirectory: true,
      category: 'system',
      safetyRating: 'system-critical',
      fileCount: 34000,
      safetyReason: 'Shared system extensions and audio plugins.',
    },
    {
      id: 'mac-applications',
      name: 'Applications',
      path: '/Applications',
      size: 52200000000,
      isDirectory: true,
      category: 'system',
      safetyRating: 'caution',
      fileCount: 42000,
    },
  ],
};

// 3. Linux Ubuntu Server (256 GB NVMe)
const linuxScan: DiskNode = {
  id: 'linux-root',
  name: 'Ubuntu 24.04 (/)',
  path: '/',
  size: 198500000000, // ~184 GB used
  isDirectory: true,
  fileCount: 382000,
  dirCount: 42100,
  category: 'system',
  safetyRating: 'caution',
  children: [
    {
      id: 'linux-var',
      name: '/var',
      path: '/var',
      size: 92400000000, // ~86 GB
      isDirectory: true,
      category: 'system',
      safetyRating: 'caution',
      fileCount: 124000,
      children: [
        {
          id: 'linux-docker-overlay2',
          name: 'lib/docker/overlay2',
          path: '/var/lib/docker/overlay2',
          size: 48600000000, // 45.2 GB
          isDirectory: true,
          category: 'developer',
          safetyRating: 'safe',
          fileCount: 68000,
          safetyReason: 'Dangling Docker container layers and build layers. Cleanable with docker system prune -a.',
        },
        {
          id: 'linux-journal-logs',
          name: 'log/journal',
          path: '/var/log/journal',
          size: 18400000000, // 17.1 GB
          isDirectory: true,
          category: 'logs',
          safetyRating: 'safe',
          fileCount: 120,
          safetyReason: 'Unvacuumed systemd journal logs. Cleanable safely via journalctl --vacuum-size=500M.',
        },
        {
          id: 'linux-apt-archives',
          name: 'cache/apt/archives',
          path: '/var/cache/apt/archives',
          size: 12800000000, // 11.9 GB
          isDirectory: true,
          category: 'caches',
          safetyRating: 'safe',
          fileCount: 840,
          safetyReason: 'Downloaded .deb package archives already installed. Safe to clean via apt-get clean.',
        },
        {
          id: 'linux-var-log-gz',
          name: 'log/*.log.*.gz (Rotated Logs)',
          path: '/var/log/old-rotated',
          size: 8200000000,
          isDirectory: true,
          category: 'logs',
          safetyRating: 'safe',
          fileCount: 1400,
          safetyReason: 'Old archived log files older than 30 days. Safe to delete.',
        },
        {
          id: 'linux-var-other',
          name: 'lib & spool databases',
          path: '/var/lib',
          size: 4400000000,
          isDirectory: true,
          category: 'system',
          safetyRating: 'caution',
          fileCount: 12000,
        },
      ],
    },
    {
      id: 'linux-home',
      name: '/home/riley',
      path: '/home/riley',
      size: 58600000000, // ~54.5 GB
      isDirectory: true,
      category: 'documents',
      safetyRating: 'caution',
      fileCount: 148000,
      children: [
        {
          id: 'linux-home-cache',
          name: '.cache',
          path: '/home/riley/.cache',
          size: 22400000000, // 20.8 GB
          isDirectory: true,
          category: 'caches',
          safetyRating: 'safe',
          fileCount: 42000,
          safetyReason: 'pip, rustup, ccache and go-build caches. Safe to purge.',
        },
        {
          id: 'linux-home-projects',
          name: 'workspace/node_modules',
          path: '/home/riley/workspace/node_modules',
          size: 24800000000, // 23 GB
          isDirectory: true,
          category: 'developer',
          safetyRating: 'safe',
          fileCount: 68000,
          safetyReason: 'Old repository node_modules. Rebuilt with npm install.',
        },
        {
          id: 'linux-home-docs',
          name: 'workspace/src & data',
          path: '/home/riley/workspace/src',
          size: 11400000000,
          isDirectory: true,
          category: 'developer',
          safetyRating: 'caution',
          fileCount: 38000,
        },
      ],
    },
    {
      id: 'linux-usr',
      name: '/usr',
      path: '/usr',
      size: 28400000000,
      isDirectory: true,
      category: 'system',
      safetyRating: 'system-critical',
      fileCount: 78000,
      safetyReason: 'CRITICAL SYSTEM BINARIES & LIBS (/usr/bin, /usr/lib). Deleting will brick OS.',
    },
    {
      id: 'linux-boot',
      name: '/boot',
      path: '/boot',
      size: 8900000000, // 8.2 GB
      isDirectory: true,
      category: 'system',
      safetyRating: 'caution',
      fileCount: 140,
      safetyReason: 'Contains 7 old unused kernel images. Remove safely via apt autoremove --purge, do NOT rm -rf.',
    },
    {
      id: 'linux-etc',
      name: '/etc',
      path: '/etc',
      size: 1200000000,
      isDirectory: true,
      category: 'system',
      safetyRating: 'system-critical',
      fileCount: 4100,
      safetyReason: 'SYSTEM CONFIGURATION. Critical to system stability.',
    },
  ],
};

export const PRESET_PROFILES: Record<OperatingSystem, PresetProfile> = {
  windows: {
    id: 'windows-c',
    os: 'windows',
    driveLabel: 'Local Disk (C:)',
    totalCapacity: 512110190592, // 512 GB
    freeSpace: 123405190592, // ~114 GB free
    rootNode: windowsScan,
  },
  macos: {
    id: 'mac-hd',
    os: 'macos',
    driveLabel: 'Macintosh HD (APFS Container)',
    totalCapacity: 500277790720, // 500 GB
    freeSpace: 104877790720, // ~97 GB free
    rootNode: macScan,
  },
  linux: {
    id: 'linux-nvme',
    os: 'linux',
    driveLabel: 'NVMe rootfs (ext4)',
    totalCapacity: 256060514304, // 256 GB
    freeSpace: 57560514304, // ~53 GB free
    rootNode: linuxScan,
  },
};
