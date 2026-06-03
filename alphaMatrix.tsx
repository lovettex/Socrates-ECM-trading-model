import React, { useState, useEffect, useMemo } from "react";

import { getQuotaErrorMessage } from "./utils";

// --- GoogleGenAI Server Proxy Class ---
export enum Type {
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT"
}

class GoogleGenAI {
  constructor(config?: { apiKey?: string }) {}
  get models() {
    return {
      generateContent: async (params: { model: string; contents: any; config?: any }) => {
        const response = await fetch("/api/gemini/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
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
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Cpu,
  Bookmark,
  CheckCircle,
  AlertTriangle,
  Info,
  DollarSign,
  Briefcase,
  Users,
  Compass,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Lock,
  RefreshCw,
  Scale
} from "lucide-react";

// --- Interfaces for Stock Alpha Matrix ---

export interface AlphaMatrixResult {
  symbol: string;
  name: string;
  fundamentals: {
    operatingMarginYoY: number; // YoY Margin growth (%)
    operatingMarginYoYExplain: string;
    operatingMarginYoYScore: number; // 0 to 10
    fcfYield: number; // FCF Yield (%)
    fcfYieldExplain: string;
    fcfYieldScore: number; // 0 to 10
    pegPercentile: number; // PEG Percentile (0 to 100)
    pegPercentileExplain: string;
    pegPercentileScore: number; // 0 to 10
  };
  sentiment: {
    insiderNetBuy: "買入" | "賣出" | "無";
    insiderNetBuyExplain: string;
    insiderNetBuyScore: number; // 0 to 10
    forwardEpsRevision: number; // Upward revision ratio (%)
    forwardEpsRevisionExplain: string;
    forwardEpsRevisionScore: number; // 0 to 10
    nlpSentiment: number; // NLP sentiment score (-1.0 to 1.0)
    nlpSentimentExplain: string;
    nlpSentimentScore: number; // 0 to 10
  };
  dynamics: {
    rsIndicator60d: number; // 60-day relative strength vs S&P 500 (0 to 100)
    rsIndicator60dExplain: string;
    rsIndicator60dScore: number; // 0 to 10
    above200MA: boolean; // true if above 200 MA
    atrConsolidation: "收斂 (Coiled)" | "擴張 (Expanding)" | "盤整 (Neutral)";
    atrExplain: string;
    dynamicsScoreByIndicator: number; // 0 to 10
  };
  totalStockScore: number; // Consolidated score (0.0 to 10.0)
  executiveSummary: string;
}

interface AlphaMatrixViewProps {
  symbol: string;
  stockName?: string;
  // Let's pass parameters to compute the first step (Regime Filter)
  macroBeta?: number;
  macroAlpha?: number;
  macroPredExcess?: number;
}

export const AlphaMatrixView: React.FC<AlphaMatrixViewProps> = ({
  symbol,
  stockName = "",
  macroBeta = 0.806,
  macroAlpha = 2.5,
  macroPredExcess = 0.278
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AlphaMatrixResult | null>(null);

  // Dynamic Portfolio Optimizer sliders for the 3rd step
  const [baseWeight, setBaseWeight] = useState<number>(10.0); // Default 10%
  const [defenseStrategy, setDefenseStrategy] = useState<"cut" | "cap">("cut"); // Fully custom portfolio option

  // First step: Calculate Regime Exposure Factor based on the 40-signal model
  const macroExposure = useMemo(() => {
    const raw = macroBeta + macroAlpha * macroPredExcess;
    return Math.max(0.0, Math.min(2.0, raw));
  }, [macroBeta, macroAlpha, macroPredExcess]);

  // Is force defense triggered? Exposure < 0.4
  const isForceDefenseTriggered = useMemo(() => {
    return macroExposure < 0.4;
  }, [macroExposure]);

  // Query Gemini to compute individual micro alphas with Search Grounding
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI();

      const prompt = `You are an elite quantitative analyst and global macro signal researcher.
      Perform an in-depth, company-specific "Micro Alpha Matrix" (個股微觀 Alpha 矩陣) assessment for the stock symbol "${symbol}" (${stockName || "current stock"}).
      
      Use your built-in Google Search capability to ground your values in real and recent market information, quarterly earnings statements, insider trade filings (Form 4), earnings call transcripts, and technician reports from the past 1 to 3 months.
      
      Evaluate the following 3 groups of features down to the individual corporate level to construct a "Stock Rating Card" (個股評分卡), assigning score values (0.00 to 10.00) and humanized, data-backed 1-sentence explanations.
      
      Category 1: Individual Fundamentals (基本面因子)
      - Operating Margin YoY (季報營業利益率年增率 YoY): Determine if YoY change is > 0.
      - Free Cash Flow Yield (自由現金流殖利率).
      - PEG Valuation Percentile (PEG 估值分位數): Assess PEG ratio relative to history/peers.

      Category 2: Individual Sentiment (籌碼情緒因子)
      - Insider Net Activity (內部人過去一個月淨活動): Did insiders net buy ("買入"), net sell ("賣出"), or have no major trades ("無").
      - Forward EPS Upward Revision (分析師遠期盈餘 Forward EPS 預估上修比例): Revision percentage.
      - Earnings Call NLP Score (法說會文字情感分析分數): Sentiment score (from -1.0 to +1.0) of the latest earnings call.

      Category 3: Individual Dynamics (技術動能因子)
      - 60-day Relative Strength Indicator (股價相對於標普 500 的 60 日相對強弱度 RS Indicator) (Scale of 0 to 100).
      - Price above 200MA and ATR coiling (股價是否站上 200 日均線 & 平均真實波幅 ATR 是否收斂).
      
      Combine these inputs and provide a final consolidate score "totalStockScore" from 0.0 to 10.0, and a concise 2-sentence Chinese summary in executiveSummary.
      
      Return ONLY a JSON object matching this structure. Use clean, professional Taiwanese Traditional Chinese for explanatory texts. No markdown formatting around the output, just raw JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              fundamentals: {
                type: Type.OBJECT,
                properties: {
                  operatingMarginYoY: { type: Type.NUMBER },
                  operatingMarginYoYExplain: { type: Type.STRING },
                  operatingMarginYoYScore: { type: Type.NUMBER },
                  fcfYield: { type: Type.NUMBER },
                  fcfYieldExplain: { type: Type.STRING },
                  fcfYieldScore: { type: Type.NUMBER },
                  pegPercentile: { type: Type.NUMBER },
                  pegPercentileExplain: { type: Type.STRING },
                  pegPercentileScore: { type: Type.NUMBER },
                },
                required: [
                  "operatingMarginYoY",
                  "operatingMarginYoYExplain",
                  "operatingMarginYoYScore",
                  "fcfYield",
                  "fcfYieldExplain",
                  "fcfYieldScore",
                  "pegPercentile",
                  "pegPercentileExplain",
                  "pegPercentileScore",
                ],
              },
              sentiment: {
                type: Type.OBJECT,
                properties: {
                  insiderNetBuy: { type: Type.STRING }, // "買入" | "賣出" | "無"
                  insiderNetBuyExplain: { type: Type.STRING },
                  insiderNetBuyScore: { type: Type.NUMBER },
                  forwardEpsRevision: { type: Type.NUMBER },
                  forwardEpsRevisionExplain: { type: Type.STRING },
                  forwardEpsRevisionScore: { type: Type.NUMBER },
                  nlpSentiment: { type: Type.NUMBER }, // -1 to 1
                  nlpSentimentExplain: { type: Type.STRING },
                  nlpSentimentScore: { type: Type.NUMBER },
                },
                required: [
                  "insiderNetBuy",
                  "insiderNetBuyExplain",
                  "insiderNetBuyScore",
                  "forwardEpsRevision",
                  "forwardEpsRevisionExplain",
                  "forwardEpsRevisionScore",
                  "nlpSentiment",
                  "nlpSentimentExplain",
                  "nlpSentimentScore",
                ],
              },
              dynamics: {
                type: Type.OBJECT,
                properties: {
                  rsIndicator60d: { type: Type.NUMBER },
                  rsIndicator60dExplain: { type: Type.STRING },
                  rsIndicator60dScore: { type: Type.NUMBER },
                  above200MA: { type: Type.BOOLEAN },
                  atrConsolidation: { type: Type.STRING }, // "收斂 (Coiled)" | "擴張 (Expanding)" | "盤整 (Neutral)"
                  atrExplain: { type: Type.STRING },
                  dynamicsScoreByIndicator: { type: Type.NUMBER },
                },
                required: [
                  "rsIndicator60d",
                  "rsIndicator60dExplain",
                  "rsIndicator60dScore",
                  "above200MA",
                  "atrConsolidation",
                  "atrExplain",
                  "dynamicsScoreByIndicator",
                ],
              },
              totalStockScore: { type: Type.NUMBER },
              executiveSummary: { type: Type.STRING },
            },
            required: ["symbol", "name", "fundamentals", "sentiment", "dynamics", "totalStockScore", "executiveSummary"],
          },
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim()) as AlphaMatrixResult;
        setResult(parsed);
      } else {
        throw new Error("模型未返回有效文本");
      }
    } catch (err: any) {
      console.error(err);
      setError(getQuotaErrorMessage(err?.message || err?.toString() || "無法獲取 Alpha 矩陣。請確認 API 金鑰有效或稍後重試。"));
    } finally {
      setLoading(false);
    }
  };

  // Run on mount or when symbol changes
  useEffect(() => {
    if (symbol) {
      runAnalysis();
    }
  }, [symbol]);

  // Step 3 Calculations: Portfolio Weight Optimization
  // Formula: Individual_Weight = Base_Weight * (Stock_Score / 10) * (Market_Exposure_Factor)
  // Base portfolio sizing is entered as %, Stock Score is 0-10, so scale by Stock_Score/10. Market_Exposure_Factor goes 0.0 - 2.0x.
  const rawIndividualWeight = useMemo(() => {
    if (!result) return 0.0;
    // StockScore is scaled (result.totalStockScore / 10), exposure is raw factor
    return baseWeight * (result.totalStockScore / 10.0) * macroExposure;
  }, [result, baseWeight, macroExposure]);

  // Handle Force Defense Sizing Caps/Reduction
  // If macroExposure < 0.4:
  // Option 1 (cut): Complete 70%減倉 -> Weight * 0.3
  // Option 2 (cap): Single holding <= 2% max holding -> Math.min(Weight, 2.0)
  const finalOptimizedWeight = useMemo(() => {
    if (!isForceDefenseTriggered) {
      return rawIndividualWeight;
    }
    if (defenseStrategy === "cut") {
      return rawIndividualWeight * 0.3; // 70% off
    } else {
      return Math.min(rawIndividualWeight, 2.0); // 2% max cap
    }
  }, [rawIndividualWeight, isForceDefenseTriggered, defenseStrategy]);

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-6 md:p-8 space-y-8 shadow-xl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <Cpu className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-200">
                個股微觀 Alpha 矩陣 (Micro Alpha Matrix)
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                擇時與選股的動態融合投資組合優化器 • 標的: <strong className="text-amber-500 font-mono text-base">{symbol}</strong> {result?.name && `(${result.name})`}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/40 text-slate-300 rounded-xl transition-all border border-slate-700 text-sm font-bold min-w-[124px]"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          ) : (
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          )}
          重新整理矩陣
        </button>
      </div>

      {loading && (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
          <div className="text-center">
            <h4 className="text-lg font-bold text-slate-300">正在建立 "{symbol}" 的微觀評分卡...</h4>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              正在透過 Google Search 檢索最新季報毛利率、分析師預估上修、內部人申報 filings 以及法說會文字，請稍候。
            </p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-red-400">連線或解析失敗</h5>
            <p className="text-sm text-slate-400">{error}</p>
            <button
              onClick={runAnalysis}
              className="mt-3 px-4 py-1.5 bg-red-950/50 hover:bg-red-900/50 border border-red-800 rounded-lg text-xs font-bold transition-transform text-red-300"
            >
              再試一次
            </button>
          </div>
        </div>
      )}

      {!loading && !error && result && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-[#111e36] to-[#0f172a] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Bookmark className="w-32 h-32 text-amber-500" />
            </div>
            <div className="relative space-y-2">
              <span className="text-amber-500 text-xs font-bold uppercase tracking-widest block">一鍵策略摘要 (Executive Summary)</span>
              <p className="text-slate-200 text-base leading-relaxed font-medium">
                {result.executiveSummary}
              </p>
              <div className="pt-2 flex items-center gap-6">
                <div>
                  <span className="text-xs text-slate-500">個股微觀綜合得分 (Stock Score)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-amber-500">{result.totalStockScore.toFixed(2)}</span>
                    <span className="text-sm text-slate-400">/ 10.0</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-800" />
                <div>
                  <span className="text-xs text-slate-500">當前大盤曝險分數 (Market Exposure)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-emerald-400">{macroExposure.toFixed(2)}</span>
                    <span className="text-sm text-slate-400">/ 2.0x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* THREE-STEP FLOW GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* STEP 1: REGIME FILTER */}
            <div className="border border-slate-800 rounded-2xl p-5 bg-slate-950/50 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h3 className="font-bold text-slate-200 text-base">第一步：大盤環境濾網</h3>
                  </div>
                  <span className="text-xs text-slate-500">Regime Filter</span>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl space-y-3 border border-slate-800/60">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">當前 40 訊號曝險分數:</span>
                    <strong className="text-slate-200 font-mono text-lg">{macroExposure.toFixed(2)}x</strong>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isForceDefenseTriggered ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${(macroExposure / 2) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                    <span>0.0 (防禦)</span>
                    <span className="text-red-500">0.40門檻</span>
                    <span>2.0 (多頭)</span>
                  </div>
                </div>

                {isForceDefenseTriggered ? (
                  <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4" />
                      <span>強制防禦機制：已啟動！</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      由於大盤曝險分數 <span className="text-red-400 font-bold">{(macroExposure).toFixed(2)}</span> 小於 0.40，代表宏觀環境高波動或極度熊市，啟動保護限制：
                    </p>
                    <ul className="text-[11px] text-slate-500 list-disc list-inside space-y-1">
                      <li>個股多頭策略全面減倉 70%</li>
                      <li>或強制限制單一個股最大持倉上限 2%</li>
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>強制防禦機制：未觸發</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      大盤曝光分數為 <span className="text-emerald-400 font-bold">{(macroExposure).toFixed(2)}</span> 安全（≥ 0.40）。宏觀環境穩健，微觀 Alpha 模型可以發揮充分的進攻權重。
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
                <span>參數來源：40 訊號大盤模型</span>
                <span className="text-amber-500/90 font-bold">動態同步中</span>
              </div>
            </div>

            {/* STEP 2: INDIVIDUAL MICRO ALPHA CARD - LEFT OVERVIEW */}
            <div className="border border-slate-800 rounded-2xl p-5 bg-slate-950/50 col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h3 className="font-bold text-slate-200 text-base">第二步：個股微觀 Alpha 評分卡</h3>
                </div>
                <span className="text-xs text-slate-500">Stock Scorecard</span>
              </div>

              {/* Factors Layout: Three Subcategories */}
              <div className="space-y-4">
                
                {/* 1. Fundamentals */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> 基本面因子 (Fundamentals)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Item A */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">營業利益率 YoY</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${result.fundamentals.operatingMarginYoY > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {result.fundamentals.operatingMarginYoY > 0 ? "成長" : "衰退"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-200">{result.fundamentals.operatingMarginYoY.toFixed(1)}%</span>
                        <span className="text-[10px] text-slate-500 font-mono">YoY</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-[32px]">
                        {result.fundamentals.operatingMarginYoYExplain}
                      </p>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                        <span className="text-slate-500">因子得分</span>
                        <strong className="text-amber-500 font-mono">{result.fundamentals.operatingMarginYoYScore.toFixed(1)}</strong>
                      </div>
                    </div>

                    {/* Item B */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">自由現金流殖利率</span>
                        <span className="text-xs text-emerald-400 font-bold font-mono">FCF Yld</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-200">{result.fundamentals.fcfYield.toFixed(1)}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-[32px]">
                        {result.fundamentals.fcfYieldExplain}
                      </p>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                        <span className="text-slate-500">因子得分</span>
                        <strong className="text-amber-500 font-mono">{result.fundamentals.fcfYieldScore.toFixed(1)}</strong>
                      </div>
                    </div>

                    {/* Item C */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">PEG 估值分位數</span>
                        <span className="text-xs text-blue-400 font-mono">PEG</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-200">第 {result.fundamentals.pegPercentile.toFixed(0)}</span>
                        <span className="text-[10px] text-slate-500">分位</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-[32px]">
                        {result.fundamentals.pegPercentileExplain}
                      </p>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                        <span className="text-slate-500">因子得分</span>
                        <strong className="text-amber-500 font-mono">{result.fundamentals.pegPercentileScore.toFixed(1)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Sentiment */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1 pt-1">
                    <Users className="w-3.5 h-3.5" /> 籌碼情緒因子 (Sentiment)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Insider Activity */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">內部人過去一個月</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${result.sentiment.insiderNetBuy === "買入" ? "bg-emerald-500/10 text-emerald-400" : result.sentiment.insiderNetBuy === "賣出" ? "bg-red-500/10 text-red-400" : "bg-slate-800 text-slate-400"}`}>
                          {result.sentiment.insiderNetBuy}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-200">
                          {result.sentiment.insiderNetBuy === "無" ? "中性無交易" : `淨${result.sentiment.insiderNetBuy}`}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-[32px]">
                        {result.sentiment.insiderNetBuyExplain}
                      </p>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                        <span className="text-slate-500">因子得分</span>
                        <strong className="text-amber-500 font-mono">{result.sentiment.insiderNetBuyScore.toFixed(1)}</strong>
                      </div>
                    </div>

                    {/* Forward EPS Revisions */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">EPS 預估上修比例</span>
                        <span className="text-xs text-emerald-400 font-mono font-bold">Fwd EPS</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-200">{result.sentiment.forwardEpsRevision.toFixed(1)}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-[32px]">
                        {result.sentiment.forwardEpsRevisionExplain}
                      </p>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                        <span className="text-slate-500">因子得分</span>
                        <strong className="text-amber-500 font-mono">{result.sentiment.forwardEpsRevisionScore.toFixed(1)}</strong>
                      </div>
                    </div>

                    {/* NLP Sentiment */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">法說會 NLP 情感</span>
                        <span className={`text-[11px] font-bold font-mono ${result.sentiment.nlpSentiment > 0.2 ? "text-emerald-400" : result.sentiment.nlpSentiment < -0.2 ? "text-red-400" : "text-slate-400"}`}>
                          NLP: {result.sentiment.nlpSentiment.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-200">
                          {result.sentiment.nlpSentiment > 0.4 ? "極度樂觀" : result.sentiment.nlpSentiment > 0.1 ? "溫和偏多" : result.sentiment.nlpSentiment >= -0.1 ? "審慎中性" : "偏空看憂"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-[32px]">
                        {result.sentiment.nlpSentimentExplain}
                      </p>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                        <span className="text-slate-500">因子得分</span>
                        <strong className="text-amber-500 font-mono">{result.sentiment.nlpSentimentScore.toFixed(1)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Dynamics */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1 pt-1">
                    <Activity className="w-3.5 h-3.5" /> 技術動能因子 (Dynamics)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Item A */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">S&P 500 60日相對強弱</span>
                        <span className="text-xs text-indigo-400 font-mono">RS Level</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-200">RS {result.dynamics.rsIndicator60d.toFixed(0)}</span>
                        <span className="text-[10px] text-slate-500">/ 100</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-[32px]">
                        {result.dynamics.rsIndicator60dExplain}
                      </p>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                        <span className="text-slate-500">因子得分</span>
                        <strong className="text-amber-500 font-mono">{result.dynamics.rsIndicator60dScore.toFixed(1)}</strong>
                      </div>
                    </div>

                    {/* Item B */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">均線架構與 ATR 波動</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${result.dynamics.above200MA ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {result.dynamics.above200MA ? "MA200之上" : "MA200之下"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-slate-200">
                          波動率 {result.dynamics.atrConsolidation}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-[32px]">
                        {result.dynamics.atrExplain}
                      </p>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                        <span className="text-slate-500">技術綜合得分</span>
                        <strong className="text-amber-500 font-mono">{result.dynamics.dynamicsScoreByIndicator.toFixed(1)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* STEP 3: PORTFOLIO WEIGHT OPTIMIZATION */}
          <div className="border border-slate-800 rounded-2xl p-6 bg-[#0c1322] space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h3 className="font-extrabold text-slate-200 text-lg">第三步：個股部位權重優化 (Portfolio Optimization)</h3>
              </div>
              <span className="text-xs text-slate-500">Dynamic Risk Adjustment</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Formula & Sliders Controls */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h4 className="font-bold text-slate-300 text-sm mb-1.5">個股實務部位計算公式：</h4>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                    <code className="text-amber-400 font-bold font-mono text-sm inline-block max-w-full overflow-x-auto whitespace-pre">
                      Individual_Weight = Base_Weight * (Stock_Score / 10) * (Market_Exposure_Factor)
                    </code>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2">
                    只有當「大盤宏觀環境安全 (Market Exposure 因子高)」且「個股微觀因子得分高 (Stock Score 高)」時，模型才會允許滿格權重放大。完美解決牛市重倉、熊市空倉防線！
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Slider Base Weight */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-slate-400" />
                        微觀基準持倉上限 (Base_Weight)
                      </span>
                      <strong className="text-amber-500 font-mono text-base">{baseWeight.toFixed(1)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="30.0"
                      step="0.5"
                      value={baseWeight}
                      onChange={(e) => setBaseWeight(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>偏緊健 1.0%</span>
                      <span>正常 10.0%</span>
                      <span>最大集中 30.0%</span>
                    </div>
                  </div>

                  {/* Force Defense Strategy Toggle */}
                  {isForceDefenseTriggered && (
                    <div className="space-y-2 bg-red-950/20 border border-red-900/40 p-4 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                          <ShieldAlert className="w-4 h-4" /> 自訂防禦應變機制
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDefenseStrategy("cut")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${defenseStrategy === "cut" ? "bg-red-500 text-white border-red-600" : "bg-slate-950 border-slate-800 text-slate-400"}`}
                          >
                            減倉 70% 指令 
                          </button>
                          <button
                            onClick={() => setDefenseStrategy("cap")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${defenseStrategy === "cap" ? "bg-red-500 text-white border-red-600" : "bg-slate-950 border-slate-800 text-slate-400"}`}
                          >
                            單一限額 2.0%
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {defenseStrategy === "cut" 
                          ? "「強制減倉 70%」策略：原優化計算結果將乘上 0.3，保留精銳防守。" 
                          : "「強制單一持倉不超過 2.0%」上限防護圈，適用規避個股過度曝險。"}
                      </p>
                    </div>
                  )}

                </div>
              </div>

              {/* Dynamic Optimized Sizing Gauge */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                
                <span className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                  最終分配部位比例權重 (Optimized Sizing)
                </span>

                <div className="relative p-6 bg-slate-900/60 rounded-2xl border border-slate-800/80 w-full max-w-[240px]">
                  {/* Big Number display with color code */}
                  <div className={`text-5xl font-black tracking-tight font-mono ${finalOptimizedWeight >= 8.0 ? "text-emerald-400" : finalOptimizedWeight >= 3.0 ? "text-amber-500" : "text-sky-450"}`}>
                    {finalOptimizedWeight.toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold block mt-1.5">
                    個股實務配置建議權重
                  </span>
                </div>

                <div className="space-y-1 w-full text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>基準持倉 (Base Weight):</span>
                    <strong className="text-slate-300 font-mono">{baseWeight.toFixed(1)}%</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>個股微觀評分(Stock Score):</span>
                    <strong className="text-amber-400 font-mono">{(result.totalStockScore).toFixed(1)} /10</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>大盤曝險因子(Market Exposure):</span>
                    <strong className="text-emerald-400 font-mono">{macroExposure.toFixed(2)}x</strong>
                  </div>

                  <div className="pt-2 mt-2 border-t border-dashed border-slate-800 flex justify-between items-center font-bold">
                    <span>大盤公式計算結果:</span>
                    <strong className="text-slate-300 font-mono">{rawIndividualWeight.toFixed(2)}%</strong>
                  </div>

                  {isForceDefenseTriggered && (
                    <div className="pt-1 text-red-400 font-extrabold flex justify-between items-center text-[11px]">
                      <span>防禦修正後 (防禦觸發!):</span>
                      <span>{finalOptimizedWeight.toFixed(2)}%</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
