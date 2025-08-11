// Enhanced translation service with better text handling
export class TranslationService {
  private static readonly LIBRE_TRANSLATE_URL = 'https://libretranslate.de/translate';
  private static readonly MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
  private static readonly GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

  static async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    // Если языки одинаковые, возвращаем исходный текст
    if (fromLang === toLang) {
      return text;
    }

    // Сохраняем оригинальное форматирование
    const originalText = text;
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      return text;
    }

    // Нормализуем коды языков
    const normalizedFromLang = this.normalizeLanguageCode(fromLang);
    const normalizedToLang = this.normalizeLanguageCode(toLang);

    try {
      // Пробуем Google Translate (неофициальный API)
      const googleResult = await this.tryGoogleTranslate(trimmedText, normalizedFromLang, normalizedToLang);
      if (googleResult && googleResult !== trimmedText) {
        return this.preserveFormatting(originalText, trimmedText, googleResult);
      }
    } catch (error) {
      console.warn('Google Translate failed:', error);
    }

    try {
      // Пробуем MyMemory API с улучшенными параметрами
      const response = await fetch(
        `${this.MYMEMORY_URL}?q=${encodeURIComponent(trimmedText)}&langpair=${normalizedFromLang}|${normalizedToLang}&de=example@email.com`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const translated = data.responseData.translatedText;
          // Проверяем качество перевода
          if (translated.toLowerCase() !== trimmedText.toLowerCase() && 
              !translated.includes('MYMEMORY WARNING') &&
              translated.length > 0) {
            return this.preserveFormatting(originalText, trimmedText, translated);
          }
        }
      }
    } catch (error) {
      console.warn('MyMemory API failed:', error);
    }

    try {
      // Fallback к LibreTranslate с улучшенными параметрами
      const response = await fetch(this.LIBRE_TRANSLATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: trimmedText,
          source: normalizedFromLang === 'auto' ? 'auto' : normalizedFromLang,
          target: normalizedToLang,
          format: 'text',
          alternatives: 3
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translatedText && data.translatedText !== trimmedText) {
          return this.preserveFormatting(originalText, trimmedText, data.translatedText);
        }
      }
    } catch (error) {
      console.warn('LibreTranslate API failed:', error);
    }

    // Если все API недоступны, используем улучшенный словарь
    const dictionaryResult = this.dictionaryTranslation(trimmedText, normalizedFromLang, normalizedToLang);
    return this.preserveFormatting(originalText, trimmedText, dictionaryResult);
  }

  private static preserveFormatting(originalText: string, trimmedText: string, translatedText: string): string {
    // Сохраняем начальные и конечные пробелы
    const leadingSpaces = originalText.match(/^\s*/)?.[0] || '';
    const trailingSpaces = originalText.match(/\s*$/)?.[0] || '';
    
    // Сохраняем структуру абзацев
    if (originalText.includes('\n')) {
      const lines = originalText.split('\n');
      const translatedLines = translatedText.split(/[.!?]+/).filter(s => s.trim());
      
      if (translatedLines.length >= lines.length) {
        return lines.map((line, index) => {
          if (line.trim() === '') return line;
          return translatedLines[index]?.trim() || line;
        }).join('\n');
      }
    }
    
    return leadingSpaces + translatedText.trim() + trailingSpaces;
  }

  private static async tryGoogleTranslate(text: string, fromLang: string, toLang: string): Promise<string | null> {
    try {
      const url = `${this.GOOGLE_TRANSLATE_URL}?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) {
          return data[0][0][0];
        }
      }
    } catch (error) {
      console.warn('Google Translate error:', error);
    }
    return null;
  }

  static async detectLanguage(text: string): Promise<string> {
    const trimmedText = text.trim();
    
    try {
      // Пробуем LibreTranslate для определения языка
      const response = await fetch('https://libretranslate.de/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: trimmedText
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data[0] && data[0].language && data[0].confidence > 0.5) {
          return data[0].language;
        }
      }
    } catch (error) {
      console.warn('Language detection failed:', error);
    }

    // Улучшенное определение языка по символам
    return this.advancedLanguageDetection(trimmedText);
  }

  private static advancedLanguageDetection(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Подсчитываем символы разных языков
    const cyrillicCount = (text.match(/[а-яё]/gi) || []).length;
    const latinCount = (text.match(/[a-z]/gi) || []).length;
    const chineseCount = (text.match(/[一-龯]/gi) || []).length;
    const japaneseCount = (text.match(/[ひらがなカタカナ]/gi) || []).length;
    const koreanCount = (text.match(/[가-힣]/gi) || []).length;
    const arabicCount = (text.match(/[ء-ي]/gi) || []).length;
    
    const totalChars = text.length;
    
    // Определяем язык по преобладающим символам
    if (cyrillicCount / totalChars > 0.3) return 'ru';
    if (chineseCount / totalChars > 0.3) return 'zh';
    if (japaneseCount / totalChars > 0.3) return 'ja';
    if (koreanCount / totalChars > 0.3) return 'ko';
    if (arabicCount / totalChars > 0.3) return 'ar';
    
    // Проверяем специфичные символы европейских языков
    if (/[äöüß]/i.test(text)) return 'de';
    if (/[àâäéèêëïîôöùûüÿç]/i.test(text)) return 'fr';
    if (/[áéíóúñü¿¡]/i.test(text)) return 'es';
    if (/[àèéìíîòóù]/i.test(text)) return 'it';
    if (/[ãçõ]/i.test(text)) return 'pt';
    
    // Проверяем по ключевым словам
    const commonWords = {
      'ru': ['и', 'в', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'а', 'по', 'это', 'она', 'этот', 'к', 'но', 'они', 'мы', 'как', 'из'],
      'en': ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'],
      'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para'],
      'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se'],
      'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als']
    };
    
    const words = lowerText.split(/\s+/);
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
      'zh': 'zh-cn',
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
      // Расширенный словарь переводов
      'hello': { 'ru': 'привет', 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'it': 'ciao' },
      'world': { 'ru': 'мир', 'es': 'mundo', 'fr': 'monde', 'de': 'welt', 'it': 'mondo' },
      'goodbye': { 'ru': 'до свидания', 'es': 'adiós', 'fr': 'au revoir', 'de': 'auf wiedersehen', 'it': 'arrivederci' },
      'thank you': { 'ru': 'спасибо', 'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'it': 'grazie' },
      'yes': { 'ru': 'да', 'es': 'sí', 'fr': 'oui', 'de': 'ja', 'it': 'sì' },
      'no': { 'ru': 'нет', 'es': 'no', 'fr': 'non', 'de': 'nein', 'it': 'no' },
      'please': { 'ru': 'пожалуйста', 'es': 'por favor', 'fr': 's\'il vous plaît', 'de': 'bitte', 'it': 'per favore' },
      'sorry': { 'ru': 'извините', 'es': 'lo siento', 'fr': 'désolé', 'de': 'entschuldigung', 'it': 'scusa' },
      'good morning': { 'ru': 'доброе утро', 'es': 'buenos días', 'fr': 'bonjour', 'de': 'guten morgen', 'it': 'buongiorno' },
      'good evening': { 'ru': 'добрый вечер', 'es': 'buenas tardes', 'fr': 'bonsoir', 'de': 'guten abend', 'it': 'buonasera' },
      'how are you': { 'ru': 'как дела', 'es': 'cómo estás', 'fr': 'comment allez-vous', 'de': 'wie geht es dir', 'it': 'come stai' },
      'what is your name': { 'ru': 'как вас зовут', 'es': 'cómo te llamas', 'fr': 'comment vous appelez-vous', 'de': 'wie heißt du', 'it': 'come ti chiami' },
      'i love you': { 'ru': 'я люблю тебя', 'es': 'te amo', 'fr': 'je t\'aime', 'de': 'ich liebe dich', 'it': 'ti amo' },
      'help': { 'ru': 'помощь', 'es': 'ayuda', 'fr': 'aide', 'de': 'hilfe', 'it': 'aiuto' },
      'water': { 'ru': 'вода', 'es': 'agua', 'fr': 'eau', 'de': 'wasser', 'it': 'acqua' },
      'food': { 'ru': 'еда', 'es': 'comida', 'fr': 'nourriture', 'de': 'essen', 'it': 'cibo' },
      'house': { 'ru': 'дом', 'es': 'casa', 'fr': 'maison', 'de': 'haus', 'it': 'casa' },
      'car': { 'ru': 'машина', 'es': 'coche', 'fr': 'voiture', 'de': 'auto', 'it': 'macchina' },
      'book': { 'ru': 'книга', 'es': 'libro', 'fr': 'livre', 'de': 'buch', 'it': 'libro' },
      'computer': { 'ru': 'компьютер', 'es': 'computadora', 'fr': 'ordinateur', 'de': 'computer', 'it': 'computer' },
      
      // Обратные переводы
      'привет': { 'en': 'hello', 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'it': 'ciao' },
      'мир': { 'en': 'world', 'es': 'mundo', 'fr': 'monde', 'de': 'welt', 'it': 'mondo' },
      'до свидания': { 'en': 'goodbye', 'es': 'adiós', 'fr': 'au revoir', 'de': 'auf wiedersehen', 'it': 'arrivederci' },
      'спасибо': { 'en': 'thank you', 'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'it': 'grazie' },
      'да': { 'en': 'yes', 'es': 'sí', 'fr': 'oui', 'de': 'ja', 'it': 'sì' },
      'нет': { 'en': 'no', 'es': 'no', 'fr': 'non', 'de': 'nein', 'it': 'no' },
      'пожалуйста': { 'en': 'please', 'es': 'por favor', 'fr': 's\'il vous plaît', 'de': 'bitte', 'it': 'per favore' },
      'извините': { 'en': 'sorry', 'es': 'lo siento', 'fr': 'désolé', 'de': 'entschuldigung', 'it': 'scusa' }
    };

    const lowerText = text.toLowerCase().trim();
    
    // Проверяем точные совпадения
    const translation = translations[lowerText]?.[toLang];
    if (translation) {
      return translation;
    }

    // Проверяем частичные совпадения для фраз
    for (const [phrase, translationMap] of Object.entries(translations)) {
      if (lowerText.includes(phrase) && translationMap[toLang]) {
        return lowerText.replace(phrase, translationMap[toLang]);
      }
    }

    // Если перевод не найден, возвращаем исходный текст
    return text;
  }
}