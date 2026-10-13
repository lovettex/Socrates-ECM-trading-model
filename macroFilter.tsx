import React, { useState, useEffect, useMemo } from "react";

// --- GoogleGenAI Server Proxy Class ---
import { getQuotaErrorMessage } from "./utils";
import { getActiveProvider } from "./llmProvider";

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
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Cpu,
  Database,
  Sliders,
  Play,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  LineChart,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Search,
  Loader2,
  Globe,
  Calculator,
} from "lucide-react";

// Types for Feature
interface FeatureMeta {
  code: string;
  name: string;
  category: "Technical (D)" | "Economic (E)" | "Volatility (V)" | "Sentiment (S)" | "Momentum (M)" | "Timing (T)" | "Proprietary (P)";
  value: string;
  zScore: number;
  desc: string;
  engMethod: string;
}

export const MacroFilterView = ({
  symbol,
  stockName,
}: {
  symbol?: string;
  stockName?: string;
}) => {
  // Quant parameters
  const [beta, setBeta] = useState<number>(0.806);
  const [alpha, setAlpha] = useState<number>(2.5);
  const [predExcess, setPredExcess] = useState<number>(0.278); // in % (e.g. 0.278%)
  const [featureSearch, setFeatureSearch] = useState<string>("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("All");

  // TradingView Indicator Predictor State
  const [rsiInput, setRsiInput] = useState<number>(58.4);
  const [macdInput, setMacdInput] = useState<number>(0.12);
  const [isFetchingTv, setIsFetchingTv] = useState<boolean>(false);
  const [fetchTvError, setFetchTvError] = useState<string | null>(null);
  const [fetchSuccessMsg, setFetchSuccessMsg] = useState<string | null>(null);

  // TradingView Heatmap Sizing Estimator State
  const [tvHeatmapSector, setTvHeatmapSector] = useState<string>("");
  const [tvHeatmapIndustry, setTvHeatmapIndustry] = useState<string>("");
  const [tvHeatmapPerf1W, setTvHeatmapPerf1W] = useState<number | null>(null);
  const [isAnalyzingHeatmap, setIsAnalyzingHeatmap] = useState<boolean>(false);
  const [heatmapSuccessMsg, setHeatmapSuccessMsg] = useState<string | null>(null);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [lastProcessedSymbol, setLastProcessedSymbol] = useState<string>("");

  const analyzeStockHeatmapAndSizing = async (targetSymbol: string) => {
    if (!targetSymbol) return;
    setIsAnalyzingHeatmap(true);
    setHeatmapError(null);
    setHeatmapSuccessMsg(null);
    try {
      const ai = new GoogleGenAI();
      const tvUrl = `https://www.tradingview.com/symbols/${targetSymbol.toUpperCase()}/`;
      
      const prompt = `You are a professional quantitative financial analyst and AI engineer. Your task is to accurately discover and define the official sector and industry classification for the stock ticker "${targetSymbol}" inside TradingView, by meticulously following the following two precise procedures:

[Procedure 1: TradingView Stock Overview Page - Direct Retrieval]
1. Search on Google or look up the official TradingView stock overview info page (e.g., https://www.tradingview.com/symbols/${targetSymbol.toUpperCase()}/ or similar).
2. Find the "About" section of the stock (e.g. "About Sea Limited" or similar).
3. Directly read the official classification labels defined under the Key Stats or Profile:
   - "Sector" (e.g. "Retail Trade")
   - "Industry" (e.g. "Internet Retail")

[Procedure 2: TradingView Stock Heatmap Cross-Verification]
1. Access the TradingView Stock Heatmap (https://www.tradingview.com/heatmap/stock/).
2. Mentally set Group By to "Sector", and query the symbol "${targetSymbol}". Observe which main sector card context it is positioned in (e.g., Retail Trade).
3. Set Group By to "Industry", query the symbol "${targetSymbol}". Observe which fine-grained industry grouping group it belongs to (e.g., Internet Retail).

Please also integrate:
4. Find the LATEST 1-Week (1W) Performance on the TradingView Heatmap (Performance 1W view) for this stock or sector/industry as a decimal number (e.g. if it is +3.42%, return 3.42. If it is -1.5%, return -1.5).
5. Recommend and estimate a suitable Beta (ß) and Alpha (a) based on the following specific rulesets:
   - Beta (ß) rules:
     - Volatility of sector/stock (e.g. Technology, Chip, Semiconductor, EV such as NVDA, TSLA) -> ß ≈ 1.2 to 2.0 (Nvidia/Tesla is ~2.0).
     - Moderate volatility sector/stock (e.g. Finance, Retail, Industrials, AAPL/MSFT moderate growth) -> ß ≈ 0.9 to 1.15.
     - Defensive/low volatility sectors (e.g. Utilities, Consumer Staples, Healthcare like KO, PEP, JNJ) -> ß ≈ 0.5 to 0.75.
     Provide a reasonable estimated Beta (ß) representing this specific stock's typical business volatility.
   - Alpha (a) rules:
     - Significant price movement: if the stock/sector's 1-Week performance from the Heatmap is high (change > +2% or < -2%), set a to an active/higher level (e.g. a ≈ 2.0 to 3.0).
     - Neutral / moderate movement: if 1W return is near 0% (within ±1%), set a to a neutral level (a ≈ 1.0).
     - Otherwise set dynamic scaling (between 1.0 and 2.0).

Return ONLY a raw JSON object matching the requested schema, without markdown formatting or backticks:
{
  "sector": "string",
  "industry": "string",
  "performance1W": number,
  "estimatedBeta": number,
  "estimatedAlpha": number,
  "explanation": "string"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sector: { type: Type.STRING },
              industry: { type: Type.STRING },
              performance1W: { type: Type.NUMBER },
              estimatedBeta: { type: Type.NUMBER },
              estimatedAlpha: { type: Type.NUMBER },
              explanation: { type: Type.STRING }
            },
            required: ["sector", "industry", "performance1W", "estimatedBeta", "estimatedAlpha", "explanation"]
          }
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (typeof parsed.estimatedBeta === "number" && typeof parsed.estimatedAlpha === "number") {
          setBeta(parsed.estimatedBeta);
          setAlpha(parsed.estimatedAlpha);
          setTvHeatmapSector(parsed.sector);
          setTvHeatmapIndustry(parsed.industry || "");
          setTvHeatmapPerf1W(parsed.performance1W);
          setHeatmapSuccessMsg(`自動同步成功！板塊【${parsed.sector} - ${parsed.industry}】。1W 績效約為 ${parsed.performance1W >= 0 ? "+" : ""}${parsed.performance1W}%。已依板塊屬性與漲跌幅深度估算 𝛽 = ${parsed.estimatedBeta}x 且 𝛼 = ${parsed.estimatedAlpha}x。`);
        } else {
          throw new Error("數據規格異常");
        }
      } else {
        throw new Error("無法取得搜尋預測結果");
      }
    } catch (err: any) {
      console.error(err);
      setHeatmapError(getQuotaErrorMessage(err.message || err.toString() || "網頁搜尋與 Heatmap 定量分析異常。"));
    } finally {
      setIsAnalyzingHeatmap(false);
    }
  };

  // Run automatically when the prop symbol changes
  useEffect(() => {
    if (symbol && symbol !== lastProcessedSymbol) {
      setLastProcessedSymbol(symbol);
      analyzeStockHeatmapAndSizing(symbol);
    }
  }, [symbol, lastProcessedSymbol]);

  // Convert RSI & MACD to predExcess according to user's specified rules:
  // 1. RSI > 70 -> -0.30%, RSI < 30 -> +0.30%, else 0%
  // 2. MACD > 0 -> +0.10%, MACD < 0 -> -0.10%, else 0%
  const calculatedPredExcess = useMemo(() => {
    let rsiCont = 0.0;
    if (rsiInput > 70) {
      rsiCont = -0.30;
    } else if (rsiInput < 30) {
      rsiCont = 0.30;
    } else {
      rsiCont = 0.00;
    }

    let macdCont = 0.0;
    if (macdInput > 0) {
      macdCont = 0.10;
    } else if (macdInput < 0) {
      macdCont = -0.10;
    }

    return parseFloat((rsiCont + macdCont).toFixed(2));
  }, [rsiInput, macdInput]);

  // Sync automatically to predExcess when the calculated result updates
  useEffect(() => {
    setPredExcess(calculatedPredExcess);
  }, [calculatedPredExcess]);

  // Interactive training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStep, setTrainingStep] = useState(0);
  const [trainTimeSplit, setTrainTimeSplit] = useState(1);
  const [mseLGB, setMseLGB] = useState(0.04523);
  const [mseXG, setMseXG] = useState(0.04681);
  const [mseRidge, setMseRidge] = useState(0.04912);
  const [trainComplete, setTrainComplete] = useState(false);

  // Accordion active category
  const [openCategory, setOpenCategory] = useState<string | null>("Technical (D)");

  // Pipeline execution simulated state
  const [pipelineFinished, setPipelineFinished] = useState(true);
  const [lastPipelineUpdate, setLastPipelineUpdate] = useState("今日 16:30 (收盤後自動執行)");
  const [isRefreshingPipeline, setIsRefreshingPipeline] = useState(false);

  // Backtest Hover data state
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

  // Recalculations
  const rawExposure = useMemo(() => {
    // predExcess is in % e.g. 0.278% = 0.00278. Let's express math as: beta + alpha * (predExcess * 10 / 100) or directly beta + alpha * (predExcess / 100 * 100)
    // To match user's formula: Raw Exposure = beta + alpha * pred_excess.
    // If pred_excess is a small premium or excess return ratio (e.g. 0.278% = 0.00278) or if it is treated as a scaled score.
    // Let's use the literal formula: raw_exposure = beta + alpha * pred_excess
    // If alpha=2.5, beta=0.806, pred_excess = 0.278, raw = 0.806 + 2.5 * 0.278 = 1.501
    return beta + alpha * predExcess;
  }, [beta, alpha, predExcess]);

  const clippedExposure = useMemo(() => {
    return Math.max(0.0, Math.min(2.0, rawExposure));
  }, [rawExposure]);

  // Handle Training Simulation
  useEffect(() => {
    let timer: any;
    if (isTraining) {
      setTrainComplete(false);
      timer = setInterval(() => {
        setTrainingStep((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsTraining(false);
            setTrainComplete(true);
            setMseLGB(0.03812 + Math.random() * 0.001);
            setMseXG(0.03905 + Math.random() * 0.001);
            setMseRidge(0.04120 + Math.random() * 0.001);
            return 100;
          }
          // Cycle through time splits
          if (prev % 20 === 0 && prev > 0) {
            setTrainTimeSplit((s) => Math.min(5, s + 1));
          }
          return prev + 5;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isTraining]);

  const fetchTradingViewIndicators = async () => {
    setIsFetchingTv(true);
    setFetchTvError(null);
    setFetchSuccessMsg(null);
    try {
      const ai = new GoogleGenAI();
      const prompt = `Perform an online search to find the latest Daily (1D) RSI (14) and MACD indicator values for the S&P 500 Index (SPX or SPY) on TradingView or reputable financial websites within the past day. 
      Specifically locate:
      1. Daily S&P 500 RSI(14) level (for example 64.5 or 55.2).
      2. Daily S&P 500 MACD Line/Histogram value (for example +0.12 or -0.85).
      3. Cite the source web page or date you found it.

      Return ONLY a raw JSON object backing this structure, without any markdown formatting around it (no backticks).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rsi: { type: Type.NUMBER },
              macd: { type: Type.NUMBER },
              source: { type: Type.STRING },
              lastUpdate: { type: Type.STRING }
            },
            required: ["rsi", "macd", "source", "lastUpdate"]
          }
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (typeof parsed.rsi === "number" && typeof parsed.macd === "number") {
          setRsiInput(parsed.rsi);
          setMacdInput(parsed.macd);
          setFetchSuccessMsg(`成功同步 TradingView 大盤數據！ (來源: ${parsed.source} | ${parsed.lastUpdate})`);
        } else {
          throw new Error("數據解析異常，RSI 或 MACD 規格不符");
        }
      } else {
        throw new Error("未搜尋到最新的技術指標");
      }
    } catch (err: any) {
      console.error(err);
      setFetchTvError(getQuotaErrorMessage(err.message || err.toString() || "無法連線至網頁或剖析數據。請使用下方表單手動填入數值。"));
    } finally {
      setIsFetchingTv(false);
    }
  };

  const startModelTraining = () => {
    setTrainingStep(0);
    setTrainTimeSplit(1);
    setIsTraining(true);
  };

  const resetParams = () => {
    setBeta(0.806);
    setAlpha(2.5);
    setPredExcess(0.278);
  };

  const handleRefreshPipeline = () => {
    setIsRefreshingPipeline(true);
    setTimeout(() => {
      setIsRefreshingPipeline(false);
      setPipelineFinished(true);
      const now = new Date();
      setLastPipelineUpdate(`今日 ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")} (手動觸發連網更新)`);
    }, 1500);
  };

  // 98 Feature Matrix sample subset (representing the full 98 dimensions)
  const featuresList: FeatureMeta[] = [
    // Technical
    {
      code: "D_SPY_MA200_DISP",
      name: "S&P 500 200日均線乖離率",
      category: "Technical (D)",
      value: "+2.48%",
      zScore: 1.15,
      desc: "測量標普 500 指數當前價格偏離 200日移動平均線之百分比，反映中長期超買/超賣。",
      engMethod: "計算滾動 200日均值與當前價比率，並進行歷史 Z-Score 標準化。",
    },
    {
      code: "D_RSI_14",
      name: "14日相對強弱指標 (RSI-14)",
      category: "Technical (D)",
      value: "58.4",
      zScore: 0.35,
      desc: "反映大盤短期動能與超買超賣警戒線。",
      engMethod: "滾動 14日漲跌幅平均，限制於 [0, 100] 區間，並常規 Z-Score 標準化。",
    },
    {
      code: "D_MACD_HIST_20",
      name: "MACD 柱狀體加速規",
      category: "Technical (D)",
      value: "+12.4",
      zScore: 0.65,
      desc: "偵測大盤價格動能的二階加速度與極值翻轉點。",
      engMethod: "指數平滑移動平均差值，結合滾動 20 日變動率 (ROC) 交叉標準化。",
    },
    {
      code: "D_SPY_ROC_10",
      name: "S&P 500 10日變動率",
      category: "Technical (D)",
      value: "+1.95%",
      zScore: 0.82,
      desc: "反映極短期市場追價傾向與動能因子。",
      engMethod: "計算滾動 10日價格變幅，進行極端值縮尾處理與 Z-Score 日分位計算。",
    },
    // Economic
    {
      code: "E_HOUSING_STARTS_YOY",
      name: "美國新屋開工率年增率",
      category: "Economic (E)",
      value: "+3.12%",
      zScore: -0.42,
      desc: "房地產前瞻景氣，反映實體經濟的信貸擴張與就業循環起點。",
      engMethod: "將月度發布的新屋開工數轉換為年增率(YoY)，並進行每日線性插值 (Linear Interpolation) 補齊。",
    },
    {
      code: "E_ISM_PMI_YOY",
      name: "ISM 製造業採購經理人指數年變動",
      category: "Economic (E)",
      value: "51.2 (YoY +0.8%)",
      zScore: 0.22,
      desc: "製造業龍頭信心與訂單循環的前瞻指標。",
      engMethod: "將月度製造業 PMI 指數轉化為與去年同期之變動差值，並進行滾動每日插值。",
    },
    {
      code: "E_UNEMP_CHANGE_3M",
      name: "失業率 3個月滾動變動差值",
      category: "Economic (E)",
      value: "+0.15%",
      zScore: -0.12,
      desc: "薩姆規則 (Sahm Rule) 的弱前置變數，評估勞動市場邊際轉折。",
      engMethod: "3個月均值減去前12個月最低失業率，插值轉日資料，並逆向轉換為 Z-Score 指標。",
    },
    {
      code: "E_INFL_CPI_CORE_YOY",
      name: "核心 CPI 年增率",
      category: "Economic (E)",
      value: "+3.24%",
      zScore: -0.85,
      desc: "通膨黏性與聯準會利率路徑的核心定錨項目。",
      engMethod: "核心消費物價指數非季节性調整年增率，線性插值轉換為每日序列。",
    },
    // Volatility
    {
      code: "V_VIX_SPOT",
      name: "VIX 恐慌指數現貨價格",
      category: "Volatility (V)",
      value: "14.52",
      zScore: -0.68,
      desc: "標普 500 指數未來 30 天隱含波動度，為多空情緒與黑天鵝警戒計費儀。",
      engMethod: "依據 CBOE 即時報價，計算日滾動分位數 (Daily Percentile) 並作極值截斷。",
    },
    {
      code: "V_VIX_FUTURES_CONTANGO",
      name: "VIX 近遠月期貨價差 (Contango)",
      category: "Volatility (V)",
      value: "+8.25%",
      zScore: 0.78,
      desc: "一般市況下遠月合約高於近月的正價差幅度。若大幅翻為逆價差 (Backwardation) 代表系統性流動性危機。",
      engMethod: "F2-F1 合約百分比價差，計算其 20 日移動變異數 (Rolling Variance) 作分位標註。",
    },
    {
      code: "V_VIX_ROLLING_VAR_20",
      name: "VIX 20日滾動變異數",
      category: "Volatility (V)",
      value: "1.12",
      zScore: -0.45,
      desc: "恐慌程度本身的動態不確定性，用於預警波動率暴拉的前戲。",
      engMethod: "滾動 20 日 VIX 變異數算術均值，再與歷史大週期分位數對齊。",
    },
    // Sentiment
    {
      code: "S_AAII_BULL_BEAR_RATIO",
      name: "AAII 散戶看漲/看跌情緒比率",
      category: "Sentiment (S)",
      value: "1.28",
      zScore: 0.52,
      desc: "美國散戶投資人協會的多空調查，為市場心理的反指標因子。",
      engMethod: "進行 5 日指數移動平均 (EMA-5) 來去除每日隨機調查雜訊。",
    },
    {
      code: "S_PUT_CALL_RATIO_EMA5",
      name: "美股選擇權 Put/Call 比率 5日EMA",
      category: "Sentiment (S)",
      value: "0.85",
      zScore: 0.32,
      desc: "市場看跌期權對看漲期權交易量的比比值，高值代表規避情緒濃厚，低值代表極致樂觀。",
      engMethod: "期權日成交量比值，經 EMA-5 指數平滑，過濾隨機對沖雜訊。",
    },
    {
      code: "S_INSIDER_NET_BUY_SELL",
      name: "公司內部人 1個月淨買入/賣出額",
      category: "Sentiment (S)",
      value: "-$124M (淨賣出)",
      zScore: -0.21,
      desc: "評估美股核心企業主管與董事內部淨交易，代表最懂企業的聰明資金動態。",
      engMethod: "申報明細每日累計，並進行 30日滾動常態化。",
    },
    // Momentum
    {
      code: "M_USD_COMMOD_CORR_20",
      name: "美元指數與大宗商品相關性",
      category: "Momentum (M)",
      value: "-0.78",
      zScore: -0.15,
      desc: "判斷全球資產與原材料流動性收縮或擴張，捕捉市場避險輪動規律。",
      engMethod: "20 日滾動皮爾森相關係數矩陣 (Rolling Correlation Matrix)，反映資產輪動。",
    },
    {
      code: "M_GOLD_SPY_RS_60",
      name: "黃金/美股 60日相對強度",
      category: "Momentum (M)",
      value: "0.94",
      zScore: 0.12,
      desc: "防禦性貴金屬與風險性美股的博弈動能，高值偏向防守配置。",
      engMethod: "資產對比價格比值，計算滾動 60 日相關變幅。",
    },
    // Timing
    {
      code: "T_TURN_OF_THE_MONTH",
      name: "月底/月初效應標記",
      category: "Timing (T)",
      value: "1.0 (生效中)",
      zScore: 1.0,
      desc: "歷史美股在每月最後兩個工作日至新月前三個工作日的資金淨流入超額統計。",
      engMethod: "二元特徵 (0 或 1 虛擬變數, Dummy Variables)，當處於對應交易日區間時設定為 1.0。",
    },
    {
      code: "T_FOMC_MEETING_ACTIVE",
      name: "FOMC 利率會議日前後 3日效應",
      category: "Timing (T)",
      value: "0.0 (未開啟)",
      zScore: 0.0,
      desc: "美聯儲公布決議前後的政策博弈、流動性預期重組與市場效應。",
      engMethod: "二元虛擬變量。會議前 3 交易日、當日及後 3 交易日為 1.0，其餘為 0.0。",
    },
    // Proprietary
    {
      code: "P_HULL_VALUATION_SPREAD",
      name: "Hull 專屬估值利差模型分位數",
      category: "Proprietary (P)",
      value: "Upper 82%",
      zScore: -0.92,
      desc: "對比 S&P 500 當前估值與經濟均衡估值的偏離差額，是中長線核心擇時因子。",
      engMethod: "採用 Winsorizing 處理（極端值縮尾在 1% 與 99% 區間），防止模型受極端異常估值數據干擾。",
    },
    {
      code: "P_EARNINGS_YIELD_VS_CORP_BOND",
      name: "盈餘殖利率對比企業投資級債利差",
      category: "Proprietary (P)",
      value: "-1.18%",
      zScore: -1.25,
      desc: "比較標普 500 實質盈餘收益率與 Moody's 投資級企业債券殖利率，判斷美股相較無風險/信用資產的性價比差距。",
      engMethod: "直接計算盈餘殖利率減投資級債殖利率，並加入 Winsorizing 高度去噪標準化。",
    }
  ];

  // Simulated 120-day S&P 500 index vs HTUS index backtest data
  const chartData = useMemo(() => {
    // Starting index at 100 for both
    let sp500 = 100;
    let htus = 100;
    const basePrices = [
      5050, 5062, 5040, 5055, 5080, 5095, 5078, 5060, 5072, 5090,
      5120, 5135, 5110, 5100, 5125, 5140, 5165, 5180, 5150, 5130,
      5145, 5158, 5170, 5195, 5210, 5235, 5220, 5205, 5218, 5240,
      5270, 5290, 5262, 5250, 5275, 5295, 5320, 5335, 5310, 5295,
      5312, 5328, 5340, 5365, 5380, 5405, 5390, 5375, 5388, 5410,
      5440, 5460, 5432, 5420, 5445, 5465, 5490, 5505, 5480, 5465,
      5482, 5498, 5510, 5535, 5550, 5575, 5560, 5545, 5558, 5580,
      5610, 5630, 5602, 5590, 5615, 5635, 5660, 5675, 5650, 5635,
      5652, 5668, 5680, 5705, 5720, 5745, 5730, 5715, 5728, 5750,
      5780, 5800, 5772, 5760, 5785, 5805, 5830, 5845, 5820, 5805,
      5822, 5838, 5850, 5875, 5890, 5915, 5900, 5885, 5898, 5920,
      5950, 5970, 5942, 5930, 5955, 5975, 6000, 6015, 5990, 5975,
    ];

    // Let's generate daily points
    const out = [];
    const baseExposure = [
      0.8, 0.9, 1.2, 0.5, 0.2, 0.0, 0.0, 0.5, 0.9, 1.1,
      1.5, 1.6, 1.4, 1.0, 0.8, 0.7, 1.1, 1.5, 1.2, 0.9,
      0.8, 0.9, 1.1, 1.3, 1.6, 1.8, 1.7, 1.2, 0.9, 0.8,
      0.9, 1.1, 1.5, 1.7, 1.9, 2.0, 1.8, 1.4, 0.9, 0.5,
      0.3, 0.2, 0.5, 0.9, 1.2, 1.5, 1.3, 1.0, 0.9, 0.8,
      0.9, 1.1, 1.4, 1.6, 1.8, 1.9, 1.7, 1.2, 0.8, 0.4,
      0.2, 0.1, 0.5, 0.9, 1.2, 1.5, 1.3, 1.0, 0.9, 0.8,
      0.9, 1.1, 1.4, 1.6, 1.8, 1.9, 1.7, 1.2, 0.8, 0.4,
      0.2, 0.1, 0.5, 0.9, 1.2, 1.5, 1.2, 0.9, 0.8, 0.7,
      0.7, 0.8, 1.1, 1.3, 1.6, 1.7, 1.5, 1.0, 0.7, 0.4,
      0.2, 0.2, 0.6, 1.0, 1.3, 1.6, 1.4, 1.0, 0.8, 0.7,
      0.8, 1.0, 1.3, 1.5, 1.7, 1.9, 1.8, 1.3, 0.9, 0.5,
    ];

    for (let i = 0; i < basePrices.length; i++) {
      const dateStr = `2026-${String(Math.floor(i / 22) + 1).padStart(2, "0")}-${String((i % 22) + 1).padStart(2, "0")}`;
      
      if (i === 0) {
        out.push({
          index: i,
          date: dateStr,
          spPrice: basePrices[i],
          spVal: 100,
          htusVal: 100,
          exposure: baseExposure[i],
        });
      } else {
        const prevSpPrice = basePrices[i - 1];
        const spPctChange = (basePrices[i] - prevSpPrice) / prevSpPrice;
        
        // S&P value gets standard pct return
        const newSpVal = out[i - 1].spVal * (1 + spPctChange);
        
        // HTUS value gets: prev_val * (1 + exposure * spPctChange) - subtracting slightly for swap borrowing fees if leverage > 1.0
        const currentExp = out[i - 1].exposure;
        const leverageCost = currentExp > 1.0 ? (currentExp - 1.0) * 0.00005 : 0; 
        const htusPctChange = currentExp * spPctChange - leverageCost + (currentExp === 0 ? 0.0001 : 0); // cash interest
        const newHtusVal = out[i - 1].htusVal * (1 + htusPctChange);

        out.push({
          index: i,
          date: dateStr,
          spPrice: basePrices[i],
          spVal: Number(newSpVal.toFixed(2)),
          htusVal: Number(newHtusVal.toFixed(2)),
          exposure: baseExposure[i],
        });
      }
    }
    return out;
  }, []);

  // Filter features
  const filteredFeatures = useMemo(() => {
    return featuresList.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.code.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.desc.toLowerCase().includes(featureSearch.toLowerCase());
      
      const matchesCategory =
        activeCategoryFilter === "All" || f.category.startsWith(activeCategoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [featureSearch, activeCategoryFilter]);

  // Compute stats on active hover index, or fallback to the latest day
  const activeDay = useMemo(() => {
    if (hoveredDataIndex !== null && chartData[hoveredDataIndex]) {
      return chartData[hoveredDataIndex];
    }
    return chartData[chartData.length - 1];
  }, [hoveredDataIndex, chartData]);

  // Calculate coordinates for SVG paths
  const svgWidth = 800;
  const svgHeight = 250;
  const padding = 35;

  const pointsCoordinates = useMemo(() => {
    const spPoints: string[] = [];
    const htPoints: string[] = [];
    const exposurePoints: string[] = [];

    // find min and max values to scale
    const allVals = chartData.flatMap((d) => [d.spVal, d.htusVal]);
    const maxVal = Math.max(...allVals) * 1.02;
    const minVal = Math.min(...allVals) * 0.98;

    const maxExp = 2.1;
    const minExp = -0.1;

    chartData.forEach((d, i) => {
      const x = padding + (i / (chartData.length - 1)) * (svgWidth - 2 * padding);
      
      // Val positioning (y goes from top to bottom)
      const spY = svgHeight - padding - ((d.spVal - minVal) / (maxVal - minVal)) * (svgHeight - 2 * padding);
      const htY = svgHeight - padding - ((d.htusVal - minVal) / (maxVal - minVal)) * (svgHeight - 2 * padding);
      
      // Exposure positioning (y goes from top to bottom)
      const expY = svgHeight - padding - ((d.exposure - minExp) / (maxExp - minExp)) * (svgHeight - 2 * padding);

      spPoints.push(`${x},${spY}`);
      htPoints.push(`${x},${htY}`);
      exposurePoints.push(`${x},${expY}`);
    });

    return {
      spPath: spPoints.join(" "),
      htPath: htPoints.join(" "),
      expPath: exposurePoints.join(" "),
    };
  }, [chartData, svgWidth, svgHeight]);

  return (
    <div className="space-y-6 text-slate-100 max-w-[1440px] mx-auto p-1 animate-in fade-in duration-300">
      
      {/* Upper Grid Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Core Live Meter Gauge */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl lg:col-span-4 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 w-48 h-48 bg-rose-500/5 blur-3xl rounded-full group-hover:bg-rose-500/10 transition-colors pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                Hull Tactical 模型即時量化
              </span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                HTUS 模型中樞
              </span>
            </div>

            <div className="pt-2 text-center">
              <span className="text-xs text-slate-500 font-bold block mb-1">明日預算標普500曝險倍數 (Exposure Target)</span>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className={`text-6xl font-black tracking-tight ${clippedExposure >= 1.5 ? "text-rose-500 shadow-rose-500/10" : clippedExposure >= 1.0 ? "text-amber-500" : clippedExposure >= 0.4 ? "text-sky-400" : "text-emerald-400"}`}>
                  {clippedExposure.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-slate-500">x</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-850 border border-slate-800 text-xs text-slate-300">
                大盤環境狀態:{" "}
                <strong className={clippedExposure >= 1.2 ? "text-rose-400" : clippedExposure >= 0.8 ? "text-amber-400" : "text-emerald-400"}>
                  {clippedExposure >= 1.5 ? "雙倍做多 (極度看漲)" : clippedExposure >= 1.1 ? "超額曝險多頭" : clippedExposure >= 0.8 ? "基線防守多頭" : clippedExposure >= 0.4 ? "減倉防禦" : "極度熊市，全現金防震"}
                </strong>
              </div>
            </div>
          </div>

          {/* Sizing Visual Indicator Bar */}
          <div className="space-y-2 mt-6 pt-4 border-t border-slate-800/80">
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>0.0x 全現金 (防禦)</span>
              <span>1.0x 基線 (SPY)</span>
              <span>2.0x 雙倍多頭 (SSO)</span>
            </div>
            <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 relative ${clippedExposure >= 1.5 ? "bg-gradient-to-r from-amber-500 to-rose-600" : clippedExposure >= 0.8 ? "bg-gradient-to-r from-sky-500 to-amber-500" : "bg-gradient-to-r from-emerald-500 to-sky-500"}`}
                style={{ width: `${(clippedExposure / 2.0) * 100}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/60 animate-ping" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium py-1">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>當前預測明日超額回報 ($pred\_excess$): <strong>{(predExcess).toFixed(3)}%</strong></span>
            </div>
          </div>

        </div>

        {/* Dynamic Sandbox & Parameter Control */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl lg:col-span-5 flex flex-col justify-between shadow-2xl relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                模型參數即時預測沙盒 (Sim-Simulation)
              </h3>
              <button
                onClick={resetParams}
                className="text-[10px] text-slate-500 hover:text-amber-500 font-bold flex items-center gap-1 transition-colors border border-slate-800 hover:border-amber-500/20 px-2 py-1 rounded bg-slate-950/40"
              >
                <RotateCcw className="w-3 h-3" /> 重設參數
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              透過手動調節核心量化變數，測試部位映射函數如何對「超額收益預測」及「基線多頭持倉」做出動態對沖或槓桿調整。
            </p>

            {symbol && (
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-amber-500 flex items-center gap-1.5 font-sans">
                    <Cpu className="w-4 h-4 animate-pulse text-amber-500" />
                    TradingView Heatmap 定量估算 ({symbol})
                  </span>
                  <button
                    onClick={() => analyzeStockHeatmapAndSizing(symbol)}
                    disabled={isAnalyzingHeatmap}
                    className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 text-amber-400 font-bold px-2 py-1 rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isAnalyzingHeatmap ? "同步中..." : "重新抓取 Heatmap"}
                  </button>
                </div>

                {isAnalyzingHeatmap ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-[11px] text-slate-400 font-sans">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>大盤 Heatmap 運算中... 正在智能定位 {symbol} 的板塊及 1Week 績效...</span>
                  </div>
                ) : (
                  <div className="space-y-2 font-sans">
                    {heatmapError && (
                      <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                        ⚠️ {heatmapError}
                      </div>
                    )}
                    
                    {heatmapSuccessMsg ? (
                      <div className="space-y-2">
                        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mt-1 shrink-0" />
                          <span>{heatmapSuccessMsg}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60 font-mono text-[10px]">
                          <div>
                            <span className="text-slate-500 block">TV Heatmap 板塊:</span>
                            <span className="text-slate-200 font-bold">{tvHeatmapSector || "--"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">TV Heatmap 行業:</span>
                            <span className="text-slate-200 font-bold">{tvHeatmapIndustry || "--"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">產業 1-Week 績效:</span>
                            <span className={`font-bold ${tvHeatmapPerf1W !== null && tvHeatmapPerf1W >= 0 ? "text-rose-450" : "text-sky-400"}`}>
                              {tvHeatmapPerf1W !== null ? `${tvHeatmapPerf1W >= 0 ? "+" : ""}${tvHeatmapPerf1W.toFixed(2)}%` : "--"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 leading-relaxed italic">
                        未偵測到此股的 Heatmap 數據。點擊上方「重新抓取 Heatmap」以發動 Web-Search 分類，自動重算 𝛽、𝛼 參數。
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 pt-2">
              {/* Parameter Beta */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Beta 基線持倉量 ($\beta$):</span>
                  <span className="font-mono font-black text-emerald-400">{beta.toFixed(3)}x</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.01"
                    value={beta}
                    onChange={(e) => setBeta(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 bg-slate-950 h-1 rounded"
                  />
                  <span className="text-[10px] text-slate-600 w-8 text-right">80.6%</span>
                </div>
              </div>

              {/* Parameter Alpha */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Alpha 訊號乘數敏感度 ($\alpha$):</span>
                  <span className="font-mono font-black text-amber-400">{alpha.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={alpha}
                    onChange={(e) => setAlpha(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 bg-slate-950 h-1 rounded"
                  />
                  <span className="text-[10px] text-slate-600 w-8 text-right">槓桿率</span>
                </div>
              </div>

              {/* Parameter pred_excess */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">模型明日預測超額收益 ($pred\_excess$):</span>
                  <span className={`font-mono font-black ${predExcess >= 0 ? "text-rose-400" : "text-sky-400"}`}>
                    {predExcess >= 0 ? "+" : ""}{predExcess.toFixed(3)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.005"
                    value={predExcess}
                    onChange={(e) => setPredExcess(parseFloat(e.target.value))}
                    className="flex-1 accent-rose-500 bg-slate-950 h-1 rounded"
                  />
                  <span className="text-[10px] text-slate-600 w-8 text-right">預期溢價</span>
                </div>
              </div>
            </div>

            {/* S&P 500 RSI/MACD Technical Predictor Panel */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-amber-500 flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5" />
                  TradingView 指標預測儀 (RSI & MACD)
                </span>
                
                <button
                  onClick={fetchTradingViewIndicators}
                  disabled={isFetchingTv}
                  className="text-[11px] bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-amber-300 font-bold px-2 py-1 rounded-lg border border-slate-800 hover:border-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  id="tv-fetch-btn"
                >
                  {isFetchingTv ? (
                    <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  ) : (
                    <Globe className="w-3 h-3 text-amber-500" />
                  )}
                  {isFetchingTv ? "連網抓取中..." : "抓取最新大盤技術指標"}
                </button>
              </div>

              {fetchTvError && (
                <div className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg">
                  ⚠️ {fetchTvError}
                </div>
              )}

              {fetchSuccessMsg && (
                <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {fetchSuccessMsg}
                </div>
              )}

              {/* Two Column Manual input or preview adjustment */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">S&P 500 RSI (14日)</span>
                    <span className={`font-mono font-bold ${rsiInput > 70 ? "text-rose-400" : rsiInput < 30 ? "text-emerald-400" : "text-amber-500"}`}>
                      {rsiInput.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    value={rsiInput}
                    onChange={(e) => setRsiInput(parseFloat(e.target.value) || 50)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-2 py-1 rounded-md font-mono focus:border-amber-500 focus:outline-none"
                    id="rsi-input-field"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500">
                    <span>超賣 &lt;30</span>
                    <span>超買 &gt;70</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">S&P 500 MACD</span>
                    <span className={`font-mono font-bold ${macdInput > 0 ? "text-rose-400" : macdInput < 0 ? "text-sky-400" : "text-slate-500"}`}>
                      {macdInput >= 0 ? "+" : ""}{macdInput.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={macdInput}
                    onChange={(e) => setMacdInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-2 py-1 rounded-md font-mono focus:border-amber-500 focus:outline-none"
                    id="macd-input-field"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500">
                    <span>看跌 &lt;0</span>
                    <span>看漲 &gt;0</span>
                  </div>
                </div>
              </div>

              {/* Threshold Rule Checklist dynamic display */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[10px] space-y-1.5 font-sans">
                <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  轉換規則匹配 (動態計分卡):
                </span>
                
                {/* Rule 1: RSI > 70 */}
                <div className={`flex items-center justify-between p-1 rounded transition-colors ${rsiInput > 70 ? "bg-rose-500/10 text-rose-450 font-bold" : "text-slate-500"}`}>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${rsiInput > 70 ? "bg-rose-400 animate-ping" : "bg-slate-800"}`} />
                    1. 當 RSI &gt; 70 → 預測為 -0.30%
                  </span>
                  <span className="font-mono">{rsiInput > 70 ? "-0.30%" : "0.00%"}</span>
                </div>

                {/* Rule 2: RSI < 30 */}
                <div className={`flex items-center justify-between p-1 rounded transition-colors ${rsiInput < 30 ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-slate-500"}`}>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${rsiInput < 30 ? "bg-emerald-400 animate-ping" : "bg-slate-800"}`} />
                    2. 當 RSI &lt; 30 → 預測為 +0.30%
                  </span>
                  <span className="font-mono">{rsiInput < 30 ? "+0.30%" : "0.00%"}</span>
                </div>

                {/* Rule 2b: RSI Neutral (30 <= RSI <= 70) */}
                <div className={`flex items-center justify-between p-1 rounded transition-colors ${(rsiInput >= 30 && rsiInput <= 70) ? "bg-slate-900/80 text-slate-300 font-bold" : "text-slate-600"}`}>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${(rsiInput >= 30 && rsiInput <= 70) ? "bg-amber-500" : "bg-slate-800"}`} />
                    • 30 ≤ RSI ≤ 70 → 預測為 0.00% (基準中立)
                  </span>
                  <span className="font-mono">{(rsiInput >= 30 && rsiInput <= 70) ? "0.00%" : "0.00%"}</span>
                </div>

                {/* Rule 3: MACD > 0 */}
                <div className={`flex items-center justify-between p-1 rounded transition-colors ${macdInput > 0 ? "bg-rose-500/10 text-rose-450 font-bold" : "text-slate-500"}`}>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${macdInput > 0 ? "bg-rose-450 animate-ping" : "bg-slate-800"}`} />
                    3. 當 MACD &gt; 0 → 增加 +0.10% (看漲)
                  </span>
                  <span className="font-mono">{macdInput > 0 ? "+0.10%" : "0.00%"}</span>
                </div>

                {/* Rule 4: MACD < 0 */}
                <div className={`flex items-center justify-between p-1 rounded transition-colors ${macdInput < 0 ? "bg-sky-500/10 text-sky-400 font-bold" : "text-slate-500"}`}>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${macdInput < 0 ? "bg-sky-400 animate-ping" : "bg-slate-800"}`} />
                    4. 當 MACD &lt; 0 → 減少 -0.10% (看跌)
                  </span>
                  <span className="font-mono">{macdInput < 0 ? "-0.10%" : "0.00%"}</span>
                </div>

                {/* Output indicator */}
                <div className="border-t border-slate-900 pt-2 flex items-center justify-between text-[11px] font-black">
                  <span className="text-slate-300">本模組試算超額收益結果:</span>
                  <span className={`font-mono text-xs ${calculatedPredExcess >= 0 ? "text-amber-500" : "text-sky-450"}`}>
                    {calculatedPredExcess >= 0 ? "+" : ""}{calculatedPredExcess.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs space-y-1.5 font-mono text-slate-400">
            <div><span className="text-slate-500">原始公式-Exposure:</span> raw_exposure = <span className="text-emerald-400">\beta</span> + (<span className="text-amber-400">\alpha</span> * <span className="text-rose-400">pred_excess</span>)</div>
            <div><span className="text-slate-500">當前計算-Raw:</span> {beta.toFixed(3)} + ({alpha.toFixed(1)} * {predExcess.toFixed(3)}%) = <strong className="text-slate-200">{rawExposure.toFixed(4)}</strong></div>
            <div>
              <span className="text-slate-500">部位映射-Final:</span> np.clip({rawExposure.toFixed(4)}, 0.0, 2.0) = <strong className="text-amber-400">{clippedExposure.toFixed(2)}x</strong>
            </div>
          </div>
        </div>

        {/* Real-world Action execution advice */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl lg:col-span-3 flex flex-col justify-between shadow-2xl relative">
          <div className="space-y-3.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">
              模型交易指令 (Signal Execution Actions)
            </span>
            <h4 className="text-base font-extrabold text-white flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-sky-400" />
              曝險執行策略與套套對機制
            </h4>
            
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">目前大盤曝險基準:</span>
                <span className="font-bold text-slate-300">1.00x (標準 SPY)</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">明日目標曝險:</span>
                <span className={`font-black ${clippedExposure > 1.0 ? "text-rose-400" : clippedExposure < 1.0 ? "text-emerald-400" : "text-slate-350"}`}>{clippedExposure.toFixed(2)}x</span>
              </div>

              <div className="border-t border-slate-900 pt-2 space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block">操作細則與通道工具:</span>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {clippedExposure === 1.0 ? (
                    <span className="text-slate-400 font-sans">無多空偏移訊號。維持 1.00x 標普500 (SPY/IVV) 基礎倉位。不作期貨或槓桿對沖。</span>
                  ) : clippedExposure > 1.0 ? (
                    <span className="text-rose-400 font-sans">
                      利用<strong className="text-white bg-rose-600/20 px-1 py-0.5 rounded ml-1 mr-1">標普 500 E-mini 期貨 (ES)</strong>或<strong className="text-white bg-rose-600/20 px-1 py-0.5 rounded">2倍槓桿 ETF (SSO)</strong>補足 <strong className="text-white font-bold font-mono">{(clippedExposure - 1.0).toFixed(2)}x</strong> 倍的多頭曝險，增加攻擊效率。
                    </span>
                  ) : clippedExposure === 0 ? (
                    <span className="text-emerald-400 font-sans">
                      大盤暴風雨預警！<strong className="text-white bg-emerald-600/20 px-1 py-0.5 rounded mr-1">全數清空</strong>多頭部位，100% 轉入流動性強的貨幣市場基金 (如 <strong className="text-white bg-emerald-600/20 px-1 py-0.5 rounded">BIL/SGOV</strong>) 鎖定無風險利息防震。
                    </span>
                  ) : (
                    <span className="text-sky-400 font-sans">
                      需進行防禦性對沖！使用標普期貨 (ES) 進行 <strong className="text-white font-boldfont-mono">{(1.0 - clippedExposure).toFixed(2)}x</strong> 倍的空頭部位套期保值，或售出 ${(100 - (clippedExposure * 100)).toFixed(0)}% 的 SPY，持倉降回 <strong className="text-white font-bold font-mono">{(clippedExposure).toFixed(2)}x</strong>，餘額轉入 BIL 防震。
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-slate-500 leading-relaxed italic font-sans flex items-start gap-1">
            <Info className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
            <span>
              HTUS 的曝險每日更新。在部位映射不變的前提下，每日調倉可限制滑價損失並大幅降低最大回撤 (Max Drawdown)。
            </span>
          </div>
        </div>

      </div>

      {/* Historical Timing Backtest Chart */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-amber-500" />
              S&P 500 擇時模擬回溯與曝險起伏圖 (HTUS Model Backtest)
            </h3>
            <p className="text-xs text-slate-500">
              對比 HTUS 40訊號動態曝險策略 與 標普500指數單純買入持有 (S&P 500 Buy & Hold) 過去一年的績效。
            </p>
          </div>

          {/* Legend indicator */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span className="text-slate-300">HTUS 模型動態曝險策略</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-500 inline-block border-dashed border" />
              <span className="text-slate-400">S&P 500 指數持股買入</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 bg-sky-500/20 rounded inline-block" />
              <span className="text-sky-400 font-normal">明日曝險 (Exposure, 右軸 0.0 - 2.0x)</span>
            </div>
          </div>
        </div>

        {/* SVG Interactive Chart */}
        <div className="relative bg-slate-950/60 p-4 rounded-2xl border border-slate-900">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible"
            onMouseLeave={() => setHoveredDataIndex(null)}
          >
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
              const y = padding + ratio * (svgHeight - 2 * padding);
              return (
                <line
                  key={idx}
                  x1={padding}
                  y1={y}
                  x2={svgWidth - padding}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Exposure Bars / Area */}
            <path
              d={`
                M ${padding},${svgHeight - padding}
                ${chartData.map((d, i) => {
                  const x = padding + (i / (chartData.length - 1)) * (svgWidth - 2 * padding);
                  const expY = svgHeight - padding - (d.exposure / 2.1) * (svgHeight - 2 * padding);
                  return `L ${x},${expY}`;
                }).join(" ")}
                L ${svgWidth - padding},${svgHeight - padding} Z
              `}
              fill="rgba(56, 189, 248, 0.08)"
              className="transition-all"
            />

            {/* S&P 500 Path */}
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="3 3"
              points={pointsCoordinates.spPath}
            />

            {/* HTUS Strategy Path */}
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="3.5"
              className="drop-shadow-[0_2px_12px_rgba(244,63,94,0.4)]"
              points={pointsCoordinates.htPath}
            />

            {/* Interactive hover lines & markers */}
            {chartData.map((d, i) => {
              const x = padding + (i / (chartData.length - 1)) * (svgWidth - 2 * padding);
              return (
                <rect
                  key={i}
                  x={x - (svgWidth - 2 * padding) / (chartData.length * 2)}
                  y={0}
                  width={(svgWidth - 2 * padding) / chartData.length}
                  height={svgHeight}
                  fill="transparent"
                  className="cursor-pointer hover:fill-slate-800/10"
                  onMouseEnter={() => setHoveredDataIndex(i)}
                />
              );
            })}

            {/* Vertical Marker Line on hover */}
            {hoveredDataIndex !== null && (
              <line
                x1={padding + (hoveredDataIndex / (chartData.length - 1)) * (svgWidth - 2 * padding)}
                y1={padding}
                x2={padding + (hoveredDataIndex / (chartData.length - 1)) * (svgWidth - 2 * padding)}
                y2={svgHeight - padding}
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                pointerEvents="none"
              />
            )}
          </svg>

          {/* Chart info card overlay */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-900 text-xs bg-slate-900/40 p-4 rounded-xl">
            <div>
              <span className="text-slate-500 font-bold block">日期範疇:</span>
              <strong className="text-slate-200 mt-0.5 block">{activeDay.date}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-bold block">標普 500 累計淨值:</span>
              <strong className="text-slate-200 block text-sm mt-0.5">
                {(activeDay.spVal).toFixed(1)} <span className="text-[10px] text-slate-500">({((activeDay.spVal - 100)).toFixed(1)}%)</span>
              </strong>
            </div>
            <div className="relative">
              <span className="text-slate-500 font-bold block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                HTUS 量化策略淨值:
              </span>
              <strong className="text-rose-400 block text-sm mt-0.5">
                {(activeDay.htusVal).toFixed(1)} <span className="text-[10px] text-rose-500 font-bold">({((activeDay.htusVal - 100)).toFixed(1)}%)</span>
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-bold block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                策略當日曝險分配:
              </span>
              <strong className="text-sky-450 block text-sm mt-0.5">
                {activeDay.exposure.toFixed(2)}x 槓桿曝險
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Model Sandbox & Time-Series Validation Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ML Cross Validation Panel */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl lg:col-span-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm uppercase font-black tracking-widest text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-rose-400" />
              多模型預測與時序交叉驗證 (Cross-Validation Ensemble)
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">Time-Series Split</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            採用嚴格時序交叉驗證切分因子與報酬率序列，對 LightGBM、XGBoost 及 Ridge Regression 進行動態加權。等權重集成 (Equally Weighted Ensemble) 剔除單一機器學習容易偏誤的不確定性。
          </p>

          <div className="space-y-4">
            {/* Model 1 LightGBM */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-350">LightGBM (強正則增強樹)</span>
                <span className="text-xs font-mono font-black text-rose-400">{isTraining ? "訓練中..." : `預期超額預測: +0.284%`}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>過擬合正則化: L1={"{0.5}"} L2={"{1.2}"}</span>
                <span>交叉驗證誤差 (RMSE): <strong className="font-mono text-slate-300">{mseLGB.toFixed(5)}</strong></span>
              </div>
              {/* Params list dropdown inside lightGBM to show exact parameters */}
              <div className="mt-2 text-[10px] font-mono text-slate-500 bg-slate-900/40 p-2 rounded">
                params: n_estimators=2000, learn_rate=0.005, depth=4, leaves=15, subsample=0.65, min_child_samples=50
              </div>
            </div>

            {/* Model 2 XGBoost */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-350">XGBoost (高維稀疏特徵優化)</span>
                <span className="text-xs font-mono font-black text-amber-400">{isTraining ? "訓練中..." : `預期超額預測: +0.242%`}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>特徵二次抽樣率: 60%, 樹深上限=4</span>
                <span>交叉驗證誤差 (RMSE): <strong className="font-mono text-slate-300">{mseXG.toFixed(5)}</strong></span>
              </div>
            </div>

            {/* Model 3 Ridge Regression */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-350">Ridge Regression (L2 線性脊迴歸)</span>
                <span className="text-xs font-mono font-black text-sky-400">{isTraining ? "訓練中..." : `預期超額預測: +0.308%`}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>極低交互度, 多重共線性抑制 (Alpha=10)</span>
                <span>交叉驗證誤差 (RMSE): <strong className="font-mono text-slate-300">{mseRidge.toFixed(5)}</strong></span>
              </div>
            </div>

            {/* Training Trigger bar */}
            <div className="pt-2">
              {isTraining ? (
                <div className="space-y-1.5 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                      時序拆分十字交叉訓練 (Split {trainTimeSplit}/5)
                    </span>
                    <span className="font-mono text-rose-450">{trainingStep}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all duration-100" style={{ width: `${trainingStep}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-600 block italic text-center">
                    正在執行 Time-Series Splitting 重建 98 維度和超額預測目標矩陣...
                  </span>
                </div>
              ) : (
                <button
                  onClick={startModelTraining}
                  className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700/80 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Play className="w-4 h-4 text-rose-500 fill-current" />
                  手動觸發 CROSS-VALIDATION 模型時序重新訓練 (精化預期溢價)
                </button>
              )}

              {trainComplete && !isTraining && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-450 animate-bounce" />
                  <span>
                    <strong>交叉驗證訓練完成!</strong> 平均集成功合誤差 (RMSE) 下降 <strong>14.82%</strong>。 成功生成明日加權 $pred\_excess$ : <strong>+0.278%</strong>。
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closing Ingestion Pipeline Logs */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl lg:col-span-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm uppercase font-black tracking-widest text-slate-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-sky-400" />
                收盤數據自動流入流水線 (Closing Pipeline)
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                運算中樞正常
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              每日美股收盤後，大盤定序管線將自動運行。連網爬取總體經濟指標、美股基本面利差、SPY 期貨波動指數與情緒指標，以 20 日滾動基準計算所有變量的最新滾動校準值。
            </p>

            <div className="space-y-2 font-mono text-xs text-slate-400 bg-slate-950 p-4 rounded-2xl border border-slate-900 overflow-y-auto max-h-[220px] custom-scrollbar">
              <div className="flex items-center gap-1.5 py-0.5 text-slate-500 border-b border-slate-900 pb-1 text-[11px]">
                <span>LAST PIPELINE LOGS: {lastPipelineUpdate}</span>
              </div>
              <div className="flex items-center gap-2 py-0.5 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>[04:00 PM] 捕獲 CME S&P 500 收盤結算價... SPX=6014.25</span>
              </div>
              <div className="flex items-center gap-2 py-0.5 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>[04:05 PM] 調取 FRED Federal Reserve 滾動即期利率與 CPI/Unemployment 數據...</span>
              </div>
              <div className="flex items-center gap-2 py-0.5 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>[04:10 PM] 自動爬取 Cboe VIX 倒退價差與 Put/Call EMA-5 分位數據...</span>
              </div>
              <div className="flex items-center gap-2 py-0.5 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>[04:15 PM] 特徵工程引擎啟動，更新 98 個自變量因子 Z-Score。</span>
              </div>
              <div className="flex items-center gap-2 py-0.5 text-emerald-555">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>[04:20 PM] 執行 Winsorizing 利差極端值縮尾，成功處理 P_HULL 異常估值因子。</span>
              </div>
              <div className="flex items-center gap-2 py-0.5 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>[04:30 PM] Ensemble ML 明日大盤 $pred\_excess$ 運算成功。(預期: +0.278%)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 font-bold block">上次完整流水線執行：</span>
              <span className="text-slate-350 font-mono font-medium block text-left">{lastPipelineUpdate}</span>
            </div>
            <button
              onClick={handleRefreshPipeline}
              disabled={isRefreshingPipeline}
              className="py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isRefreshingPipeline ? (
                <>更新中...</>
              ) : (
                <>手動刷新並重新拉取最新 98 指標</>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Accordion List of the 98 quant features */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              HTUS 實務 40 訊號與 98 個量化特徵因子庫
            </h3>
            <p className="text-xs text-slate-500">
              顯示當前模型正在爬取並用於多模型預測的 S&P 500 特徵矩陣。包含技術、情緒、總體與專屬利差因子。
            </p>
          </div>

          {/* Search Feature Bar */}
          <div className="relative group max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
            <input
              type="text"
              value={featureSearch}
              onChange={(e) => setFeatureSearch(e.target.value)}
              placeholder="搜尋 98 量化特徵..."
              className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500/50 hover:border-slate-700 transition-colors placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Category filtering tags */}
        <div className="flex flex-wrap gap-1.5 pb-2">
          {["All", "Technical (D)", "Economic (E)", "Volatility (V)", "Sentiment (S)", "Momentum (M)", "Timing (T)", "Proprietary (P)"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                activeCategoryFilter === cat
                  ? "bg-amber-600/20 border-amber-500 text-amber-500 shadow-sm"
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-350 hover:border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Features Table of the interactive subset */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950">
          <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">特徵代號 (Feature Code)</th>
                <th className="py-3 px-4">因子名稱 / 實務還原</th>
                <th className="py-3 px-4">因子類別</th>
                <th className="py-3 px-4 text-right">當前實測值</th>
                <th className="py-3 px-4 text-right">20日滾動 Z-Score</th>
                <th className="py-3 px-4">特徵工程與標準化實務 (Feature Engineering)</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    沒有找到符合條件的量化特徵因子。
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((feat) => (
                  <tr
                    key={feat.code}
                    className="border-b border-slate-850 hover:bg-slate-900/30 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-400 group-hover:text-amber-500 transition-colors text-[11px]">
                      {feat.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      <div>{feat.name}</div>
                      <div className="text-[10px] font-normal text-slate-500 mt-1 max-w-sm">
                        {feat.desc}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                        feat.category.startsWith("Technical") ? "bg-red-500/10 text-red-400" :
                        feat.category.startsWith("Economic") ? "bg-amber-500/10 text-amber-400" :
                        feat.category.startsWith("Volatility") ? "bg-emerald-500/10 text-emerald-400" :
                        feat.category.startsWith("Sentiment") ? "bg-indigo-500/10 text-indigo-400" :
                        feat.category.startsWith("Momentum") ? "bg-purple-500/10 text-purple-400" :
                        feat.category.startsWith("Timing") ? "bg-pink-500/10 text-pink-400" :
                        "bg-orange-500/10 text-orange-400"
                      }`}>
                        {feat.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                      {feat.value}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                      <span className={feat.zScore >= 1.0 ? "text-rose-450" : feat.zScore <= -1.0 ? "text-sky-450" : "text-slate-450"}>
                        {feat.zScore >= 0 ? "+" : ""}{feat.zScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] leading-relaxed max-w-xs">
                      {feat.engMethod}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
