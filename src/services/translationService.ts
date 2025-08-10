// Translation service using multiple free APIs
export class TranslationService {
  private static readonly LIBRE_TRANSLATE_URL = 'https://libretranslate.de/translate';
  private static readonly MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
  private static readonly GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

  static async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    // Если языки одинаковые, возвращаем исходный текст
    if (fromLang === toLang) {
      return text;
    }

    // Нормализуем коды языков
    const normalizedFromLang = this.normalizeLanguageCode(fromLang);
    const normalizedToLang = this.normalizeLanguageCode(toLang);

    try {
      // Пробуем Google Translate (неофициальный API)
      const googleResult = await this.tryGoogleTranslate(text, normalizedFromLang, normalizedToLang);
      if (googleResult) {
        return googleResult;
      }
    } catch (error) {
      console.warn('Google Translate failed:', error);
    }

    try {
      // Пробуем MyMemory API
      const response = await fetch(
        `${this.MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${normalizedFromLang}|${normalizedToLang}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const translated = data.responseData.translatedText;
          // Проверяем, что перевод не идентичен исходному тексту
          if (translated.toLowerCase() !== text.toLowerCase()) {
            return translated;
          }
        }
      }
    } catch (error) {
      console.warn('MyMemory API failed:', error);
    }

    try {
      // Fallback к LibreTranslate
      const response = await fetch(this.LIBRE_TRANSLATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: normalizedFromLang === 'auto' ? 'auto' : normalizedFromLang,
          target: normalizedToLang,
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
      console.warn('LibreTranslate API failed:', error);
    }

    // Если все API недоступны, используем словарь
    return this.dictionaryTranslation(text, normalizedFromLang, normalizedToLang);
  }

  private static async tryGoogleTranslate(text: string, fromLang: string, toLang: string): Promise<string | null> {
    try {
      const url = `${this.GOOGLE_TRANSLATE_URL}?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url);
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
    try {
      // Пробуем LibreTranslate для определения языка
      const response = await fetch('https://libretranslate.de/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data[0] && data[0].language) {
          return data[0].language;
        }
      }
    } catch (error) {
      console.warn('Language detection failed:', error);
    }

    // Простое определение языка по символам
    return this.simpleLanguageDetection(text);
  }

  private static simpleLanguageDetection(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Русский
    if (/[а-яё]/i.test(text)) return 'ru';
    
    // Китайский
    if (/[一-龯]/i.test(text)) return 'zh';
    
    // Японский
    if (/[ひらがなカタカナ]/i.test(text)) return 'ja';
    
    // Корейский
    if (/[가-힣]/i.test(text)) return 'ko';
    
    // Арабский
    if (/[ء-ي]/i.test(text)) return 'ar';
    
    // Немецкий
    if (/[äöüß]/i.test(text)) return 'de';
    
    // Французский
    if (/[àâäéèêëïîôöùûüÿç]/i.test(text)) return 'fr';
    
    // Испанский
    if (/[áéíóúñü]/i.test(text)) return 'es';
    
    // По умолчанию английский
    return 'en';
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
      // Английский -> Русский
      'hello': { 'ru': 'привет' },
      'world': { 'ru': 'мир' },
      'goodbye': { 'ru': 'до свидания' },
      'thank you': { 'ru': 'спасибо' },
      'yes': { 'ru': 'да' },
      'no': { 'ru': 'нет' },
      'please': { 'ru': 'пожалуйста' },
      'sorry': { 'ru': 'извините' },
      'good morning': { 'ru': 'доброе утро' },
      'good evening': { 'ru': 'добрый вечер' },
      'how are you': { 'ru': 'как дела' },
      'what is your name': { 'ru': 'как вас зовут' },
      'i love you': { 'ru': 'я люблю тебя' },
      'help': { 'ru': 'помощь' },
      'water': { 'ru': 'вода' },
      'food': { 'ru': 'еда' },
      'house': { 'ru': 'дом' },
      'car': { 'ru': 'машина' },
      'book': { 'ru': 'книга' },
      'computer': { 'ru': 'компьютер' },
      
      // Русский -> Английский
      'привет': { 'en': 'hello' },
      'мир': { 'en': 'world' },
      'до свидания': { 'en': 'goodbye' },
      'спасибо': { 'en': 'thank you' },
      'да': { 'en': 'yes' },
      'нет': { 'en': 'no' },
      'пожалуйста': { 'en': 'please' },
      'извините': { 'en': 'sorry' },
      'доброе утро': { 'en': 'good morning' },
      'добрый вечер': { 'en': 'good evening' },
      'как дела': { 'en': 'how are you' },
      'как вас зовут': { 'en': 'what is your name' },
      'я люблю тебя': { 'en': 'i love you' },
      'помощь': { 'en': 'help' },
      'вода': { 'en': 'water' },
      'еда': { 'en': 'food' },
      'дом': { 'en': 'house' },
      'машина': { 'en': 'car' },
      'книга': { 'en': 'book' },
      'компьютер': { 'en': 'computer' }
    };

    const lowerText = text.toLowerCase().trim();
    const translation = translations[lowerText]?.[toLang];
    
    if (translation) {
      return translation;
    }

    // Если точного перевода нет, возвращаем с пометкой
    return `[${fromLang}→${toLang}] ${text}`;
  }
}