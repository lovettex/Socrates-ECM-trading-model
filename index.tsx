import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";
import * as gdrive from "./googleDrive";
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
  Target,
  Bot,
  Scale,
  ShieldCheck,
} from "lucide-react";

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
  direction: "Buy" | "Short" | "Wait";
  overview: string;
  pyramid: StrategyConfig | EntryBatch[];
  inverted: StrategyConfig | EntryBatch[];
  hybrid: StrategyConfig | EntryBatch[];
}

interface NewsInsight {
  summary: string;
  comprehensiveAnalysis?: string;
  shortTermImpact: "Bullish" | "Bearish" | "Neutral";
  longTermImpact: "Bullish" | "Bearish" | "Neutral";
  priceRange: string;
  positioning: string;
  momentum?: {
    level: "Low" | "Medium" | "High";
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
  newsInsight?: NewsInsight;
  backtest: BacktestResult;
  generatedAt: number;
}

interface HistoricalPoint {
  date: string;
  price: number;
  type: "High" | "Low" | "Panic" | "突破" | "市場崩潰";
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
  type: "Major" | "Minor";
  description?: string;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  currency: string;
  lastAnchorDate: string;
  anchorType: "High" | "Low";
  nextTurningPoint: string;
  analysis: string;
  priceAnalysis?: string;
  ecmTimelineSummary?: string;
  currentPhaseStatus?: string;
  trend: "Bullish" | "Bearish" | "Neutral";
  screenerRating?: {
    score: number;
    action: "Buy" | "Sell" | "Neutral";
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
  type: "Buy" | "MarginBuy" | "Short" | "Sell";
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
  const calc = (score: number) => (score > 5 ? score - 5 : 0);
  const ai = Number(item?.aiScore ?? item?.screenerRating?.score) || 5;
  const qual = Number(item?.qualityScore) || 5;
  const val = Number(item?.valueScore) || 5;
  const buy = Number(item?.buyScore) || 0;
  return calc(ai) + calc(qual) + calc(val) + buy;
};

const getNegScore = (item: any) => {
  const calc = (score: number) => (score < 5 ? 5 - score : 0);
  const ai = Number(item?.aiScore ?? item?.screenerRating?.score) || 5;
  const qual = Number(item?.qualityScore) || 5;
  const val = Number(item?.valueScore) || 5;
  const sell = Number(item?.sellScore) || 0;
  return calc(ai) + calc(qual) + calc(val) + sell;
};

const getCurrentDateContext = () => {
  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = currentDate.toLocaleTimeString("en-US");
  return `[CURRENT REAL-WORLD CLOCK DATE: ${dateStr}, TIME: ${timeStr}]. IMPORTANT: The stock price or financial indicator or VIX value you search for MUST be the real-time or closing market value of today (${dateStr}) or the trading session immediately before today. DO NOT return outdated prices or values from prior years (such as 2024 or 2025). Verify multiple sources to ensure accuracy.`;
};

const safeParseJson = (text: string) => {
  let cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // Apply JSON Auto-healing pre-parse
  const healJsonString = (str: string): string => {
    let s = str;

    // 1. Repair interrupted/corrupted array values where the LLM skipped the first item block
    // e.g. "historicalDrawdowns":。" followed by \s*},
    s = s.replace(
      /"([a-zA-Z0-9_]+)"\s*:\s*。\s*"?\s*\n?\s*\},?\s*\n?\s*\{/g,
      '"$1": [\n    {',
    );

    // 2. Repair empty array corruption
    // e.g. "historicalDrawdowns":。" followed by \s*}] or \s*]
    s = s.replace(
      /"([a-zA-Z0-9_]+)"\s*:\s*。\s*"?\s*\n?\s*\},?\s*\]/g,
      '"$1": []',
    );

    // 3. Fix misplaced Chinese full stops at the end of objects / blocks outside of strings
    s = s.replace(/\},\s*。/g, "},");
    s = s.replace(/\]\s*。/g, "]");

    // 4. Remove trailing commas in objects or arrays
    s = s.replace(/,\s*(\r?\n?\s*[\}\]])/g, "$1");

    return s;
  };

  cleaned = healJsonString(cleaned);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");

    if (firstBrace === -1 && firstBracket === -1) {
      console.error("JSON 解析失敗: 找不到 JSON 結構", "原文內容:", text);
      throw new Error("模型回傳格式錯誤，請稍後再試。");
    }

    const startIdx =
      firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)
        ? firstBrace
        : firstBracket;
    const endChar = startIdx === firstBrace ? "}" : "]";

    for (
      let endIdx = cleaned.lastIndexOf(endChar);
      endIdx > startIdx;
      endIdx = cleaned.lastIndexOf(endChar, endIdx - 1)
    ) {
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

const ScoreCircle = ({
  score,
  total = 10,
  type = "buy",
}: {
  score: number;
  total?: number;
  type: "buy" | "sell" | "quality" | "value" | "crashSim" | "ai";
}) => {
  const safeScore = Number(score) || 0;
  const percentage = (safeScore / total) * 100;

  let color = "#10b981";
  let bgColor = "rgba(16, 185, 129, 0.1)";
  if (type === "sell") {
    color = "#f43f5e";
    bgColor = "rgba(244, 63, 94, 0.1)";
  } else if (type === "quality") {
    color = "#3b82f6";
    bgColor = "rgba(59, 130, 246, 0.1)";
  } else if (type === "value") {
    color = "#a855f7";
    bgColor = "rgba(168, 85, 247, 0.1)";
  } else if (type === "crashSim") {
    color = "#f59e0b"; // amber-500
    bgColor = "rgba(245, 158, 11, 0.1)";
  } else if (type === "ai") {
    color = "#0ea5e9"; // sky-500
    bgColor = "rgba(14, 165, 233, 0.1)";
  }

  const offset = 100 - percentage;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center group">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-slate-800"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray="125.6"
          strokeDashoffset={125.6 * (1 - percentage / 100)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span
        className="absolute text-[10px] terminal-text font-black"
        style={{ color }}
      >
        {score}
      </span>
      <div
        className="absolute inset-0 rounded-full group-hover:bg-current opacity-0 group-hover:opacity-10 transition-opacity"
        style={{ color }}
      />
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
      const prompt = `${getCurrentDateContext()} Find the LATEST Buffett Indicator (Market Cap to GDP ratio) for the US market from https://www.longtermtrends.com/market-cap-to-gdp-the-buffett-indicator/. 
      Get current % ratio, a status label (e.g. "Value", "Overvalued"), and a brief 1-sentence context. 
      Also provide 10 historical values to form a sparkline.
      Return JSON: { "ratio": number, "status": string, "trend": number[], "date": string, "context": string }`;

      const r = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });
      const d = safeParseJson(r.text || "{}");
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
            <div
              className={`p-2 rounded-xl transition-colors ${isOpen ? "bg-amber-500/20 text-amber-500" : "bg-slate-800 text-slate-500 group-hover:text-slate-300"}`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">
                Macro Sentiment
              </span>
              <span className="text-sm font-black text-slate-200 uppercase tracking-wider">
                The Buffett Indicator
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-800/50"
            >
              <div className="p-8">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="ml-4 text-slate-500 font-bold uppercase tracking-widest text-xs">
                      Fetching macro data...
                    </span>
                  </div>
                ) : data ? (
                  <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-4 mb-4">
                        <span className="text-6xl font-mono font-black text-amber-500 terminal-text tabular-nums">
                          {data.ratio}%
                        </span>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter border ${data.status.toLowerCase().includes("high") || data.status.toLowerCase().includes("over") ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}
                        >
                          {data.status}
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed font-medium">
                        {data.context}
                      </p>
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
                        <svg
                          className="w-full h-full overflow-visible"
                          viewBox="0 0 100 40"
                        >
                          <defs>
                            <linearGradient
                              id="buffettGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#10b981"
                                stopOpacity="0.5"
                              />
                              <stop
                                offset="100%"
                                stopColor="#10b981"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d={`M ${data.trend
                              .map((v: number, i: number) => {
                                const x = i * (100 / (data.trend.length - 1));
                                const max = Math.max(...data.trend);
                                const min = Math.min(...data.trend);
                                const range = max - min || 1;
                                const y = 35 - ((v - min) / range) * 30;
                                return `${x},${y}`;
                              })
                              .join(" L ")}`}
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
                    <p className="font-bold uppercase tracking-widest text-xs">
                      Synchronized Data Unavailable
                    </p>
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
      const prompt = `${getCurrentDateContext()} Find the LATEST VIX (Volatility Index) value from https://www.macromicro.me/charts/47/vix or any financial site. 
      Get current VIX number, a status label (e.g. "Low Volatility", "High Volatility", "Panic"), and a brief 1-sentence context (in Traditional Chinese).
      Also provide 10 recent historical values to form a sparkline.
      Return JSON: { "ratio": number, "status": string, "trend": number[], "date": string, "context": string }`;

      const r = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });
      const d = safeParseJson(r.text || "{}");
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
            <div
              className={`p-2 rounded-xl transition-colors ${isOpen ? "bg-amber-500/20 text-amber-500" : "bg-slate-800 text-slate-500 group-hover:text-slate-300"}`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">
                Macro Sentiment
              </span>
              <span className="text-sm font-black text-slate-200 uppercase tracking-wider">
                VIX波動率指數
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-800/50"
            >
              <div className="p-8">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="ml-4 text-slate-500 font-bold uppercase tracking-widest text-xs">
                      Fetching macro data...
                    </span>
                  </div>
                ) : data ? (
                  <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-4 mb-4">
                        <span className="text-6xl font-mono font-black text-amber-500 terminal-text tabular-nums">
                          {data.ratio}
                        </span>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter border ${data.ratio >= 20 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}
                        >
                          {data.status}
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed font-medium">
                        {data.context}
                      </p>
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
                        <svg
                          className="w-full h-full overflow-visible"
                          viewBox="0 0 100 40"
                        >
                          <defs>
                            <linearGradient
                              id="vixGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#f43f5e"
                                stopOpacity="0.5"
                              />
                              <stop
                                offset="100%"
                                stopColor="#f43f5e"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d={`M ${data.trend
                              .map((v: number, i: number) => {
                                const x = i * (100 / (data.trend.length - 1));
                                const max = Math.max(...data.trend);
                                const min = Math.min(...data.trend);
                                const range = max - min || 1;
                                const y = 35 - ((v - min) / range) * 30;
                                return `${x},${y}`;
                              })
                              .join(" L ")}`}
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
                    <p className="font-bold uppercase tracking-widest text-xs">
                      Synchronized Data Unavailable
                    </p>
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

const ECMCycleIndicator = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate current point on the cycle
  const peakDate = new Date("2024-05-07").getTime();
  const troughDate = new Date("2028-08-25").getTime();
  const now = new Date().getTime();

  let currentX = 200;
  if (now >= peakDate && now <= troughDate) {
    currentX = 200 + 400 * ((now - peakDate) / (troughDate - peakDate));
  } else if (now < peakDate) {
    // 4.3 years before peak
    const prevTrough = new Date("2020-01-18").getTime();
    currentX = -200 + 400 * ((now - prevTrough) / (peakDate - prevTrough));
  } else {
    // past trough
    const nextPeak = new Date("2032-12-10").getTime();
    currentX = 600 + 400 * ((now - troughDate) / (nextPeak - troughDate));
  }

  // Constrain visual bounds
  const xBounded = Math.max(0, Math.min(800, currentX));
  const currentY = 120 - 90 * Math.cos(((xBounded - 200) * Math.PI) / 400);

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
  };
  const currentDateStr = new Date(now).toLocaleDateString("en-US", dateOptions);

  return (
    <div className="max-w-2xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:border-amber-500/30">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-8 py-4 hover:bg-slate-800/30 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-2 rounded-xl transition-colors ${isOpen ? "bg-amber-500/20 text-amber-500" : "bg-slate-800 text-slate-500 group-hover:text-amber-500/70"}`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">
                Macro Sentiment
              </span>
              <span
                className={`text-sm font-black uppercase tracking-wider transition-colors ${isOpen ? "text-amber-500" : "text-slate-200"}`}
              >
                SOCRATES ECM 週期曲線
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${isOpen ? "rotate-180 text-amber-500" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-800/50"
            >
              <div className="p-8">
                <div className="w-full relative py-8 overflow-hidden rounded-2xl bg-slate-950/30 border border-slate-800/50">
                  {/* SVG Curve */}
                  <svg
                    viewBox="0 0 800 240"
                    className="w-full drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  >
                    <defs>
                      <linearGradient id="ecmGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="50%"
                          stopColor="#f59e0b"
                          stopOpacity="1"
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity="0.2"
                        />
                      </linearGradient>
                      <linearGradient
                        id="glow"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {/* Baseline */}
                    <line
                      x1="0"
                      y1="120"
                      x2="800"
                      y2="120"
                      stroke="#334155"
                      strokeWidth="1"
                      strokeDasharray="5,5"
                    />

                    {/* Area Fill */}
                    <path
                      d="M 0 120 
                                 C 100 60, 150 30, 200 30
                                 C 250 30, 300 60, 400 120
                                 C 500 180, 550 210, 600 210
                                 C 650 210, 700 180, 800 120 L 800 240 L 0 240 Z"
                      fill="url(#glow)"
                    />

                    {/* the 8.6 year cycle visualization */}
                    <path
                      d="M 0 120 
                                 C 100 60, 150 30, 200 30
                                 C 250 30, 300 60, 400 120
                                 C 500 180, 550 210, 600 210
                                 C 650 210, 700 180, 800 120"
                      fill="none"
                      stroke="url(#ecmGrad)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    {/* Peak */}
                    <circle
                      cx="200"
                      cy="30"
                      r="5"
                      fill="#f59e0b"
                      className="animate-pulse"
                    />
                    <text
                      x="200"
                      y="15"
                      fill="#f59e0b"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="uppercase tracking-widest font-mono"
                    >
                      Top / Peak
                    </text>
                    <text
                      x="200"
                      y="55"
                      fill="#94a3b8"
                      fontSize="10"
                      textAnchor="middle"
                      className="font-bold"
                    >
                      May 2024
                    </text>

                    {/* Midpoint / Axis Crossing Phase */}
                    <circle cx="400" cy="120" r="4" fill="#64748b" />
                    <text
                      x="400"
                      y="105"
                      fill="#64748b"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="uppercase tracking-widest font-mono"
                    >
                      Transition
                    </text>
                    <text
                      x="400"
                      y="140"
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="middle"
                      className="font-bold"
                    >
                      July 2026
                    </text>

                    {/* Trough */}
                    <circle
                      cx="600"
                      cy="210"
                      r="5"
                      fill="#ef4444"
                      className="animate-pulse"
                    />
                    <text
                      x="600"
                      y="230"
                      fill="#ef4444"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="uppercase tracking-widest font-mono"
                    >
                      Panic / Trough
                    </text>
                    <text
                      x="600"
                      y="190"
                      fill="#94a3b8"
                      fontSize="10"
                      textAnchor="middle"
                      className="font-bold"
                    >
                      Aug 2028
                    </text>

                    {/* You Are Here Marker */}
                    {currentX >= 0 && currentX <= 800 && (
                      <g className="animate-in fade-in zoom-in duration-700 delay-300">
                        <circle
                          cx={xBounded}
                          cy={currentY}
                          r="7"
                          fill="#10b981"
                          stroke="#fff"
                          strokeWidth="2"
                          className="shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                        />
                        <circle
                          cx={xBounded}
                          cy={currentY}
                          r="14"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1"
                          className="animate-ping opacity-50"
                        />

                        <line
                          x1={xBounded}
                          y1={currentY}
                          x2={xBounded}
                          y2={currentY > 120 ? currentY - 40 : currentY + 40}
                          stroke="#10b981"
                          strokeDasharray="3,3"
                        />

                        <rect
                          x={xBounded - 45}
                          y={currentY > 120 ? currentY - 65 : currentY + 45}
                          width="90"
                          height="24"
                          rx="12"
                          fill="#064e3b"
                          stroke="#10b981"
                          strokeWidth="1"
                        />
                        <text
                          x={xBounded}
                          y={currentY > 120 ? currentY - 49 : currentY + 61}
                          fill="#fff"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="uppercase tracking-wider"
                        >
                          You Are Here
                        </text>

                        <text
                          x={xBounded}
                          y={currentY > 120 ? currentY - 72 : currentY + 84}
                          fill="#10b981"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {currentDateStr}
                        </text>
                      </g>
                    )}
                  </svg>

                  <div className="mt-6 p-4 bg-slate-900/80 rounded-xl border border-slate-800 shadow-xl max-w-2xl mx-auto text-center">
                    <span className="text-amber-500 text-[10px] uppercase font-black tracking-widest block mb-1">
                      Economic Confidence Model (ECM)
                    </span>
                    <span className="text-slate-400 text-[12px] block leading-relaxed max-w-xl mx-auto font-medium">
                      基於 Martin Armstrong 提出的 8.6 年 Pi 週期。每 8.6 年 (約
                      3141 天)
                      會經歷一次重大的資本轉移或經濟拐點。上方為主週期趨勢圖。
                    </span>
                  </div>
                </div>
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
    return pts.join(" ");
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
          opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        }}
        className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
      />
    </svg>
  );
};

export const CycleChart = ({
  anchorDate,
  events,
}: {
  anchorDate: string;
  events: CycleEvent[];
}) => {
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
  const effectiveWidth = baseWidth - chartMargin * 2;
  const paddingY = 240; // High padding for floating labels avoiding wave
  const centerY = height / 2;
  const waveAmp = (height - paddingY * 2) / 2;

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 2, ease: "easeInOut" },
    },
  };

  // Coordinate Helper
  const getX = useCallback(
    (dateStr: string) => {
      const t = new Date(dateStr).getTime();
      if (isNaN(t)) return -10000;
      const offset = t - startTime;
      return chartMargin + (offset / displayDuration) * effectiveWidth;
    },
    [startTime, displayDuration, effectiveWidth, chartMargin],
  );

  // Generate Wave Data
  const points = useMemo(() => {
    const pts = [];
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const x_rel = i / steps;
      const x = chartMargin + x_rel * effectiveWidth;
      const timeOffset = x_rel * displayDuration;

      // Radians for 8.6 year cycle
      const radians = (timeOffset / cycleMs) * Math.PI * 2;
      // Cos(0) is peak. ECM peak starts at Anchor if it's a High.
      const y = centerY - Math.cos(radians) * waveAmp;
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  }, [effectiveWidth, displayDuration, cycleMs, centerY, waveAmp, chartMargin]);

  // Yearly Vertical Lines
  const yearlyMarkers = useMemo(() => {
    const markers = [];
    for (let i = 1; i <= 8; i++) {
      const t = startTime + i * 365.25 * 24 * 60 * 60 * 1000;
      const date = new Date(t);
      markers.push({
        x: getX(date.toISOString()),
        label: `Year ${i}`,
        date: date.toLocaleDateString(),
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
            <span className="text-xl font-black text-white uppercase tracking-[0.2em] block drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              ECM 週期波動預測
            </span>
            <span className="text-sm text-slate-400 font-mono tracking-wide">
              8.6 年經濟信心模型 (3141 天)
            </span>
          </div>
        </div>
      </div>

      {/* Primary Chart Area using fully responsive layout */}
      <div className="w-full bg-slate-950/30 rounded-2xl border border-slate-800/50 flex items-center justify-center p-2 lg:p-4">
        <div className="w-full relative aspect-video">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${baseWidth} ${height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter
                id="neon-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient
                id="waveGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>

            {/* Background Yearly Grid */}
            {yearlyMarkers.map((m, i) => (
              <g key={i}>
                <line
                  x1={m.x}
                  y1={paddingY - 20}
                  x2={m.x}
                  y2={height + 40}
                  stroke="#1E293B"
                  strokeWidth="1"
                  strokeDasharray="6,4"
                />
                <g transform={`translate(${m.x}, ${height + 25})`}>
                  <text
                    transform="rotate(-90)"
                    fill="#64748B"
                    fontSize="14"
                    fontWeight="bold"
                    textAnchor="end"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {m.label}
                  </text>
                </g>
              </g>
            ))}

            {/* Center Axis */}
            <line
              x1={chartMargin / 2}
              y1={centerY}
              x2={baseWidth - chartMargin / 2}
              y2={centerY}
              stroke="#1e293b"
              strokeWidth="2"
              strokeDasharray="10,5"
            />

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
            <g
              onClick={() =>
                setSelectedEvent({
                  date: anchorDate,
                  label: "週期起始錨點",
                  description:
                    "ECM 週期的起始位置，通常是一個重要的市場高點或低點轉折。",
                  type: "Major",
                })
              }
              className="cursor-pointer"
            >
              <line
                x1={chartMargin}
                y1={170}
                x2={chartMargin}
                y2={height + 40}
                stroke="#475569"
                strokeWidth="2"
                strokeDasharray="4,4"
                opacity="0.5"
              />
              <circle
                cx={chartMargin}
                cy={centerY - waveAmp}
                r="16"
                fill="none"
                stroke="#FACC15"
                strokeWidth="2"
                filter="url(#neon-glow)"
                opacity="0.8"
              />
              <circle
                cx={chartMargin}
                cy={centerY - waveAmp}
                r="10"
                fill="#FACC15"
                stroke="#0F172A"
                strokeWidth="3"
                filter="drop-shadow(0px 0px 8px #FACC15)"
              />
              <g transform={`translate(${chartMargin}, ${height + 25})`}>
                <text
                  transform="rotate(-90)"
                  fill="#94a3b8"
                  fontSize="16"
                  fontWeight="black"
                  textAnchor="end"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {anchorDate}
                </text>
              </g>
              <g transform={`translate(${chartMargin}, ${150})`}>
                <rect
                  x="-80"
                  y="-38"
                  width="160"
                  height="38"
                  rx="19"
                  fill="rgba(250, 204, 21, 0.15)"
                  stroke="#FACC15"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="-12"
                  fill="#FACC15"
                  fontSize="16"
                  fontWeight="900"
                  textAnchor="middle"
                  filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))"
                >
                  週期起始錨點
                </text>
              </g>
            </g>

            {/* Future Events Map */}
            {events &&
              events.map((ev, i) => {
                const x = getX(ev.date);
                if (x < 0 || x > baseWidth) return null;

                const isMajor = ev.type === "Major";
                const isGreen =
                  ev.label?.includes("亞洲") ||
                  ev.label?.includes("綠") ||
                  ev.label?.includes("特別大") ||
                  ev.label?.includes("D23");
                const isPinkBanner =
                  ev.label?.includes("頂峰") ||
                  ev.label?.includes("高點") ||
                  ev.label?.includes("8.6") ||
                  ev.label?.includes("大週期") ||
                  ev.label?.includes("ECM 週期性");
                const isRed =
                  isMajor ||
                  ev.label?.includes("ECM") ||
                  ev.label?.includes("轉折") ||
                  ev.label?.includes("Q2");
                const pillColor = isGreen
                  ? "#10B981"
                  : isRed
                    ? "#F43F5E"
                    : "#FACC15";

                // Precise Y on Wave
                const t_rel = (x - chartMargin) / effectiveWidth;
                const timeOffset = t_rel * displayDuration;
                const radians = (timeOffset / cycleMs) * Math.PI * 2;
                const waveY = centerY - Math.cos(radians) * waveAmp;

                // Distribute labels evenly above the wave line
                // paddingY is 240, ensuring labels (60, 110, 160, 200) are well above the wave peak (240)
                // Avoid overlapping with anchor at 150
                const labelOffsetY = isPinkBanner
                  ? 60
                  : i % 3 === 0
                    ? 110
                    : i % 3 === 1
                      ? 160
                      : 200;

                // Horizontal shift for long banners that might be near the edge
                let shiftX = 0;
                if (isPinkBanner) {
                  const bannerHalfWidth =
                    ((ev.label?.length || 0) * 16 + 60) / 2;
                  if (x - bannerHalfWidth < 20)
                    shiftX = bannerHalfWidth - x + 20;
                  if (x + bannerHalfWidth > baseWidth - 20)
                    shiftX = baseWidth - 20 - (x + bannerHalfWidth);
                } else {
                  const pillHalfWidth = ((ev.label?.length || 0) * 16 + 40) / 2;
                  if (x - pillHalfWidth < 20) shiftX = pillHalfWidth - x + 20;
                  if (x + pillHalfWidth > baseWidth - 20)
                    shiftX = baseWidth - 20 - (x + pillHalfWidth);
                }

                return (
                  <g
                    key={i}
                    onClick={() => setSelectedEvent(ev)}
                    className="cursor-pointer"
                  >
                    <line
                      x1={x}
                      y1={labelOffsetY + 18}
                      x2={x}
                      y2={height + 40}
                      stroke={pillColor}
                      strokeWidth={isMajor ? 2 : 1.5}
                      strokeDasharray="4,4"
                      opacity="0.6"
                    />
                    <circle
                      cx={x}
                      cy={waveY}
                      r={16}
                      fill="none"
                      stroke={pillColor}
                      strokeWidth="2"
                      filter="url(#neon-glow)"
                      opacity="0.8"
                    />
                    <circle
                      cx={x}
                      cy={waveY}
                      r={10}
                      fill={pillColor}
                      stroke="#0F172A"
                      strokeWidth="3"
                      filter="drop-shadow(0px 0px 8px currentColor)"
                      style={{ color: pillColor }}
                    />

                    {/* Date Label (Bottom) */}
                    <g transform={`translate(${x}, ${height + 25})`}>
                      <text
                        transform="rotate(-90)"
                        fill={pillColor}
                        fontSize="16"
                        fontWeight="black"
                        textAnchor="end"
                        className="font-mono tracking-widest"
                      >
                        {ev.date}
                      </text>
                    </g>

                    {/* Label Box (Top) */}
                    <g transform={`translate(${x + shiftX}, ${labelOffsetY})`}>
                      {isPinkBanner ? (
                        // Special Banner Style
                        <>
                          <rect
                            x={-((ev.label?.length || 0) * 8 + 30)}
                            y="-22"
                            width={(ev.label?.length || 0) * 16 + 60}
                            height="44"
                            rx="10"
                            fill="rgba(244, 63, 94, 0.2)"
                            stroke="#F43F5E"
                            strokeWidth="2"
                            className="backdrop-blur-md"
                          />
                          <text
                            x="0"
                            y="6"
                            fill="#FDA4AF"
                            fontSize="18"
                            fontWeight="900"
                            textAnchor="middle"
                            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))"
                          >
                            {ev.label}
                          </text>
                        </>
                      ) : (
                        // Standard Pill Style
                        <>
                          <rect
                            x={-((ev.label?.length || 0) * 8 + 20)}
                            y="-18"
                            width={(ev.label?.length || 0) * 16 + 40}
                            height="36"
                            rx="18"
                            fill={pillColor}
                            fillOpacity="0.2"
                            stroke={pillColor}
                            strokeWidth="1.5"
                            className="backdrop-blur-md"
                          />
                          <text
                            x="0"
                            y="6"
                            fill={pillColor}
                            fontSize="16"
                            fontWeight="900"
                            textAnchor="middle"
                            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))"
                          >
                            {ev.label}
                          </text>
                        </>
                      )}
                    </g>
                  </g>
                );
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
                <div
                  className={`w-5 h-5 rounded-full ${selectedEvent.type === "Major" ? "bg-rose-500" : selectedEvent.type === "Minor" ? "bg-emerald-500" : "bg-[#FACC15]"} shadow-[0_0_20px_currentColor]`}
                />
                <span className="text-white font-black text-3xl tracking-tight leading-tight">
                  {selectedEvent.label}
                </span>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-amber-500" />
                <span className="text-amber-500 font-mono font-black text-xl terminal-text tracking-widest">
                  {selectedEvent.date}
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed font-medium text-lg">
                {selectedEvent.description}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DrawdownChart = ({ drawdowns }: { drawdowns: DrawdownEvent[] }) => {
  const [hoveredData, setHoveredData] = useState<DrawdownEvent | null>(null);

  if (!drawdowns || drawdowns.length === 0)
    return (
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

  const maxPrice =
    Math.max(...sortedDrawdowns.map((d) => d.highPrice || 0)) * 1.1;
  const minPrice = 0;

  const getY = (price: number) => {
    return (
      height -
      paddingY -
      ((price - minPrice) / (maxPrice - minPrice)) * (height - 2 * paddingY)
    );
  };

  return (
    <div className="w-full bg-slate-950/90 rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden select-none">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-red-500" />
          <span className="text-base font-black text-slate-300 uppercase tracking-widest">
            歷史崩盤幅度可視化
          </span>
        </div>
        <div className="text-xs text-slate-500 font-bold">
          高低點最大回撤可視化
        </div>
      </div>

      <div className="relative w-full overflow-x-auto custom-scrollbar">
        <div style={{ minWidth: "600px" }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            <defs>
              <linearGradient id="dropGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = height - paddingY - ratio * (height - 2 * paddingY);
              const priceLabel = minPrice + ratio * (maxPrice - minPrice);
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity="0.5"
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 4}
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="end"
                    className="font-mono"
                  >
                    ${(priceLabel ?? 0).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {sortedDrawdowns.map((d, i) => {
              const step = (width - 2 * paddingX) / sortedDrawdowns.length;
              const x = paddingX + step * i + step / 2;
              const yHigh = getY(d.highPrice || 0);
              const yLow = getY(d.lowPrice || 0);

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredData(d)}
                  onMouseLeave={() => setHoveredData(null)}
                  className="cursor-pointer transition-all hover:opacity-100 opacity-90"
                >
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="4,2"
                  />
                  <rect
                    x={x - 15}
                    y={yHigh}
                    width="30"
                    height={Math.max(0, yLow - yHigh)}
                    fill="url(#dropGradient)"
                    rx="4"
                  />
                  <circle
                    cx={x}
                    cy={yHigh}
                    r="5"
                    fill="#10b981"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={x}
                    cy={yLow}
                    r="5"
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={yLow + 20}
                    fill="#f87171"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {d.dropPercent}%
                  </text>
                  <text
                    x={x}
                    y={height - 10}
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {d.highDate ? d.highDate.split("-")[0] : "N/A"}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {hoveredData && (
        <div className="absolute top-16 right-6 bg-slate-900/95 backdrop-blur-sm p-4 rounded-xl border border-red-500/30 shadow-2xl max-w-xs animate-in fade-in slide-in-from-right-2 z-20 pointer-events-none">
          <div className="text-red-400 font-black text-lg mb-2 flex items-center gap-2">
            <TrendingDownIcon className="w-5 h-5" /> 跌幅{" "}
            {hoveredData.dropPercent}%
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between font-bold">
              <span className="text-slate-500">高點:</span>
              <span className="text-emerald-400 font-mono">
                ${(hoveredData.highPrice ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-slate-500">低點:</span>
              <span className="text-red-400 font-mono">
                ${(hoveredData.lowPrice ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-slate-300 leading-relaxed font-bold text-sm">
              {hoveredData.reason}
            </p>
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
              {[...(data.historicalDrawdowns || [])]
                .filter((d): d is DrawdownEvent => !!d)
                .sort((a, b) => {
                  const aTime = a.highDate ? new Date(a.highDate).getTime() : 0;
                  const bTime = b.highDate ? new Date(b.highDate).getTime() : 0;
                  return (
                    (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime)
                  );
                })
                .map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-700/30 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-bold text-emerald-400">
                        {item.highDate}
                      </div>
                      <div className="text-slate-500 text-xs my-0.5">to</div>
                      <div className="font-bold text-red-400">
                        {item.lowDate}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-300 terminal-text tabular-nums">
                      ${(item.highPrice ?? 0).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-slate-300 terminal-text tabular-nums">
                      ${(item.lowPrice ?? 0).toLocaleString()}
                    </td>
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
  const [minPrice, setMinPrice] = useState("10");
  const [maxPrice, setMaxPrice] = useState("50");
  const [minScore, setMinScore] = useState("6");
  const [minBuyScore, setMinBuyScore] = useState("6");
  const [minSellScore, setMinSellScore] = useState("0");
  const [minQualityScore, setMinQualityScore] = useState("6");
  const [minValueScore, setMinValueScore] = useState("6");
  const [minCrashSimScore, setMinCrashSimScore] = useState("1");
  const [limit, setLimit] = useState("50");
  const [screenMode, setScreenMode] = useState<"custom" | "top50" | "bottom50">(
    "custom",
  );
  const [results, setResults] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<
    | "default"
    | "buy"
    | "sell"
    | "quality"
    | "value"
    | "crashSim"
    | "pos"
    | "neg"
  >("default");

  const handleExportJson = () => {
    if (results.length === 0) return;
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `ecm_screener_results_${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleSearch = async (
    mode: "custom" | "top50" | "bottom50" = "custom",
  ) => {
    if (mode === "custom" && (!minPrice || !maxPrice)) {
      setError("請輸入價格範圍");
      return;
    }
    setScreenMode(mode);
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let prompt = "";

      if (mode === "top50") {
        prompt = `Using real-time market data from Yahoo Finance and Martin Armstrong's Socrates ECM model principles, find the TOP 50 best performing US Stocks right now. 
        Focus on assets showing strong bullish technical reversals, proximity to positive cycle turning points, or high "buyScores" in the Socrates model.`;
      } else if (mode === "bottom50") {
        prompt = `Using real-time market data from Yahoo Finance and Martin Armstrong's Socrates ECM model principles, find the TOP 50 worst performing US Stocks right now. 
        Focus on assets showing deep bearish trends, proximity to negative cycle peaks, or high "sellScores" (overbought/danger) in the Socrates model.`;
      } else {
        prompt = `Find approximately ${limit} US Stocks that are currently trading between $${minPrice} and $${maxPrice} USD using Yahoo Finance data.
        IMPORTANT: Only include assets that you estimate would have a Screener AI Score (1-10) of AT LEAST ${minScore}/10 right now, a Socrates ECM "buyScore" (1-10) of AT LEAST ${minBuyScore}/10 right now, a "sellScore" (1-10) of AT LEAST ${minSellScore}/10, a Quality Score of AT LEAST ${minQualityScore}/10, a Value Score of AT LEAST ${minValueScore}/10, and a Crash Similarity Score of AT LEAST ${minCrashSimScore}/10.`;
      }

      prompt += `
      ${getCurrentDateContext()}
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
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });

      let data = safeParseJson(response.text || "[]");
      if (Array.isArray(data)) {
        if (data.length > 0) {
          try {
            const symbols = data.map((d: any) => d.symbol).join(", ");
            const pricePrompt = `${getCurrentDateContext()} Search Yahoo Finance for the absolutely latest real-time stock prices for these symbols: ${symbols}.
            Return a JSON object where keys are the Symbols (uppercase) and values are the precise current prices (number).
            Example: {"AAPL": 150.25, "MSFT": 310.50}
            Return ONLY the valid JSON object.`;

            const priceResponse = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: pricePrompt,
              config: {
                responseMimeType: "application/json",
                tools: [{ googleSearch: {} }],
              },
            });

            const priceData = safeParseJson(priceResponse.text || "{}");
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
        throw new Error("格式錯誤");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "搜尋失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = useMemo(() => {
    const items = [...results];
    if (sortBy === "buy") {
      return items.sort((a, b) => (b.buyScore || 0) - (a.buyScore || 0));
    }
    if (sortBy === "sell") {
      return items.sort((a, b) => (b.sellScore || 0) - (a.sellScore || 0));
    }
    if (sortBy === "quality") {
      return items.sort(
        (a, b) => (b.qualityScore || 0) - (a.qualityScore || 0),
      );
    }
    if (sortBy === "value") {
      return items.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));
    }
    if (sortBy === "crashSim") {
      return items.sort(
        (a, b) => (b.crashSimilarityScore || 0) - (a.crashSimilarityScore || 0),
      );
    }
    if (sortBy === "pos") {
      return items.sort((a, b) => getPosScore(b) - getPosScore(a));
    }
    if (sortBy === "neg") {
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
              onClick={() => handleSearch("top50")}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-2 ${
                screenMode === "top50"
                  ? "bg-emerald-600 border-emerald-400 text-white"
                  : "bg-slate-900 border-slate-700 text-emerald-500 hover:border-emerald-500"
              }`}
            >
              <TrendingUpIcon className="w-4 h-4" /> 最強前 50 名
            </button>
            <button
              onClick={() => handleSearch("bottom50")}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-2 ${
                screenMode === "bottom50"
                  ? "bg-red-600 border-red-400 text-white"
                  : "bg-slate-900 border-slate-700 text-red-500 hover:border-red-500"
              }`}
            >
              <TrendingDownIcon className="w-4 h-4" /> 最弱前 50 名
            </button>
            <button
              onClick={() => setScreenMode("custom")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                screenMode === "custom"
                  ? "bg-amber-600 border-amber-400 text-white"
                  : "bg-slate-900 border-slate-700 text-amber-500 hover:border-amber-500"
              }`}
            >
              自定義篩選
            </button>
          </div>
        </div>

        {screenMode === "custom" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                價格 (起)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                價格 (迄)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold text-sky-500/80 mb-2 uppercase"
                title="Minimum AI Score"
              >
                最低 AI 分
              </label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-sky-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-bold text-emerald-500/80 mb-2 uppercase"
                title="Minimum Buy Score"
              >
                最低 Buy Score
              </label>
              <select
                value={minBuyScore}
                onChange={(e) => setMinBuyScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-emerald-500"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-bold text-rose-500/80 mb-2 uppercase"
                title="Minimum Sell Score"
              >
                最低 Sell Score
              </label>
              <select
                value={minSellScore}
                onChange={(e) => setMinSellScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-rose-500"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-500/80 mb-2 uppercase">
                最低 Quality
              </label>
              <select
                value={minQualityScore}
                onChange={(e) => setMinQualityScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-500/80 mb-2 uppercase">
                最低 Value
              </label>
              <select
                value={minValueScore}
                onChange={(e) => setMinValueScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-purple-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-500/80 mb-2 uppercase whitespace-nowrap">
                崩盤相似度 (低-高)
              </label>
              <select
                value={minCrashSimScore}
                onChange={(e) => setMinCrashSimScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                數量
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
              </select>
            </div>

            <button
              onClick={() => handleSearch("custom")}
              disabled={loading}
              className="col-span-2 sm:col-span-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              篩選
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-center animate-in zoom-in-95 duration-300">
            <p className="text-slate-400 font-medium">
              正在透過 Socrates ECM 模型分析市場中的{" "}
              {screenMode === "top50" ? "最佳" : "最差"} 50 名表現者...
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
                <List className="w-5 h-5 text-amber-500" /> 搜尋結果 (
                {results.length})
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
                onClick={() => setSortBy("default")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === "default" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                默認排序
              </button>
              <button
                onClick={() => setSortBy("pos")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === "pos" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-emerald-400"}`}
              >
                Pos 值 (高→低)
              </button>
              <button
                onClick={() => setSortBy("neg")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === "neg" ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:text-rose-400"}`}
              >
                Neg 值 (高→低)
              </button>
              <button
                onClick={() => setSortBy("buy")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === "buy" ? "bg-emerald-600/50 text-white shadow-sm" : "text-slate-500 hover:text-emerald-400"}`}
              >
                買入評分 (高→低)
              </button>
              <button
                onClick={() => setSortBy("sell")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === "sell" ? "bg-red-600/50 text-white shadow-sm" : "text-slate-500 hover:text-red-400"}`}
              >
                賣出評分 (高→低)
              </button>
              <button
                onClick={() => setSortBy("quality")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === "quality" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-blue-400"}`}
              >
                Quality (高→低)
              </button>
              <button
                onClick={() => setSortBy("value")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === "value" ? "bg-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-purple-400"}`}
              >
                Value (高→低)
              </button>
              <button
                onClick={() => setSortBy("crashSim")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all shrink-0 ${sortBy === "crashSim" ? "bg-amber-600 text-white shadow-sm" : "text-slate-500 hover:text-amber-400"}`}
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
                  <tr
                    key={idx}
                    className="hover:bg-slate-800/40 transition-all group border-l-4 border-l-transparent hover:border-l-amber-500"
                  >
                    <td className="p-4 font-black text-white group-hover:text-amber-500 transition-colors terminal-text uppercase tracking-tighter">
                      {item.symbol}
                    </td>
                    <td className="p-4 text-slate-300 font-bold">
                      {item.name}
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                        {item.sector || "-"}
                      </div>
                    </td>
                    <td className="p-4 font-black text-amber-500 terminal-text">
                      <div className="flex flex-col">
                        <span>${item.price?.toLocaleString()}</span>
                        <span className="text-[8px] text-emerald-500/70 terminal-text">
                          LIVE • YAHOO
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <ScoreCircle score={item.aiScore ?? 5} type="ai" />
                          <span className="text-[9px] text-sky-500 font-black uppercase tracking-tighter">
                            AI
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <ScoreCircle score={item.buyScore || 0} type="buy" />
                          <span className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">
                            Buy
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <ScoreCircle
                            score={item.sellScore || 0}
                            type="sell"
                          />
                          <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter">
                            Sell
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <ScoreCircle
                            score={item.qualityScore || 0}
                            type="quality"
                          />
                          <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">
                            Qual
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <ScoreCircle
                            score={item.valueScore || 0}
                            type="value"
                          />
                          <span className="text-[9px] text-purple-500 font-black uppercase tracking-tighter">
                            Val
                          </span>
                        </div>
                        <div
                          className="flex flex-col items-center gap-1 relative group"
                          title="最近2次歷史崩盤相似度 (1-10)"
                        >
                          <ScoreCircle
                            score={item.crashSimilarityScore || 0}
                            type="crashSim"
                          />
                          <span className="text-[9px] text-amber-500 font-black uppercase tracking-tighter whitespace-nowrap">
                            Crash
                          </span>
                        </div>

                        <div className="flex flex-col items-center justify-center bg-emerald-950/20 p-1.5 rounded-xl border border-emerald-500/20 min-w-[52px] h-[48px] shadow-inner shrink-0 mt-0.5 ml-2">
                          <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                            Pos.
                          </span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-base font-black terminal-text text-emerald-400">
                              +{getPosScore(item)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center bg-rose-950/20 p-1.5 rounded-xl border border-rose-500/20 min-w-[52px] h-[48px] shadow-inner shrink-0 mt-0.5 ml-1">
                          <span className="text-[8px] font-black text-rose-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                            Neg.
                          </span>
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
                        {item.ecmStatus?.toLowerCase().includes("danger") ||
                        (item.sellScore || 0) > 7 ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                        ) : (item.buyScore || 0) > 7 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Activity className="w-4 h-4 text-slate-600" />
                        )}
                        <span
                          className={`text-[13px] font-bold leading-tight ${
                            (item.buyScore || 0) > 7
                              ? "text-emerald-400"
                              : (item.sellScore || 0) > 7
                                ? "text-rose-400"
                                : "text-slate-400"
                          }`}
                        >
                          {item.ecmStatus || "分析中..."}
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

const TransactionModal = ({
  isOpen,
  onClose,
  symbol,
  name,
  currentPrice,
  defaultType,
  onConfirm,
}: any) => {
  const [type, setType] = useState(defaultType || "Buy");
  const [shares, setShares] = useState(1);
  const [price, setPrice] = useState(currentPrice || 0);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType || "Buy");
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
          {type === "Buy" || type === "MarginBuy" ? (
            <Plus className="w-6 h-6 text-blue-500" />
          ) : (
            <Minus className="w-6 h-6 text-orange-500" />
          )}
          新增交易: {symbol}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2">
              交易類型
            </label>
            <div className="grid grid-cols-2 gap-3">
              {["Buy", "Sell", "Short", "MarginBuy"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-3 rounded-xl text-sm font-black transition-colors border ${
                    type === t
                      ? t === "Buy" || t === "MarginBuy"
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-orange-600 border-orange-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {t === "MarginBuy"
                    ? "融資買進"
                    : t === "Buy"
                      ? "買入"
                      : t === "Sell"
                        ? "賣出"
                        : "融券放空"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">
                股數 (Shares)
              </label>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-mono focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">
                價格 (Price)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-mono focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">預估金額</span>
              <span className="font-mono font-bold text-white text-base">
                $
                {(shares * price).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 text-slate-400 py-3.5 rounded-xl font-bold hover:bg-slate-700 transition-colors text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 bg-amber-600 text-white py-3.5 rounded-xl font-black hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-5 h-5" /> 確認交易
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PortfolioModal = ({
  isOpen,
  onClose,
  trades = [],
  watchlist = [],
  currentPrices = {},
  onDeleteTrade,
  onDeleteWatch,
  onRefresh,
  isUpdating,
  onSyncToCloud,
  cloudStatus,
  onImport,
  onExport,
  onAddTrade,
}: any) => {
  const [activeTab, setActiveTab] = useState<"trades" | "watchlist">("trades");
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
    if (trade.type === "Short" || trade.type === "Sell") {
      pnl = (entryPrice - curPrice) * shares;
    } else {
      pnl = (curPrice - entryPrice) * shares;
    }
    return { ...trade, pnl, displayPrice: curPrice };
  });

  const totalPnL = allCalculations.reduce(
    (acc: number, t: any) => acc + (Number(t.pnl) || 0),
    0,
  );
  const netLiq = INITIAL_CAPITAL + totalPnL;

  const formatNum = (num: number) => {
    if (isNaN(num)) return "0.00";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const groupedTrades = safeTrades.reduce(
    (groups: Record<string, Trade[]>, t: Trade) => {
      if (!t || typeof t !== "object" || !t.symbol) return groups;
      if (!groups[t.symbol]) groups[t.symbol] = [];
      groups[t.symbol].push(t);
      return groups;
    },
    {} as Record<string, Trade[]>,
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = "";
    }
  };
  const openTransactionModal = (
    type: string,
    symbol: string,
    price: number,
    name: string,
  ) => {
    setTransactionModalData({ type, symbol, price, name });
  };
  const handleTransactionConfirm = (
    type: any,
    symbol: any,
    price: any,
    name: any,
    shares: any,
  ) => {
    onAddTrade(type, symbol, price, name, shares);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col gap-4 bg-slate-800/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-amber-500" />
                <h2 className="text-2xl font-black text-white">資產管理</h2>
                {isUpdating && (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500 ml-2" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".json"
                />
                <button
                  type="button"
                  onClick={handleImportClick}
                  className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 flex items-center gap-2 px-4 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-bold hidden sm:inline">
                    匯入
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onExport}
                  className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 flex items-center gap-2 px-4 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm font-bold hidden sm:inline">
                    匯出
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={onRefresh}
                  className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 flex items-center gap-2 px-4 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isUpdating ? "animate-spin" : ""}`}
                  />
                  <span className="text-sm font-bold hidden sm:inline">
                    刷新
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onSyncToCloud}
                  className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-amber-500 transition-colors"
                >
                  {cloudStatus === "syncing" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-3 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>
            <div className="flex bg-slate-900/50 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("trades")}
                className={`flex-1 py-3 rounded-lg text-sm font-black transition-all ${activeTab === "trades" ? "bg-amber-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                交易倉位 ({Object.keys(groupedTrades).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("watchlist")}
                className={`flex-1 py-3 rounded-lg text-sm font-black transition-all ${activeTab === "watchlist" ? "bg-amber-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                觀察名單 ({watchlist.length})
              </button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {activeTab === "trades" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <span className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 mb-1">
                      <Coins className="w-4 h-4" />
                      淨值
                    </span>
                    <div
                      className={`text-3xl md:text-4xl font-mono font-black ${netLiq >= INITIAL_CAPITAL ? "text-emerald-400" : "text-red-400"}`}
                    >
                      ${formatNum(netLiq)}
                    </div>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <span className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4" />
                      總盈虧
                    </span>
                    <div
                      className={`text-3xl md:text-4xl font-mono font-black ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {totalPnL >= 0 ? "+" : ""}
                      {formatNum(totalPnL)}
                    </div>
                  </div>
                </div>
                {Object.keys(groupedTrades).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 opacity-50 flex flex-col items-center">
                    <History className="w-16 h-16 mb-4" />
                    <p className="text-lg">尚無交易紀錄</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedTrades).map(([symbol, items]) => {
                      const firstItem = items[0];
                      const market = currentPrices[symbol?.toUpperCase()];
                      const curPrice =
                        Number(market?.price) || Number(firstItem.price) || 0;
                      let netShares = 0;
                      items.forEach((t) => {
                        if (t.type === "Buy" || t.type === "MarginBuy")
                          netShares += Number(t.shares);
                        else netShares -= Number(t.shares);
                      });
                      return (
                        <div
                          key={symbol}
                          className="bg-slate-800/40 rounded-2xl border border-slate-700 overflow-hidden"
                        >
                          <div className="p-5 bg-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-slate-700/50 p-3 rounded-lg">
                                <span className="font-black text-xl text-white block">
                                  {symbol}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm text-slate-500 font-bold uppercase">
                                    淨倉位
                                  </span>
                                  <span
                                    className={`text-base font-black font-mono ${netShares >= 0 ? "text-blue-400" : "text-orange-400"}`}
                                  >
                                    {netShares} 股
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  現價:{" "}
                                  <span className="text-slate-300 font-mono text-sm">
                                    ${curPrice.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <button
                                onClick={() =>
                                  openTransactionModal(
                                    "Buy",
                                    symbol,
                                    curPrice,
                                    firstItem.name,
                                  )
                                }
                                className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all"
                              >
                                買入
                              </button>
                              <button
                                onClick={() =>
                                  openTransactionModal(
                                    "Sell",
                                    symbol,
                                    curPrice,
                                    firstItem.name,
                                  )
                                }
                                className="flex-1 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all"
                              >
                                賣出
                              </button>
                            </div>
                          </div>
                          <div className="p-4 bg-slate-900/30 border-t border-slate-700/50">
                            <div className="space-y-2">
                              {items.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex justify-between items-center bg-slate-800/30 px-4 py-3 rounded-lg border border-slate-700/30"
                                >
                                  <span
                                    className={`text-xs px-2 py-1 rounded-md font-black w-14 text-center ${t.type.includes("Buy") ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"}`}
                                  >
                                    {t.type}
                                  </span>
                                  <span className="text-sm font-mono text-slate-300">
                                    {t.shares} @ ${t.price}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTrade(t.id)}
                                    className="p-2 text-slate-600 hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {watchlist.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 opacity-50 flex flex-col items-center">
                    <Eye className="w-16 h-16 mb-4" />
                    <p className="text-lg">觀察清單目前是空的</p>
                  </div>
                ) : (
                  watchlist.map((item: WatchlistItem) => {
                    const market = currentPrices[item.symbol?.toUpperCase()];
                    const price = Number(market?.price || item.price) || 0;
                    const change =
                      Number(market?.changePercent || item.changePercent) || 0;
                    return (
                      <div
                        key={item.symbol}
                        className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 flex justify-between items-center group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-black text-white text-xl">
                            {item.symbol}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-6">
                          <div>
                            <div className="font-mono font-black text-amber-500 text-lg">
                              ${price.toLocaleString()}
                            </div>
                            <div
                              className={`text-xs font-bold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {change >= 0 ? "+" : ""}
                              {change.toFixed(2)}%
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteWatch(item.symbol)}
                            className="p-3.5 text-slate-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <TransactionModal
        isOpen={!!transactionModalData}
        onClose={() => setTransactionModalData(null)}
        symbol={transactionModalData?.symbol}
        name={transactionModalData?.name}
        currentPrice={transactionModalData?.price}
        defaultType={transactionModalData?.type}
        onConfirm={handleTransactionConfirm}
      />
    </>
  );
};

const ReportView = ({
  report,
  onGenerate,
  loading,
  symbol,
  stockData,
  onFetchNewsInsight,
  newsLoading,
}: {
  report: StockReport | null;
  onGenerate: () => void;
  loading: boolean;
  symbol: string;
  stockData: StockData;
  onFetchNewsInsight: () => void;
  newsLoading: boolean;
}) => {
  const [strategyTab, setStrategyTab] = useState<
    "pyramid" | "inverted" | "hybrid"
  >("pyramid");
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);

  const phaseMap: Record<string, string> = {
    "Pre-market": "盤前準備",
    Opening: "開盤策略",
    Midday: "盤中調整",
    Closing: "收盤操作",
  };

  const impactMap: Record<string, string> = {
    Bullish: "看多",
    Bearish: "看空",
    Neutral: "中立",
  };

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-slate-800/50 p-8 rounded-full border border-slate-700 shadow-2xl relative group">
          <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <FileText className="w-16 h-16 text-amber-500 relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-white">
            尚未生成智能交易報告
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
            根據最新的市場新聞、Socrates ECM
            模型回測數據，為您生成專屬的每日交易計劃與策略分析。
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 rounded-xl font-black text-lg shadow-lg shadow-amber-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Zap className="w-6 h-6 fill-current" />
          )}
          {loading ? "正在分析大數據..." : "立即生成報告"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
        <span>
          報告生成時間: {new Date(report.generatedAt).toLocaleString()}
        </span>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="flex items-center gap-2 hover:text-amber-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />{" "}
          重新生成
        </button>
      </div>

      {/* 2. News & Insights */}
      <div 
        className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl mb-8 flex flex-col cursor-pointer transition-colors hover:border-slate-600"
        onDoubleClick={() => !report?.newsInsight && !newsLoading && onFetchNewsInsight()}
      >
        <div className="p-6 bg-slate-900/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUpIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              新聞摘要與市場洞察
              {!report?.newsInsight && !newsLoading && (
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2 py-1 rounded-md ml-2 border border-indigo-500/30">
                  雙擊生成內容
                </span>
              )}
            </h3>
          </div>
          {newsLoading && (
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          )}
        </div>
        
        {report?.newsInsight ? (
          <div className="p-6 flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50">
              <h4 className="text-slate-400 text-xs font-black uppercase mb-3">
                最新消息摘要
              </h4>
              <p className="text-slate-200 leading-relaxed font-medium">
                {report.newsInsight.summary}
              </p>
            </div>

            {report.newsInsight.comprehensiveAnalysis && (
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-rose-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full" />
                <h4 className="text-rose-400 text-xs font-black uppercase mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> 綜合分析
                </h4>
                <p className="text-slate-200 leading-relaxed font-medium relative z-10">
                  {report.newsInsight.comprehensiveAnalysis}
                </p>
              </div>
            )}

            <div className="mt-auto">
              <h4 className="text-slate-400 text-xs font-black uppercase mb-3">
                關鍵驅動因素
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.newsInsight.keyDrivers?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm font-bold border border-slate-600/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center text-slate-500">
            <div className="bg-slate-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-slate-800">
              <Bot className="w-8 h-8 text-slate-600" />
            </div>
            <p className="font-medium text-slate-400">
              此區塊預設為閉合<br />
              <span className="text-slate-500 text-sm mt-1 inline-block">要等滑鼠雙擊打開後才生成內容</span>
            </p>
          </div>
        )}
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
        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <Database className="w-6 h-6 text-amber-500" /> 雲端同步設定
        </h3>
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="GAS URL..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base mb-5 text-amber-500 outline-none"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl font-bold"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(val)}
            className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-black"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};

const QuickStockHeader = ({ stockData }: { stockData: StockData }) => {
  if (!stockData) return null;
  return (
    <div className="bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-700 shadow-[0_0_30px_rgba(0,0,0,0.3)] flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full pl-2">
        <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter terminal-text leading-none">
            {stockData.symbol}
          </h2>
        </div>

        <div className="h-10 w-px bg-slate-700 hidden md:block shrink-0" />

        <div className="flex flex-col items-center md:items-start shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-3xl md:text-4xl font-black text-amber-500 tracking-tighter animate-price-glow terminal-text tabular-nums leading-none">
                  ${Number(stockData.price).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900/50 ${Number(stockData.changePercent) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {Number(stockData.changePercent) >= 0 ? "+" : ""}
                  {stockData.changePercent}%
                </span>
                <div className="text-[9px] terminal-text text-slate-600 font-bold uppercase tracking-widest flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-10 w-px bg-slate-700 hidden md:block shrink-0" />

        <div className="flex md:ml-8 lg:ml-16 items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar py-1">
          {stockData.screenerRating && (
            <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                AI
              </span>
              <div className="flex items-baseline gap-0.5">
                <span
                  className={`text-lg font-black terminal-text ${stockData.screenerRating.action === "Buy" ? "text-emerald-400" : stockData.screenerRating.action === "Sell" ? "text-rose-400" : "text-amber-400"}`}
                >
                  {stockData.screenerRating.score}
                </span>
                <span className="text-[8px] text-slate-600 font-bold opacity-70">
                  /10
                </span>
              </div>
              <span
                className={`text-[7px] font-black uppercase text-center leading-none mt-1 ${stockData.screenerRating.action === "Buy" ? "text-emerald-500" : stockData.screenerRating.action === "Sell" ? "text-rose-500" : "text-amber-500"}`}
              >
                {stockData.screenerRating.action === "Buy"
                  ? "買進"
                  : stockData.screenerRating.action === "Sell"
                    ? "賣出"
                    : "觀望"}
              </span>
            </div>
          )}
          {stockData.buyScore !== undefined && (
            <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                Buy
              </span>
              <div className="flex items-baseline gap-0.5">
                <span
                  className={`text-lg font-black terminal-text ${stockData.buyScore >= 7 ? "text-emerald-400" : "text-slate-400"}`}
                >
                  {stockData.buyScore}
                </span>
                <span className="text-[8px] text-slate-600 font-bold opacity-70">
                  /10
                </span>
              </div>
            </div>
          )}
          {stockData.sellScore !== undefined && (
            <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                Sell
              </span>
              <div className="flex items-baseline gap-0.5">
                <span
                  className={`text-lg font-black terminal-text ${stockData.sellScore >= 7 ? "text-rose-400" : "text-slate-400"}`}
                >
                  {stockData.sellScore}
                </span>
                <span className="text-[8px] text-slate-600 font-bold opacity-70">
                  /10
                </span>
              </div>
            </div>
          )}
          {stockData.qualityScore !== undefined && (
            <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">
                Qual
              </span>
              <div className="flex items-baseline gap-0.5">
                <span
                  className={`text-lg font-black terminal-text ${stockData.qualityScore >= 8 ? "text-emerald-400" : stockData.qualityScore <= 4 ? "text-rose-400" : "text-blue-400"}`}
                >
                  {stockData.qualityScore}
                </span>
                <span className="text-[8px] text-slate-600 font-bold opacity-70">
                  /10
                </span>
              </div>
            </div>
          )}
          {stockData.valueScore !== undefined && (
            <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">
                Value
              </span>
              <div className="flex items-baseline gap-0.5">
                <span
                  className={`text-lg font-black terminal-text ${stockData.valueScore >= 8 ? "text-emerald-400" : stockData.valueScore <= 4 ? "text-rose-400" : "text-blue-400"}`}
                >
                  {stockData.valueScore}
                </span>
                <span className="text-[8px] text-slate-600 font-bold opacity-70">
                  /10
                </span>
              </div>
            </div>
          )}
          {stockData.crashSimilarityScore !== undefined && (
            <div
              className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner relative group shrink-0"
              title="最近2次歷史崩盤相似度 (1-10)\n分數越高代表目前情況與歷史大規模回調越相似 (高風險)"
            >
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap px-1">
                Crash
              </span>
              <div className="flex items-baseline gap-0.5">
                <span
                  className={`text-lg font-black terminal-text ${stockData.crashSimilarityScore >= 8 ? "text-rose-400" : stockData.crashSimilarityScore <= 4 ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {stockData.crashSimilarityScore}
                </span>
                <span className="text-[8px] text-slate-600 font-bold opacity-70">
                  /10
                </span>
              </div>
            </div>
          )}
          {stockData.screenerRating && (
            <div className="flex flex-col items-center justify-center bg-emerald-950/20 p-1.5 rounded-xl border border-emerald-500/20 min-w-[58px] h-[52px] shadow-inner shrink-0">
              <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                Pos.
              </span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-black terminal-text text-emerald-400">
                  +{getPosScore(stockData)}
                </span>
              </div>
            </div>
          )}
          {stockData.screenerRating && (
            <div className="flex flex-col items-center justify-center bg-rose-950/20 p-1.5 rounded-xl border border-rose-500/20 min-w-[58px] h-[52px] shadow-inner shrink-0">
              <span className="text-[8px] font-black text-rose-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                Neg.
              </span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-black terminal-text text-rose-400">
                  +{getNegScore(stockData)}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              const scoreData = {
                symbol: stockData.symbol,
                price: stockData.price,
                aiScore: stockData.screenerRating?.score ?? 5,
                buyScore: stockData.buyScore,
                sellScore: stockData.sellScore,
                qualityScore: stockData.qualityScore,
                valueScore: stockData.valueScore,
                crashSimilarityScore: stockData.crashSimilarityScore,
                posScore: getPosScore(stockData),
                negScore: getNegScore(stockData),
                timestamp: new Date().toISOString(),
              };
              const dataStr = JSON.stringify(scoreData, null, 2);
              const dataUri =
                "data:application/json;charset=utf-8," +
                encodeURIComponent(dataStr);
              const link = document.createElement("a");
              link.setAttribute("href", dataUri);
              link.setAttribute("download", `${stockData.symbol}_scores.json`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0 hover:bg-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group ml-1"
            title="匯出評分 JSON"
          >
            <Download className="w-5 h-5 text-slate-500 group-hover:text-amber-500 transition-colors mb-1" />
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none group-hover:text-amber-500 transition-colors">
              JSON
            </span>
          </button>
        </div>
      </div>
      {(stockData.name || stockData.sector) && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-widest text-slate-500 pl-2">
          <span>{stockData.name}</span>
          {stockData.sector && (
            <>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-amber-500/70">{stockData.sector}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ScoreExplanationModal = ({ isOpen, onClose }: any) => {
  const [activeTab, setActiveTab] = useState<
    "ai" | "buy" | "sell" | "qual" | "value" | "crash"
  >("ai");

  if (!isOpen) return null;

  const tabs = [
    { id: "ai", label: "AI綜合評分" },
    { id: "buy", label: "Buy Score (買進)" },
    { id: "sell", label: "Sell Score (賣出)" },
    { id: "qual", label: "品質評分 (Quality)" },
    { id: "value", label: "價值評分 (Value)" },
    { id: "crash", label: "歷史崩盤相似度 (Crash)" },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case "ai":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" /> 給 AI 的 Prompt 邏輯
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                要求 AI
                結合從報價網站與分析工具取得的所有與目標資產相關之技術指標、基本面數據與歷史價格趨勢，然後綜合考量給出一個
                1 至 10 點的總體評分 (Screener AI Score)。
              </li>
              <li>
                同時會產生一個對應的行動建議，即 Buy (買進)、Sell (賣出) 或是
                Neutral (中立觀望)。
              </li>
              <li>
                這是一個將多變數 (包含價格高低、企業財報質量與估值水準)
                進行收斂後得出的宏觀分數，適合做為初步篩選與總結。
              </li>
            </ul>
            <h4 className="text-white font-bold text-base flex items-center gap-2 mt-6">
              <Database className="w-5 h-5 text-blue-400" />{" "}
              實際分析了哪些相關資料
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>即時報價與漲跌幅：</strong>
                透過即時系統抓取目標個股當日最新價格與變動百分比，驗證市場動能。
              </li>
              <li>
                <strong>其他所有維度：</strong>包括本系統產生的 Buy Score, Sell
                Score, Quality Score, Value Score 以及 Crash Similarity Score
                的預估結果，結合判斷。
              </li>
              <li>
                <strong>模型框架原則：</strong>使用 Martin Armstrong's Socrates
                ECM model
                的大格局思維進行方向上的指引，判斷目前處於週期的哪個關鍵位置。
              </li>
            </ul>
          </div>
        );
      case "buy":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-400" /> 給 AI 的
              Prompt 邏輯
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                要求 AI 扮演 Socrates ECM
                分析系統，依照其預測與循環發展規律給定「買進分數」(1-10分)。
              </li>
              <li>
                重要提示：當資產價格正接近一個關鍵的「週期低點 (Cycle
                Low)」，或表現出極端的技術性超賣且已有向上復甦跡象時，該給予高分。
              </li>
              <li>
                分數越高代表技術面與時間週期面越支持買進操作，下檔風險可能相對可控或是報酬潛力巨大。
              </li>
            </ul>
            <h4 className="text-white font-bold text-base flex items-center gap-2 mt-6">
              <Database className="w-5 h-5 text-blue-400" />{" "}
              實際分析了哪些外部與內部資料
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>歷史軌跡與價格行為：</strong>
                透過搜尋引擎檢索近期是否出現顯著的急跌或修正，與關鍵支撐的距離。
              </li>
              <li>
                <strong>技術指標延伸性：</strong>
                檢查資產目前的超賣狀況與復甦跡象。
              </li>
              <li>
                <strong>時間週期：</strong>
                根據最近幾個月的高點與低點發生時間做推敲。
              </li>
            </ul>
          </div>
        );
      case "sell":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-rose-500" /> 給 AI 的
              Prompt 邏輯
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                要求 AI 評估潛在的賣出風險，並且輸出一個 1 到 10 的 Sell Score
                (賣點評分)。
              </li>
              <li>
                提示明確提到：尋找潛在的「週期高點 (Cycle
                Peak)」、長期的「超買區域
                (Overbought)」，或者是熊市的向下反轉確認點。
              </li>
              <li>
                分數越高，表示當前可能處於危險的泡沫區、過度樂觀的延伸狀態，或已跌破關鍵阻力，應該強烈考慮遠離或減碼。
              </li>
            </ul>
            <h4 className="text-white font-bold text-base flex items-center gap-2 mt-6">
              <Database className="w-5 h-5 text-blue-400" />{" "}
              實際分析了哪些相關資料
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>極端延伸性：</strong>近期股價與歷史最高點 (ATH)
                的正乖離現象。
              </li>
              <li>
                <strong>動能衰減狀況：</strong>
                價格雖創新高或企圖突破，但搜集到的市場情緒與技術阻力暗示存在「背離現象」。
              </li>
              <li>
                <strong>跌破情形：</strong>
                如果近期有明顯的盤面跌破事件，則加深警戒。
              </li>
            </ul>
          </div>
        );
      case "qual":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" /> 給 AI 的 Prompt
              邏輯
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                要求針對企業本身的「基本面與財務質量」評估 Quality Score
                (1-10分)。
              </li>
              <li>
                不看股價波段，專注於公司體質是否健康、營運護城河是否深厚。
              </li>
              <li>
                評估標準嚴格包括：營收與 EPS (每股盈餘) 穩定成長狀況、合理的 ROE
                (股東權益報酬率) 或 ROIC (投入資本回報率)
                分數、正向穩定的自由現金流 (FCF) 與防禦性的債務評估。
              </li>
            </ul>
            <h4 className="text-white font-bold text-base flex items-center gap-2 mt-6">
              <Database className="w-5 h-5 text-blue-400" /> 實際分析了哪些資料
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>獲取財報與法說會紀要：</strong>
                從新聞與報導中尋找營收或淨利增長的重點與分析師共識。
              </li>
              <li>
                <strong>獲利效率指標：</strong>
                例如近期是否提到高毛利率、競爭優勢擴張或縮減成本。
              </li>
              <li>
                <strong>債務結構：</strong>
                若有明顯財務危機或高額負債的新聞，則會被嚴重降評。
              </li>
            </ul>
          </div>
        );
      case "value":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" /> 給 AI 的 Prompt 邏輯
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                要求檢視這檔股票目前股價與其實際內在價值的對比，得出 Value Score
                (1-10分)。
              </li>
              <li>
                此分數專注於衡量它現在「是便宜還是昂貴 (Cheap vs
                Expensive)」。絕對分數越高代表其價值被嚴重低估，越值得逢低佈局。
              </li>
              <li>
                防禦性紅旗機制：要求檢查紅旗現象，例如應收帳款成長速度是否不合理、頻繁的一次性認列費用美化財報，或是自由現金流嚴重落後於檯面上的淨利潤。
              </li>
            </ul>
            <h4 className="text-white font-bold text-base flex items-center gap-2 mt-6">
              <Database className="w-5 h-5 text-blue-400" /> 實際分析了哪些資料
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>常見估值比率：</strong>如本益比 (P/E)、股價淨值比
                (P/B)、EV/EBITDA 與 PEG 等被擷取到的內容。
              </li>
              <li>
                <strong>相對比較：</strong>歷史中位數或大盤基準的估值差異考量。
              </li>
              <li>
                <strong>利空與做假：</strong>避開只賺帳面富貴的公司。
              </li>
            </ul>
          </div>
        );
      case "crash":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" /> 給 AI 的 Prompt
              邏輯
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                這是一個專門評估這檔股票「與其歷史崩盤模式有多像」的特殊指標
                Crash Similarity Score (1-10分)。
              </li>
              <li>
                請 AI 回溯過去 52 至 260 週 (大約 1 到 5 年間)，找出 2
                次最嚴重的歷史性崩盤 (Major Drawdowns)。
              </li>
              <li>
                確認當時這兩次回檔深淵的「頂部至底部」(Peak-to-Trough)
                下跌百分比。
              </li>
              <li>
                將最近高點以來的回檔幅度，與歷史兩大股災做比對。當前下落幅度越接近歷史深度，分數就給得越高，表示跌勢已經雷同於系統性底部或極端大熊市的特徵。
              </li>
            </ul>
            <h4 className="text-white font-bold text-base flex items-center gap-2 mt-6">
              <Database className="w-5 h-5 text-blue-400" /> 實際分析了哪些資料
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>長期歷史最大回撤 (Max Drawdowns)：</strong>過去 1-5
                年間價格跌幅最慘烈時的百分比。
              </li>
              <li>
                <strong>近況崩盤幅度與高點距離：</strong>
                評估目前的空頭走勢深到什麼程度。
              </li>
              <li>市場可能因為非理性拋售帶來的錯殺現象與系統性的錯配。</li>
            </ul>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-slate-900 w-full max-w-3xl rounded-2xl border border-slate-700 p-6 shadow-2xl flex flex-col max-h-[85vh] relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Info className="w-6 h-6 text-amber-500" />
            AI 評分與分析邏輯說明
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-amber-600/20 text-amber-500 border border-amber-600/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 pb-4">
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800/50 shadow-inner min-h-[300px]">
            {renderContent()}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
          >
            了解
          </button>
        </div>
      </div>
    </div>
  );
};

const GoogleDriveModal = ({
  isOpen,
  onClose,
  user,
  token,
  onLogin,
  onLogout,
  trades = [],
  watchlist = [],
  onLoadBackup,
}: any) => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState("");
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen && token) {
      fetchBackups();
    }
  }, [isOpen, token]);

  const fetchBackups = async () => {
    if (!token) return;
    setLoadingBackups(true);
    setErrorMessage("");
    try {
      const files = await gdrive.listBackupFilesFromGoogleDrive(token);
      setBackups(files);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("無法取得雲端備份清單。");
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleBackup = async () => {
    if (!token) return;
    setIsBackupInProgress(true);
    setBackupSuccessMessage("");
    setErrorMessage("");
    try {
      const backupData = {
        trades,
        watchlist,
        backedUpAt: new Date().toISOString(),
      };
      const fileName = `Socrates_Portfolio_Backup_${new Date().toISOString().slice(0, 10)}_${Math.floor(Date.now() / 1000)}.json`;
      await gdrive.uploadFileToGoogleDrive(
        token,
        fileName,
        "application/json",
        JSON.stringify(backupData, null, 2),
        "Socrates_ECM_Backup",
      );
      setBackupSuccessMessage("成功將帳戶與觀察清單備份至雲端硬碟！");
      setTimeout(() => setBackupSuccessMessage(""), 5000);
      fetchBackups();
    } catch (err: any) {
      console.error(err);
      setErrorMessage("備份失敗，請確認網路連線。");
    } finally {
      setIsBackupInProgress(false);
    }
  };

  const handleRestore = async (fileId: string, fileName: string) => {
    if (!token) return;
    const confirmRestore = window.confirm(
      `確認要從備份檔案「${fileName}」還原嗎？這將覆蓋您目前的交易和觀察清單。`,
    );
    if (!confirmRestore) return;

    setLoadingBackups(true);
    setRestoreSuccessMessage("");
    setErrorMessage("");
    try {
      const restored = await gdrive.downloadFileFromGoogleDrive(token, fileId);
      if (restored && (restored.trades || restored.watchlist)) {
        onLoadBackup(restored.trades || [], restored.watchlist || []);
        setRestoreSuccessMessage("已成功從 Google Drive 雲端備份還原資料！");
        setTimeout(() => setRestoreSuccessMessage(""), 5000);
      } else {
        setErrorMessage("備份檔案格式不正確。");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("還原備份失敗，請稍後再試。");
    } finally {
      setLoadingBackups(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-700 p-6 shadow-2xl flex flex-col max-h-[85vh] relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Cloud className="w-6 h-6 text-amber-500" />
            Google Drive 雲端同步中心
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth section */}
        {!user ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="bg-amber-500/10 p-4 rounded-full mb-4 border border-amber-500/20">
              <Cloud className="w-12 h-12 text-amber-500 animate-pulse" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">
              連接您的 Google Drive 帳戶
            </h4>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              安全地在您的 Google Drive
              雲端專屬資料夾中備份歷史交易倉位、觀察清單，或將生成的 Socrates
              ECM 分析報告 PDF 一鍵儲存至雲端。
            </p>

            {/* Styled "Sign in with Google" button */}
            <button
              onClick={onLogin}
              className="flex items-center gap-3 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg"
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-5 h-5"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-6">
            {/* User Profile Info */}
            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Google User"}
                    className="w-10 h-10 rounded-full border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center font-bold text-white uppercase text-sm">
                    {user.displayName?.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="text-white text-sm font-bold tracking-tight">
                    {user.displayName}
                  </div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-800 hover:border-rose-950 hover:bg-rose-500/10 transition-colors"
              >
                登出
              </button>
            </div>

            {/* Main Action Backups */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-black uppercase">
                    建立新備份
                  </h4>
                  <p className="text-xs text-slate-500">
                    將最新的交易倉位與觀察清單存至雲端硬碟中
                  </p>
                </div>
                <button
                  onClick={handleBackup}
                  disabled={isBackupInProgress}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 text-sm shadow-md"
                >
                  {isBackupInProgress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      備份中...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      立即備份
                    </>
                  )}
                </button>
              </div>

              {backupSuccessMessage && (
                <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/20 text-xs font-bold animate-fade-in flex items-center gap-2">
                  <CheckCircle className="w-4 h-3.5" />
                  {backupSuccessMessage}
                </div>
              )}
              {errorMessage && (
                <div className="bg-rose-500/10 text-rose-400 p-3 rounded-xl border border-rose-500/20 text-xs font-bold animate-fade-in flex items-center gap-2">
                  <AlertTriangle className="w-4 h-3.5" />
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Backups List and Restore section */}
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white text-sm font-black uppercase flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  歷史雲端備份儲存點 (僅前10個)
                </h4>
                <button
                  onClick={fetchBackups}
                  className="text-slate-400 hover:text-amber-500 transition-colors text-xs font-bold flex items-center gap-1 bg-slate-850 px-2 py-1 rounded-md border border-slate-800"
                >
                  <RefreshCw className="w-3 h-3" /> 整理
                </button>
              </div>

              {restoreSuccessMessage && (
                <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/20 text-xs font-bold animate-fade-in flex items-center gap-2">
                  <CheckCircle className="w-4 h-3.5" />
                  {restoreSuccessMessage}
                </div>
              )}

              <div className="bg-slate-950 flex-1 min-h-[150px] max-h-[250px] overflow-y-auto rounded-xl border border-slate-800 p-2 custom-scrollbar">
                {loadingBackups ? (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                    <span className="text-xs">正在從雲端取得備份檔案...</span>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-500 text-center">
                    <Bot className="w-8 h-8 text-slate-700 mb-2" />
                    <span className="text-xs">
                      未找到任何 Socrates 雲端備份。
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {backups.map((bak) => (
                      <div
                        key={bak.id}
                        className="flex items-center justify-between p-3 bg-slate-900/50 hover:bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-750 transition-all text-sm"
                      >
                        <div className="min-w-0 pr-4">
                          <div
                            className="text-slate-200 font-bold font-mono tracking-tight text-xs truncate"
                            title={bak.name}
                          >
                            {bak.name}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            建立日期：
                            {new Date(bak.createdTime).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestore(bak.id, bak.name)}
                          className="flex items-center gap-1.5 shrink-0 bg-slate-800 hover:bg-amber-600/20 text-slate-300 hover:text-amber-500 font-bold text-xs py-1.5 px-3 rounded-lg border border-slate-700 hover:border-amber-500/30 transition-all"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          還原
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer info/prompt */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[10px] text-slate-650 font-bold">
          在 Google Drive 中建立對應的 Socrates_ECM_Backup / Socrates_ECM_Reports
          專用資料夾。
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [inputSymbol, setInputSymbol] = useState("");
  const [stockResults, setStockResults] = useState<StockData[]>([]);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const stockData = stockResults[currentStockIndex] || null;
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");

  const [quickInputSymbol, setQuickInputSymbol] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickLoadingProgress, setQuickLoadingProgress] = useState("");
  const [quickResults, setQuickResults] = useState<StockData[]>([]);
  const [viewTab, setViewTab] = useState<"screener" | "report">("report");
  const [reports, setReports] = useState<Record<string, StockReport>>({});
  const report = stockData ? reports[stockData.symbol] || null : null;
  const [reportLoading, setReportLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>(() => {
    const s = localStorage.getItem("ecm_trades");
    return s ? JSON.parse(s) : [];
  });
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const s = localStorage.getItem("ecm_watchlist");
    return s ? JSON.parse(s) : [];
  });
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Google Drive state
  const [gdUser, setGdUser] = useState<any>(null);
  const [gdToken, setGdToken] = useState<string | null>(null);
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);

  useEffect(() => {
    const unsub = gdrive.initAuth(
      (user, token) => {
        setGdUser(user);
        setGdToken(token);
      },
      () => {
        setGdUser(null);
        setGdToken(null);
      },
    );
    return () => unsub();
  }, []);

  const handleGoogleDriveLogin = async () => {
    try {
      const result = await gdrive.googleSignIn();
      if (result) {
        setGdUser(result.user);
        setGdToken(result.accessToken);
      }
    } catch (err) {
      console.error(err);
      alert("登入 Google 雲端硬碟失敗，請重試。");
    }
  };

  const handleGoogleDriveLogout = async () => {
    try {
      await gdrive.logout();
      setGdUser(null);
      setGdToken(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadGoogleDriveBackup = (
    restoredTrades: any[],
    restoredWatchlist: any[],
  ) => {
    setTrades(restoredTrades);
    setWatchlist(restoredWatchlist);
  };

  const handleSavePdfToDrive = async () => {
    if (!gdToken) {
      setShowGoogleDrive(true);
      return;
    }
    setIsSavingToDrive(true);
    try {
      const element = pdfRef.current;
      if (!element) return;

      const originalOverflow = element.style.overflow;
      element.style.overflow = "visible";

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#0f172a", // standard slate-900 background
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      element.style.overflow = originalOverflow;

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      const fileName = stockData?.symbol
        ? `${stockData.symbol}_Socrates_Report_${new Date().toISOString().slice(0, 10)}.pdf`
        : `Socrates_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

      const pdfBlob = pdf.output("blob");

      await gdrive.uploadFileToGoogleDrive(
        gdToken,
        fileName,
        "application/pdf",
        pdfBlob,
        "Socrates_ECM_Reports",
      );

      alert(
        `分析報告成功儲存至 Google Drive 雲端硬碟的「Socrates_ECM_Reports」資料夾中！檔案名稱為：\n${fileName}`,
      );
    } catch (err) {
      console.error("Failed to save PDF to Drive:", err);
      alert("儲存報告至 Google 雲端硬碟失敗，請重試。");
    } finally {
      setIsSavingToDrive(false);
    }
  };
  const [cachedPrices, setCachedPrices] = useState<Record<string, MarketData>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState(
    () => localStorage.getItem("ecm_sheet_url") || "",
  );
  const [cloudStatus, setCloudStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [refreshingSingle, setRefreshingSingle] = useState(false);
  const [showScoreExplanation, setShowScoreExplanation] = useState(false);

  useEffect(() => {
    localStorage.setItem("ecm_trades", JSON.stringify(trades));
  }, [trades]);
  useEffect(() => {
    localStorage.setItem("ecm_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    if (viewTab === "report" && stockData && !report && !reportLoading) {
      fetchReport(stockData);
    }
  }, [viewTab, stockData, report, reportLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.shiftKey &&
        (e.ctrlKey || e.metaKey) &&
        (e.key === "F" || e.key === "f")
      ) {
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      timestamp: Date.now(),
    };
    const b = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const u = URL.createObjectURL(b);
    const l = document.createElement("a");
    l.href = u;
    l.download = `socrates_analysis_${new Date().toLocaleDateString().replace(/\//g, "")}.json`;
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
    e.target.value = "";
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setTimeout(async () => {
      try {
        const element = pdfRef.current;
        if (!element) return;

        const originalOverflow = element.style.overflow;
        element.style.overflow = "visible";

        const canvas = await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: "#0f172a", // standard slate-900 background
          logging: false,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
        });

        element.style.overflow = originalOverflow;

        const imgData = canvas.toDataURL("image/jpeg", 0.9);
        const pdf = new jsPDF("p", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();
        }

        const fileName = stockData?.symbol
          ? `${stockData.symbol}_Socrates_Report.pdf`
          : "Socrates_Report.pdf";
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
    const symbols = inputSymbol
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s !== "");
    if (symbols.length === 0) return;

    setLoading(true);
    setError(null);
    setStockResults([]);
    setCurrentStockIndex(0);
    setReports({});
    setViewTab("report");

    const results: StockData[] = [];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        setLoadingProgress(
          `正在分析第 ${i + 1}/${symbols.length} 個標的: ${sym}...`,
        );

        const prompt = `You are Martin Armstrong's Socrates AI. Perform an in-depth 8.6-year ECM cycle analysis for "${sym}".
        
        ${getCurrentDateContext()}
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
          model: "gemini-3.1-pro-preview",
          contents:
            prompt +
            "\n\nCRITICAL: Ensure 'historicalDrawdowns' contains at least 3 to 6 significant historical drawdown cycles (must prioritize finding events in the last 2 years). Include detailed reasons in Traditional Chinese. Sort them from newest to oldest.",
          config: {
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
          },
        });

        const data = safeParseJson(response.text || "{}");
        if (data.symbol) {
          results.push(data);
          setCachedPrices((prev) => ({
            ...prev,
            [data.symbol]: {
              price: Number(data.price),
              change: 0,
              changePercent: Number(data.changePercent),
              prevClose: 0,
              time: new Date().toLocaleTimeString(),
              lastUpdated: Date.now(),
            },
          }));
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
      setLoadingProgress("");
    }
  };

  const fetchQuickAnalysis = async () => {
    if (!quickInputSymbol.trim()) return;
    const symbols = quickInputSymbol
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s !== "");
    if (symbols.length === 0) return;

    setQuickLoading(true);
    setQuickResults([]);

    const results: StockData[] = [];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        setQuickLoadingProgress(
          `正在快速分析第 ${i + 1}/${symbols.length} 個標的: ${sym}...`,
        );

        const prompt = `You are Martin Armstrong's Socrates AI. Perform a quick review and ECM cycle analysis for "${sym}".
        
        ${getCurrentDateContext()}
        Step 1: CRITICAL - Use Google Search to find the ABSOLUTELY LATEST real-time price, change percentage, and currency for "${sym}" from Yahoo Finance. Look at the live quote page.
        Step 2: Collect fundamental data to evaluate Quality Score and Value Score. 
          - Quality Score (1-10): Evaluate based on stable revenue/EPS growth, reasonable/high ROE/ROIC, positive/stable FCF, and moderate debt.
          - Value Score (1-10): Evaluate based on P/E, P/B, EV/EBITDA, PEG. Consider "cheapness" vs "expensiveness". Incorporate red flags like Accounts Receivable growing faster than revenue, frequent one-time charges, or FCF significantly lagging net income.
        Step 3: Evaluate Historical Crash Similarity Score (1-10) ("歷史崩盤相似度"):
          - Review the 2 most recent significant drawdowns for this asset within the past 52 to 260 weeks (1-5 years).
          - Identify the peak-to-trough drop percentage for those 2 historical crashes.
          - Compare the current drawdown (from recent ATH) or recent price action to these historical crash percentages. 
          - The CLOSER the current setup is to the percentage magnitudes of past crashes, the HIGHER the score (meaning it strongly resembles past crashes). The FURTHER away or less severe, the lower the score.
        Step 4: Based on the above, establish a buyScore (1-10) and sellScore (1-10). These should generally be inverse but can deviate if the situation is highly uncertain.
        Step 5: Provide an overall screenerRating (score 1-10, action: Buy/Sell/Neutral) reflecting AI rating.
        Step 6: Answer as a single JSON object.
        
        Output JSON Structure:
        {
          "symbol": "${sym}", 
          "name": "...", 
          "sector": "...",
          "price": 0.00, 
          "changePercent": 0.00, 
          "currency": "USD",
          "buyScore": 8,
          "sellScore": 2,
          "screenerRating": {"score": 8, "action": "Buy"},
          "qualityScore": 8,
          "valueScore": 7,
          "crashSimilarityScore": 5
        }`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
          },
        });

        const data = safeParseJson(response.text || "{}");
        if (data.symbol) {
          results.push(data);
          setCachedPrices((prev) => ({
            ...prev,
            [data.symbol]: {
              price: Number(data.price),
              change: 0,
              changePercent: Number(data.changePercent),
              prevClose: 0,
              time: new Date().toLocaleTimeString(),
              lastUpdated: Date.now(),
            },
          }));
        }
      }

      if (results.length > 0) {
        setQuickResults(results);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setQuickLoading(false);
      setQuickLoadingProgress("");
    }
  };

  const fetchReport = async (stockObj?: StockData) => {
    const targetStock = stockObj || stockData;
    if (!targetStock?.symbol) return;
    setReportLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `${getCurrentDateContext()} Generate a comprehensive trading report for "${targetStock.symbol}" (${targetStock.name}) based on Martin Armstrong's Socrates ECM model.
      
      The report must include:
      1. A structured daily trading plan (Pre-market, Opening, Midday, Closing).
      2. A simulated backtest of the Socrates ECM strategy on this stock (Win rate, Profit factor, Max drawdown, improvements).

      CRITICAL: All descriptive text (summary, action, checklist, positioning, improvements, keyDrivers) MUST be in Traditional Chinese (繁體中文).
      Based on the asset context, determine if the strategy should be 'Buy', 'Short', or 'Wait'.
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
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });

      const data = safeParseJson(response.text || "{}");
      setReports((prev) => ({ ...prev, [targetStock.symbol]: data }));
    } catch (e) {
      console.error(e);
      // Optional: Set an error state for report specifically
    } finally {
      setReportLoading(false);
    }
  };

  const fetchNewsInsight = async () => {
    if (!stockData?.symbol || !report) return;
    setNewsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `${getCurrentDateContext()} Focus on target stock: "${stockData.symbol}" (${stockData.name}). Use Google Search to find the most recent news and market data.
      Generate a News and Insight report focusing ONLY on news summary, comprehensive analysis, and key drivers.
      
      CRITICAL: All descriptive text MUST be in Traditional Chinese (繁體中文).
      
      Return the response strictly as a JSON object with this exact structure:
      {
        "newsInsight": {
          "summary": "近期新聞摘要 (繁體中文)...",
          "comprehensiveAnalysis": "結合目前最新可靠的數據與新聞，綜合分析對股價的影響 (繁體中文)...",
          "keyDrivers": ["財報", "聯準會", "裁員"]
        }
      }
      Do not include markdown formatting. Just return the JSON string.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });

      const data = safeParseJson(response.text || "{}");
      if (data.newsInsight) {
        setReports((prev) => ({
          ...prev,
          [stockData.symbol]: {
            ...prev[stockData.symbol],
            newsInsight: data.newsInsight
          }
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNewsLoading(false);
    }
  };

  const refreshSinglePrice = async () => {
    if (!stockData?.symbol || refreshingSingle) return;
    setRefreshingSingle(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Optimized prompt targeting Google Finance Beta specifically
      const prompt = `${getCurrentDateContext()} Stock: ${stockData.symbol} (${stockData.name}). Use Google Search to find the latest real-time quote (price and % change) from https://www.google.com/finance/beta. Return ONLY JSON: {"price": number, "changePercent": number}`;

      const r = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          maxOutputTokens: 80,
          temperature: 0,
        },
      });

      const text = r.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const d = safeParseJson(cleaned);

      if (d.price) {
        const newPrice = Number(d.price);
        const newChange = Number(d.changePercent || 0);

        setStockResults((prev) =>
          prev.map((s, idx) =>
            idx === currentStockIndex
              ? { ...s, price: newPrice, changePercent: newChange }
              : s,
          ),
        );

        setCachedPrices((prev) => ({
          ...prev,
          [stockData.symbol]: {
            price: newPrice,
            change: 0,
            changePercent: newChange,
            prevClose: 0,
            time: new Date().toLocaleTimeString(),
            lastUpdated: Date.now(),
          },
        }));
      }
    } catch (e) {
      console.error("Fast price refresh failed:", e);
      // Fallback with same logic
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const r = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `${getCurrentDateContext()} Price for ${stockData.symbol} ${stockData.name} from https://www.google.com/finance/beta. Return JSON: {"price": number, "changePercent": number}`,
          config: { tools: [{ googleSearch: {} }] },
        });
        const text = r.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleaned = text.replace(/```json|```/g, "").trim();
        const d = safeParseJson(cleaned);
        if (d.price) {
          setStockResults((prev) =>
            prev.map((s, idx) =>
              idx === currentStockIndex
                ? {
                    ...s,
                    price: Number(d.price),
                    changePercent: Number(d.changePercent || 0),
                  }
                : s,
            ),
          );
        }
      } catch (inner) {
        console.error("Fallback failed:", inner);
      }
    } finally {
      setRefreshingSingle(false);
    }
  };

  const handleTrade = (
    type: any,
    sym?: any,
    pri?: any,
    nam?: any,
    sha?: any,
  ) => {
    const s = sym || stockData?.symbol;
    const p = pri ?? stockData?.price;
    const n = nam || stockData?.name || s;
    const sh = sha ?? 1;
    if (!s) return;
    setTrades((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        symbol: s,
        name: n,
        type,
        price: p,
        shares: sh,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
      },
    ]);
  };

  const handleWatchlist = () => {
    if (!stockData) return;
    if (watchlist.some((i) => i.symbol === stockData.symbol))
      setWatchlist((prev) => prev.filter((i) => i.symbol !== stockData.symbol));
    else
      setWatchlist((prev) => [
        ...prev,
        {
          symbol: stockData.symbol,
          name: stockData.name,
          price: Number(stockData.price),
          changePercent: Number(stockData.changePercent),
          timestamp: Date.now(),
        },
      ]);
  };

  const refreshPrices = useCallback(async () => {
    const syms = Array.from(
      new Set([
        ...trades.map((t) => t.symbol),
        ...watchlist.map((w) => w.symbol),
      ]),
    );
    if (syms.length === 0 || updatingPrices) return;
    setUpdatingPrices(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `${getCurrentDateContext()} Search Yahoo Finance for the latest real-time stock prices and percentage changes for these symbols: ${syms.join(", ")}. 
      Return a JSON object where keys are the Symbols (uppercase) and values are objects containing "price" (number) and "changePercent" (number). 
      Example: {"AAPL": {"price": 150.25, "changePercent": 1.5}}
      Ensure the data is as recent as possible.`;

      const r = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });
      const d = safeParseJson(r.text || "{}");
      const np: any = {};
      Object.entries(d).forEach(([s, i]: any) => {
        np[s.toUpperCase()] = {
          price: Number(i.price),
          changePercent: Number(i.changePercent),
          time: new Date().toLocaleTimeString(),
          lastUpdated: Date.now(),
        };
      });
      setCachedPrices((prev) => ({ ...prev, ...np }));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingPrices(false);
    }
  }, [trades, watchlist, updatingPrices]);

  const syncCloud = async () => {
    if (!sheetUrl) {
      setShowSettings(true);
      return;
    }
    setCloudStatus("syncing");
    try {
      await fetch(sheetUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ trades, watchlist }),
      });
      setCloudStatus("success");
    } catch (e) {
      setCloudStatus("error");
    }
    setTimeout(() => setCloudStatus("idle"), 3000);
  };

  const handleExport = () => {
    const b = new Blob([JSON.stringify({ trades, watchlist }, null, 2)], {
      type: "application/json",
    });
    const u = URL.createObjectURL(b);
    const l = document.createElement("a");
    l.href = u;
    l.download = `backup.json`;
    l.click();
  };
  const handleImport = (f: File) => {
    const r = new FileReader();
    r.onload = (e) => {
      const j = JSON.parse(e.target?.result as string);
      if (j.trades) setTrades(j.trades);
      if (j.watchlist) setWatchlist(j.watchlist);
    };
    r.readAsText(f);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Clock className="w-9 h-9 text-amber-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse-green" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter">
              Socrates <span className="text-amber-500">ECM</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowScoreExplanation(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-700 transition-colors relative group"
            >
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm hidden sm:inline">
                評分說明
              </span>
            </button>
            <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-700 transition-colors cursor-pointer relative group">
              <Upload className="w-4 h-4 text-emerald-500" />
              <span className="text-white text-sm hidden sm:inline">
                匯入分析
              </span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportAnalysis}
              />
            </label>
            <button
              onClick={handleExportAnalysis}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-700 transition-colors relative group"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span className="text-white text-sm hidden sm:inline">
                匯出分析
              </span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 relative group shadow-lg"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span className="text-white text-sm hidden sm:inline">
                匯出 PDF
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
          {/* Main Search */}
          <div className="relative group flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-amber-500 transition-colors z-10" />
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && fetchAnalysis()}
              placeholder="代號 (e.g., NVDA)..."
              className="w-full bg-slate-950 border-2 border-slate-700/50 pl-14 pr-16 py-4 rounded-3xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] text-lg font-mono transition-all placeholder:text-slate-600"
            />
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="absolute right-2 top-2 bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-2xl transition-all shadow-lg active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
            <div className="absolute -top-3 left-6 bg-[#0f172a] px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">
              完整週期分析
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative group flex-1">
            <Zap className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-amber-500 transition-colors z-10" />
            <input
              type="text"
              value={quickInputSymbol}
              onChange={(e) =>
                setQuickInputSymbol(e.target.value.toUpperCase())
              }
              onKeyDown={(e) => e.key === "Enter" && fetchQuickAnalysis()}
              placeholder="快速模式 (META,CRM...)"
              className="w-full bg-slate-950 border-2 border-slate-700/50 pl-14 pr-16 py-4 rounded-3xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] text-lg font-mono transition-all placeholder:text-slate-600"
            />
            <button
              onClick={fetchQuickAnalysis}
              disabled={quickLoading}
              className="absolute right-2 top-2 bg-slate-800 hover:bg-slate-700 text-amber-500 p-3 rounded-2xl transition-all shadow-lg active:scale-95 border border-slate-700"
            >
              {quickLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
            </button>
            <div className="absolute -top-3 left-6 bg-[#0f172a] px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">
              快速評分模式 (支援多個標的)
            </div>
          </div>
        </div>

        {quickLoading && (
          <div className="flex flex-col items-center justify-center gap-3 mt-4 text-emerald-500 animate-in fade-in slide-in-from-top-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="font-bold text-lg">快速評分運算中...</span>
            {quickLoadingProgress && (
              <span className="text-sm text-slate-500 font-mono">
                {quickLoadingProgress}
              </span>
            )}
          </div>
        )}

        {quickResults.length > 0 && (
          <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            {quickResults.map((res, idx) => (
              <QuickStockHeader key={idx} stockData={res} />
            ))}
          </div>
        )}

        <BuffettIndicator />
        <VixIndicator />
        <ECMCycleIndicator />

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 mt-4 text-amber-500 animate-in fade-in slide-in-from-top-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="font-bold text-lg">ECM 週期運算中...</span>
            {loadingProgress && (
              <span className="text-sm text-slate-500 font-mono">
                {loadingProgress}
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/10 border border-red-500/30 p-6 rounded-2xl text-red-400 flex items-center gap-4">
            <AlertTriangle className="w-7 h-7" />
            <p className="font-bold">{error}</p>
          </div>
        )}

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
                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                      currentStockIndex === idx
                        ? "bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    }`}
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
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter terminal-text leading-none">
                    {stockData.symbol}
                  </h2>
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
                          <RefreshCw
                            className={`w-4 h-4 text-slate-500 group-hover:text-amber-500 ${refreshingSingle ? "animate-spin" : ""}`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900/50 ${Number(stockData.changePercent) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {Number(stockData.changePercent) >= 0 ? "+" : ""}
                          {stockData.changePercent}%
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

                <div className="flex md:ml-8 lg:ml-16 items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar py-1">
                  {stockData.screenerRating && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                        AI
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={`text-lg font-black terminal-text ${stockData.screenerRating.action === "Buy" ? "text-emerald-400" : stockData.screenerRating.action === "Sell" ? "text-rose-400" : "text-amber-400"}`}
                        >
                          {stockData.screenerRating.score}
                        </span>
                        <span className="text-[8px] text-slate-600 font-bold opacity-70">
                          /10
                        </span>
                      </div>
                      <span
                        className={`text-[7px] font-black uppercase text-center leading-none mt-1 ${stockData.screenerRating.action === "Buy" ? "text-emerald-500" : stockData.screenerRating.action === "Sell" ? "text-rose-500" : "text-amber-500"}`}
                      >
                        {stockData.screenerRating.action === "Buy"
                          ? "買進"
                          : stockData.screenerRating.action === "Sell"
                            ? "賣出"
                            : "觀望"}
                      </span>
                    </div>
                  )}
                  {stockData.buyScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                        Buy
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={`text-lg font-black terminal-text ${stockData.buyScore >= 7 ? "text-emerald-400" : "text-slate-400"}`}
                        >
                          {stockData.buyScore}
                        </span>
                        <span className="text-[8px] text-slate-600 font-bold opacity-70">
                          /10
                        </span>
                      </div>
                    </div>
                  )}
                  {stockData.sellScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                        Sell
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={`text-lg font-black terminal-text ${stockData.sellScore >= 7 ? "text-rose-400" : "text-slate-400"}`}
                        >
                          {stockData.sellScore}
                        </span>
                        <span className="text-[8px] text-slate-600 font-bold opacity-70">
                          /10
                        </span>
                      </div>
                    </div>
                  )}
                  {stockData.qualityScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">
                        Qual
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={`text-lg font-black terminal-text ${stockData.qualityScore >= 8 ? "text-emerald-400" : stockData.qualityScore <= 4 ? "text-rose-400" : "text-blue-400"}`}
                        >
                          {stockData.qualityScore}
                        </span>
                        <span className="text-[8px] text-slate-600 font-bold opacity-70">
                          /10
                        </span>
                      </div>
                    </div>
                  )}
                  {stockData.valueScore !== undefined && (
                    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">
                        Value
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={`text-lg font-black terminal-text ${stockData.valueScore >= 8 ? "text-emerald-400" : stockData.valueScore <= 4 ? "text-rose-400" : "text-blue-400"}`}
                        >
                          {stockData.valueScore}
                        </span>
                        <span className="text-[8px] text-slate-600 font-bold opacity-70">
                          /10
                        </span>
                      </div>
                    </div>
                  )}
                  {stockData.crashSimilarityScore !== undefined && (
                    <div
                      className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner relative group shrink-0"
                      title="最近2次歷史崩盤相似度 (1-10)\n分數越高代表目前情況與歷史大規模回調越相似 (高風險)"
                    >
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap px-1">
                        Crash
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={`text-lg font-black terminal-text ${stockData.crashSimilarityScore >= 8 ? "text-rose-400" : stockData.crashSimilarityScore <= 4 ? "text-emerald-400" : "text-amber-400"}`}
                        >
                          {stockData.crashSimilarityScore}
                        </span>
                        <span className="text-[8px] text-slate-600 font-bold opacity-70">
                          /10
                        </span>
                      </div>
                    </div>
                  )}
                  {stockData.screenerRating && (
                    <div className="flex flex-col items-center justify-center bg-emerald-950/20 p-1.5 rounded-xl border border-emerald-500/20 min-w-[58px] h-[52px] shadow-inner shrink-0">
                      <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                        Pos.
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-black terminal-text text-emerald-400">
                          +{getPosScore(stockData)}
                        </span>
                      </div>
                    </div>
                  )}
                  {stockData.screenerRating && (
                    <div className="flex flex-col items-center justify-center bg-rose-950/20 p-1.5 rounded-xl border border-rose-500/20 min-w-[58px] h-[52px] shadow-inner shrink-0">
                      <span className="text-[8px] font-black text-rose-500/70 uppercase tracking-widest mb-1 pointer-events-none whitespace-nowrap">
                        Neg.
                      </span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-black terminal-text text-rose-400">
                          +{getNegScore(stockData)}
                        </span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const scoreData = {
                        symbol: stockData.symbol,
                        price: stockData.price,
                        aiScore: stockData.screenerRating?.score ?? 5,
                        buyScore: stockData.buyScore,
                        sellScore: stockData.sellScore,
                        qualityScore: stockData.qualityScore,
                        valueScore: stockData.valueScore,
                        crashSimilarityScore: stockData.crashSimilarityScore,
                        posScore: getPosScore(stockData),
                        negScore: getNegScore(stockData),
                        timestamp: new Date().toISOString(),
                      };
                      const dataStr = JSON.stringify(scoreData, null, 2);
                      const dataUri =
                        "data:application/json;charset=utf-8," +
                        encodeURIComponent(dataStr);
                      const link = document.createElement("a");
                      link.setAttribute("href", dataUri);
                      link.setAttribute(
                        "download",
                        `${stockData.symbol}_scores.json`,
                      );
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex flex-col items-center justify-center bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 min-w-[58px] h-[52px] shadow-inner shrink-0 hover:bg-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group ml-1"
                    title="匯出評分 JSON"
                  >
                    <Download className="w-5 h-5 text-slate-500 group-hover:text-amber-500 transition-colors mb-1" />
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none group-hover:text-amber-500 transition-colors">
                      JSON
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-700/50 mt-4 pt-3 w-full">
                <div className="flex items-center gap-2">
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest leading-none">
                    {stockData.name}
                  </p>
                  <button
                    onClick={handleWatchlist}
                    className={`p-1 rounded-full transition-all ${watchlist.some((i) => i.symbol === stockData.symbol) ? "text-amber-500" : "text-slate-600 hover:text-slate-400"}`}
                    title={
                      watchlist.some((i) => i.symbol === stockData.symbol)
                        ? "取消追蹤"
                        : "追蹤"
                    }
                  >
                    <Star
                      className={`w-4 h-4 ${watchlist.some((i) => i.symbol === stockData.symbol) ? "fill-current" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-between border-b border-slate-800 pb-1">
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1">
                <button
                  onClick={() => setViewTab("report")}
                  className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === "report" && !isExporting ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500"}`}
                >
                  <FileText className="w-5 h-5 inline mr-2" />
                  智能報告
                </button>
                <button
                  onClick={() => setViewTab("screener")}
                  className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === "screener" && !isExporting ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500"}`}
                >
                  <Filter className="w-5 h-5 inline mr-2" />
                  篩選器
                </button>
              </div>
            </div>

            <div
              ref={pdfRef}
              className={`flex flex-col gap-8 ${isExporting ? "p-8 bg-slate-900 rounded-3xl" : ""}`}
            >
              {(viewTab === "report" || isExporting) && (
                <div className="animate-in fade-in duration-300">
                  <ReportView
                    report={report}
                    onGenerate={fetchReport}
                    loading={reportLoading}
                    symbol={stockData.symbol}
                    stockData={stockData}
                    onFetchNewsInsight={fetchNewsInsight}
                    newsLoading={newsLoading}
                  />
                </div>
              )}
              {(viewTab === "screener" || isExporting) && (
                <div className="animate-in fade-in duration-300">
                  <PriceScreener />
                </div>
              )}
            </div>
          </div>
        ) : !loading && viewTab === "report" ? (
          <div className="space-y-8">
            <div className="flex justify-center border-b border-slate-800 pb-1">
              <button
                onClick={() => setViewTab("screener")}
                className="px-6 py-3 rounded-t-xl text-base font-bold text-slate-500 hover:text-slate-300 transition-colors"
              >
                <Filter className="w-5 h-5 inline mr-2" />
                篩選器
              </button>
            </div>
            <div className="text-center py-24 opacity-20 flex flex-col items-center">
              <Layers className="w-24 h-24 mb-6" />
              <p className="text-2xl font-black">等待查詢中...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {viewTab === "screener" && <PriceScreener />}
          </div>
        )}
      </main>

      <PortfolioModal
        isOpen={showPortfolio}
        onClose={() => setShowPortfolio(false)}
        trades={trades}
        watchlist={watchlist}
        currentPrices={cachedPrices}
        onDeleteTrade={(id: any) =>
          setTrades((t) => t.filter((x) => x.id !== id))
        }
        onDeleteWatch={(s: any) =>
          setWatchlist((w) => w.filter((x) => x.symbol !== s))
        }
        onRefresh={refreshPrices}
        isUpdating={updatingPrices}
        onSyncToCloud={syncCloud}
        cloudStatus={cloudStatus}
        onExport={handleExport}
        onImport={handleImport}
        onAddTrade={handleTrade}
      />
      <CloudSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        url={sheetUrl}
        onSave={(u: any) => {
          setSheetUrl(u);
          localStorage.setItem("ecm_sheet_url", u);
          setShowSettings(false);
        }}
      />
      <ScoreExplanationModal
        isOpen={showScoreExplanation}
        onClose={() => setShowScoreExplanation(false)}
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
