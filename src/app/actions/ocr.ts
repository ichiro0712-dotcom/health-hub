'use server';

// No changes needed for ocr.ts as saveHealthRecord handles normalization.

import { GoogleGenerativeAI } from '@google/generative-ai';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";



export async function processHealthCheckDocuments(imageUrls: string[]) {
  try {
    console.log("OCR Action Started with URLs:", imageUrls.length);
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (!imageUrls || imageUrls.length === 0) throw new Error('No images provided');

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Server Configuration Error: API Key missing" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    // Fetch images and convert to base64 for Gemini
    const imagesParts = await Promise.all(
      imageUrls.map(async (url) => {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return {
          inlineData: {
            data: base64,
            mimeType: contentType,
          },
        };
      })
    );

    const prompt = `
      You are an expert OCR assistant for Japanese health check documents.
      Analyze the attached images (pages of a health check report).
      Extract all numerical health data and inspection names.
      Also extract qualitative data (Doctor's comments, summary).

      Return ONLY a JSON object with this structure:
      {
        "date": "YYYY-MM-DD",
        "results": [
          {
            "category": "血液",
            "item": "白血球数",
            "value": 14.5,
            "unit": "10^2/μL",
            "isAbnormal": true,
            "evaluation": "C"
          }
        ],
        "meta": {
           "hospitalName": "...",
           "age": 35,
           "notes": "..." // Extract doctor's summary or remarks here
        }
      }

      CRITICAL RULES for item names:
      - Use ONLY Japanese standard names for items (日本語標準名のみ)
      - Do NOT include English names or parenthetical translations
      - Examples of CORRECT format:
        - "白血球数" (NOT "WBC" or "WBC (白血球数)")
        - "赤血球数" (NOT "RBC" or "RBC (赤血球数)")
        - "ヘモグロビン" (NOT "Hb" or "Hemoglobin")
        - "ヘマトクリット" (NOT "Ht" or "Hematocrit")
        - "血小板数" (NOT "PLT" or "Platelet")
        - "AST(GOT)" - Keep standard abbreviations in this format
        - "ALT(GPT)" - Keep standard abbreviations in this format
        - "γ-GTP" (NOT "GGT" or "Gamma-GTP")
        - "総コレステロール" (NOT "TC" or "Total Cholesterol")
        - "LDLコレステロール" (NOT "LDL-C" or "LDL Cholesterol")
        - "HDLコレステロール" (NOT "HDL-C" or "HDL Cholesterol")
        - "中性脂肪" (NOT "TG" or "Triglyceride")
        - "空腹時血糖" (NOT "FBS" or "Fasting Blood Sugar")
        - "尿素窒素(BUN)" - Keep standard format
        - "クレアチニン" (NOT "Cr" or "Creatinine")
        - "尿酸(UA)" - Keep standard format
      - Merge data from ALL pages
      - Accuracy is paramount
    `;

    const result = await model.generateContent([prompt, ...imagesParts]);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();

    // JSON パース時のエラーハンドリング強化
    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response (first 500 chars):', cleanedText.substring(0, 500));
      return {
        success: false,
        error: `AI応答のJSON解析に失敗しました。再度お試しください。`
      };
    }

    return { success: true, data };

  } catch (error) {
    console.error('OCR Error Details:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `処理に失敗しました: ${errorMessage}` };
  }
}

export async function parseHealthCheckText(text: string) {
  try {
    console.log("Text Parsing Action Started");
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (!text || text.trim().length === 0) throw new Error('No text provided');

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Server Configuration Error: API Key missing" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    const prompt = `
      You are an expert OCR assistant for Japanese health check documents.
      Analyze the provided raw text from a health check report.
      Extract all numerical health data, inspection names, dates, and hospital info.
      Also extract qualitative data (Doctor's comments, summary).

      Raw Text:
      """
      ${text}
      """

      Return ONLY a JSON object with this structure:
      {
        "date": "YYYY-MM-DD",
        "results": [
          {
            "category": "血液",
            "item": "白血球数",
            "value": 14.5,
            "unit": "10^2/μL",
            "isAbnormal": true,
            "evaluation": "C"
          }
        ],
        "meta": {
           "hospitalName": "...",
           "age": 35,
           "notes": "..." // Extract doctor's summary or remarks here
        }
      }

      CRITICAL RULES for item names:
      - Use ONLY Japanese standard names for items (日本語標準名のみ)
      - Do NOT include English names or parenthetical translations
      - Examples of CORRECT format:
        - "白血球数" (NOT "WBC" or "WBC (白血球数)")
        - "赤血球数" (NOT "RBC" or "RBC (赤血球数)")
        - "ヘモグロビン" (NOT "Hb" or "Hemoglobin")
        - "ヘマトクリット" (NOT "Ht" or "Hematocrit")
        - "血小板数" (NOT "PLT" or "Platelet")
        - "AST(GOT)" - Keep standard abbreviations in this format
        - "ALT(GPT)" - Keep standard abbreviations in this format
        - "γ-GTP" (NOT "GGT" or "Gamma-GTP")
        - "総コレステロール" (NOT "TC" or "Total Cholesterol")
        - "LDLコレステロール" (NOT "LDL-C" or "LDL Cholesterol")
        - "HDLコレステロール" (NOT "HDL-C" or "HDL Cholesterol")
        - "中性脂肪" (NOT "TG" or "Triglyceride")
        - "空腹時血糖" (NOT "FBS" or "Fasting Blood Sugar")
        - "尿素窒素(BUN)" - Keep standard format
        - "クレアチニン" (NOT "Cr" or "Creatinine")
        - "尿酸(UA)" - Keep standard format
      - Accuracy is paramount
      - If date is missing, try to infer or leave null
      - If value is not numeric (e.g. "Abnormal"), set value to null and put text in evaluation
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();

    // JSON パース時のエラーハンドリング強化
    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response (first 500 chars):', cleanedText.substring(0, 500));
      return {
        success: false,
        error: `AI応答のJSON解析に失敗しました。再度お試しください。`
      };
    }

    return { success: true, data };

  } catch (error) {
    console.error('Text Parse Error Details:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `解析に失敗しました: ${errorMessage}` };
  }
}
