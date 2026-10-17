import { OperatingSystem } from '../types/disk';

export interface StorageTrendPoint {
  date: string;
  day: number;
  usedGB: number;
  usedBytes: number;
  safeCleanableGB: number;
  freeGB: number;
  event?: string;
}

export interface TrendAnalysisSummary {
  data: StorageTrendPoint[];
  netChangeGB: number;
  percentChange: number;
  avgDailyGrowthMB: number;
  daysUntilFullEstimate: number | null;
  projected30DayGB: number;
}

/**
 * Generates realistic 30-day disk usage historical trend points leading up to the current scan
 */
export function generate30DayTrend(
  currentUsedBytes: number,
  totalCapacityBytes: number,
  safeCleanableBytes: number,
  os: OperatingSystem,
  driveLabel: string
): TrendAnalysisSummary {
  const currentUsedGB = currentUsedBytes / (1024 * 1024 * 1024);
  const totalCapacityGB = totalCapacityBytes / (1024 * 1024 * 1024);
  const currentSafeCleanableGB = safeCleanableBytes / (1024 * 1024 * 1024);

  // We model 30 days of growth leading to currentUsedGB
  // A typical developer/workstation disk grows between 8 GB to 25 GB over 30 days with intermittent jumps
  const net30DayGrowthGB = os === 'windows' ? 18.4 : os === 'macos' ? 14.2 : 11.5;
  const startUsedGB = Math.max(10, currentUsedGB - net30DayGrowthGB);

  const points: StorageTrendPoint[] = [];
  const now = new Date('2026-10-16T17:45:00'); // current runtime date

  // Predefined events for realistic milestones
  const eventsByDay: Record<number, string> = {
    6: os === 'windows' ? 'Windows Feature Update & WinSxS growth' : os === 'macos' ? 'Xcode 16.2 SDK Installed' : 'Linux kernel 6.8 updated',
    14: os === 'windows' ? 'Game update (Baldur\'s Gate 3 patch)' : os === 'macos' ? 'Final Cut Pro 4K Render Cache' : 'Docker images pulled',
    21: 'npm & rust project build caches accumulated',
    27: 'Interrupted download cache in Temp',
  };

  let simulatedUsedGB = startUsedGB;
  const dailyBaseGrowth = (net30DayGrowthGB * 0.45) / 30;

  for (let i = 29; i >= 0; i--) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() - i);

    const dayNumber = 30 - i;
    const dateLabel = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (i === 0) {
      // Last day is exactly today's scanned value
      simulatedUsedGB = currentUsedGB;
    } else {
      // Add subtle noise and milestone jumps
      let jump = dailyBaseGrowth + (Math.sin(i * 0.7) * 0.15);
      if (dayNumber === 6) jump += 4.5;
      if (dayNumber === 14) jump += 6.2;
      if (dayNumber === 21) jump += 2.8;

      simulatedUsedGB += jump;
    }

    // Safe cleanable bloat also steadily accumulated over time
    const cleanableProportion = 0.5 + (dayNumber / 60);
    const simulatedCleanableGB = Math.max(2, currentSafeCleanableGB * cleanableProportion);
    const simulatedFreeGB = Math.max(0, totalCapacityGB - simulatedUsedGB);

    points.push({
      date: dateLabel,
      day: dayNumber,
      usedGB: parseFloat(simulatedUsedGB.toFixed(2)),
      usedBytes: Math.round(simulatedUsedGB * 1024 * 1024 * 1024),
      safeCleanableGB: parseFloat(simulatedCleanableGB.toFixed(2)),
      freeGB: parseFloat(simulatedFreeGB.toFixed(2)),
      event: eventsByDay[dayNumber],
    });
  }

  const netChangeGB = parseFloat((currentUsedGB - startUsedGB).toFixed(2));
  const percentChange = parseFloat(((netChangeGB / startUsedGB) * 100).toFixed(1));
  const avgDailyGrowthMB = Math.round((netChangeGB * 1024) / 30);

  // Estimate days until 90% threshold if current growth rate continues
  const threshold90GB = totalCapacityGB * 0.9;
  const remainingUntil90GB = threshold90GB - currentUsedGB;
  const dailyGrowthGB = netChangeGB / 30;
  const daysUntilFullEstimate = dailyGrowthGB > 0 && remainingUntil90GB > 0
    ? Math.round(remainingUntil90GB / dailyGrowthGB)
    : null;

  const projected30DayGB = parseFloat((currentUsedGB + (dailyGrowthGB * 30)).toFixed(1));

  return {
    data: points,
    netChangeGB,
    percentChange,
    avgDailyGrowthMB,
    daysUntilFullEstimate,
    projected30DayGB,
  };
}
