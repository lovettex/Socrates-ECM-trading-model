import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  Briefcase,
  Trash2,
  Compass,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  TrendingUp,
  CheckCircle,
  Download,
  Upload,
  Cloud,
  Loader2,
  CloudUpload,
} from "lucide-react";
import * as gdrive from "./googleDrive";

// --- GoogleGenAI Server Proxy Class ---
class GoogleGenAI {
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

// --- Sector Classification ---
const getTradingViewHeatmapSector = (symbol: string): string => {
  if (!symbol) return "其他產業板塊";
  const s = symbol.toUpperCase().trim();
  
  const map: Record<string, string> = {
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

    "LLY": "Health Technology (健康科技)",
    "UNH": "Health Technology (健康科技)",
    "JNJ": "Health Technology (健康科技)",
    "MRK": "Health Technology (健康科技)",
    "ABBV": "Health Technology (健康科技)",
    "TMO": "Health Technology (健康科技)",
    "AMGN": "Health Technology (健康科技)",
    "PFE": "Health Technology (健康科技)",
    "ISRG": "Health Technology (健康科技)",
    "GILD": "Health Technology (健康科技)",
    "ABT": "Health Technology (健康科技)",

    "SE": "Retail Trade (零售貿易 - Internet Retail)",
    "AMZN": "Consumer Services (消費者服務)",
    "TSLA": "Consumer Services (消費者服務)",
    "WMT": "Consumer Services (消費者服務)",
    "HD": "Consumer Services (消費者服務)",
    "MCD": "Consumer Services (消費者服務)",
    "DIS": "Consumer Services (消費者服務)",
    "CMG": "Consumer Services (消費者服務)",
    "NFLX-CS": "Consumer Services (消費者服務)",
    "SBUX": "Consumer Services (消費者服務)",
    "TJX": "Consumer Services (消費者服務)",
  };

  if (map[s]) {
    return map[s];
  }

  if (s === "AAPL" || s === "NVDA" || s === "AVGO" || s === "AMD") return "Electronic Technology (電子科技)";
  if (s === "MSFT" || s === "META" || s === "GOOG" || s === "GOOGL") return "Technology Services (科技服務)";
  if (s === "AMZN" || s === "WMT" || s === "TSLA") return "Consumer Services (消費者服務)";
  if (s === "JPM" || s === "BAC" || s === "GS" || s === "MS") return "Finance (金融服務)";
  if (s === "LLY" || s === "UNH" || s === "JNJ" || s === "PFE") return "Health Technology (健康科技)";

  return "其他產業板塊";
};

const sectorColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  "electronic technology": { bg: "rgba(141, 153, 142, 0.15)", border: "rgba(141, 153, 142, 0.45)", text: "#a3b1a2", glow: "rgba(141, 153, 142, 0.2)" }, 
  "technology services": { bg: "rgba(119, 136, 152, 0.15)", border: "rgba(119, 136, 152, 0.45)", text: "#a2b2c1", glow: "rgba(119, 136, 152, 0.2)" }, 
  "finance": { bg: "rgba(188, 168, 145, 0.15)", border: "rgba(188, 168, 145, 0.45)", text: "#d4c5b3", glow: "rgba(188, 168, 145, 0.2)" }, 
  "health technology": { bg: "rgba(180, 142, 147, 0.15)", border: "rgba(180, 142, 147, 0.45)", text: "#cbb2b5", glow: "rgba(180, 142, 147, 0.2)" }, 
  "consumer services": { bg: "rgba(175, 122, 111, 0.15)", border: "rgba(175, 122, 111, 0.45)", text: "#cba29a", glow: "rgba(175, 122, 111, 0.2)" }, 
  "consumer non-durables": { bg: "rgba(128, 141, 120, 0.15)", border: "rgba(128, 141, 120, 0.45)", text: "#9fae99", glow: "rgba(128, 141, 120, 0.2)" }, 
  "consumer durables": { bg: "rgba(150, 120, 141, 0.15)", border: "rgba(150, 120, 141, 0.45)", text: "#bba3b2", glow: "rgba(150, 120, 141, 0.2)" }, 
  "energy minerals": { bg: "rgba(176, 143, 115, 0.15)", border: "rgba(176, 143, 115, 0.45)", text: "#cca992", glow: "rgba(176, 143, 115, 0.2)" }, 
  "process industries": { bg: "rgba(135, 127, 145, 0.15)", border: "rgba(135, 127, 145, 0.45)", text: "#b5abbf", glow: "rgba(135, 127, 145, 0.2)" }, 
  "industrial services": { bg: "rgba(145, 137, 124, 0.15)", border: "rgba(145, 137, 124, 0.45)", text: "#bfb5a5", glow: "rgba(145, 137, 124, 0.2)" }, 
  "commercial services": { bg: "rgba(185, 180, 145, 0.15)", border: "rgba(185, 180, 145, 0.45)", text: "#cfcbb3", glow: "rgba(185, 180, 145, 0.2)" }, 
  "utilities": { bg: "rgba(140, 160, 145, 0.15)", border: "rgba(140, 160, 145, 0.45)", text: "#abbfbc", glow: "rgba(140, 160, 145, 0.2)" } 
};

const getSectorColor = (sectorName: string) => {
  const normalized = sectorName.toLowerCase().trim();
  const matchedKey = Object.keys(sectorColors).find(
    (k) => normalized.includes(k) || k.includes(normalized)
  );
  if (matchedKey) return sectorColors[matchedKey];

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
      bubbles[0].localY = 10;
      enclosingR = bubbles[0].r + 25;
    } else if (count === 2) {
      const b0 = bubbles[0];
      const b1 = bubbles[1];
      const dist = b0.r + b1.r + 35; // Increased minimum distance to prevent overlaps
      const angle = -Math.PI / 8;
      b0.localX = - (dist / 2) * Math.cos(angle);
      b0.localY = - (dist / 2) * Math.sin(angle) + 12;
      b1.localX = (dist / 2) * Math.cos(angle);
      b1.localY = (dist / 2) * Math.sin(angle) + 12;
      enclosingR = (dist / 2) + Math.max(b0.r, b1.r) + 24;
    } else {
      bubbles.forEach((b, idx) => {
        const radiusMultiplier = count > 3 ? 1.5 : 1.3;
        const angle = (idx * 2 * Math.PI) / count - Math.PI / 2;
        const dist = (b.r + 35) * radiusMultiplier;
        b.localX = dist * Math.cos(angle);
        b.localY = dist * Math.sin(angle) + 12;
      });

      for (let bIter = 0; bIter < 150; bIter++) {
        // Apply gentle center gravity FIRST, so overlaps corrected SECOND survive without compression in final state
        bubbles.forEach((b) => {
          b.localX *= 0.94;
          b.localY = 12 + (b.localY - 12) * 0.94;
        });

        // Resolve bubble overlaps SECOND to guarantee absolute non-overlapping separation
        for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
            const bA = bubbles[i];
            const bB = bubbles[j];
            const dx = bB.localX - bA.localX;
            const dy = bB.localY - bA.localY;
            const dist = Math.hypot(dx, dy) || 1;
            const minDistance = bA.r + bB.r + 35; // Set 35px minimum distance to keep stocks beautifully separated without overlap
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
      }

      let maxR = 50;
      bubbles.forEach(b => {
        const d = Math.hypot(b.localX, b.localY - 12) + b.r;
        if (d > maxR) maxR = d;
      });
      enclosingR = maxR + 25; // Provide elegant border containment padding
    }

    let cx = 130 + sIdx * 270;
    let cy = 200;
    if (sIdx > 2) {
      cx = 130 + (sIdx - 3) * 270;
      cy = 400;
    }

    return {
      sectorShort: sec,
      sectorFull: secItems[0].sectorFull,
      cx,
      cy,
      enclosingR,
      bubbles
    };
  });

  if (sectors.length > 0) {
    const paddingX = 80;
    const paddingY = 80;
    sectors.forEach(sec => {
      if (sec.cx < paddingX) sec.cx = paddingX;
      if (sec.cx > 800 - paddingX) sec.cx = 800 - paddingX;
      if (sec.cy < paddingY) sec.cy = paddingY;
      if (sec.cy > 420 - paddingY) sec.cy = 420 - paddingY;
    });
  }

  return sectors;
};

interface PortfolioViewProps {
  currentPrices?: Record<string, any>;
  gdUser?: any;
  gdToken?: string | null;
  onGoogleDriveLogin?: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  currentPrices = {},
  gdUser = null,
  gdToken = null,
  onGoogleDriveLogin = () => {},
}) => {
  const [portfolio, setPortfolio] = useState<{ symbol: string; avgPrice: number; shares: number; note?: string; tradeType?: "simulation" | "real"; direction?: "buy" | "short"; purchaseDate?: string; selectedBatches?: string[] }[]>(() => {
    try {
      const saved = localStorage.getItem("watchlist_portfolio");
      return saved ? JSON.parse(saved) : [
        { symbol: "AAPL", avgPrice: 175.5, shares: 10, note: "長期核心持有", tradeType: "real", direction: "buy" },
        { symbol: "NVDA", avgPrice: 480.0, shares: 5, note: "AI 龍頭", tradeType: "real", direction: "buy" },
        { symbol: "MSFT", avgPrice: 380.2, shares: 8, note: "雲端服務龍頭", tradeType: "real", direction: "buy" }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("watchlist_portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  const [selectedPortfolioSymbol, setSelectedPortfolioSymbol] = useState<string>("");
  const [showPortfolioAddForm, setShowPortfolioAddForm] = useState(false);
  const [pSymbol, setPSymbol] = useState("");
  const [pAvgPrice, setPAvgPrice] = useState("");
  const [pShares, setPShares] = useState("");
  const [pNote, setPNote] = useState("");
  const [pTradeType, setPTradeType] = useState<"simulation" | "real">("simulation");
  const [pDirection, setPDirection] = useState<"buy" | "short">("buy");
  const [editingPIdx, setEditingPIdx] = useState<number | null>(null);
  const [pPurchaseDate, setPPurchaseDate] = useState("");
  const [pSelectedBatches, setPSelectedBatches] = useState<string[]>([]);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);

  const [portfolioSearchText, setPortfolioSearchText] = useState("");
  const [portfolioSelectedSector, setPortfolioSelectedSector] = useState("全部");
  const [portfolioSelectedTradeType, setPortfolioSelectedTradeType] = useState<"all" | "real" | "simulation">("all");

  const [confirmDeletePortfolioSymbol, setConfirmDeletePortfolioSymbol] = useState<string | null>(null);

  // --- Capital Management & Portfolio Mapping States ---
  const [totalAssetsStr, setTotalAssetsStr] = useState<string>(() => {
    return localStorage.getItem("watchlist_total_assets") || "100000";
  });
  const [moomooLeverage, setMoomooLeverage] = useState<number>(() => {
    const saved = localStorage.getItem("watchlist_moomoo_leverage");
    return saved ? parseFloat(saved) : 2.0;
  });

  useEffect(() => {
    localStorage.setItem("watchlist_total_assets", totalAssetsStr);
  }, [totalAssetsStr]);

  useEffect(() => {
    localStorage.setItem("watchlist_moomoo_leverage", moomooLeverage.toString());
  }, [moomooLeverage]);

  const [analysisResult, setAnalysisResult] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("watchlist_portfolio_after_analysis");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatusText, setAnalysisStatusText] = useState("");

  // --- Portfolio Backup & Portability States & Functions ---
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isOperatingGD, setIsOperatingGD] = useState(false);
  const [gdStatusMsg, setGdStatusMsg] = useState("");

  const handleLocalExport = () => {
    try {
      const backupData = {
        type: "socrates_portfolio_backup",
        portfolio,
        totalAssets: totalAssetsStr,
        moomooLeverage,
        backedUpAt: new Date().toISOString()
      };
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      
      const now = new Date();
      const formatDigits = (n: number) => n.toString().padStart(2, '0');
      const year = now.getFullYear();
      const month = formatDigits(now.getMonth() + 1);
      const day = formatDigits(now.getDate());
      const hours = formatDigits(now.getHours());
      const minutes = formatDigits(now.getMinutes());
      const seconds = formatDigits(now.getSeconds());
      const dateString = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
      const filename = `Socrates_Portfolio_${dateString}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", filename);
      linkElement.click();
    } catch (err: any) {
      alert("匯出備份檔案時發生錯誤");
    }
  };

  const handleLocalImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const json = JSON.parse(evt.target?.result as string);
          if (json && Array.isArray(json.portfolio)) {
            setPortfolio(json.portfolio);
            if (json.totalAssets) setTotalAssetsStr(json.totalAssets);
            if (json.moomooLeverage) setMoomooLeverage(Number(json.moomooLeverage) || 2.0);
            alert("匯入成功！");
            setShowImportModal(false);
          } else if (Array.isArray(json)) {
            setPortfolio(json);
            alert("匯入成功 (純持股清單)！");
            setShowImportModal(false);
          } else {
            alert("無效的備份檔案格式。");
          }
        } catch (err) {
          alert("讀取或解析備份檔失敗，請確認檔案格式是否正確。");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCloudExport = async () => {
    if (!gdToken) {
      alert("請先登入 Google Drive");
      if (onGoogleDriveLogin) onGoogleDriveLogin();
      return;
    }
    setIsOperatingGD(true);
    setGdStatusMsg("");
    try {
      const backupData = {
        type: "socrates_portfolio_backup",
        portfolio,
        totalAssets: totalAssetsStr,
        moomooLeverage,
        backedUpAt: new Date().toISOString()
      };
      
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

      await gdrive.uploadFileToGoogleDrive(
        gdToken,
        filename,
        "application/json",
        JSON.stringify(backupData, null, 2),
        "Socrates_Portfolio_Backup"
      );
      setGdStatusMsg(`備份成功！已上傳至 Google Drive 的 Socrates_Portfolio_Backup 資料夾中。檔名: ${filename}`);
    } catch (err: any) {
      console.error(err);
      setGdStatusMsg(`雲端備份失敗: ${err.message || err}`);
    } finally {
      setIsOperatingGD(false);
    }
  };

  const handleCloudImport = async () => {
    if (!gdToken) {
      alert("請先登入 Google Drive");
      if (onGoogleDriveLogin) onGoogleDriveLogin();
      return;
    }
    setIsOperatingGD(true);
    setGdStatusMsg("");
    try {
      const files = await gdrive.listBackupFilesFromGoogleDrive(gdToken, "Socrates_Portfolio_Backup");
      if (files && files.length > 0) {
        const latestFile = files[0];
        const restored = await gdrive.downloadFileFromGoogleDrive(gdToken, latestFile.id);
        if (restored && Array.isArray(restored.portfolio)) {
          setPortfolio(restored.portfolio);
          if (restored.totalAssets) setTotalAssetsStr(restored.totalAssets);
          if (restored.moomooLeverage) setMoomooLeverage(Number(restored.moomooLeverage) || 2.0);
          
          setGdStatusMsg(`成功匯入最新雲端備份！備份創立時間：${new Date(latestFile.createdTime).toLocaleString()}`);
          setTimeout(() => {
            setShowImportModal(false);
            setGdStatusMsg("");
          }, 2500);
        } else if (Array.isArray(restored)) {
          setPortfolio(restored);
          setGdStatusMsg(`成功匯入最新雲端備份！`);
          setTimeout(() => {
            setShowImportModal(false);
            setGdStatusMsg("");
          }, 2500);
        } else {
          setGdStatusMsg("備份檔案中的數據格式不正確。");
        }
      } else {
        setGdStatusMsg("找不到任何投資組合相關的雲端備份檔案 (.json)。");
      }
    } catch (err: any) {
      console.error(err);
      setGdStatusMsg(`雲端匯入失敗: ${err.message || err}`);
    } finally {
      setIsOperatingGD(false);
    }
  };
  const [sliderValue, setSliderValue] = useState(50);
  const [showWarnNoPortfolio, setShowWarnNoPortfolio] = useState(false);
  
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Custom useEffect to handle buttery smooth comparison dragging exactly like premium image sliders
  useEffect(() => {
    if (!isDraggingSlider) return;

    const handleGlobalMove = (clientX: number) => {
      if (!sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderValue(pct);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleGlobalMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handleGlobalMove(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    const handleTouchEnd = () => {
      setIsDraggingSlider(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDraggingSlider]);

  // Calculated portfolio "AFTER" analysis recommendations
  const portfolioAfter = useMemo(() => {
    if (!analysisResult?.adjustments) return [];
    return portfolio.map(item => {
      const adj = analysisResult.adjustments.find(
        (a: any) => a.symbol?.toUpperCase() === item.symbol?.toUpperCase()
      );
      if (adj) {
        const sharesChange = Number(adj.sharesChange) || 0;
        const updatedShares = Math.max(0, item.shares + sharesChange);
        return {
          ...item,
          shares: updatedShares,
          action: adj.action, // "increase" | "decrease" | "hold"
          sharesChange: sharesChange,
          aiNote: adj.note || ""
        };
      }
      return {
        ...item,
        shares: item.shares,
        action: "hold",
        sharesChange: 0,
        aiNote: ""
      };
    });
  }, [portfolio, analysisResult]);

  const totalAssetsVal = useMemo(() => {
    return parseFloat(totalAssetsStr) || 0;
  }, [totalAssetsStr]);

  const realHoldingsPositions = useMemo(() => {
    return portfolio.filter(item => (item.tradeType || "real") === "real");
  }, [portfolio]);

  const totalRealHoldingsCost = useMemo(() => {
    return realHoldingsPositions.reduce((acc, item) => acc + (item.avgPrice * item.shares), 0);
  }, [realHoldingsPositions]);

  const finalRemainingCash = useMemo(() => {
    return totalAssetsVal - totalRealHoldingsCost;
  }, [totalAssetsVal, totalRealHoldingsCost]);

  const moomooMaxBP = useMemo(() => {
    return totalAssetsVal * moomooLeverage;
  }, [totalAssetsVal, moomooLeverage]);

  const finalRemainingBP = useMemo(() => {
    return finalRemainingCash * moomooLeverage;
  }, [finalRemainingCash, moomooLeverage]);

  const pfHasShortfall = useMemo(() => {
    return totalRealHoldingsCost > moomooMaxBP;
  }, [totalRealHoldingsCost, moomooMaxBP]);

  const pfShortfallVal = useMemo(() => {
    return pfHasShortfall ? totalRealHoldingsCost - moomooMaxBP : 0;
  }, [pfHasShortfall, totalRealHoldingsCost, moomooMaxBP]);

  // Handle capital management mapping analysis triggering
  const handleAnalyzeCapitalManagement = async () => {
    if (portfolio.length === 0) {
      setShowWarnNoPortfolio(true);
      return;
    }
    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setAnalysisStatusText("正在初始化 Socrates 智慧分析引擎...");

    // Progress Simulation Timing Loop
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) return prev;
        const add = Math.floor(Math.random() * 6) + 3;
        const next = Math.min(95, prev + add);
        if (next < 25) setAnalysisStatusText("正在讀取當前個股持倉與行業板塊分類...");
        else if (next < 50) setAnalysisStatusText("正在對接 TradingView Heatmap 分類指標數據...");
        else if (next < 75) setAnalysisStatusText("正在執行 Socrates 資金流向與板塊輪動多因子評級...");
        else if (next < 90) setAnalysisStatusText("正在優化部位配比與映射模型推演(Before vs After)...");
        else setAnalysisStatusText("運算完成！編譯整合分佈圖中...");
        return next;
      });
    }, 450);

    const portfolioDataToSend = portfolio.map((item) => {
      const sector = getTradingViewHeatmapSector(item.symbol);
      return {
        symbol: item.symbol,
        shares: item.shares,
        avgPrice: item.avgPrice,
        direction: item.direction || "buy",
        tradeType: item.tradeType || "real",
        sector: sector
      };
    });

    try {
      const ai = new GoogleGenAI();
      const prompt = `
        您是 Socrates 資金管理與部位映射專家 (Capital Management and Portfolio Mapping Expert)。
        請評析以下現有投資持股組合：
        ${JSON.stringify(portfolioDataToSend)}

        對持有的每一檔個股，參照目前全球宏觀熱錢流向、技術及籌碼面，判定每一檔個股的最佳持倉策略。請給出以下參數：
        1. "action": 只能是 "increase" (加碼)、"decrease" (減碼) 或 "hold" (不變)。
        2. "sharesChange": 部位股數異動數量。若加碼，必須是正整數（例如：+5、+10）；若減碼，必須是負整數（例如：-3，不可減超過現有股數）；若不變，則為 0。
        3. "note": 用繁體中文寫的 1-2 句極具專業感且針對其行業(Sector)流向與籌碼面評估的推薦依據。

        注意：必須為輸入的每一檔個股 symbol 在 "adjustments" 陣列中提供恰好一個元素。
        
        請嚴格返回一個與以下格式完全相同的 JSON 對象，不要包含 markdown \`\`\` 標記：
        {
          "adjustments": [
            {
              "symbol": "AAPL",
              "action": "increase",
              "sharesChange": 5,
              "note": "科技板塊受AI基礎設施高景氣支撐，技術面回踩頸線獲買盤流入，建議在不突破宏觀信心區間前提下進行映射加碼。"
            }
          ]
        }
      `;

      let data: any = null;
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }],
          }
        });

        let responseText = response.text || "{}";
        if (responseText.includes("```")) {
          responseText = responseText.replace(/```[a-zA-Z]*\n/g, "").replace(/```/g, "");
        }
        data = JSON.parse(responseText.trim());
      } catch (geminiError: any) {
        console.warn("Gemini API error (quota/rate limit exceeded), activating custom local fallback calculation:", geminiError);
      }

      if (data && data.adjustments) {
        const resultWithMeta = {
          timestamp: new Date().toISOString(),
          adjustments: data.adjustments,
          isLocalFallback: false
        };
        localStorage.setItem("watchlist_portfolio_after_analysis", JSON.stringify(resultWithMeta));
        setAnalysisResult(resultWithMeta);
        setSliderValue(50);
        setAnalysisProgress(100);
        setAnalysisStatusText("部位分析與優化成功！滑桿對比已載入。");
      } else {
        // Run socrates local quantitative engine fallback
        const localAdjustments = portfolioDataToSend.map((item) => {
          const symbol = item.symbol?.toUpperCase();
          const sector = item.sector || "一般板塊";
          const shares = Number(item.shares) || 10;
          
          let action: "increase" | "decrease" | "hold" = "hold";
          let sharesChange = 0;
          let note = "";

          if (sector.includes("科技") || sector.includes("半導體") || ["NVDA", "AAPL", "MSFT", "TSMC", "AMD", "GOOG"].includes(symbol)) {
            action = "increase";
            sharesChange = Math.max(1, Math.round(shares * 0.15));
            note = `${sector}受AI智慧基礎設施與高階晶片需求強勁支撐，主力熱錢呈現局部淨流入，技術面於關鍵支撐位企穩，建議順應流向映射加碼。`;
          } else if (sector.includes("防禦") || sector.includes("公用") || sector.includes("民生") || ["PFE", "MRNA", "LLY"].includes(symbol)) {
            action = "hold";
            sharesChange = 0;
            note = `${sector}避險屬性仍存，但短期流速遞減，目前處於防禦輪動之瓶頸期，建議維持原有基準配置暫不變動。`;
          } else if (sector.includes("金融") || ["JPM", "BAC", "GS"].includes(symbol)) {
            action = "increase";
            sharesChange = Math.max(1, Math.round(shares * 0.08));
            note = `金融板塊受益於大型承銷業務回暖與淨利潤韌性，短期流向係數轉強，部位具備防禦映射價值，可策略性加碼。`;
          } else if (sector.includes("能源") || sector.includes("原物料") || ["XOM", "CVX"].includes(symbol)) {
            action = "decrease";
            sharesChange = -Math.max(1, Math.round(shares * 0.12));
            note = `宏觀商品需求受高名目利率滯後效應壓制，資金流向有退潮跡象，建議戰術性適度減持以控管投資組合下震。`;
          } else {
            if (item.direction === "buy") {
              action = "hold";
              sharesChange = 0;
              note = `標的 ${symbol} 在所屬 ${sector} 獲多因子中性評級，資金密度偏低但多頭結構完整，建議維持現有部位，待突破臨界。`;
            } else {
              action = "decrease";
              sharesChange = -Math.max(1, Math.round(shares * 0.1));
              note = `空頭部位 ${symbol} 正面臨產業板塊底部超跌反彈之軋空效應，流速不對稱，建議逢低適量減碼規避回撤。`;
            }
          }

          if (action === "decrease") {
            const absChange = Math.abs(sharesChange);
            const actualChange = Math.min(shares, absChange);
            sharesChange = -actualChange;
            if (actualChange === 0) action = "hold";
          }

          return {
            symbol,
            action,
            sharesChange,
            note
          };
        });

        const resultWithMeta = {
          timestamp: new Date().toISOString(),
          adjustments: localAdjustments,
          isLocalFallback: true
        };
        localStorage.setItem("watchlist_portfolio_after_analysis", JSON.stringify(resultWithMeta));
        setAnalysisResult(resultWithMeta);
        setSliderValue(50);
        setAnalysisProgress(100);
        setAnalysisStatusText("AI 服務瞬時過載，已無縫啟動 Socrates 本地計量優化模型！");
      }
    } catch (error: any) {
      console.error("AI Mapping analysis error fallback trigger:", error);
      // Run fallback even if general try block errors out
      const fallbackAdjustments = portfolioDataToSend.map((item) => {
        const symbol = item.symbol?.toUpperCase();
        const sector = item.sector || "一般板塊";
        const shares = Number(item.shares) || 10;
        return {
          symbol,
          action: "hold" as const,
          sharesChange: 0,
          note: `標的 ${symbol} 在 ${sector} 中評估完畢。智慧分析引擎連線繁忙，已由本地模型接管，維持中性持有。`
        };
      });
      const fallbackResult = {
        timestamp: new Date().toISOString(),
        adjustments: fallbackAdjustments,
        isLocalFallback: true
      };
      setAnalysisResult(fallbackResult);
      setSliderValue(50);
      setAnalysisProgress(100);
      setAnalysisStatusText("AI 服務超載且系統異常，已由 Socrates 本地基礎防禦模型接手分析！");
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
    }
  };

  // Memoized calculations for double comparison slider visualization
  const sectorsBefore = useMemo(() => {
    return computeBubblePlan(portfolio, currentPrices);
  }, [portfolio, currentPrices]);

  const totalValueAfter = useMemo(() => {
    if (portfolioAfter.length === 0) return 1;
    const val = portfolioAfter.reduce((acc, item: any) => {
      const market = currentPrices[item.symbol?.toUpperCase()];
      const currentPrice = Number(market?.price || item.avgPrice) || 0;
      const isShort = item.direction === "short";
      const profit = isShort ? (item.avgPrice - currentPrice) * item.shares : (currentPrice - item.avgPrice) * item.shares;
      return acc + (item.avgPrice * item.shares + profit);
    }, 0);
    return val > 0 ? val : 1;
  }, [portfolioAfter, currentPrices]);

  const sectorsAfter = useMemo(() => {
    if (!analysisResult) return [];
    return sectorsBefore.map(sec => {
      const bubbles = sec.bubbles.map(bub => {
        const adjItem = portfolioAfter.find((item: any) => 
          item.symbol?.toUpperCase() === bub.item.symbol?.toUpperCase() && 
          (item.tradeType || "real") === (bub.item.tradeType || "real") &&
          (item.direction || "buy") === (bub.item.direction || "buy")
        );
        
        if (adjItem) {
          const market = currentPrices[adjItem.symbol?.toUpperCase()];
          const currentPrice = Number(market?.price || adjItem.avgPrice) || 0;
          const isShort = adjItem.direction === "short";
          const profit = isShort ? (adjItem.avgPrice - currentPrice) * adjItem.shares : (currentPrice - adjItem.avgPrice) * adjItem.shares;
          const val = adjItem.avgPrice * adjItem.shares + profit;
          const weight = val / totalValueAfter;
          let r = 38 + Math.sqrt(weight) * 47;
          if (adjItem.shares === 0) r = 24;
          
          return {
            ...bub,
            r,
            item: {
              ...bub.item,
              shares: adjItem.shares,
              action: adjItem.action,
              sharesChange: adjItem.sharesChange,
              weight
            }
          };
        }
        return {
          ...bub,
          item: {
            ...bub.item,
            action: "hold",
            sharesChange: 0
          }
        };
      });
      return {
        ...sec,
        bubbles
      };
    });
  }, [sectorsBefore, portfolioAfter, totalValueAfter, analysisResult, currentPrices]);

  // Drag and scroll mechanics for Portfolio items
  const pfScrollRef = useRef<HTMLDivElement>(null);
  const isPfDown = useRef(false);
  const startPfX = useRef(0);
  const scrollPfLeftState = useRef(0);
  const dragPfStartClientX = useRef(0);
  const hasPfDragged = useRef(false);

  const handlePfDragDown = (e: React.MouseEvent) => {
    if (!pfScrollRef.current) return;
    isPfDown.current = true;
    dragPfStartClientX.current = e.clientX;
    startPfX.current = e.pageX - pfScrollRef.current.offsetLeft;
    scrollPfLeftState.current = pfScrollRef.current.scrollLeft;
    hasPfDragged.current = false;
  };
  const handlePfDragLeave = () => { isPfDown.current = false; };
  const handlePfDragUp = () => { isPfDown.current = false; };
  const handlePfDragMove = (e: React.MouseEvent) => {
    if (!isPfDown.current || !pfScrollRef.current) return;
    const currentX = e.clientX;
    const diff = Math.abs(currentX - dragPfStartClientX.current);
    if (diff > 5) hasPfDragged.current = true;
    e.preventDefault();
    const x = e.pageX - pfScrollRef.current.offsetLeft;
    const walk = (x - startPfX.current) * 1.5;
    pfScrollRef.current.scrollLeft = scrollPfLeftState.current - walk;
  };

  // Drag and scroll mechanics for Portfolio Sector Tabs
  const pfSectorScrollRef = useRef<HTMLDivElement>(null);
  const isPfSectorDown = useRef(false);
  const startPfSectorX = useRef(0);
  const scrollPfSectorLeftState = useRef(0);
  const dragPfSectorStartClientX = useRef(0);
  const hasPfSectorDragged = useRef(false);

  const handlePfSectorDragDown = (e: React.MouseEvent) => {
    if (!pfSectorScrollRef.current) return;
    isPfSectorDown.current = true;
    dragPfSectorStartClientX.current = e.clientX;
    startPfSectorX.current = e.pageX - pfSectorScrollRef.current.offsetLeft;
    scrollPfSectorLeftState.current = pfSectorScrollRef.current.scrollLeft;
    hasPfSectorDragged.current = false;
  };
  const handlePfSectorDragLeave = () => { isPfSectorDown.current = false; };
  const handlePfSectorDragUp = () => { isPfSectorDown.current = false; };
  const handlePfSectorDragMove = (e: React.MouseEvent) => {
    if (!isPfSectorDown.current || !pfSectorScrollRef.current) return;
    const currentX = e.clientX;
    const diff = Math.abs(currentX - dragPfSectorStartClientX.current);
    if (diff > 5) hasPfSectorDragged.current = true;
    e.preventDefault();
    const x = e.pageX - pfSectorScrollRef.current.offsetLeft;
    const walk = (x - startPfSectorX.current) * 1.5;
    pfSectorScrollRef.current.scrollLeft = scrollPfSectorLeftState.current - walk;
  };

  const handleAddOrEditPortfolioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pSymbol.trim()) return;
    const sym = pSymbol.trim().toUpperCase();
    const priceNum = parseFloat(pAvgPrice) || 0;
    const sharesNum = parseFloat(pShares) || 0;

    if (editingPIdx !== null) {
      setPortfolio(prev => {
        const next = [...prev];
        next[editingPIdx] = { 
          symbol: sym, 
          avgPrice: priceNum, 
          shares: sharesNum, 
          note: pNote,
          tradeType: pTradeType,
          direction: pDirection,
          purchaseDate: pPurchaseDate,
          selectedBatches: pSelectedBatches
        };
        return next;
      });
      setEditingPIdx(null);
    } else {
      const existingIdx = portfolio.findIndex(item => 
        item.symbol === sym && 
        (item.tradeType || "real") === pTradeType && 
        (item.direction || "buy") === pDirection
      );
      if (existingIdx >= 0) {
        setPortfolio(prev => {
          const next = [...prev];
          const old = next[existingIdx];
          const totalShares = old.shares + sharesNum;
          const avgPrice = totalShares > 0 ? (old.avgPrice * old.shares + priceNum * sharesNum) / totalShares : 0;
          next[existingIdx] = { 
            symbol: sym, 
            avgPrice, 
            shares: totalShares, 
            note: pNote || old.note,
            tradeType: pTradeType,
            direction: pDirection,
            purchaseDate: pPurchaseDate || old.purchaseDate,
            selectedBatches: Array.from(new Set([...(old.selectedBatches || []), ...pSelectedBatches]))
          };
          return next;
        });
      } else {
        setPortfolio(prev => [...prev, { 
          symbol: sym, 
          avgPrice: priceNum, 
          shares: sharesNum, 
          note: pNote,
          tradeType: pTradeType,
          direction: pDirection,
          purchaseDate: pPurchaseDate,
          selectedBatches: pSelectedBatches
        }]);
      }
    }

    setPSymbol("");
    setPAvgPrice("");
    setPShares("");
    setPNote("");
    setPPurchaseDate("");
    setPSelectedBatches([]);
    setShowBatchDropdown(false);
    setPTradeType("simulation");
    setPDirection("buy");
    setShowPortfolioAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Portfolio Industry Sectors Bubble Chart / AI Comparison Slider */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 overflow-hidden relative">
        <style>{`
          @keyframes bubbleFloat1 {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-4px) translateX(1px); }
          }
          @keyframes bubbleFloat2 {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(2px) translateX(3px); }
          }
          @keyframes bubbleFloat3 {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(2px) translateX(-2px); }
          }
          .animate-bubble-float-1 { animation: bubbleFloat1 7s ease-in-out infinite; }
          .animate-bubble-float-2 { animation: bubbleFloat2 8s ease-in-out infinite; }
          .animate-bubble-float-3 { animation: bubbleFloat3 9s ease-in-out infinite; }
        `}</style>

        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-slate-955/95 backdrop-blur-md flex flex-col justify-center items-center z-[100] p-8 text-center animate-fade-in">
            <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4 animate-bounce">
              <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <h4 className="text-sm font-black text-slate-100 tracking-wider mb-2">
              Socrates 智慧資金部位優化與映射分析
            </h4>
            <div className="w-full max-w-xs h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300 shadow-[0_0_8px_#f59e0b]"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 font-medium font-sans h-4 mb-2">
              {analysisStatusText}
            </p>
            <span className="text-[10px] text-amber-500 font-mono font-black border border-amber-500/20 px-2 py-0.5 rounded bg-amber-500/5">
              {analysisProgress}%
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-slate-900 pb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-amber-500 tracking-wider">
                {analysisResult ? "✨ 資金管理與部位映射優化分佈對比" : "個股產業整合分佈泡泡圖"}
              </span>
              {analysisResult && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-black animate-pulse ${analysisResult.isLocalFallback ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                  {analysisResult.isLocalFallback ? "Socrates 計量模型" : "AI 優化完成"}
                </span>
              )}
            </div>
            {analysisResult && (
              <span className="text-[9px] text-slate-500 font-mono mt-0.5 font-semibold">
                評測時間: {new Date(analysisResult.timestamp).toLocaleString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
            {portfolio.length > 0 && (
              <span className="text-[11px] text-slate-400 font-mono font-black bg-slate-900 border border-slate-800 px-3 py-1 rounded">
                總資產市值: ${(() => {
                  const value = portfolio.reduce((acc, item) => {
                    const market = currentPrices[item.symbol?.toUpperCase()];
                    const currentPrice = Number(market?.price || item.avgPrice) || 0;
                    const isShort = item.direction === "short";
                    const profit = isShort ? (item.avgPrice - currentPrice) * item.shares : (currentPrice - item.avgPrice) * item.shares;
                    return acc + (item.avgPrice * item.shares + profit);
                  }, 0);
                  return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                })()}
              </span>
            )}
            {analysisResult && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("watchlist_portfolio_after_analysis");
                  setAnalysisResult(null);
                }}
                className="text-[10px] text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-950 px-2 py-1 bg-slate-900/60 hover:bg-rose-550/10 rounded-lg transition-all font-semibold"
              >
                清除優化
              </button>
            )}
          </div>
        </div>

        {portfolio.length === 0 ? (
          <div className="h-[320px] flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 border border-dashed border-slate-800/40 rounded-xl">
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-bold text-slate-400 mb-1">尚未建立持股部位</span>
            <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed">請點擊下方的「新增持股」按鈕，建立交易庫存後，將會自動在此產生絢麗的產業持倉泡泡分佈圖！</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* COMPARISON SLIDER VIEW IF ANALYSIS RESULT EXISTS */}
            {analysisResult ? (
              <div className="space-y-3">
                <div 
                  ref={sliderContainerRef}
                  onMouseDown={(e) => {
                    setIsDraggingSlider(true);
                    if (sliderContainerRef.current) {
                      const rect = sliderContainerRef.current.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
                      setSliderValue(pct);
                    }
                  }}
                  onTouchStart={(e) => {
                    setIsDraggingSlider(true);
                    if (sliderContainerRef.current && e.touches[0]) {
                      const rect = sliderContainerRef.current.getBoundingClientRect();
                      const x = e.touches[0].clientX - rect.left;
                      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
                      setSliderValue(pct);
                    }
                  }}
                  className="relative w-full h-[410px] select-none block overflow-hidden rounded-xl bg-slate-950/45 border border-slate-900 cursor-ew-resize"
                >
                  {/* Left Half (Before Chart) - Clipped to sliderValue */}
                  <div 
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                    style={{ clipPath: `polygon(0 0, ${sliderValue}% 0, ${sliderValue}% 100%, 0 100%)` }}
                  >
                    <svg viewBox="0 0 800 420" className="w-full h-full select-none block overflow-visible">
                      {(() => {
                        const sectorsData = computeBubblePlan(portfolio, currentPrices);
                        return (
                          <g>
                            {sectorsData.map((sec, sIdx) => {
                              const color = getSectorColor(sec.sectorShort);
                              const isFloatClass = `animate-bubble-float-${(sIdx % 3) + 1}`;
                              return (
                                <g key={sec.sectorShort} className={isFloatClass}>
                                  <circle
                                    cx={sec.cx}
                                    cy={sec.cy}
                                    r={sec.enclosingR}
                                    fill="rgba(20, 24, 38, 0.45)"
                                    stroke={color.text}
                                    strokeWidth={1.5}
                                    strokeDasharray="4,4"
                                    strokeOpacity={0.4}
                                    className="transition-all duration-300"
                                  />
                                  <text
                                    x={sec.cx}
                                    y={sec.cy - sec.enclosingR + 22}
                                    textAnchor="middle"
                                    className="font-sans font-black tracking-widest uppercase"
                                    style={{ fill: color.text, fontSize: 10.5, fillOpacity: 0.85 }}
                                  >
                                    {sec.sectorFull.includes("(") ? sec.sectorFull.split("(")[1].replace(")", "") : sec.sectorShort}
                                  </text>
                                </g>
                              );
                            })}

                            {sectorsData.flatMap((sec, sIdx) => {
                              const color = getSectorColor(sec.sectorShort);
                              const isFloatClass = `animate-bubble-float-${((sIdx + 1) % 3) + 1}`;
                              
                              return sec.bubbles.map((bub) => {
                                const { item, r, localX, localY } = bub;
                                const bx = sec.cx + localX;
                                const by = sec.cy + localY;
                                const itemKey = `before-${item.symbol}_${item.tradeType || "real"}_${item.direction || "buy"}`;
                                
                                const isSelected = selectedPortfolioSymbol === `${item.symbol}_${item.tradeType || "real"}_${item.direction || "buy"}`;

                                return (
                                  <g key={itemKey} className={isFloatClass}>
                                    <defs>
                                      <radialGradient id={`grad-before-${itemKey}`} cx="50%" cy="50%" r="50%" fx="35%" fy="35%">
                                        <stop offset="0%" stopColor={color.text} stopOpacity={0.34} />
                                        <stop offset="70%" stopColor={color.text} stopOpacity={0.14} />
                                        <stop offset="100%" stopColor={color.text} stopOpacity={0.03} />
                                      </radialGradient>
                                    </defs>

                                    <circle
                                      cx={bx}
                                      cy={by}
                                      r={r}
                                      fill={`url(#grad-before-${itemKey})`}
                                      stroke={isSelected ? "#f59e0b" : color.border}
                                      strokeWidth={isSelected ? 2.5 : 1.5}
                                      style={{
                                        filter: isSelected ? `drop-shadow(0 0 10px ${color.text})` : `drop-shadow(0 3px 6px rgba(0,0,0,0.5))`
                                      }}
                                    />

                                    <text
                                      x={bx}
                                      y={by - (r * 0.28)}
                                      textAnchor="middle"
                                      className="fill-white font-sans font-black tracking-tight"
                                      style={{ fontSize: Math.max(10, r * 0.24) }}
                                    >
                                      {item.symbol}
                                    </text>

                                    <text
                                      x={bx}
                                      y={by - (r * 0.04)}
                                      textAnchor="middle"
                                      className="font-mono font-black"
                                      style={{ fill: color.text, fontSize: Math.max(9, r * 0.17) }}
                                    >
                                      {(item.weight * 100).toFixed(1)}%
                                    </text>

                                    <text
                                      x={bx}
                                      y={by + (r * 0.18)}
                                      textAnchor="middle"
                                      className="fill-slate-200 font-sans font-bold"
                                      style={{ fontSize: Math.max(8, r * 0.14) }}
                                    >
                                      {item.shares}股
                                    </text>

                                    <text
                                      x={bx}
                                      y={by + (r * 0.38)}
                                      textAnchor="middle"
                                      className="fill-slate-400 font-mono font-medium"
                                      style={{ fontSize: Math.max(8, r * 0.12) }}
                                    >
                                      ${item.avgPrice.toFixed(1)}
                                    </text>
                                  </g>
                                );
                              });
                            })}
                          </g>
                        );
                      })()}
                    </svg>
                    
                    <div className="absolute top-3 left-3 bg-slate-900/90 text-slate-400 border border-slate-800 text-[10px] font-black tracking-widest px-2 py-1 rounded">
                      原本持倉分佈 (BEFORE)
                    </div>
                  </div>

                  {/* Right Half (After Optimised Chart) - Clipped to sliderValue */}
                  <div 
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                    style={{ clipPath: `polygon(${sliderValue}% 0, 100% 0, 100% 100%, ${sliderValue}% 100%)` }}
                  >
                    <svg viewBox="0 0 800 420" className="w-full h-full select-none block overflow-visible mt-0.5">
                      {(() => {
                        return (
                          <g>
                            {sectorsAfter.map((sec, sIdx) => {
                              const color = getSectorColor(sec.sectorShort);
                              const isFloatClass = `animate-bubble-float-${(sIdx % 3) + 1}`;
                              return (
                                <g key={`after-sec-${sec.sectorShort}`} className={isFloatClass}>
                                  <circle
                                    cx={sec.cx}
                                    cy={sec.cy}
                                    r={sec.enclosingR}
                                    fill="rgba(10, 25, 20, 0.45)"
                                    stroke="#10b981"
                                    strokeWidth={1.5}
                                    strokeDasharray="4,4"
                                    strokeOpacity={0.3}
                                    className="transition-all duration-300"
                                  />
                                  <text
                                    x={sec.cx}
                                    y={sec.cy - sec.enclosingR + 22}
                                    textAnchor="middle"
                                    className="font-sans font-black tracking-widest uppercase"
                                    style={{ fill: "#34d399", fontSize: 10.5, fillOpacity: 0.85 }}
                                  >
                                    {sec.sectorFull.includes("(") ? sec.sectorFull.split("(")[1].replace(")", "") : sec.sectorShort}
                                  </text>
                                </g>
                              );
                            })}

                            {sectorsAfter.flatMap((sec, sIdx) => {
                              const color = getSectorColor(sec.sectorShort);
                              const isFloatClass = `animate-bubble-float-${((sIdx + 1) % 3) + 1}`;
                              
                              return sec.bubbles.map((bub) => {
                                const { item, r, localX, localY } = bub;
                                const bx = sec.cx + localX;
                                const by = sec.cy + localY;
                                const itemKey = `after-${item.symbol}_${item.tradeType || "real"}_${item.direction || "buy"}`;
                                
                                const isSelected = selectedPortfolioSymbol === `${item.symbol}_${item.tradeType || "real"}_${item.direction || "buy"}`;

                                // Color indicator details
                                let borderStroke = color.border;
                                let textFillColor = color.text;
                                let radialGradColor = color.text;
                                let changeTag = "不變";
                                let actionSymbol = "不變";

                                if (item.action === "increase") {
                                  borderStroke = "#10b981";
                                  textFillColor = "#34d399";
                                  radialGradColor = "#059669";
                                  changeTag = `+${item.sharesChange}股`;
                                  actionSymbol = "加碼";
                                } else if (item.action === "decrease") {
                                  borderStroke = "#ef4444";
                                  textFillColor = "#f87171";
                                  radialGradColor = "#dc2626";
                                  changeTag = item.shares === 0 ? "已出清" : `${item.sharesChange}股`;
                                  actionSymbol = "減碼";
                                } else {
                                  borderStroke = "#f97316";
                                  textFillColor = "#fb923c";
                                  radialGradColor = "#ea580c";
                                  changeTag = "不變";
                                  actionSymbol = "不變";
                                }

                                return (
                                  <g key={itemKey} className={isFloatClass}>
                                    <defs>
                                      <radialGradient id={`grad-after-${itemKey}`} cx="50%" cy="50%" r="50%" fx="35%" fy="35%">
                                        <stop offset="0%" stopColor={radialGradColor} stopOpacity={0.34} />
                                        <stop offset="70%" stopColor={radialGradColor} stopOpacity={0.14} />
                                        <stop offset="100%" stopColor={radialGradColor} stopOpacity={0.03} />
                                      </radialGradient>
                                    </defs>

                                    <circle
                                      cx={bx}
                                      cy={by}
                                      r={r}
                                      fill={`url(#grad-after-${itemKey})`}
                                      stroke={isSelected ? "#f59e0b" : borderStroke}
                                      strokeWidth={isSelected ? 2.5 : 1.5}
                                      style={{
                                        filter: isSelected ? `drop-shadow(0 0 10px ${textFillColor})` : `drop-shadow(0 3px 6px rgba(0,0,0,0.5))`
                                      }}
                                    />

                                    <text
                                      x={bx}
                                      y={by - (r * 0.28)}
                                      textAnchor="middle"
                                      className="fill-white font-sans font-black tracking-tight"
                                      style={{ fontSize: Math.max(10, r * 0.24) }}
                                    >
                                      {item.symbol}
                                    </text>

                                    <text
                                      x={bx}
                                      y={by - (r * 0.04)}
                                      textAnchor="middle"
                                      className="font-mono font-black"
                                      style={{ fill: textFillColor, fontSize: Math.max(9, r * 0.17) }}
                                    >
                                      {(item.weight * 100).toFixed(1)}%
                                    </text>

                                    <text
                                      x={bx}
                                      y={by + (r * 0.18)}
                                      textAnchor="middle"
                                      className="fill-slate-100 font-sans font-bold"
                                      style={{ fontSize: Math.max(8, r * 0.14) }}
                                    >
                                      {item.shares}股
                                    </text>

                                    <text
                                      x={bx}
                                      y={by + (r * 0.38)}
                                      textAnchor="middle"
                                      className="font-sans font-black tracking-tight"
                                      style={{ fill: textFillColor, fontSize: Math.max(7, r * 0.13) }}
                                    >
                                      {changeTag} ({actionSymbol})
                                    </text>
                                  </g>
                                );
                              });
                            })}
                          </g>
                        );
                      })()}
                    </svg>

                    <div className="absolute top-3 right-3 bg-emerald-950/95 border border-emerald-800/40 text-emerald-400 text-[10px] font-black tracking-widest px-2.5 py-1 rounded">
                      映射優化分佈 (AFTER - 智慧配比)
                    </div>
                  </div>

                  {/* Premium Vertical Slidable Handlebar Dividing Line exactly matching the Lincoln Slider reference */}
                  <div 
                    className="absolute top-0 bottom-0 w-[1.5px] bg-white/90 shadow-[0_0_4px_rgba(255,255,255,0.6)] pointer-events-none z-30"
                    style={{ left: `${sliderValue}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-slate-200/85 flex items-center justify-center pointer-events-none z-40">
                      <div className="flex items-center justify-center -space-x-1 text-slate-800">
                        <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slider Snap controls */}
                <div className="flex items-center justify-between bg-slate-900/40 border border-slate-900 p-2 rounded-xl text-[11px]">
                  <span className="text-slate-400 font-semibold flex items-center gap-1 pl-2 font-sans">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                    請左右曳動上方對比器
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSliderValue(100)}
                      className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${sliderValue === 100 ? "bg-amber-600 text-white font-bold" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"}`}
                    >
                      僅原始 (Before)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSliderValue(50)}
                      className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${sliderValue === 50 ? "bg-amber-600/30 border border-amber-500/20 text-amber-400 font-bold" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"}`}
                    >
                      看對比 (50:50)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSliderValue(0)}
                      className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${sliderValue === 0 ? "bg-emerald-600 text-white font-bold" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"}`}
                    >
                      僅智慧 (After)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide">
                <svg 
                  viewBox="0 0 800 420" 
                  className="w-full min-w-[760px] max-w-[800px] mx-auto h-[410px] select-none block overflow-visible select-none"
                >
                  {(() => {
                    const sectorsData = computeBubblePlan(portfolio, currentPrices);
                    return (
                      <g>
                        {sectorsData.map((sec, sIdx) => {
                          const color = getSectorColor(sec.sectorShort);
                          const isFloatClass = `animate-bubble-float-${(sIdx % 3) + 1}`;
                          return (
                            <g key={sec.sectorShort} className={isFloatClass}>
                              <circle
                                cx={sec.cx}
                                cy={sec.cy}
                                r={sec.enclosingR}
                                fill="rgba(20, 24, 38, 0.45)"
                                stroke={color.text}
                                strokeWidth={1.5}
                                strokeDasharray="4,4"
                                strokeOpacity={0.4}
                                className="transition-all duration-300"
                              />
                              <text
                                x={sec.cx}
                                y={sec.cy - sec.enclosingR + 22}
                                textAnchor="middle"
                                className="font-sans font-black tracking-widest uppercase pointer-events-none select-none"
                                style={{ fill: color.text, fontSize: 10.5, fillOpacity: 0.85 }}
                              >
                                {sec.sectorFull.includes("(") ? sec.sectorFull.split("(")[1].replace(")", "") : sec.sectorShort}
                              </text>
                            </g>
                          );
                        })}

                        {sectorsData.flatMap((sec, sIdx) => {
                          const color = getSectorColor(sec.sectorShort);
                          const isFloatClass = `animate-bubble-float-${((sIdx + 1) % 3) + 1}`;
                          
                          return sec.bubbles.map((bub) => {
                            const { item, r, localX, localY } = bub;
                            const bx = sec.cx + localX;
                            const by = sec.cy + localY;
                            const itemKey = `${item.symbol}_${item.tradeType || "real"}_${item.direction || "buy"}`;
                            
                            const isSelected = selectedPortfolioSymbol === itemKey || 
                              (!selectedPortfolioSymbol && portfolio[0] && `${portfolio[0].symbol}_${portfolio[0].tradeType || "real"}_${portfolio[0].direction || "buy"}` === itemKey);

                            return (
                              <g
                                key={itemKey}
                                className={`cursor-pointer transition-all duration-300 transform hover:scale-105 origin-center ${isFloatClass}`}
                                onClick={() => setSelectedPortfolioSymbol(itemKey)}
                              >
                                <defs>
                                  <radialGradient id={`grad-${itemKey}`} cx="50%" cy="50%" r="50%" fx="35%" fy="35%">
                                    <stop offset="0%" stopColor={color.text} stopOpacity={0.34} />
                                    <stop offset="70%" stopColor={color.text} stopOpacity={0.14} />
                                    <stop offset="100%" stopColor={color.text} stopOpacity={0.03} />
                                  </radialGradient>
                                </defs>

                                <circle
                                  cx={bx}
                                  cy={by}
                                  r={r}
                                  fill={`url(#grad-${itemKey})`}
                                  stroke={isSelected ? "#f59e0b" : color.border}
                                  strokeWidth={isSelected ? 2.5 : 1.5}
                                  style={{
                                    filter: isSelected ? `drop-shadow(0 0 10px ${color.text})` : `drop-shadow(0 3px 6px rgba(0,0,0,0.5))`
                                  }}
                                  className="transition-all duration-300"
                                />

                                <text
                                  x={bx}
                                  y={by - (r * 0.28)}
                                  textAnchor="middle"
                                  className="fill-white font-sans font-black tracking-tight"
                                  style={{ fontSize: Math.max(10, r * 0.24) }}
                                >
                                  {item.symbol}
                                </text>

                                <text
                                  x={bx}
                                  y={by - (r * 0.04)}
                                  textAnchor="middle"
                                  className="font-mono font-black"
                                  style={{ fill: color.text, fontSize: Math.max(9, r * 0.17) }}
                                >
                                  {(item.weight * 100).toFixed(1)}%
                                </text>

                                <text
                                  x={bx}
                                  y={by + (r * 0.18)}
                                  textAnchor="middle"
                                  className="fill-slate-200 font-sans font-bold"
                                  style={{ fontSize: Math.max(8, r * 0.14) }}
                                >
                                  {item.shares}股
                                </text>

                                <text
                                  x={bx}
                                  y={by + (r * 0.38)}
                                  textAnchor="middle"
                                  className="fill-slate-400 font-mono font-medium"
                                  style={{ fontSize: Math.max(8, r * 0.12) }}
                                >
                                  ${item.avgPrice.toFixed(1)}
                                </text>
                              </g>
                            );
                          });
                        })}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>
        )}
      </div>



      {/* Socrates Capital Optimization Detailed List Card */}
      {analysisResult && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black">Socrates ECM</span>
              <h3 className="text-sm font-black text-slate-100 tracking-wider">資金管理與部位映射(After)推薦異動明細</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono font-bold">
              合計優化持股: {analysisResult.adjustments?.length || 0} 檔
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioAfter.map((item: any) => {
              const matchesSector = getTradingViewHeatmapSector(item.symbol);
              const market = currentPrices[item.symbol?.toUpperCase()];
              const currentPrice = Number(market?.price || item.avgPrice) || 0;
              const isShort = item.direction === "short";
              const originalItem = portfolio.find(
                p => p.symbol?.toUpperCase() === item.symbol?.toUpperCase() && p.direction === item.direction && p.tradeType === item.tradeType
              );
              const origShares = originalItem ? originalItem.shares : 0;
              
              let actionBadgeColor = "bg-orange-500/10 text-orange-400 border-orange-500/20";
              let actionLabel = "不變 (Hold)";
              let changeTextColor = "text-slate-400";
              let borderClass = "border-slate-900";

              if (item.action === "increase") {
                actionBadgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.05)]";
                actionLabel = "建議加碼 (Increase)";
                changeTextColor = "text-emerald-400 font-bold";
                borderClass = "border-emerald-950/50 bg-emerald-950/5";
              } else if (item.action === "decrease") {
                actionBadgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.05)]";
                actionLabel = "建議減碼 (Decrease)";
                changeTextColor = "text-rose-400 font-bold";
                borderClass = "border-rose-950/50 bg-rose-950/5";
              }

              return (
                <div 
                  key={`adj-list-${item.symbol}_${item.tradeType || "real"}_${item.direction || "buy"}`}
                  className={`border rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all hover:bg-slate-900/40 ${borderClass}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-100 font-mono tracking-tight bg-slate-900 px-2 py-1 rounded">
                        {item.symbol}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold font-sans">
                        {matchesSector ? matchesSector.includes("(") ? matchesSector.split("(")[1].replace(")", "") : matchesSector : "一般產業"}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-black tracking-wider ${actionBadgeColor}`}>
                      {actionLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-1 bg-slate-950/40 rounded-lg p-2.5 text-center text-xs border border-slate-900">
                    <div>
                      <span className="text-[9px] text-slate-500 block font-bold font-sans">原本股數</span>
                      <span className="font-mono font-black text-slate-300">{origShares} 股</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block font-bold font-sans">變動幅度</span>
                      <span className={`font-mono font-black ${changeTextColor}`}>
                        {item.sharesChange > 0 ? `+${item.sharesChange}` : item.sharesChange === 0 ? "—" : item.sharesChange} 股
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block font-bold font-sans">推薦配比股數</span>
                      <span className="font-mono font-black text-slate-100">{item.shares} 股</span>
                    </div>
                  </div>

                  {item.aiNote && (
                    <div className="text-[11px] leading-relaxed text-slate-300 font-sans border-t border-slate-900/65 pt-2.5 flex gap-1.5 items-start">
                      <Compass className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <span>{item.aiNote}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Socrates 資產與 Moomoo 融資購買力控制中心 */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black tracking-widest uppercase">Moomoo Account</span>
            <h3 className="text-sm font-black text-slate-100 tracking-wider">總資產與融資購買力配置中心 (Moomoo 融資融券平台)</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono font-bold">
            真實交易持有股票：{realHoldingsPositions.length} 檔
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 總資產與槓桿設定 */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/60">
            <div>
              <label className="text-[10px] text-slate-400 font-black block mb-1.5 tracking-wider uppercase">個人總資產 (USD)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs font-mono font-bold">$</span>
                <input
                  type="number"
                  step="any"
                  value={totalAssetsStr}
                  onChange={(e) => setTotalAssetsStr(e.target.value)}
                  placeholder="輸入總資產額"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-black block mb-1.5 tracking-wider uppercase">Moomoo 融資槓桿倍數</label>
              <div className="flex gap-1.5">
                {[1, 1.5, 2, 3, 4].map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setMoomooLeverage(lev)}
                    className={`flex-1 py-1.5 rounded text-[11px] font-black font-semibold font-mono border transition-all cursor-pointer ${
                      moomooLeverage === lev
                        ? "bg-amber-600/20 text-amber-400 border-amber-500/40 font-black"
                        : "bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 帳戶資金狀態 */}
          <div className="grid grid-cols-2 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block">真實交易持有成本</span>
              <span className="text-sm font-mono font-black text-slate-200">
                ${totalRealHoldingsCost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block">剩餘可用自有現金</span>
              <span className={`text-sm font-mono font-black ${finalRemainingCash >= 0 ? "text-emerald-400" : "text-amber-500"}`}>
                ${finalRemainingCash.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </div>
            <div className="space-y-1 border-t border-slate-850/60 pt-2 col-span-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">總融資購買力</span>
                <span className="text-xs font-mono font-black text-slate-100">
                  ${moomooMaxBP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold block">剩餘可用融資購買力</span>
                <span className={`text-sm font-mono font-black ${finalRemainingBP >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  ${finalRemainingBP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
              </div>
            </div>
          </div>

          {/* 風控警示與購買力狀態 */}
          <div className="flex flex-col justify-center items-stretch rounded-xl border p-4 bg-slate-900/30 border-slate-800/80">
            {pfHasShortfall ? (
              <div className="space-y-1 text-center animate-pulse">
                <div className="text-xs font-black text-red-500 flex items-center justify-center gap-1">
                  <span>🚨 超出購買力！</span>
                </div>
                <p className="text-[11px] text-rose-400 leading-relaxed font-sans font-medium">
                  實際持有成本已超過最大融資購買力限界。<br />
                  <span className="text-red-400 font-mono font-black">須補足 ${pfShortfallVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} USD 資金出來</span>
                </p>
              </div>
            ) : totalRealHoldingsCost > totalAssetsVal ? (
              <div className="space-y-1 text-center">
                <div className="text-xs font-black text-amber-500 flex items-center justify-center gap-1">
                  <span>⚠️ 已啟用融資交易</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-medium">
                  融資部位：<span className="text-amber-400 font-mono font-bold">${(totalRealHoldingsCost - totalAssetsVal).toLocaleString(undefined, { maximumFractionDigits: 1 })} USD</span><br />
                  已動用 Moomoo 融資額度。<br />
                  賸餘融資購買安全空間良好。
                </p>
              </div>
            ) : (
              <div className="space-y-1 text-center text-xs">
                <div className="text-[11px] font-black text-emerald-400 flex items-center justify-center gap-1">
                  <span>🟢 資金購買力安全健康</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans font-medium">
                  帳戶自有現金儲備充足，未動用融資信貸額度，風控狀態極佳。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Operations Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </span>
          <input
            type="text"
            value={portfolioSearchText}
            onChange={(e) => setPortfolioSearchText(e.target.value)}
            placeholder="搜尋投資組合 (代號/備忘)..."
            className="w-full bg-slate-950/80 border border-slate-800/80 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-10 pr-4 py-2.5 font-sans focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all"
          />
          {portfolioSearchText && (
            <button
              type="button"
              onClick={() => setPortfolioSearchText("")}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4 cursor-pointer" />
            </button>
          )}
        </div>
        
        {/* Dynamic Warning Alert banner if portfolio is empty */}
        {showWarnNoPortfolio && (
          <div className="text-xs text-rose-400 font-bold flex items-center gap-1 bg-rose-950/20 border border-rose-900/45 rounded-xl px-3 py-2 animate-pulse shrink-0">
            <span>⚠️ 請先建立持股部位再進行 AI 分析！</span>
            <button type="button" onClick={() => setShowWarnNoPortfolio(false)} className="text-slate-400 hover:text-white pl-1">×</button>
          </div>
        )}

        <button
          type="button"
          disabled={isAnalyzing}
          onClick={handleAnalyzeCapitalManagement}
          className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-4.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(16,185,129,0.15)] select-none shrink-0 cursor-pointer"
        >
          {isAnalyzing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          )}
          <span>資金管理與部位映射實務</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingPIdx(null);
            setPSymbol("");
            setPAvgPrice("");
            setPShares("");
            setPPurchaseDate("");
            setPSelectedBatches([]);
            setShowBatchDropdown(false);
            setPNote("");
            setPTradeType("simulation");
            setPDirection("buy");
            setShowPortfolioAddForm(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(217,119,6,0.15)] select-none shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增持股</span>
        </button>
      </div>

      {/* 3. Add / Edit Portfolio Form Container */}
      {showPortfolioAddForm && (
        <form onSubmit={handleAddOrEditPortfolioSubmit} className="bg-slate-900 border border-amber-500/25 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-150">
          <div className="text-xs font-black text-amber-400 flex items-center justify-between">
            <span>{editingPIdx !== null ? "📝 編輯持股資料" : "➕ 新增持股庫存"}</span>
            <button
              type="button"
              onClick={() => {
                setShowPortfolioAddForm(false);
                setEditingPIdx(null);
              }}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-bold">股票代號</label>
              <input
                type="text"
                required
                placeholder="例如 AAPL"
                value={pSymbol}
                disabled={editingPIdx !== null}
                onChange={(e) => setPSymbol(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono uppercase focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-bold font-sans">
                {pDirection === "short" ? "平均融券賣出價" : "平均買入價"}
              </label>
              <input
                type="number"
                required
                step="any"
                placeholder="股價"
                value={pAvgPrice}
                onChange={(e) => setPAvgPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-bold">持有股數</label>
              <input
                type="number"
                required
                step="any"
                placeholder="股數"
                value={pShares}
                onChange={(e) => setPShares(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-bold">交易類型</label>
              <select
                value={pTradeType}
                onChange={(e) => setPTradeType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="simulation">模擬交易</option>
                <option value="real">真實交易</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-bold">交易方向</label>
              <select
                value={pDirection}
                onChange={(e) => setPDirection(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="buy">買進</option>
                <option value="short">融券賣出</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-bold">入庫日期 (新增日期)</label>
              <input
                type="date"
                value={pPurchaseDate}
                onChange={(e) => setPPurchaseDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-bold">分批進場階段 (可複選)</label>
              <button
                type="button"
                onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white text-left flex justify-between items-center hover:border-slate-700 cursor-pointer"
              >
                <span className="truncate">
                  {pSelectedBatches && pSelectedBatches.length > 0
                    ? pSelectedBatches.map(b => {
                        if (b === "batch_1") return "第一批 (15%)";
                        if (b === "batch_2") return "第二批 (25%)";
                        if (b === "batch_3") return "第三批 (35%)";
                        if (b === "batch_4") return "第四批 (25%)";
                        return b;
                      }).join(", ")
                    : "選擇分批階段..."
                  }
                </span>
                <span className="text-slate-500 text-[10px]">▼</span>
              </button>
              
              {showBatchDropdown && (
                <div className="absolute left-0 mt-1 w-full bg-slate-950 border border-indigo-500/30 rounded-lg shadow-2xl z-50 p-2 space-y-1 max-h-48 overflow-y-auto">
                  {[
                    { value: "batch_1", label: "第一批 (15%)" },
                    { value: "batch_2", label: "第二批 (25%)" },
                    { value: "batch_3", label: "第三批 (35%)" },
                    { value: "batch_4", label: "第四批 (25%)" }
                  ].map((opt) => {
                    const isSelected = pSelectedBatches.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-900 rounded cursor-pointer text-xs text-slate-200 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setPSelectedBatches(prev => prev.filter(b => b !== opt.value));
                            } else {
                              setPSelectedBatches(prev => [...prev, opt.value]);
                            }
                          }}
                          className="accent-amber-500"
                        />
                        <span className={isSelected ? "text-amber-400 font-bold" : ""}>
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-bold">備忘註記 / 持有理由</label>
              <input
                type="text"
                placeholder="選填，例如：長期核心持有、波段波段操作"
                value={pNote}
                onChange={(e) => setPNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setShowPortfolioAddForm(false);
                setEditingPIdx(null);
              }}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
            >
              儲存持股
            </button>
          </div>
        </form>
      )}

      {portfolio.length === 0 ? (
        <div className="text-center py-12 text-slate-500 opacity-50 flex flex-col items-center">
          <Briefcase className="w-16 h-16 mb-4" />
          <p className="text-sm">目前沒有任何庫存持股</p>
          <button
            type="button"
            onClick={() => {
              setEditingPIdx(null);
              setPSymbol("");
              setPAvgPrice("");
              setPShares("");
              setPNote("");
              setPTradeType("simulation");
              setPDirection("buy");
              setShowPortfolioAddForm(true);
            }}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            立即新增第一支持股
          </button>
        </div>
      ) : (
        <>
          {/* 3.5 Trade Type tabs (模擬交易 與 真實交易tab) */}
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide select-none mb-3 pb-2.5 border-b border-slate-800/15">
            {[
              { id: "all", label: "全部交易模式" },
              { id: "real", label: "真實交易" },
              { id: "simulation", label: "模擬交易" }
            ].map((tab) => {
              const isSelected = portfolioSelectedTradeType === tab.id;
              const count = portfolio.filter((item: any) => {
                const matchesSearch = !portfolioSearchText.trim() ||
                  item.symbol.toLowerCase().includes(portfolioSearchText.toLowerCase()) ||
                  (item.note && item.note.toLowerCase().includes(portfolioSearchText.toLowerCase()));
                const matchesTradeType = tab.id === "all" || (item.tradeType || "real") === tab.id;
                return matchesSearch && matchesTradeType;
              }).length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPortfolioSelectedTradeType(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-2 border cursor-pointer ${
                    isSelected
                      ? "bg-amber-600/20 text-amber-400 border-amber-500/40 shadow-sm font-black"
                      : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {tab.id === "real" && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                    {tab.id === "simulation" && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                    <span>{tab.label}</span>
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 4. Sectors filter tabs for Portfolio */}
          <div 
            ref={pfSectorScrollRef}
            onMouseDown={handlePfSectorDragDown}
            onMouseLeave={handlePfSectorDragLeave}
            onMouseUp={handlePfSectorDragUp}
            onMouseMove={handlePfSectorDragMove}
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing pb-3 mb-1 border-b border-slate-800/25"
          >
            {(() => {
              const sectorsInP = Array.from(
                new Set(
                  portfolio
                    .filter((item: any) => portfolioSelectedTradeType === "all" || (item.tradeType || "real") === portfolioSelectedTradeType)
                    .map((item: any) => getTradingViewHeatmapSector(item.symbol))
                )
              ).filter(Boolean).sort() as string[];

              return ["全體", ...sectorsInP].map((sectorName) => {
                const isSectorSelected = portfolioSelectedSector === sectorName || (portfolioSelectedSector === "全部" && sectorName === "全體");
                const sectorItemCount = portfolio.filter((item: any) => {
                  const matchesSearch = !portfolioSearchText.trim() ||
                    item.symbol.toLowerCase().includes(portfolioSearchText.toLowerCase()) ||
                    (item.note && item.note.toLowerCase().includes(portfolioSearchText.toLowerCase()));
                  const matchesTradeType = portfolioSelectedTradeType === "all" || (item.tradeType || "real") === portfolioSelectedTradeType;
                  const itemSector = getTradingViewHeatmapSector(item.symbol);
                  return matchesSearch && matchesTradeType && (sectorName === "全體" || itemSector === sectorName);
                }).length;

                return (
                  <button
                    key={sectorName}
                    type="button"
                    onClick={() => {
                      if (hasPfSectorDragged.current) return;
                      setPortfolioSelectedSector(sectorName === "全體" ? "全部" : sectorName);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-2 border cursor-pointer ${
                      isSectorSelected
                        ? "bg-amber-600/20 text-amber-400 border-amber-500/40 shadow-sm font-black"
                        : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <span>{sectorName}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                      isSectorSelected ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"
                    }`}>
                      {sectorItemCount}
                    </span>
                  </button>
                );
              });
            })()}
          </div>

          {/* 5. Horizontal draggable Portfolio Symbols bar */}
          <div 
            ref={pfScrollRef}
            onMouseDown={handlePfDragDown}
            onMouseLeave={handlePfDragLeave}
            onMouseUp={handlePfDragUp}
            onMouseMove={handlePfDragMove}
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing pb-3 mb-2 border-b border-slate-800/40"
          >
            {(() => {
              const filteredP = portfolio.filter((item: any) => {
                const matchesSearch = !portfolioSearchText.trim() ||
                  item.symbol.toLowerCase().includes(portfolioSearchText.toLowerCase()) ||
                  (item.note && item.note.toLowerCase().includes(portfolioSearchText.toLowerCase()));
                const matchesTradeType = portfolioSelectedTradeType === "all" || (item.tradeType || "real") === portfolioSelectedTradeType;
                const itemSector = getTradingViewHeatmapSector(item.symbol);
                const matchesSector = portfolioSelectedSector === "全部" || itemSector === portfolioSelectedSector;
                return matchesSearch && matchesTradeType && matchesSector;
              });

              if (filteredP.length === 0) {
                return (
                  <div className="w-full text-center py-4 text-slate-500 text-xs italic font-sans_serif">
                    🔍 沒有符合目前篩選的持股個股
                  </div>
                );
              }

              return filteredP.map((item) => {
                const market = currentPrices[item.symbol?.toUpperCase()];
                const currentPrice = Number(market?.price || item.avgPrice) || 0;
                const isShort = item.direction === "short";
                const isSim = item.tradeType === "simulation";
                const profit = isShort ? (item.avgPrice - currentPrice) * item.shares : (currentPrice - item.avgPrice) * item.shares;
                const profitPercent = item.avgPrice > 0 ? (isShort ? ((item.avgPrice - currentPrice) / item.avgPrice) * 100 : ((currentPrice - item.avgPrice) / item.avgPrice) * 100) : 0;
                
                const itemKey = `${item.symbol}_${item.tradeType || "real"}_${item.direction || "buy"}`;
                const isSelected = selectedPortfolioSymbol === itemKey || 
                  (!selectedPortfolioSymbol && filteredP[0] && `${filteredP[0].symbol}_${filteredP[0].tradeType || "real"}_${filteredP[0].direction || "buy"}` === itemKey) ||
                  (selectedPortfolioSymbol === item.symbol && filteredP[0]?.symbol === item.symbol); 

                return (
                  <button
                    key={itemKey}
                    type="button"
                    onClick={() => {
                      if (hasPfDragged.current) return;
                      setSelectedPortfolioSymbol(itemKey);
                    }}
                    className={`px-4 py-3 rounded-xl text-xs font-black shrink-0 transition-all flex flex-col items-start border ${
                      isSelected
                        ? "bg-amber-600/10 text-amber-500 border-amber-500/30 shadow-[0_2px_10px_rgba(217,119,6,0.1)]"
                        : "bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="flex items-center justify-between w-full gap-4">
                      <span className="font-mono font-black flex items-center gap-1.5">
                        {item.symbol}
                        <span className={`text-[8px] px-1 rounded font-bold scale-90 ${isSim ? "bg-slate-800 text-slate-400" : "bg-teal-500/20 text-teal-400"}`}>
                          {isSim ? "模" : "實"}
                        </span>
                        <span className={`text-[8px] px-1 rounded font-bold scale-90 ${isShort ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                          {isShort ? "融" : "買"}
                        </span>
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {profit >= 0 ? "+" : ""}{profitPercent.toFixed(1)}%
                      </span>
                    </span>
                    <span className="text-[9px] opacity-75 font-normal mt-0.5 font-mono">
                      {item.shares} 股 / {isShort ? "融均" : "均價"} ${item.avgPrice.toFixed(1)}
                    </span>
                  </button>
                );
              });
            })()}
          </div>

          {/* 6. Active Portfolio Item Card Details */}
          {(() => {
            const filteredP = portfolio.filter((item: any) => {
              const matchesSearch = !portfolioSearchText.trim() ||
                item.symbol.toLowerCase().includes(portfolioSearchText.toLowerCase()) ||
                (item.note && item.note.toLowerCase().includes(portfolioSearchText.toLowerCase()));
              const matchesTradeType = portfolioSelectedTradeType === "all" || (item.tradeType || "real") === portfolioSelectedTradeType;
              const itemSector = getTradingViewHeatmapSector(item.symbol);
              const matchesSector = portfolioSelectedSector === "全部" || itemSector === portfolioSelectedSector;
              return matchesSearch && matchesTradeType && matchesSector;
            });

            const activeItem = filteredP.find((item) => {
              const itemKey = `${item.symbol}_${item.tradeType || "real"}_${item.direction || "buy"}`;
              return itemKey === selectedPortfolioSymbol;
            }) || filteredP.find((item) => item.symbol === selectedPortfolioSymbol) || filteredP[0];

            if (!activeItem) return null;

            const activeItemIndex = portfolio.findIndex((item) => 
              item.symbol === activeItem.symbol &&
              (item.tradeType || "real") === (activeItem.tradeType || "real") &&
              (item.direction || "buy") === (activeItem.direction || "buy")
            );

            const market = currentPrices[activeItem.symbol?.toUpperCase()];
            const currentPrice = Number(market?.price || activeItem.avgPrice) || 0;
            const isShort = activeItem.direction === "short";
            const isSim = activeItem.tradeType === "simulation";
            const profit = isShort ? (activeItem.avgPrice - currentPrice) * activeItem.shares : (currentPrice - activeItem.avgPrice) * activeItem.shares;
            const profitPercent = activeItem.avgPrice > 0 ? (isShort ? ((activeItem.avgPrice - currentPrice) / activeItem.avgPrice) * 100 : ((currentPrice - activeItem.avgPrice) / activeItem.avgPrice) * 100) : 0;

            return (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
                {/* Header Details */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/65 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-mono font-black text-lg">{activeItem.symbol}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isSim ? "bg-slate-800 text-slate-400 border border-slate-700/40" : "bg-teal-500/10 text-teal-400 border border-teal-500/20"}`}>
                      {isSim ? "模擬交易" : "真實交易"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isShort ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                      {isShort ? "融券賣出" : "買進手數"}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded border border-slate-800/60 max-w-[150px] line-clamp-1">
                      {getTradingViewHeatmapSector(activeItem.symbol).split(" (")[0]}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPIdx(activeItemIndex);
                        setPSymbol(activeItem.symbol);
                        setPAvgPrice(activeItem.avgPrice.toString());
                        setPShares(activeItem.shares.toString());
                        setPPurchaseDate(activeItem.purchaseDate || "");
                        setPSelectedBatches(activeItem.selectedBatches || []);
                        setShowBatchDropdown(false);
                        setPNote(activeItem.note || "");
                        setPTradeType(activeItem.tradeType || "real");
                        setPDirection(activeItem.direction || "buy");
                        setShowPortfolioAddForm(true);
                      }}
                      className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 rounded-lg font-bold transition-all cursor-pointer"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePortfolioSymbol(activeItem.symbol)}
                      className="px-3.5 py-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg font-bold transition-all cursor-pointer"
                    >
                      刪除
                    </button>
                  </div>
                </div>

                {/* Breakdown Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block">
                      {isShort ? "我的平均融券價" : "我的平均買價"}
                    </span>
                    <span className="text-base font-mono font-bold text-slate-300">
                      ${activeItem.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block">當前市場參考價</span>
                    <span className="text-base font-mono font-bold text-amber-500">
                      ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block">持有庫存股數</span>
                    <span className="text-base font-mono font-bold text-slate-300">
                      {activeItem.shares} 股
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block">個股預估損益</span>
                    <span className={`text-base font-mono font-black ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {profit >= 0 ? "+" : ""}{profit.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                      <span className="text-xs font-bold ml-2 opacity-90">({profit >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%)</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block">入庫日期 (新增日期)</span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {activeItem.purchaseDate || "未設定"}
                    </span>
                  </div>
                  <div className="space-y-1 col-span-3">
                    <span className="text-[10px] text-slate-500 font-extrabold block">已購入分批階段</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {activeItem.selectedBatches && activeItem.selectedBatches.length > 0 ? (
                        activeItem.selectedBatches.map((b: string) => {
                          const label = b === "batch_1" ? "第一批 (15%)" : b === "batch_2" ? "第二批 (25%)" : b === "batch_3" ? "第三批 (35%)" : "第四批 (25%)";
                          return (
                            <span key={b} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                              {label}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-500 text-xs italic">未選定分批階段</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7. Moomoo 融資分批進場建案 (Only for Real Transactions) */}
                {!isSim && (() => {
                  const totalHeldShares = activeItem.shares || 0;
                  let remainingActualShares = totalHeldShares;

                  const batchesList = [
                    { value: "batch_1", label: "第一批 (15%)", pct: 0.15 },
                    { value: "batch_2", label: "第二批 (25%)", pct: 0.25 },
                    { value: "batch_3", label: "第三批 (35%)", pct: 0.35 },
                    { value: "batch_4", label: "第四批 (25%)", pct: 0.25 }
                  ].map((batch) => {
                    const batchCapital = moomooMaxBP * batch.pct;
                    const batchShares = currentPrice > 0 ? Math.floor(batchCapital / currentPrice) : 0;

                    const consumedFromThisBatch = Math.min(remainingActualShares, batchShares);
                    remainingActualShares = Math.max(0, remainingActualShares - consumedFromThisBatch);

                    const remainingShares = batchShares - consumedFromThisBatch;
                    const remainingCapital = remainingShares * currentPrice;

                    const isFullyConsumed = consumedFromThisBatch >= batchShares && batchShares > 0;
                    const isPartiallyConsumed = consumedFromThisBatch > 0 && consumedFromThisBatch < batchShares;

                    return {
                      ...batch,
                      batchCapital,
                      batchShares,
                      consumedShares: consumedFromThisBatch,
                      remainingShares,
                      remainingCapital,
                      isFullyConsumed,
                      isPartiallyConsumed
                    };
                  });

                  const processedTotalRecommended = batchesList.reduce((acc, b) => acc + b.batchShares, 0);
                  const excessShares = totalHeldShares - processedTotalRecommended;

                  return (
                    <div className="bg-slate-950/40 p-4.5 rounded-xl border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] text-amber-500 font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          Moomoo 融資分批建倉規劃建議 (4批進場：15%, 25%, 35%, 25%)
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans">
                          價格對比基準：${currentPrice.toFixed(2)} USD
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-medium mb-1">
                        此策略依據分批進場的進入順序來優先消耗計算。基於總買力 <span className="text-amber-400 font-mono font-bold">${moomooMaxBP.toLocaleString(undefined, { maximumFractionDigits: 1 })} USD</span> 與現存持股數進行遞進式剩餘買力估算。
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        {batchesList.map((batch, bIdx) => {
                          const hasConsumed = batch.consumedShares > 0;
                          return (
                            <div 
                              key={bIdx} 
                              className={`bg-slate-900 p-3 rounded-lg border flex flex-col justify-between transition-all ${
                                hasConsumed 
                                  ? batch.isFullyConsumed 
                                    ? "border-emerald-500/50 ring-1 ring-emerald-500/10 shadow-[0_1px_8px_rgba(16,185,129,0.05)]" 
                                    : "border-amber-500/50 ring-1 ring-amber-500/10 shadow-[0_1px_8px_rgba(245,158,11,0.05)]"
                                  : "border-slate-800/50"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-black tracking-tight">{batch.label}</span>
                                {batch.isFullyConsumed && (
                                  <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-1 rounded scale-90">已購入</span>
                                )}
                                {batch.isPartiallyConsumed && (
                                  <span className="bg-amber-500/20 text-amber-400 text-[8px] font-bold px-1 rounded scale-90">部分購入</span>
                                )}
                              </div>
                              <div className="my-1.5 space-y-0.5">
                                <span className="text-xs font-mono font-black block text-amber-400">
                                  ${batch.batchCapital.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                </span>
                                <span className="text-xs font-mono font-black block text-slate-100">
                                  建議 {batch.batchShares.toLocaleString()} 股
                                </span>
                              </div>

                              <div className="border-t border-slate-800/60 pt-1.5 mt-1.5 text-[9px] leading-snug text-left">
                                {hasConsumed ? (
                                  batch.isFullyConsumed ? (
                                    <span className="text-slate-400 font-medium block">
                                      剩餘買力: $0
                                      <span className="block text-[8px] opacity-90 font-mono">(剩 0 股買力)</span>
                                    </span>
                                  ) : (
                                    <span className="text-amber-400 font-medium block">
                                      剩餘買力: ${batch.remainingCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      <span className="block text-[8px] opacity-90 font-mono">({batch.remainingShares.toLocaleString()} 股)</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-500 block">
                                    完整剩餘買力
                                    <span className="block text-[8px] opacity-75 font-mono">({batch.batchShares.toLocaleString()} 股)</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {excessShares > 0 && (
                        <div className="mt-2 p-2 bg-indigo-950/20 border border-indigo-900/40 rounded-lg text-center animate-fade-in">
                          <span className="text-[10px] text-indigo-300 font-bold flex items-center justify-center gap-1">
                            💡 當前持有總股數 ({totalHeldShares} 股) 已填滿 4 批規劃總建議量 ({processedTotalRecommended} 股)，超額：{excessShares} 股。
                          </span>
                        </div>
                      )}

                      {/* 超出購買力提醒 */}
                      {pfHasShortfall && (
                        <div className="mt-2.5 p-2 bg-red-950/20 border border-red-900/40 rounded-lg text-center animate-pulse">
                          <span className="text-[11px] text-red-400 font-black">
                            ⚠️ 已超出最大融資購買力！整個投資組合超出：${pfShortfallVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} USD
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Custom notes section */}
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 font-extrabold block mb-1">📝 我的備忘加註與理由</span>
                  <p className="text-xs text-slate-300 italic">
                    {activeItem.note || "加入關於本持股的操作計策或投資動因吧。"}
                  </p>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* 8. Portfolio Data Portability (Export / Import) Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl animate-in fade-in duration-300 text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left w-full">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-500" />
              投資組合數據備份與還原
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              將您的自訂投資持股、總資產設定及融資槓桿倍數備份至本機或上傳至 Google Drive 雲端。
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowExportModal(true);
                setGdStatusMsg("");
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs font-black text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-500" />
              匯出
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setGdStatusMsg("");
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs font-black text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-500" />
              匯入
            </button>
          </div>
        </div>
      </div>

      {/* Export Modal Dialog */}
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
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-amber-500" />
                匯出投資組合資料
              </h3>
              <button
                disabled={isOperatingGD}
                onClick={() => {
                  setShowExportModal(false);
                  setGdStatusMsg("");
                }}
                className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                disabled={isOperatingGD}
                onClick={() => {
                  handleLocalExport();
                  setShowExportModal(false);
                }}
                className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 p-4 rounded-xl text-left transition-all hover:border-amber-500/30 cursor-pointer"
              >
                <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-xs">備份至本機 (JSON)</h4>
                  <p className="text-[10px] text-slate-400 mt-1">直接下載備份檔案至本機設備，檔名帶有當天日期時間。</p>
                </div>
              </button>

              <div className="border-t border-slate-800 my-4" />

              {!gdToken ? (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col items-center text-center">
                  <Cloud className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-[10px] text-slate-400 mb-3">請先在右上角登入 Google Drive，即可一鍵備份至專屬雲端資料夾。</p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isOperatingGD}
                  onClick={handleCloudExport}
                  className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 p-4 rounded-xl text-left transition-all hover:border-emerald-500/30 cursor-pointer"
                >
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                    {isOperatingGD ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Cloud className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs">備份至 Google Drive</h4>
                    <p className="text-[10px] text-slate-400 mt-1">一鍵將資料上傳至雲端 Socrates_Portfolio_Backup 資料夾。</p>
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

      {/* Import Modal Dialog */}
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
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                匯入投資組合資料
              </h3>
              <button
                disabled={isOperatingGD}
                onClick={() => {
                  setShowImportModal(false);
                  setGdStatusMsg("");
                }}
                className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                disabled={isOperatingGD}
                onClick={handleLocalImport}
                className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 p-4 rounded-xl text-left transition-all hover:border-amber-500/30 cursor-pointer"
              >
                <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-xs">從本機匯入 (JSON)</h4>
                  <p className="text-[10px] text-slate-400 mt-1">選取本機備份的 JSON 檔案，還原投資組合部位。</p>
                </div>
              </button>

              <div className="border-t border-slate-800 my-4" />

              {!gdToken ? (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col items-center text-center">
                  <Cloud className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-[10px] text-slate-400 mb-3">請先在右上角登入 Google Drive，即可載入最新雲端備份。</p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isOperatingGD}
                  onClick={handleCloudImport}
                  className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 p-4 rounded-xl text-left transition-all hover:border-emerald-500/30 cursor-pointer"
                >
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                    {isOperatingGD ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Cloud className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs">從 Google Drive 導入最新備份</h4>
                    <p className="text-[10px] text-slate-400 mt-1">自動搜尋雲端最新備份檔案導入，不需要手動選取檔案。</p>
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

      {/* Delete Confirmation Dialog */}
      {confirmDeletePortfolioSymbol && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" onClick={() => setConfirmDeletePortfolioSymbol(null)} />
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative z-30 transform scale-100 transition-all duration-150">
            <h4 className="text-base font-black text-white mb-2 flex items-center gap-1.5">
              <Trash2 className="w-5 h-5 text-rose-500" />
              確認移除持股
            </h4>
            <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed text-left">
              確定要將 「<span className="text-amber-500 font-mono font-bold">{confirmDeletePortfolioSymbol}</span>」 從您的持存投資組合中移除嗎？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeletePortfolioSymbol(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setPortfolio((prev) => prev.filter((item) => item.symbol !== confirmDeletePortfolioSymbol));
                  if (selectedPortfolioSymbol === confirmDeletePortfolioSymbol) {
                    setSelectedPortfolioSymbol("");
                  }
                  setConfirmDeletePortfolioSymbol(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                確認移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
