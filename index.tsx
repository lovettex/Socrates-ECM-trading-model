import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import { Type } from "@google/genai";
import { getActiveProvider } from "./llmProvider";

// Polyfill process.env for client-side to prevent ReferenceError crashes when process.env.GEMINI_API_KEY is referenced
if (typeof window !== "undefined" && !(window as any).process) {
  (window as any).process = { env: {} };
}

class GoogleGenAI {
  constructor(config?: { apiKey?: string; httpOptions?: any }) {}
  get models() {
    return {
      generateContent: async (params: { model: string; contents: any; config?: any }) => {
        const response = await fetch("/api/gemini/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...params, provider: getActiveProvider() }),
        });
        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(`Gemini API Error: ${errMsg}`);
        }
        const data = await response.json();
        return data;
      }
    };
  }
}
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";
import * as gdrive from "./googleDrive";
import * as workspace from "./workspace";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
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
  HelpCircle,
  Cpu,
  Compass,
} from "lucide-react";

import { MacroFilterView } from "./macroFilter";
import { AlphaMatrixView } from "./alphaMatrix";
import { PortfolioView } from "./portfolio";

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

interface FinancialHealth {
  status: "衰退" | "強勁";
  overview: string;
  metrics: {
    revenueGrowth: string;
    netProfitTrend: string;
    freeCashFlow: string;
    profitMargins: string;
    debtLevels: string;
    returnOnEquity: string;
  };
}

interface RiskItem {
  category: "經濟風險" | "行業顛覆" | "競爭" | "監管威脅" | "債務或財務風險" | "公司政策導向與挑戰";
  severity: "低" | "中" | "高";
  description: string;
}

interface RiskAnalysis {
  riskLevel: "低" | "觀察" | "高";
  risks: RiskItem[];
  debate: {
    bullishAnalystName: string;
    bullishArguments: string[];
    bearishAnalystName: string;
    bearishArguments: string[];
    conclusion: string;
  };
}

interface StockReport {
  symbol: string;
  tradingStrategy: TradingStrategy;
  newsInsight?: NewsInsight;
  backtest: BacktestResult;
  financialHealth?: FinancialHealth;
  riskAnalysis?: RiskAnalysis;
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
  sector?: string;
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
  buyScore?: number;
  sellScore?: number;
  qualityScore?: number;
  valueScore?: number;
  crashSimilarityScore?: number;
  posScore?: number;
  negScore?: number;
  aiScore?: number;
  action?: string;
  history?: Array<{
    timestamp: number;
    price: number;
    changePercent: number;
    buyScore?: number;
    sellScore?: number;
    qualityScore?: number;
    valueScore?: number;
    crashSimilarityScore?: number;
    posScore?: number;
    negScore?: number;
    aiScore?: number;
    action?: string;
  }>;
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
  supportPrice?: number;
  ecmStatus?: string;
  technicalPattern?: string;
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

    // 5. Repair string or general array corruption where the LLM wrote "key": 。", instead of "key": [
    s = s.replace(
      /"([a-zA-Z0-9_]+)"\s*:\s*。\s*"?\s*,?\s*(?=\r?\n?\s*["{\[\d])/g,
      '"$1": [\n',
    );

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
  const [isOpen, setIsOpen] = useState(false);

  if (!data.historicalDrawdowns || data.historicalDrawdowns.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500 opacity-50">
        <Activity className="w-16 h-16 mx-auto mb-4" />
        <p>查無歷史崩盤數據</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl mb-4 flex flex-col transition-colors hover:border-slate-600">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-6 bg-slate-900/80 border-b border-slate-700 flex items-center justify-between w-full text-left cursor-pointer hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/20 rounded-lg">
            <List className="w-6 h-6 text-rose-400" />
          </div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            歷史回調與事件原因
            {!isOpen && (
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2 py-1 rounded-md ml-2 border border-indigo-500/30">
                打開才載入分析資料
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-700 bg-slate-900/20 p-6 space-y-6"
          >
            <DrawdownChart drawdowns={data.historicalDrawdowns} />

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { getQuotaErrorMessage } from "./utils";

const PriceScreener = ({
  selectedScreenerItems = [],
  onToggleScreenerItem = () => {},
  isWatchlistMode = false,
  onImportLocal = () => {},
  onImportDrive = () => {},
  onExportLocal = () => {},
  onExportDrive = () => {},
}: {
  selectedScreenerItems?: any[];
  onToggleScreenerItem?: (item: any) => void;
  isWatchlistMode?: boolean;
  onImportLocal?: () => void;
  onImportDrive?: () => void;
  onExportLocal?: () => void;
  onExportDrive?: () => void;
}) => {
  const [minPrice, setMinPrice] = useState("10");
  const [maxPrice, setMaxPrice] = useState("50");
  const [minScore, setMinScore] = useState("6");
  const [minBuyScore, setMinBuyScore] = useState("6");
  const [minSellScore, setMinSellScore] = useState("0");
  const [minQualityScore, setMinQualityScore] = useState("6");
  const [minValueScore, setMinValueScore] = useState("6");
  const [minCrashSimScore, setMinCrashSimScore] = useState("1");
  const [limit, setLimit] = useState("50");
  const [screenMode, setScreenMode] = useState<"custom" | "top50" | "bottom50" | "defensive70" | "defensive70Tech" | "worst70Tech">(
    "custom",
  );
  const [results, setResults] = useState<ScreenerItem[]>([]);
  const [showPromptsHelp, setShowPromptsHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<"intro" | "defensive" | "short" | "trend">("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ScreenerItem | null>(null);
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
    mode: "custom" | "top50" | "bottom50" | "defensive70" | "defensive70Tech" | "worst70Tech" = "custom",
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
      } else if (mode === "worst70Tech") {
        prompt = `Using real-time market data from Yahoo Finance and Martin Armstrong's Socrates ECM model principles, find EXACTLY 70 weak/vulnerable US Stocks right now as candidates for aggressive short strategies.
        
        YOU MUST APPLY THESE RIGID CRITERIA TO SELECT THE 70 STOCKS:
        1. "qualityScore" (1-10) MUST be strictly less than 3 (i.e. 1 or 2) evaluating poor/weak financial health.
        2. "valueScore" (1-10) MUST be strictly less than 4 (i.e. 1, 2, or 3) representing overvalued or highly bloated equity.
        3. "buyScore" (1-10) MUST be strictly less than 3 (i.e. 1 or 2) showing weak trend/buy momentum.
        4. "crashSimilarityScore" (1-10) MUST be strictly less than 3 (i.e. 1 or 2) indicating low resilience or highly vulnerable structure to market stress/drawdowns.
        5. Combined Socrates Metrics check:
           - Positive Score ( calculated as: calc(aiScore) + calc(qualityScore) + calc(valueScore) + buyScore, where calc(score) = score > 5 ? score - 5 : 0 ) MUST be strictly less than 4.
           - Negative Score ( calculated as: calc(aiScore) + calc(qualityScore) + calc(valueScore) + sellScore, where calc(score) = score < 5 ? 5 - score : 0 ) MUST be strictly greater than 8.
           Ensure the simulated/estimated scores you return satisfy these thresholds.
        6. Technical Pattern Confirmation: EACH stock MUST strictly correspond to EXACTLY ONE of the following technical breakdown/distribution patterns based on latest chart geometry, and you MUST return this matched form in the "technicalPattern" field:
           - "M型頂"
           - "三重頂"
           - "頭肩頂"
           - "圓弧頂"
           - "喇叭頂"
           - "看跌旗形"
           - "看跌對稱三角形"
           - "看跌持續菱形"
           - "看跌持續楔形"
           - "看跌持續三角形"`;
      } else if (mode === "defensive70" || mode === "defensive70Tech") {
        const withPatterns = mode === "defensive70Tech" ? `
        7. Technical Pattern Confirmation: EACH stock MUST strictly correspond to EXACTLY ONE of the following technical rebound/consolidation patterns based on latest chart geometry, and you MUST return this matched form in the "technicalPattern" field:
           - "W型底"
           - "三重底"
           - "頭肩底"
           - "圓弧底"
           - "喇叭底"
           - "看漲旗形"
           - "看漲對稱三角形"
           - "看漲持續菱形"
           - "看漲持續楔形"
           - "看漲持續三角形"` : "";

        prompt = `Using real-time market data from Yahoo Finance and Martin Armstrong's Socrates ECM model principles, find EXACTLY 70 defensive US Stocks right now.
        We are looking for top-tier low-drawdown, highly resilient assets with robust financial health, pristine value alignment, and key technical/cycle support configurations.

        YOU MUST APPLY THESE RIGID CRITERIA TO SELECT THE 70 STOCKS:
        1. "qualityScore" (1-10) MUST be strictly greater than 7 (i.e. 8, 9, or 10) evaluating top financial health.
        2. "valueScore" (1-10) MUST be strictly greater than 7 (i.e. 8, 9, or 10) representing beautiful undervalued or fair-priced entry points.
        3. "buyScore" (1-10) MUST be strictly greater than 4 (i.e. 5, 6, 7, 8, 9, or 10) showing solid technical momentum/buy strength.
        4. "crashSimilarityScore" (1-10) MUST be strictly greater than 6 (i.e. 7, 8, 9, or 10) indicating very clear historical crash/drawdown resilience.
        5. Proximity to Technical Support: We want the stock currently trading very close to its technical support price. Specifically, the stock's current price must be approximately 1.5% to 2.0% above its estimated "supportPrice". You MUST specify a "supportPrice" for each stock such that (price - supportPrice) / supportPrice is mathematically between 0.015 and 0.020 (1.5% to 2.0%).
        6. Combined Socrates Metrics check:
           - Positive Score ( calculated in code as: calc(aiScore) + calc(qualityScore) + calc(valueScore) + buyScore, where calc(score) = score > 5 ? score - 5 : 0 ) MUST be strictly greater than 4.
           - Negative Score ( calculated in code as: calc(aiScore) + calc(qualityScore) + calc(valueScore) + sellScore, where calc(score) = score < 5 ? 5 - score : 0 ) MUST be strictly less than 5.
           Ensure the simulated/estimated scores you return satisfy these thresholds.${withPatterns}`;
      } else {
        prompt = `Find approximately ${limit} US Stocks that are currently trading between $${minPrice} and $${maxPrice} USD using Yahoo Finance data.
        IMPORTANT: Only include assets that you estimate would have a Screener AI Score (1-10) of AT LEAST ${minScore}/10 right now, a Socrates ECM "buyScore" (1-10) of AT LEAST ${minBuyScore}/10 right now, a "sellScore" (1-10) of AT LEAST ${minSellScore}/10, a Quality Score of AT LEAST ${minQualityScore}/10, a Value Score of AT LEAST ${minValueScore}/10, and a Crash Similarity Score of AT LEAST ${minCrashSimScore}/10.`;
      }

      prompt += `
      ${getCurrentDateContext()}
      Use Google Search to fetch the MOST RECENT and EXACT price for EACH of the selected assets on Yahoo Finance today. Do not hallucinate or use outdated prices.

      CRITICAL INSTRUCTION: For EACH resulting asset, you MUST estimate a "buyScore" (1-10) and "sellScore" (1-10) based on Martin Armstrong's ECM model principles (e.g., proximity to cycle lows/highs, recent trends). Also provide a brief "ecmStatus" indicating the current status. Include "aiScore" (1-10) as a general AI rating, "qualityScore" (1-10) and "valueScore" (1-10). Additionally, include a "crashSimilarityScore" (1-10) evaluating the similarity between the recent drawdown and the 2 most recent major historical drawdowns over the past 5 years.
      Also provide "supportPrice" representing the estimated technical support price for the asset (ensure that for the defensive70/defensive70Tech modes, the current price is exactly 1.5% to 2% above this supportPrice).
      IMPORTANT: The "ecmStatus" field MUST be written in Traditional Chinese (繁體中文), e.g., "接近週期低點且獲強支撐", "多頭防禦成形", "雙重重疊支撐".
      
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
          "crashSimilarityScore": 7,
          "supportPrice": 147.50,
          "ecmStatus": "強力支撐之上1.7%盤整，多頭防禦特徵顯著",
          "technicalPattern": "W型底"
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
        throw new Error("回應格式錯誤 (非陣列)");
      }
    } catch (err: any) {
      console.error(err);
      setError(getQuotaErrorMessage(err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = useMemo(() => {
    const items = isWatchlistMode ? [...selectedScreenerItems] : [...results];
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
  }, [results, sortBy, isWatchlistMode, selectedScreenerItems]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!isWatchlistMode && (
        <div className="bg-slate-800 p-4 md:px-8 md:py-5 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Filter className="w-6 h-6 text-amber-500" />
            <span>Socrates 智能篩選器</span>
            <button
              onClick={() => setShowPromptsHelp(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 transition-all flex items-center justify-center"
              title="查看智能篩選器規則與 Prompt 說明"
              type="button"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              id="btn-defensive-70"
              onClick={() => handleSearch("defensive70")}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-2 ${
                screenMode === "defensive70"
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_2px_10px_rgba(37,99,235,0.2)]"
                  : "bg-slate-900 border-slate-700 text-blue-400 hover:border-blue-500"
              }`}
              title="品質評分 > 7、價值評分 > 7、買入評分 > 4、崩盤相似度 > 6、Pos評分 > 4、Neg評分 < 5，且離目前最新價位靠近技術分析支撐價格約 1.5~2% 左右。"
            >
              <ShieldCheck className="w-4 h-4" /> 🛡️ 防禦型前70
            </button>
            <button
              id="btn-defensive-70-tech"
              onClick={() => handleSearch("defensive70Tech")}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-2 ${
                screenMode === "defensive70Tech"
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_2px_10px_rgba(79,70,229,0.2)] animate-pulse"
                  : "bg-slate-900 border-slate-700 text-indigo-400 hover:border-indigo-500"
              }`}
              title="品質評分 > 7、價值評分 > 7、買入評分 > 4、崩盤相似度 > 6、Pos評分 > 4、Neg評分 < 5，離最新價靠近支撐價格 1.5~2% 左右，且符合看漲技術形態（如W型底、三重底等二維特徵形態確認）。"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" /> 🛡️ 防禦型前70 + 技術確認
            </button>
            <button
              id="btn-worst-70-tech"
              onClick={() => handleSearch("worst70Tech")}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-2 ${
                screenMode === "worst70Tech"
                  ? "bg-rose-600 border-rose-400 text-white shadow-[0_2px_10px_rgba(225,29,72,0.2)] animate-pulse"
                  : "bg-slate-900 border-slate-700 text-rose-400 hover:border-rose-500"
              }`}
              title="品質評分 < 3、價值評分 < 4、買入評分 < 3、崩盤相似度 < 3、Pos評分 < 4、Neg評分 > 8，且符合看跌技術狀態（如M型頂、三重頂等二維特徵型態確認）。"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" /> ⚔️ 猛攻最弱前70 + 技術確認
            </button>
            <button
              onClick={() => handleSearch("top50")}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-2 ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-2 ${
                screenMode === "bottom50"
                  ? "bg-red-600 border-red-400 text-white"
                  : "bg-slate-900 border-slate-700 text-red-500 hover:border-red-500"
              }`}
            >
              <TrendingDownIcon className="w-4 h-4" /> 最弱前 50 名
            </button>
            <button
              onClick={() => setScreenMode("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 items-end animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-3 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-3 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold text-sky-500/80 mb-1 uppercase"
                title="Minimum AI Score"
              >
                最低 AI 分
              </label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-sky-500"
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
                className="block text-xs font-bold text-emerald-500/80 mb-1 uppercase"
                title="Minimum Buy Score"
              >
                最低 Buy Score
              </label>
              <select
                value={minBuyScore}
                onChange={(e) => setMinBuyScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-emerald-500"
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
                className="block text-xs font-bold text-rose-500/80 mb-1 uppercase"
                title="Minimum Sell Score"
              >
                最低 Sell Score
              </label>
              <select
                value={minSellScore}
                onChange={(e) => setMinSellScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-rose-500"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-500/80 mb-1 uppercase">
                最低 Quality
              </label>
              <select
                value={minQualityScore}
                onChange={(e) => setMinQualityScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-500/80 mb-1 uppercase">
                最低 Value
              </label>
              <select
                value={minValueScore}
                onChange={(e) => setMinValueScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-purple-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-500/80 mb-1 uppercase whitespace-nowrap">
                崩盤相似度 (低-高)
              </label>
              <select
                value={minCrashSimScore}
                onChange={(e) => setMinCrashSimScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                數量
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-500"
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
              className="col-span-2 sm:col-span-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[32px]"
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
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 animate-in zoom-in-95 duration-300">
            <div className="text-slate-400 font-medium font-sans">
              {error ? (
                <span className="flex items-center justify-center gap-2 text-rose-500 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  {getQuotaErrorMessage(error)}
                </span>
              ) : loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  正在透過 Socrates ECM 模型分析市場中的{" "}
                  {screenMode === "top50" ? "最強 50 名" : screenMode === "bottom50" ? "最弱 50 名" : screenMode === "defensive70Tech" ? "防禦型前 70 名 + 技術型態確認" : screenMode === "worst70Tech" ? "猛攻最弱前 70 名 + 技術型態確認" : "防禦型前 70 名"} 表現者...
                </span>
              ) : (
                <span className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    已成功載入篩選：
                    <span className="text-amber-500">
                      {screenMode === "top50" ? "最強 50 名" : screenMode === "bottom50" ? "最弱 50 名" : screenMode === "defensive70Tech" ? "防禦型前 70 名 + 技術型態確認" : screenMode === "worst70Tech" ? "猛攻最弱前 70 名 + 技術型態確認" : "防禦型前 70 名"}
                    </span>
                    （共 {results.length} 檔標的）
                  </span>
                  <button
                    onClick={() => {
                      setScreenMode("custom");
                    }}
                    className="text-[10px] text-amber-500 hover:text-amber-400 font-black border border-amber-500/30 px-3 py-1.5 rounded-md bg-amber-500/5 hover:bg-amber-500/10 transition-all cursor-pointer"
                  >
                    重置並切換為自定義篩選
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {error && !isWatchlistMode && (
        <div className="bg-red-900/10 border border-red-500/30 p-4 rounded-2xl text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {(isWatchlistMode ? selectedScreenerItems.length > 0 : results.length > 0) && (
        <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900 border-b border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="font-black text-sm uppercase tracking-widest text-white flex items-center gap-2">
                <List className="w-5 h-5 text-amber-500" /> {isWatchlistMode ? "精選名單" : "搜尋結果"} (
                {isWatchlistMode ? selectedScreenerItems.length : results.length})
              </span>
              <button
                onClick={isWatchlistMode ? onExportLocal : handleExportJson}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-black text-slate-400 hover:text-white transition-all group"
              >
                <Download className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                匯出 JSON
              </button>
              {isWatchlistMode && (
                <button
                  onClick={onImportLocal}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-black text-slate-400 hover:text-white transition-all group"
                >
                  <CloudUpload className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  匯入 JSON
                </button>
              )}
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
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="bg-slate-950 text-slate-500 sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="p-4 w-32 font-bold tracking-wider">代碼</th>
                  <th className="p-4 font-bold tracking-wider">名稱</th>
                  <th className="p-4 w-28 text-right font-bold tracking-wider">現價</th>
                  <th className="p-4 text-center font-bold tracking-wider text-fuchsia-500">AI分析</th>
                  <th className="p-4 text-center font-bold tracking-wider text-emerald-500">BUY</th>
                  <th className="p-4 text-center font-bold tracking-wider text-rose-500">SELL ↓</th>
                  <th className="p-4 text-center font-bold tracking-wider text-sky-500">風險</th>
                  <th className="p-4 text-center font-bold tracking-wider text-slate-400">QUAL</th>
                  <th className="p-4 text-center font-bold tracking-wider text-slate-400">VAL</th>
                  <th className="p-4 text-center font-bold tracking-wider text-emerald-600">POS VAL</th>
                  <th className="p-4 text-center font-bold tracking-wider text-rose-600">NEG VAL</th>
                  <th className="p-4 max-w-[200px] font-bold tracking-wider">訊號解讀</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedResults.map((item, idx) => {
                  const isSelected = selectedScreenerItems?.some(i => i.symbol === item.symbol) || false;
                  return (
                  <tr
                    key={idx}
                    className={`transition-all group border-l-4 border-l-transparent hover:border-l-amber-500 ${isSelected ? 'bg-amber-900/20 hover:bg-amber-900/30' : 'hover:bg-slate-800/40'}`}
                  >
                    <td className="p-4 font-black">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <input type="checkbox" checked={isSelected} onChange={() => onToggleScreenerItem?.(item)} className="w-3.5 h-3.5 flex-shrink-0 cursor-pointer accent-amber-500 rounded-sm" title={isSelected ? "取消勾選" : "勾選"} />
                        <button onClick={() => navigator.clipboard.writeText(JSON.stringify(item))} className="text-slate-500 hover:text-sky-400 flex-shrink-0 transition-colors" title="複製此列 JSON"><Copy className="w-3.5 h-3.5" /></button>
                        {isWatchlistMode && (
                          <button onClick={() => setConfirmDeleteItem(item)} className="text-slate-500 hover:text-rose-500 flex-shrink-0 transition-colors" title="自精選名單移除"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                        <span className="text-white group-hover:text-amber-500 transition-colors terminal-text uppercase tracking-tighter text-sm">{item.symbol}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 font-bold whitespace-nowrap">
                      <div>{item.name || "-"}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{item.sector || "-"}</span>
                        {item.technicalPattern && (
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider whitespace-nowrap ${
                            item.technicalPattern.includes("頂") || item.technicalPattern.includes("看跌") || item.technicalPattern.includes("M")
                              ? "bg-rose-950/65 text-rose-300 border border-rose-500/30"
                              : "bg-indigo-900/65 text-indigo-300 border border-indigo-500/30"
                          }`}>
                            {item.technicalPattern.includes("頂") || item.technicalPattern.includes("看跌") || item.technicalPattern.includes("M") ? '📉' : '📈'} {item.technicalPattern}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right font-black text-amber-500 terminal-text whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-sm">${item.price?.toLocaleString() || "-"}</span>
                        {item.supportPrice && item.supportPrice > 0 && (
                          <div className="flex flex-col items-end mt-0.5 leading-tight">
                            <span className="text-[10px] text-sky-400">支撐: ${item.supportPrice?.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-400 font-medium">距支撐: {(((item.price - item.supportPrice) / item.supportPrice) * 100).toFixed(2)}%</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-fuchsia-400 terminal-text">{item.aiScore ?? 5}</td>
                    <td className="p-4 text-center font-bold text-emerald-400 terminal-text">{item.buyScore || 0}</td>
                    <td className="p-4 text-center font-bold text-rose-400 terminal-text">{item.sellScore || 0}</td>
                    <td className="p-4 text-center font-bold text-sky-400 terminal-text">{item.crashSimilarityScore || 0}</td>
                    <td className="p-4 text-center font-bold text-blue-400 terminal-text">{item.qualityScore || 0}</td>
                    <td className="p-4 text-center font-bold text-purple-400 terminal-text">{item.valueScore || 0}</td>
                    <td className="p-4 text-center font-bold text-emerald-500 terminal-text">{getPosScore(item)}</td>
                    <td className="p-4 text-center font-bold text-rose-500 terminal-text">{getNegScore(item)}</td>
                    <td className="p-4 font-bold max-w-[200px]">
                      <div className="bg-slate-900 border border-slate-700/50 rounded-lg px-2.5 py-1.5 truncate text-xs text-slate-300 w-full hover:overflow-visible hover:whitespace-normal hover:z-50 hover:relative" title={item.ecmStatus || "分析中..."}>
                         {item.ecmStatus || "分析中..."}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isWatchlistMode && selectedScreenerItems.length === 0 && (
        <div className="bg-slate-800 p-8 md:p-12 rounded-3xl border border-slate-700 text-center space-y-6 max-w-lg mx-auto shadow-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <List className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-200">精選名單目前為空 📃</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              您尚未在精選名單中添加任何個股。
              請先切換至「篩選器」進行選股分析，並在篩選結果中勾選加入；
              或者您也可以使用下方的「匯入 JSON」按鈕載入先前的備份檔案。
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              onClick={onImportLocal}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-black rounded-xl text-xs transition-colors flex items-center gap-2 shadow-lg shadow-amber-950/20 cursor-pointer"
            >
              <CloudUpload className="w-4 h-4 text-white" /> 匯入先前備份 (.json)
            </button>
          </div>
        </div>
      )}

      {/* Remove Item Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteItem && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteItem(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full z-[260]"
            >
              <h4 className="text-base font-black text-white mb-2 flex items-center gap-1.5">
                <Trash2 className="w-5 h-5 text-rose-500 animate-pulse" />
                確認移除
              </h4>
              <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed">
                確定要將 「<span className="text-amber-500 font-mono font-bold">{confirmDeleteItem.symbol}</span>」 從精選名單中移除嗎？
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteItem(null)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onToggleScreenerItem?.(confirmDeleteItem);
                    setConfirmDeleteItem(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-900/20"
                >
                  確認移除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Socrates Prompts Explanation Dialog */}
      <AnimatePresence>
        {showPromptsHelp && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPromptsHelp(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            {/* Content Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden font-sans text-slate-200"
            >
              <style>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none !important;
                }
                .no-scrollbar {
                  -ms-overflow-style: none !important;
                  scrollbar-width: none !important;
                }
              `}</style>

              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/30 font-sans flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Socrates 智能篩選器篩選機制</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Core Prompt Logic & Filtering Rules</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPromptsHelp(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-black"
                >
                  關閉
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-800 bg-slate-950 p-1 mb-0 sticky top-[77px] z-10 overflow-x-auto no-scrollbar gap-1">
                {[
                  { id: "intro", label: "核心機制", icon: <Bot className="w-4 h-4" /> },
                  { id: "defensive", label: "🛡️ 防禦穩健", icon: <ShieldCheck className="w-4 h-4 text-indigo-400" /> },
                  { id: "short", label: "⚔️ 空頭狙擊", icon: <Target className="w-4 h-4 text-rose-400 font-extrabold" /> },
                  { id: "trend", label: "🚀 多空趨勢", icon: <Zap className="w-4 h-4 text-emerald-400" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setHelpTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-black rounded-lg transition-all whitespace-nowrap flex-1 justify-center ${
                      helpTab === tab.id
                        ? "bg-slate-850 text-amber-400 border border-slate-700/85 shadow-md font-extrabold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Body Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs leading-relaxed no-scrollbar flex-1">
                {helpTab === "intro" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                      <p className="text-slate-300 font-medium font-sans">
                        Socrates 智能篩選器背後串接 <span className="text-amber-400 font-bold">Google Gemini 3.5 AI</span> 模型，並與 Yahoo Finance 的即時市場深度數據連動。它嚴格模擬與計算馬丁·阿姆斯壯 (Martin Armstrong) 主導之經濟信心模型 (ECM)、下行週期支撐極限、歷史主要崩盤韌性及蘇格拉底多維系統性評分參數。
                      </p>
                    </div>

                    <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800/80">
                      <h5 className="font-extrabold text-amber-500 text-sm mb-3 font-sans">🛠️ 多維評分與權重配比</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300 font-sans">
                        <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/50">
                          <span className="font-bold text-sky-450 block mb-0.5">AIC (Screener AI Score 1-10)：</span>
                          <span className="text-slate-400">整體市場多空、經濟週期拐點與總經流動性信心評分。</span>
                        </div>
                        <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/50">
                          <span className="font-bold text-emerald-450 block mb-0.5">Buy/Sell Score (1-10)：</span>
                          <span className="text-slate-400">ECM模型內核特徵，表示多頭推升力道 / 空頭拋售警戒水準。</span>
                        </div>
                        <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/50">
                          <span className="font-bold text-blue-450 block mb-0.5">Quality Score (1-10)：</span>
                          <span className="text-slate-400">資產負債表體質、毛利護城河與長期資本公允價值判定。</span>
                        </div>
                        <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/50">
                          <span className="font-bold text-purple-450 block mb-0.5">Value Score (1-10)：</span>
                          <span className="text-slate-400">本益比/股價淨值比等估值常態分佈安全區間。</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {helpTab === "defensive" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Mode 1 */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <h5 className="font-extrabold text-blue-400 text-sm font-sans">🛡️ 防禦型前70 (Defensive Top 70)</h5>
                      </div>
                      <div className="pl-4 space-y-2">
                        <p className="text-slate-400 font-sans">
                          <strong>邏輯核心：</strong>精選估值安全（穩健護城河）、財務體質卓越、具備極佳市場崩盤防禦力之價值標的。
                        </p>
                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50 space-y-1 text-[11px] font-mono text-slate-300">
                          <div>• Quality Score &gt; 7 (評分 8 - 10)</div>
                          <div>• Value Score &gt; 7 (評分 8 - 10)</div>
                          <div>• Buy Momentum &gt; 4 (評分 5 - 10)</div>
                          <div>• Crash Resilience &gt; 6 (防禦評分 7 - 10)</div>
                          <div>• 價位接近支撐: 最新股價必須精確落在 AI 估計之 <span className="text-emerald-400 font-bold">supportPrice 上方 1.5% ~ 2.0%</span> 之內。</div>
                          <div>• 綜合 Positive 評分 &gt; 4，Negative 評分 &lt; 5</div>
                        </div>
                      </div>
                    </div>

                    {/* Mode 2 */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-505 animate-pulse" />
                        <h5 className="font-extrabold text-indigo-400 text-sm font-sans">🛡️ 防禦型前70 + 技術確認 (Defensive Top 70 + Tech)</h5>
                      </div>
                      <div className="pl-4 space-y-2">
                        <p className="text-slate-400 font-sans">
                          <strong>邏輯核心：</strong>完全繼承「防禦型前70」的財務安全與估值防線。額外對標最新日 K / 週 K 線圖做圖形特徵確認。
                        </p>
                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50 space-y-1 text-[11px] text-slate-300">
                          <p className="font-mono text-slate-400 mb-1.5 font-sans">額外硬性規定：每檔股票必須完全滿足下列 10 種看漲回升型態之一，並標註於系統中：</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-indigo-300 font-bold font-sans mt-1">
                            <div>• W型底</div>
                            <div>• 三重底</div>
                            <div>• 頭肩底</div>
                            <div>• 圓弧底</div>
                            <div>• 喇叭底</div>
                            <div>• 看漲旗形</div>
                            <div>• 看漲對稱三角形</div>
                            <div>• 看漲持續菱形</div>
                            <div>• 看漲持續楔形</div>
                            <div>• 看漲持續三角形</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {helpTab === "short" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Mode 3 */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <h5 className="font-extrabold text-rose-400 text-sm font-sans">⚔️ 猛攻最弱前70 + 技術確認 (Aggressive Short Top 70)</h5>
                      </div>
                      <div className="pl-4 space-y-2">
                        <p className="text-slate-400 font-sans">
                          <strong>邏輯核心：</strong>用於尋找面臨高風險、高估值、空頭壓力沈重、財務虛弱且已確認頂部圖案的做空與狙擊選項。
                        </p>
                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50 space-y-1 text-[11px] text-slate-300 font-sans">
                          <div className="font-mono space-y-0.5 mb-2 text-slate-400">
                            <div>• Quality Score &lt; 3 (評分 1 或 2，基本面極弱)</div>
                            <div>• Value Score &lt; 4 (評分 1, 2 或 3，定價高昂且估值泡沫)</div>
                            <div>• Buy Momentum &lt; 3 (買力竭盡、面臨空頭大勢)</div>
                            <div>• Crash Resilience &lt; 5 (防禦回撤評分極低)</div>
                            <div>• 綜合 Positive 評分 &lt; 4，Negative 空頭警戒評分 &gt; 8</div>
                          </div>
                          <p className="font-mono text-slate-400 border-t border-slate-700/50 pt-2 mt-2 font-sans">技術確認分配型態：必須明確屬於下列 10 種看跌頂形/分派型態之一：</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-rose-300 font-bold font-sans mt-1">
                            <div>• M型頂</div>
                            <div>• 三重頂</div>
                            <div>• 頭肩頂</div>
                            <div>• 圓弧頂</div>
                            <div>• 喇叭頂</div>
                            <div>• 看跌旗形</div>
                            <div>• 看跌對稱三角形</div>
                            <div>• 看跌持續菱形</div>
                            <div>• 看跌持續楔形</div>
                            <div>• 看跌持續三角形</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {helpTab === "trend" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Mode 4 & 5 */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h5 className="font-extrabold text-emerald-400 text-sm font-sans">🚀 最強前50名 (Strongest 50)</h5>
                      </div>
                      <div className="pl-4">
                        <p className="text-slate-400 font-sans mb-2">
                          <strong>篩選特徵：</strong>結合 Yahoo Finance 最新多頭氣勢與 Socrates 的 buyScores。著重強勁之多頭突破與即將進入大幅上行週期的反轉標的。
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <h5 className="font-extrabold text-red-400 text-sm font-sans">📉 最弱前50名 (Weakest 50)</h5>
                      </div>
                      <div className="pl-4">
                        <p className="text-slate-400 font-sans mb-2">
                          <strong>篩選特徵：</strong>著重近期高點遇上重大阻力轉弱，或接近下行崩盤拐點。在系統中體現為極高的賣出評分 (sellScores) 與跌勢確立。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 sticky bottom-0 z-10">
                <button
                  onClick={() => setShowPromptsHelp(false)}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold transition-colors text-xs font-sans"
                >
                  我理解了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

// Helper to categorize any stock into its TradingView Heatmap Industry/Sector classification
const getTradingViewHeatmapSector = (symbol: string, initialSector?: string): string => {
  if (!symbol) return "其他產業板塊";
  const s = symbol.toUpperCase().trim();
  
  // Direct precise map based on TradingView S&P 500 stock heatmap groupings:
  const map: Record<string, string> = {
    // 💻 Electronic Technology (電子科技 - Chips, Hardware & Semis)
    "AAPL": "Electronic Technology (電子科技)",
    "NVDA": "Electronic Technology (電子科技)",
    "AVGO": "Electronic Technology (電子科技)",
    "AMD": "Electronic Technology (電子科技)",
    "QCOM": "Electronic Technology (電子科技)",
    "INTC": "Electronic Technology (電子科技)",
    "TXN": "Electronic Technology (電子科技)",
    "AMAT": "Electronic Technology (電子科技)",
    "LRCX": "Electronic Technology (電子科技)",
    "MU": "Electronic Technology (電子科技)",
    "ADI": "Electronic Technology (電子科技)",
    "NXPI": "Electronic Technology (電子科技)",
    "KLAC": "Electronic Technology (電子科技)",
    "MRVL": "Electronic Technology (電子科技)",
    "MCHP": "Electronic Technology (電子科技)",
    "TSM": "Electronic Technology (電子科技)",
    "ASML": "Electronic Technology (電子科技)",
    "SMCI": "Electronic Technology (電子科技)",

    // 🌐 Technology Services (科技服務 - Software, Internet & AI Services)
    "MSFT": "Technology Services (科技服務)",
    "GOOG": "Technology Services (科技服務)",
    "GOOGL": "Technology Services (科技服務)",
    "META": "Technology Services (科技服務)",
    "ORCL": "Technology Services (科技服務)",
    "ADBE": "Technology Services (科技服務)",
    "CRM": "Technology Services (科技服務)",
    "NFLX": "Technology Services (科技服務)",
    "PLTR": "Technology Services (科技服務)",
    "PANW": "Technology Services (科技服務)",
    "SNOW": "Technology Services (科技服務)",
    "WDAY": "Technology Services (科技服務)",
    "ROP": "Technology Services (科技服務)",
    "CDNS": "Technology Services (科技服務)",
    "SNPS": "Technology Services (科技服務)",
    "FTNT": "Technology Services (科技服務)",

    // 🏦 Finance / Financial Services (金融服務)
    "BRK.B": "Finance (金融服務)",
    "BRK.A": "Finance (金融服務)",
    "JPM": "Finance (金融服務)",
    "BAC": "Finance (金融服務)",
    "WFC": "Finance (金融服務)",
    "MS": "Finance (金融服務)",
    "GS": "Finance (金融服務)",
    "SPGI": "Finance (金融服務)",
    "BLK": "Finance (金融服務)",
    "C": "Finance (金融服務)",
    "PGR": "Finance (金融服務)",
    "CB": "Finance (金融服務)",
    "MMC": "Finance (金融服務)",
    "AON": "Finance (金融服務)",
    "AXP": "Finance (金融服務)",
    "SCHW": "Finance (金融服務)",
    "USB": "Finance (金融服務)",
    "PNC": "Finance (金融服務)",
    "SYF": "Finance (金融服務)",
    "ALL": "Finance (金融服務)",

    // 🏥 Health Technology (健康科技 - Bio, Pharma, MedTech)
    "LLY": "Health Technology (健康科技)",
    "UNH": "Health Technology (健康科技)",
    "JNJ": "Health Technology (健康科技)",
    "ABBV": "Health Technology (健康科技)",
    "MRK": "Health Technology (健康科技)",
    "TMO": "Health Technology (健康科技)",
    "ABT": "Health Technology (健康科技)",
    "PFE": "Health Technology (健康科技)",
    "AMGN": "Health Technology (健康科技)",
    "ISRG": "Health Technology (健康科技)",
    "GILD": "Health Technology (健康科技)",
    "VRTX": "Health Technology (健康科技)",
    "SYK": "Health Technology (健康科技)",
    "REGN": "Health Technology (健康科技)",
    "MDT": "Health Technology (健康科技)",
    "BMY": "Health Technology (健康科技)",
    "BSX": "Health Technology (健康科技)",

    // 🧺 Consumer Non-Durables (非耐用消費品 - FMCG, Soda, Tobacco)
    "PG": "Consumer Non-Durables (非耐用消費品)",
    "KO": "Consumer Non-Durables (非耐用消費品)",
    "PEP": "Consumer Non-Durables (非耐用消費品)",
    "PM": "Consumer Non-Durables (非耐用消費品)",
    "MO": "Consumer Non-Durables (非耐用消費品)",
    "CL": "Consumer Non-Durables (非耐用消費品)",
    "EL": "Consumer Non-Durables (非耐用消費品)",
    "KDP": "Consumer Non-Durables (非耐用消費品)",
    "MDLZ": "Consumer Non-Durables (非耐用消費品)",
    "GIS": "Consumer Non-Durables (非耐用消費品)",
    "NSRGY": "Consumer Non-Durables (非耐用消費品)",

    // 🛒 Consumer Services (消費者服務 - Retail, Travel, Streaming)
    "SE": "Retail Trade (零售貿易 - Internet Retail)",
    "AMZN": "Consumer Services (消費者服務)",
    "WMT": "Consumer Services (消費者服務)",
    "MCD": "Consumer Services (消費者服務)",
    "DIS": "Consumer Services (消費者服務)",
    "HD": "Consumer Services (消費者服務)",
    "LOW": "Consumer Services (消費者服務)",
    "NKE": "Consumer Services (消費者服務)",
    "SBUX": "Consumer Services (消費者服務)",
    "BKNG": "Consumer Services (消費者服務)",
    "TGT": "Consumer Services (消費者服務)",
    "TJX": "Consumer Services (消費者服務)",
    "CMCSA": "Consumer Services (消費者服務)",
    "CMG": "Consumer Services (消費者服務)",
    "MAR": "Consumer Services (消費者服務)",
    "HLT": "Consumer Services (消費者服務)",
    "YUM": "Consumer Services (消費者服務)",

    // ⚡ Energy Minerals (能源礦產 - Oil, Gas, Drilling)
    "XOM": "Energy Minerals (能源礦產)",
    "CVX": "Energy Minerals (能源礦產)",
    "COP": "Energy Minerals (能源礦產)",
    "SLB": "Energy Minerals (能源礦產)",
    "EOG": "Energy Minerals (能源礦產)",
    "MPC": "Energy Minerals (能源礦產)",
    "PSX": "Energy Minerals (能源礦產)",
    "PXD": "Energy Minerals (能源礦產)",
    "OXY": "Energy Minerals (能源礦產)",
    "HAL": "Energy Minerals (能源礦產)",

    // 🏭 Producer Manufacturing (生產製造 - Heavy Equipment, Aerospace & Defense)
    "CAT": "Producer Manufacturing (生產製造)",
    "GE": "Producer Manufacturing (生產製造)",
    "DE": "Producer Manufacturing (生產製造)",
    "HON": "Producer Manufacturing (生產製造)",
    "LMT": "Producer Manufacturing (生產製造)",
    "RTX": "Producer Manufacturing (生產製造)",
    "BA": "Producer Manufacturing (生產製造)",
    "UPS": "Producer Manufacturing (生產製造)",
    "FDX": "Producer Manufacturing (生產製造)",
    "EMR": "Producer Manufacturing (生產製造)",
    "ETN": "Producer Manufacturing (生產製造)",
    "ITW": "Producer Manufacturing (生產製造)",
    "NSC": "Producer Manufacturing (生產製造)",

    // 🧪 Process Industries (流程工業 - Chemicals & Materials)
    "LIN": "Process Industries (流程工業)",
    "APD": "Process Industries (流程工業)",
    "SHW": "Process Industries (流程工業)",
    "FCX": "Process Industries (流程工業)",
    "NEM": "Process Industries (流程工業)",
    "DD": "Process Industries (流程工業)",
    "ECL": "Process Industries (流程工業)",
    "DOW": "Process Industries (流程工業)",

    // 💡 Utilities (公用事業 - Power, Gas, Water)
    "NEE": "Utilities (公用事業)",
    "SO": "Utilities (公用事業)",
    "DUK": "Utilities (公用事業)",
    "AEP": "Utilities (公用事業)",
    "SRE": "Utilities (公用事業)",
    "PEG": "Utilities (公用事業)",
    "EXC": "Utilities (公用事業)",
    "D": "Utilities (公用事業)",
    "ED": "Utilities (公用事業)",
    "WEC": "Utilities (公用事業)",

    // 📞 Communications (通訊服務 - Telecom)
    "T": "Communications (通訊服務)",
    "VZ": "Communications (通訊服務)",
    "TMUS": "Communications (通訊服務)",

    // 💳 Commercial Services (商業服務 - Consulting & Payments)
    "V": "Commercial Services (商業服務)",
    "MA": "Commercial Services (商業服務)",
    "PYPL": "Commercial Services (商業服務)",
    "ACN": "Commercial Services (商業服務)",
    "ADP": "Commercial Services (商業服務)",
    "FIS": "Commercial Services (商業服務)",
    "FISV": "Commercial Services (商業服務)",
    "GPN": "Commercial Services (商業服務)",

    // 🚗 Consumer Durables (耐用消費品 - EV, Autos)
    "TSLA": "Consumer Durables (耐用消費品)",
    "F": "Consumer Durables (耐用消費品)",
    "GM": "Consumer Durables (耐用消費品)",
    "TM": "Consumer Durables (耐用消費品)",
    "HMC": "Consumer Durables (耐用消費品)",
  };

  if (map[s]) {
    return map[s];
  }

  // Fallback heuristic based on initial sector strings from server or DB:
  if (initialSector) {
    const isec = initialSector.toLowerCase().trim();
    if (isec.includes("electronic") || isec.includes("semiconductor") || isec.includes("chip") || isec.includes("hardware") || isec.includes("electronic technology")) {
      return "Electronic Technology (電子科技)";
    }
    if (isec.includes("software") || isec.includes("internet") || isec.includes("technology service") || isec.includes("computer") || isec.includes("it services")) {
      return "Technology Services (科技服務)";
    }
    if (isec.includes("bank") || isec.includes("finance") || isec.includes("insurance") || isec.includes("financial") || isec.includes("investment")) {
      return "Finance (金融服務)";
    }
    if (isec.includes("health") || isec.includes("pharma") || isec.includes("drug") || isec.includes("medical") || isec.includes("biotech") || isec.includes("health technology")) {
      return "Health Technology (健康科技)";
    }
    if (isec.includes("beverage") || isec.includes("food") || isec.includes("tobacco") || isec.includes("staples") || isec.includes("consumer non-durables")) {
      return "Consumer Non-Durables (非耐用消費品)";
    }
    if (isec.includes("retail") || isec.includes("service") || isec.includes("entertainment") || isec.includes("media") || isec.includes("hotel") || isec.includes("restaurant") || isec.includes("internet retail") || isec.includes("consumer services")) {
      return "Consumer Services (消費者服務)";
    }
    if (isec.includes("energy") || isec.includes("oil") || isec.includes("gas") || isec.includes("petroleum") || isec.includes("drilling") || isec.includes("energy minerals")) {
      return "Energy Minerals (能源礦產)";
    }
    if (isec.includes("manufactur") || isec.includes("industrial") || isec.includes("aerospace") || isec.includes("defense") || isec.includes("machinery") || isec.includes("producer manufacturing")) {
      return "Producer Manufacturing (生產製造)";
    }
    if (isec.includes("chemical") || isec.includes("material") || isec.includes("metal") || isec.includes("mine") || isec.includes("mining") || isec.includes("process industries")) {
      return "Process Industries (流程工業)";
    }
    if (isec.includes("utility") || isec.includes("power") || isec.includes("water") || isec.includes("electric") || isec.includes("utilities")) {
      return "Utilities (公用事業)";
    }
    if (isec.includes("communication") || isec.includes("telecom") || isec.includes("communications")) {
      return "Communications (通訊服務)";
    }
    if (isec.includes("commercial") || isec.includes("payment") || isec.includes("consulting") || isec.includes("commercial services")) {
      return "Commercial Services (商業服務)";
    }
    if (isec.includes("auto") || isec.includes("car") || isec.includes("vehicle") || isec.includes("durable") || isec.includes("consumer durables")) {
      return "Consumer Durables (耐用消費品)";
    }
  }

  // Pre-emptive direct common symbol fallbacks for other typical index/screener holdings
  if (s === "AAPL" || s === "NVDA" || s === "AVGO" || s === "AMD") return "Electronic Technology (電子科技)";
  if (s === "MSFT" || s === "META" || s === "GOOG" || s === "GOOGL") return "Technology Services (科技服務)";
  if (s === "AMZN" || s === "WMT" || s === "TSLA") return "Consumer Services (消費者服務)";
  if (s === "JPM" || s === "BAC" || s === "GS" || s === "MS") return "Finance (金融服務)";
  if (s === "LLY" || s === "UNH" || s === "JNJ" || s === "PFE") return "Health Technology (健康科技)";

  return "其他產業板塊";
};

// Define custom beautiful Morandi sector colors for sophisticated low-saturated matte visual elegance
const sectorColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  "electronic technology": { bg: "rgba(141, 153, 142, 0.15)", border: "rgba(141, 153, 142, 0.45)", text: "#a3b1a2", glow: "rgba(141, 153, 142, 0.2)" }, // Sage
  "technology services": { bg: "rgba(119, 136, 152, 0.15)", border: "rgba(119, 136, 152, 0.45)", text: "#a2b2c1", glow: "rgba(119, 136, 152, 0.2)" }, // Dusty Blue
  "finance": { bg: "rgba(188, 168, 145, 0.15)", border: "rgba(188, 168, 145, 0.45)", text: "#d4c5b3", glow: "rgba(188, 168, 145, 0.2)" }, // Dusty Ocher/Sand
  "health technology": { bg: "rgba(180, 142, 147, 0.15)", border: "rgba(180, 142, 147, 0.45)", text: "#cbb2b5", glow: "rgba(180, 142, 147, 0.2)" }, // Dusty Rose
  "consumer services": { bg: "rgba(175, 122, 111, 0.15)", border: "rgba(175, 122, 111, 0.45)", text: "#cba29a", glow: "rgba(175, 122, 111, 0.2)" }, // Terracotta/Muted Coral
  "consumer non-durables": { bg: "rgba(128, 141, 120, 0.15)", border: "rgba(128, 141, 120, 0.45)", text: "#9fae99", glow: "rgba(128, 141, 120, 0.2)" }, // Olive
  "consumer durables": { bg: "rgba(150, 120, 141, 0.15)", border: "rgba(150, 120, 141, 0.45)", text: "#bba3b2", glow: "rgba(150, 120, 141, 0.2)" }, // Mauve/Plum
  "energy minerals": { bg: "rgba(176, 143, 115, 0.15)", border: "rgba(176, 143, 115, 0.45)", text: "#cca992", glow: "rgba(176, 143, 115, 0.2)" }, // Muted Amber
  "process industries": { bg: "rgba(135, 127, 145, 0.15)", border: "rgba(135, 127, 145, 0.45)", text: "#b5abbf", glow: "rgba(135, 127, 145, 0.2)" }, // Lavender grey
  "industrial services": { bg: "rgba(145, 137, 124, 0.15)", border: "rgba(145, 137, 124, 0.45)", text: "#bfb5a5", glow: "rgba(145, 137, 124, 0.2)" }, // Warm Grey/Peat
  "commercial services": { bg: "rgba(185, 180, 145, 0.15)", border: "rgba(185, 180, 145, 0.45)", text: "#cfcbb3", glow: "rgba(185, 180, 145, 0.2)" }, // Muted Wheat/Straw
  "utilities": { bg: "rgba(140, 160, 145, 0.15)", border: "rgba(140, 160, 145, 0.45)", text: "#abbfbc", glow: "rgba(140, 160, 145, 0.2)" } // Pale Celadon
};

const getSectorColor = (sectorName: string) => {
  const normalized = sectorName.toLowerCase().trim();
  const matchedKey = Object.keys(sectorColors).find(
    (k) => normalized.includes(k) || k.includes(normalized)
  );
  if (matchedKey) return sectorColors[matchedKey];

  // Hash-based dynamic fallback generator so any custom Chinese sector gets a beautiful Morandi color
  let hash = 0;
  for (let i = 0; i < sectorName.length; i++) {
    hash = sectorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const fallbackList = [
    { bg: "rgba(141, 153, 142, 0.15)", border: "rgba(141, 153, 142, 0.45)", text: "#a3b1a2", glow: "rgba(141, 153, 142, 0.2)" },
    { bg: "rgba(119, 136, 152, 0.15)", border: "rgba(119, 136, 152, 0.45)", text: "#a2b2c1", glow: "rgba(119, 136, 152, 0.2)" },
    { bg: "rgba(188, 168, 145, 0.15)", border: "rgba(188, 168, 145, 0.45)", text: "#d4c5b3", glow: "rgba(188, 168, 145, 0.2)" },
    { bg: "rgba(180, 142, 147, 0.15)", border: "rgba(180, 142, 147, 0.45)", text: "#cbb2b5", glow: "rgba(180, 142, 147, 0.2)" },
    { bg: "rgba(150, 120, 141, 0.15)", border: "rgba(150, 120, 141, 0.45)", text: "#bba3b2", glow: "rgba(150, 120, 141, 0.2)" },
    { bg: "rgba(135, 127, 145, 0.15)", border: "rgba(135, 127, 145, 0.45)", text: "#b5abbf", glow: "rgba(135, 127, 145, 0.2)" },
    { bg: "rgba(176, 143, 115, 0.15)", border: "rgba(176, 143, 115, 0.45)", text: "#cca992", glow: "rgba(176, 143, 115, 0.2)" },
    { bg: "rgba(140, 160, 145, 0.15)", border: "rgba(140, 160, 145, 0.45)", text: "#abbfbc", glow: "rgba(140, 160, 145, 0.2)" }
  ];
  return fallbackList[Math.abs(hash) % fallbackList.length];
};

const computeBubblePlan = (portfolio: any[], currentPrices: any) => {
  const itemsWithValues = portfolio.map((item, idx) => {
    const market = currentPrices[item.symbol?.toUpperCase()];
    const currentPrice = Number(market?.price || item.avgPrice) || 0;
    const isShort = item.direction === "short";
    const profit = isShort ? (item.avgPrice - currentPrice) * item.shares : (currentPrice - item.avgPrice) * item.shares;
    const value = item.avgPrice * item.shares + profit;
    const rawSector = getTradingViewHeatmapSector(item.symbol);
    const sectorShort = rawSector.split(" (")[0] || "其他";
    const sectorFull = rawSector;
    return {
      ...item,
      originalIdx: idx,
      currentPrice,
      value: value > 0 ? value : (item.avgPrice * item.shares),
      sectorShort,
      sectorFull
    };
  });

  const totalPortfolioValue = itemsWithValues.reduce((acc, item) => acc + item.value, 0) || 1;

  const items = itemsWithValues.map(item => ({
    ...item,
    weight: item.value / totalPortfolioValue
  }));

  // Sort items desc by weight
  items.sort((a, b) => b.weight - a.weight);

  // Group by sectorShort
  const groups: Record<string, typeof items> = {};
  items.forEach(item => {
    if (!groups[item.sectorShort]) {
      groups[item.sectorShort] = [];
    }
    groups[item.sectorShort].push(item);
  });

  const sectors = Object.keys(groups).map((sec, sIdx) => {
    const secItems = groups[sec];
    const bubbles = secItems.map((item) => {
      // Scale radius between 38px and 85px safely based on weight
      const r = 38 + Math.sqrt(item.weight) * 47;
      return {
        item,
        r,
        localX: 0,
        localY: 0
      };
    });

    const count = bubbles.length;
    let enclosingR = 50;

    if (count === 1) {
      bubbles[0].localX = 0;
      bubbles[0].localY = 10; // Shift down slightly from top center to leave room for top text headers
      enclosingR = bubbles[0].r + 25;
    } else if (count === 2) {
      const b0 = bubbles[0];
      const b1 = bubbles[1];
      const dist = b0.r + b1.r + 10;
      const angle = -Math.PI / 8; // gentle tilt
      b0.localX = - (dist / 2) * Math.cos(angle);
      b0.localY = - (dist / 2) * Math.sin(angle) + 12; // Shift down slightly
      b1.localX = (dist / 2) * Math.cos(angle);
      b1.localY = (dist / 2) * Math.sin(angle) + 12; // Shift down slightly
      enclosingR = (dist / 2) + Math.max(b0.r, b1.r) + 24;
    } else {
      // Initialize spread pattern
      bubbles.forEach((b, idx) => {
        const radiusMultiplier = count > 3 ? 1.3 : 1.1;
        const angle = (idx * 2 * Math.PI) / count - Math.PI / 2;
        const dist = (b.r + 20) * radiusMultiplier;
        b.localX = dist * Math.cos(angle);
        b.localY = dist * Math.sin(angle) + 12; // shift down slightly
      });

      // Relaxation for individual bubbles inside this sector
      for (let bIter = 0; bIter < 100; bIter++) {
        for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
            const bA = bubbles[i];
            const bB = bubbles[j];
            const dx = bB.localX - bA.localX;
            const dy = bB.localY - bA.localY;
            const dist = Math.hypot(dx, dy) || 1;
            const minDistance = bA.r + bB.r + 12; // 12px safe distance
            if (dist < minDistance) {
              const overlap = minDistance - dist;
              const pushX = (dx / dist) * overlap * 0.55;
              const pushY = (dy / dist) * overlap * 0.55;
              bA.localX -= pushX;
              bA.localY -= pushY;
              bB.localX += pushX;
              bB.localY += pushY;
            }
          }
        }
        // Force bubbles to stay slightly below the top of enclosing bounds to leave clean text margin
        bubbles.forEach((b) => {
          if (b.localY - b.r < -enclosingR + 24) {
            b.localY += 2;
          }
        });
      }

      // Re-evaluate actual enclosing boundary circle
      let maxDist = 50;
      bubbles.forEach((b) => {
        const d = Math.hypot(b.localX, b.localY - 10) + b.r;
        if (d > maxDist) maxDist = d;
      });
      enclosingR = maxDist + 22;
    }

    return {
      sectorShort: sec,
      sectorFull: secItems[0].sectorFull,
      bubbles,
      enclosingR,
      cx: 0,
      cy: 0
    };
  });

  const numSectors = sectors.length;

  // Let's set initial beautiful spread positions
  sectors.forEach((sec, idx) => {
    if (numSectors === 1) {
      sec.cx = 400;
      sec.cy = 210;
    } else if (numSectors === 2) {
      sec.cx = idx === 0 ? 250 : 550;
      sec.cy = 210;
    } else {
      const angle = (idx * 2 * Math.PI) / numSectors - Math.PI / 2;
      sec.cx = 400 + Math.cos(angle) * 180;
      sec.cy = 210 + Math.sin(angle) * 85;
    }
  });

  // Iterative relaxation of sector circles so they NEVER overlap on the 800x420 viewport!
  for (let iter = 0; iter < 120; iter++) {
    for (let i = 0; i < numSectors; i++) {
      for (let j = i + 1; j < numSectors; j++) {
        const sA = sectors[i];
        const sB = sectors[j];
        const dx = sB.cx - sA.cx;
        const dy = sB.cy - sA.cy;
        const dist = Math.hypot(dx, dy) || 1;
        // Keep a minimum clearance of enclosingR_A + enclosingR_B + 30 pixels gap
        const minDistance = sA.enclosingR + sB.enclosingR + 35;
        if (dist < minDistance) {
          const overlap = minDistance - dist;
          const pushX = (dx / dist) * overlap * 0.52;
          const pushY = (dy / dist) * overlap * 0.52;
          sA.cx -= pushX;
          sA.cy -= pushY;
          sB.cx += pushX;
          sB.cy += pushY;
        }
      }
    }

    // Keep sector clouds inside safe SVG margins so they are never clipped
    sectors.forEach((sec) => {
      const paddingX = sec.enclosingR + 25;
      const paddingY = sec.enclosingR + 25;
      if (sec.cx < paddingX) sec.cx = paddingX;
      if (sec.cx > 800 - paddingX) sec.cx = 800 - paddingX;
      if (sec.cy < paddingY) sec.cy = paddingY;
      if (sec.cy > 420 - paddingY) sec.cy = 420 - paddingY;
    });
  }

  return sectors;
};

const PortfolioModal = ({
  isOpen,
  onClose,
  watchlist = [],
  currentPrices = {},
  onDeleteWatch,
  onRefresh,
  isUpdating,
  onSyncToCloud,
  cloudStatus,
  onImport,
  onExport,
  isUpdatingWatchlist = false,
  watchlistUpdateProgress = "",
  onUpdateAllWatchlistRatings,
  onDeleteWatchHistory,
  onClearWatchHistory,
  trades = [],
  user = null,
  token = null,
  onLogin,
  onLogout,
  onLoadBackup,
}: any) => {
  const [selectedWatchSymbol, setSelectedWatchSymbol] = useState<string>("");
  const [watchlistSearchText, setWatchlistSearchText] = useState<string>("");
  const [watchlistSelectedSector, setWatchlistSelectedSector] = useState<string>("全部");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTab = "watchlist";
  // -----------------------------------------

  const sectorsInWatchlist = Array.from(
    new Set(watchlist.map((item: any) => getTradingViewHeatmapSector(item.symbol)))
  ).filter(Boolean).sort() as string[];

  const filteredWatchlist = watchlist.filter((item: any) => {
    const matchesSearch = !watchlistSearchText.trim() ||
      item.symbol.toLowerCase().includes(watchlistSearchText.toLowerCase()) ||
      (item.name && item.name.toLowerCase().includes(watchlistSearchText.toLowerCase()));
    const itemSector = getTradingViewHeatmapSector(item.symbol);
    const matchesSector = watchlistSelectedSector === "全部" || itemSector === watchlistSelectedSector;
    return matchesSearch && matchesSector;
  });

  // Drag and scroll mechanics for Watchlist tabs
  const watchlistScrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftState = useRef(0);
  const dragStartClientX = useRef(0);
  const hasDragged = useRef(false);

  // Drag and scroll mechanics for Sector / Category filtering bar
  const sectorScrollRef = useRef<HTMLDivElement>(null);
  const isSectorDown = useRef(false);
  const startSectorX = useRef(0);
  const scrollSectorLeftState = useRef(0);
  const dragSectorStartClientX = useRef(0);
  const hasSectorDragged = useRef(false);

  const handleDragDown = (e: React.MouseEvent) => {
    if (!watchlistScrollRef.current) return;
    isDown.current = true;
    dragStartClientX.current = e.clientX;
    startX.current = e.pageX - watchlistScrollRef.current.offsetLeft;
    scrollLeftState.current = watchlistScrollRef.current.scrollLeft;
    hasDragged.current = false;
  };

  const handleDragLeave = () => {
    isDown.current = false;
  };

  const handleDragUp = () => {
    isDown.current = false;
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDown.current || !watchlistScrollRef.current) return;
    const currentX = e.clientX;
    const diff = Math.abs(currentX - dragStartClientX.current);
    if (diff > 5) {
      hasDragged.current = true;
    }
    e.preventDefault();
    const x = e.pageX - watchlistScrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    watchlistScrollRef.current.scrollLeft = scrollLeftState.current - walk;
  };

  const handleSectorDragDown = (e: React.MouseEvent) => {
    if (!sectorScrollRef.current) return;
    isSectorDown.current = true;
    dragSectorStartClientX.current = e.clientX;
    startSectorX.current = e.pageX - sectorScrollRef.current.offsetLeft;
    scrollSectorLeftState.current = sectorScrollRef.current.scrollLeft;
    hasSectorDragged.current = false;
  };

  const handleSectorDragLeave = () => {
    isSectorDown.current = false;
  };

  const handleSectorDragUp = () => {
    isSectorDown.current = false;
  };

  const handleSectorDragMove = (e: React.MouseEvent) => {
    if (!isSectorDown.current || !sectorScrollRef.current) return;
    const currentX = e.clientX;
    const diff = Math.abs(currentX - dragSectorStartClientX.current);
    if (diff > 5) {
      hasSectorDragged.current = true;
    }
    e.preventDefault();
    const x = e.pageX - sectorScrollRef.current.offsetLeft;
    const walk = (x - startSectorX.current) * 1.5;
    sectorScrollRef.current.scrollLeft = scrollSectorLeftState.current - walk;
  };

  // Custom modals state for Import & Export choices
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isOperatingGD, setIsOperatingGD] = useState(false);
  const [gdStatusMsg, setGdStatusMsg] = useState("");

  // Custom non-blocking confirmation states to support sandboxed iframe previews
  const [confirmDeleteWatchSymbol, setConfirmDeleteWatchSymbol] = useState<string | null>(null);
  const [confirmClearHistorySymbol, setConfirmClearHistorySymbol] = useState<string | null>(null);
  const [confirmDeleteHistoryItem, setConfirmDeleteHistoryItem] = useState<{ symbol: string; timestamp: number } | null>(null);

  if (!isOpen) return null;

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

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col gap-4 bg-slate-800/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-amber-500" />
                <h2 className="text-2xl font-black text-white">觀察名單與個股指標盤</h2>
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
                  onClick={() => {
                    setGdStatusMsg("");
                    setShowImportModal(true);
                  }}
                  className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 flex items-center gap-2 px-4 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm font-bold hidden sm:inline">
                    匯入
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGdStatusMsg("");
                    setShowExportModal(true);
                  }}
                  className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 flex items-center gap-2 px-4 transition-colors"
                >
                  <Upload className="w-5 h-5" />
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
                  onClick={onClose}
                  className="p-3 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>

          </div>
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 font-sans">
            {/* --- Watchlist Tab Panel --- */}
            <div className="space-y-4">
                {watchlist.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 opacity-50 flex flex-col items-center">
                    <Eye className="w-16 h-16 mb-4" />
                    <p className="text-lg">觀察清單目前是空的</p>
                  </div>
                ) : (
                  <div>
                    {/* Top Action Bar for update ratings */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
                      <div className="flex flex-col">
                        <h4 className="font-black text-white text-base flex items-center gap-2">
                          <Eye className="w-5 h-5 text-amber-500" />
                          觀察個股指標盤
                        </h4>
                        {watchlistUpdateProgress && (
                          <p className="text-xs text-amber-400 font-bold animate-pulse mt-0.5">
                            {watchlistUpdateProgress}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isUpdatingWatchlist}
                        onClick={onUpdateAllWatchlistRatings}
                        className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(217,119,6,0.2)]"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingWatchlist ? "animate-spin" : ""}`} />
                        {isUpdatingWatchlist ? "正在更新所有評分..." : "更新所有評分"}
                      </button>
                    </div>

                    {/* 1. 搜尋 / 即時篩選 */}
                    <div className="relative mb-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                          <Search className="h-4 w-4 text-slate-500" />
                        </span>
                        <input
                          type="text"
                          value={watchlistSearchText}
                          onChange={(e) => setWatchlistSearchText(e.target.value)}
                          placeholder="輸入代號、公司名稱篩選秒尋..."
                          className="w-full bg-slate-950/80 border border-slate-800/80 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-10 pr-24 py-2.5 font-sans focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all"
                        />
                        {watchlistSearchText && (
                          <button
                            type="button"
                            onClick={() => setWatchlistSearchText("")}
                            className="absolute inset-y-0 right-14 flex items-center pr-2 text-slate-400 hover:text-white transition-colors"
                          >
                            <X className="w-4 h-4 cursor-pointer" />
                          </button>
                        )}
                        <span className="absolute inset-y-1.5 right-3 flex items-center text-[10px] text-slate-400 font-mono font-bold bg-slate-900 border border-slate-800/80 px-2 rounded-md">
                          {
                            (() => {
                              const fCount = watchlist.filter((item: any) => {
                                const matchesSearch = !watchlistSearchText.trim() ||
                                  item.symbol.toLowerCase().includes(watchlistSearchText.toLowerCase()) ||
                                  (item.name && item.name.toLowerCase().includes(watchlistSearchText.toLowerCase()));
                                const itemSector = getTradingViewHeatmapSector(item.symbol);
                                const matchesSector = watchlistSelectedSector === "全部" || itemSector === watchlistSelectedSector;
                                return matchesSearch && matchesSector;
                              }).length;
                              return `${fCount} / ${watchlist.length} 支`;
                            })()
                          }
                        </span>
                      </div>
                    </div>

                    {/* 2. 分組行業標籤頁 (TradingView Heatmap Sector Grouping) */}
                    <div 
                      ref={sectorScrollRef}
                      onMouseDown={handleSectorDragDown}
                      onMouseLeave={handleSectorDragLeave}
                      onMouseUp={handleSectorDragUp}
                      onMouseMove={handleSectorDragMove}
                      className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing pb-3 mb-4 border-b border-slate-800/25"
                    >
                      {(() => {
                        const sectorsInWatchlist = Array.from(
                          new Set(watchlist.map((item: any) => getTradingViewHeatmapSector(item.symbol)))
                        ).filter(Boolean).sort() as string[];

                        return ["全部", ...sectorsInWatchlist].map((sectorName) => {
                          const isSectorSelected = watchlistSelectedSector === sectorName;
                          // Count items in this sector matching the search filter
                          const sectorItemCount = watchlist.filter((item: any) => {
                            const matchesSearch = !watchlistSearchText.trim() ||
                              item.symbol.toLowerCase().includes(watchlistSearchText.toLowerCase()) ||
                              (item.name && item.name.toLowerCase().includes(watchlistSearchText.toLowerCase()));
                            const itemSector = getTradingViewHeatmapSector(item.symbol);
                            return matchesSearch && (sectorName === "全部" || itemSector === sectorName);
                          }).length;

                          return (
                            <button
                              key={sectorName}
                              type="button"
                              onClick={() => {
                                if (hasSectorDragged.current) return;
                                setWatchlistSelectedSector(sectorName);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
                                isSectorSelected
                                  ? "bg-amber-600/20 text-amber-400 border-amber-500/40 shadow-sm font-black"
                                  : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-800/60"
                              }`}
                            >
                              <span>{sectorName}</span>
                              <span className={`text-[8px] px-1 rounded-full font-mono ${
                                isSectorSelected ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"
                              }`}>
                                {sectorItemCount}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Stock tabs: "每增加一個觀察各股則新增一個tab" */}
                    <>
                          <div 
                            ref={watchlistScrollRef}
                            onMouseDown={handleDragDown}
                            onMouseLeave={handleDragLeave}
                            onMouseUp={handleDragUp}
                            onMouseMove={handleDragMove}
                            className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing pb-3 mb-4 border-b border-slate-800/40"
                          >
                            {filteredWatchlist.length === 0 ? (
                              <div className="w-full text-center py-4 text-slate-500 text-xs italic font-sans">
                                🔍 沒有符合目前搜尋或行業分組的個股
                              </div>
                            ) : (
                              filteredWatchlist.map((item: WatchlistItem) => {
                                const market = currentPrices[item.symbol?.toUpperCase()];
                                const price = Number(market?.price || item.price) || 0;
                                const change = Number(market?.changePercent || item.changePercent) || 0;
                                const isSelected = (selectedWatchSymbol || (filteredWatchlist[0]?.symbol || watchlist[0]?.symbol)) === item.symbol;

                                return (
                                  <div key={item.symbol} className="relative shrink-0 flex items-center select-none">
                                    <button
                                      key={item.symbol}
                                      type="button"
                                      onClick={() => {
                                        if (hasDragged.current) return;
                                        setSelectedWatchSymbol(item.symbol);
                                      }}
                                      className={`px-4 py-2.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-2 border ${
                                        isSelected
                                          ? "bg-amber-600/10 text-amber-500 border-amber-500/30 pr-8 shadow-[0_2px_10px_rgba(217,119,6,0.1)]"
                                          : "bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40"
                                      }`}
                                    >
                                      <span className="flex flex-col items-start">
                                        <span>{item.symbol}</span>
                                        <span className="text-[8px] opacity-75 font-normal scale-90 -ml-1 text-left line-clamp-1 max-w-[70px]">
                                          {getTradingViewHeatmapSector(item.symbol).split(" (")[0]}
                                        </span>
                                      </span>
                                      <span className="text-[10px] opacity-65 font-mono">
                                        (${price.toLocaleString()})
                                      </span>
                                      <span className={`text-[9px] font-mono font-bold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                        {change >= 0 ? "+" : ""}
                                        {change.toFixed(1)}%
                                      </span>
                                    </button>
                                    {isSelected && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteWatchSymbol(item.symbol);
                                        }}
                                        className="absolute right-1 p-0.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 bg-slate-950/80 border border-slate-800 shadow-md transition-all z-30 cursor-pointer pointer-events-auto flex items-center justify-center hover:scale-105 active:scale-95"
                                        title="取消追蹤"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Active watched stock details panel */}
                          {(() => {
                            const activeSymbol = filteredWatchlist.some((w: any) => w.symbol === selectedWatchSymbol)
                              ? selectedWatchSymbol
                              : (filteredWatchlist[0]?.symbol || "");
                            const currentWatchItem = filteredWatchlist.find((w: any) => w.symbol === activeSymbol);
                            
                            if (!currentWatchItem) return null;

                            return (
                              <div className="space-y-4 animate-in fade-in duration-200">
                                {/* Active Stock Info Line */}
                                <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-400 px-2 gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-white font-mono font-black text-sm">{currentWatchItem.symbol}</span>
                                    <span className="text-[11px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800/40">{currentWatchItem.name}</span>
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold font-sans">
                                      {getTradingViewHeatmapSector(currentWatchItem.symbol)}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-500">
                                    指標更新時間: {currentWatchItem.timestamp ? new Date(currentWatchItem.timestamp).toLocaleString("zh-TW") : "無資料"}
                                  </span>
                                </div>

                          {/* History Log Table with update/delete management */}
                          <div className="mt-5 font-sans">
                            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                              <h6 className="font-black text-slate-300 text-sm flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-amber-500" />
                                評分歷史與更新履歷變動
                              </h6>
                              {Array.isArray(currentWatchItem.history) && currentWatchItem.history.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmClearHistorySymbol(currentWatchItem.symbol);
                                  }}
                                  className="px-2.5 py-1 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all font-black flex items-center gap-1 border border-red-500/20 font-sans"
                                >
                                  <Trash2 className="w-3" />
                                  清除本股全部歷史
                                </button>
                              )}
                            </div>

                          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-500 font-extrabold pb-2">
                                  <th className="py-2 px-1">日期時間</th>
                                  <th className="py-2 px-1">價格</th>
                                  <th className="py-2 px-1">漲跌幅</th>
                                  <th className="py-2 px-1 text-center font-bold font-sans">AI 綜合</th>
                                  <th className="py-2 px-1 text-center font-bold font-mono">Buy/Sell</th>
                                  <th className="py-2 px-1 text-center font-bold font-sans">Qual/Val/Crash</th>
                                  <th className="py-2 px-1 text-center font-bold font-sans">Pos/Neg</th>
                                  <th className="py-2 px-1 text-center font-bold font-sans">管理</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium font-sans">
                                {(() => {
                                  const historyList = Array.isArray(currentWatchItem.history) && currentWatchItem.history.length > 0
                                    ? currentWatchItem.history
                                    : [{
                                        timestamp: currentWatchItem.timestamp,
                                        price: currentWatchItem.price,
                                        changePercent: currentWatchItem.changePercent,
                                        buyScore: currentWatchItem.buyScore,
                                        sellScore: currentWatchItem.sellScore,
                                        qualityScore: currentWatchItem.qualityScore,
                                        valueScore: currentWatchItem.valueScore,
                                        crashSimilarityScore: currentWatchItem.crashSimilarityScore,
                                        posScore: currentWatchItem.posScore,
                                        negScore: currentWatchItem.negScore,
                                        aiScore: currentWatchItem.aiScore,
                                        action: currentWatchItem.action,
                                      }];
                                  
                                  const sortedHistory = [...historyList].sort((a, b) => b.timestamp - a.timestamp);

                                  return sortedHistory.map((h, hIdx) => (
                                    <tr key={hIdx} className="hover:bg-slate-900/40 transition-colors font-sans">
                                      <td className="py-2 px-1 font-mono text-slate-400">
                                        {h.timestamp ? new Date(h.timestamp).toLocaleString("zh-TW") : "未知"}
                                      </td>
                                      <td className="py-2 px-1 font-mono text-amber-500 font-bold">
                                        ${Number(h.price || 0).toLocaleString()}
                                      </td>
                                      <td className={`py-2 px-1 font-mono font-bold ${Number(h.changePercent || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                        {Number(h.changePercent || 0) >= 0 ? "+" : ""}
                                        {Number(h.changePercent || 0).toFixed(2)}%
                                      </td>
                                      <td className="py-2 px-1 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${h.action === "Buy" ? "bg-emerald-500/10 text-emerald-400" : h.action === "Sell" ? "bg-rose-500/10 text-rose-455" : "bg-amber-500/10 text-amber-500"}`}>
                                          {h.aiScore ?? "N/A"}({h.action === "Buy" ? "買" : h.action === "Sell" ? "賣" : "觀"})
                                        </span>
                                      </td>
                                      <td className="py-2 px-1 text-center font-mono">
                                        <span className="text-emerald-400">{h.buyScore ?? "N/A"}</span>
                                        <span className="text-slate-600 mx-1">/</span>
                                        <span className="text-rose-400">{h.sellScore ?? "N/A"}</span>
                                      </td>
                                      <td className="py-2 px-1 text-center font-mono text-slate-400">
                                        <span>{h.qualityScore ?? "-"}</span>
                                        <span className="text-slate-700 mx-1">|</span>
                                        <span>{h.valueScore ?? "-"}</span>
                                        <span className="text-slate-755 mx-1">|</span>
                                        <span>{h.crashSimilarityScore ?? "-"}</span>
                                      </td>
                                      <td className="py-2 px-1 text-center font-mono font-sans text-slate-300">
                                        <span className="text-emerald-400 font-sans font-bold">+{h.posScore ?? 0}</span>
                                        <span className="text-slate-600 mx-1">/</span>
                                        <span className="text-rose-400 font-sans font-bold">+{h.negScore ?? 0}</span>
                                      </td>
                                      <td className="py-2 px-1 text-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmDeleteHistoryItem({
                                              symbol: currentWatchItem.symbol,
                                              timestamp: h.timestamp
                                            });
                                          }}
                                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-rose-500/10 rounded-md transition-colors"
                                          title="刪除"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 inline" />
                                        </button>
                                      </td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                            );
                          })()}
                        </>
                </div>
                )}
              </div>

            {/* --- Portfolio Tab Panel --- */}
            {false && (
              <div className="space-y-4">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 overflow-hidden relative">
                  Empty
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modern Confirmation Modals for Watchlist and History Log */}
      {confirmDeleteWatchSymbol && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" onClick={() => setConfirmDeleteWatchSymbol(null)} />
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative z-30 transform scale-100 transition-all duration-150">
            <h4 className="text-base font-black text-white mb-2 flex items-center gap-1.5">
              <Trash2 className="w-5 h-5 text-rose-500 animate-pulse" />
              確認移除觀察個股
            </h4>
            <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed text-left">
              確定要將 「<span className="text-amber-500 font-mono font-bold">{confirmDeleteWatchSymbol}</span>」 從您的觀察個股名單中移除嗎？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteWatchSymbol(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteWatch(confirmDeleteWatchSymbol);
                  const rem = watchlist.filter((w: any) => w.symbol !== confirmDeleteWatchSymbol);
                  if (rem.length > 0) {
                    setSelectedWatchSymbol(rem[0].symbol);
                  } else {
                    setSelectedWatchSymbol("");
                  }
                  setConfirmDeleteWatchSymbol(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/20"
              >
                確認移除
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClearHistorySymbol && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" onClick={() => setConfirmClearHistorySymbol(null)} />
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative z-30 transform scale-100 transition-all duration-150">
            <h4 className="text-base font-black text-white mb-2 flex items-center gap-1.5">
              <Trash2 className="w-5 h-5 text-rose-500 animate-pulse" />
              確認清除股歷
            </h4>
            <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed text-left">
              確定要清除 「<span className="text-amber-500 font-mono font-bold">{confirmClearHistorySymbol}</span>」 的所有評分歷史與更新履歷變動紀錄嗎？此動作將無法復原。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmClearHistorySymbol(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearWatchHistory(confirmClearHistorySymbol);
                  setConfirmClearHistorySymbol(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/20"
              >
                確認清除
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteHistoryItem && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" onClick={() => setConfirmDeleteHistoryItem(null)} />
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative z-30 transform scale-100 transition-all duration-150">
            <h4 className="text-base font-black text-white mb-2 flex items-center gap-1.5">
              <Trash2 className="w-5 h-5 text-rose-500 animate-pulse" />
              確認刪除此筆記錄
            </h4>
            <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed text-left">
              確定要刪除「<span className="text-amber-500 font-mono font-bold">{confirmDeleteHistoryItem.symbol}</span>」在 <span className="text-blue-400 font-mono font-semibold">{new Date(confirmDeleteHistoryItem.timestamp).toLocaleString("zh-TW")}</span> 的評分履歷變動紀錄嗎？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteHistoryItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteWatchHistory(confirmDeleteHistoryItem.symbol, confirmDeleteHistoryItem.timestamp);
                  setConfirmDeleteHistoryItem(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/20"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}



      {showExportModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => {
              if (!isOperatingGD) {
                setShowExportModal(false);
                setGdStatusMsg("");
              }
            }}
          />
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-amber-500" />
                匯出觀察名單與個股指標
              </h3>
              <button
                disabled={isOperatingGD}
                onClick={() => {
                  setShowExportModal(false);
                  setGdStatusMsg("");
                }}
                className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                disabled={isOperatingGD}
                onClick={() => {
                  const now = new Date();
                  const formatDigits = (n: number) => n.toString().padStart(2, '0');
                  const year = now.getFullYear();
                  const month = formatDigits(now.getMonth() + 1);
                  const day = formatDigits(now.getDate());
                  const hours = formatDigits(now.getHours());
                  const minutes = formatDigits(now.getMinutes());
                  const seconds = formatDigits(now.getSeconds());
                  const dateString = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
                  const filename = `${dateString}.json`;

                  const backupData = { trades, watchlist };
                  const b = new Blob([JSON.stringify(backupData, null, 2)], {
                    type: "application/json",
                  });
                  const u = URL.createObjectURL(b);
                  const l = document.createElement("a");
                  l.href = u;
                  l.download = filename;
                  l.click();
                  
                  setGdStatusMsg(`已成功備份至本機！檔名: ${filename}`);
                }}
                className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 p-4 rounded-xl text-left transition-all hover:border-amber-500/30"
              >
                <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm">備份至本機 (JSON)</h4>
                  <p className="text-xs text-slate-400 mt-1">直接下載備份檔案至本機設備，以當天日期時間命名的 JSON 檔案。</p>
                </div>
              </button>

              <div className="border-t border-slate-800 my-4" />

              {!user || !token ? (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col items-center text-center">
                  <Cloud className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-xs text-slate-400 mb-3">請先完成登入即可一鍵備份至 Google Drive 的專屬資料夾內。</p>
                  <button
                    type="button"
                    onClick={() => {
                      onLogin();
                    }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-755 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition-all shadow-md"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#ea4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.94 1 12 1 7.24 1 3.13 3.76 1.13 7.78l3.78 2.93c.92-2.76 3.51-4.67 7.09-4.67z" />
                      <path fill="#4285f4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.33H12v4.51h6.44c-.29 1.5-.1.81-1.14 2l3.7 2.87c2.16-1.99 3.49-4.92 3.49-7.05z" />
                      <path fill="#fbbc05" d="M4.91 14.85l-3.78 2.93c2 4.02 6.11 6.78 10.87 6.78 2.94 0 5.61-.96 7.49-2.61l-3.7-2.87c-.98.66-2.23 1.06-3.79 1.06-3.58 0-6.17-1.91-7.09-4.67L4.91 14.85z" />
                      <path fill="#34a853" d="M12 23.56c4.76 0 8.87-2.76 10.87-6.78l-3.7-2.87c-.92 2.76-3.51 4.67-7.09 4.67-1.64 0-3.12-.56-4.28-1.67l-3.2 3.2c1.96 1.93 4.54 3.45 7.49 3.45z" />
                    </svg>
                    Google 帳號登入
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isOperatingGD}
                  onClick={async () => {
                    setIsOperatingGD(true);
                    setGdStatusMsg("");
                    try {
                      const now = new Date();
                      const formatDigits = (n: number) => n.toString().padStart(2, '0');
                      const year = now.getFullYear();
                      const month = formatDigits(now.getMonth() + 1);
                      const day = formatDigits(now.getDate());
                      const hours = formatDigits(now.getHours());
                      const minutes = formatDigits(now.getMinutes());
                      const seconds = formatDigits(now.getSeconds());
                      const dateString = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
                      const filename = `Socrates_Portfolio_Backup_${dateString}.json`;

                      const backupData = {
                        trades,
                        watchlist,
                        backedUpAt: now.toISOString()
                      };

                      await gdrive.uploadFileToGoogleDrive(
                        token,
                        filename,
                        "application/json",
                        JSON.stringify(backupData, null, 2),
                        "Socrates_ECM_Backup"
                      );
                      setGdStatusMsg(`備份成功！已上傳至 Google Drive 的 Socrates_ECM_Backup 資料夾中。檔名: ${filename}`);
                    } catch (err: any) {
                      console.error(err);
                      if (err.message === "401_UNAUTHORIZED" || err.message?.includes("401")) {
                        setGdStatusMsg("您的 Google 帳號授權已過期，請重新登入。");
                        onLogout?.();
                      } else {
                        setGdStatusMsg(`雲端備份失敗: ${err.message || err}`);
                      }
                    } finally {
                      setIsOperatingGD(false);
                    }
                  }}
                  className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 p-4 rounded-xl text-left transition-all hover:border-emerald-500/30"
                >
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                    {isOperatingGD ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Cloud className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-sm">備份至 Google Drive</h4>
                    <p className="text-xs text-slate-400 mt-1">一鍵將資料備份並上傳至雲端 Socrates_ECM_Backup 資料夾。</p>
                  </div>
                </button>
              )}

              {gdStatusMsg && (
                <div className={`mt-4 p-3.5 rounded-xl border text-xs font-bold leading-relaxed text-center ${gdStatusMsg.includes("失敗") ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
                  {gdStatusMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => {
              if (!isOperatingGD) {
                setShowImportModal(false);
                setGdStatusMsg("");
              }
            }}
          />
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                匯入備份資料
              </h3>
              <button
                disabled={isOperatingGD}
                onClick={() => {
                  setShowImportModal(false);
                  setGdStatusMsg("");
                }}
                className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                disabled={isOperatingGD}
                onClick={() => {
                  setShowImportModal(false);
                  handleImportClick();
                }}
                className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 p-4 rounded-xl text-left transition-all hover:border-amber-500/30"
              >
                <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm">從本機匯入 (JSON)</h4>
                  <p className="text-xs text-slate-400 mt-1">選取本機備份的 JSON 檔案，匯入觀察個股與交易歷史。</p>
                </div>
              </button>

              <div className="border-t border-slate-800 my-4" />

              {!user || !token ? (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col items-center text-center">
                  <Cloud className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-xs text-slate-400 mb-3">請先完成登入即可從 Google Drive 專屬資料夾載入最新備份。</p>
                  <button
                    type="button"
                    onClick={() => {
                      onLogin();
                    }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-755 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition-all shadow-md"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#ea4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.94 1 12 1 7.24 1 3.13 3.76 1.13 7.78l3.78 2.93c.92-2.76 3.51-4.67 7.09-4.67z" />
                      <path fill="#4285f4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.33H12v4.51h6.44c-.29 1.5-.1.81-1.14 2l3.7 2.87c2.16-1.99 3.49-4.92 3.49-7.05z" />
                      <path fill="#fbbc05" d="M4.91 14.85l-3.78 2.93c2 4.02 6.11 6.78 10.87 6.78 2.94 0 5.61-.96 7.49-2.61l-3.7-2.87c-.98.66-2.23 1.06-3.79 1.06-3.58 0-6.17-1.91-7.09-4.67L4.91 14.85z" />
                      <path fill="#34a853" d="M12 23.56c4.76 0 8.87-2.76 10.87-6.78l-3.7-2.87c-.92 2.76-3.51 4.67-7.09 4.67-1.64 0-3.12-.56-4.28-1.67l-3.2 3.2c1.96 1.93 4.54 3.45 7.49 3.45z" />
                    </svg>
                    Google 帳號登入
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isOperatingGD}
                  onClick={async () => {
                    setIsOperatingGD(true);
                    setGdStatusMsg("");
                    try {
                      // 1. List backup files from drive
                      const files = await gdrive.listBackupFilesFromGoogleDrive(token, "Socrates_ECM_Backup");
                      if (files && files.length > 0) {
                        const latestFile = files[0];
                        // 2. Download the file content
                        const restored = await gdrive.downloadFileFromGoogleDrive(token, latestFile.id);
                        if (restored && (restored.trades || restored.watchlist)) {
                          // 3. Load using existing handler
                          onLoadBackup(restored.trades || [], restored.watchlist || []);
                          setGdStatusMsg(`成功匯入最新雲端備份！備份創立時間：${new Date(latestFile.createdTime).toLocaleString()}`);
                          setTimeout(() => {
                            setShowImportModal(false);
                            setGdStatusMsg("");
                          }, 2500);
                        } else {
                          setGdStatusMsg("備份檔案中的數據格式不正確。");
                        }
                      } else {
                        setGdStatusMsg("找不到任何 Socrates 相關的雲端備份檔案 (.json)。");
                      }
                    } catch (err: any) {
                      console.error(err);
                      if (err.message === "401_UNAUTHORIZED" || err.message?.includes("401")) {
                        setGdStatusMsg("您的 Google 帳號授權已過期，請重新登入。");
                        onLogout?.();
                      } else {
                        setGdStatusMsg(`雲端匯入失敗: ${err.message || err}`);
                      }
                    } finally {
                      setIsOperatingGD(false);
                    }
                  }}
                  className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-755 border border-slate-700/80 p-4 rounded-xl text-left transition-all hover:border-emerald-500/30"
                >
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                    {isOperatingGD ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Cloud className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-sm">由 Google Drive 最新備份復原</h4>
                    <p className="text-xs text-slate-400 mt-1">從 Socrates_ECM_Backup 資料夾載入最新的一份備份檔案並還原。</p>
                  </div>
                </button>
              )}

              {gdStatusMsg && (
                <div className={`mt-4 p-3.5 rounded-xl border text-xs font-bold leading-relaxed text-center ${gdStatusMsg.includes("失敗") || gdStatusMsg.includes("找不到") ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
                  {gdStatusMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
  onFetchFinancialHealth,
  financialHealthLoading,
  onFetchRiskAnalysis,
  riskAnalysisLoading,
  gdUser,
  gdToken,
  onOpenWorkspaceHub,
}: {
  report: StockReport | null;
  onGenerate: () => void;
  loading: boolean;
  symbol: string;
  stockData: StockData;
  onFetchNewsInsight: () => void;
  newsLoading: boolean;
  onFetchFinancialHealth: () => void;
  financialHealthLoading: boolean;
  onFetchRiskAnalysis: () => void;
  riskAnalysisLoading: boolean;
  gdUser: any;
  gdToken: string | null;
  onOpenWorkspaceHub: () => void;
}) => {
  const [strategyTab, setStrategyTab] = useState<
    "pyramid" | "inverted" | "hybrid"
  >("pyramid");
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isFinancialHealthOpen, setIsFinancialHealthOpen] = useState(false);
  const [isRiskAnalysisOpen, setIsRiskAnalysisOpen] = useState(false);

  // --- Google Workspace Features States ---
  const [isExportingDoc, setIsExportingDoc] = useState(false);
  const [docSuccessUrl, setDocSuccessUrl] = useState<string | null>(null);

  const [chatSpaces, setChatSpaces] = useState<any[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState("");
  const [customComment, setCustomComment] = useState("");
  const [isPostingChat, setIsPostingChat] = useState(false);
  const [chatSuccessMsg, setChatSuccessMsg] = useState("");
  const [chatErrorMsg, setChatErrorMsg] = useState("");

  const handleExportDoc = async () => {
    if (!gdToken) {
      onOpenWorkspaceHub();
      return;
    }
    setIsExportingDoc(true);
    setDocSuccessUrl(null);
    try {
      const overviewText = report?.tradingStrategy.overview || "無 Socrates 交易訊號詳情。";
      const newsInsightText = report?.newsInsight?.comprehensiveAnalysis || report?.newsInsight?.summary || "尚未創立或雙擊載入新聞摘要與市場洞察分析。";
      const synthesisText = `【Socrates 整合分析總覽】\n${overviewText}\n\n【最新市場洞察與精選智慧資訊解讀】\n${newsInsightText}`;
      const result = await workspace.exportReportToGoogleDoc(gdToken, stockData, synthesisText);
      setDocSuccessUrl(result.documentUrl);
    } catch (err: any) {
      console.error(err);
      alert("儲存至 Google Docs 失敗，請確認是否授權或稍後重試。");
    } finally {
      setIsExportingDoc(false);
    }
  };

  const loadChatSpaces = async () => {
    if (!gdToken) return;
    setLoadingSpaces(true);
    try {
      const spaces = await workspace.listGoogleChatSpaces(gdToken);
      setChatSpaces(spaces);
      if (spaces.length > 0) {
        setSelectedSpace(spaces[0].name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSpaces(false);
    }
  };

  useEffect(() => {
    if (gdToken) {
      loadChatSpaces();
    }
  }, [gdToken]);

  const handlePostChat = async () => {
    if (!gdToken) return;
    if (!selectedSpace) {
      setChatErrorMsg("請選擇要分享的 Google Chat 聊天室空間");
      return;
    }
    setIsPostingChat(true);
    setChatSuccessMsg("");
    setChatErrorMsg("");

    const tpDate = stockData.nextTurningPoint || "未知";
    const anchor = stockData.anchorType === "High" ? "多頭高點轉折 (Peak)" : "空頭低點轉折 (Trough)";
    const technicalScore = stockData.screenerRating?.score ?? 5.0;

    const message = `📊 Socrates ECM 循環與指標轉折警報 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 股票標的: ${stockData.symbol} (${stockData.name})
• 目前價格: ${stockData.price} ${stockData.currency || "USD"} (${stockData.changePercent != null ? (stockData.changePercent > 0 ? "+" : "") + stockData.changePercent + "%" : "0%"})
• 技術評鑑: ${technicalScore} / 10 分
• 預計下一轉折: ${tpDate} (型態: ${anchor})
• 專家備忘錄：${customComment || "請注意此轉折點的週期變化配置，可適時調整槓桿。"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
報告來源：Socrates Cycle Advisor
`;

    try {
      await workspace.postMessageToGoogleChat(gdToken, selectedSpace, message);
      setChatSuccessMsg("🎉 成功發送循環警報快訊至 Google Chat！");
      setCustomComment("");
      setTimeout(() => setChatSuccessMsg(""), 5000);
    } catch (err: any) {
      console.error(err);
      setChatErrorMsg("發送失敗，請確認該討論區已授權。");
    } finally {
      setIsPostingChat(false);
    }
  };

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

      {/* Google Workspace Suite Integration Dashboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-amber-500" />
              Socrates 團隊協作與 Google 整合套件
            </h3>
            <p className="text-xs text-slate-400">
              將 Martin Armstrong 循環與 AI 合成精華，一鍵多格式導出，推播到團隊討論中
            </p>
          </div>
          {!gdToken ? (
            <button
              onClick={onOpenWorkspaceHub}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              🔑 連結 Google 帳戶啟用 Docs & Chat 整合
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-3 py-1.5 rounded-lg text-emerald-300">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping mr-1" />
              雲端整合套件已授權啟用
            </div>
          )}
        </div>

        {gdToken && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Docs Column */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h4 className="text-white text-sm font-black flex items-center gap-2">
                  <span className="p-1 px-1.5 bg-blue-500/10 text-blue-400 rounded font-bold text-[10px]">DOCS</span>
                  產生 Google Docs 專屬電子文檔
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  本系統會將 Socrates 轉折點、近 5 日智能交易警報信號及 AI 市場分析，自動撰寫成一篇高可讀、可排版的 Google Docs 公報，供您儲存於雲端、列印或進行格式微調。
                </p>
              </div>

              <div className="space-y-3">
                {docSuccessUrl && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-xs flex justify-between items-center animate-in fade-in">
                    <span className="text-blue-300 font-bold">文件儲存成功！</span>
                    <a
                      href={docSuccessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white hover:text-blue-400 underline font-bold flex items-center gap-1"
                    >
                      開啟 Google 文件 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <button
                  onClick={handleExportDoc}
                  disabled={isExportingDoc}
                  className="w-full flex items-center justify-center gap-2 bg-slate-850 hover:bg-blue-600/20 hover:text-blue-400 text-slate-200 border border-slate-850 hover:border-blue-500/30 transition-all font-bold text-xs py-2.5 px-4 rounded-xl"
                >
                  {isExportingDoc ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      正在撰寫與生成文件...
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      匯出為 Google Docs 文檔
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Google Chat Column */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <h4 className="text-white text-sm font-black flex items-center gap-2">
                  <span className="p-1 px-1.5 bg-amber-500/10 text-amber-500 rounded font-bold text-[10px]">CHAT</span>
                  轉發循環警報至 Google Chat 空間
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  在群組討論、同業社群中，直接將本股票循環警報、重要的高低位轉折點和目前評級一鍵推播分享。
                </p>
              </div>

              <div className="space-y-3">
                {/* Space Selector */}
                {loadingSpaces ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    正在載入您的聊天室討論群組...
                  </div>
                ) : chatSpaces.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-900 border border-slate-850 p-2.5 rounded-xl font-bold">
                    未檢測到公開的 Google Chat 聊天室空間（請確認帳戶加入空間）。
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-slate-500 text-[10px] font-black uppercase">
                      發送目標空間 
                    </label>
                    <select
                      value={selectedSpace}
                      onChange={(e) => setSelectedSpace(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 text-xs text-white rounded-xl px-2.5 py-2 font-bold outline-none"
                    >
                      {chatSpaces.map((sp: any) => (
                        <option key={sp.name} value={sp.name}>
                          {sp.displayName || sp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Optional Custom Alert Message comment */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-slate-500 text-[10px] font-black uppercase">
                    附加專家備忘錄 (可選)
                  </label>
                  <input
                    type="text"
                    value={customComment}
                    onChange={(e) => setCustomComment(e.target.value)}
                    placeholder="例如：六月即將轉向，建議配置避險權益..."
                    className="w-full bg-slate-900 border border-slate-850 text-xs text-slate-200 rounded-xl px-2.5 py-2 outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {chatSuccessMsg && (
                  <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20 text-xs font-bold animate-in fade-in">
                    {chatSuccessMsg}
                  </div>
                )}
                {chatErrorMsg && (
                  <div className="bg-rose-500/10 text-rose-400 p-2 rounded-lg border border-rose-500/20 text-xs font-bold animate-in fade-in">
                    {chatErrorMsg}
                  </div>
                )}

                <button
                  onClick={handlePostChat}
                  disabled={isPostingChat || chatSpaces.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all disabled:opacity-50"
                >
                  {isPostingChat ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      發佈中...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      發佈轉折警報至 Chat 群組
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. 財務健康指數 */}
      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl mb-4 flex flex-col transition-colors hover:border-slate-600">
        <button
          onClick={() => {
            const nextState = !isFinancialHealthOpen;
            setIsFinancialHealthOpen(nextState);
            if (nextState && !report?.financialHealth && !financialHealthLoading) {
              onFetchFinancialHealth();
            }
          }}
          className="p-6 bg-slate-900/80 border-b border-slate-700 flex items-center justify-between w-full text-left cursor-pointer hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              財務健康指數
              {report?.financialHealth && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  report.financialHealth.status === "強勁"
                    ? "bg-emerald-500/20 text-emerald-400 animate-pulse"
                    : "bg-rose-500/20 text-rose-400 animate-pulse"
                }`}>
                  評比: {report.financialHealth.status}
                </span>
              )}
              {!report?.financialHealth && !financialHealthLoading && (
                <span className="text-xs bg-indigo-500/10 text-indigo-300 font-bold px-2.5 py-1 rounded-md ml-2 border border-indigo-505/30 text-[10px]">
                  打開才生成內容
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {financialHealthLoading && (
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mr-2" />
            )}
            {isFinancialHealthOpen ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {isFinancialHealthOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-700"
            >
              {report?.financialHealth ? (
                <div className="p-6 flex flex-col gap-6">
                  {/* Status Banner */}
                  <div className={`p-5 rounded-2xl border ${
                    report.financialHealth.status === "強勁"
                      ? "bg-emerald-950/20 border-emerald-500/20"
                      : "bg-rose-950/20 border-rose-500/20"
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${
                        report.financialHealth.status === "強勁" ? "bg-emerald-400 animate-pulse" : "bg-rose-400 animate-pulse"
                      }`} />
                      <h4 className="text-slate-200 text-xs font-black uppercase tracking-widest">
                        總體財務健康度診斷：
                        <span className={report.financialHealth.status === "強勁" ? "text-emerald-400 text-sm font-black" : "text-rose-400 text-sm font-black"}>
                          {report.financialHealth.status}
                        </span>
                      </h4>
                    </div>
                    <p className="text-slate-200 leading-relaxed text-sm font-medium">
                      {report.financialHealth.overview}
                    </p>
                  </div>

                  {/* 6 metrics analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                      <h5 className="text-amber-400 text-xs font-black uppercase mb-2 flex items-center gap-1.5 font-bold">
                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> 收入增長 (Revenue Growth)
                      </h5>
                      <p className="text-slate-300 text-xs font-medium leading-relaxed">
                        {report.financialHealth.metrics.revenueGrowth}
                      </p>
                    </div>

                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                      <h5 className="text-indigo-400 text-xs font-black uppercase mb-2 flex items-center gap-1.5 font-bold">
                        <Activity className="w-3.5 h-3.5 mr-1" /> 淨利潤趨勢 (Net Profit Trend)
                      </h5>
                      <p className="text-slate-300 text-xs font-medium leading-relaxed">
                        {report.financialHealth.metrics.netProfitTrend}
                      </p>
                    </div>

                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                      <h5 className="text-emerald-400 text-xs font-black uppercase mb-2 flex items-center gap-1.5 font-bold">
                        <Wallet className="w-3.5 h-3.5 mr-1" /> 自由現金流 (Free Cash Flow)
                      </h5>
                      <p className="text-slate-300 text-xs font-medium leading-relaxed">
                        {report.financialHealth.metrics.freeCashFlow}
                      </p>
                    </div>

                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                      <h5 className="text-teal-400 text-xs font-black uppercase mb-2 flex items-center gap-1.5 font-bold">
                        <Scale className="w-3.5 h-3.5 mr-1" /> 利潤率 (Profit Margins)
                      </h5>
                      <p className="text-slate-300 text-xs font-medium leading-relaxed">
                        {report.financialHealth.metrics.profitMargins}
                      </p>
                    </div>

                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                      <h5 className="text-rose-400 text-xs font-black uppercase mb-2 flex items-center gap-1.5 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 mr-1" /> 債務水平 (Debt Levels)
                      </h5>
                      <p className="text-slate-300 text-xs font-medium leading-relaxed">
                        {report.financialHealth.metrics.debtLevels}
                      </p>
                    </div>

                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                      <h5 className="text-cyan-400 text-xs font-black uppercase mb-2 flex items-center gap-1.5 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 股本回報率 (Return on Equity)
                      </h5>
                      <p className="text-slate-300 text-xs font-medium leading-relaxed">
                        {report.financialHealth.metrics.returnOnEquity}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center text-center text-slate-500">
                  <div className="bg-slate-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-slate-800 animate-pulse">
                    <Bot className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="font-bold text-slate-400 text-sm">
                    {financialHealthLoading ? "正在聯網調取、比照過去 5 年財務數據與最新季度季報..." : "此區塊預設為閉合"}
                    <span className="text-slate-500 text-xs font-medium mt-1 block">
                      {financialHealthLoading ? "深度財務拆解預期需要 5-10 秒，請稍候..." : "點擊上方按鈕打開即自動聯網生成內容"}
                    </span>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. 風險分析指數 */}
      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl mb-4 flex flex-col transition-colors hover:border-slate-600">
        <button
          onClick={() => {
            const nextState = !isRiskAnalysisOpen;
            setIsRiskAnalysisOpen(nextState);
            if (nextState && !report?.riskAnalysis && !riskAnalysisLoading) {
              onFetchRiskAnalysis();
            }
          }}
          className="p-6 bg-slate-900/80 border-b border-slate-700 flex items-center justify-between w-full text-left cursor-pointer hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              風險分析指數
              {report?.riskAnalysis && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  report.riskAnalysis.riskLevel === "高"
                    ? "bg-rose-500/20 text-rose-400 animate-pulse"
                    : report.riskAnalysis.riskLevel === "觀察"
                      ? "bg-amber-500/20 text-amber-400 animate-pulse"
                      : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  風險評估: {report.riskAnalysis.riskLevel}
                </span>
              )}
              {!report?.riskAnalysis && !riskAnalysisLoading && (
                <span className="text-xs bg-indigo-500/10 text-indigo-300 font-bold px-2.5 py-1 rounded-md ml-2 border border-indigo-505/30 text-[10px]">
                  打開才生成內容
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {riskAnalysisLoading && (
              <Loader2 className="w-5 h-5 text-rose-400 animate-spin mr-2" />
            )}
            {isRiskAnalysisOpen ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {isRiskAnalysisOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-700"
            >
              {report?.riskAnalysis ? (
                <div className="p-6 flex flex-col gap-6">
                  {/* Risks Priority list */}
                  <div className="bg-slate-900/55 p-5 rounded-2xl border border-slate-700/50">
                    <h4 className="text-slate-400 text-xs font-black uppercase mb-4 flex items-center gap-1.5 font-bold">
                      <List className="w-4 h-4 text-rose-400" /> 核心投資威脅排序 (危險度由高到低)
                    </h4>
                    <div className="space-y-3">
                      {report.riskAnalysis.risks.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row md:items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
                          <div className="flex items-center justify-between shrink-0 md:w-44">
                            <span className="text-xs font-black text-slate-200 flex items-center gap-1.5 font-bold">
                              <span className="text-rose-500 font-mono font-bold">[{index + 1}]</span>
                              {item.category}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              item.severity === "高"
                                ? "bg-rose-500/25 text-rose-400 border border-rose-500/30"
                                : item.severity === "中"
                                  ? "bg-amber-500/25 text-amber-400 border border-amber-500/30"
                                  : "bg-emerald-500/25 text-emerald-400 border border-emerald-500/30"
                            }`}>
                              {item.severity}風險
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs font-medium leading-relaxed flex-1 text-left">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dual Analyst Debate */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
                    {/* Bullish Case */}
                    <div className="bg-emerald-950/10 p-5 rounded-2xl border border-emerald-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
                      <h4 className="text-emerald-400 text-xs font-black uppercase mb-3 flex items-center gap-2 font-bold">
                        <TrendingUp className="w-4 h-4" /> 看漲觀點「{report.riskAnalysis.debate.bullishAnalystName}」
                      </h4>
                      <ul className="space-y-2.5 relative z-10">
                        {report.riskAnalysis.debate.bullishArguments.map((arg, i) => (
                          <li key={i} className="flex gap-2 text-slate-300 text-xs font-medium leading-relaxed text-left">
                            <span className="text-emerald-400 shrink-0 font-mono">✦</span>
                            <span className="text-slate-200 font-medium">{arg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bearish Case */}
                    <div className="bg-rose-950/10 p-5 rounded-2xl border border-rose-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full" />
                      <h4 className="text-rose-400 text-xs font-black uppercase mb-3 flex items-center gap-2 font-bold">
                        <TrendingDown className="w-4 h-4" /> 看跌觀點「{report.riskAnalysis.debate.bearishAnalystName}」
                      </h4>
                      <ul className="space-y-2.5 relative z-10">
                        {report.riskAnalysis.debate.bearishArguments.map((arg, i) => (
                          <li key={i} className="flex gap-2 text-slate-300 text-xs font-medium leading-relaxed text-left">
                            <span className="text-rose-400 shrink-0 font-mono">✦</span>
                            <span className="text-slate-200 font-medium">{arg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Balance Conclusion */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-slate-400 text-xs font-black uppercase mb-2 font-bold">多空綜合辯論結論</h4>
                    <p className="text-slate-200 leading-relaxed text-sm font-semibold text-left">
                      {report.riskAnalysis.debate.conclusion}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center text-center text-slate-500">
                  <div className="bg-slate-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-slate-800 animate-pulse">
                    <Bot className="w-8 h-8 text-rose-500" />
                  </div>
                  <p className="font-bold text-slate-400 text-sm flex flex-col items-center justify-center">
                    {riskAnalysisLoading ? "正在收集全球與行業挑戰，並生成兩大分析師多空辯點..." : "此區塊預設為閉合"}
                    <span className="text-slate-500 text-xs font-medium mt-1 block">
                      {riskAnalysisLoading ? "風險智能評析與多空對立論調擬定中，請稍候..." : "點擊上方按鈕打開即自動聯網生成內容"}
                    </span>
                  </p>
                </div>
              )}
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
    "ai" | "buy" | "sell" | "qual" | "value" | "crash" | "health" | "risk" | "pos" | "neg"
  >("ai");

  if (!isOpen) return null;

  const tabs = [
    { id: "ai", label: "AI綜合評分" },
    { id: "buy", label: "Buy Score (買進)" },
    { id: "sell", label: "Sell Score (賣出)" },
    { id: "qual", label: "品質評分 (Quality)" },
    { id: "value", label: "價值評分 (Value)" },
    { id: "crash", label: "歷史崩盤相似度 (Crash)" },
    { id: "pos", label: "Positive Score" },
    { id: "neg", label: "Negative Score" },
    { id: "health", label: "財務健康指數" },
    { id: "risk", label: "風險分析指數" },
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
      case "health":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> 給 AI 的 Prompt 邏輯
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                要求 AI 搜尋該個股過去 5 年的財務數據，深度解構公司的核心財務維度。
              </li>
              <li>
                必須完整考察 6 大核心指標：
                <strong className="text-amber-400">收入增長</strong>、
                <strong className="text-indigo-400">淨利潤趨勢</strong>、
                <strong className="text-emerald-400">自由現金流</strong>、
                <strong className="text-teal-400">利潤率</strong>、
                <strong className="text-rose-400">債務水平</strong> 與 
                <strong className="text-cyan-400">股本回報率 (ROE)</strong>。
              </li>
              <li>
                將 5 年的長期趨勢與目前最新一個季度的季度財務數據進行重疊比照，確切評估這家公司的核心財務健康度。
              </li>
              <li>
                最終判定為「衰退」或「強勁」兩大級別評比，幫助投資者洞察核心基本面是正在擴張還是步入下滑。
              </li>
            </ul>
            <h4 className="text-white font-bold text-base flex items-center gap-2 mt-6">
              <Database className="w-5 h-5 text-blue-400" /> 實際分析了哪些資料
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>年報/季報調取：</strong>自動檢索該企業過去 5 年的核心財務三表數據（損益表、資產負債表、現金流量表）。
              </li>
              <li>
                <strong>利潤與回報率計算：</strong>評估毛淨利潤率是否承壓，以及股東權益回報率是否具備競爭力。
              </li>
              <li>
                <strong>最新季度比照：</strong>比對最新季報中是否出現了營收加速、自由現金流創高或債務失控等轉折點。
              </li>
            </ul>
          </div>
        );
      case "risk":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> 給 AI 的 Prompt 邏輯
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                要求 AI 辨識並分析投資該股票面臨的最大核心危害與投資風險。
              </li>
              <li>
                覆蓋關鍵的 6 大風險層面包括：
                <strong>經濟風險</strong>、<strong>行業顛覆</strong>、<strong>競爭威脅</strong>、
                <strong>監管法規風險</strong>、<strong>債務與財務風險</strong>、以及<strong>公司政策導向與挑戰</strong>。
              </li>
              <li>
                將所有辨識到的核心風險點，按照其對股價和企業生存的「危險程度由高到低」進行嚴格的優先權排序。
              </li>
              <li>
                最終輸出評分為三種級別：<span className="text-emerald-400 font-bold">低 (Low)</span>、
                <span className="text-amber-400 font-bold">觀察 (Watch)</span>、
                <span className="text-rose-400 font-bold">高 (High)</span>。
              </li>
              <li>
                並特別創建兩大頂尖分析師論證辯壇：一位看漲，一位看跌，雙方必須各司其職，提供充足的數據和行業統計，最後並得出看漲或看跌的其中之一的結論。
              </li>
            </ul>
            <h4 className="text-white font-bold text-base flex items-center gap-2 mt-6">
              <Database className="w-5 h-5 text-blue-400" /> 實際分析了哪些資料
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>外部多重挑戰：</strong>聯網檢索有關新替代品、競爭對手攻勢、行業新規與高負債財務警報等風險內容。
              </li>
              <li>
                <strong>分析師多空博弈：</strong>搜集市場最前沿的多空雙方論據與數據模型，擬定邏輯嚴密且相互對立的辯論點。
              </li>
            </ul>
          </div>
        );
      case "pos":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-400" /> Positive Score (多頭力道加總) 計算方式
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>量化公式：</strong>
                <code className="text-emerald-400 font-mono text-xs block my-1 bg-slate-900 px-3 py-2 rounded border border-slate-850">
                  Positive Score = calc(AI綜合評分) + calc(品質評分) + calc(價值評分) + Buy Score
                </code>
                其中，各項評分的 <code className="text-amber-400 font-mono">calc(Score)</code> 運算邏輯為：若原始分數大於 5 分，則保留超出 5 分的部分（即 <code className="text-emerald-400 font-mono">Score - 5</code>），小於等於 5 分時則以 0 分計。
              </li>
              <li>
                <strong>運作原理：</strong>
                主要在量化個股「超越平均水準 (5分)」的多頭優勢。當 AI評分、企業品質、估值合規性個別優於基準線時，其超越基準差值會與當前的 Buy Score (買進評分) 直接加總，形成強力的多頭共振力道衡量指標。
              </li>
              <li>
                <strong>數值解讀：</strong>
                分數越高，代表個股在基本面品質、內在價值評比及 Socrates AI 整體分析面上，所匯聚的多頭信心與加碼力道越是顯著、飽滿且全面。
              </li>
            </ul>
          </div>
        );
      case "neg":
        return (
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed px-1">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-rose-500" /> Negative Score (空頭力道加總) 計算方式
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>量化公式：</strong>
                <code className="text-rose-400 font-mono text-xs block my-1 bg-slate-900 px-3 py-2 rounded border border-slate-850">
                  Negative Score = calc(AI綜合評分) + calc(品質評分) + calc(價值評分) + Sell Score
                </code>
                其中，各項評分的 <code className="text-amber-400 font-mono">calc(Score)</code> 運算邏輯為：若原始分數小於 5 分，則計算落後 5 分的差距部分（即 <code className="text-rose-400 font-mono">5 - Score</code>），大於等於 5 分時則以 0 分計。
              </li>
              <li>
                <strong>運作原理：</strong>
                用於判定資產「低於平均值 (5分)」的弱勢或下行風險程度。當 AI綜合評分、基本面財報、內在價值個別惡化並下滑至過低水準時，與過半基準的負偏離將會被轉換為正向的風險點數累計，進而與 Sell Score (賣點評分) 直接加總。
              </li>
              <li>
                <strong>數值解讀：</strong>
                分數越高，代表個股在多個重要分析維度中的空頭風險與回調警戒訊號越趨於集中、強烈，提示投資人更應注重防禦、止損或規避。
              </li>
            </ul>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-slate-900 w-full max-w-3xl rounded-2xl border border-slate-700/70 p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4 sm:mb-5 shrink-0">
          <h3 className="text-base sm:text-lg md:text-xl font-black text-white flex items-center gap-2">
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
            <span>AI 評分與分析邏輯說明</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Selection: Structured grid on mobile to keep items uniform, beautifully rendering into flex row on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-1.5 sm:gap-2 mb-4 border-b border-slate-800 pb-3 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1.5 sm:px-3 sm:py-2.5 rounded-lg text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-200 text-center flex items-center justify-center border leading-tight ${
                activeTab === tab.id
                  ? "bg-amber-600/20 text-amber-500 border-amber-600/40 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar pr-1 pb-2 scroll-smooth">
          <div className="bg-slate-950 rounded-xl p-3.5 sm:p-5 border border-slate-800/50 shadow-inner min-h-[180px] sm:min-h-[300px]">
            {renderContent()}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 sm:px-6 sm:py-2.5 bg-slate-800 hover:bg-slate-705 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors"
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
  isLoggingIn,
}: any) => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState("");
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Custom non-blocking restore confirmation to bypass sandbox browser limitations
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<{ id: string; name: string } | null>(null);

  // --- Google Sheets Syncing states & handler ---
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSuccessMessage, setSheetsSuccessMessage] = useState("");
  const [syncedSpreadsheetUrl, setSyncedSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem("ecm_synced_spreadsheet_url") || null;
  });

  const handleSyncSheets = async () => {
    if (!token) return;
    setIsSyncingSheets(true);
    setSheetsSuccessMessage("");
    setErrorMessage("");
    try {
      const result = await workspace.createAndSyncGoogleSheet(token, trades, watchlist);
      setSyncedSpreadsheetUrl(result.spreadsheetUrl);
      localStorage.setItem("ecm_synced_spreadsheet_url", result.spreadsheetUrl);
      setSheetsSuccessMessage("成功創立並同步至 Google 試算表（交易史與隨身清單）！");
      setTimeout(() => setSheetsSuccessMessage(""), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("試算表同步失敗，請確認是否已對 Google 試算表授權。");
    } finally {
      setIsSyncingSheets(false);
    }
  };

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
      // Package comprehensive watchlist details including scores, recommendations, and update timestamps
      const backupData = {
        watchlist: watchlist.map((w: any) => ({
          symbol: w.symbol || "",
          name: w.name || "",
          price: w.price ?? 0,
          changePercent: w.changePercent ?? 0,
          timestamp: w.timestamp || Date.now(),
          buyScore: w.buyScore ?? null,
          sellScore: w.sellScore ?? null,
          qualityScore: w.qualityScore ?? null,
          valueScore: w.valueScore ?? null,
          crashSimilarityScore: w.crashSimilarityScore ?? null,
          posScore: w.posScore ?? 0,
          negScore: w.negScore ?? 0,
          aiScore: w.aiScore ?? null,
          action: w.action || "Neutral",
          history: w.history || [],
        })),
        trades,
        backedUpAt: new Date().toISOString(),
      };
      const fileName = `Socrates_Watchlist_Backup_${new Date().toISOString().slice(0, 10)}_${Math.floor(Date.now() / 1000)}.json`;
      await gdrive.uploadFileToGoogleDrive(
        token,
        fileName,
        "application/json",
        JSON.stringify(backupData, null, 2),
        "Socrates_ECM_Backup",
      );
      setBackupSuccessMessage("成功將觀察清單指標數據（個股、評分、更新日期與歷史）備份至雲端硬碟！");
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
              disabled={isLoggingIn}
              className={`flex items-center gap-3 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg ${isLoggingIn ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
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
              )}
              {isLoggingIn ? "登入中..." : "Sign in with Google"}
            </button>

            {/* Sandbox iframe friendly alert line */}
            <div className="mt-6 text-[11px] text-amber-500/90 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/10 max-w-sm text-center font-sans tracking-wide leading-relaxed">
              💡 <b>微網誌/預覽視窗登入提示：</b><br />
              因瀏覽器安全性限制，若登入彈出視窗被封鎖或未回應，請點擊外層右上角<b>「在新分頁中開啟 (Open in a new tab)」</b>即可順利完成驗證！
            </div>
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
                    備份最新觀察名單（含個股、各項評分、狀態指標與更新日期歷史）
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

            {/* Google Sheets Sync Card */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-black uppercase flex items-center gap-1.5 text-left">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Google Sheets 實時交易帳簿
                  </h4>
                  <p className="text-[11px] text-slate-500 text-left">
                    建立並同步 Socrates 雲端試算表（整合所有的交易歷史與自訂隨身清單）
                  </p>
                </div>
                <button
                  onClick={handleSyncSheets}
                  disabled={isSyncingSheets}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3.5 rounded-xl transition-colors disabled:opacity-50 text-xs shadow-md"
                >
                  {isSyncingSheets ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      同步
                    </>
                  )}
                </button>
              </div>

              {sheetsSuccessMessage && (
                <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-lg border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {sheetsSuccessMessage}
                </div>
              )}

              {syncedSpreadsheetUrl && (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2 text-left rounded-lg text-xs animate-in fade-in">
                  <span className="text-emerald-300 font-bold">已同步試算表：</span>
                  <a
                    href={syncedSpreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-white underline hover:text-emerald-400 font-bold"
                  >
                    開啟 Google 試算表 <ExternalLink className="w-3 h-3" />
                  </a>
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
                          onClick={() => setConfirmRestoreFile({ id: bak.id, name: bak.name })}
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

        {confirmRestoreFile && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" onClick={() => setConfirmRestoreFile(null)} />
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative z-30 transform scale-100 transition-all duration-150">
              <h4 className="text-base font-black text-white mb-2 flex items-center gap-1.5">
                <CloudDownload className="w-5 h-5 text-amber-500 animate-bounce" />
                確認還原備份
              </h4>
              <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed text-left">
                確認要從備份檔案「<span className="text-amber-500 font-mono font-bold break-all">{confirmRestoreFile.name}</span>」還原嗎？<br /><br />
                <span className="text-rose-455 font-black">⚠️ 警告：這將會完全覆蓋您目前的的所有交易與觀察清單資料。</span>
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmRestoreFile(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-750"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRestore(confirmRestoreFile.id, confirmRestoreFile.name);
                    setConfirmRestoreFile(null);
                  }}
                  className="px-4 py-2 bg-amber-650 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-900/20"
                >
                  確定還原
                </button>
              </div>
            </div>
          </div>
        )}
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
  const [viewTab, setViewTab] = useState<"screener" | "report" | "screenerWatchlist" | "macroFilter" | "alphaMatrix" | "portfolio">("report");
  const [selectedScreenerItems, setSelectedScreenerItems] = useState<ScreenerItem[]>(() => {
    const s = localStorage.getItem("ecm_screener_watchlist");
    return s ? JSON.parse(s) : [];
  });
  
  useEffect(() => {
    localStorage.setItem("ecm_screener_watchlist", JSON.stringify(selectedScreenerItems));
  }, [selectedScreenerItems]);

  const toggleScreenerItem = useCallback((item: ScreenerItem) => {
    setSelectedScreenerItems(prev => {
      if (prev.some(i => i.symbol === item.symbol)) {
        return prev.filter(i => i.symbol !== item.symbol);
      } else {
        return [...prev, item];
      }
    });
  }, []);

  const [reports, setReports] = useState<Record<string, StockReport>>({});
  const report = stockData ? reports[stockData.symbol] || null : null;
  const [reportLoading, setReportLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [financialHealthLoading, setFinancialHealthLoading] = useState(false);
  const [riskAnalysisLoading, setRiskAnalysisLoading] = useState(false);
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
  const [updatingWatchlist, setUpdatingWatchlist] = useState(false);
  const [watchlistUpdateProgress, setWatchlistUpdateProgress] = useState("");

  const [showWatchlistExportModal, setShowWatchlistExportModal] = useState(false);
  const [showWatchlistImportModal, setShowWatchlistImportModal] = useState(false);
  const [watchlistCloudLoading, setWatchlistCloudLoading] = useState(false);

  const handleImportSelected = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (Array.isArray(json)) {
            setSelectedScreenerItems(json);
            alert("匯入成功！");
          }
        } catch (err) {
          alert("無效的 JSON 檔案");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleExportSelected = useCallback(() => {
    const blob = new Blob([JSON.stringify(selectedScreenerItems, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const d = new Date();
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}`;
    a.download = `socrates_selected_${ds}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedScreenerItems]);

  const handleDriveExportSelected = async () => {
    if (!gdToken) {
      alert("請先登入 Google Drive");
      setShowGoogleDrive(true);
      return;
    }
    setWatchlistCloudLoading(true);
    try {
      const gdrive = await import("./googleDrive");
      const blob = new Blob([JSON.stringify(selectedScreenerItems, null, 2)], {
        type: "application/json",
      });
      const d = new Date();
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}`;
      const fileName = `socrates_selected_${ds}.json`;
      
      await gdrive.uploadFileToGoogleDrive(
        gdToken,
        fileName,
        "application/json",
        blob,
        "Socrates_Screener_Watchlist"
      );
      alert(`精選名單已成功備份至 Google Drive 的「Socrates_Screener_Watchlist」資料夾中！檔案名稱為：\n${fileName}`);
      setShowWatchlistExportModal(false);
    } catch (err) {
      console.error(err);
      alert("備份至 Google Drive 失敗");
    } finally {
      setWatchlistCloudLoading(false);
    }
  };

  const handleDriveImportSelected = async () => {
    if (!gdToken) {
      alert("請先登入 Google Drive");
      setShowGoogleDrive(true);
      return;
    }
    setWatchlistCloudLoading(true);
    try {
      const gdrive = await import("./googleDrive");
      const files = await gdrive.listBackupFilesFromGoogleDrive(gdToken, "Socrates_Screener_Watchlist");
      if (!files || files.length === 0) {
        alert("在 Google Drive 中找不到備份檔案");
        return;
      }
      
      // select the newest file (assuming they are named with timestamps)
      const latestFile = files[0];
      const jsonStr = await gdrive.downloadFileFromGoogleDrive(gdToken, latestFile.id);
      
      const json = JSON.parse(jsonStr);
      if (Array.isArray(json)) {
        setSelectedScreenerItems(json);
        alert(`已成功從 Google Drive 匯入資料 (檔案: ${latestFile.name})`);
        setShowWatchlistImportModal(false);
      } else {
        alert("資料格式無效");
      }
    } catch (err) {
      console.error(err);
      alert("從 Google Drive 匯入失敗");
    } finally {
      setWatchlistCloudLoading(false);
    }
  };

  // Google Drive state
  const [gdUser, setGdUser] = useState<any>(null);
  const [gdToken, setGdToken] = useState<string | null>(null);
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  // Firestore Helper Functions with strict operational error handlers
  const cleanForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(item => cleanForFirestore(item));
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        if (obj[key] !== undefined) {
          cleaned[key] = cleanForFirestore(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  const saveTradeToFirestore = async (userId: string, trade: Trade) => {
    const path = `users/${userId}/trades`;
    try {
      const docRef = doc(db, path, trade.id);
      await setDoc(docRef, cleanForFirestore({
        ...trade,
        userId
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${trade.id}`);
    }
  };

  const deleteTradeFromFirestore = async (userId: string, tradeId: string) => {
    const path = `users/${userId}/trades`;
    try {
      const docRef = doc(db, path, tradeId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${tradeId}`);
    }
  };

  const saveWatchlistItemToFirestore = async (userId: string, item: WatchlistItem) => {
    const path = `users/${userId}/watchlist`;
    try {
      const docRef = doc(db, path, item.symbol);
      await setDoc(docRef, cleanForFirestore({
        ...item,
        userId
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${item.symbol}`);
    }
  };

  const deleteWatchlistItemFromFirestore = async (userId: string, symbol: string) => {
    const path = `users/${userId}/watchlist`;
    try {
      const docRef = doc(db, path, symbol);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${symbol}`);
    }
  };

  const syncFromFirestore = async (userId: string) => {
    try {
      const tradesPath = `users/${userId}/trades`;
      const watchlistPath = `users/${userId}/watchlist`;

      // 1. Fetch trades from Firestore
      let fetchedTrades: Trade[] = [];
      try {
        const tradesSnap = await getDocs(collection(db, tradesPath));
        tradesSnap.forEach((doc) => {
          fetchedTrades.push(doc.data() as Trade);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, tradesPath);
      }

      // 2. Fetch watchlist items from Firestore
      let fetchedWatchlist: WatchlistItem[] = [];
      try {
        const watchSnap = await getDocs(collection(db, watchlistPath));
        watchSnap.forEach((doc) => {
          fetchedWatchlist.push(doc.data() as WatchlistItem);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, watchlistPath);
      }

      // 3. Merging logic
      if (fetchedTrades.length > 0) {
        setTrades(fetchedTrades);
        localStorage.setItem("ecm_trades", JSON.stringify(fetchedTrades));
      } else {
        // If Firestore is empty, upload standard offline local trades
        const localTrades = JSON.parse(localStorage.getItem("ecm_trades") || "[]");
        if (localTrades.length > 0) {
          for (const t of localTrades) {
            await saveTradeToFirestore(userId, t);
          }
        }
      }

      if (fetchedWatchlist.length > 0) {
        setWatchlist(fetchedWatchlist);
        localStorage.setItem("ecm_watchlist", JSON.stringify(fetchedWatchlist));
      } else {
        // If Firestore is empty, upload standard offline local watchlist items
        const localWatchlist = JSON.parse(localStorage.getItem("ecm_watchlist") || "[]");
        if (localWatchlist.length > 0) {
          for (const w of localWatchlist) {
            await saveWatchlistItemToFirestore(userId, w);
          }
        }
      }
    } catch (err) {
      console.error("Firestore sync fail on login:", err);
    }
  };

  // Sync with Firestore whenever user signs in
  useEffect(() => {
    if (gdUser) {
      syncFromFirestore(gdUser.uid);
    }
  }, [gdUser]);

  const handleGoogleDriveLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const result = await gdrive.googleSignIn();
      if (result) {
        setGdUser(result.user);
        setGdToken(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      const errorCode = err?.code || "";
      const errorMsg = err?.message || "";
      if (
        errorCode !== "auth/cancelled-popup-request" &&
        errorCode !== "auth/popup-closed-by-user" &&
        !errorMsg.includes("cancelled-popup-request") &&
        !errorMsg.includes("popup-closed-by-user")
      ) {
        alert("登入 Google 帳號失敗，請重試。");
      }
    } finally {
      setIsLoggingIn(false);
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
      setError(getQuotaErrorMessage(err.message || err.toString() || "分析失敗"));
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
      A simulated backtest of the Socrates ECM strategy on this stock (Win rate, Profit factor, Max drawdown, improvements).

      CRITICAL: All descriptive text (summary, action, checklist, positioning, improvementsBase, overview, extraPlanOverview, actionDetails, triggerCondition) MUST be in Traditional Chinese (繁體中文).
      Based on the asset context, determine if the strategy should be 'Buy', 'Short', or 'Wait'.
      If Buy, generate buy entry conditions. If Short, generate short-sell entry conditions.
      For the 4 entry batches, please provide exact allocations (e.g. "10%", "20%", "30%", "40%") and clear trigger condition descriptions in Traditional Chinese.

      ALSO, generate an 'extraPlan' for each strategy mapping to these rules:
      - If direction is 'Buy', the extra plan should be based on buying when the price FALLS (price pullbacks or inverse logic).
      - If direction is 'Short', the extra plan should be based on shorting when the price RISES (price rallies or inverse logic).
      The extra plan portions MUST follow the same logic as the main plan, but triggered on reverse conditions in Traditional Chinese. Or formulate it to specifically match the percentages below.
      The percentages for the main and extra plan MUST be exactly:
      - pyramid (正金字塔): 1st 40%, 2nd 30%, 3rd 20%, 4th 10%
      - inverted (倒金字塔): 1st 10%, 2nd 20%, 3rd 30%, 4th 40%
      - hybrid (折中方案): 1st 20%, 2nd 25%, 3rd 25%, 4th 30%

      Keep the direction value (Buy, Short, Wait) in English.

      Return the response strictly as a JSON object matching the requested schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              tradingStrategy: {
                type: Type.OBJECT,
                properties: {
                  direction: { type: Type.STRING, description: "Must be exactly 'Buy', 'Short' or 'Wait'" },
                  overview: { type: Type.STRING, description: "Overview of the entry logic in Traditional Chinese" },
                  pyramid: {
                    type: Type.OBJECT,
                    properties: {
                      entries: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            percentage: { type: Type.STRING },
                            triggerCondition: { type: Type.STRING, description: "In Traditional Chinese" },
                            actionDetails: { type: Type.STRING, description: "In Traditional Chinese" }
                          },
                          required: ["percentage", "triggerCondition", "actionDetails"]
                        }
                      },
                      extraPlanOverview: { type: Type.STRING, description: "In Traditional Chinese" },
                      extraPlanEntries: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            percentage: { type: Type.STRING },
                            triggerCondition: { type: Type.STRING, description: "In Traditional Chinese" },
                            actionDetails: { type: Type.STRING, description: "In Traditional Chinese" }
                          },
                          required: ["percentage", "triggerCondition", "actionDetails"]
                        }
                      }
                    },
                    required: ["entries", "extraPlanOverview", "extraPlanEntries"]
                  },
                  inverted: {
                    type: Type.OBJECT,
                    properties: {
                      entries: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            percentage: { type: Type.STRING },
                            triggerCondition: { type: Type.STRING, description: "In Traditional Chinese" },
                            actionDetails: { type: Type.STRING, description: "In Traditional Chinese" }
                          },
                          required: ["percentage", "triggerCondition", "actionDetails"]
                        }
                      },
                      extraPlanOverview: { type: Type.STRING, description: "In Traditional Chinese" },
                      extraPlanEntries: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            percentage: { type: Type.STRING },
                            triggerCondition: { type: Type.STRING, description: "In Traditional Chinese" },
                            actionDetails: { type: Type.STRING, description: "In Traditional Chinese" }
                          },
                          required: ["percentage", "triggerCondition", "actionDetails"]
                        }
                      }
                    },
                    required: ["entries", "extraPlanOverview", "extraPlanEntries"]
                  },
                  hybrid: {
                    type: Type.OBJECT,
                    properties: {
                      entries: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            percentage: { type: Type.STRING },
                            triggerCondition: { type: Type.STRING, description: "In Traditional Chinese" },
                            actionDetails: { type: Type.STRING, description: "In Traditional Chinese" }
                          },
                          required: ["percentage", "triggerCondition", "actionDetails"]
                        }
                      },
                      extraPlanOverview: { type: Type.STRING, description: "In Traditional Chinese" },
                      extraPlanEntries: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            percentage: { type: Type.STRING },
                            triggerCondition: { type: Type.STRING, description: "In Traditional Chinese" },
                            actionDetails: { type: Type.STRING, description: "In Traditional Chinese" }
                          },
                          required: ["percentage", "triggerCondition", "actionDetails"]
                        }
                      }
                    },
                    required: ["entries", "extraPlanOverview", "extraPlanEntries"]
                  }
                },
                required: ["direction", "overview", "pyramid", "inverted", "hybrid"]
              },
              backtest: {
                type: Type.OBJECT,
                properties: {
                  winRate: { type: Type.STRING },
                  profitFactor: { type: Type.STRING },
                  maxDrawdown: { type: Type.STRING },
                  analysisPeriod: { type: Type.STRING },
                  improvements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Improvements in Traditional Chinese" }
                  }
                },
                required: ["winRate", "profitFactor", "maxDrawdown", "analysisPeriod", "improvements"]
              },
              generatedAt: { type: Type.INTEGER }
            },
            required: ["symbol", "tradingStrategy", "backtest", "generatedAt"]
          },
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

  const fetchFinancialHealth = async () => {
    if (!stockData?.symbol || !report) return;
    setFinancialHealthLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `${getCurrentDateContext()} Focus on target stock: "${stockData.symbol}" (${stockData.name}). Use Google Search to retrieve the company's financial data for the past 5 years.
      Decompose and analyze the following 6 metrics:
      - 收入增長 (Revenue growth)
      - 淨利潤趨勢 (Net profit trends)
      - 自由現金流 (Free cash flow)
      - 利潤率 (Profit margins)
      - 債務水平 (Debt levels)
      - 股本回報率 (Return on equity)
      
      Compare these 5-year trends with the latest quarterly financial data of the newest quarter. Explain in detail whether the company's financial state is "衰退" (declining/weakening) or "強勁" (strong/growing).
      
      CRITICAL: All descriptive text MUST be in Traditional Chinese (繁體中文).
      
      Return the response strictly as a JSON object with this exact structure:
      {
        "financialHealth": {
          "status": "衰退" | "強勁",
          "overview": "總體財務狀況健康度詳細解讀，說明與最新季度財報對比的結果 (繁體中文)...",
          "metrics": {
            "revenueGrowth": "過去5年收入增長分析與最新季度財報詳細比照 (繁體中文)...",
            "netProfitTrend": "過去5年淨利潤趨勢分析與最新季度財報詳細比照 (繁體中文)...",
            "freeCashFlow": "過去5年自由現金流分析與最新季度財報詳細比照 (繁體中文)...",
            "profitMargins": "過去5年利潤率分析與最新季度財報詳細比照 (繁體中文)...",
            "debtLevels": "過去5年債務水平分析與最新季度財報詳細比照 (繁體中文)...",
            "returnOnEquity": "過去5年股本回報率分析與最新季度財報詳細比照 (繁體中文)..."
          }
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
      if (data.financialHealth) {
        setReports((prev) => ({
          ...prev,
          [stockData.symbol]: {
            ...prev[stockData.symbol],
            financialHealth: data.financialHealth
          }
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFinancialHealthLoading(false);
    }
  };

  const fetchRiskAnalysis = async () => {
    if (!stockData?.symbol || !report) return;
    setRiskAnalysisLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `${getCurrentDateContext()} Focus on target stock: "${stockData.symbol}" (${stockData.name}). Use Google Search to identify the biggest risks of investing in this stock.
      Analyze the following 6 core risks:
      - 經濟風險 (Economic risks)
      - 行業顛覆 (Industry disruption)
      - 競爭 (Competition)
      - 監管威脅 (Regulatory threats)
      - 債務或財務風險 (Debt or financial risks)
      - 公司政策導向與挑戰 (Company policy direction and challenges)
      
      You must satisfy these exact rules:
      1. Sort these 6 risks strictly based on their level of threat/danger regarding the stock price and business survival from highest danger level to lowest danger level (按照對股價和企業生存的「危險程度由高到低」進行嚴格的優先權排序).
      2. For each risk, assign a severity level of "低" (Low), "中" (Medium), or "高" (High).
      3. Assign an overall Risk Rating ("riskLevel") for the stock choosing strictly from: "低" (Low), "觀察" (Watch), or "高" (High).
      4. Create a debate forum ("debate") between two top industry analysts:
         - One analyst is bullish (看漲)
         - One analyst is bearish (看跌)
         - Both analysts must perform their duties carefully (各司其職), offering plenty of concrete numbers, financial figures, and industry statistics/data (提供充足的數據和行業統計).
         - Conclude the debate with a definitive concluding statement ("conclusion"), summarizing both perspectives but strictly choosing and leaning towards EITHER a bullish (看漲) OR a bearish (看跌) conclusion explicitly as the final outcome (最後並得出看漲或看跌的其中之一的結論).
         
      CRITICAL: All descriptive text inside risks and debates MUST be in Traditional Chinese (繁體中文).
      
      Return the response strictly as a JSON object with this exact structure:
      {
        "riskAnalysis": {
          "riskLevel": "低" | "觀察" | "高",
          "risks": [
            {
              "category": "經濟風險" | "行業顛覆" | "競爭" | "監管威脅" | "債務或財務風險" | "公司政策導向與挑戰",
              "severity": "低" | "中" | "高",
              "description": "具體風險說明與威脅來源對比分析 (繁體中文)..."
            }
          ],
          "debate": {
            "bullishAnalystName": "看漲分析師的名字 (繁體中文)...",
            "bullishArguments": [
              "有具體數據與理據支持的看漲理論與觀點 1 (繁體中文)...",
              "有具體數據與理據支持的看漲理論與觀點 2 (繁體中文)..."
            ],
            "bearishAnalystName": "看跌分析師的名字 (繁體中文)...",
            "bearishArguments": [
              "有具體數據與理據支持的看跌理論與觀點 1 (繁體中文)...",
              "有具體數據與理據支持的看跌理論與觀點 2 (繁體中文)..."
            ],
            "conclusion": "對於多空觀點與數據進行全面考量後，明確得出看漲 (Bullish) 或看跌 (Bearish) 其中之一的結論與核心理由 (繁體中文)..."
          }
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
      if (data.riskAnalysis) {
        setReports((prev) => ({
          ...prev,
          [stockData.symbol]: {
            ...prev[stockData.symbol],
            riskAnalysis: data.riskAnalysis
          }
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRiskAnalysisLoading(false);
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
    const newTrade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: s,
      name: n,
      type,
      price: p,
      shares: sh,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };
    setTrades((prev) => [
      ...prev,
      newTrade,
    ]);
    if (gdUser) {
      saveTradeToFirestore(gdUser.uid, newTrade);
    }
  };

  const handleWatchlist = () => {
    if (!stockData) return;
    const isExist = watchlist.some((i) => i.symbol === stockData.symbol);
    const scoresAndTime = {
      timestamp: Date.now(),
      price: Number(stockData.price),
      changePercent: Number(stockData.changePercent),
      buyScore: stockData.buyScore,
      sellScore: stockData.sellScore,
      qualityScore: stockData.qualityScore,
      valueScore: stockData.valueScore,
      crashSimilarityScore: stockData.crashSimilarityScore,
      posScore: getPosScore(stockData),
      negScore: getNegScore(stockData),
      aiScore: stockData.screenerRating?.score,
      action: stockData.screenerRating?.action || "Neutral",
    };

    if (isExist) {
      setWatchlist((prev) => prev.filter((i) => i.symbol !== stockData.symbol));
      if (gdUser) {
        deleteWatchlistItemFromFirestore(gdUser.uid, stockData.symbol);
      }
    } else {
      const newItem: WatchlistItem = {
        symbol: stockData.symbol,
        name: stockData.name,
        price: Number(stockData.price),
        changePercent: Number(stockData.changePercent),
        timestamp: Date.now(),
        buyScore: stockData.buyScore,
        sellScore: stockData.sellScore,
        qualityScore: stockData.qualityScore,
        valueScore: stockData.valueScore,
        crashSimilarityScore: stockData.crashSimilarityScore,
        posScore: getPosScore(stockData),
        negScore: getNegScore(stockData),
        aiScore: stockData.screenerRating?.score,
        action: stockData.screenerRating?.action || "Neutral",
        history: [scoresAndTime],
      };
      setWatchlist((prev) => [
        ...prev,
        newItem,
      ]);
      if (gdUser) {
        saveWatchlistItemToFirestore(gdUser.uid, newItem);
      }
    }
  };

  const handleAddOrUpdateWatchlist = () => {
    if (!stockData) return;
    const existingIndex = watchlist.findIndex((i) => i.symbol === stockData.symbol);
    const scoresAndTime = {
      timestamp: Date.now(),
      price: Number(stockData.price),
      changePercent: Number(stockData.changePercent),
      buyScore: stockData.buyScore,
      sellScore: stockData.sellScore,
      qualityScore: stockData.qualityScore,
      valueScore: stockData.valueScore,
      crashSimilarityScore: stockData.crashSimilarityScore,
      posScore: getPosScore(stockData),
      negScore: getNegScore(stockData),
      aiScore: stockData.screenerRating?.score,
      action: stockData.screenerRating?.action || "Neutral",
    };

    if (existingIndex > -1) {
      setWatchlist((prev) => {
        const updated = [...prev];
        const currentItem = updated[existingIndex];
        const newHistory = Array.isArray(currentItem.history) && currentItem.history.length > 0
          ? [...currentItem.history]
          : [{
              timestamp: currentItem.timestamp || Date.now() - 1, // Ensure old record comes before if exact
              price: currentItem.price || 0,
              changePercent: currentItem.changePercent || 0,
              buyScore: currentItem.buyScore,
              sellScore: currentItem.sellScore,
              qualityScore: currentItem.qualityScore,
              valueScore: currentItem.valueScore,
              crashSimilarityScore: currentItem.crashSimilarityScore,
              posScore: currentItem.posScore,
              negScore: currentItem.negScore,
              aiScore: currentItem.aiScore,
              action: currentItem.action || "Neutral",
            }];
        newHistory.push(scoresAndTime);
        
        updated[existingIndex] = {
          ...currentItem,
          price: Number(stockData.price),
          changePercent: Number(stockData.changePercent),
          timestamp: Date.now(),
          buyScore: stockData.buyScore,
          sellScore: stockData.sellScore,
          qualityScore: stockData.qualityScore,
          valueScore: stockData.valueScore,
          crashSimilarityScore: stockData.crashSimilarityScore,
          posScore: getPosScore(stockData),
          negScore: getNegScore(stockData),
          aiScore: stockData.screenerRating?.score,
          action: stockData.screenerRating?.action || "Neutral",
          history: newHistory,
        };
        
        if (gdUser) {
          saveWatchlistItemToFirestore(gdUser.uid, updated[existingIndex]);
        }

        // Also sync updated scores to the screener watchlist if it exists there
        setSelectedScreenerItems((prevScreener) => {
          const sIdx = prevScreener.findIndex(i => i.symbol === stockData.symbol);
          if (sIdx > -1) {
            const newerS = [...prevScreener];
            newerS[sIdx] = {
              ...newerS[sIdx],
              price: Number(stockData.price),
              changePercent: Number(stockData.changePercent),
              aiScore: stockData.screenerRating?.score,
              buyScore: stockData.buyScore,
              sellScore: stockData.sellScore,
              qualityScore: stockData.qualityScore,
              valueScore: stockData.valueScore,
              crashSimilarityScore: stockData.crashSimilarityScore,
            };
            return newerS;
          }
          return prevScreener;
        });

        return updated;
      });
      alert(`已更新 ${stockData.symbol} 觀察名單評分！`);
    } else {
      const newItem: WatchlistItem = {
        symbol: stockData.symbol,
        name: stockData.name,
        price: Number(stockData.price),
        changePercent: Number(stockData.changePercent),
        timestamp: Date.now(),
        buyScore: stockData.buyScore,
        sellScore: stockData.sellScore,
        qualityScore: stockData.qualityScore,
        valueScore: stockData.valueScore,
        crashSimilarityScore: stockData.crashSimilarityScore,
        posScore: getPosScore(stockData),
        negScore: getNegScore(stockData),
        aiScore: stockData.screenerRating?.score,
        action: stockData.screenerRating?.action || "Neutral",
        history: [scoresAndTime],
      };
      setWatchlist((prev) => [...prev, newItem]);
      if (gdUser) {
        saveWatchlistItemToFirestore(gdUser.uid, newItem);
      }
      alert(`已將 ${stockData.symbol} 加入觀察名單！`);
    }
  };

  const handleUpdateAllWatchlistRatings = async () => {
    if (watchlist.length === 0) return;
    setUpdatingWatchlist(true);
    setWatchlistUpdateProgress("準備更新所有個股評分...");
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const updatedWatchlist = [...watchlist];

      for (let i = 0; i < updatedWatchlist.length; i++) {
        const item = updatedWatchlist[i];
        setWatchlistUpdateProgress(`正在更新 ${item.symbol} 評分 (${i + 1}/${updatedWatchlist.length})...`);

        const prompt = `You are Martin Armstrong's Socrates AI. Perform a quick rating update for "${item.symbol}".
        ${getCurrentDateContext()}
        Step 1: Use Google Search to find the latest real-time stock price and change percentage from Yahoo Finance.
        Step 2: Re-calculate/estimate the Socrates rating metrics carefully:
          - buyScore (1-10)
          - sellScore (1-10)
          - qualityScore (1-10)
          - valueScore (1-10)
          - crashSimilarityScore (1-10)
          - compositeRating/Score (1-10)
          - activeAction ("Buy" | "Sell" | "Neutral")
          
        Output in Traditional Chinese.
        Return ONLY a JSON formatted string according to the following schema:
        {
          "symbol": "${item.symbol}",
          "name": "${item.name}",
          "price": 0.00,
          "changePercent": 0.00,
          "buyScore": 8,
          "sellScore": 2,
          "screenerRating": {"score": 8, "action": "Buy"},
          "qualityScore": 8,
          "valueScore": 7,
          "crashSimilarityScore": 5
        }`;

        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              tools: [{ googleSearch: {} }],
              temperature: 0.1,
            },
          });

          const data = safeParseJson(response.text || "{}");
          if (data.symbol) {
            const p = Number(data.price) || item.price;
            const cp = Number(data.changePercent) || item.changePercent;
            const buyS = data.buyScore !== undefined ? Number(data.buyScore) : (item.buyScore ?? 5);
            const sellS = data.sellScore !== undefined ? Number(data.sellScore) : (item.sellScore ?? 5);
            const qualS = data.qualityScore !== undefined ? Number(data.qualityScore) : (item.qualityScore ?? 5);
            const valS = data.valueScore !== undefined ? Number(data.valueScore) : (item.valueScore ?? 5);
            const crashS = data.crashSimilarityScore !== undefined ? Number(data.crashSimilarityScore) : (item.crashSimilarityScore ?? 5);
            const aiS = data.screenerRating?.score !== undefined ? Number(data.screenerRating.score) : (item.aiScore ?? 5);
            const activeAction = data.screenerRating?.action || item.action || "Neutral";
            
            const posS = Math.max(1, Math.min(10, Math.floor((buyS + qualS + valS) / 3)));
            const negS = Math.max(1, Math.min(10, Math.floor((sellS + crashS) / 2)));
            
            const scoresAndTime = {
              timestamp: Date.now(),
              price: p,
              changePercent: cp,
              buyScore: buyS,
              sellScore: sellS,
              qualityScore: qualS,
              valueScore: valS,
              crashSimilarityScore: crashS,
              posScore: posS,
              negScore: negS,
              aiScore: aiS,
              action: activeAction,
            };

            const curHistory = Array.isArray(item.history) && item.history.length > 0
              ? [...item.history]
              : [{
                  timestamp: item.timestamp || Date.now() - 1,
                  price: item.price || 0,
                  changePercent: item.changePercent || 0,
                  buyScore: item.buyScore,
                  sellScore: item.sellScore,
                  qualityScore: item.qualityScore,
                  valueScore: item.valueScore,
                  crashSimilarityScore: item.crashSimilarityScore,
                  posScore: item.posScore,
                  negScore: item.negScore,
                  aiScore: item.aiScore,
                  action: item.action || "Neutral",
                }];
            curHistory.push(scoresAndTime);

            updatedWatchlist[i] = {
              ...item,
              price: p,
              changePercent: cp,
              timestamp: Date.now(),
              buyScore: buyS,
              sellScore: sellS,
              qualityScore: qualS,
              valueScore: valS,
              crashSimilarityScore: crashS,
              posScore: posS,
              negScore: negS,
              aiScore: aiS,
              action: activeAction,
              history: curHistory,
            };

            if (gdUser) {
              saveWatchlistItemToFirestore(gdUser.uid, updatedWatchlist[i]);
            }

            setSelectedScreenerItems((prevScreener) => {
              const sIdx = prevScreener.findIndex(si => si.symbol === item.symbol);
              if (sIdx > -1) {
                const newerS = [...prevScreener];
                newerS[sIdx] = {
                  ...newerS[sIdx],
                  price: p,
                  changePercent: cp,
                  aiScore: aiS,
                  buyScore: buyS,
                  sellScore: sellS,
                  qualityScore: qualS,
                  valueScore: valS,
                  crashSimilarityScore: crashS,
                };
                return newerS;
              }
              return prevScreener;
            });
          }
        } catch (innerErr) {
          console.error(`Failed to update rating for ${item.symbol}:`, innerErr);
        }
      }

      setWatchlist(updatedWatchlist);
      localStorage.setItem("ecm_watchlist", JSON.stringify(updatedWatchlist));
      setWatchlistUpdateProgress("🎉 所有觀察名單評分更新完成！");
      setTimeout(() => setWatchlistUpdateProgress(""), 4000);
    } catch (err: any) {
      console.error(err);
      alert(getQuotaErrorMessage(err.message || err.toString() || "更新觀察名單發生異常，請稍後重試。"));
    } finally {
      setUpdatingWatchlist(false);
    }
  };

  const handleDeleteWatchHistory = async (symbol: string, timestampToDelete: number) => {
    try {
      setWatchlist((prev) => {
        return prev.map((item) => {
          if (item.symbol !== symbol) return item;

          const historyList = Array.isArray(item.history) && item.history.length > 0
            ? item.history
            : [{
                timestamp: item.timestamp,
                price: item.price,
                changePercent: item.changePercent,
                buyScore: item.buyScore,
                sellScore: item.sellScore,
                qualityScore: item.qualityScore,
                valueScore: item.valueScore,
                crashSimilarityScore: item.crashSimilarityScore,
                posScore: item.posScore,
                negScore: item.negScore,
                aiScore: item.aiScore,
                action: item.action,
              }];

          const filteredHistory = historyList.filter((h) => h.timestamp !== timestampToDelete);
          const sortedRemaining = [...filteredHistory].sort((a, b) => b.timestamp - a.timestamp);

          let updated: WatchlistItem;
          if (sortedRemaining.length > 0) {
            const latest = sortedRemaining[0];
            updated = {
              ...item,
              price: latest.price ?? item.price,
              changePercent: latest.changePercent ?? item.changePercent,
              timestamp: latest.timestamp,
              buyScore: latest.buyScore,
              sellScore: latest.sellScore,
              qualityScore: latest.qualityScore,
              valueScore: latest.valueScore,
              crashSimilarityScore: latest.crashSimilarityScore,
              posScore: latest.posScore,
              negScore: latest.negScore,
              aiScore: latest.aiScore,
              action: latest.action,
              history: filteredHistory,
            };
          } else {
            updated = {
              symbol: item.symbol,
              name: item.name,
              price: item.price,
              changePercent: item.changePercent,
              timestamp: Date.now(),
              history: [],
            };
          }
          if (gdUser) {
            saveWatchlistItemToFirestore(gdUser.uid, updated);
          }
          return updated;
        });
      });
    } catch (err) {
      console.error("Failed to delete watch history record:", err);
    }
  };

  const handleClearWatchHistory = async (symbol: string) => {
    try {
      setWatchlist((prev) => {
        return prev.map((item) => {
          if (item.symbol !== symbol) return item;
          const updated = {
            ...item,
            history: [],
          };
          if (gdUser) {
            saveWatchlistItemToFirestore(gdUser.uid, updated);
          }
          return updated;
        });
      });
    } catch (err) {
      console.error("Failed to clear watch history:", err);
    }
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
        <div className="max-w-[1440px] w-full mx-auto flex justify-between items-center">
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
            {gdUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2.5 rounded-xl">
                  {gdUser.photoURL ? (
                    <img
                      src={gdUser.photoURL}
                      alt={gdUser.displayName || "User"}
                      className="w-5 h-5 rounded-full border border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-white font-black">
                      {gdUser.displayName ? gdUser.displayName[0] : gdUser.email ? gdUser.email[0].toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="text-slate-300 text-xs font-bold hidden xl:inline max-w-[80px] truncate">
                    {gdUser.displayName || gdUser.email?.split("@")[0]}
                  </span>
                  <button
                    id="google-signout-btn"
                    onClick={handleGoogleDriveLogout}
                    className="bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 text-xs px-2 py-0.5 rounded border border-rose-500/20 transition-all ml-1 font-bold"
                  >
                    登出
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="google-signin-btn"
                onClick={handleGoogleDriveLogin}
                disabled={isLoggingIn}
                className={`flex items-center gap-2 bg-slate-800 hover:bg-slate-750 px-4 py-2.5 rounded-xl font-bold border border-slate-700 hover:border-amber-500/30 transition-all text-slate-200 relative group ${isLoggingIn ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoggingIn ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#ea4335"
                      d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.94 1 12 1 7.24 1 3.13 3.76 1.13 7.78l3.78 2.93c.92-2.76 3.51-4.67 7.09-4.67z"
                    />
                    <path
                      fill="#4285f4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.33H12v4.51h6.44c-.29 1.5-.1.81-1.14 2l3.7 2.87c2.16-1.99 3.49-4.92 3.49-7.05z"
                    />
                    <path
                      fill="#fbbc05"
                      d="M4.91 14.85l-3.78 2.93c2 4.02 6.11 6.78 10.87 6.78 2.94 0 5.61-.96 7.49-2.61l-3.7-2.87c-.98.66-2.23 1.06-3.79 1.06-3.58 0-6.17-1.91-7.09-4.67L4.91 14.85z"
                    />
                    <path
                      fill="#34a853"
                      d="M12 23.56c4.76 0 8.87-2.76 10.87-6.78l-3.7-2.87c-.92 2.76-3.51 4.67-7.09 4.67-1.64 0-3.12-.56-4.28-1.67l-3.2 3.2c1.96 1.93 4.54 3.45 7.49 3.45z"
                    />
                  </svg>
                )}
                <span className="text-white text-sm hidden sm:inline">
                  {isLoggingIn ? "登入中..." : "Google 帳號登入"}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowPortfolio(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 px-4 py-2.5 rounded-xl font-bold border border-slate-700 hover:border-amber-500/50 transition-all text-amber-500 relative group shadow-lg"
            >
              <Eye className="w-4 h-4 text-amber-500" />
              <span className="text-white text-sm hidden sm:inline">
                觀察名單、投資組合
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

      <main className="max-w-[1440px] w-full mx-auto p-4 md:p-8 space-y-8">
        <div className="max-w-2xl mx-auto">
          {/* Main Search */}
          <div className="relative group">
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
              <div key={idx}>
                <QuickStockHeader stockData={res} />
              </div>
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-700/50 mt-4 pt-3 w-full">
                <div className="flex items-center gap-2">
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest leading-none">
                    {stockData.name}
                  </p>
                  <button
                    onClick={handleWatchlist}
                    className={`p-1.5 rounded-full transition-all ${watchlist.some((i) => i.symbol === stockData.symbol) ? "text-amber-500 bg-amber-500/10" : "text-slate-600 hover:text-slate-400"}`}
                    title={
                      watchlist.some((i) => i.symbol === stockData.symbol)
                        ? "移除觀察"
                        : "納入觀察"
                    }
                  >
                    <Star
                      className={`w-4 h-4 ${watchlist.some((i) => i.symbol === stockData.symbol) ? "fill-current" : ""}`}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddOrUpdateWatchlist}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-600/95 to-amber-500/95 hover:from-amber-600 hover:to-amber-500 text-white font-extrabold text-xs px-4.5 py-2 rounded-xl transition-all shadow-[0_4px_12px_rgba(217,119,6,0.15)] hover:shadow-[0_4px_16px_rgba(217,119,6,0.25)] shrink-0 self-start sm:self-auto"
                >
                  <Eye className="w-3.5 h-3.5 text-white" />
                  {watchlist.some((i) => i.symbol === stockData.symbol) ? "更新觀測評分" : "加入觀察名單"}
                </button>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden sm:flex flex-wrap gap-2 justify-between border-b border-slate-800 pb-1">
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
                <button
                  onClick={() => setViewTab("screenerWatchlist")}
                  className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === "screenerWatchlist" && !isExporting ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500"}`}
                >
                  <List className="w-5 h-5 inline mr-2" />
                  精選名單
                </button>
                <button
                  onClick={() => setViewTab("macroFilter")}
                  className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === "macroFilter" && !isExporting ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500"}`}
                >
                  <Activity className="w-5 h-5 inline mr-2" />
                  大盤濾網
                </button>
                <button
                  onClick={() => setViewTab("alphaMatrix")}
                  className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === "alphaMatrix" && !isExporting ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500"}`}
                >
                  <Cpu className="w-5 h-5 inline mr-2" />
                  個股微觀 Alpha 矩陣
                </button>
                <button
                  onClick={() => setViewTab("portfolio")}
                  className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-base font-bold ${viewTab === "portfolio" && !isExporting ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500"}`}
                >
                  <Briefcase className="w-5 h-5 inline mr-2" />
                  投資組合
                </button>
              </div>
            </div>

            {/* Mobile Navigation Tabs */}
            <div className="flex sm:hidden flex-col gap-2 border-b border-slate-800/50 pb-3">
              <div className="relative w-full overflow-hidden bg-slate-950/40 p-1 rounded-xl border border-slate-800/50 shadow-inner">
                {/* Horizontal side scroll fade indicators */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-950 to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-950 to-transparent z-10" />
                
                <div className="flex gap-1 overflow-x-auto scrollbar-hide no-scrollbar py-0.5 px-1 scroll-smooth">
                  {[
                    { id: "report", label: "智能報告", icon: FileText },
                    { id: "screener", label: "篩選器", icon: Filter },
                    { id: "screenerWatchlist", label: "精選名單", icon: List },
                    { id: "macroFilter", label: "大盤濾網", icon: Activity },
                    { id: "alphaMatrix", label: "Alpha 矩陣", icon: Cpu },
                    { id: "portfolio", label: "投資組合", icon: Briefcase }
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = viewTab === tab.id && !isExporting;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setViewTab(tab.id as any)}
                        style={{ height: '44px' }}
                        className={`flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-black tracking-tight transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-amber-600/15 text-amber-400 border border-amber-500/30 shadow-md"
                            : "bg-transparent text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                      >
                        <TabIcon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-500"}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
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
                    onFetchFinancialHealth={fetchFinancialHealth}
                    financialHealthLoading={financialHealthLoading}
                    onFetchRiskAnalysis={fetchRiskAnalysis}
                    riskAnalysisLoading={riskAnalysisLoading}
                    gdUser={gdUser}
                    gdToken={gdToken}
                    onOpenWorkspaceHub={() => setShowGoogleDrive(true)}
                  />
                </div>
              )}
              {viewTab === "macroFilter" && !isExporting && (
                <div className="animate-in fade-in duration-300">
                  <MacroFilterView
                    symbol={stockData?.symbol}
                    stockName={stockData?.name}
                  />
                </div>
              )}
              {viewTab === "alphaMatrix" && !isExporting && (
                <div className="animate-in fade-in duration-300">
                  <AlphaMatrixView
                    symbol={stockData.symbol}
                    stockName={stockData.name}
                  />
                </div>
              )}
              {viewTab === "portfolio" && !isExporting && (
                <div className="animate-in fade-in duration-300">
                  <PortfolioView
                    currentPrices={cachedPrices}
                    gdUser={gdUser}
                    gdToken={gdToken}
                    onGoogleDriveLogin={handleGoogleDriveLogin}
                  />
                </div>
              )}
              {(viewTab === "screener" || viewTab === "screenerWatchlist" || isExporting) && (
                <div className="animate-in fade-in duration-300">
                  <PriceScreener
                    isWatchlistMode={viewTab === "screenerWatchlist"}
                    selectedScreenerItems={selectedScreenerItems}
                    onToggleScreenerItem={toggleScreenerItem}
                    onImportLocal={() => setShowWatchlistImportModal(true)}
                    onExportLocal={() => setShowWatchlistExportModal(true)}
                  />
                </div>
              )}
            </div>
          </div>
        ) : !loading ? (
          <div className="space-y-8">
            {/* Desktop Navigation Tabs */}
            <div className="hidden sm:flex justify-center border-b border-slate-800 pb-1 gap-2">
              <button
                onClick={() => setViewTab("report")}
                className={`px-6 py-3 rounded-t-xl text-base font-bold flex items-center transition-colors ${viewTab === "report" ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500 hover:text-slate-300"}`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                智能報告
              </button>
              <button
                onClick={() => setViewTab("screener")}
                className={`px-6 py-3 rounded-t-xl text-base font-bold flex items-center transition-colors ${viewTab === "screener" ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Filter className="w-5 h-5 inline mr-2" />
                篩選器
              </button>
              <button
                onClick={() => setViewTab("screenerWatchlist")}
                className={`px-6 py-3 rounded-t-xl text-base font-bold flex items-center transition-colors ${viewTab === "screenerWatchlist" ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500 hover:text-slate-300"}`}
              >
                <List className="w-5 h-5 inline mr-2" />
                精選名單
              </button>
              <button
                onClick={() => setViewTab("macroFilter")}
                className={`px-6 py-3 rounded-t-xl text-base font-bold flex items-center transition-colors ${viewTab === "macroFilter" ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Activity className="w-5 h-5 inline mr-2" />
                大盤濾網
              </button>
              <button
                onClick={() => setViewTab("alphaMatrix")}
                className={`px-6 py-3 rounded-t-xl text-base font-bold flex items-center transition-colors ${viewTab === "alphaMatrix" ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Cpu className="w-5 h-5 inline mr-2" />
                個股微觀 Alpha 矩陣
              </button>
              <button
                onClick={() => setViewTab("portfolio")}
                className={`px-6 py-3 rounded-t-xl text-base font-bold flex items-center transition-colors ${viewTab === "portfolio" ? "bg-slate-800 text-amber-500 border-slate-700 border-t border-x" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Briefcase className="w-5 h-5 inline mr-2" />
                投資組合
              </button>
            </div>

            {/* Mobile Navigation Tabs */}
            <div className="flex sm:hidden flex-col gap-2 border-b border-slate-800/50 pb-3">
              <div className="relative w-full overflow-hidden bg-slate-950/40 p-1 rounded-xl border border-slate-800/50 shadow-inner">
                {/* Horizontal side scroll fade indicators */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-950 to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-950 to-transparent z-10" />
                
                <div className="flex gap-1 overflow-x-auto scrollbar-hide no-scrollbar py-0.5 px-1 scroll-smooth">
                  {[
                    { id: "report", label: "智能報告", icon: FileText },
                    { id: "screener", label: "篩選器", icon: Filter },
                    { id: "screenerWatchlist", label: "精選名單", icon: List },
                    { id: "macroFilter", label: "大盤濾網", icon: Activity },
                    { id: "alphaMatrix", label: "Alpha 矩陣", icon: Cpu },
                    { id: "portfolio", label: "投資組合", icon: Briefcase }
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = viewTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setViewTab(tab.id as any)}
                        style={{ height: '44px' }}
                        className={`flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-black tracking-tight transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-amber-600/15 text-amber-400 border border-amber-500/30 shadow-md"
                            : "bg-transparent text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                      >
                        <TabIcon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-500"}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {viewTab === "report" && (
              <div className="text-center py-24 opacity-20 flex flex-col items-center">
                <Layers className="w-24 h-24 mb-6" />
                <p className="text-2xl font-black">等待查詢中...</p>
              </div>
            )}
            
            {viewTab === "macroFilter" && (
              <div className="animate-in fade-in duration-300">
                <MacroFilterView />
              </div>
            )}
            
            {viewTab === "alphaMatrix" && (
              <div className="animate-in fade-in duration-300 bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-2xl mx-auto text-center space-y-6 shadow-xl">
                <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <Cpu className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-200">未偵測到分析中的個股 ⚠️</h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                    「個股微觀 Alpha 矩陣」需要公司個體數據才能啟動。請先在上方輸入股票代號（例如 <span className="text-amber-500 font-bold">NVDA</span> 或 <span className="text-amber-400 font-bold">AAPL</span>）並點擊「完整週期分析」研究。
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs text-slate-500 leading-relaxed text-left space-y-2">
                  <div className="font-bold text-slate-400 flex items-center gap-1">
                     <Compass className="w-4 h-4 text-amber-500" />
                    量化分析模型流程概要：
                  </div>
                  <p>● <strong>第一步：大盤環境濾網</strong> — 利用 40 訊號模型計算曝險，若分數 &lt; 0.4 自動調降 70% 權重或實施單一持倉 2% 限制。</p>
                  <p>● <strong>第二步：個股微觀 Alpha 矩陣</strong> — 從基本面、籌碼情緒與技術動能 3 大維度提取 8 大核心因子建立定量評分卡。</p>
                  <p>● <strong>第三步：個股部位權重優化</strong> — 動態融合（Sizing = Base_Weight * Stock_Score * Market_Exposure_Factor）進行部位映射。</p>
                </div>
              </div>
            )}

            {viewTab === "portfolio" && (
              <div className="animate-in fade-in duration-300">
                <PortfolioView
                  currentPrices={cachedPrices}
                  gdUser={gdUser}
                  gdToken={gdToken}
                  onGoogleDriveLogin={handleGoogleDriveLogin}
                />
              </div>
            )}

            {(viewTab === "screener" || viewTab === "screenerWatchlist") && (
                <PriceScreener
                  isWatchlistMode={viewTab === "screenerWatchlist"}
                  selectedScreenerItems={selectedScreenerItems}
                  onToggleScreenerItem={toggleScreenerItem}
                  onImportLocal={() => setShowWatchlistImportModal(true)}
                  onExportLocal={() => setShowWatchlistExportModal(true)}
                />
            )}
          </div>
        ) : null}
      </main>

      <PortfolioModal
        isOpen={showPortfolio}
        onClose={() => setShowPortfolio(false)}
        trades={trades}
        watchlist={watchlist}
        currentPrices={cachedPrices}
        onDeleteTrade={(id: any) => {
          setTrades((t) => t.filter((x) => x.id !== id));
          if (gdUser) {
            deleteTradeFromFirestore(gdUser.uid, id);
          }
        }}
        onDeleteWatch={(s: any) => {
          setWatchlist((w) => w.filter((x) => x.symbol !== s));
          if (gdUser) {
            deleteWatchlistItemFromFirestore(gdUser.uid, s);
          }
        }}
        onRefresh={refreshPrices}
        isUpdating={updatingPrices}
        onSyncToCloud={syncCloud}
        cloudStatus={cloudStatus}
        onExport={handleExport}
        onImport={handleImport}
        onAddTrade={handleTrade}
        isUpdatingWatchlist={updatingWatchlist}
        watchlistUpdateProgress={watchlistUpdateProgress}
        onUpdateAllWatchlistRatings={handleUpdateAllWatchlistRatings}
        onDeleteWatchHistory={handleDeleteWatchHistory}
        onClearWatchHistory={handleClearWatchHistory}
        user={gdUser}
        token={gdToken}
        onLogin={handleGoogleDriveLogin}
        onLogout={handleGoogleDriveLogout}
        onLoadBackup={handleLoadGoogleDriveBackup}
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

      {/* Export Options Modal */}
      <AnimatePresence>
        {showWatchlistExportModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWatchlistExportModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl z-10 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <button onClick={() => setShowWatchlistExportModal(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2 tracking-wide"><Download className="w-5 h-5 text-amber-500" /> 匯出精選名單</h3>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    handleExportSelected();
                    setShowWatchlistExportModal(false);
                  }}
                  className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-amber-500/50 transition-all font-bold text-white group"
                >
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-amber-500" /> 備份至本機 (JSON)
                </button>
                <button
                  onClick={handleDriveExportSelected}
                  disabled={watchlistCloudLoading}
                  className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-sky-500/50 transition-all font-bold text-white group disabled:opacity-50"
                >
                  {watchlistCloudLoading ? <Loader2 className="w-5 h-5 animate-spin text-sky-400" /> : <CloudUpload className="w-5 h-5 text-slate-400 group-hover:text-sky-400" />} 備份至 Google Drive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Options Modal */}
      <AnimatePresence>
        {showWatchlistImportModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWatchlistImportModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl z-10 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <button onClick={() => setShowWatchlistImportModal(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2 tracking-wide"><CloudUpload className="w-5 h-5 text-emerald-500" /> 匯入精選名單</h3>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    handleImportSelected();
                    setShowWatchlistImportModal(false);
                  }}
                  className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-emerald-500/50 transition-all font-bold text-white group"
                >
                  <FileUp className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" /> 從本機備份匯入 (JSON)
                </button>
                <button
                  onClick={handleDriveImportSelected}
                  disabled={watchlistCloudLoading}
                  className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-sky-500/50 transition-all font-bold text-white group disabled:opacity-50"
                >
                  {watchlistCloudLoading ? <Loader2 className="w-5 h-5 animate-spin text-sky-400" /> : <CloudDownload className="w-5 h-5 text-slate-400 group-hover:text-sky-400" />} 從 Google Drive 匯入
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GoogleDriveModal
        isOpen={showGoogleDrive}
        onClose={() => setShowGoogleDrive(false)}
        user={gdUser}
        token={gdToken}
        onLogin={handleGoogleDriveLogin}
        onLogout={handleGoogleDriveLogout}
        trades={trades}
        watchlist={watchlist}
        onLoadBackup={handleLoadGoogleDriveBackup}
        isLoggingIn={isLoggingIn}
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
