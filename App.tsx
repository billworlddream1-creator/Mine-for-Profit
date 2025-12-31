
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, Cpu, Zap, TrendingUp, TrendingDown, Wallet, Settings, Play, Square, 
  ShieldCheck, Globe, RefreshCw, Search, MessageSquare, DollarSign, X, AlertTriangle, 
  Wrench, History, Lock, ChevronRight, Gift, ArrowUpRight, UserCheck, User, LogIn, 
  Users, Trophy, Mail, Github, Rocket, Crown, CheckCircle2, ZapOff, Clock, Radio, 
  Terminal, Server, Database, ShieldAlert, Cloud, CloudUpload, Wifi, PowerOff, 
  Hammer, AlertCircle, MoreVertical, RotateCw, Power, Sparkles, Fan, Layers, 
  Gauge, ClipboardList, Flame, Battery, LayoutDashboard, WalletCards, 
  BarChart3, Network, ArrowDownLeft, Share2, ExternalLink, QrCode, Copy, Check,
  ChevronLeft, HardDrive, Microchip, MousePointer2, Zap as Lightning, Shield,
  Terminal as TerminalIcon, Info, Boxes, GaugeCircle, ShieldCheck as AdminIcon,
  Timer, UserPlus, Zap as BoostIcon, RefreshCcw, ChevronDown, Key, UserCircle, 
  CheckCircle, Fingerprint, Eye, EyeOff
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { MiningStats, MarketData, ChartPoint, AIAnalysis, ActivityLog, User as UserType, PlanType } from './types';
import { getMarketAnalysis } from './services/gemini';

declare var confetti: any;

const STORAGE_KEY = 'mine_for_profit_enterprise_v2';
const MINING_SESSION_DURATION = 12 * 60 * 60 * 1000; 
const REFERRAL_GOAL = 10;
const REFERRAL_REWARD = 0.00001;

const SUPPORTED_WALLETS = [
  "Binance Global",
  "Trust Wallet Pro",
  "Coinbase Prime",
  "MetaMask Enterprise",
  "OKX Multi-Sig",
  "Ledger Cold Vault",
  "Trezor Hardware",
  "Exodus Desktop"
];

const INITIAL_STATS: MiningStats = {
  hashrate: 1.0, totalMined: 0.00000000, activeWorkers: 1, 
  powerConsumption: 120, efficiency: 120, dailyProfitUSD: 0
};

const INITIAL_MARKET: MarketData = {
  price: 64230.45, change24h: 2.4, marketCap: "1.26T", volume24h: "35.2B"
};

const DEFAULT_PLAN_SETTINGS: Record<PlanType, { 
  maxNodes: number; 
  maxHash: number; 
  maxPower: number; 
  bonus: number; 
  label: string; 
  price: number; 
  breakdown: { hardware: number; cooling: number; net: number; tax: number };
  hashAllocation: string;
  features: string[];
  color: string;
  glow: string;
}> = {
  'Free': { 
    maxNodes: 6, maxHash: 250, maxPower: 3500, bonus: 1.0, 
    label: 'Standard Node', price: 0, 
    breakdown: { hardware: 0, cooling: 0, net: 0, tax: 0 },
    hashAllocation: '250 TH/s CAP',
    features: ['Legacy Hardware Access', 'Shared Cooling', 'Standard Payouts'],
    color: 'bg-slate-500', glow: 'shadow-slate-500/20'
  },
  'Pro': { 
    maxNodes: 36, maxHash: 8000, maxPower: 45000, bonus: 1.35, 
    label: 'Industrial Cluster', price: 89, 
    breakdown: { hardware: 45, cooling: 15, net: 19, tax: 10 },
    hashAllocation: '8,000 TH/s CAP',
    features: ['ASIC S21+ Fleet', '35% Efficiency Bonus', 'Priority Relay Pool'],
    color: 'bg-emerald-500', glow: 'shadow-emerald-500/20'
  },
  'Elite': { 
    maxNodes: 256, maxHash: 120000, maxPower: 500000, bonus: 1.85, 
    label: 'Liquid Mainframe', price: 299, 
    breakdown: { hardware: 150, cooling: 50, net: 69, tax: 30 },
    hashAllocation: '120,000 TH/s CAP',
    features: ['Cryogenic Cooling', '85% Yield Bonus', 'Zero-Fee Settlements'],
    color: 'bg-blue-600', glow: 'shadow-blue-500/20'
  }
};

const WITHDRAW_THRESHOLD = 0.0005;

interface RigOverride {
  isPoweredOff: boolean;
  isRestarting: boolean;
  isMaintenance: boolean;
  temperature: number;
  powerLimit: number; 
}

interface Transaction {
  id: string;
  type: 'payout' | 'bonus' | 'withdrawal' | 'referral_boost';
  amount: number;
  timestamp: Date;
  status: 'confirmed' | 'pending';
  toAddress?: string;
  walletProvider?: string;
}

const App: React.FC = () => {
  // App States
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing ASIC BIOS...');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [currentView, setCurrentView] = useState<'dashboard' | 'wallet' | 'market' | 'network' | 'plans' | 'referral'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [stats, setStats] = useState<MiningStats>(INITIAL_STATS);
  const [market, setMarket] = useState<MarketData>(INITIAL_MARKET);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isMining, setIsMining] = useState(false);
  const [miningSessionStart, setMiningSessionStart] = useState<number | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['>> Mine for Profit System Initialized.', '>> Establishing secure handshake with pool...']);
  const [user, setUser] = useState<UserType>({
    id: 'admin_01', name: 'EliteMiner', email: 'admin@mineforprofit.net',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ProfitMiner',
    isLoggedIn: true, highestHashrate: 1.0, plan: 'Free',
    referralCount: 4, referralBonusApplied: false
  });
  const [btcAddress, setBtcAddress] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(SUPPORTED_WALLETS[0]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rigOverrides, setRigOverrides] = useState<Record<number, RigOverride>>({});
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Auth Inputs
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [planSettings, setPlanSettings] = useState(DEFAULT_PLAN_SETTINGS);
  const [configWorkers, setConfigWorkers] = useState(1);
  const [configHashrate, setConfigHashrate] = useState(10.0);
  const [configPower, setConfigPower] = useState(450);

  const planConfig = planSettings[user.plan];
  const miningIntervalRef = useRef<any>(null);

  // Boot Sequence Logic
  useEffect(() => {
    const sequence = [
      { progress: 10, text: 'Calibrating Thermal Sensors...' },
      { progress: 25, text: 'Scanning Hardware Cluster Nodes...' },
      { progress: 45, text: 'Synchronizing Blockchain Header...' },
      { progress: 70, text: 'Establishing SSL Tunnel...' },
      { progress: 90, text: 'Verifying Security Keys...' },
      { progress: 100, text: 'System Operational.' }
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < sequence.length) {
        setLoadingProgress(sequence[currentIdx].progress);
        setLoadingText(sequence[currentIdx].text);
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsLoading(false), 800);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  const addTerminalLine = (msg: string) => {
    setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));
  };

  const updateRigOverride = (index: number, updates: Partial<RigOverride>) => {
    setRigOverrides(prev => ({
        ...prev,
        [index]: {
            ...(prev[index] || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100 }),
            ...updates
        }
    }));
  };

  const handleRigAction = (index: number, action: 'togglePower' | 'restart' | 'maintenance' | 'setPowerLimit', value?: any) => {
    const rig = rigOverrides[index] || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100 };
    switch(action) {
      case 'togglePower':
        updateRigOverride(index, { isPoweredOff: !rig.isPoweredOff });
        addTerminalLine(`Node ID-${index + 1} power state updated.`);
        break;
      case 'restart':
        updateRigOverride(index, { isRestarting: true });
        addTerminalLine(`Node ID-${index + 1} soft rebooting...`);
        setTimeout(() => {
          updateRigOverride(index, { isRestarting: false, temperature: 28 });
          addTerminalLine(`Node ID-${index + 1} online.`);
        }, 2000);
        break;
      case 'maintenance':
        updateRigOverride(index, { isMaintenance: !rig.isMaintenance });
        addTerminalLine(`Node ID-${index + 1} maintenance toggled.`);
        break;
      case 'setPowerLimit':
        updateRigOverride(index, { powerLimit: value });
        break;
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticated(true);
    addTerminalLine(`User authenticated via ${authView === 'login' ? 'Credentials' : 'New Account'}.`);
  };

  const handleGoogleLogin = () => {
    setIsAuthenticated(true);
    addTerminalLine(`User authenticated via Google Cloud Identity.`);
  };

  // Fix: Added the missing switchPlan function to handle hardware lease plan updates
  const switchPlan = (plan: PlanType) => {
    setUser(prev => ({ ...prev, plan }));
    addTerminalLine(`Infrastructure contract migrated to ${plan} protocol.`);
  };

  const powerImpactMemo = useMemo(() => {
    const idealPower = configHashrate * 45;
    const powerRatio = configPower / idealPower;
    let hashrateMultiplier = powerRatio < 1 ? powerRatio : 1 + (Math.log(powerRatio) * 0.2);
    const efficiency = parseFloat((configPower / (configHashrate * hashrateMultiplier || 1)).toFixed(1));
    return { hashrateMultiplier, efficiency };
  }, [configHashrate, configPower]);

  const globalEffectiveHashrate = useMemo(() => configHashrate * powerImpactMemo.hashrateMultiplier, [configHashrate, powerImpactMemo.hashrateMultiplier]);

  const liveHashrate = useMemo(() => {
    if (!isMining) return 0;
    const rigHashBase = globalEffectiveHashrate / configWorkers;
    let total = 0;
    for (let i = 0; i < configWorkers; i++) {
      const override = rigOverrides[i] || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100 };
      if (!override.isPoweredOff && !override.isRestarting && !override.isMaintenance) {
        total += rigHashBase * (override.powerLimit / 100);
      }
    }
    return total;
  }, [isMining, globalEffectiveHashrate, configWorkers, rigOverrides]);

  const estimatedProfit = useMemo(() => {
    if (!isMining) return 0;
    const dailyCost = (configPower / 1000) * 24 * 0.15;
    return Math.max(0, ((liveHashrate / 145) * 0.0006 * planConfig.bonus * market.price) - dailyCost);
  }, [liveHashrate, market.price, isMining, planConfig, configPower]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.user) setUser(parsed.user);
      if (parsed.stats) setStats(prev => ({ ...prev, totalMined: parsed.stats.totalMined }));
      if (parsed.btcAddress) setBtcAddress(parsed.btcAddress);
      if (parsed.selectedWallet) setSelectedWallet(parsed.selectedWallet);
      if (parsed.transactions) setTransactions(parsed.transactions.map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })));
      if (parsed.config) {
        setConfigWorkers(parsed.config.workers);
        setConfigHashrate(parsed.config.hash);
        setConfigPower(parsed.config.power);
      }
      if (parsed.rigOverrides) setRigOverrides(parsed.rigOverrides);
    }

    const initialChart: ChartPoint[] = [];
    let bp = 65000;
    for (let i = 24; i >= 0; i--) { 
      bp += (Math.random() - 0.5) * 400; 
      initialChart.push({ time: `${i}h`, price: bp, hashrate: 150 + Math.random() * 10 }); 
    }
    setChartData(initialChart);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let sessionInterval: any = null;
    if (isMining) {
      if (!miningSessionStart) {
        setMiningSessionStart(Date.now());
        addTerminalLine('Tunnel handshake verified.');
      }
      miningIntervalRef.current = setInterval(() => {
        const perSec = (liveHashrate / 145) * (0.0006 / 86400) * planConfig.bonus;
        setStats(prev => ({ ...prev, totalMined: prev.totalMined + perSec }));
        setMarket(prev => ({ ...prev, price: prev.price + (Math.random() - 0.5) * 8 }));
        setRigOverrides(prev => {
          const next = { ...prev };
          for (let i = 0; i < configWorkers; i++) {
            const rig = next[i] || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100 };
            let targetTemp = 24;
            if (!rig.isPoweredOff && !rig.isMaintenance && !rig.isRestarting) {
              targetTemp = 35 + (rig.powerLimit * 0.5) + (Math.random() * 5);
            }
            next[i] = { ...rig, temperature: rig.temperature + (targetTemp - rig.temperature) * 0.05 };
          }
          return next;
        });
      }, 1000);
      sessionInterval = setInterval(() => {
        if (miningSessionStart) {
          const elapsed = Date.now() - miningSessionStart;
          const remaining = Math.max(0, MINING_SESSION_DURATION - elapsed);
          setSessionTimeLeft(remaining);
          if (remaining <= 0) {
            setIsMining(false);
            setMiningSessionStart(null);
          }
        }
      }, 1000);
    } else {
      clearInterval(miningIntervalRef.current);
      clearInterval(sessionInterval);
    }
    return () => {
      clearInterval(miningIntervalRef.current);
      clearInterval(sessionInterval);
    };
  }, [isMining, liveHashrate, planConfig, configWorkers, miningSessionStart, isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      user, stats, btcAddress, selectedWallet, transactions, rigOverrides, miningSessionStart,
      config: { workers: configWorkers, hash: configHashrate, power: configPower }
    }));
  }, [user, stats, btcAddress, selectedWallet, transactions, rigOverrides, configWorkers, configHashrate, configPower]);

  const handleWithdraw = async () => {
    if (stats.totalMined < WITHDRAW_THRESHOLD) return addTerminalLine(`Insufficient liquidity. Required: ${WITHDRAW_THRESHOLD} BTC.`);
    if (!btcAddress) return addTerminalLine("Configure vault destination first.");
    
    setIsWithdrawing(true);
    addTerminalLine(`Handshaking with ${selectedWallet} internal API...`);
    await new Promise(r => setTimeout(r, 1500));
    
    const amount = stats.totalMined;
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'withdrawal', amount, timestamp: new Date(), status: 'confirmed', 
      toAddress: btcAddress, walletProvider: selectedWallet
    };
    
    setTransactions(prev => [tx, ...prev]);
    setStats(prev => ({ ...prev, totalMined: 0 }));
    setIsWithdrawing(false);
    confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
    addTerminalLine(`SETTLEMENT FINALIZED: ${amount.toFixed(8)} BTC settled via ${selectedWallet}.`);
  };

  // Loading Screen Component
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden">
        <div className="absolute inset-0 hardware-grid opacity-20" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mb-8 loading-glow shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <Cpu className="text-white w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-white italic mb-4 uppercase tracking-tighter">Mine<span className="text-emerald-500">Profit</span></h1>
          <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden mb-4 border border-white/5">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
          </div>
          <p className="text-emerald-500/60 font-mono text-[10px] uppercase tracking-[0.3em]">{loadingText}</p>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-700 text-[10px] font-black uppercase tracking-[0.4em]">Industrial Scale Compute v2.4</div>
      </div>
    );
  }

  // Auth Screen Component
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#020617] p-6 relative">
         <div className="absolute inset-0 hardware-grid opacity-10" />
         <div className="w-full max-w-md glass rounded-[3rem] p-12 border-slate-800/80 animate-in fade-in zoom-in duration-500 relative z-10">
            <div className="text-center mb-10">
               <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <Fingerprint className="text-emerald-500 w-8 h-8" />
               </div>
               <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Identity Check</h2>
               <p className="text-slate-500 text-xs font-bold mt-2 tracking-widest uppercase">Secure Mining Relay Access</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-4">Terminal ID / Email</label>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 w-4 h-4" />
                    <input 
                      type="email" 
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-14 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-800"
                      placeholder="operator@mineforprofit.net"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-4">Access Token / Password</label>
                  <div className="relative">
                    <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 w-4 h-4" />
                    <input 
                      type={showPass ? "text" : "password"} 
                      required
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-14 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-800"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-400">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
               </div>

               <button type="submit" className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-600 shadow-xl shadow-emerald-500/10 transition-all italic">
                  Authorize Handshake
               </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">or</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            <button onClick={handleGoogleLogin} className="w-full mt-8 py-5 glass border-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-white/5 transition-all">
               <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
               </svg>
               Google Cloud Login
            </button>

            <p className="text-center mt-10 text-[10px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}>
               {authView === 'login' ? "New Operator? Create Node ID" : "Already registered? Authenticate"}
            </p>
         </div>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 selection:bg-emerald-500/30">
      <aside className={`sidebar-transition border-r border-slate-800/60 glass flex flex-col z-[100] ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-8 flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20"><Cpu className="text-white w-6 h-6" /></div>
              <h1 className="font-black text-xl tracking-tighter text-white uppercase italic">Mine<span className="text-emerald-500">Profit</span></h1>
            </div>
          ) : (
             <div className="w-10 h-10 bg-emerald-500 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10"><Cpu className="text-white w-6 h-6" /></div>
          )}
        </div>

        <nav className="flex-1 px-5 space-y-3 py-10">
          <NavItem active={currentView === 'dashboard'} collapsed={sidebarCollapsed} icon={<LayoutDashboard />} label="Command Core" onClick={() => setCurrentView('dashboard')} />
          <NavItem active={currentView === 'network'} collapsed={sidebarCollapsed} icon={<Server />} label="Rig Cluster" onClick={() => setCurrentView('network')} />
          <NavItem active={currentView === 'wallet'} collapsed={sidebarCollapsed} icon={<WalletCards />} label="Payout Engine" onClick={() => setCurrentView('wallet')} />
          <NavItem active={currentView === 'market'} collapsed={sidebarCollapsed} icon={<BarChart3 />} label="Analytics" onClick={() => setCurrentView('market')} />
          <NavItem active={currentView === 'plans'} collapsed={sidebarCollapsed} icon={<Rocket />} label="Hardware Lease" onClick={() => setCurrentView('plans')} />
          <NavItem active={currentView === 'referral'} collapsed={sidebarCollapsed} icon={<UserPlus />} label="Affiliates" onClick={() => setCurrentView('referral')} />
        </nav>

        <div className="p-6 border-t border-slate-800/50">
           <div className="mb-4">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-3 p-3 glass rounded-xl border-slate-800/50 mb-4 animate-in slide-in-from-left duration-500">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><UserCircle className="text-emerald-500 w-5 h-5" /></div>
                  <div className="flex-1 truncate">
                    <p className="text-[10px] font-black text-white truncate uppercase italic">{user.name}</p>
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">PRO OPERATOR</p>
                  </div>
                </div>
              )}
           </div>
           <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center gap-4 text-slate-400 hover:text-white p-3.5 rounded-2xl hover:bg-white/5 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
             <Settings className="w-6 h-6" />
             {!sidebarCollapsed && <span className="text-sm font-bold uppercase tracking-wider">Preferences</span>}
           </button>
           <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={`w-full flex items-center gap-4 text-slate-600 hover:text-white p-3.5 mt-2 rounded-2xl hover:bg-white/5 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
             {sidebarCollapsed ? <ChevronRight className="w-6 h-6" /> : <div className="flex items-center gap-3"><ChevronLeft className="w-6 h-6" /><span className="text-xs font-bold uppercase">Collapse</span></div>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-10 bg-black/40 border-b border-slate-800/40 flex items-center overflow-hidden whitespace-nowrap z-[40]">
           <div className="animate-ticker text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
             Network Status: SECURE • Global Hashrate: 540.2 EH/s • Difficulty Adjustment: +2.4% • Next Halving: 142 Days • Active Nodes: 432,012 • 
             Network Status: SECURE • Global Hashrate: 540.2 EH/s • Difficulty Adjustment: +2.4% • Next Halving: 142 Days • Active Nodes: 432,012 • 
           </div>
        </div>

        <header className="h-24 glass border-b border-slate-800/60 px-10 flex items-center justify-between z-50">
           <div className="flex items-center gap-14">
              <div className="group cursor-default">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Infrastructure</span>
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${isMining ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm font-black text-white uppercase tracking-tighter mono">
                    {isMining ? 'Operational' : 'Idle'}
                  </span>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-800/50 hidden lg:block" />
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Asset Index</span>
                <span className="text-xl font-black text-white mono tracking-tighter">${market.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {isMining && (
                <>
                  <div className="h-10 w-px bg-slate-800/50 hidden lg:block" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Session TTL</span>
                    <div className="flex items-center gap-2.5 text-emerald-500 mono font-black text-lg">
                      <Timer className="w-5 h-5" />
                      <span>{Math.floor(sessionTimeLeft / 1000 / 60)}m</span>
                    </div>
                  </div>
                </>
              )}
           </div>
           
           <div className="flex items-center gap-6">
             <button onClick={() => setIsMining(!isMining)} className={`px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center gap-4 ${isMining ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/10'}`}>
               {isMining ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
               {isMining ? 'HALT CLUSTER' : 'AUTHORIZE CLUSTER'}
             </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll p-10">
          {currentView === 'dashboard' && (
            <div className="space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                 <StatBox icon={<Activity />} label="Compute Output" value={`${liveHashrate.toFixed(1)} TH/s`} color="text-emerald-400" />
                 <StatBox icon={<Lightning />} label="Power Load" value={`${isMining ? configPower : 0} W`} color="text-blue-400" />
                 <StatBox icon={<DollarSign />} label="Net 24h Yield" value={`$${estimatedProfit.toFixed(2)}`} color="text-emerald-500" />
                 <StatBox icon={<Layers />} label="Vault Reserves" value={stats.totalMined.toFixed(8)} color="text-purple-400" />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                 <div className="lg:col-span-8 glass rounded-[3rem] p-12 border-slate-800/80">
                    <div className="flex items-center justify-between mb-12">
                       <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4"><TrendingUp className="text-emerald-500" /> Network Telemetry</h3>
                       <div className="px-4 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">Live Feed Connected</div>
                    </div>
                    <div className="h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                          <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '20px', padding: '16px' }} />
                          <Area type="monotone" dataKey="price" stroke="#10b981" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={4} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="lg:col-span-4 flex flex-col gap-8">
                    <div className="glass rounded-[3rem] p-10 border-slate-800/80 bg-black/40 shadow-inner flex flex-col h-[300px] relative overflow-hidden">
                       <div className="flex justify-between items-center mb-6">
                         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3"><TerminalIcon className="w-4 h-4" /> System Console</h3>
                         {isMining && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                       </div>
                       <div className="flex-1 overflow-hidden font-mono text-[12px] space-y-3 text-emerald-400/80 custom-scroll">
                          {terminalOutput.map((line, i) => (
                            <div key={i} className="animate-in slide-in-from-bottom-2 duration-300">
                               <span className="text-slate-700 mr-2">➜</span>{line}
                            </div>
                          ))}
                       </div>
                       <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                    <div className="glass rounded-[3rem] p-10 border-slate-800/80 flex-1 flex flex-col justify-center">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><Info className="w-4 h-4 text-emerald-500" /> Readiness Index</h3>
                       <div className="space-y-6">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-2xl font-black text-white mono tracking-tighter">{(Math.min(100, (stats.totalMined / WITHDRAW_THRESHOLD) * 100)).toFixed(1)}%</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Payout Threshold</span>
                          </div>
                          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                             <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ width: `${Math.min(100, (stats.totalMined / WITHDRAW_THRESHOLD) * 100)}%` }} />
                          </div>
                          <button onClick={() => setCurrentView('wallet')} className="w-full py-5 mt-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all shadow-xl">Initiate Settlement</button>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {currentView === 'network' && (
            <div className="space-y-10 max-w-7xl mx-auto animate-in zoom-in duration-500">
               <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Hardware Cluster</h2>
                    <p className="text-slate-500 font-medium uppercase text-xs mt-3 tracking-widest">Global Relay Protocol: {user.plan} Active</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => addTerminalLine("Cluster synchronization broadcast complete.")} className="px-8 py-4 glass rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 hover:text-white transition-all"><RotateCw className="w-4 h-4" /> Sync All</button>
                    <button onClick={() => setIsSettingsOpen(true)} className="px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-500 hover:text-white transition-all"><Wrench className="w-4 h-4" /> Hardware Settings</button>
                  </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {[...Array(configWorkers)].map((_, i) => (
                    <RigMachine key={i} index={i} override={rigOverrides[i]} isMining={isMining} hashrate={globalEffectiveHashrate / configWorkers} onAction={handleRigAction} />
                  ))}
               </div>
            </div>
          )}

          {currentView === 'wallet' && (
             <div className="space-y-10 max-w-5xl mx-auto pb-16 animate-in slide-in-from-bottom duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-5 glass rounded-[3.5rem] p-12 border-slate-800/80 bg-gradient-to-br from-emerald-500/10 to-transparent flex flex-col justify-between h-[480px]">
                     <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-12 italic">Ledger Reserves</h3>
                     <div>
                       <div className="flex items-center gap-4 mb-4">
                         <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"><DollarSign className="w-8 h-8 text-emerald-500" /></div>
                         <p className="text-6xl font-black text-white mono tracking-tighter">{stats.totalMined.toFixed(8)}</p>
                       </div>
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Simulated USD: ${(stats.totalMined * market.price).toLocaleString()}</p>
                     </div>
                     <div className="mt-12 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] relative overflow-hidden group">
                        <div className="absolute inset-0 caution-pattern opacity-10" />
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 relative"><ShieldCheck className="w-4 h-4" /> Settlement Engine: SECURE</p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed relative">Automated relays are synchronized with your hardware cluster for instant clearing.</p>
                     </div>
                  </div>

                  <div className="lg:col-span-7 glass rounded-[3.5rem] p-12 border-slate-800/80 flex flex-col h-[480px]">
                     <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-12 italic">Relay Configuration</h3>
                     <div className="space-y-10 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Target Vault</label>
                            <div className="relative">
                              <select 
                                value={selectedWallet} 
                                onChange={(e) => setSelectedWallet(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800/80 rounded-2xl py-6 px-8 text-white font-bold text-sm appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer transition-all"
                              >
                                {SUPPORTED_WALLETS.map(w => <option key={w} value={w}>{w}</option>)}
                              </select>
                              <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 w-6 h-6 pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Destination Address</label>
                            <div className="relative group">
                               <input type="text" value={btcAddress} onChange={(e) => setBtcAddress(e.target.value)} placeholder="bc1q..." className="w-full bg-slate-950 border border-slate-800/80 rounded-2xl py-6 px-8 text-white mono text-sm focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-800" />
                               <QrCode className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-700 group-hover:text-emerald-500 w-6 h-6 transition-colors" />
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-end">
                          <button 
                            onClick={handleWithdraw} 
                            disabled={stats.totalMined < WITHDRAW_THRESHOLD || isWithdrawing} 
                            className={`w-full py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-4 ${isWithdrawing ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'}`}
                          >
                            {isWithdrawing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Lightning className="w-5 h-5" />}
                            {isWithdrawing ? 'COMMITTING RELAY...' : 'TRIGGER INSTANT PAYOUT'}
                          </button>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="glass rounded-[3.5rem] p-12 border-slate-800/80">
                   <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-12 flex items-center gap-4 italic"><History className="w-5 h-5" /> Finalized Transaction History</h3>
                   <div className="space-y-6">
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center gap-10 p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/40 hover:border-emerald-500/20 transition-all group">
                           <div className={`p-5 rounded-2xl ${tx.type === 'withdrawal' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'} group-hover:scale-110 transition-transform`}>
                              {tx.type === 'withdrawal' ? <ArrowUpRight className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
                           </div>
                           <div className="flex-1">
                              <p className="text-lg font-black text-white uppercase tracking-tight italic">{tx.type} Finalized</p>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{tx.timestamp.toLocaleString()} • Relay: {tx.walletProvider || 'Network'}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-2xl font-black text-white mono tracking-tighter">{tx.amount.toFixed(8)} BTC</p>
                              <div className="flex items-center gap-2 justify-end mt-1">
                                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest tracking-[0.2em]">Confirmed</span>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              </div>
                           </div>
                        </div>
                      ))}
                      {transactions.length === 0 && <p className="text-center py-24 text-slate-700 font-black uppercase text-sm tracking-[0.8em] opacity-40 italic">No Activity Logs Detected</p>}
                   </div>
                </div>
             </div>
          )}

          {currentView === 'market' && (
             <div className="max-w-6xl mx-auto space-y-14 animate-in fade-in duration-700 py-10">
                <div className="flex justify-between items-end">
                   <div>
                     <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Industrial Insights</h2>
                     <p className="text-slate-500 font-bold uppercase text-[11px] mt-4 tracking-[0.3em] flex items-center gap-3"><Globe className="w-4 h-4 text-emerald-500" /> Agency: Gemini-3-Flash | Global Sync: ACTIVE</p>
                   </div>
                   <button onClick={() => { setIsAIAnalyzing(true); getMarketAnalysis(market.price).then(res => { setAiAnalysis(res); setIsAIAnalyzing(false); addTerminalLine("Deep-market analysis refreshed."); }); }} className="p-6 glass rounded-2xl text-emerald-500 hover:text-white transition-all shadow-2xl group">
                     <RefreshCw className={`w-8 h-8 group-hover:rotate-180 transition-transform duration-500 ${isAIAnalyzing ? 'animate-spin' : ''}`} />
                   </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                   <div className="lg:col-span-8 glass rounded-[4rem] p-16 border-slate-800/80 bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-12 text-emerald-500/5 group-hover:scale-110 transition-transform"><Database className="w-48 h-48" /></div>
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-12 flex items-center gap-4 relative"><Sparkles className="w-5 h-5 text-emerald-500" /> AI-Driven Profitability Report</h3>
                      {isAIAnalyzing ? (
                        <div className="space-y-8 animate-pulse relative">
                          <div className="h-6 bg-slate-800/80 rounded-full w-4/5"></div>
                          <div className="h-6 bg-slate-800/80 rounded-full w-full"></div>
                          <div className="h-6 bg-slate-800/80 rounded-full w-3/4"></div>
                        </div>
                      ) : (
                        <p className="text-slate-200 text-2xl leading-relaxed whitespace-pre-wrap font-medium relative italic">"{aiAnalysis?.summary || "Sync with Gemini for real-world network profitability analysis stream."}"</p>
                      )}
                   </div>
                   <div className="lg:col-span-4 glass rounded-[4rem] p-16 border-slate-800/80 text-center flex flex-col justify-center bg-black/40">
                      <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-12 italic">Network Sentiment</h3>
                      <div className={`w-44 h-44 mx-auto rounded-full border-[14px] flex items-center justify-center transition-all duration-1000 ${aiAnalysis?.sentiment === 'Bullish' ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'border-slate-800'}`}>
                         <span className="text-2xl font-black uppercase tracking-tighter italic">{aiAnalysis?.sentiment || 'OFFLINE'}</span>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {currentView === 'referral' && (
            <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in duration-700 py-12">
               <div className="text-center space-y-6 mb-20">
                 <h2 className="text-6xl font-black text-white uppercase tracking-tighter italic">Affiliate Network</h2>
                 <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">Expand the cluster hash-rate. Goal: 10 active referees for a <span className="text-emerald-500">0.00001 BTC</span> instant bonus.</p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="glass rounded-[4rem] p-16 border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-12 text-emerald-500/5"><Users className="w-48 h-48" /></div>
                     <div className="relative">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-12 italic">Your Performance</h3>
                        <div className="space-y-10">
                           <div className="flex justify-between items-baseline">
                              <p className="text-6xl font-black text-white mono tracking-tighter">{user.referralCount}</p>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Target: {REFERRAL_GOAL}</span>
                           </div>
                           <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.3)]" style={{ width: `${(user.referralCount / REFERRAL_GOAL) * 100}%` }} />
                           </div>
                           <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <Trophy className={`w-6 h-6 ${user.referralCount >= REFERRAL_GOAL ? 'text-emerald-500' : 'text-slate-700'}`} />
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bonus Progress</span>
                              </div>
                              <span className={`text-[11px] font-black uppercase ${user.referralCount >= REFERRAL_GOAL ? 'text-emerald-500' : 'text-slate-700'}`}>
                                 {user.referralCount >= REFERRAL_GOAL ? 'Reward Active' : `${REFERRAL_GOAL - user.referralCount} Nodes to go`}
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="glass rounded-[4rem] p-16 border-slate-800/80 flex flex-col h-full bg-black/40">
                     <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-12 italic">Onboarding Terminal</h3>
                     <div className="space-y-10">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-4">Unique Invite Relay</label>
                           <div className="flex gap-4">
                              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl py-5 px-8 text-white mono text-xs truncate">
                                 mineforprofit.net/relay/node-{(Math.random()*10000).toFixed(0)}
                              </div>
                              <button onClick={() => addTerminalLine("Relay link copied to clipboard.")} className="p-5 bg-white text-black rounded-2xl hover:bg-emerald-500 hover:text-white transition-all">
                                 <Copy className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                        <div className="pt-10 border-t border-slate-800/60">
                           <p className="text-xs text-slate-500 leading-relaxed mb-8 italic">Invite institutional partners to join the cluster. Each successful node activation contributes to your global hash-power bonus and instant BTC settlement rewards.</p>
                           <button onClick={() => { setUser(prev => ({ ...prev, referralCount: prev.referralCount + 1 })); addTerminalLine("Mock referee node joined the cluster."); }} className="w-full py-6 glass border-slate-800 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/5 transition-all italic">Simulate Node Join</button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {currentView === 'plans' && (
             <div className="space-y-16 max-w-7xl mx-auto py-16 animate-in slide-in-from-bottom duration-700">
               <div className="text-center space-y-6 mb-20">
                 <h2 className="text-6xl font-black text-white uppercase tracking-tighter italic">Infrastructure Contracts</h2>
                 <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">Scale your mining fleet with dedicated cloud-hardware allocations.</p>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {(Object.keys(planSettings) as PlanType[]).map((pType) => {
                    const p = planSettings[pType];
                    const isCurrent = user.plan === pType;
                    return (
                      <div key={pType} className={`glass rounded-[4rem] p-16 border-slate-800 relative flex flex-col transition-all group hover:translate-y-[-12px] ${isCurrent ? 'ring-2 ring-emerald-500/50' : ''}`}>
                         {isCurrent && <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-emerald-500 text-white rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl italic">Active Contract</div>}
                         <div className={`w-20 h-20 ${p.color} rounded-[2.5rem] flex items-center justify-center mb-12 shadow-2xl ${p.glow} group-hover:scale-110 transition-transform`}><Rocket className="text-white w-10 h-10" /></div>
                         <div className="mb-10">
                           <h4 className="text-3xl font-black text-white mb-3 tracking-tighter italic uppercase">{p.label}</h4>
                           <div className="flex items-baseline gap-3">
                              <span className="text-5xl font-black text-white mono tracking-tighter">${p.price}</span>
                              <span className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em]">/ mo lease</span>
                           </div>
                         </div>
                         <div className="space-y-8 mb-12 p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/40 flex-1">
                            <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Allocation <span className="text-white mono">{p.hashAllocation}</span></div>
                            <div className="h-px bg-slate-800/50" />
                            <div className="space-y-4">
                               <div className="flex justify-between text-[11px]"><span className="text-slate-600 uppercase font-bold tracking-widest">Hardware Ops</span><span className="text-white font-black">${p.breakdown.hardware}</span></div>
                               <div className="flex justify-between text-[11px]"><span className="text-slate-600 uppercase font-bold tracking-widest">Network Protocol</span><span className="text-white font-black">${p.breakdown.net}</span></div>
                            </div>
                         </div>
                         <button onClick={() => switchPlan(pType)} disabled={isCurrent} className={`w-full py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all ${isCurrent ? 'bg-slate-900 text-slate-700 cursor-default' : 'bg-white text-black hover:bg-emerald-500 hover:text-white shadow-2xl shadow-black/20 italic'}`}>
                           {isCurrent ? 'Current Strategy' : 'Authorize Lease'}
                         </button>
                      </div>
                    );
                  })}
               </div>
             </div>
          )}
        </div>
      </main>

      {/* Industrial Configuration Modal */}
      {isSettingsOpen && (
        <Modal title="Cluster Protocol" icon={<Wrench className="text-emerald-500" />} onClose={() => setIsSettingsOpen(false)}>
           <div className="space-y-12">
              <ConfigSlider label="Node Capacity" value={configWorkers} min={1} max={planConfig.maxNodes} unit="Active Units" onChange={setConfigWorkers} />
              <ConfigSlider label="Processing Limit" value={configHashrate} min={1} max={planConfig.maxHash} unit="TH/s" onChange={setConfigHashrate} />
              <ConfigSlider label="Thermal Guard" value={configPower} min={120} max={planConfig.maxPower} step={100} unit="Watts" onChange={setConfigPower} color="accent-emerald-500" />
              <button onClick={() => { setIsSettingsOpen(false); addTerminalLine("Global firmware broadcast successful."); }} className="w-full py-7 bg-emerald-500 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-emerald-600 transition-all italic">Commit Global Firmware</button>
           </div>
        </Modal>
      )}
    </div>
  );
};

// UI Components
const NavItem: React.FC<{ active: boolean, collapsed: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, collapsed, icon, label, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-5 p-4 rounded-2xl transition-all group ${active ? 'bg-emerald-500/10 text-emerald-500 border-r-4 border-emerald-500 shadow-xl shadow-emerald-500/5' : 'text-slate-500 hover:text-white hover:bg-white/5'} ${collapsed ? 'justify-center' : ''}`}>
    {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
    {!collapsed && <span className="text-[13px] font-extrabold tracking-widest uppercase italic">{label}</span>}
  </button>
);

const StatBox: React.FC<{ icon: React.ReactNode, label: string, value: string, color: string }> = ({ icon, label, value, color }) => (
  <div className="glass p-10 rounded-[3.5rem] border-slate-800/80 group hover:border-emerald-500/20 transition-all hover:translate-y-[-8px] relative overflow-hidden bg-black/20">
    <div className={`p-4 bg-slate-900 rounded-2xl w-fit mb-10 ${color} border border-slate-800 group-hover:scale-110 transition-transform shadow-lg relative z-10`}>{icon}</div>
    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2.5 relative z-10 italic">{label}</p>
    <p className="text-4xl font-black text-white mono leading-none relative z-10 tracking-tighter">{value}</p>
    <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500 opacity-[0.02] -mr-10 -mb-10 rounded-full blur-[60px]" />
  </div>
);

const RigMachine: React.FC<{ 
  index: number, 
  override: RigOverride, 
  isMining: boolean, 
  hashrate: number, 
  onAction: (index: number, action: any, val?: any) => void
}> = ({ index, override, isMining, hashrate, onAction }) => {
  const [showActions, setShowActions] = useState(false);
  const rig = override || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100 };
  const isOff = rig.isPoweredOff;
  const isMaint = rig.isMaintenance;
  const isRest = rig.isRestarting;
  const temp = rig.temperature || 24;
  return (
    <div className={`p-10 rounded-[4rem] border transition-all relative overflow-hidden flex flex-col h-[380px] ${isOff || isMaint ? 'bg-slate-950/40 border-slate-900' : 'glass border-slate-800/80 hover:border-emerald-500/30'}`}>
      
      {/* Visual Maintenance State */}
      {isMaint && (
        <div className="absolute inset-0 z-20 caution-pattern backdrop-blur-[1px] flex items-center justify-center border-4 border-orange-500/20 rounded-[4rem]">
          <div className="text-center p-8 glass rounded-[2.5rem] border-orange-500/40 shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto animate-pulse mb-4" />
            <p className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic mb-6">Maint. Offline</p>
            <button onClick={() => onAction(index, 'maintenance')} className="px-8 py-3 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all">Resume</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-slate-600 font-black uppercase tracking-[0.2em] italic">Unit ID-{(index+1).toString().padStart(3, '0')}</p>
          <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${isOff ? 'text-slate-800' : isRest ? 'text-blue-500 animate-pulse' : isMaint ? 'text-orange-500' : (isMining ? 'text-emerald-500' : 'text-slate-600')}`}>
            {isOff ? 'Shutdown' : isRest ? 'Restarting' : isMaint ? 'Maintenance' : (isMining ? 'Active' : 'Standby')}
          </p>
        </div>
        <div className="relative z-30">
          <button onClick={() => setShowActions(!showActions)} className="p-3.5 rounded-2xl text-slate-500 hover:bg-white/10 hover:text-white transition-all"><MoreVertical className="w-6 h-6" /></button>
          {showActions && (
            <div className="absolute right-0 top-14 w-60 glass rounded-[2rem] border border-slate-700 shadow-3xl z-[150] p-5 space-y-3 animate-in fade-in zoom-in duration-200">
               <button onClick={() => { onAction(index, 'togglePower'); setShowActions(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-slate-300"><Power className={`w-5 h-5 ${isOff ? 'text-slate-600' : 'text-emerald-500'}`} /> {isOff ? 'Power On' : 'Power Off'}</button>
               <button onClick={() => { onAction(index, 'restart'); setShowActions(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-slate-300"><RefreshCcw className="w-5 h-5 text-blue-500" /> Soft Reboot</button>
               <button onClick={() => { onAction(index, 'maintenance'); setShowActions(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-slate-300"><Wrench className={`w-5 h-5 ${isMaint ? 'text-orange-500' : 'text-slate-600'}`} /> Maintenance</button>
               <div className="pt-4 border-t border-slate-800/60 space-y-3">
                 <div className="flex justify-between items-center text-[9px] font-black text-slate-600 uppercase italic"><span>Flow Cap</span><span className="text-white mono">{rig.powerLimit}%</span></div>
                 <input type="range" min="0" max="100" value={rig.powerLimit} onChange={(e) => onAction(index, 'setPowerLimit', parseInt(e.target.value))} className="w-full accent-emerald-500 bg-slate-900 h-2 rounded-full cursor-pointer appearance-none" />
               </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center gap-8 p-10 bg-black/40 rounded-[3rem] border border-slate-800/40 mb-10 relative group">
         <span className={`w-20 h-20 ${!isOff && !isMaint && !isRest && isMining ? 'animate-fan-spin text-emerald-500' : 'text-slate-900'}`}><Fan className="w-full h-full" /></span>
         <div className="w-full space-y-3.5">
            <div className="flex justify-center gap-3">
               {[...Array(4)].map((_, i) => (
                 <div key={i} className={`w-6 h-2 rounded-full ${!isOff && !isMaint && !isRest && isMining ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-slate-900'}`} />
               ))}
            </div>
         </div>
         <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[11px] font-black text-slate-700 uppercase mb-1.5 italic">Compute Output</p>
          <p className={`mono text-2xl font-black transition-colors ${!isOff && !isMaint && !isRest && isMining ? 'text-white' : 'text-slate-800'}`}>{!isOff && !isMaint && !isRest && isMining ? (hashrate * (rig.powerLimit / 100)).toFixed(1) : '0.0'} <span className="text-[12px] opacity-40">TH/s</span></p>
        </div>
        <div className="text-right">
           <p className="text-[11px] font-black text-slate-700 uppercase mb-1.5 italic">Thermal</p>
           <p className={`text-2xl font-black mono tracking-tighter ${temp > 68 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>{temp.toFixed(0)}°C</p>
        </div>
      </div>
    </div>
  );
};

const Modal: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, onClose: () => void }> = ({ title, icon, children, onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
    <div className="relative glass w-full max-w-2xl rounded-[4rem] p-16 border-slate-800 shadow-3xl animate-in zoom-in duration-500">
      <div className="flex justify-between items-center mb-14">
        <h2 className="text-4xl font-black flex items-center gap-8 text-white uppercase tracking-tighter italic"><div className="p-5 bg-slate-900 rounded-[2rem] border border-slate-800/80 shadow-xl">{icon}</div>{title}</h2>
        <button onClick={onClose} className="p-4 hover:bg-slate-800 rounded-full text-slate-600 transition-colors"><X className="w-12 h-12" /></button>
      </div>
      {children}
    </div>
  </div>
);

const ConfigSlider: React.FC<{ label: string, value: number, min: number, max: number, step?: number, unit: string, onChange: (v: number) => void, color?: string }> = ({ label, value, min, max, step = 1, unit, onChange, color = "accent-emerald-500" }) => (
  <div className="space-y-8">
    <div className="flex justify-between items-center"><label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] italic">{label}</label><span className="mono font-black text-3xl text-white tracking-tighter">{value} <span className="text-sm text-slate-600 font-black uppercase">{unit}</span></span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className={`w-full ${color} bg-slate-900 h-4 rounded-full cursor-pointer appearance-none shadow-inner border-2 border-white/5`} />
  </div>
);

export default App;
