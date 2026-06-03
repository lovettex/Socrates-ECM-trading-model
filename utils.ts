export const getQuotaErrorMessage = (error: string) => {
  if (!error.includes("429") && !error.includes("quota") && !error.includes("exhausted")) return error;
  
  const errStr = error.toLowerCase();
  
  if (errStr.includes("perminute")) {
    if (errStr.includes("tokens")) return "Gemini API 額度已達上限 (TPM - Tokens Per Minute)。請稍候 1 分鐘後再試。";
    if (errStr.includes("requests")) return "Gemini API 額度已達上限 (RPM - Requests Per Minute)。請稍候 1 分鐘後再試。";
    return "Gemini API 額度已達上限 (每分鐘限制)。";
  }
  if (errStr.includes("perday")) {
    return "Gemini API 額度已達上限 (RPD/TPD - 日間配額)。請於 24 小時後重試或檢查您的 API 帳戶。";
  }
  
  return "Gemini API 額度已達上限，請稍後再試。";
};
