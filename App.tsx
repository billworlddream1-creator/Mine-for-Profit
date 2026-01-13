
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
  CheckCircle, Fingerprint, Eye, EyeOff, Camera, Edit3, Save, WifiOff, ArrowLeft,
  Monitor
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { MiningStats, MarketData, ChartPoint, AIAnalysis, ActivityLog, User as UserType, PlanType } from './types';
import { getMarketAnalysis } from './services/gemini';

declare var confetti: any;

const STORAGE_KEY = 'mine_for_profit_enterprise_v3';
const REMEMBER_ME_KEY = 'mine_for_profit_remember_me';
const MINING_SESSION_DURATION = 12 * 60 * 60 * 1000; 
const REFERRAL_GOAL = 10;
const REFERRAL_REWARD = 0.00001;

const THEME_COLORS = [
  { name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', shadow: 'shadow-emerald-500/20' },
  { name: 'Amber', hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', shadow: 'shadow-amber-500/20' },
  { name: 'Cyan', hex: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', shadow: 'shadow-cyan-500/20' },
  { name: 'Rose', hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500', shadow: 'shadow-rose-500/20' },
  { name: 'Violet', hex: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500', shadow: 'shadow-violet-500/20' },
  { name: 'Sky', hex: '#0ea5e9', bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', shadow: 'shadow-sky-500/20' },
];

const BITCOIN_FACTS = [
  "Satoshi Nakamoto mined the first block (Genesis Block) in 2009.",
  "There will only ever be 21 million Bitcoins in existence.",
  "The smallest unit of Bitcoin is called a 'Satoshi'.",
  "The last Bitcoin is estimated to be mined around the year 2140.",
  "Pizza Day: On May 22, 2010, 10,000 BTC were used to buy two pizzas.",
  "Bitcoin's block time averages around 10 minutes.",
  "Difficulty adjustments happen every 2,016 blocks (roughly 2 weeks)."
];

const SUPPORTED_WALLETS = [
  "Binance Global", "Trust Wallet Pro", "Coinbase Prime", "MetaMask Enterprise",
  "OKX Multi-Sig", "Ledger Cold Vault", "Trezor Hardware", "Exodus Desktop"
];

const INITIAL_STATS: MiningStats = {
  hashrate: 1.0, totalMined: 0.00000000, activeWorkers: 1, 
  powerConsumption: 120, efficiency: 120, dailyProfitUSD: 0
};

const INITIAL_MARKET: MarketData = {
  price: 64230.45, change24h: 2.4, marketCap: "1.26T", volume24h: "35.2B"
};

const DEFAULT_PLAN_SETTINGS: Record<PlanType, { 
  maxNodes: number; maxHash: number; maxPower: number; bonus: number; 
  label: string; price: number; breakdown: { hardware: number; cooling: number; net: number; tax: number };
  hashAllocation: string; features: string[]; color: string; glow: string;
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
  isPoweredOff: boolean; isRestarting: boolean; isMaintenance: boolean;
  temperature: number; powerLimit: number; 
  errorDetail?: string;
  type?: 'ASIC' | 'GPU';
}

interface Transaction {
  id: string; type: 'payout' | 'bonus' | 'withdrawal' | 'referral_boost';
  amount: number; timestamp: Date; status: 'confirmed' | 'pending';
  toAddress?: string; walletProvider?: string;
}

const App: React.FC = () => {
  // Connectivity Logic
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // App Logic States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Starting system...');
  const [currentFact, setCurrentFact] = useState(BITCOIN_FACTS[0]);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [authStatusMessage, setAuthStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [theme, setTheme] = useState(THEME_COLORS[0]);

  const [currentView, setCurrentView] = useState<'dashboard' | 'wallet' | 'market' | 'network' | 'plans' | 'referral'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [stats, setStats] = useState<MiningStats>(INITIAL_STATS);
  const [market, setMarket] = useState<MarketData>(INITIAL_MARKET);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartMetric, setChartMetric] = useState<'price' | 'hashrate'>('price');
  const [isMining, setIsMining] = useState(false);
  const [miningSessionStart, setMiningSessionStart] = useState<number | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['>> Mine for Profit System Initialized.', '>> Establishing secure handshake with pool...']);
  const [user, setUser] = useState<UserType>({
    id: 'admin_01', name: 'EliteMiner', email: 'admin@mineforprofit.net',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ProfitMiner',
    isLoggedIn: true, highestHashrate: 1.0, plan: 'Free',
    referralCount: 4, referralBonusApplied: false
  });

  // Profile Edit Temp States
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editAvatar, setEditAvatar] = useState(user.avatar);

  const [btcAddress, setBtcAddress] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(SUPPORTED_WALLETS[0]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rigOverrides, setRigOverrides] = useState<Record<number, RigOverride>>({});
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Auth Field States
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [planSettings, setPlanSettings] = useState(DEFAULT_PLAN_SETTINGS);
  const [configWorkers, setConfigWorkers] = useState(1);
  const [configHashrate, setConfigHashrate] = useState(10.0);
  const [configPower, setConfigPower] = useState(450);

  const planConfig = planSettings[user.plan];
  const miningIntervalRef = useRef<any>(null);

  // Connectivity Monitor
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addTerminalLine("Network connection restored. Re-establishing secure handshake...");
    };
    const handleOffline = () => {
      setIsOnline(false);
      addTerminalLine("ERROR: Local network connection lost. Mining suspended.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Boot Sequence Logic
  useEffect(() => {
    if (!isBooting) return;

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
        if (currentIdx % 2 === 0) setCurrentFact(BITCOIN_FACTS[Math.floor(Math.random() * BITCOIN_FACTS.length)]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsBooting(false), 800);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isBooting]);

  const getSalutation = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const addTerminalLine = (msg: string) => {
    setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));
  };

  const updateRigOverride = (index: number, updates: Partial<RigOverride>) => {
    setRigOverrides(prev => ({
        ...prev,
        [index]: {
            ...(prev[index] || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100, type: 'ASIC' }),
            ...updates
        }
    }));
  };

  const handleRigAction = (index: number, action: 'togglePower' | 'restart' | 'maintenance' | 'setPowerLimit' | 'switchType', value?: any) => {
    const rig = rigOverrides[index] || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100, type: 'ASIC' };
    switch(action) {
      case 'togglePower':
        updateRigOverride(index, { isPoweredOff: !rig.isPoweredOff, errorDetail: undefined });
        addTerminalLine(`Node ID-${index + 1} power state updated.`);
        break;
      case 'restart':
        updateRigOverride(index, { isRestarting: true, errorDetail: undefined });
        addTerminalLine(`Node ID-${index + 1} soft rebooting...`);
        setTimeout(() => {
          updateRigOverride(index, { isRestarting: false, temperature: 28 });
          addTerminalLine(`Node ID-${index + 1} online.`);
        }, 2000);
        break;
      case 'maintenance':
        updateRigOverride(index, { isMaintenance: !rig.isMaintenance, errorDetail: undefined });
        addTerminalLine(`Node ID-${index + 1} maintenance toggled.`);
        break;
      case 'setPowerLimit':
        updateRigOverride(index, { powerLimit: value });
        break;
      case 'switchType':
        const nextType = rig.type === 'ASIC' ? 'GPU' : 'ASIC';
        updateRigOverride(index, { type: nextType });
        addTerminalLine(`Node ID-${index + 1} provisioned as ${nextType} unit.`);
        break;
    }
  };

  const randomizeTheme = () => {
    const random = THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
    setTheme(random);
  };

  const startAppSequence = () => {
    randomizeTheme();
    setIsAuthenticated(true);
    setIsBooting(true);
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthStatusMessage(null);

    if (authView === 'forgot') {
      setAuthStatusMessage({ text: `Instructions sent to ${authEmail}. Check your inbox.`, type: 'success' });
      setTimeout(() => {
        setAuthView('reset');
        setAuthStatusMessage(null);
      }, 2500);
      return;
    }
    
    if (authView === 'reset') {
      setAuthStatusMessage({ text: "Security credentials updated. Access granted.", type: 'success' });
      setTimeout(() => {
        setAuthView('login');
        setAuthStatusMessage(null);
        startAppSequence();
      }, 1500);
      return;
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, authEmail);
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }

    startAppSequence();
    addTerminalLine(`User authenticated successfully.`);
  };

  const handleGoogleLogin = () => {
    startAppSequence();
    addTerminalLine(`Google login successful.`);
  };

  const switchPlan = (plan: PlanType) => {
    setUser(prev => ({ ...prev, plan }));
    addTerminalLine(`Infrastructure contract migrated to ${plan} protocol.`);
  };

  const saveProfile = () => {
    setUser(prev => ({
      ...prev,
      name: editName,
      email: editEmail,
      avatar: editAvatar
    }));
    setIsProfileOpen(false);
    addTerminalLine("Operator profile updated.");
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
    if (!isMining || !isOnline) return 0;
    const rigHashBase = globalEffectiveHashrate / configWorkers;
    let total = 0;
    for (let i = 0; i < configWorkers; i++) {
      const override = rigOverrides[i] || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100, type: 'ASIC' };
      if (!override.isPoweredOff && !override.isRestarting && !override.isMaintenance && !override.errorDetail) {
        // GPU mining for Bitcoin is extremely inefficient, so we scale it down drastically for simulation logic 
        // while showing MH/s on UI
        const typeMultiplier = override.type === 'GPU' ? 0.01 : 1.0;
        total += rigHashBase * (override.powerLimit / 100) * typeMultiplier;
      }
    }
    return total;
  }, [isMining, isOnline, globalEffectiveHashrate, configWorkers, rigOverrides]);

  const estimatedProfit = useMemo(() => {
    if (!isMining || !isOnline) return 0;
    const dailyCost = (configPower / 1000) * 24 * 0.15;
    return Math.max(0, ((liveHashrate / 145) * 0.0006 * planConfig.bonus * market.price) - dailyCost);
  }, [liveHashrate, market.price, isMining, isOnline, planConfig, configPower]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_ME_KEY);
    if (rememberedEmail) {
      setAuthEmail(rememberedEmail);
      setRememberMe(true);
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.user) {
        setUser(parsed.user);
        setEditName(parsed.user.name);
        setEditEmail(parsed.user.email);
        setEditAvatar(parsed.user.avatar);
      }
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
    if (!isAuthenticated || isBooting) return;
    let sessionInterval: any = null;
    if (isMining && isOnline) {
      if (!miningSessionStart) {
        setMiningSessionStart(Date.now());
        addTerminalLine('Tunnel handshake verified.');
      }
      miningIntervalRef.current = setInterval(() => {
        const perSec = (liveHashrate / 145) * (0.0006 / 86400) * planConfig.bonus;
        setStats(prev => ({ ...prev, totalMined: prev.totalMined + perSec }));
        const priceShift = (Math.random() - 0.5) * 8;
        setMarket(prev => ({ ...prev, price: prev.price + priceShift }));
        
        // Update Chart Data with new point periodically
        setChartData(prev => {
          const last = prev[prev.length - 1];
          const newPoint = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            price: last.price + priceShift,
            hashrate: 150 + Math.random() * 10
          };
          return [...prev.slice(1), newPoint];
        });

        setRigOverrides(prev => {
          const next = { ...prev };
          for (let i = 0; i < configWorkers; i++) {
            const rig = next[i] || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100, type: 'ASIC' };
            let targetTemp = 24;
            
            if (!rig.isPoweredOff && !rig.isMaintenance && !rig.isRestarting && !rig.errorDetail) {
              targetTemp = 35 + (rig.powerLimit * 0.5) + (Math.random() * 5);
              
              // Simulate hardware failures
              if (rig.temperature > 85) {
                 next[i] = { ...rig, errorDetail: 'Thermal Exceeded: Emergency safety shutdown engaged due to core temperature limit breach.' };
                 addTerminalLine(`CRITICAL: Node ID-${i + 1} thermal shutdown.`);
              } else if (Math.random() < 0.0005) {
                 const errors = [
                   'Hashboard Failure: ASIC communication link lost on Slot 2.',
                   'Power Supply Unit Fault: Voltage instability detected in primary rail.',
                   'Network Stack Error: Packet loss exceeding 45% on local bus.'
                 ];
                 next[i] = { ...rig, errorDetail: errors[Math.floor(Math.random() * errors.length)] };
                 addTerminalLine(`ERROR: Node ID-${i + 1} hardware failure.`);
              }
            }
            
            // Cool down if off or error
            if (rig.isPoweredOff || rig.errorDetail) {
              targetTemp = 24;
            }

            next[i] = { ...next[i] || rig, temperature: rig.temperature + (targetTemp - rig.temperature) * 0.05 };
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
  }, [isMining, isOnline, liveHashrate, planConfig, configWorkers, miningSessionStart, isAuthenticated, isBooting]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      user, stats, btcAddress, selectedWallet, transactions, rigOverrides, miningSessionStart,
      config: { workers: configWorkers, hash: configHashrate, power: configPower }
    }));
  }, [user, stats, btcAddress, selectedWallet, transactions, rigOverrides, configWorkers, configHashrate, configPower]);

  const handleWithdraw = async () => {
    if (stats.totalMined < WITHDRAW_THRESHOLD) return addTerminalLine(`Insufficient liquidity. Required: ${WITHDRAW_THRESHOLD} BTC.`);
    if (!btcAddress) return addTerminalLine("Configure vault destination first.");
    if (!isOnline) return addTerminalLine("Settlement failed: No active internet connection.");
    
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

  // Auth Screen Component
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#020617] p-6 relative">
         <div className="absolute inset-0 hardware-grid opacity-10" />
         <div className="w-full max-w-md glass rounded-[3rem] p-12 border-slate-800/80 animate-in fade-in zoom-in duration-500 relative z-10 text-left">
            <div className="text-center mb-10">
               <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <UserCircle className="text-slate-300 w-8 h-8" />
               </div>
               <h2 className="text-3xl font-black text-white italic tracking-tighter">
                 {authView === 'login' ? 'Welcome Back' : 
                  authView === 'signup' ? 'Join Us' : 
                  authView === 'forgot' ? 'Vault Recovery' : 'Identify New Cipher'}
               </h2>
               <p className="text-slate-500 text-xs font-bold mt-2 tracking-widest uppercase">
                 {authView === 'login' ? 'Sign in to your account' : 
                  authView === 'signup' ? 'Create a new operator account' : 
                  authView === 'forgot' ? 'Enter email for reset link' : 'Update your security credentials'}
               </p>
            </div>

            {authStatusMessage && (
              <div className={`mb-6 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest italic text-center animate-in slide-in-from-top duration-300 ${authStatusMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                {authStatusMessage.text}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-4">
                    {authView === 'reset' ? 'Verification Token' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 w-4 h-4" />
                    <input 
                      type={authView === 'reset' ? 'text' : 'email'} 
                      required 
                      value={authEmail} 
                      onChange={(e) => setAuthEmail(e.target.value)}
                      disabled={authView === 'reset'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-14 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-800 disabled:opacity-50"
                      placeholder={authView === 'reset' ? 'Session Syncing...' : "operator@mineforprofit.net"}
                    />
                  </div>
               </div>

               {(authView === 'login' || authView === 'signup' || authView === 'reset') && (
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-4">
                      {authView === 'reset' ? 'New Password' : 'Password'}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 w-4 h-4" />
                      <input 
                        type={showPass ? "text" : "password"} required value={authPass} onChange={(e) => setAuthPass(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-14 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-800"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-400">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {authView === 'login' && (
                      <div className="flex items-center justify-between px-4 mt-4">
                         <label className="flex items-center gap-3 cursor-pointer group">
                           <div className={`w-5 h-5 rounded-md border border-slate-800 flex items-center justify-center transition-all ${rememberMe ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-950 group-hover:border-slate-700'}`}>
                              {rememberMe && <Check className="w-3 h-3 text-white" />}
                           </div>
                           <input type="checkbox" className="hidden" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remember Me</span>
                         </label>
                         <button 
                          type="button" 
                          onClick={() => { setAuthView('forgot'); setAuthStatusMessage(null); }}
                          className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-emerald-500 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}
                 </div>
               )}

               <button type="submit" className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-600 shadow-xl transition-all italic">
                  {authView === 'login' ? 'Authenticate' : 
                   authView === 'signup' ? 'Create Account' : 
                   authView === 'forgot' ? 'Request Recovery' : 'Finalize Reset'}
               </button>
            </form>

            {authView === 'login' && (
              <>
                <div className="mt-8 flex items-center gap-4">
                  <div className="h-px bg-slate-800 flex-1" />
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">OR</span>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>

                <button onClick={handleGoogleLogin} className="w-full mt-8 py-5 glass border-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-white/5 transition-all">
                   <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                   Secure Google Login
                </button>
              </>
            )}

            <p className="text-center mt-10 text-[10px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => {
              const next = authView === 'login' ? 'signup' : 'login';
              setAuthView(next);
              setAuthStatusMessage(null);
            }}>
               {authView === 'login' ? "New operator? Join the cluster" : 
                authView === 'signup' ? "Existing operator? Return to base" : 
                authView === 'forgot' || authView === 'reset' ? "Return to Login Console" : ""}
            </p>
         </div>
      </div>
    );
  }

  // Loading/Booting Screen Component
  if (isBooting) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden text-center">
        <div className="absolute inset-0 hardware-grid opacity-20" />
        <div className="relative z-10 flex flex-col items-center max-w-xl text-center px-6">
          <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 loading-glow">
             <div className="text-4xl">₿</div>
          </div>
          <h1 className="text-4xl font-black text-white italic mb-4 uppercase tracking-tighter">Mine<span className="text-emerald-500">Profit</span></h1>
          
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-6 border border-white/5">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
          </div>

          <div className="min-h-[80px] space-y-2">
            <p className="text-emerald-500/80 font-mono text-[11px] uppercase tracking-[0.3em] font-black">{loadingText}</p>
            <p className="text-slate-500 text-xs italic leading-relaxed animate-in fade-in duration-1000">"{currentFact}"</p>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-800 text-[10px] font-black uppercase tracking-[0.4em]">Node Protocol 7.2.1-Industrial</div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-[#020617] text-slate-100 selection:bg-emerald-500/30`}>
      <aside className={`sidebar-transition border-r border-slate-800/60 glass flex flex-col z-[100] ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-8 flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-4">
              <div className={`p-2.5 ${theme.bg} rounded-xl shadow-lg ${theme.shadow}`}><Cpu className="text-white w-6 h-6" /></div>
              <h1 className="font-black text-xl tracking-tighter text-white uppercase italic">Mine<span className={theme.text}>Profit</span></h1>
            </div>
          ) : (
             <div className={`w-10 h-10 ${theme.bg} rounded-xl mx-auto flex items-center justify-center shadow-lg ${theme.shadow}`}><Cpu className="text-white w-6 h-6" /></div>
          )}
        </div>

        <nav className="flex-1 px-5 space-y-3 py-10">
          <NavItem active={currentView === 'dashboard'} collapsed={sidebarCollapsed} icon={<LayoutDashboard />} label="Command Core" onClick={() => setCurrentView('dashboard')} theme={theme} />
          <NavItem active={currentView === 'network'} collapsed={sidebarCollapsed} icon={<Server />} label="Rig Cluster" onClick={() => setCurrentView('network')} theme={theme} />
          <NavItem active={currentView === 'wallet'} collapsed={sidebarCollapsed} icon={<WalletCards />} label="Payout Engine" onClick={() => setCurrentView('wallet')} theme={theme} />
          <NavItem active={currentView === 'market'} collapsed={sidebarCollapsed} icon={<BarChart3 />} label="Analytics" onClick={() => setCurrentView('market')} theme={theme} />
          <NavItem active={currentView === 'plans'} collapsed={sidebarCollapsed} icon={<Rocket />} label="Contracts" onClick={() => setCurrentView('plans')} theme={theme} />
          <NavItem active={currentView === 'referral'} collapsed={sidebarCollapsed} icon={<UserPlus />} label="Affiliates" onClick={() => setCurrentView('referral')} theme={theme} />
        </nav>

        <div className="p-6 border-t border-slate-800/50">
           {!sidebarCollapsed && (
             <button onClick={() => setIsProfileOpen(true)} className="w-full group flex items-center gap-3 p-3 glass rounded-xl border-slate-800/50 mb-4 animate-in slide-in-from-left duration-500 hover:bg-white/5 transition-all text-left">
               <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                 <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
               </div>
               <div className="flex-1 truncate text-left">
                 <p className="text-[10px] font-black text-white truncate uppercase italic">{user.name}</p>
                 <p className={`text-[8px] font-black ${theme.text} uppercase tracking-widest`}>OP LEVEL: 9</p>
               </div>
               <Edit3 className="w-3 h-3 text-slate-700 group-hover:text-white" />
             </button>
           )}
           <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center gap-4 text-slate-400 hover:text-white p-3.5 rounded-2xl hover:bg-white/5 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
             <Settings className="w-6 h-6" />
             {!sidebarCollapsed && <span className="text-sm font-bold uppercase tracking-wider">Settings</span>}
           </button>
           <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={`w-full flex items-center gap-4 text-slate-600 hover:text-white p-3.5 mt-2 rounded-2xl hover:bg-white/5 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
             {sidebarCollapsed ? <ChevronRight className="w-6 h-6" /> : <div className="flex items-center gap-3"><ChevronLeft className="w-6 h-6" /><span className="text-xs font-bold uppercase">Collapse</span></div>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-10 bg-black/40 border-b border-slate-800/40 flex items-center overflow-hidden whitespace-nowrap z-[40]">
           <div className="animate-ticker text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
             Welcome, Operator {user.name} • Status: {isOnline ? 'CONNECTED' : 'OFFLINE'} • Cluster Health: {isOnline ? 'Optimal' : 'CRITICAL'} • Active Hashrate: {liveHashrate.toFixed(2)} TH/s • Next Block estimated in 8.4m • 
             Welcome, Operator {user.name} • Status: {isOnline ? 'CONNECTED' : 'OFFLINE'} • Cluster Health: {isOnline ? 'Optimal' : 'CRITICAL'} • Active Hashrate: {liveHashrate.toFixed(2)} TH/s • Next Block estimated in 8.4m • 
           </div>
        </div>

        <header className="h-24 glass border-b border-slate-800/60 px-10 flex items-center justify-between z-50">
           <div className="flex items-center gap-14 text-left">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block italic">{getSalutation()}, Operator</span>
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${isMining && isOnline ? theme.bg : 'bg-red-500'} ${(isMining && isOnline) ? 'shadow-lg animate-pulse' : ''}`} style={{ boxShadow: (isMining && isOnline) ? `0 0 12px ${theme.hex}80` : '' }} />
                  <span className="text-sm font-black text-white uppercase tracking-tighter mono">
                    {isOnline ? (isMining ? 'Mining Active' : 'Standby Mode') : 'Connection Error'}
                  </span>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-800/50 hidden lg:block" />

              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block italic">Network Sync</span>
                <div className="flex items-center gap-2.5">
                  {isOnline ? (
                    <>
                      <div className="relative flex items-center justify-center">
                        <Wifi className="text-emerald-500 w-4 h-4 animate-pulse" />
                      </div>
                      <span className="text-xs font-black text-emerald-500 uppercase tracking-tighter italic">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="text-red-500 w-4 h-4" />
                      <span className="text-xs font-black text-red-500 uppercase tracking-tighter italic">Offline</span>
                    </>
                  )}
                </div>
              </div>

              <div className="h-10 w-px bg-slate-800/50 hidden lg:block" />

              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block italic">Market Index</span>
                <span className="text-xl font-black text-white mono tracking-tighter">${market.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
             <button 
                onClick={() => setIsMining(!isMining)} 
                disabled={!isOnline}
                className={`px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed ${isMining ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20' : `${theme.bg} text-white hover:opacity-90 shadow-lg italic`}`}
             >
               {isMining ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
               {isMining ? 'HALT CLUSTER' : 'INITIALIZE ASICS'}
             </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll p-10">
          {!isOnline && (
             <div className="mb-10 animate-in slide-in-from-top duration-500">
               <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 flex items-center gap-6 relative overflow-hidden group">
                 <div className="absolute inset-0 caution-pattern opacity-10" />
                 <div className="p-4 bg-red-500 text-white rounded-2xl shadow-xl shadow-red-500/20">
                   <WifiOff className="w-8 h-8" />
                 </div>
                 <div className="flex-1 relative z-10 text-left">
                   <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Connection Interrupted</h3>
                   <p className="text-sm text-slate-400 font-medium">Your hardware is unable to reach the mining pool. All active hashing has been automatically suspended to prevent block-sync errors.</p>
                 </div>
                 <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all relative z-10">Reconnect</button>
               </div>
             </div>
          )}

          {currentView === 'dashboard' && (
            <div className="space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700 text-left">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                 <StatBox icon={<Activity />} label="Compute Output" value={`${liveHashrate.toFixed(1)} TH/s`} theme={theme} />
                 <StatBox icon={<Lightning />} label="Power Load" value={`${isMining ? configPower : 0} W`} theme={theme} />
                 <StatBox icon={<DollarSign />} label="Net 24h Profit" value={`$${estimatedProfit.toFixed(2)}`} theme={theme} />
                 <StatBox icon={<Layers />} label="Vault Reserves" value={stats.totalMined.toFixed(8)} theme={theme} />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                 <div className="lg:col-span-8 glass rounded-[3rem] p-12 border-slate-800/80 relative">
                    <div className="flex items-center justify-between mb-12">
                       <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4 italic"><TrendingUp className={theme.text} /> Pulse Monitor</h3>
                       <div className="flex items-center gap-4">
                          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                             <button 
                               onClick={() => setChartMetric('price')} 
                               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${chartMetric === 'price' ? `${theme.bg} text-white shadow-lg` : 'text-slate-500 hover:text-slate-300'}`}
                             >
                               Price
                             </button>
                             <button 
                               onClick={() => setChartMetric('hashrate')} 
                               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${chartMetric === 'hashrate' ? `${theme.bg} text-white shadow-lg` : 'text-slate-500 hover:text-slate-300'}`}
                             >
                               Hashrate
                             </button>
                          </div>
                          <div className={`px-4 py-2 ${theme.bg} bg-opacity-5 rounded-xl border ${theme.border} border-opacity-10 ${theme.text} text-[10px] font-black uppercase tracking-widest italic ${isOnline ? 'animate-pulse' : ''}`}>{isOnline ? 'Live Sync: Active' : 'Offline Mode'}</div>
                       </div>
                    </div>
                    <div className="h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={theme.hex} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={theme.hex} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                          <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} domain={['auto', 'auto']} hide={false} />
                          <Tooltip 
                            content={<CustomChartTooltip />} 
                            cursor={{ stroke: theme.hex, strokeWidth: 1, strokeDasharray: '4 4' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey={chartMetric} 
                            stroke={isOnline ? theme.hex : '#475569'} 
                            fillOpacity={1} 
                            fill="url(#colorMain)" 
                            strokeWidth={4} 
                            animationDuration={600}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="lg:col-span-4 flex flex-col gap-8">
                    <div className="glass rounded-[3rem] p-10 border-slate-800/80 bg-black/40 shadow-inner flex flex-col h-[300px] relative overflow-hidden text-left">
                       <div className="flex justify-between items-center mb-6">
                         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3 italic"><TerminalIcon className="w-4 h-4" /> System Console</h3>
                         {isMining && isOnline && <div className={`w-2 h-2 rounded-full ${theme.bg} animate-pulse shadow-lg`} />}
                       </div>
                       <div className={`flex-1 overflow-hidden font-mono text-[12px] space-y-3 ${isOnline ? theme.text : 'text-slate-500'} opacity-80 custom-scroll`}>
                          {terminalOutput.map((line, i) => <div key={i} className="animate-in slide-in-from-bottom-2 duration-300"><span className="text-slate-700 mr-2">➜</span>{line}</div>)}
                       </div>
                       <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                    <div className="glass rounded-[3rem] p-10 border-slate-800/80 flex-1 flex flex-col justify-center text-left">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3 italic"><Info className={`w-4 h-4 ${theme.text}`} /> Payout readiness</h3>
                       <div className="space-y-6">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-2xl font-black text-white mono tracking-tighter italic">{(Math.min(100, (stats.totalMined / WITHDRAW_THRESHOLD) * 100)).toFixed(1)}%</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Progress to 0.0005 BTC</span>
                          </div>
                          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                             <div className={`h-full ${theme.bg} transition-all duration-1000 shadow-lg`} style={{ width: `${Math.min(100, (stats.totalMined / WITHDRAW_THRESHOLD) * 100)}%` }} />
                          </div>
                          <button onClick={() => setCurrentView('wallet')} className="w-full py-5 mt-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-xl italic">Go to Payout Engine</button>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {currentView === 'network' && (
            <div className="space-y-10 max-w-7xl mx-auto animate-in zoom-in duration-500 text-left">
               <div className="flex justify-between items-center">
                  <div className="text-left">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Hardware Cluster</h2>
                    <p className="text-slate-500 font-medium uppercase text-xs mt-3 tracking-widest italic">Protocol Version: Industrial Node 7.x</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => addTerminalLine("Cluster sync initiated.")} disabled={!isOnline} className="px-8 py-4 glass rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 hover:text-white transition-all disabled:opacity-30"><RotateCw className="w-4 h-4" /> Sync All</button>
                    <button onClick={() => setIsSettingsOpen(true)} className="px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:opacity-90 transition-all"><Wrench className="w-4 h-4" /> Cluster Config</button>
                  </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {[...Array(configWorkers)].map((_, i) => (
                    <RigMachine key={i} index={i} override={rigOverrides[i]} isMining={isMining && isOnline} hashrate={globalEffectiveHashrate / configWorkers} onAction={handleRigAction} theme={theme} />
                  ))}
               </div>
            </div>
          )}

          {currentView === 'plans' && (
            <div className="space-y-16 max-w-7xl mx-auto py-16 animate-in slide-in-from-bottom duration-700 text-left">
               <div className="text-center space-y-6 mb-20">
                 <h2 className="text-6xl font-black text-white uppercase tracking-tighter italic">Infrastucture Lease</h2>
                 <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm italic">Upgrade hardware allocations for high-fidelity throughput.</p>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
                  {(Object.keys(planSettings) as PlanType[]).map((pType) => {
                    const p = planSettings[pType];
                    const isCurrent = user.plan === pType;
                    return (
                      <div key={pType} className={`glass rounded-[4rem] p-16 border-slate-800 relative flex flex-col transition-all group hover:translate-y-[-12px] ${isCurrent ? `ring-2 ring-opacity-50 ring-white` : ''}`}>
                         {isCurrent && <div className={`absolute -top-6 left-1/2 -translate-x-1/2 px-8 py-3 ${theme.bg} text-white rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl italic`}>Active Strategy</div>}
                         <div className={`w-20 h-20 ${isCurrent ? theme.bg : 'bg-slate-800'} rounded-[2.5rem] flex items-center justify-center mb-12 shadow-2xl group-hover:scale-110 transition-transform`}><Rocket className="text-white w-10 h-10" /></div>
                         <div className="mb-10 text-left">
                           <h4 className="text-3xl font-black text-white mb-3 tracking-tighter italic uppercase">{p.label}</h4>
                           <div className="flex items-baseline gap-3"><span className="text-5xl font-black text-white mono tracking-tighter italic">${p.price}</span><span className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em]">/ mo</span></div>
                         </div>
                         <div className="space-y-8 mb-12 p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/40 flex-1">
                            <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Hash Cap <span className="text-white mono italic">{p.hashAllocation}</span></div>
                            <div className="h-px bg-slate-800/50" />
                            <div className="space-y-4">
                               <div className="flex justify-between text-[11px]"><span className="text-slate-600 uppercase font-bold tracking-widest italic">Hardware ops</span><span className="text-white font-black italic">${p.breakdown.hardware}</span></div>
                               <div className="flex justify-between text-[11px]"><span className="text-slate-600 uppercase font-bold tracking-widest italic">Grid tax</span><span className="text-white font-black italic">${p.breakdown.tax}</span></div>
                            </div>
                         </div>
                         <button onClick={() => switchPlan(pType)} disabled={isCurrent || !isOnline} className={`w-full py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all disabled:opacity-30 ${isCurrent ? 'bg-slate-900 text-slate-700 cursor-default' : 'bg-white text-black hover:opacity-90 shadow-2xl italic'}`}>
                           {isCurrent ? 'Current Strategy' : 'Migrate Lease'}
                         </button>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          {currentView === 'referral' && (
            <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in duration-700 py-12 text-left">
               <div className="text-center space-y-6 mb-20">
                 <h2 className="text-6xl font-black text-white uppercase tracking-tighter italic">Affiliate relay</h2>
                 <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm italic">Expand the terminal network for instant hash-power boosts.</p>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="glass rounded-[4rem] p-16 border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-12 opacity-[0.03]"><Users className="w-48 h-48" /></div>
                     <div className="relative text-left">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-12 italic">Cluster Performance</h3>
                        <div className="space-y-10">
                           <div className="flex justify-between items-baseline">
                              <p className="text-6xl font-black text-white mono tracking-tighter italic">{user.referralCount}</p>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Nodes linked</span>
                           </div>
                           <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                              <div className={`h-full ${theme.bg} transition-all duration-1000 shadow-lg`} style={{ width: `${(user.referralCount / REFERRAL_GOAL) * 100}%` }} />
                           </div>
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <Trophy className={`w-6 h-6 ${user.referralCount >= REFERRAL_GOAL ? theme.text : 'text-slate-700'}`} />
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Bonus unlock</span>
                              </div>
                              <span className={`text-[11px] font-black uppercase italic ${user.referralCount >= REFERRAL_GOAL ? theme.text : 'text-slate-700'}`}>
                                 {user.referralCount >= REFERRAL_GOAL ? 'Bonus Live' : `${REFERRAL_GOAL - user.referralCount} left`}
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="glass rounded-[4rem] p-16 border-slate-800/80 flex flex-col h-full bg-black/40 text-left">
                     <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-12 italic">Relay Terminal</h3>
                     <div className="space-y-10">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-4">Invite Relay Link</label>
                           <div className="flex gap-4">
                              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl py-5 px-8 text-white mono text-xs truncate italic">
                                 relay.mineforprofit.net/inv-{(Math.random()*10000).toFixed(0)}
                              </div>
                              <button onClick={() => addTerminalLine("Relay link secured.")} className="p-5 bg-white text-black rounded-2xl hover:bg-emerald-500 hover:text-white transition-all">
                                 <Copy className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                        <button onClick={() => { setUser(prev => ({ ...prev, referralCount: prev.referralCount + 1 })); addTerminalLine("External node joined."); }} disabled={!isOnline} className="w-full py-6 glass border-slate-800 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/5 transition-all italic disabled:opacity-30">Simulate Node Join</button>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Profile Edit Modal */}
      {isProfileOpen && (
        <Modal title="Operator Profile" icon={<UserCircle className={theme.text} />} onClose={() => setIsProfileOpen(false)}>
          <div className="space-y-8">
            <div className="flex flex-col items-center gap-6 mb-4">
              <div className="relative group">
                <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-2 border-white/10 group-hover:border-white/30 transition-all">
                  <img src={editAvatar} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <button onClick={() => setEditAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${Math.random()}`)} className={`absolute -bottom-2 -right-2 p-3 ${theme.bg} text-white rounded-xl shadow-lg border-2 border-[#020617]`}>
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center text-left">
                <p className="text-white font-black uppercase italic tracking-tighter text-xl">{editName}</p>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">{editEmail}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 text-left">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">Full Name</label>
                <input 
                  type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-8 text-white text-sm focus:outline-none focus:border-white transition-all italic"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">Email Address</label>
                <input 
                  type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-8 text-white text-sm focus:outline-none focus:border-white transition-all italic"
                />
              </div>
            </div>

            <button onClick={saveProfile} className={`w-full py-6 ${theme.bg} text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.3em] shadow-xl hover:opacity-90 transition-all italic flex items-center justify-center gap-3`}>
              <Save className="w-4 h-4" /> Save Configuration
            </button>
          </div>
        </Modal>
      )}

      {/* Cluster Settings Modal */}
      {isSettingsOpen && (
        <Modal title="System Protocol" icon={<Wrench className={theme.text} />} onClose={() => setIsSettingsOpen(false)}>
           <div className="space-y-12 text-left">
              <ConfigSlider label="Node Capacity" value={configWorkers} min={1} max={planConfig.maxNodes} unit="Units" onChange={setConfigWorkers} theme={theme} />
              <ConfigSlider label="Processing Limit" value={configHashrate} min={1} max={planConfig.maxHash} unit="TH/s" onChange={setConfigHashrate} theme={theme} />
              <ConfigSlider label="Thermal Guard" value={configPower} min={120} max={planConfig.maxPower} step={100} unit="Watts" onChange={setConfigPower} color={`accent-[${theme.hex}]`} theme={theme} />
              <button onClick={() => { setIsSettingsOpen(false); addTerminalLine("System broadcast success."); }} className={`w-full py-7 ${theme.bg} text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:opacity-90 transition-all italic`}>Commit Global Firmware</button>
           </div>
        </Modal>
      )}
    </div>
  );
};

// Custom Tooltip for Chart
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass p-5 rounded-2xl border border-white/10 shadow-3xl text-left animate-in fade-in zoom-in duration-200 z-[100]">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Snapshot: {label}</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-black text-white italic tracking-tighter">
              Price: <span className="mono ml-2">${data.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <p className="text-sm font-black text-white italic tracking-tighter">
              Hash: <span className="mono ml-2">{data.hashrate.toFixed(2)} TH/s</span>
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip descriptions for hardware states
const STATUS_META = {
  active: { label: 'Online', desc: 'Node is actively processing cryptographic shares for the current block.' },
  offline: { label: 'Offline', desc: 'Hardware is fully powered down to conserve energy or await operator command.' },
  maintenance: { label: 'Maintenance', desc: 'Node locked for firmware optimization, hardware cleanup, or repair sequence.' },
  rebooting: { label: 'Rebooting', desc: 'Node performing a soft firmware reset and network stack re-synchronization.' },
  error: { label: 'Hardware Fault', desc: 'Critical system interrupt detected. Requires immediate operator intervention or factory reset.' },
  standby: { label: 'Standby', desc: 'Hardware initialized and powered, awaiting authorized mining task assignment.' }
};

// UI Components
const NavItem: React.FC<{ active: boolean, collapsed: boolean, icon: React.ReactNode, label: string, onClick: () => void, theme: any }> = ({ active, collapsed, icon, label, onClick, theme }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-5 p-4 rounded-2xl transition-all group ${active ? `${theme.bg} bg-opacity-10 ${theme.text} border-r-4 ${theme.border} shadow-xl` : 'text-slate-500 hover:text-white hover:bg-white/5'} ${collapsed ? 'justify-center' : ''}`}>
    {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
    {!collapsed && <span className="text-[13px] font-extrabold tracking-widest uppercase italic">{label}</span>}
  </button>
);

const StatBox: React.FC<{ icon: React.ReactNode, label: string, value: string, theme: any }> = ({ icon, label, value, theme }) => (
  <div className="glass p-10 rounded-[3.5rem] border-slate-800/80 group hover:border-white/10 transition-all hover:translate-y-[-8px] relative overflow-hidden bg-black/20 text-left">
    <div className={`p-4 bg-slate-900 rounded-2xl w-fit mb-10 ${theme.text} border border-slate-800 group-hover:scale-110 transition-transform shadow-lg relative z-10`}>{icon}</div>
    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2.5 relative z-10 italic">{label}</p>
    <p className="text-4xl font-black text-white mono leading-none relative z-10 tracking-tighter italic">{value}</p>
    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white opacity-[0.01] -mr-10 -mb-10 rounded-full blur-[60px]" />
  </div>
);

const RigMachine: React.FC<{ 
  index: number, override: RigOverride, isMining: boolean, hashrate: number, onAction: (index: number, action: any, val?: any) => void, theme: any
}> = ({ index, override, isMining, hashrate, onAction, theme }) => {
  const [showActions, setShowActions] = useState(false);
  const rig = override || { isPoweredOff: false, isRestarting: false, isMaintenance: false, temperature: 32, powerLimit: 100, type: 'ASIC' };
  const isOff = rig.isPoweredOff; 
  const isMaint = rig.isMaintenance; 
  const isRest = rig.isRestarting;
  const temp = rig.temperature || 24;
  const isError = !!rig.errorDetail;
  const isGPU = rig.type === 'GPU';

  const currentStatus = useMemo(() => {
    if (isError) return { ...STATUS_META.error, label: rig.errorDetail?.split(':')[0] || 'Hardware Fault', desc: rig.errorDetail || STATUS_META.error.desc };
    if (isOff) return STATUS_META.offline;
    if (isRest) return STATUS_META.rebooting;
    if (isMaint) return STATUS_META.maintenance;
    if (isMining) return STATUS_META.active;
    return STATUS_META.standby;
  }, [isError, rig.errorDetail, isOff, isRest, isMaint, isMining]);

  return (
    <div className={`p-10 rounded-[4rem] border transition-all relative overflow-hidden flex flex-col h-[380px] ${isOff || isMaint || isError ? 'bg-slate-950/40 border-slate-900' : 'glass border-slate-800/80 hover:border-white/10'}`}>
      {isMaint && (
        <div className="absolute inset-0 z-20 caution-pattern backdrop-blur-[1px] flex items-center justify-center border-4 border-orange-500/10 rounded-[4rem]">
          <div className="text-center p-8 glass rounded-[2.5rem] border-orange-500/40 shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto animate-pulse mb-4" />
            <p className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic mb-6">Maint. Mode</p>
            <button onClick={() => onAction(index, 'maintenance')} className="px-8 py-3 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all">Resume</button>
          </div>
        </div>
      )}
      {isError && !isMaint && (
        <div className="absolute inset-0 z-20 bg-red-950/40 backdrop-blur-[1px] flex items-center justify-center border-4 border-red-500/10 rounded-[4rem]">
          <div className="text-center p-8 glass rounded-[2.5rem] border-red-500/40 shadow-2xl">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto animate-pulse mb-4" />
            <p className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic mb-6">Device Locked</p>
            <button onClick={() => onAction(index, 'togglePower')} className="px-8 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">Factory Reset</button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col gap-1.5 text-left">
          <p className="text-[11px] text-slate-600 font-black uppercase tracking-[0.2em] italic flex items-center gap-2">
            {isGPU ? <Monitor className="w-3 h-3 text-cyan-500" /> : <Cpu className="w-3 h-3 text-emerald-500" />}
            {rig.type} Unit-{(index+1).toString().padStart(3, '0')}
          </p>
          
          <div className="relative group/tooltip cursor-help inline-block">
            <p className={`text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5 ${isError ? 'text-red-500' : isOff ? 'text-slate-800' : isRest ? 'text-blue-500 animate-pulse' : isMaint ? 'text-orange-500' : (isMining ? theme.text : 'text-slate-600')}`}>
              {currentStatus.label}
              <Info className="w-2.5 h-2.5 opacity-40 group-hover/tooltip:opacity-100 transition-opacity" />
            </p>
            
            <div className="absolute left-0 top-6 w-64 p-5 glass rounded-2xl border border-white/5 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-2 group-hover/tooltip:translate-y-0 z-[150] shadow-3xl scale-95 group-hover/tooltip:scale-100 origin-top-left">
              <p className={`text-[10px] font-black uppercase mb-1.5 tracking-widest italic ${isError ? 'text-red-500' : 'text-white'}`}>{currentStatus.label}</p>
              <p className="text-[11px] text-slate-400 leading-snug font-medium italic">{currentStatus.desc}</p>
              {isError && (
                <div className="mt-3 pt-2 border-t border-white/5 text-[8px] text-red-400/60 uppercase font-black">
                   Error Code: 0x{((index+1)*1234).toString(16).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative z-30">
          <button onClick={() => setShowActions(!showActions)} className="p-3.5 rounded-2xl text-slate-500 hover:bg-white/10 hover:text-white transition-all"><MoreVertical className="w-6 h-6" /></button>
          {showActions && (
            <div className="absolute right-0 top-14 w-60 glass rounded-[2rem] border border-slate-700 shadow-3xl z-[150] p-5 space-y-3 animate-in fade-in zoom-in duration-200">
               <button onClick={() => { onAction(index, 'togglePower'); setShowActions(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-slate-300"><Power className={`w-5 h-5 ${isOff ? 'text-slate-600' : theme.text}`} /> {isOff ? 'Power On' : 'Power Off'}</button>
               <button onClick={() => { onAction(index, 'switchType'); setShowActions(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-slate-300"><RefreshCcw className="w-5 h-5 text-emerald-500" /> Convert to {isGPU ? 'ASIC' : 'GPU'}</button>
               <button onClick={() => { onAction(index, 'restart'); setShowActions(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-slate-300"><RefreshCcw className="w-5 h-5 text-blue-500" /> Reboot</button>
               <button onClick={() => { onAction(index, 'maintenance'); setShowActions(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-slate-300"><Wrench className={`w-5 h-5 ${isMaint ? 'text-orange-500' : 'text-slate-600'}`} /> Maint Mode</button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center gap-8 p-10 bg-black/40 rounded-[3rem] border border-slate-800/40 mb-10 relative">
         <span className={`w-20 h-20 ${!isOff && !isMaint && !isRest && !isError && isMining ? `animate-fan-spin ${isGPU ? 'text-cyan-500' : theme.text}` : isError ? 'text-red-900' : 'text-slate-900'}`}>
           {isGPU ? <Microchip className="w-full h-full" /> : <Fan className="w-full h-full" />}
         </span>
         <div className="w-full space-y-3.5">
            <div className="flex justify-center gap-3">
               {[...Array(4)].map((_, i) => <div key={i} className={`w-6 h-2 rounded-full ${isError ? 'bg-red-900' : !isOff && !isMaint && !isRest && isMining ? (isGPU ? 'bg-cyan-500' : theme.bg) : 'bg-slate-900'}`} />)}
            </div>
         </div>
      </div>
      <div className="flex justify-between items-end text-left">
        <div className="text-left">
          <p className="text-[11px] font-black text-slate-700 uppercase mb-1.5 italic">{isGPU ? 'GPU Speed' : 'Hash Rate'}</p>
          <p className={`mono text-2xl font-black transition-colors ${!isOff && !isMaint && !isRest && !isError && isMining ? 'text-white' : 'text-slate-800'} italic`}>
            {!isOff && !isMaint && !isRest && !isError && isMining 
              ? (isGPU ? (hashrate * 1000).toFixed(0) : (hashrate * (rig.powerLimit / 100)).toFixed(1)) 
              : '0.0'} 
            <span className="text-[12px] opacity-40 ml-1">{isGPU ? 'MH/s' : 'TH/s'}</span>
          </p>
        </div>
        <div className="text-right">
           <p className="text-[11px] font-black text-slate-700 uppercase mb-1.5 italic text-right">Thermal</p>
           <p className={`text-2xl font-black mono tracking-tighter italic ${temp > 68 ? (temp > 80 ? 'text-red-600 animate-bounce' : 'text-red-500 animate-pulse') : 'text-slate-500'}`}>{temp.toFixed(0)}°C</p>
        </div>
      </div>
    </div>
  );
};

const Modal: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, onClose: () => void }> = ({ title, icon, children, onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
    <div className="relative glass w-full max-w-2xl rounded-[4rem] p-16 border-slate-800 shadow-3xl animate-in zoom-in duration-500">
      <div className="flex justify-between items-center mb-14 text-left">
        <h2 className="text-4xl font-black flex items-center gap-8 text-white uppercase tracking-tighter italic"><div className="p-5 bg-slate-900 rounded-[2rem] border border-slate-800/80 shadow-xl">{icon}</div>{title}</h2>
        <button onClick={onClose} className="p-4 hover:bg-slate-800 rounded-full text-slate-600 transition-colors"><X className="w-12 h-12" /></button>
      </div>
      {children}
    </div>
  </div>
);

const ConfigSlider: React.FC<{ label: string, value: number, min: number, max: number, step?: number, unit: string, onChange: (v: number) => void, color?: string, theme: any }> = ({ label, value, min, max, step = 1, unit, onChange, theme }) => (
  <div className="space-y-8 text-left">
    <div className="flex justify-between items-center"><label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] italic">{label}</label><span className="mono font-black text-3xl text-white tracking-tighter italic">{value} <span className="text-sm text-slate-600 font-black uppercase">{unit}</span></span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className={`w-full bg-slate-900 h-4 rounded-full cursor-pointer appearance-none shadow-inner border-2 border-white/5 accent-[${theme.hex}]`} />
  </div>
);

export default App;
