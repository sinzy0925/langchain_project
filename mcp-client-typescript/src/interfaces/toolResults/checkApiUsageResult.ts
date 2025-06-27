// src/interfaces/toolResults/checkApiUsageResult.ts

export interface CheckApiUsageResult {
    isEnabled: boolean;
    usageCount: number;
    usageLimit: number;
    lastReset: string | null; // Dateオブジェクトを文字列として受け取る
    ownerEmail: string;
}
