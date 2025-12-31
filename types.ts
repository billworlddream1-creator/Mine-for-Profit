
export interface MiningStats {
  hashrate: number; // in TH/s
  totalMined: number; // BTC
  activeWorkers: number;
  powerConsumption: number; // Watts
  efficiency: number; // J/TH
  dailyProfitUSD: number; // Estimated 24h profit in USD
}

export interface MarketData {
  price: number;
  change24h: number;
  marketCap: string;
  volume24h: string;
}

export interface ChartPoint {
  time: string;
  price: number;
  hashrate: number;
}

export interface AIAnalysis {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  summary: string;
  sources: { title: string; web: string }[];
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'admin' | 'ai';
  message: string;
}

export type PlanType = 'Free' | 'Pro' | 'Elite';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isLoggedIn: boolean;
  highestHashrate: number;
  plan: PlanType;
  referralCount: number;
  referralBonusApplied: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  hashrate: number;
  totalMined: number;
}

export interface GlobalStats {
  totalMiners: number;
  peakHashrate: number;
  networkHashrate: string;
}
