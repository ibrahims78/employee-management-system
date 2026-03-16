import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export async function authenticateAPI(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || typeof apiKey !== "string") {
    return res.status(401).json({
      error: "MISSING_API_KEY",
      message: "مفتاح API مطلوب. يرجى إضافة الهيدر: x-api-key",
    });
  }

  try {
    const key = await storage.getApiKeyByValue(apiKey);

    if (!key) {
      return res.status(401).json({
        error: "INVALID_API_KEY",
        message: "مفتاح API غير صالح أو غير موجود في النظام.",
      });
    }

    if (!key.isActive) {
      return res.status(401).json({
        error: "API_KEY_DISABLED",
        message: "مفتاح API معطّل. يرجى التواصل مع مسؤول النظام لتفعيله.",
      });
    }

    if (key.expiryDate && new Date() > new Date(key.expiryDate)) {
      return res.status(401).json({
        error: "API_KEY_EXPIRED",
        message: `انتهت صلاحية مفتاح API بتاريخ: ${new Date(key.expiryDate).toLocaleDateString("ar-SY")}`,
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "حدث خطأ أثناء التحقق من مفتاح API. يرجى المحاولة لاحقاً.",
    });
  }
}
