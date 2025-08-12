// Улучшенный сервис перевода с поддержкой многострочного текста
export class TranslationService {
  private static readonly GOOGLE_TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single';
  private static readonly MYMEMORY_API = 'https://api.mymemory.translated.net/get';
  private static readonly LIBRE_TRANSLATE_API = 'https://libretranslate.de/translate';
  private static readonly YANDEX_PROXY = 'https://translate.yandex.net/api/v1.5/tr.json/translate';

  static async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    // Если языки одинаковые, возвращаем исходный текст
    if (fromLang === toLang) {
      return text;
    }

    const originalText = text;
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      return text;
    }

    // Нормализуем коды языков
    const normalizedFromLang = this.normalizeLanguageCode(fromLang);
    const normalizedToLang = this.normalizeLanguageCode(toLang);

    // Разбиваем текст на части для лучшего перевода
    const textParts = this.splitTextForTranslation(trimmedText);
    const translatedParts: string[] = [];

    for (const part of textParts) {
      if (!part.trim()) {
        translatedParts.push(part);
        continue;
      }

      let translatedPart = await this.translateSinglePart(part.trim(), normalizedFromLang, normalizedToLang);
      translatedParts.push(translatedPart);
    }

    const result = translatedParts.join('');
    return this.preserveOriginalFormatting(originalText, trimmedText, result);
  }

  private static splitTextForTranslation(text: string): string[] {
    // Разбиваем текст на предложения, сохраняя разделители
    const sentences = text.split(/([.!?]+\s*)/);
    const parts: string[] = [];
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] || '';
      const delimiter = sentences[i + 1] || '';
      
      if (sentence.trim()) {
        parts.push(sentence + delimiter);
      } else if (delimiter) {
        parts.push(delimiter);
      }
    }
    
    return parts.length > 0 ? parts : [text];
  }

  private static async translateSinglePart(text: string, fromLang: string, toLang: string): Promise<string> {
    // Пробуем Google Translate (наиболее надежный)
    try {
      const googleResult = await this.tryGoogleTranslate(text, fromLang, toLang);
      if (googleResult && googleResult.trim() && googleResult !== text) {
        return googleResult;
      }
    } catch (error) {
      console.warn('Google Translate failed:', error);
    }

    // Пробуем MyMemory (хорошее качество)
    try {
      const myMemoryResult = await this.tryMyMemoryTranslate(text, fromLang, toLang);
      if (myMemoryResult && myMemoryResult.trim() && myMemoryResult !== text) {
        return myMemoryResult;
      }
    } catch (error) {
      console.warn('MyMemory failed:', error);
    }

    // Пробуем LibreTranslate (fallback)
    try {
      const libreResult = await this.tryLibreTranslate(text, fromLang, toLang);
      if (libreResult && libreResult.trim() && libreResult !== text) {
        return libreResult;
      }
    } catch (error) {
      console.warn('LibreTranslate failed:', error);
    }

    // Если все API недоступны, используем словарь
    return this.dictionaryTranslation(text, fromLang, toLang);
  }

  private static async tryGoogleTranslate(text: string, fromLang: string, toLang: string): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: fromLang === 'auto' ? 'auto' : fromLang,
        tl: toLang,
        dt: 't',
        q: text
      });

      const response = await fetch(`${this.GOOGLE_TRANSLATE_API}?${params}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data[0] && Array.isArray(data[0])) {
          const translatedText = data[0].map((item: any) => item[0]).join('');
          return translatedText;
        }
      }
    } catch (error) {
      console.warn('Google Translate error:', error);
    }
    return null;
  }

  private static async tryMyMemoryTranslate(text: string, fromLang: string, toLang: string): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        q: text,
        langpair: `${fromLang}|${toLang}`,
        de: 'translator@example.com'
      });

      const response = await fetch(`${this.MYMEMORY_API}?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const translated = data.responseData.translatedText;
          if (!translated.includes('MYMEMORY WARNING') && 
              translated.toLowerCase() !== text.toLowerCase()) {
            return translated;
          }
        }
      }
    } catch (error) {
      console.warn('MyMemory error:', error);
    }
    return null;
  }

  private static async tryLibreTranslate(text: string, fromLang: string, toLang: string): Promise<string | null> {
    try {
      const response = await fetch(this.LIBRE_TRANSLATE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: fromLang === 'auto' ? 'auto' : fromLang,
          target: toLang,
          format: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translatedText && data.translatedText !== text) {
          return data.translatedText;
        }
      }
    } catch (error) {
      console.warn('LibreTranslate error:', error);
    }
    return null;
  }

  private static preserveOriginalFormatting(originalText: string, trimmedText: string, translatedText: string): string {
    // Сохраняем начальные и конечные пробелы
    const leadingWhitespace = originalText.match(/^\s*/)?.[0] || '';
    const trailingWhitespace = originalText.match(/\s*$/)?.[0] || '';
    
    // Если исходный текст содержит переносы строк, сохраняем их структуру
    if (originalText.includes('\n')) {
      const originalLines = originalText.split('\n');
      const translatedLines = translatedText.split(/[.!?]+/).filter(s => s.trim());
      
      // Пытаемся сопоставить переводы с исходными строками
      const result: string[] = [];
      let translatedIndex = 0;
      
      for (const originalLine of originalLines) {
        if (originalLine.trim() === '') {
          result.push(originalLine); // Сохраняем пустые строки
        } else if (translatedIndex < translatedLines.length) {
          const translated = translatedLines[translatedIndex]?.trim() || originalLine;
          // Сохраняем отступы исходной строки
          const lineIndent = originalLine.match(/^\s*/)?.[0] || '';
          result.push(lineIndent + translated);
          translatedIndex++;
        } else {
          result.push(originalLine);
        }
      }
      
      return result.join('\n');
    }
    
    return leadingWhitespace + translatedText.trim() + trailingWhitespace;
  }

  static async detectLanguage(text: string): Promise<string> {
    const trimmedText = text.trim();
    
    // Пробуем определить язык через Google
    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: 'en',
        dt: 't',
        q: trimmedText.substring(0, 100) // Берем первые 100 символов
      });

      const response = await fetch(`${this.GOOGLE_TRANSLATE_API}?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data[2]) {
          return data[2]; // Определенный язык
        }
      }
    } catch (error) {
      console.warn('Language detection failed:', error);
    }

    // Fallback к локальному определению
    return this.detectLanguageLocally(trimmedText);
  }

  private static detectLanguageLocally(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Подсчитываем символы разных языков
    const cyrillicCount = (text.match(/[а-яё]/gi) || []).length;
    const latinCount = (text.match(/[a-z]/gi) || []).length;
    const chineseCount = (text.match(/[一-龯]/gi) || []).length;
    const japaneseCount = (text.match(/[ひらがなカタカナ]/gi) || []).length;
    const koreanCount = (text.match(/[가-힣]/gi) || []).length;
    const arabicCount = (text.match(/[ء-ي]/gi) || []).length;
    
    const totalChars = text.replace(/\s/g, '').length;
    
    if (totalChars === 0) return 'en';
    
    // Определяем язык по преобладающим символам
    if (cyrillicCount / totalChars > 0.3) return 'ru';
    if (chineseCount / totalChars > 0.3) return 'zh';
    if (japaneseCount / totalChars > 0.3) return 'ja';
    if (koreanCount / totalChars > 0.3) return 'ko';
    if (arabicCount / totalChars > 0.3) return 'ar';
    
    // Проверяем специфичные символы
    if (/[äöüß]/i.test(text)) return 'de';
    if (/[àâäéèêëïîôöùûüÿç]/i.test(text)) return 'fr';
    if (/[áéíóúñü¿¡]/i.test(text)) return 'es';
    if (/[àèéìíîòóù]/i.test(text)) return 'it';
    if (/[ãçõ]/i.test(text)) return 'pt';
    
    // Проверяем по ключевым словам
    const commonWords = {
      'ru': ['и', 'в', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'а', 'по', 'это', 'она', 'этот', 'к', 'но', 'они', 'мы', 'как', 'из', 'за', 'от', 'до', 'при', 'для'],
      'en': ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from'],
      'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'una', 'del', 'los', 'al', 'todo'],
      'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par', 'grand'],
      'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'nach', 'wird', 'an', 'werden']
    };
    
    const words = lowerText.split(/\s+/).filter(word => word.length > 1);
    let maxMatches = 0;
    let detectedLang = 'en';
    
    for (const [lang, wordList] of Object.entries(commonWords)) {
      const matches = words.filter(word => wordList.includes(word)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLang = lang;
      }
    }
    
    return detectedLang;
  }

  private static normalizeLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'auto': 'auto',
      'ru': 'ru',
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'zh': 'zh',
      'ja': 'ja',
      'ko': 'ko',
      'ar': 'ar',
      'hi': 'hi',
      'tr': 'tr',
      'nl': 'nl',
      'sv': 'sv',
      'da': 'da',
      'no': 'no',
      'fi': 'fi',
      'pl': 'pl'
    };
    
    return mapping[code] || code;
  }

  private static dictionaryTranslation(text: string, fromLang: string, toLang: string): string {
    const translations: Record<string, Record<string, string>> = {
      // Базовые фразы
      'hello': { 'ru': 'привет', 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'it': 'ciao' },
      'world': { 'ru': 'мир', 'es': 'mundo', 'fr': 'monde', 'de': 'welt', 'it': 'mondo' },
      'goodbye': { 'ru': 'до свидания', 'es': 'adiós', 'fr': 'au revoir', 'de': 'auf wiedersehen', 'it': 'arrivederci' },
      'thank you': { 'ru': 'спасибо', 'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'it': 'grazie' },
      'yes': { 'ru': 'да', 'es': 'sí', 'fr': 'oui', 'de': 'ja', 'it': 'sì' },
      'no': { 'ru': 'нет', 'es': 'no', 'fr': 'non', 'de': 'nein', 'it': 'no' },
      'please': { 'ru': 'пожалуйста', 'es': 'por favor', 'fr': 's\'il vous plaît', 'de': 'bitte', 'it': 'per favore' },
      
      // Обратные переводы
      'привет': { 'en': 'hello', 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'it': 'ciao' },
      'мир': { 'en': 'world', 'es': 'mundo', 'fr': 'monde', 'de': 'welt', 'it': 'mondo' },
      'спасибо': { 'en': 'thank you', 'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'it': 'grazie' },
      'да': { 'en': 'yes', 'es': 'sí', 'fr': 'oui', 'de': 'ja', 'it': 'sì' },
      'нет': { 'en': 'no', 'es': 'no', 'fr': 'non', 'de': 'nein', 'it': 'no' }
    };

    const lowerText = text.toLowerCase().trim();
    
    // Проверяем точные совпадения
    const translation = translations[lowerText]?.[toLang];
    if (translation) {
      return translation;
    }

    // Если перевод не найден, возвращаем исходный текст
    return text;
  }
}