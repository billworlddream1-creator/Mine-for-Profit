
import { GoogleGenAI } from "@google/genai";
import { AIAnalysis } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMarketAnalysis = async (currentPrice: number): Promise<AIAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a technical and sentiment analysis on Bitcoin. The current mock price in our simulator is $${currentPrice.toLocaleString()}. Use your search tools to find real-world current trends and news as of today. Summarize in 3 bullet points.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Directly access the .text property of GenerateContentResponse.
    const text = response.text || "Analysis unavailable.";
    
    // Extract grounding chunks for website URLs as required by the guidelines.
    const candidates = response.candidates;
    const chunks = candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Simplistic extraction of sentiment for demo purposes.
    const sentiment: 'Bullish' | 'Bearish' | 'Neutral' = 
      text.toLowerCase().includes('bull') ? 'Bullish' : 
      text.toLowerCase().includes('bear') ? 'Bearish' : 'Neutral';

    // Filter and map the chunks to the expected AIAnalysis source structure.
    const sources = chunks
      .filter((c: any) => c.web)
      .map((c: any) => ({ 
        title: c.web.title || 'Source', 
        web: c.web.uri || '#' 
      }));

    return {
      sentiment,
      summary: text,
      sources: sources.slice(0, 3)
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      sentiment: 'Neutral',
      summary: "Could not fetch live analysis. Ensure API key is valid.",
      sources: []
    };
  }
};
