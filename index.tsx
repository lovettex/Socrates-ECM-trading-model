import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RefreshCw,
  Search, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Briefcase, 
  Trash2,
  Wallet,
  History,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  Layers,
  FileUp,
  Copy,
  Loader2,
  Wifi,
  Cloud,
  CloudOff,
  Settings,
  Database,
  CloudUpload,
  CloudDownload,
  ExternalLink,
  Share2,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ZoomIn,
  ZoomOut,
  Maximize,
  Coins,
  ShieldAlert,
  Link as LinkIcon,
  RotateCcw,
  Star,
  Eye,
  Upload,
  Plus,
  Minus,
  Save,
  BarChart3,
  List,
  Filter,
  ArrowUpDown,
  FileText,
  CheckCircle,
  Shield,
  Zap,
  Target
} from 'lucide-react';

// --- Types ---

interface EntryBatch {
  percentage: string;
  triggerCondition: string;
  actionDetails: string;
}

interface StrategyConfig {
  entries: EntryBatch[];
  extraPlanOverview: string;
  extraPlanEntries: EntryBatch[];
}

interface TradingStrategy {
  direction: 'Buy' | 'Short' | 'Wait';
  overview: string;
  pyramid: StrategyConfig | EntryBatch[];
  inverted: StrategyConfig | EntryBatch[];
  hybrid: StrategyConfig | EntryBatch[];
}

interface NewsInsight {
  summary: string;
  comprehensiveAnalysis?: string;
  shortTermImpact: 'Bullish' | 'Bearish' | 'Neutral';
  longTermImpact: 'Bullish' | 'Bearish' | 'Neutral';
  priceRange: string;
  positioning: string;
  momentum?: {
    level: 'Low' | 'Medium' | 'High';
    description: string;
  };
  supportResistance?: {
    analysis: string;
    stopLossDistance: string;
  };
  keyDrivers: string[];
}

interface BacktestResult {
  winRate: string;
  profitFactor: string;
  maxDrawdown: string;
  analysisPeriod: string;
  improvements: string[];
}

interface StockReport {
  symbol: string;
  tradingStrategy: TradingStrategy;
  newsInsight: NewsInsight;
  backtest: BacktestResult;
  generatedAt: number;
}

interface HistoricalPoint {
  date: string;
  price: number;
  type: 'High' | 'Low' | 'Panic' | '突破' | '市場崩潰';
  event: string;
  pnlPercent: number; 
  ecmPhase: string;   
}

interface DrawdownEvent {
  highDate: string;
  highPrice: number;
  lowDate: string;
  lowPrice: number;
  dropPercent: number;
  reason: string;
}

export interface CycleEvent {
  date: string;
  label: string; 
  type: 'Major' | 'Minor';
  description?: string;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  currency: string;
  lastAnchorDate: string; 
  anchorType: 'High' | 'Low';
  nextTurningPoint: string;
  analysis: string;
  priceAnalysis?: string;
  ecmTimelineSummary?: string; 
  currentPhaseStatus?: string; 
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  screenerRating?: {
    score: number;
    action: 'Buy' | 'Sell' | 'Neutral';
  };
  buyScore?: number;
  sellScore?: number;
  qualityScore?: number;
  valueScore?: number;
  crashSimilarityScore?: number;
  supportLevel: number;
  resistanceLevel: number;
  historicalHigh: number;
  historicalHighDate: string;
  historicalLow: number;
  historicalLowDate: string;
  historicalSignals: HistoricalPoint[];
  historicalDrawdowns: DrawdownEvent[];
  futureCycleEvents: CycleEvent[];
  sources?: { uri: string; title: string }[];
}

interface Trade {
  id: string;
  symbol: string;
  name: string;
  type: 'Buy' | 'MarginBuy' | 'Short' | 'Sell';
  price: number;
  shares: number;
  date: string;
  timestamp: number;
}

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  timestamp: number;
}

interface MarketData {
  price: number;
  change: number;
  changePercent: number;
  prevClose: number;
  time: string;
  lastUpdated: number;
}

interface ScreenerItem {
  symbol: string;
  name: string;
  price: number;
  sector: string;
  changePercent?: number;
  aiScore?: number;
  buyScore?: number;
  sellScore?: number;
  qualityScore?: number;
  valueScore?: number;
  crashSimilarityScore?: number;
  ecmStatus?: string;
}

// --- Helper Functions ---

const getPosScore = (item: any) => {
  const calc = (score: number) => score > 5 ? score - 5 : 0;
  const ai = Number(item?.aiScore ?? item?.screenerRating?.score) || 5;
  const qual = Number(item?.qualityScore) || 5;
  const val = Number(item?.valueScore) || 5;
  const buy = Number(item?.buyScore) || 0;
  return calc(ai) + calc(qual) + calc(val) + buy;
};

const getNegScore = (item: any) => {
  const calc = (score: number) => score < 5 ? 5 - score : 0;
  const ai = Number(item?.aiScore ?? item?.screenerRating?.score) || 5;
  const qual = Number(item?.qualityScore) || 5;
  const val = Number(item?.valueScore) || 5;
  const sell = Number(item?.sellScore) || 0;
  return calc(ai) + calc(qual) + calc(val) + sell;
};

const safeParseJson = (text: string) => {
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    if (firstBrace === -1 && firstBracket === -1) {
      console.error("JSON 解析失敗: 找不到 JSON 結構", "原文內容:", text);
      throw new Error("模型回傳格式錯誤，請稍後再試。");
    }

    const startIdx = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    const endChar = (startIdx === firstBrace) ? '}' : ']';
    
    for (let endIdx = cleaned.lastIndexOf(endChar); endIdx > startIdx; endIdx = cleaned.lastIndexOf(endChar, endIdx - 1)) {
      try {
        const candidate = cleaned.substring(startIdx, endIdx + 1);
        return JSON.parse(candidate);
      } catch (e2) {
        // continue
      }
    }
    
    console.error("JSON 解析失敗:", e, "原文內容:", text);
    throw new Error("模型回傳格式錯誤，請稍後再試。");
  }
};

// --- Components ---

const ScoreCircle = ({ score, total = 10, type = 'buy' }: { score: number, total?: number, type: 'buy' | 'sell' | 'quality' | 'value' | 'crashSim' | 'ai' }) => {
  const safeScore = Number(score) || 0;
  const percentage = (safeScore / total) * 100;
  
  let color = '#10b981';
  let bgColor = 'rgba(16, 185, 129, 0.1)';
  if (type === 'sell') {
    color = '#f43f5e';
    bgColor = 'rgba(244, 63, 94, 0.1)';
  } else if (type === 'quality') {
    color = '#3b82f6';
    bgColor = 'rgba(59, 130, 246, 0.1)';
  } else if (type === 'value') {
    color = '#a855f7';
    bgColor = 'rgba(168, 85, 247, 0.1)';
  } else if (type === 'crashSim') {
    color = '#f59e0b'; // amber-500
    bgColor = 'rgba(245, 158, 11, 0.1)';
  } else if (type === 'ai') {
    color = '#0ea5e9'; // sky-500
    bgColor = 'rgba(14, 165, 233, 0.1)';
  }

  const offset = 100 - percentage;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center group">
      <svg className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-800" />
        <circle 
          cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3" 
          strokeDasharray="125.6" 
          strokeDashoffset={125.6 * (1 - percentage / 100)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] terminal-text font-black" style={{ color }}>{score}</span>
      <div className="absolute inset-0 rounded-full group-hover:bg-current opacity-0 group-hover:opacity-10 transition-opacity" style={{ color }} />
    </div>
  );
};

const BuffettIndicator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (data) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Find the LATEST Buffett Indicator (Market Cap to GDP ratio) for the US market from https://www.longtermtrends.com/market-cap-to-gdp-the-buffett-indicator/. 
      Get current % ratio, a status label (e.g. "Value", "Overvalued"), and a brief 1-sentence context. 
      Also provide 10 historical values to form a sparkline.
      Return JSON: { "ratio": number, "status": string, "trend": number[], "date": string, "context": string }`;
      
      const r = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          tools: [{ googleSearch: {} }]
        }
      });
      const d = safeParseJson(r.text || '{}');
      setData(d);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-8 py-4 hover:bg-slate-800/30 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">Macro Sentiment</span>
              <span className="text-sm font-black text-slate-200 uppercase tracking-wider">The Buffett Indicator</span>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-800/50"
            >
              <div className="p-8">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="ml-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching macro data...</span>
                  </div>
                ) : data ? (
                  <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-4 mb-4">
                        <span className="text-6xl font-mono font-black text-amber-500 terminal-text tabular-nums">{data.ratio}%</span>
                        <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter border ${data.status.toLowerCase().includes('high') || data.status.toLowerCase().includes('over') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {data.status}
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed font-medium">{data.context}</p>
                      <div className="mt-6 flex items-center gap-3">
                         <div className="text-[9px] terminal-text text-slate-500 font-bold uppercase tracking-widest bg-slate-900 px-2 py-1 rounded border border-slate-800">
                           Data Source: LongTermTrends
                         </div>
                         <div className="text-[9px] terminal-text text-slate-500 font-bold uppercase tracking-widest">
                           {data.date}
                         </div>
                      </div>
                    </div>
                    
                    {data.trend && data.trend.length > 0 && (
                      <div className="w-full md:w-48 h-20 relative">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                          <defs>
                            <linearGradient id="buffettGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path 
                            d={`M ${data.trend.map((v: number, i: number) => {
                              const x = i * (100 / (data.trend.length - 1));
                              const max = Math.max(...data.trend);
                              const min = Math.min(...data.trend);
                              const range = max - min || 1;
                              const y = 35 - ((v - min) / range) * 30;
                              return `${x},${y}`;
                            }).join(' L ')}`}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          />
                        </svg>
                        <div className="absolute -bottom-2 left-0 w-full flex justify-between text-[8px] terminal-text text-slate-600 font-black uppercase tracking-tighter">
                          <span>Past 12M</span>
                          <span>Now</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600 flex flex-col items-center gap-3">
                    <CloudOff className="w-12 h-12 opacity-50" />
                    <p className="font-bold uppercase tracking-widest text-xs">Synchronized Data Unavailable</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const VixIndicator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (data) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Find the LATEST VIX (Volatility Index) value from https://www.macromicro.me/charts/47/vix or any financial site. 
      Get current VIX number, a status label (e.g. "Low Volatility", "High Volatility", "Panic"), and a brief 1-sentence context (in Traditional Chinese).
      Also provide 10 recent historical values to form a sparkline.
      Return JSON: { "ratio": number, "status": string, "trend": number[], "date": string, "context": string }`;
      
      const r = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          tools: [{ googleSearch: {} }]
        }
      });
      const d = safeParseJson(r.text || '{}');
      setData(d);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  return (
    <div className="max-w-2xl mx-auto mt-4">
      <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-8 py-4 hover:bg-slate-800/30 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">Macro Sentiment</span>
              <span className="text-sm font-black text-slate-200 uppercase tracking-wider">VIX波動率指數</span>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-800/50"
            >
              <div className="p-8">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="ml-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching macro data...</span>
                  </div>
                ) : data ? (
                  <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-4 mb-4">
                        <span className="text-6xl font-mono font-black text-amber-500 terminal-text tabular-nums">{data.ratio}</span>
                        <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter border ${data.ratio >= 20 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {data.status}
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed font-medium">{data.context}</p>
                      <div className="mt-6 flex items-center gap-3">
                         <div className="text-[9px] terminal-text text-slate-500 font-bold uppercase tracking-widest bg-slate-900 px-2 py-1 rounded border border-slate-800">
                           Data Source: MacroMicro
                         </div>
                         <div className="text-[9px] terminal-text text-slate-500 font-bold uppercase tracking-widest">
                           {data.date}
                         </div>
                      </div>
                    </div>
                    
                    {data.trend && data.trend.length > 0 && (
                      <div className="w-full md:w-48 h-20 relative">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                          <defs>
                            <linearGradient id="vixGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path 
                            d={`M ${data.trend.map((v: number, i: number) => {
                              const x = i * (100 / (data.trend.length - 1));
                              const max = Math.max(...data.trend);
                              const min = Math.min(...data.trend);
                              const range = max - min || 1;
                              const y = 35 - ((v - min) / range) * 30;
                              return `${x},${y}`;
                            }).join(' L ')}`}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                          />
                        </svg>
                        <div className="absolute -bottom-2 left-0 w-full flex justify-between text-[8px] terminal-text text-slate-600 font-black uppercase tracking-tighter">
                          <span>Past 12M</span>
                          <span>Now</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600 flex flex-col items-center gap-3">
                    <CloudOff className="w-12 h-12 opacity-50" />
                    <p className="font-bold uppercase tracking-widest text-xs">Synchronized Data Unavailable</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const MiniSparkline = ({ color = "#10b981" }) => {
  const points = useMemo(() => {
    const pts = [];
    let curY = 15;
    for (let i = 0; i < 20; i++) {
        curY = Math.max(5, Math.min(25, curY + (Math.random() - 0.5) * 10));
        pts.push(`${i * 4.7},${curY}`);
    }
    return pts.join(' ');
  }, []);

  return (
    <svg width="95" height="30" viewBox="0 0 95 30" className="opacity-100">
      <defs>
        <linearGradient id="sparkGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.1" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <motion.polyline
        points={points}
        fill="none"
        stroke="url(#sparkGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1, opacity: [0.4, 1, 0.4] }}
        transition={{ 
          pathLength: { duration: 3, repeat: Infinity, ease: "linear" },
          opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
      />
    </svg>
  );
};

export const CycleChart = ({ anchorDate, events }: { anchorDate: string, events: CycleEvent[] }) => {
  const [selectedEvent, setSelectedEvent] = useState<CycleEvent | null>(null);

  const startTime = useMemo(() => {
    const d = new Date(anchorDate).getTime();
    return isNaN(d) ? Date.now() : d;
  }, [anchorDate]);

  // ECM Cycle Constants
  const cycleDays = 3141; // 8.6 Years in days
  const cycleMs = cycleDays * 24 * 60 * 60 * 1000;
  const displayDuration = cycleMs * 1.05; // 5% buffer at the end

  // Visual Layout Constants
  const baseWidth = 1200;
  const height = 675; // strictly 16:9 ratio
  const chartMargin = 120; // Left/Right generous margin
  const effectiveWidth = baseWidth - (chartMargin * 2);
  const paddingY = 240; // High padding for floating labels avoiding wave
  const centerY = height / 2;
  const waveAmp = (height - paddingY * 2) / 2;

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { duration: 2, ease: "easeInOut" }
    }
  };

  // Coordinate Helper
  const getX = useCallback((dateStr: string) => {
    const t = new Date(dateStr).getTime();
    if (isNaN(t)) return -10000;
    const offset = t - startTime;
    return chartMargin + (offset / displayDuration) * effectiveWidth;
  }, [startTime, displayDuration, effectiveWidth, chartMargin]);

  // Generate Wave Data
  const points = useMemo(() => {
    const pts = [];
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const x_rel = (i / steps);
      const x = chartMargin + x_rel * effectiveWidth;
      const timeOffset = x_rel * displayDuration;
      
      // Radians for 8.6 year cycle
      const radians = (timeOffset / cycleMs) * Math.PI * 2;
      // Cos(0) is peak. ECM peak starts at Anchor if it's a High.
      const y = centerY - Math.cos(radians) * waveAmp;
      pts.push(`${x},${y}`);
    }
    return pts.join(' ');
  }, [effectiveWidth, displayDuration, cycleMs, centerY, waveAmp, chartMargin]);

  // Yearly Vertical Lines
  const yearlyMarkers = useMemo(() => {
    const markers = [];
    for (let i = 1; i <= 8; i++) {
      const t = startTime + (i * 365.25 * 24 * 60 * 60 * 1000);
      const date = new Date(t);
      markers.push({
        x: getX(date.toISOString()),
        label: `Year ${i}`,
        date: date.toLocaleDateString()
      });
    }
    return markers;
  }, [startTime, getX]);

  return (
    <div className="w-full bg-gradient-to-br from-[#020617] via-[#0B1229] to-[#080F25] rounded-3xl p-6 border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative select-none overflow-hidden">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
           <div className="w-5 h-5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
           <div>
             <span className="text-xl font-black text-white uppercase tracking-[0.2em] block drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">ECM 週期波動預測</span>
             <span className="text-sm text-slate-400 font-mono tracking-wide">8.6 年經濟信心模型 (3141 天)</span>
           </div>
         </div>
      </div>

      {/* Primary Chart Area using fully responsive layout */}
      <div className="w-full bg-slate-950/30 rounded-2xl border border-slate-800/50 flex items-center justify-center p-2 lg:p-4">
        <div className="w-full relative aspect-video">
          <svg width="100%" height="100%" viewBox={`0 0 ${baseWidth} ${height}`} preserveAspectRatio="xMidYMid meet">
             <defs>
               <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                  </feMerge>
               </filter>
               <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                 <stop offset="0%" stopColor="#FEF08A" />
                 <stop offset="50%" stopColor="#F59E0B" />
                 <stop offset="100%" stopColor="#D97706" />
               </linearGradient>
             </defs>
             
             {/* Background Yearly Grid */}
             {yearlyMarkers.map((m, i) => (
               <g key={i}>
                 <line x1={m.x} y1={paddingY - 20} x2={m.x} y2={height + 40} stroke="#1E293B" strokeWidth="1" strokeDasharray="6,4" />
                 <g transform={`translate(${m.x}, ${height + 25})`}>
                   <text transform="rotate(-90)" fill="#64748B" fontSize="14" fontWeight="bold" textAnchor="end" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{m.label}</text>
                 </g>
               </g>
             ))}

             {/* Center Axis */}
             <line x1={chartMargin / 2} y1={centerY} x2={baseWidth - chartMargin / 2} y2={centerY} stroke="#1e293b" strokeWidth="2" strokeDasharray="10,5" />

             {/* Wave Lines */}
             <polyline 
               points={points} 
               fill="none" 
               stroke="url(#waveGradient)" 
               strokeWidth="8" 
               strokeOpacity="0.25" 
               filter="url(#neon-glow)"
             />
             <polyline 
               points={points} 
               fill="none" 
               stroke="url(#waveGradient)" 
               strokeWidth="4" 
               strokeLinecap="round" 
               strokeOpacity="0.9" 
             />

             {/* Anchor Point Label */}
             <g onClick={() => setSelectedEvent({ date: anchorDate, label: "週期起始錨點", description: "ECM 週期的起始位置，通常是一個重要的市場高點或低點轉折。", type: "Major" })} className="cursor-pointer">
               <line x1={chartMargin} y1={170} x2={chartMargin} y2={height + 40} stroke="#475569" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
               <circle cx={chartMargin} cy={centerY - waveAmp} r="16" fill="none" stroke="#FACC15" strokeWidth="2" filter="url(#neon-glow)" opacity="0.8" />
               <circle cx={chartMargin} cy={centerY - waveAmp} r="10" fill="#FACC15" stroke="#0F172A" strokeWidth="3" filter="drop-shadow(0px 0px 8px #FACC15)" />
               <g transform={`translate(${chartMargin}, ${height + 25})`}>
                 <text transform="rotate(-90)" fill="#94a3b8" fontSize="16" fontWeight="black" textAnchor="end" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{anchorDate}</text>
               </g>
               <g transform={`translate(${chartMargin}, ${150})`}>
                 <rect x="-80" y="-38" width="160" height="38" rx="19" fill="rgba(250, 204, 21, 0.15)" stroke="#FACC15" strokeWidth="1.5" />
                 <text x="0" y="-12" fill="#FACC15" fontSize="16" fontWeight="900" textAnchor="middle" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">週期起始錨點</text>
               </g>
             </g>

             {/* Future Events Map */}
             {events && events.map((ev, i) => {
               const x = getX(ev.date);
               if (x < 0 || x > baseWidth) return null;
               
               const isMajor = ev.type === 'Major';
               const isGreen = ev.label?.includes('亞洲') || ev.label?.includes('綠') || ev.label?.includes('特別大') || ev.label?.includes('D23'); 
               const isPinkBanner = ev.label?.includes('頂峰') || ev.label?.includes('高點') || ev.label?.includes('8.6') || ev.label?.includes('大週期') || ev.label?.includes('ECM 週期性');
               const isRed = isMajor || ev.label?.includes('ECM') || ev.label?.includes('轉折') || ev.label?.includes('Q2');
               const pillColor = isGreen ? "#10B981" : isRed ? "#F43F5E" : "#FACC15";
               
               // Precise Y on Wave
               const t_rel = (x - chartMargin) / effectiveWidth;
               const timeOffset = t_rel * displayDuration;
               const radians = (timeOffset / cycleMs) * Math.PI * 2;
               const waveY = centerY - Math.cos(radians) * waveAmp;

               // Distribute labels evenly above the wave line
               // paddingY is 240, ensuring labels (60, 110, 160, 200) are well above the wave peak (240)
               // Avoid overlapping with anchor at 150
               const labelOffsetY = isPinkBanner ? 60 : (i % 3 === 0 ? 110 : (i % 3 === 1 ? 160 : 200));

               // Horizontal shift for long banners that might be near the edge
               let shiftX = 0;
               if (isPinkBanner) {
                 const bannerHalfWidth = ((ev.label?.length || 0) * 16 + 60) / 2;
                 if (x - bannerHalfWidth < 20) shiftX = bannerHalfWidth - x + 20;
                 if (x + bannerHalfWidth > baseWidth - 20) shiftX = baseWidth - 20 - (x + bannerHalfWidth);
               } else {
                 const pillHalfWidth = ((ev.label?.length || 0) * 16 + 40) / 2;
                 if (x - pillHalfWidth < 20) shiftX = pillHalfWidth - x + 20;
                 if (x + pillHalfWidth > baseWidth - 20) shiftX = baseWidth - 20 - (x + pillHalfWidth);
               }

               return (
                 <g key={i} onClick={() => setSelectedEvent(ev)} className="cursor-pointer">
                    <line x1={x} y1={labelOffsetY + 18} x2={x} y2={height + 40} stroke={pillColor} strokeWidth={isMajor ? 2 : 1.5} strokeDasharray="4,4" opacity="0.6" />
                    <circle cx={x} cy={waveY} r={16} fill="none" stroke={pillColor} strokeWidth="2" filter="url(#neon-glow)" opacity="0.8" />
                    <circle cx={x} cy={waveY} r={10} fill={pillColor} stroke="#0F172A" strokeWidth="3" filter="drop-shadow(0px 0px 8px currentColor)" style={{ color: pillColor }} />
                    
                    {/* Date Label (Bottom) */}
                     <g transform={`translate(${x}, ${height + 25})`}>
                       <text transform="rotate(-90)" fill={pillColor} fontSize="16" fontWeight="black" textAnchor="end" className="font-mono tracking-widest">{ev.date}</text>
                     </g>

                    {/* Label Box (Top) */}
                    <g transform={`translate(${x + shiftX}, ${labelOffsetY})`}>
                       {isPinkBanner ? (
                         // Special Banner Style
                         <>
                           <rect x={-((ev.label?.length || 0) * 8 + 30)} y="-22" width={(ev.label?.length || 0) * 16 + 60} height="44" rx="10" fill="rgba(244, 63, 94, 0.2)" stroke="#F43F5E" strokeWidth="2" className="backdrop-blur-md" />
                           <text x="0" y="6" fill="#FDA4AF" fontSize="18" fontWeight="900" textAnchor="middle" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">{ev.label}</text>
                         </>
                       ) : (
                         // Standard Pill Style
                         <>
                           <rect x={-((ev.label?.length || 0) * 8 + 20)} y="-18" width={(ev.label?.length || 0) * 16 + 40} height="36" rx="18" fill={pillColor} fillOpacity="0.2" stroke={pillColor} strokeWidth="1.5" className="backdrop-blur-md" />
                           <text x="0" y="6" fill={pillColor} fontSize="16" fontWeight="900" textAnchor="middle" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">{ev.label}</text>
                         </>
                       )}
                    </g>
                 </g>
               )
             })}
          </svg>
        </div>
      </div>
      
      {/* Detail Overlay Tooltip */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setSelectedEvent(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative bg-[#0F172A]/90 backdrop-blur-2xl p-8 rounded-3xl border border-slate-700/80 outline outline-1 outline-white/10 shadow-[0_0_80px_rgba(250,204,21,0.15)] max-w-lg w-full flex flex-col gap-6"
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="關閉"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 border-b border-slate-700 pb-6 pr-8">
                 <div className={`w-5 h-5 rounded-full ${selectedEvent.type === 'Major' ? 'bg-rose-500' : selectedEvent.type === 'Minor' ? 'bg-emerald-500' : 'bg-[#FACC15]'} shadow-[0_0_20px_currentColor]`} />
                 <span className="text-white font-black text-3xl tracking-tight leading-tight">{selectedEvent.label}</span>
              </div>
              
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-amber-500" />
                <span className="text-amber-500 font-mono font-black text-xl terminal-text tracking-widest">{selectedEvent.date}</span>
              </div>
              
              <p className="text-slate-300 leading-relaxed font-medium text-lg">{selectedEvent.description}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DrawdownChart = ({ drawdowns }: { drawdowns: DrawdownEvent[] }) => {
  const [hoveredData, setHoveredData] = useState<DrawdownEvent | null>(null);

  if (!drawdowns || drawdowns.length === 0) return (
    <div className="w-full h-64 bg-slate-900/50 rounded-3xl flex items-center justify-center text-slate-500 border border-slate-800 text-lg">
      尚無歷史回撤數據
    </div>
  );

  const sortedDrawdowns = [...drawdowns].sort((a, b) => {
    const aTime = a.highDate ? new Date(a.highDate).getTime() : 0;
    const bTime = b.highDate ? new Date(b.highDate).getTime() : 0;
    return (isNaN(aTime) ? 0 : aTime) - (isNaN(bTime) ? 0 : bTime);
  });
  
  const width = 800;
  const height = 300;
  const paddingX = 60;
  const paddingY = 40;
  
  const maxPrice = Math.max(...sortedDrawdowns.map(d => d.highPrice || 0)) * 1.1;
  const minPrice = 0;

  const getY = (price: number) => {
    return height - paddingY - ((price - minPrice) / (maxPrice - minPrice)) * (height - 2 * paddingY);
  };

  return (
    <div className="w-full bg-slate-950/90 rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden select-none">
      <div className="mb-4 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <Activity className="w-6 h-6 text-red-500" />
           <span className="text-base font-black text-slate-300 uppercase tracking-widest">歷史崩盤幅度可視化</span>
         </div>
         <div className="text-xs text-slate-500 font-bold">高低點最大回撤可視化</div>
      </div>

      <div className="relative w-full overflow-x-auto custom-scrollbar">
        <div style={{ minWidth: '600px' }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            <defs>
              <linearGradient id="dropGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = height - paddingY - (ratio * (height - 2 * paddingY));
              const priceLabel = minPrice + ratio * (maxPrice - minPrice);
              return (
                <g key={i}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
                  <text x={paddingX - 10} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" className="font-mono">${(priceLabel ?? 0).toLocaleString()}</text>
                </g>
              );
            })}

            {sortedDrawdowns.map((d, i) => {
              const step = (width - 2 * paddingX) / (sortedDrawdowns.length);
              const x = paddingX + step * i + (step / 2);
              const yHigh = getY(d.highPrice || 0);
              const yLow = getY(d.lowPrice || 0);
              
              return (
                <g key={i} onMouseEnter={() => setHoveredData(d)} onMouseLeave={() => setHoveredData(null)} className="cursor-pointer transition-all hover:opacity-100 opacity-90">
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2" />
                  <rect x={x - 15} y={yHigh} width="30" height={Math.max(0, yLow - yHigh)} fill="url(#dropGradient)" rx="4" />
                  <circle cx={x} cy={yHigh} r="5" fill="#10b981" stroke="#fff" strokeWidth="2" />
                  <circle cx={x} cy={yLow} r="5" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                  <text x={x} y={yLow + 20} fill="#f87171" fontSize="12" fontWeight="bold" textAnchor="middle">{d.dropPercent}%</text>
                  <text x={x} y={height - 10} fill="#94a3b8" fontSize="10" textAnchor="middle">{d.highDate ? d.highDate.split('-')[0] : 'N/A'}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      
      {hoveredData && (
        <div className="absolute top-16 right-6 bg-slate-900/95 backdrop-blur-sm p-4 rounded-xl border border-red-500/30 shadow-2xl max-w-xs animate-in fade-in slide-in-from-right-2 z-20 pointer-events-none">
          <div className="text-red-400 font-black text-lg mb-2 flex items-center gap-2">
            <TrendingDownIcon className="w-5 h-5" /> 跌幅 {hoveredData.dropPercent}%
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between font-bold">
              <span className="text-slate-500">高點:</span>
              <span className="text-emerald-400 font-mono">${(hoveredData.highPrice ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-slate-500">低點:</span>
              <span className="text-red-400 font-mono">${(hoveredData.lowPrice ?? 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50">
             <p className="text-slate-300 leading-relaxed font-bold text-sm">{hoveredData.reason}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoricalDrawdownView = ({ data }: { data: StockData }) => {
  if (!data.historicalDrawdowns || data.historicalDrawdowns.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500 opacity-50">
        <Activity className="w-16 h-16 mx-auto mb-4" />
        <p>查無歷史崩盤數據</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DrawdownChart drawdowns={data.historicalDrawdowns} />

      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
          <span className="font-black text-sm uppercase tracking-widest text-white flex items-center gap-2">
            <List className="w-5 h-5 text-amber-500" /> 歷史回調與事件原因
          </span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-500">
              <tr>
                <th className="p-4 w-32">週期 (高點-低點)</th>
                <th className="p-4 w-24">高點價格</th>
                <th className="p-4 w-24">低點價格</th>
                <th className="p-4 w-20">跌幅</th>
                <th className="p-4">恐慌/下跌原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {([...(data.historicalDrawdowns || [])].filter((d): d is DrawdownEvent => !!d).sort((a, b) => {
                const aTime = a.highDate ? new Date(a.highDate).getTime() : 0;
                const bTime = b.highDate ? new Date(b.highDate).getTime() : 0;
                return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
              })).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-emerald-400">{item.highDate}</div>
                    <div className="text-slate-500 text-xs my-0.5">to</div>
                    <div className="font-bold text-red-400">{item.lowDate}</div>
                  </td>
                  <td className="p-4 font-bold text-slate-300 terminal-text tabular-nums">${(item.highPrice ?? 0).toLocaleString()}</td>
                  <td className="p-4 font-bold text-slate-300 terminal-text tabular-nums">${(item.lowPrice ?? 0).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded-lg font-black border border-red-500/20">
                      -{Math.abs(item.dropPercent)}%
                    </span>
                  </td>
                  <td className="p-4 text-slate-300 leading-relaxed font-bold max-w-md">
                    {item.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PriceScreener = () => {
  const [minPrice, setMinPrice] = useState('10');
  const [maxPrice, setMaxPrice] = useState('50');
  const [minScore, setMinScore] = useState('6');
  const [minBuyScore, setMinBuyScore] = useState('6');
  const [minSellScore, setMinSellScore] = useState('0');
  const [minQualityScore, setMinQualityScore] = useState('6');
  const [minValueScore, setMinValueScore] = useState('6');
  const [minCrashSimScore, setMinCrashSimScore] = useState('1');
  const [limit, setLimit] = useState('50');
  const [screenMode, setScreenMode] = useState<'custom' | 'top50' | 'bottom50'>('custom');
  const [results, setResults] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'buy' | 'sell' | 'quality' | 'value' | 'crashSim' | 'pos' | 'neg'>('default');

  const handleExportJson = () => {
    if (results.length === 0) return;
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `ecm_screener_results_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSearch = async (mode: 'custom' | 'top50' | 'bottom50' = 'custom') => {
    if (mode === 'custom' && (!minPrice || !maxPrice)) {
      setError('請輸入價格範圍');
      return;
    }
    setScreenMode(mode);
    setLoading(true);
    setError('');
    setResults([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let prompt = '';

      if (mode === 'top50') {
        prompt = `Using real-time market data from Yahoo Finance and Martin Armstrong's Socrates ECM model principles, find the TOP 50 best performing US Stocks right now. 
        Focus on assets showing strong bullish technical reversals, proximity to positive cycle turning points, or high "buyScores" in the Socrates model.`;
      } else if (mode === 'bottom50') {
        prompt = `Using real-time market data from Yahoo Finance and Martin Armstrong's Socrates ECM model principles, find the TOP 50 worst performing US Stocks right now. 
        Focus on assets showing deep bearish trends, proximity to negative cycle peaks, or high "sellScores" (overbought/danger) in the Socrates model.`;
      } else {
        prompt = `Find approximately ${limit} US Stocks that are currently trading between $${minPrice} and $${maxPrice} USD using Yahoo Finance data.
        IMPORTANT: Only include assets that you estimate would have a Screener AI Score (1-10) of AT LEAST ${minScore}/10 right now, a Socrates ECM "buyScore" (1-10) of AT LEAST ${minBuyScore}/10 right now, a "sellScore" (1-10) of AT LEAST ${minSellScore}/10, a Quality Score of AT LEAST ${minQualityScore}/10, a Value Score of AT LEAST ${minValueScore}/10, and a Crash Similarity Score of AT LEAST ${minCrashSimScore}/10.`;
      }

      prompt += `
      Use Google Search to fetch the MOST RECENT and EXACT price for EACH of the selected assets on Yahoo Finance today. Do not hallucinate or use outdated prices.

      CRITICAL INSTRUCTION: For EACH resulting asset, you MUST estimate a "buyScore" (1-10) and "sellScore" (1-10) based on Martin Armstrong's ECM model principles (e.g., proximity to cycle lows/highs, recent trends). Also provide a brief "ecmStatus" indicating the current status. Include "aiScore" (1-10) as a general AI rating, "qualityScore" (1-10) and "valueScore" (1-10). Additionally, include a "crashSimilarityScore" (1-10) evaluating the similarity between the recent drawdown and the 2 most recent major historical drawdowns over the past 5 years.
      IMPORTANT: The "ecmStatus" field MUST be written in Traditional Chinese (繁體中文), e.g., "接近週期低點", "超買", "中性發展".
      
      Return the response strictly as a JSON array of objects with the following structure:
      [
        { 
          "symbol": "AAPL", 
          "name": "Apple Inc.", 
          "price": 150.00, 
          "sector": "Technology",
          "aiScore": 8,
          "buyScore": 8,
          "sellScore": 2,
          "qualityScore": 8,
          "valueScore": 7,
          "crashSimilarityScore": 5,
          "ecmStatus": "接近潛在週期底部"
        },
        ...
      ]
      Ensure symbols are correct.
      Do not include markdown formatting like \`\`\`json. Just return the JSON string.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          tools: [{ googleSearch: {} }]
        }
      });

      let data = safeParseJson(response.text || '[]');
      if (Array.isArray(data)) {
        if (data.length > 0) {
          try {
            const symbols = data.map((d: any) => d.symbol).join(', ');
            const pricePrompt = `Search Yahoo Finance for the absolutely latest real-time stock prices for these symbols: ${symbols}.
            Return a JSON object where keys are the Symbols (uppercase) and values are the precise current prices (number).
            Example: {"AAPL": 150.25, "MSFT": 310.50}
            Return ONLY the valid JSON object.`;
            
            const priceResponse = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: pricePrompt,
              config: {
                responseMimeType: 'application/json',
                tools: [{ googleSearch: {} }]
              }
            });
            
            const priceData = safeParseJson(priceResponse.text || '{}');
            data = data.map((item: any) => {
              if (!item.symbol) return item;
              const latestPrice = priceData[item.symbol.toUpperCase()];
              if (latestPrice && !isNaN(Number(latestPrice))) {
                item.price = Number(latestPrice);
              }
              return item;
            });
          } catch (priceErr) {
            console.warn("Failed to fetch secondary precise prices", priceErr);
          }
        }
        setResults(data);
      } else {
        throw new Error('格式錯誤');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '搜尋失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = useMemo(() => {
    const items = [...results];
    if (sortBy === 'buy') {
      return items.sort((a, b) => (b.buyScore || 0) - (a.buyScore || 0));
    }
    if (sortBy === 'sell') {
      return items.sort((a, b) => (b.sellScore || 0) - (a.sellScore || 0));
    }
    if (sortBy === 'quality') {
      return items.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    }
    if (sortBy === 'value') {
      return items.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));
    }
    if (sortBy === 'crashSim') {
      return items.sort((a, b) => (b.crashSimilarityScore || 0) - (a.crashSimilarityScore || 0));
    }
    if (sortBy === 'pos') {
      return items.sort((a, b) => getPosScore(b) - getPosScore(a));
    }
    if (sortBy === 'neg') {
      return items.sort((a, b) => getNegScore(b) - getNegScore(a));
    }
    return items;
  }, [results, sortBy]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <Filter className="w-6 h-6 text-amber-500" />
            Socrates 智能篩選器
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => handleSearch('top50')}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-2 ${
                screenMode === 'top50' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900 border-slate-700 text-emerald-500 hover:border-emerald-500'
              }`}
            >
              <TrendingUpIcon className="w-4 h-4" /> 最強前 50 名
            </button>
            <button 
              onClick={() => handleSearch('bottom50')}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-2 ${
                screenMode === 'bottom50' ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-900 border-slate-700 text-red-500 hover:border-red-500'
              }`}
            >
              <TrendingDownIcon className="w-4 h-4" /> 最弱前 50 名
            </button>
            <button 
              onClick={() => setScreenMode('custom')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                screenMode === 'custom' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-900 border-slate-700 text-amber-500 hover:border-amber-500'
              }`}
            >
              自定義篩選
            </button>
          </div>
        </div>
        
        {screenMode === 'custom' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">價格 (起)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                <input 
                  type="number" 
                  value={minPrice} 
                  onChange={e => setMinPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">價格 (迄)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                <input 
                  type="number" 
                  value={maxPrice} 
                  onChange={e => setMaxPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-500/80 mb-2 uppercase" title="Minimum AI Score">最低 AI 分</label>
              <select 
                value={minScore} 
                onChange={e => setMinScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-sky-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num.toString()}>{num}+</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-500/80 mb-2 uppercase" title="Minimum Buy Score">最低 Buy Score</label>
              <select 
                value={minBuyScore} 
                onChange={e => setMinBuyScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-emerald-500"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num.toString()}>{num}+</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-500/80 mb-2 uppercase" title="Minimum Sell Score">最低 Sell Score</label>
              <select 
                value={minSellScore} 
                onChange={e => setMinSellScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-rose-500"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num.toString()}>{num}+</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-500/80 mb-2 uppercase">最低 Quality</label>
              <select 
                value={minQualityScore} 
                onChange={e => setMinQualityScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num.toString()}>{num}+</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-500/80 mb-2 uppercase">最低 Value</label>
              <select 
                value={minValueScore} 
                onChange={e => setMinValueScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-purple-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num.toString()}>{num}+</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-500/80 mb-2 uppercase whitespace-nowrap">崩盤相似度 (低-高)</label>
              <select 
                value={minCrashSimScore} 
                onChange={e => setMinCrashSimScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num.toString()}>{num}+</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">數量</label>
              <select 
                value={limit} 
                onChange={e => setLimit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
              </select>
            </div>

            <button 
              onClick={() => handleSearch('custom')}
              disabled={loading}
              className="col-span-2 sm:col-span-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              篩選
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-center animate-in zoom-in-95 duration-300">
             <p className="text-slate-400 font-medium">
               正在透過 Socrates ECM 模型分析市場中的 {screenMode === 'top50' ? '最佳' : '最差'} 50 名表現者...
             </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/10 border border-red-500/30 p-4 rounded-2xl text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
           <div className="p-4 bg-slate-900 border-b border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="font-black text-sm uppercase tracking-widest text-white flex items-center gap-2">
                  <List className="w-5 h-5 text-amber-500" /> 搜尋結果 ({results.length})
                </span>
                <button 
                  onClick={handleExportJson}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-black text-slate-400 hover:text-white transition-all group"
                >
                  <Download className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                  匯出 JSON
                </button>
              </div>
              <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 overflow-x-auto custom-scrollbar whitespace-nowrap">
                <button 
                  onClick={() => setSortBy('default')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === 'default' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  默認排序
                </button>
                <button 
                  onClick={() => setSortBy('pos')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === 'pos' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-400'}`}
                >
                  Pos 值 (高→低)
                </button>
                <button 
                  onClick={() => setSortBy('neg')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === 'neg' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-rose-400'}`}
                >
                  Neg 值 (高→低)
                </button>
                <button 
                  onClick={() => setSortBy('buy')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === 'buy' ? 'bg-emerald-600/50 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-400'}`}
                >
                  買入評分 (高→低)
                </button>
                <button 
                  onClick={() => setSortBy('sell')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === 'sell' ? 'bg-red-600/50 text-white shadow-sm' : 'text-slate-500 hover:text-red-400'}`}
                >
                  賣出評分 (高→低)
                </button>
                <button 
                  onClick={() => setSortBy('quality')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === 'quality' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-400'}`}
                >
                  Quality (高→低)
                </button>
                <button 
                  onClick={() => setSortBy('value')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === 'value' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-purple-400'}`}
                >
                  Value (高→低)
                </button>
                <button 
                  onClick={() => setSortBy('crashSim')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === 'crashSim' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-amber-400'}`}
                >
                  崩盤相似度 (高→低)
                </button>
              </div>
           </div>
           <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-950 text-slate-500 sticky top-0 z-10">
                 <tr>
                   <th className="p-4 w-24">代號</th>
                   <th className="p-4">名稱</th>
                   <th className="p-4 w-28">價格 (USD)</th>
                   <th className="p-4 min-w-[450px]">Socrates 評分</th>
                   <th className="p-4">週期狀態/簡評</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {sortedResults.map((item, idx) => (
                   <tr key={idx} className="hover:bg-slate-800/40 transition-all group border-l-4 border-l-transparent hover:border-l-amber-500">
                     <td className="p-4 font-black text-white group-hover:text-amber-500 transition-colors terminal-text uppercase tracking-tighter">{item.symbol}</td>
                     <td className="p-4 text-slate-300 font-bold">
                       {item.name}
                       <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{item.sector || '-'}</div>
                     </td>
                     <td className="p-4 font-black text-amber-500 terminal-text">
                       <div className="flex flex-col">
                         <span>${item.price?.toLocaleString()}</span>
                         <span className="text-[8px] text-emerald-500/70 terminal-text">LIVE • YAHOO</span>
                       </div>
                     </td>
                     <td className="p-4">
                        <div className="flex gap-2">
                           <div className="flex flex-col items-center gap-1">
                             <ScoreCircle score={item.aiScore ?? 5} type="ai" />
                             <span className="text-[9px] text-sky-500 font-black uppercase tracking-tighter">AI</span>
                           </div>
                           <div className="flex flex-col items-center gap-1">
                             <ScoreCircle score={item.buyScore || 0} type="buy" />
                             <span className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">Buy</span>
                           </div>
                           <div className="flex flex-col items-center gap-1">
                             <ScoreCircle score={item.sellScore || 0} type="sell" />
                             <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter">Sell</span>
                           </div>
                           <div className="flex flex-col items-center gap-1">
                             <ScoreCircle score={item.qualityScore || 0} type="quality" />
                             <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">Qual</span>
                           </div>
                           <div className="flex flex-col items-center gap-1">
                             <ScoreCircle score={item.valueScore || 0} type="value" />
                             <span className="text-[9px] text-purple-500 font-black uppercase tracking-tighter">Val</span>
                           </div>
                           <div className="flex flex-col items-center gap-1 relative group" title="最近2次歷史崩盤相似度 (1-10)">
                             <ScoreCircle score={item.crashSimilarityScore || 0} type="crashSim" />
                             <span className="text-[9px] text-amber-500 font-black uppercase tracking-tighter whitespace-nowrap">Crash</span>
                           </div>

                           <div className="flex flex-col items-center justify-center bg-emerald-950/20 p-1.5 rounded-xl border border-emerald-500/20 min-w-[52px] h-[48px] shadow-inner shrink-0 mt-0.5 ml-2">
                              <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">Pos.</span>
                              <div className="flex items-baseline gap-0.5">
                                 <span className="text-base font-black terminal-text text-emerald-400">
                                   +{getPosScore(item)}
                                 </span>
                              </div>
                           </div>
                           
                           <div className="flex flex-col items-center justify-center bg-rose-950/20 p-1.5 rounded-xl border border-rose-500/20 min-w-[52px] h-[48px] shadow-inner shrink-0 mt-0.5 ml-1">
                              <span className="text-[8px] font-black text-rose-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">Neg.</span>
                              <div className="flex items-baseline gap-0.5">
                                 <span className="text-base font-black terminal-text text-rose-400">
                                   +{getNegScore(item)}
                                 </span>
                              </div>
                           </div>
                        </div>
                     </td>
                     <td className="p-4">
                       <div className="flex items-center gap-2 max-w-xs">
                          {item.ecmStatus?.toLowerCase().includes('danger') || (item.sellScore || 0) > 7 ? (
                            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                          ) : (item.buyScore || 0) > 7 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Activity className="w-4 h-4 text-slate-600" />
                          )}
                          <span className={`text-[13px] font-bold leading-tight ${
                            (item.buyScore || 0) > 7 ? 'text-emerald-400' : 
                            (item.sellScore || 0) > 7 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {item.ecmStatus || '分析中...'}
                          </span>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

const TransactionModal = ({ isOpen, onClose, symbol, name, currentPrice, defaultType, onConfirm }: any) => {
  const [type, setType] = useState(defaultType || 'Buy');
  const [shares, setShares] = useState(1);
  const [price, setPrice] = useState(currentPrice || 0);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType || 'Buy');
      setPrice(currentPrice || 0);
      setShares(1);
    }
  }, [isOpen, defaultType, currentPrice]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(type, symbol, Number(price), name, Number(shares));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl">
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          {type === 'Buy' || type === 'MarginBuy' ? <Plus className="w-6 h-6 text-blue-500" /> : <Minus className="w-6 h-6 text-orange-500" />}
          新增交易: {symbol}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2">交易類型</label>
            <div className="grid grid-cols-2 gap-3">
              {['Buy', 'Sell', 'Short', 'MarginBuy'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-3 rounded-xl text-sm font-black transition-colors border ${
                    type === t 
                      ? (t === 'Buy' || t === 'MarginBuy' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-orange-600 border-orange-500 text-white')
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {t === 'MarginBuy' ? '融資買進' : t === 'Buy' ? '買入' : t === 'Sell' ? '賣出' : '融券放空'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">股數 (Shares)</label>
              <input 
                type="number" 
                min="0.0001" 
                step="any"
                value={shares} 
                onChange={e => setShares(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-mono focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">價格 (Price)</label>
              <input 
                type="number" 
                min="0" 
                step="any"
                value={price} 
                onChange={e => setPrice(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-mono focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
             <div className="flex justify-between items-center text-sm">
               <span className="text-slate-500">預估金額</span>
               <span className="font-mono font-bold text-white text-base">${(shares * price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
             </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 text-slate-400 py-3.5 rounded-xl font-bold hover:bg-slate-700 transition-colors text-sm">取消</button>
            <button type="submit" className="flex-1 bg-amber-600 text-white py-3.5 rounded-xl font-black hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 text-sm">
              <Save className="w-5 h-5" /> 確認交易
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PortfolioModal = ({ 
  isOpen, onClose, trades = [], watchlist = [], currentPrices = {}, onDeleteTrade, onDeleteWatch, onRefresh, isUpdating, onSyncToCloud, cloudStatus, onImport, onExport, onAddTrade
}: any) => {
  const [activeTab, setActiveTab] = useState<'trades' | 'watchlist'>('trades');
  const [transactionModalData, setTransactionModalData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const INITIAL_CAPITAL = 6000;
  
  if (!isOpen) return null;

  const safeTrades = (Array.isArray(trades) ? trades : []) as Trade[];

  const allCalculations = safeTrades.map((trade: any) => {
    if (!trade || !trade.symbol) return { ...trade, pnl: 0, marketVal: 0 };
    const market = currentPrices[trade.symbol?.toUpperCase()];
    const curPrice = Number(market?.price || trade.price) || 0;
    const entryPrice = Number(trade.price) || 0;
    const shares = Number(trade.shares) || 0;
    let pnl = 0;
    if (trade.type === 'Short' || trade.type === 'Sell') { pnl = (entryPrice - curPrice) * shares; } 
    else { pnl = (curPrice - entryPrice) * shares; }
    return { ...trade, pnl, displayPrice: curPrice };
  });

  const totalPnL = allCalculations.reduce((acc: number, t: any) => acc + (Number(t.pnl) || 0), 0);
  const netLiq = INITIAL_CAPITAL + totalPnL;

  const formatNum = (num: number) => {
    if (isNaN(num)) return "0.00";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const groupedTrades = safeTrades.reduce((groups: Record<string, Trade[]>, t: Trade) => {
    if (!t || typeof t !== 'object' || !t.symbol) return groups;
    if (!groups[t.symbol]) groups[t.symbol] = [];
    groups[t.symbol].push(t);
    return groups;
  }, {} as Record<string, Trade[]>);

  const handleImportClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onImport(file); e.target.value = ''; }
  };
  const openTransactionModal = (type: string, symbol: string, price: number, name: string) => { setTransactionModalData({ type, symbol, price, name }); };
  const handleTransactionConfirm = (type: any, symbol: any, price: any, name: any, shares: any) => { onAddTrade(type, symbol, price, name, shares); };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col gap-4 bg-slate-800/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-amber-500" />
                <h2 className="text-2xl font-black text-white">資產管理</h2>
                {isUpdating && <Loader2 className="w-5 h-5 animate-spin text-amber-500 ml-2" />}
              </div>
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                <button type="button" onClick={handleImportClick} className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 flex items-center gap-2 px-4 transition-colors"><Upload className="w-5 h-5" /><span className="text-sm font-bold hidden sm:inline">匯入</span></button>
                <button type="button" onClick={onExport} className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 flex items-center gap-2 px-4 transition-colors"><Download className="w-5 h-5" /><span className="text-sm font-bold hidden sm:inline">匯出</span></button>
                <button type="button" disabled={isUpdating} onClick={onRefresh} className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 flex items-center gap-2 px-4 transition-colors disabled:opacity-50"><RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} /><span className="text-sm font-bold hidden sm:inline">刷新</span></button>
                <button type="button" onClick={onSyncToCloud} className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-amber-500 transition-colors">{cloudStatus === 'syncing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}</button>
                <button type="button" onClick={onClose} className="p-3 text-slate-400 hover:text-white transition-colors"><X className="w-7 h-7" /></button>
              </div>
            </div>
            <div className="flex bg-slate-900/50 p-1.5 rounded-xl">
              <button type="button" onClick={() => setActiveTab('trades')} className={`flex-1 py-3 rounded-lg text-sm font-black transition-all ${activeTab === 'trades' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>交易倉位 ({Object.keys(groupedTrades).length})</button>
              <button type="button" onClick={() => setActiveTab('watchlist')} className={`flex-1 py-3 rounded-lg text-sm font-black transition-all ${activeTab === 'watchlist' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>觀察名單 ({watchlist.length})</button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {activeTab === 'trades' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700"><span className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 mb-1"><Coins className="w-4 h-4"/>淨值</span><div className={`text-3xl md:text-4xl font-mono font-black ${netLiq >= INITIAL_CAPITAL ? 'text-emerald-400' : 'text-red-400'}`}>${formatNum(netLiq)}</div></div>
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700"><span className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 mb-1"><Activity className="w-4 h-4"/>總盈虧</span><div className={`text-3xl md:text-4xl font-mono font-black ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPnL >= 0 ? '+' : ''}{formatNum(totalPnL)}</div></div>
                </div>
                {Object.keys(groupedTrades).length === 0 ? (<div className="text-center py-12 text-slate-500 opacity-50 flex flex-col items-center"><History className="w-16 h-16 mb-4" /><p className="text-lg">尚無交易紀錄</p></div>) : (
                  <div className="space-y-4">
                    {Object.entries(groupedTrades).map(([symbol, items]) => {
                      const firstItem = items[0];
                      const market = currentPrices[symbol?.toUpperCase()];
                      const curPrice = Number(market?.price) || Number(firstItem.price) || 0;
                      let netShares = 0;
                      items.forEach(t => { if (t.type === 'Buy' || t.type === 'MarginBuy') netShares += Number(t.shares); else netShares -= Number(t.shares); });
                      return (
                        <div key={symbol} className="bg-slate-800/40 rounded-2xl border border-slate-700 overflow-hidden">
                          <div className="p-5 bg-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-4"><div className="bg-slate-700/50 p-3 rounded-lg"><span className="font-black text-xl text-white block">{symbol}</span></div><div><div className="flex items-baseline gap-2"><span className="text-sm text-slate-500 font-bold uppercase">淨倉位</span><span className={`text-base font-black font-mono ${netShares >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{netShares} 股</span></div><div className="text-xs text-slate-500 mt-1">現價: <span className="text-slate-300 font-mono text-sm">${curPrice.toFixed(2)}</span></div></div></div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                               <button onClick={() => openTransactionModal('Buy', symbol, curPrice, firstItem.name)} className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all">買入</button>
                               <button onClick={() => openTransactionModal('Sell', symbol, curPrice, firstItem.name)} className="flex-1 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all">賣出</button>
                            </div>
                          </div>
                          <div className="p-4 bg-slate-900/30 border-t border-slate-700/50">
                            <div className="space-y-2">{items.map((t) => (
                              <div key={t.id} className="flex justify-between items-center bg-slate-800/30 px-4 py-3 rounded-lg border border-slate-700/30">
                                <span className={`text-xs px-2 py-1 rounded-md font-black w-14 text-center ${t.type.includes('Buy') ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>{t.type}</span>
                                <span className="text-sm font-mono text-slate-300">{t.shares} @ ${t.price}</span>
                                <button type="button" onClick={() => onDeleteTrade(t.id)} className="p-2 text-slate-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            ))}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                 {watchlist.length === 0 ? (<div className="text-center py-12 text-slate-500 opacity-50 flex flex-col items-center"><Eye className="w-16 h-16 mb-4" /><p className="text-lg">觀察清單目前是空的</p></div>) : (
                   watchlist.map((item: WatchlistItem) => {
                     const market = currentPrices[item.symbol?.toUpperCase()];
                     const price = Number(market?.price || item.price) || 0;
                     const change = Number(market?.changePercent || item.changePercent) || 0;
                     return (
                      <div key={item.symbol} className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 flex justify-between items-center group">
                        <div className="flex items-center gap-3"><span className="font-black text-white text-xl">{item.symbol}</span></div>
                        <div className="text-right flex items-center gap-6">
                          <div><div className="font-mono font-black text-amber-500 text-lg">${price.toLocaleString()}</div><div className={`text-xs font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</div></div>
                          <button type="button" onClick={() => onDeleteWatch(item.symbol)} className="p-3.5 text-slate-600 hover:text-red-400 transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </div>
                     )
                   })
                 )}
              </div>
            )}
          </div>
        </div>
      </div>
      <TransactionModal isOpen={!!transactionModalData} onClose={() => setTransactionModalData(null)} symbol={transactionModalData?.symbol} name={transactionModalData?.name} currentPrice={transactionModalData?.price} defaultType={transactionModalData?.type} onConfirm={handleTransactionConfirm} />
    </>
  );
};

const ReportView = ({ report, onGenerate, loading, symbol, stockData }: { report: StockReport | null, onGenerate: () => void, loading: boolean, symbol: string, stockData: StockData }) => {
  const [strategyTab, setStrategyTab] = useState<'pyramid' | 'inverted' | 'hybrid'>('pyramid');
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);

  const phaseMap: Record<string, string> = {
    'Pre-market': '盤前準備',
    'Opening': '開盤策略',
    'Midday': '盤中調整',
    'Closing': '收盤操作'
  };

  const impactMap: Record<string, string> = {
    'Bullish': '看多',
    'Bearish': '看空',
    'Neutral': '中立'
  };

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-slate-800/50 p-8 rounded-full border border-slate-700 shadow-2xl relative group">
          <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <FileText className="w-16 h-16 text-amber-500 relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-white">尚未生成智能交易報告</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            根據最新的市場新聞、Socrates ECM 模型回測數據，為您生成專屬的每日交易計劃與策略分析。
          </p>
        </div>
        <button 
          onClick={onGenerate} 
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 rounded-xl font-black text-lg shadow-lg shadow-amber-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />}
          {loading ? '正在分析大數據...' : '立即生成報告'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
        <span>報告生成時間: {new Date(report.generatedAt).toLocaleString()}</span>
        <button onClick={onGenerate} disabled={loading} className="flex items-center gap-2 hover:text-amber-500 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 重新生成
        </button>
      </div>

      {/* 1. Trading Strategy */}
      {report.tradingStrategy && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl mb-8 flex flex-col">
          <button 
            onClick={() => setIsStrategyOpen(!isStrategyOpen)}
            className="w-full p-6 bg-slate-900/80 border-b border-slate-700 hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors"><CheckCircle className="w-6 h-6 text-blue-400" /></div>
              <h3 className="text-xl font-black text-white">交易策略</h3>
            </div>
            
            <ChevronDown className={`w-6 h-6 text-slate-500 transition-transform duration-300 group-hover:text-amber-500 ${isStrategyOpen ? 'rotate-180 text-amber-500' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isStrategyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-700/50"
              >
                <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex justify-end">
                  <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                    <button 
                      onClick={() => setStrategyTab('pyramid')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${strategyTab === 'pyramid' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      正金字塔加码
                    </button>
                    <button 
                      onClick={() => setStrategyTab('inverted')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${strategyTab === 'inverted' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      倒金字塔加码
                    </button>
                     <button 
                      onClick={() => setStrategyTab('hybrid')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${strategyTab === 'hybrid' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      折中方案
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700 text-slate-300 font-medium leading-relaxed text-sm">
                     <div className="flex items-center gap-2 mb-2">
                       <span className={`text-xs font-black px-2 py-1 rounded-md uppercase ${report.tradingStrategy.direction === 'Buy' ? 'bg-emerald-500/20 text-emerald-400' : report.tradingStrategy.direction === 'Short' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-400'}`}>
                         {report.tradingStrategy.direction === 'Buy' ? '買進 (Buy)' : report.tradingStrategy.direction === 'Short' ? '融券賣出 (Short)' : '觀望 (Wait)'}
                       </span>
                     </div>
                     {report.tradingStrategy.overview}
                  </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(() => {
                const currentStrategyData = report.tradingStrategy[strategyTab];
                const strategyEntries: EntryBatch[] = Array.isArray(currentStrategyData) ? currentStrategyData : (currentStrategyData?.entries || []);
                const extraPlanOverview = Array.isArray(currentStrategyData) ? null : currentStrategyData?.extraPlanOverview;
                const extraPlanEntries = Array.isArray(currentStrategyData) ? null : currentStrategyData?.extraPlanEntries;

                return (
                  <div className="w-full lg:col-span-4 flex flex-col gap-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {strategyEntries.map((batch: EntryBatch, idx: number) => (
                        <div key={idx} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="text-4xl font-black">{idx + 1}</span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase bg-blue-500/20 text-blue-400">
                              第 {idx + 1} 批進場
                            </span>
                            <span className="font-mono text-amber-500 text-base font-black">{batch.percentage}</span>
                          </div>
                          
                          <div className="space-y-3 relative z-10">
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block mb-0.5">觸發條件</span>
                              <h4 className="text-white font-bold text-xs leading-snug">{batch.triggerCondition}</h4>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block mb-0.5">操作細節</span>
                              <p className="text-slate-400 text-xs leading-relaxed">{batch.actionDetails}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {extraPlanEntries && extraPlanEntries.length > 0 && (
                      <div className="mt-4 border-t border-slate-700/50 pt-4 animate-in slide-in-from-bottom-4 duration-500 border-x-0 border-b-0">
                        <h4 className="text-base font-black text-amber-500 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> 額外方案
                        </h4>
                        {extraPlanOverview && (
                          <p className="text-slate-300 text-xs mb-4 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-amber-500/10">
                            {extraPlanOverview}
                          </p>
                        )}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {extraPlanEntries.map((batch: EntryBatch, idx: number) => (
                            <div key={`extra-${idx}`} className="bg-slate-900/50 rounded-xl p-4 border border-amber-500/10 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="text-4xl font-black text-amber-500">{idx + 1}</span>
                              </div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase bg-amber-500/10 text-amber-500">
                                  第 {idx + 1} 批進場
                                </span>
                                <span className="font-mono text-amber-500 text-base font-black">{batch.percentage}</span>
                              </div>
                              <div className="space-y-3 relative z-10">
                                <div>
                                  <span className="text-[10px] text-amber-600/70 font-bold block mb-0.5">觸發條件</span>
                                  <h4 className="text-white font-bold text-xs leading-snug">{batch.triggerCondition}</h4>
                                </div>
                                <div>
                                  <span className="text-[10px] text-amber-600/70 font-bold block mb-0.5">操作細節</span>
                                  <p className="text-slate-400 text-xs leading-relaxed">{batch.actionDetails}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}

      {/* 2. News & Insights */}
      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl mb-8 flex flex-col">
        <div className="p-6 bg-slate-900/80 border-b border-slate-700 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg"><TrendingUpIcon className="w-6 h-6 text-emerald-400" /></div>
          <h3 className="text-xl font-black text-white">新聞摘要與市場洞察</h3>
        </div>
        <div className="p-6 flex-1 flex flex-col gap-6">
          <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50">
            <h4 className="text-slate-400 text-xs font-black uppercase mb-3">最新消息摘要</h4>
            <p className="text-slate-200 leading-relaxed font-medium">{report.newsInsight.summary}</p>
          </div>
          
          {report.newsInsight.comprehensiveAnalysis && (
            <div className="bg-slate-900/50 p-5 rounded-2xl border border-rose-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full" />
              <h4 className="text-rose-400 text-xs font-black uppercase mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> 綜合分析
              </h4>
              <p className="text-slate-200 leading-relaxed font-medium relative z-10">{report.newsInsight.comprehensiveAnalysis}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">
              <span className="text-xs font-black text-slate-500 uppercase block mb-2">短期影響</span>
              <div className={`text-lg font-black flex items-center gap-2 ${
                report.newsInsight.shortTermImpact === 'Bullish' ? 'text-emerald-400' : 
                report.newsInsight.shortTermImpact === 'Bearish' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {report.newsInsight.shortTermImpact === 'Bullish' ? <TrendingUpIcon className="w-5 h-5" /> : 
                 report.newsInsight.shortTermImpact === 'Bearish' ? <TrendingDownIcon className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                {impactMap[report.newsInsight.shortTermImpact] || report.newsInsight.shortTermImpact}
              </div>
            </div>
            <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">
              <span className="text-xs font-black text-slate-500 uppercase block mb-2">長期展望</span>
              <div className={`text-lg font-black flex items-center gap-2 ${
                report.newsInsight.longTermImpact === 'Bullish' ? 'text-emerald-400' : 
                report.newsInsight.longTermImpact === 'Bearish' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {report.newsInsight.longTermImpact === 'Bullish' ? <TrendingUpIcon className="w-5 h-5" /> : 
                 report.newsInsight.longTermImpact === 'Bearish' ? <TrendingDownIcon className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                {impactMap[report.newsInsight.longTermImpact] || report.newsInsight.longTermImpact}
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <h4 className="text-slate-400 text-xs font-black uppercase mb-3">關鍵驅動因素</h4>
            <div className="flex flex-wrap gap-2">
              {report.newsInsight.keyDrivers?.map((tag, i) => (
                <span key={i} className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm font-bold border border-slate-600/50">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Price Analysis & Resistance/Support */}
      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl mb-8 flex flex-col">
         <div className="p-6 bg-slate-900/80 border-b border-slate-700 flex items-center gap-3">
             <div className="p-2 bg-blue-500/20 rounded-lg"><Activity className="w-6 h-6 text-blue-400" /></div>
             <h3 className="text-xl font-black text-white">股價位階與支撐壓力評估</h3>
         </div>
         <div className="p-6">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-700 text-center relative overflow-hidden shadow-inner">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />
                 <span className="text-xs text-slate-500 uppercase block mb-2 font-bold">阻力位 (Resistance)</span>
                 <span className="text-3xl font-black text-rose-400 tracking-tighter terminal-text tabular-nums text-shadow-sm">${stockData.resistanceLevel || 'N/A'}</span>
              </div>
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-700 text-center relative overflow-hidden shadow-inner">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                 <span className="text-xs text-slate-500 uppercase block mb-2 font-bold text-center">支撐位 (Support)</span>
                 <span className="text-3xl font-black text-emerald-400 tracking-tighter terminal-text tabular-nums text-shadow-sm">${stockData.supportLevel || 'N/A'}</span>
              </div>
            </div>

             {/* 支撐壓力評估 */}
             {report.newsInsight.supportResistance ? (
               <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-700/30 flex flex-col mb-6">
                  <h4 className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-400" /> 支撐／壓力評估
                  </h4>
                  <p className="text-slate-300 leading-relaxed text-sm mb-4">{report.newsInsight.supportResistance.analysis}</p>
                  <div className="mt-auto">
                     <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">止損距離</span>
                        <span className="font-mono font-black text-emerald-400 text-sm whitespace-nowrap">{report.newsInsight.supportResistance.stopLossDistance}</span>
                     </div>
                  </div>
               </div>
             ) : (
               <div className="bg-slate-900/10 p-5 rounded-xl border border-slate-700/10 flex flex-col justify-center opacity-50 mb-6">
                 <h4 className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-3 text-center">-</h4>
               </div>
             )}

            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50">
               <h4 className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-4 flex items-center gap-2">
                 <Zap className="w-4 h-4 text-blue-400" /> AI 價位分析
               </h4>
               <p className="text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">{stockData.priceAnalysis || "尚未生成價位分析。請嘗試重新查詢以取得最新資料。"}</p>
            </div>
         </div>
      </div>

      {/* 4. 建議定位 (Horizontal Layout) */}
      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl flex flex-col mb-8">
         <div className="p-6 bg-slate-900/80 border-b border-slate-700 flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg"><Target className="w-6 h-6 text-amber-400" /></div>
          <h3 className="text-xl font-black text-white">建議定位</h3>
        </div>
        <div className="p-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
             {/* 價格波動 & 動能 */}
             <div className="grid grid-rows-2 gap-4">
               <div className="bg-slate-900 py-4 px-3 rounded-2xl border border-slate-700 text-center flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">價格波動區間</span>
                  <div className="text-lg font-mono font-black text-white truncate">{report.newsInsight.priceRange}</div>
               </div>
               {report.newsInsight.momentum ? (
                 <div className="bg-slate-900 py-4 px-3 rounded-2xl border border-slate-700 text-center flex flex-col justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">動能強度</span>
                    <div className={`text-lg font-black ${
                      report.newsInsight.momentum.level === 'High' ? 'text-emerald-400' :
                      report.newsInsight.momentum.level === 'Low' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {report.newsInsight.momentum.level === 'High' ? '高動能 (HIGH)' :
                       report.newsInsight.momentum.level === 'Low' ? '低動能 (LOW)' : '中位 (MEDIUM)'}
                    </div>
                 </div>
               ) : (
                 <div className="bg-slate-900 py-4 px-3 rounded-2xl border border-slate-700 text-center flex flex-col justify-center opacity-50">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">動能強度</span>
                    <div className="text-lg font-black text-slate-500">-</div>
                 </div>
               )}
             </div>

             {/* 操作建議 */}
             <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-center">
                <h4 className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-3">操作建議</h4>
                <p className="text-slate-300 leading-relaxed text-sm font-medium">{report.newsInsight.positioning}</p>
             </div>

             {/* 動能位置 */}
             {report.newsInsight.momentum ? (
               <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-700/30 flex flex-col justify-center">
                  <h4 className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-3 flex items-center gap-1.5">
                    <TrendingUpIcon className="w-3.5 h-3.5 text-blue-400" /> 動能位置
                  </h4>
                  <p className="text-slate-300 leading-relaxed text-sm">{report.newsInsight.momentum.description}</p>
               </div>
             ) : (
               <div className="bg-slate-900/10 p-5 rounded-xl border border-slate-700/10 flex flex-col justify-center opacity-50">
                 <h4 className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-3 text-center">-</h4>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* 5. Backtest Results */}
      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl mb-8 flex flex-col">
        <button 
          onClick={() => setIsBacktestOpen(!isBacktestOpen)}
          className="w-full p-6 bg-slate-900/80 border-b border-slate-700 hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors"><Shield className="w-6 h-6 text-purple-400" /></div>
            <h3 className="text-xl font-black text-white">Socrates ECM 策略回測報告</h3>
          </div>
          <ChevronDown className={`w-6 h-6 text-slate-500 transition-transform duration-300 group-hover:text-amber-500 ${isBacktestOpen ? 'rotate-180 text-amber-500' : ''}`} />
        </button>
        <AnimatePresence>
          {isBacktestOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-700/50"
            >
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-1 space-y-4">
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 flex justify-between items-center">
                       <span className="text-slate-500 font-bold text-sm">勝率</span>
                       <span className="text-2xl font-mono font-black text-emerald-400">{report.backtest.winRate}</span>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 flex justify-between items-center">
                       <span className="text-slate-500 font-bold text-sm">獲利因子</span>
                       <span className="text-2xl font-mono font-black text-amber-400">{report.backtest.profitFactor}</span>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 flex justify-between items-center">
                       <span className="text-slate-500 font-bold text-sm">最大回撤</span>
                       <span className="text-2xl font-mono font-black text-red-400">{report.backtest.maxDrawdown}</span>
                    </div>
                    <div className="text-center text-xs text-slate-500 font-mono mt-2">
                       回測期間: {report.backtest.analysisPeriod}
                    </div>
                 </div>
                 <div className="md:col-span-2 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                    <h4 className="text-slate-400 text-xs font-black uppercase mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" /> 策略改進建議
                    </h4>
                    <ul className="space-y-3">
                      {report.backtest.improvements?.map((imp, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300 text-sm font-medium bg-slate-800/50 p-3 rounded-xl border border-slate-700/30">
                          <span className="bg-slate-700 text-slate-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</span>
                          <span className="leading-relaxed">{imp}</span>
                        </li>
                      ))}
                    </ul>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. Historical Data */}
      <HistoricalDrawdownView data={stockData} />
    </div>
  );
};

const CloudSettingsModal = ({ isOpen, onClose, url, onSave }: any) => {
  const [val, setVal] = useState(url);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl">
        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2"><Database className="w-6 h-6 text-amber-500" /> 雲端同步設定</h3>
        <input type="text" value={val} onChange={e => setVal(e.target.value)} placeholder="GAS URL..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base mb-5 text-amber-500 outline-none" />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl font-bold">取消</button>
          <button type="button" onClick={() => onSave(val)} className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-black">儲存</button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [inputSymbol, setInputSymbol] = useState('');
  const [stockResults, setStockResults] = useState<StockData[]>([]);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const stockData = stockResults[currentStockIndex] || null;
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [viewTab, setViewTab] = useState<'analysis' | 'screener' | 'report'>('analysis');
  const [reports, setReports] = useState<Record<string, StockReport>>({});
  const report = stockData ? reports[stockData.symbol] || null : null;
  const [reportLoading, setReportLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>(() => { const s = localStorage.getItem('ecm_trades'); return s ? JSON.parse(s) : []; });
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => { const s = localStorage.getItem('ecm_watchlist'); return s ? JSON.parse(s) : []; });
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cachedPrices, setCachedPrices] = useState<Record<string, MarketData>>({});
  const [error, setError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('ecm_sheet_url') || '');
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [refreshingSingle, setRefreshingSingle] = useState(false);

  useEffect(() => { localStorage.setItem('ecm_trades', JSON.stringify(trades)); }, [trades]);
  useEffect(() => { localStorage.setItem('ecm_watchlist', JSON.stringify(watchlist)); }, [watchlist]);

  useEffect(() => {
    if (viewTab === 'report' && stockData && !report && !reportLoading) {
      fetchReport(stockData);
    }
  }, [viewTab, stockData, report, reportLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Fullscreen request failed: ${err.message}`);
          });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const handleExportAnalysis = () => {
    if (stockResults.length === 0) {
      alert("沒有可匯出的分析資料");
      return;
    }
    const data = {
      stockResults,
      reports, 
      timestamp: Date.now()
    };
    const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(b);
    const l = document.createElement('a');
    l.href = u;
    l.download = `socrates_analysis_${new Date().toLocaleDateString().replace(/\//g, '')}.json`;
    l.click();
  };

  const handleImportAnalysis = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.stockResults && Array.isArray(json.stockResults)) {
          setStockResults(json.stockResults);
          setCurrentStockIndex(0);
          if (json.reports) {
            setReports(json.reports);
          } else if (json.report && json.stockResults.length > 0) {
            setReports({ [json.stockResults[0].symbol]: json.report });
          } else {
            setReports({});
          }
          alert("匯入分析資料成功！");
        } else {
          alert("無效的資料格式");
        }
      } catch (err) {
        alert("讀取檔案失敗");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  const handleExportPdf = async () => {
    setIsExporting(true);
    setTimeout(async () => {
      try {
        const element = pdfRef.current;
        if (!element) return;
        
        const originalOverflow = element.style.overflow;
        element.style.overflow = 'visible';

        const canvas = await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#0f172a', // standard slate-900 background
          logging: false,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        });
        
        element.style.overflow = originalOverflow;

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();
        }

        const fileName = stockData?.symbol ? `${stockData.symbol}_Socrates_Report.pdf` : 'Socrates_Report.pdf';
        pdf.save(fileName);
      } catch (err) {
        console.error("PDF Export failed", err);
      } finally {
        setIsExporting(false);
      }
    }, 800);
  };

  const fetchAnalysis = async () => {
    if (!inputSymbol.trim()) return;
    const symbols = inputSymbol.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '');
    if (symbols.length === 0) return;

    setLoading(true); 
    setError(null); 
    setStockResults([]); 
    setCurrentStockIndex(0);
    setReports({}); 
    setViewTab('report');

    const results: StockData[] = [];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        setLoadingProgress(`正在分析第 ${i + 1}/${symbols.length} 個標的: ${sym}...`);
        
        const prompt = `You are Martin Armstrong's Socrates AI. Perform an in-depth 8.6-year ECM cycle analysis for "${sym}".
        
        Step 1: CRITICAL - Use Google Search to find the ABSOLUTELY LATEST real-time price, change percentage, and currency for "${sym}" from Yahoo Finance. Look at the live quote page.
        Step 2: Collect fundamental data to evaluate Quality Score and Value Score. 
          - Quality Score (1-10): Evaluate based on stable revenue/EPS growth, reasonable/high ROE/ROIC, positive/stable FCF, and moderate debt.
          - Value Score (1-10): Evaluate based on P/E, P/B, EV/EBITDA, PEG. Consider "cheapness" vs "expensiveness". Incorporate red flags like Accounts Receivable growing faster than revenue, frequent one-time charges, or FCF significantly lagging net income.
        Step 3: Evaluate Historical Crash Similarity Score (1-10) ("歷史崩盤相似度"):
          - Review the 2 most recent significant drawdowns for this asset within the past 52 to 260 weeks (1-5 years).
          - Identify the peak-to-trough drop percentage for those 2 historical crashes.
          - Compare the current drawdown (from recent ATH) or recent price action to these historical crash percentages. 
          - The CLOSER the current setup is to the percentage magnitudes of past crashes, the HIGHER the score (meaning it strongly resembles past crashes). The FURTHER away or less severe, the lower the score.
        Step 4: Perform the ECM analysis based on historical data patterns and current market context.
        
        Output Language: Traditional Chinese (繁體中文).
        
        Required JSON Structure:
        {
          "symbol": "${sym}", 
          "name": "...", 
          "price": 0.00, 
          "changePercent": 0.00, 
          "currency": "USD",
          "lastAnchorDate": "YYYY-MM-DD", 
          "anchorType": "High" | "Low", 
          "nextTurningPoint": "YYYY-MM-DD",
          "analysis": "ECM 深度週期定位分析 (繁體中文)...",
          "priceAnalysis": "詳細探討該股票現在價位屬於高還是低，並分析目前的股價位階 (繁體中文)...",
          "ecmTimelineSummary": "總結 ECM 預測的關鍵時間點與趨勢 (繁體中文)",
          "currentPhaseStatus": "目前價格在 ECM 週期中的具體位置與意義 (繁體中文)",
          "trend": "Bullish" | 'Bearish' | "Neutral",
          "buyScore": 8,
          "sellScore": 2,
          "screenerRating": {"score": 8, "action": "Buy"},
          "qualityScore": 8,
          "valueScore": 7,
          "crashSimilarityScore": 5,
          "supportLevel": 0, 
          "resistanceLevel": 0,
          "historicalHigh": 0, 
          "historicalHighDate": "...", 
          "historicalLow": 0, 
          "historicalLowDate": "...",
          "historicalSignals": [{"date": "...", "price": 0, "type": "High", "event": "...", "pnlPercent": 0, "ecmPhase": "..."}],
          "historicalDrawdowns": [{"highDate": "YYYY-MM-DD", "highPrice": 0, "lowDate": "YYYY-MM-DD", "lowPrice": 0, "dropPercent": -30, "reason": "崩盤具體原因 (繁體中文)"}],
          "futureCycleEvents": [{"date": "...", "label": "...", "type": "Major" | "Minor", "description": "..."}]
        }`;
        
        const response = await ai.models.generateContent({ 
          model: 'gemini-3-flash-preview', 
          contents: prompt + "\n\nCRITICAL: Ensure 'historicalDrawdowns' contains at least 3 to 6 significant historical drawdown cycles (must prioritize finding events in the last 2 years). Include detailed reasons in Traditional Chinese. Sort them from newest to oldest.", 
          config: { 
            responseMimeType: 'application/json', 
            tools: [{ googleSearch: {} }], 
            temperature: 0.1 
          } 
        });
        
        const data = safeParseJson(response.text || '{}');
        if (data.symbol) {
          results.push(data);
          setCachedPrices(prev => ({ ...prev, [data.symbol]: { price: Number(data.price), change: 0, changePercent: Number(data.changePercent), prevClose: 0, time: new Date().toLocaleTimeString(), lastUpdated: Date.now() } }));
        }
      }
      
      if (results.length > 0) {
        setStockResults(results);
        fetchReport(results[0]);
      } else {
        setError("未能成功分析任何標的。");
      }
    } catch (err: any) { 
      setError(err.message || "分析失敗"); 
    } finally { 
      setLoading(false); 
      setLoadingProgress('');
    }
  };

  const fetchReport = async (stockObj?: StockData) => {
    const targetStock = stockObj || stockData;
    if (!targetStock?.symbol) return;
    setReportLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Generate a comprehensive trading report for "${targetStock.symbol}" (${targetStock.name}) based on Martin Armstrong's Socrates ECM model and recent market news.
      
      The report must include:
      1. A structured daily trading plan (Pre-market, Opening, Midday, Closing).
      2. News summary and actionable insights (Short/Long term impact, price range, positioning).
      3. A simulated backtest of the Socrates ECM strategy on this stock (Win rate, Profit factor, Max drawdown, improvements).

      Use Google Search to find the most recent news and market data.

      CRITICAL: All descriptive text (summary, action, checklist, positioning, improvements, keyDrivers) MUST be in Traditional Chinese (繁體中文).
      Look closely at the ECM Analysis support/resistance levels and the News Insights. Based on these, determine if the strategy should be 'Buy', 'Short', or 'Wait'.
      If Buy, generate buy entry conditions. If Short, generate short-sell entry conditions.
      For the 4 entry batches, please provide exact allocations (e.g. "10%", "20%", "30%", "40%") and clear trigger condition descriptions.

      ALSO, generate an 'extraPlan' for each strategy mapping to these rules:
      - If direction is 'Buy', the extra plan should be based on buying when the price FALLS (price pullbacks or inverse logic).
      - If direction is 'Short', the extra plan should be based on shorting when the price RISES (price rallies or inverse logic).
      The extra plan portions MUST follow the same logic as the main plan, but triggered on reverse conditions. Or formulate it to specifically match the percentages below.
      The percentages for the main and extra plan MUST be exactly:
      - pyramid (正金字塔): 1st 40%, 2nd 30%, 3rd 20%, 4th 10%
      - inverted (倒金字塔): 1st 10%, 2nd 20%, 3rd 30%, 4th 40%
      - hybrid (折中方案): 1st 20%, 2nd 25%, 3rd 25%, 4th 30%

      Keep the enum values (Bullish, Bearish, Neutral) in English for code compatibility.

      Return the response strictly as a JSON object with the following structure:
      {
        "symbol": "${targetStock.symbol}",
        "tradingStrategy": {
          "direction": "Buy",
          "overview": "分四批進場的交易策略，整體思路與原因 (繁體中文)...",
          "pyramid": {
            "entries": [
              { "percentage": "40%", "triggerCondition": "突破第一支撐位", "actionDetails": "建立基礎倉位..." },
              { "percentage": "30%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "20%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "10%", "triggerCondition": "...", "actionDetails": "..." }
            ],
            "extraPlanOverview": "逆勢佈局或備用回檔加碼方案說明...",
            "extraPlanEntries": [
               { "percentage": "40%", "triggerCondition": "回落至/反彈至...", "actionDetails": "..." },
               { "percentage": "30%", "triggerCondition": "...", "actionDetails": "..." },
               { "percentage": "20%", "triggerCondition": "...", "actionDetails": "..." },
               { "percentage": "10%", "triggerCondition": "...", "actionDetails": "..." }
            ]
          },
          "inverted": {
            "entries": [
              { "percentage": "10%", "triggerCondition": "價格回落測試", "actionDetails": "試探性建倉..." },
              { "percentage": "20%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "30%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "40%", "triggerCondition": "...", "actionDetails": "主力進場..." }
            ],
            "extraPlanOverview": "...",
            "extraPlanEntries": [
              { "percentage": "10%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "20%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "30%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "40%", "triggerCondition": "...", "actionDetails": "..." }
            ]
          },
          "hybrid": {
            "entries": [
              { "percentage": "20%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "25%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "25%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "30%", "triggerCondition": "...", "actionDetails": "..." }
            ],
            "extraPlanOverview": "...",
            "extraPlanEntries": [
              { "percentage": "20%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "25%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "25%", "triggerCondition": "...", "actionDetails": "..." },
              { "percentage": "30%", "triggerCondition": "...", "actionDetails": "..." }
            ]
          }
        },
        "newsInsight": {
          "summary": "近期新聞摘要 (繁體中文)...",
          "comprehensiveAnalysis": "結合目前最新可靠的數據與新聞，綜合分析這些事情對該股價的影響 (繁體中文)...",
          "shortTermImpact": "Bullish",
          "longTermImpact": "Neutral",
          "priceRange": "$100 - $110",
          "positioning": "逢低買入... (繁體中文)",
          "momentum": {
            "level": "High",
            "description": "價格相對 50 日/200 日均線的位置、近期報酬率排序（3–12 個月動能）(繁體中文)..."
          },
          "supportResistance": {
            "analysis": "能偵測關鍵支撐（前低、重要均線）與壓力位... (繁體中文)",
            "stopLossDistance": "合適的止損距離，例如 5% (繁體中文)"
          },
          "keyDrivers": ["財報", "聯準會利率"]
        },
        "backtest": {
          "winRate": "65%",
          "profitFactor": "1.8",
          "maxDrawdown": "-12%",
          "analysisPeriod": "過去 12 個月",
          "improvements": ["收緊止損...", "避免在...時交易"]
        },
        "generatedAt": ${Date.now()}
      }
      
      Do not include markdown formatting. Just return the JSON string.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          tools: [{ googleSearch: {} }]
        }
      });

      const data = safeParseJson(response.text || '{}');
      setReports(prev => ({ ...prev, [targetStock.symbol]: data }));
    } catch (e) {
      console.error(e);
      // Optional: Set an error state for report specifically
    } finally {
      setReportLoading(false);
    }
  };

  const refreshSinglePrice = async () => {
    if (!stockData?.symbol || refreshingSingle) return;
    setRefreshingSingle(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Optimized prompt targeting Google Finance Beta specifically
      const prompt = `Stock: ${stockData.symbol} (${stockData.name}). Use Google Search to find the latest real-time quote (price and % change) from https://www.google.com/finance/beta. Return ONLY JSON: {"price": number, "changePercent": number}`;

      const r = await ai.models.generateContent({ 
        model: 'gemini-2.0-flash',
        contents: prompt, 
        config: { 
          tools: [{ googleSearch: {} }],
          maxOutputTokens: 80,
          temperature: 0,
        } 
      });
      
      const text = r.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const d = safeParseJson(cleaned);
      
      if (d.price) {
        const newPrice = Number(d.price);
        const newChange = Number(d.changePercent || 0);
        
        setStockResults(prev => prev.map((s, idx) => idx === currentStockIndex ? { ...s, price: newPrice, changePercent: newChange } : s));
        
        setCachedPrices(prev => ({ 
          ...prev, 
          [stockData.symbol]: { 
            price: newPrice, 
            change: 0, 
            changePercent: newChange, 
            prevClose: 0, 
            time: new Date().toLocaleTimeString(), 
            lastUpdated: Date.now() 
          } 
        }));
      }
    } catch (e) { 
      console.error('Fast price refresh failed:', e); 
      // Fallback with same logic
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const r = await ai.models.generateContent({ 
          model: 'gemini-3-flash-preview', 
          contents: `Price for ${stockData.symbol} ${stockData.name} from https://www.google.com/finance/beta. Return JSON: {"price": number, "changePercent": number}`,
          config: { tools: [{ googleSearch: {} }] }
        });
        const text = r.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleaned = text.replace(/```json|```/g, '').trim();
        const d = safeParseJson(cleaned);
        if (d.price) {
          setStockResults(prev => prev.map((s, idx) => idx === currentStockIndex ? { ...s, price: Number(d.price), changePercent: Number(d.changePercent || 0) } : s));
        }
      } catch (inner) { console.error('Fallback failed:', inner); }
    } finally { 
      setRefreshingSingle(false); 
    }
  };

  const handleTrade = (type: any, sym?: any, pri?: any, nam?: any, sha?: any) => {
    const s = sym || stockData?.symbol; const p = pri ?? stockData?.price; const n = nam || stockData?.name || s; const sh = sha ?? 1;
    if (!s) return;
    setTrades(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), symbol: s, name: n, type, price: p, shares: sh, date: new Date().toLocaleDateString(), timestamp: Date.now() }]);
  };

  const handleWatchlist = () => {
    if (!stockData) return;
    if (watchlist.some(i => i.symbol === stockData.symbol)) setWatchlist(prev => prev.filter(i => i.symbol !== stockData.symbol));
    else setWatchlist(prev => [...prev, { symbol: stockData.symbol, name: stockData.name, price: Number(stockData.price), changePercent: Number(stockData.changePercent), timestamp: Date.now() }]);
  };

  const refreshPrices = useCallback(async () => {
    const syms = Array.from(new Set([...trades.map(t => t.symbol), ...watchlist.map(w => w.symbol)]));
    if (syms.length === 0 || updatingPrices) return;
    setUpdatingPrices(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Search Yahoo Finance for the latest real-time stock prices and percentage changes for these symbols: ${syms.join(', ')}. 
      Return a JSON object where keys are the Symbols (uppercase) and values are objects containing "price" (number) and "changePercent" (number). 
      Example: {"AAPL": {"price": 150.25, "changePercent": 1.5}}
      Ensure the data is as recent as possible.`;

      const r = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt, 
        config: { 
          responseMimeType: 'application/json', 
          tools: [{ googleSearch: {} }] 
        } 
      });
      const d = safeParseJson(r.text || '{}');
      const np: any = {}; Object.entries(d).forEach(([s, i]: any) => { np[s.toUpperCase()] = { price: Number(i.price), changePercent: Number(i.changePercent), time: new Date().toLocaleTimeString(), lastUpdated: Date.now() }; });
      setCachedPrices(prev => ({ ...prev, ...np }));
    } catch (e) { console.error(e); } finally { setUpdatingPrices(false); }
  }, [trades, watchlist, updatingPrices]);

  const syncCloud = async () => {
    if (!sheetUrl) { setShowSettings(true); return; }
    setCloudStatus('syncing');
    try { await fetch(sheetUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ trades, watchlist }) }); setCloudStatus('success'); } catch (e) { setCloudStatus('error'); }
    setTimeout(() => setCloudStatus('idle'), 3000);
  };

  const handleExport = () => { const b = new Blob([JSON.stringify({ trades, watchlist }, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `backup.json`; l.click(); };
  const handleImport = (f: File) => { const r = new FileReader(); r.onload = (e) => { const j = JSON.parse(e.target?.result as string); if (j.trades) setTrades(j.trades); if (j.watchlist) setWatchlist(j.watchlist); }; r.readAsText(f); };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Clock className="w-9 h-9 text-amber-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse-green" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter">Socrates <span className="text-amber-500">ECM</span></h1>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-700 transition-colors cursor-pointer relative group">
               <Upload className="w-4 h-4 text-emerald-500" />
               <span className="text-white text-sm hidden sm:inline">匯入分析</span>
               <input type="file" accept=".json" className="hidden" onChange={handleImportAnalysis} />
            </label>
            <button onClick={handleExportAnalysis} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-700 transition-colors relative group">
               <Download className="w-4 h-4 text-emerald-500" />
               <span className="text-white text-sm hidden sm:inline">匯出分析</span>
            </button>
            <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 relative group shadow-lg">
               {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Download className="w-4 h-4 text-white" />}
               <span className="text-white text-sm hidden sm:inline">匯出 PDF</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <div className="relative group max-w-2xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-amber-500 transition-colors z-10" />
          <input 
            type="text" 
            value={inputSymbol} 
            onChange={(e) => setInputSymbol(e.target.value.toUpperCase())} 
            onKeyDown={(e) => e.key === 'Enter' && fetchAnalysis()} 
            placeholder="代號 (e.g., NVDA)..." 
            className="w-full bg-slate-950 border-2 border-slate-700/50 px-14 py-5 rounded-3xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] text-xl font-mono transition-all placeholder:text-slate-600" 
          />
          <button 
            onClick={fetchAnalysis} 
            disabled={loading} 
            className="absolute right-3 top-3 bg-amber-600 hover:bg-amber-500 text-white p-3.5 rounded-2xl transition-all shadow-lg active:scale-95"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
          </button>
        </div>
        
        <BuffettIndicator />
        <VixIndicator />
        
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 mt-4 text-amber-500 animate-in fade-in slide-in-from-top-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="font-bold text-lg">ECM 週期運算中...</span>
            {loadingProgress && <span className="text-sm text-slate-500 font-mono">{loadingProgress}</span>}
          </div>
        )}

        {error && <div className="bg-red-900/10 border border-red-500/30 p-6 rounded-2xl text-red-400 flex items-center gap-4"><AlertTriangle className="w-7 h-7" /><p className="font-bold">{error}</p></div>}

        {stockData ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {stockResults.length > 1 && (
              <div className="flex items-center justify-center gap-2 bg-slate-950/50 p-2 rounded-2xl border border-slate-800 self-center mx-auto w-fit">
                {stockResults.map((res, idx) => (
                  <button
                    key={res.symbol}
                    onClick={() => {
                      setCurrentStockIndex(idx);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${currentStockIndex === idx 
                      ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                  >
                    {res.symbol}
                  </button>
                ))}
              </div>
            )}
            
            <div className="bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-700 shadow-[0_0_30px_rgba(0,0,0,0.3)] flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full pl-2">
                <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0">
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter terminal-text leading-none">{stockData.symbol}</h2>
                </div>
                
                <div className="h-10 w-px bg-slate-700 hidden md:block shrink-0" />

                <div className="flex flex-col items-center md:items-start shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                       <div className="flex items-center gap-2">
                         <span className="text-3xl md:text-4xl font-black text-amber-500 tracking-tighter animate-price-glow terminal-text tabular-nums leading-none">
                           ${Number(stockData.price).toLocaleString()}
                         </span>
                         <button 
                           onClick={refreshSinglePrice} 
                           disabled={refreshingSingle}
                           className="p-1 hover:bg-slate-700 rounded-full transition-colors group shrink-0"
                           title="刷新價格"
                         >
                           <RefreshCw className={`w-4 h-4 text-slate-500 group-hover:text-amber-500 ${refreshingSingle ? 'animate-spin' : ''}`} />
                         </button>
                       </div>
                       <div className="flex items-center gap-2 mt-2">
                         <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900/50 ${Number(stockData.changePercent) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                           {Number(stockData.changePercent) >= 0 ? '+' : ''}{stockData.changePercent}%
                         </span>
                         <div className="text-[9px] terminal-text text-slate-600 font-bold uppercase tracking-widest flex items-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           Updates • {new Date().toLocaleTimeString()}
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-700 hidden md:block shrink-0" />

                <div className="flex-1 flex gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar py-1 lg:justify-end">
                  {stockData.screenerRating && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">AI</span>
                       <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black terminal-text ${stockData.screenerRating.action === 'Buy' ? 'text-emerald-400' : stockData.screenerRating.action === 'Sell' ? 'text-rose-400' : 'text-amber-400'}`}>
                            {stockData.screenerRating.score}
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold opacity-70">/10</span>
                       </div>
                       <span className={`text-[7px] font-black uppercase text-center leading-none mt-1 ${stockData.screenerRating.action === 'Buy' ? 'text-emerald-500' : stockData.screenerRating.action === 'Sell' ? 'text-rose-500' : 'text-amber-500'}`}>
                          {stockData.screenerRating.action === 'Buy' ? '買進' : stockData.screenerRating.action === 'Sell' ? '賣出' : '觀望'}
                       </span>
                    </div>
                  )}
                  {stockData.buyScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">Buy</span>
                       <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black terminal-text ${stockData.buyScore >= 7 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {stockData.buyScore}
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold opacity-70">/10</span>
                       </div>
                    </div>
                  )}
                  {stockData.sellScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">Sell</span>
                       <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black terminal-text ${stockData.sellScore >= 7 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {stockData.sellScore}
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold opacity-70">/10</span>
                       </div>
                    </div>
                  )}
                  {stockData.qualityScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">Qual</span>
                       <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black terminal-text ${stockData.qualityScore >= 8 ? 'text-emerald-400' : stockData.qualityScore <= 4 ? 'text-rose-400' : 'text-blue-400'}`}>
                            {stockData.qualityScore}
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold opacity-70">/10</span>
                       </div>
                    </div>
                  )}
                  {stockData.valueScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">Value</span>
                       <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black terminal-text ${stockData.valueScore >= 8 ? 'text-emerald-400' : stockData.valueScore <= 4 ? 'text-rose-400' : 'text-blue-400'}`}>
                            {stockData.valueScore}
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold opacity-70">/10</span>
                       </div>
                    </div>
                  )}
                  {stockData.crashSimilarityScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner relative group shrink-0" title="最近2次歷史崩盤相似度 (1-10)\n分數越高代表目前情況與歷史大規模回調越相似 (高風險)">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap px-1">Crash</span>
                       <div className="flex items-baseline gap-0.5">
                          <span className={`text-lg font-black terminal-text ${stockData.crashSimilarityScore >= 8 ? 'text-rose-400' : stockData.crashSimilarityScore <= 4 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {stockData.crashSimilarityScore}
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold opacity-70">/10</span>
                       </div>
                    </div>
                  )}
                  {stockData.screenerRating && (
                    <div className="flex flex-col items-center justify-center bg-emerald-950/20 p-1.5 rounded-xl border border-emerald-500/20 min-w-[58px] h-[52px] shadow-inner shrink-0">
                       <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">Pos.</span>
                       <div className="flex items-baseline gap-0.5">
                          <span className="text-lg font-black terminal-text text-emerald-400">
                            +{getPosScore(stockData)}
                          </span>
                       </div>
                    </div>
                  )}
                  {stockData.screenerRating && (
                    <div className="flex flex-col items-center justify-center bg-rose-950/20 p-1.5 rounded-xl border border-rose-500/20 min-w-[58px] h-[52px] shadow-inner shrink-0">
                       <span className="text-[8px] font-black text-rose-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">Neg.</span>
                       <div className="flex items-baseline gap-0.5">
                          <span className="text-lg font-black terminal-text text-rose-400">
                            +{getNegScore(stockData)}
                          </span>
                       </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-700/50 mt-4 pt-3 w-full">
                <div className="flex items-center gap-2">
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest leading-none">{stockData.name}</p>
                  <button onClick={handleWatchlist} className={`p-1 rounded-full transition-all ${watchlist.some(i => i.symbol === stockData.symbol) ? 'text-amber-500' : 'text-slate-600 hover:text-slate-400'}`} title={watchlist.some(i => i.symbol === stockData.symbol) ? '取消追蹤' : '追蹤'}><Star className={`w-4 h-4 ${watchlist.some(i => i.symbol === stockData.symbol) ? 'fill-current' : ''}`} /></button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-between border-b border-slate-800 pb-1">
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1">
                <button onClick={() => setViewTab('analysis')} className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === 'analysis' && !isExporting ? 'bg-slate-800 text-amber-500 border-slate-700 border-t border-x' : 'text-slate-500'}`}><BarChart3 className="w-5 h-5 inline mr-2" />週期分析</button>
                <button onClick={() => setViewTab('report')} className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === 'report' && !isExporting ? 'bg-slate-800 text-amber-500 border-slate-700 border-t border-x' : 'text-slate-500'}`}><FileText className="w-5 h-5 inline mr-2" />智能報告</button>
                <button onClick={() => setViewTab('screener')} className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === 'screener' && !isExporting ? 'bg-slate-800 text-amber-500 border-slate-700 border-t border-x' : 'text-slate-500'}`}><Filter className="w-5 h-5 inline mr-2" />篩選器</button>
              </div>
            </div>

            <div ref={pdfRef} className={`flex flex-col gap-8 ${isExporting ? 'p-8 bg-slate-900 rounded-3xl' : ''}`}>
              {(viewTab === 'analysis' || isExporting) && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <CycleChart anchorDate={stockData.lastAnchorDate} events={stockData.futureCycleEvents} />
                  <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest flex items-center gap-2"><Info className="w-5 h-5 text-amber-500" />ECM 策略分析</h3>
                    </div>
                    
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {(stockData.currentPhaseStatus || stockData.ecmTimelineSummary) && (
                        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-950/50 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden group shadow-xl"
                          >
                             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Clock className="w-24 h-24 text-amber-500" /></div>
                             <h4 className="text-amber-500 font-black mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Activity className="w-4 h-4" /> 目前週期定位
                             </h4>
                             <p className="text-white text-lg font-bold leading-snug relative z-10 mb-4">
                               {stockData.currentPhaseStatus || "分析中..."}
                             </p>
                             <div className="flex justify-between items-end border-t border-slate-800 pt-4 mt-auto">
                               <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">Real-time pulse</div>
                               <MiniSparkline color="#fbbf24" />
                             </div>
                          </motion.div>
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-slate-950/50 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden group shadow-xl"
                          >
                             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar className="w-24 h-24 text-blue-500" /></div>
                             <h4 className="text-blue-400 font-black mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <List className="w-4 h-4" /> 週期時間線總結
                             </h4>
                             <p className="text-slate-300 text-sm font-medium leading-relaxed relative z-10 mb-4">
                               {stockData.ecmTimelineSummary || "分析中..."}
                             </p>
                             <div className="flex justify-between items-end border-t border-slate-800 pt-4 mt-auto">
                               <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">Cycle Strength</div>
                               <MiniSparkline color="#60a5fa" />
                             </div>
                          </motion.div>
                        </div>
                      )}

                      <p className="text-slate-200 leading-relaxed text-lg font-medium">{stockData.analysis}</p>
                    </div>
                  </div>
                </div>
              )}

              {(viewTab === 'report' || isExporting) && (
                <div className="animate-in fade-in duration-300">
                  <ReportView report={report} onGenerate={fetchReport} loading={reportLoading} symbol={stockData.symbol} stockData={stockData} />
                </div>
              )}
              {(viewTab === 'screener' || isExporting) && (
                <div className="animate-in fade-in duration-300">
                  <PriceScreener />
                </div>
              )}
            </div>
          </div>
        ) : !loading && (viewTab === 'analysis' || viewTab === 'report') ? (
           <div className="space-y-8">
              <div className="flex justify-center border-b border-slate-800 pb-1">
                 <button onClick={() => setViewTab('screener')} className="px-6 py-3 rounded-t-xl text-base font-bold text-slate-500 hover:text-slate-300 transition-colors"><Filter className="w-5 h-5 inline mr-2" />篩選器</button>
              </div>
              <div className="text-center py-24 opacity-20 flex flex-col items-center">
                  <Layers className="w-24 h-24 mb-6" />
                  <p className="text-2xl font-black">等待查詢中...</p>
              </div>
           </div>
        ) : (
           <div className="space-y-8">
              {viewTab === 'screener' && <PriceScreener />}
           </div>
        )}
      </main>

      <PortfolioModal isOpen={showPortfolio} onClose={() => setShowPortfolio(false)} trades={trades} watchlist={watchlist} currentPrices={cachedPrices} onDeleteTrade={(id: any) => setTrades(t => t.filter(x => x.id !== id))} onDeleteWatch={(s: any) => setWatchlist(w => w.filter(x => x.symbol !== s))} onRefresh={refreshPrices} isUpdating={updatingPrices} onSyncToCloud={syncCloud} cloudStatus={cloudStatus} onExport={handleExport} onImport={handleImport} onAddTrade={handleTrade} />
      <CloudSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} url={sheetUrl} onSave={(u: any) => { setSheetUrl(u); localStorage.setItem('ecm_sheet_url', u); setShowSettings(false); }} />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);