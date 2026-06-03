export interface WorkspaceSheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export interface WorkspaceDocInfo {
  documentId: string;
  documentUrl: string;
}

export interface WorkspaceChatSpace {
  name: string;
  displayName?: string;
  type: string;
}

/**
 * Creates a brand new Google Sheets spreadsheet with two sheets (Trades History & Watchlist)
 * and populates them with the user's current portfolios and watchlists.
 */
export async function createAndSyncGoogleSheet(
  accessToken: string,
  trades: any[],
  watchlist: any[]
): Promise<WorkspaceSheetInfo> {
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: `Socrates Portfolio & Watchlist Tracker (${new Date().toLocaleDateString()})`,
      },
      sheets: [
        { properties: { title: "Trades History" } },
        { properties: { title: "Watchlist" } },
      ],
    }),
  });

  if (!createRes.ok) {
    if (createRes.status === 401) {
      localStorage.removeItem("gdrive_access_token");
      throw new Error("401_UNAUTHORIZED");
    }
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Sheet: ${errText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 1. Prepare Trades History rows
  const tradeRows = [
    ["交易ID", "股票代碼", "股票名稱", "交易類型", "價格 (單價)", "股數 / 張數", "交易日期", "系統時間戳"],
    ...trades.map((t) => [
      t.id || "",
      t.symbol || "",
      t.name || "",
      t.type || "",
      t.price ?? "",
      t.shares ?? "",
      t.date || "",
      t.timestamp ? new Date(t.timestamp).toLocaleString("zh-TW") : "",
    ]),
  ];

  // 2. Prepare Watchlist rows with comprehensive ratings, actions, and timestamps
  const watchlistRows = [
    [
      "股票代碼", 
      "股票名稱", 
      "最新價格", 
      "日漲跌幅 (%)", 
      "推薦動作 (Buy/Sell/Hold)", 
      "AI 綜合評分 (1-10)", 
      "多頭評分", 
      "空頭評分", 
      "品質評分", 
      "價值評分", 
      "崩盤相似度評分", 
      "正向信號評分", 
      "負向信號評分", 
      "指標最後更新時間"
    ],
    ...watchlist.map((w) => [
      w.symbol || "",
      w.name || "",
      w.price ?? "",
      w.changePercent != null ? `${w.changePercent}%` : "",
      w.action === "Buy" ? "建議買進 (Buy)" : w.action === "Sell" ? "建議賣出 (Sell)" : w.action === "Hold" ? "建議觀望 (Hold)" : (w.action || "無"),
      w.aiScore ?? "N/A",
      w.buyScore ?? "N/A",
      w.sellScore ?? "N/A",
      w.qualityScore ?? "N/A",
      w.valueScore ?? "N/A",
      w.crashSimilarityScore ?? "N/A",
      w.posScore ?? "0",
      w.negScore ?? "0",
      w.timestamp ? new Date(w.timestamp).toLocaleString("zh-TW") : "無資料",
    ]),
  ];

  // 3. Write Trades History values
  const writeTradesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Trades History'!A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: tradeRows,
      }),
    }
  );

  if (!writeTradesRes.ok) {
    const errText = await writeTradesRes.text();
    console.error("Trades export error:", errText);
  }

  // 4. Write Watchlist values
  const writeWatchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Watchlist!A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: watchlistRows,
      }),
    }
  );

  if (!writeWatchRes.ok) {
    const errText = await writeWatchRes.text();
    console.error("Watchlist export error:", errText);
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Creates a brand new Google Doc analysis report and populates it with Socrates predictions,
 * cyclical dates, and technical overview levels.
 */
export async function exportReportToGoogleDoc(
  accessToken: string,
  stockData: any,
  reportText: string
): Promise<WorkspaceDocInfo> {
  const title = `${stockData.symbol} (${stockData.name}) Socrates ECM 分析報告`;
  
  // 1. Create empty document
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    if (createRes.status === 401) {
      localStorage.removeItem("gdrive_access_token");
      throw new Error("401_UNAUTHORIZED");
    }
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Doc: ${errText}`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // 2. Draft document structure content
  const nextTPDate = stockData.nextTurningPoint || "未知";
  const anchor = stockData.anchorType === "High" ? "高點值 (Peak)" : "低點值 (Trough)";
  const score = stockData.score ?? 5.0;

  let docContent = "Socrates ECM 全球循環與技術分析報告\n";
  docContent += "========================================\n\n";
  docContent += `股票標的: ${stockData.symbol} - ${stockData.name}\n`;
  docContent += `目前的價格: ${stockData.price} ${stockData.currency || "USD"}\n`;
  docContent += `日漲跌幅: ${stockData.changePercent != null ? (stockData.changePercent > 0 ? "+" : "") + stockData.changePercent + "%" : "0%"}\n`;
  docContent += `技術指標評分 (Composite Score): ${score} / 10\n`;
  docContent += `下一個關鍵轉折點: ${nextTPDate} 型態屬性 => [${anchor}]\n\n`;

  if (stockData.historicalSignals && stockData.historicalSignals.length > 0) {
    docContent += "近期交易信號 (Historical Echo Signal)\n";
    docContent += "----------------------------------------\n";
    const sigs = stockData.historicalSignals.slice(0, 5);
    sigs.forEach((s: any) => {
      docContent += `- 日期: ${s.date || ""} | 信號: ${s.signal || "Hold"} | 收盤價: $${s.price || ""}\n`;
    });
    docContent += "\n";
  }

  if (stockData.futureCycleEvents && stockData.futureCycleEvents.length > 0) {
    docContent += "未來時間循環事件 (Economic Confidence Cycle Events)\n";
    docContent += "----------------------------------------\n";
    stockData.futureCycleEvents.slice(0, 5).forEach((e: any) => {
      docContent += `- 預測日期: ${e.date || ""} | 事件類型: ${e.type || ""} | 信號強度/評級: ${e.strength || "N/A"}\n`;
    });
    docContent += "\n";
  }

  docContent += "Martin Armstrong 循環 AI 診斷合成報告\n";
  docContent += "----------------------------------------\n";
  
  if (reportText) {
    docContent += reportText;
  } else {
    docContent += "未提供自定義診斷結論。請返回 Socrates ECM 主面板自動取得分析報告撰寫。";
  }

  docContent += "\n\n----------------------------------------\n";
  docContent += `報告生成時間 (本機時間): ${new Date().toLocaleString("zh-TW")}\n`;
  docContent += "此報告為 Socrates ECM 系統由 AI 模型與 Martin Armstrong 經濟信心模型 API 自動合成，僅供研究參考學術使用，不構成直接投資建議。\n";

  // 3. Populate standard document using batchUpdate
  const insertTextRequest = {
    requests: [
      {
        insertText: {
          text: docContent,
          location: { index: 1 },
        },
      },
    ],
  };

  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(insertTextRequest),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error("Failed to write document content:", errText);
  }

  return { documentId, documentUrl };
}

/**
 * Lists the Google Chat Spaces available to the authenticated user's account.
 */
export async function listGoogleChatSpaces(accessToken: string): Promise<WorkspaceChatSpace[]> {
  try {
    const res = await fetch("https://chat.googleapis.com/v1/spaces", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("gdrive_access_token");
      }
      const errText = await res.ok ? "" : await res.text();
      console.warn("Failed to retrieve spaces:", errText);
      return [];
    }

    const data = await res.json();
    return data.spaces || [];
  } catch (err) {
    console.error("Error listing chat spaces:", err);
    return [];
  }
}

/**
 * Posts an alert message directly to a Google Chat Space.
 */
export async function postMessageToGoogleChat(
  accessToken: string,
  spaceName: string,
  messageText: string
): Promise<any> {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: messageText,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("gdrive_access_token");
      throw new Error("401_UNAUTHORIZED");
    }
    const errText = await res.text();
    throw new Error(`Google Chat post failed: ${errText}`);
  }

  return await res.json();
}
