import { useState, useCallback } from 'react';
import { TranslationService } from '../services/translationService';
import { OCRService } from '../services/ocrService';

interface TranslationHistory {
  id: string;
  sourceText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  timestamp: Date;
}

export const useTranslation = () => {
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const translateText = useCallback(async (
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<string> => {
    setLoading(true);
    
    try {
      // Определяем исходный язык, если установлен auto
      let detectedFromLang = fromLang;
      if (fromLang === 'auto') {
        detectedFromLang = await TranslationService.detectLanguage(text);
      }
      
      // Переводим текст
      const translatedText = await TranslationService.translateText(text, detectedFromLang, toLang);
      
      // Добавляем в историю
      const historyItem: TranslationHistory = {
        id: Date.now().toString(),
        sourceText: text,
        translatedText,
        fromLanguage: detectedFromLang,
        toLanguage: toLang,
        timestamp: new Date()
      };
      
      setHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Храним только 10 последних переводов
      
      return translatedText;
    } finally {
      setLoading(false);
    }
  }, []);

  const translateImage = useCallback(async (
    imageFile: File,
    fromLang: string,
    toLang: string
  ): Promise<{ extractedText: string; translatedText: string }> => {
    setLoading(true);
    
    try {
      // Извлекаем текст из изображения
      const extractedText = await OCRService.extractTextFromImage(imageFile);
      
      if (!extractedText.trim()) {
        throw new Error('Не удалось извлечь текст из изображения');
      }

      // Определяем язык извлеченного текста
      let detectedFromLang = fromLang;
      if (fromLang === 'auto') {
        detectedFromLang = await TranslationService.detectLanguage(extractedText);
      }
      
      // Переводим извлеченный текст
      const translatedText = await TranslationService.translateText(extractedText, detectedFromLang, toLang);
      
      // Добавляем в историю
      const historyItem: TranslationHistory = {
        id: Date.now().toString(),
        sourceText: `[IMAGE] ${extractedText}`,
        translatedText,
        fromLanguage: detectedFromLang,
        toLanguage: toLang,
        timestamp: new Date()
      };
      
      setHistory(prev => [historyItem, ...prev.slice(0, 9)]);
      
      return { extractedText, translatedText };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);
  return {
    translateText,
    translateImage,
    loading,
    history,
    clearHistory
  };
};