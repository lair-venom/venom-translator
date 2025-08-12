// Идеальная система перевода с устранением дублирования и максимальным качеством
export class TranslationService {
  private static readonly GOOGLE_TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single';
  private static readonly MYMEMORY_API = 'https://api.mymemory.translated.net/get';
  private static readonly LIBRE_TRANSLATE_API = 'https://libretranslate.de/translate';
  
  // Кэш переводов для избежания повторных запросов
  private static translationCache = new Map<string, string>();
  
  // Максимальная длина текста для одного запроса
  private static readonly MAX_CHUNK_SIZE = 500;

  static async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    // Если языки одинаковые, возвращаем исходный текст
    if (fromLang === toLang && fromLang !== 'auto') {
      return text;
    }

    const originalText = text;
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      return text;
    }

    // Проверяем кэш
    const cacheKey = `${trimmedText}|${fromLang}|${toLang}`;
    if (this.translationCache.has(cacheKey)) {
      return this.restoreFormatting(originalText, this.translationCache.get(cacheKey)!);
    }

    // Нормализуем коды языков
    const normalizedFromLang = this.normalizeLanguageCode(fromLang);
    const normalizedToLang = this.normalizeLanguageCode(toLang);

    // Определяем язык, если установлен auto
    let detectedFromLang = normalizedFromLang;
    if (normalizedFromLang === 'auto') {
      detectedFromLang = await this.detectLanguage(trimmedText);
      
      // Если определенный язык совпадает с целевым, возвращаем исходный текст
      if (detectedFromLang === normalizedToLang) {
        return originalText;
      }
    }

    try {
      // Разбиваем текст на оптимальные части
      const textChunks = this.intelligentTextSplit(trimmedText);
      const translatedChunks: string[] = [];

      for (const chunk of textChunks) {
        if (!chunk.trim()) {
          translatedChunks.push(chunk);
          continue;
        }

        const translatedChunk = await this.translateChunk(
          chunk.trim(), 
          detectedFromLang, 
          normalizedToLang
        );
        
        translatedChunks.push(translatedChunk);
      }

      const result = this.reconstructText(textChunks, translatedChunks);
      const finalResult = this.postProcessTranslation(result, detectedFromLang, normalizedToLang);
      
      // Сохраняем в кэш
      this.translationCache.set(cacheKey, finalResult);
      
      // Ограничиваем размер кэша
      if (this.translationCache.size > 100) {
        const firstKey = this.translationCache.keys().next().value;
        this.translationCache.delete(firstKey);
      }

      return this.restoreFormatting(originalText, finalResult);
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Ошибка перевода: ${(error as Error).message}`);
    }
  }

  private static intelligentTextSplit(text: string): string[] {
    // Если текст короткий, не разбиваем
    if (text.length <= this.MAX_CHUNK_SIZE) {
      return [text];
    }

    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/);

    for (const paragraph of paragraphs) {
      if (paragraph.length <= this.MAX_CHUNK_SIZE) {
        chunks.push(paragraph);
      } else {
        // Разбиваем длинные абзацы по предложениям
        const sentences = this.splitIntoSentences(paragraph);
        let currentChunk = '';

        for (const sentence of sentences) {
          if ((currentChunk + sentence).length <= this.MAX_CHUNK_SIZE) {
            currentChunk += sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          }
        }

        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
      }
    }

    return chunks.length > 0 ? chunks : [text];
  }

  private static splitIntoSentences(text: string): string[] {
    // Улучшенное разбиение на предложения с учетом сокращений
    const abbreviations = /(?:Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|Corp|etc|vs|i\.e|e\.g|a\.m|p\.m|U\.S|U\.K|Ph\.D|B\.A|M\.A)\./gi;
    
    // Заменяем сокращения на временные маркеры
    const tempText = text.replace(abbreviations, (match) => match.replace('.', '<!DOT!>'));
    
    // Разбиваем по предложениям
    const sentences = tempText.split(/[.!?]+(?=\s+[A-ZА-Я]|\s*$)/).filter(s => s.trim());
    
    // Восстанавливаем точки в сокращениях
    return sentences.map(sentence => sentence.replace(/<!DOT!>/g, '.').trim());
  }

  private static async translateChunk(text: string, fromLang: string, toLang: string): Promise<string> {
    const translationMethods = [
      () => this.tryGoogleTranslate(text, fromLang, toLang),
      () => this.tryMyMemoryTranslate(text, fromLang, toLang),
      () => this.tryLibreTranslate(text, fromLang, toLang)
    ];

    for (const method of translationMethods) {
      try {
        const result = await method();
        if (this.isValidTranslation(result, text, fromLang, toLang)) {
          return result;
        }
      } catch (error) {
        console.warn('Translation method failed:', error);
        continue;
      }
    }

    // Если все методы не сработали, используем словарь
    return this.dictionaryTranslation(text, fromLang, toLang);
  }

  private static isValidTranslation(translation: string | null, original: string, fromLang: string, toLang: string): boolean {
    if (!translation || !translation.trim()) {
      return false;
    }

    const cleanTranslation = translation.trim().toLowerCase();
    const cleanOriginal = original.trim().toLowerCase();

    // Проверяем, что перевод не является копией оригинала (кроме случаев, когда это оправдано)
    if (cleanTranslation === cleanOriginal) {
      // Разрешаем одинаковый текст для имен собственных, чисел, и коротких слов
      if (original.length <= 3 || /^[A-Z][a-z]*$/.test(original) || /^\d+$/.test(original)) {
        return true;
      }
      return false;
    }

    // Проверяем на дублирование (когда текст повторяется)
    const words = cleanTranslation.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 3 && uniqueWords.size < words.length * 0.7) {
      return false; // Слишком много повторений
    }

    // Проверяем на мусор от API
    const garbagePatterns = [
      /MYMEMORY WARNING/i,
      /\[TRANSLATION ERROR\]/i,
      /\[UNTRANSLATED\]/i,
      /^ERROR:/i,
      /^QUOTA EXCEEDED/i
    ];

    for (const pattern of garbagePatterns) {
      if (pattern.test(translation)) {
        return false;
      }
    }

    return true;
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data[0] && Array.isArray(data[0])) {
          const translatedText = data[0]
            .filter((item: any) => item && item[0])
            .map((item: any) => item[0])
            .join('');
          
          return this.cleanTranslatedText(translatedText);
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
        de: 'translator@venom.app',
        mt: '1'
      });

      const response = await fetch(`${this.MYMEMORY_API}?${params}`, {
        headers: {
          'User-Agent': 'VenomTranslator/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const translated = data.responseData.translatedText;
          return this.cleanTranslatedText(translated);
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
          'User-Agent': 'VenomTranslator/1.0'
        },
        body: JSON.stringify({
          q: text,
          source: fromLang === 'auto' ? 'auto' : fromLang,
          target: toLang,
          format: 'text',
          alternatives: 3
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          return this.cleanTranslatedText(data.translatedText);
        }
      }
    } catch (error) {
      console.warn('LibreTranslate error:', error);
    }
    return null;
  }

  private static cleanTranslatedText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .replace(/\s+([.,:;!?])/g, '$1') // Убираем пробелы перед знаками препинания
      .replace(/([.,:;!?])\s*([.,:;!?])/g, '$1 $2') // Нормализуем знаки препинания
      .trim();
  }

  private static postProcessTranslation(text: string, fromLang: string, toLang: string): string {
    let result = text;

    // Устраняем дублирование предложений
    result = this.removeDuplicateSentences(result);

    // Исправляем капитализацию
    result = this.fixCapitalization(result, toLang);

    // Исправляем пунктуацию
    result = this.fixPunctuation(result, toLang);

    return result;
  }

  private static removeDuplicateSentences(text: string): string {
    const sentences = text.split(/([.!?]+)/).filter(s => s.trim());
    const cleanSentences: string[] = [];
    const seenSentences = new Set<string>();

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i]?.trim();
      const punctuation = sentences[i + 1] || '';

      if (sentence) {
        const normalizedSentence = sentence.toLowerCase().replace(/\s+/g, ' ');
        
        if (!seenSentences.has(normalizedSentence)) {
          seenSentences.add(normalizedSentence);
          cleanSentences.push(sentence + punctuation);
        }
      }
    }

    return cleanSentences.join(' ').replace(/\s+/g, ' ').trim();
  }

  private static fixCapitalization(text: string, toLang: string): string {
    // Исправляем капитализацию в зависимости от языка
    const sentences = text.split(/([.!?]+\s*)/);
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      if (sentence && sentence.trim()) {
        // Делаем первую букву заглавной
        sentences[i] = sentence.replace(/^\s*([a-zа-яё])/i, (match, letter) => 
          match.replace(letter, letter.toUpperCase())
        );
      }
    }

    return sentences.join('');
  }

  private static fixPunctuation(text: string, toLang: string): string {
    return text
      .replace(/\s+([.,:;!?])/g, '$1') // Убираем пробелы перед знаками препинания
      .replace(/([.!?])\s*([a-zа-яё])/gi, '$1 $2') // Добавляем пробел после точки
      .replace(/\s{2,}/g, ' ') // Убираем множественные пробелы
      .trim();
  }

  private static reconstructText(originalChunks: string[], translatedChunks: string[]): string {
    const result: string[] = [];
    
    for (let i = 0; i < originalChunks.length; i++) {
      const original = originalChunks[i];
      const translated = translatedChunks[i] || original;
      
      // Сохраняем структуру пустых строк и отступов
      if (!original.trim()) {
        result.push(original);
      } else {
        result.push(translated);
      }
    }

    return result.join('\n\n').replace(/\n{3,}/g, '\n\n');
  }

  private static restoreFormatting(original: string, translated: string): string {
    // Сохраняем начальные и конечные пробелы
    const leadingWhitespace = original.match(/^\s*/)?.[0] || '';
    const trailingWhitespace = original.match(/\s*$/)?.[0] || '';
    
    return leadingWhitespace + translated.trim() + trailingWhitespace;
  }

  static async detectLanguage(text: string): Promise<string> {
    const trimmedText = text.trim().substring(0, 200); // Берем первые 200 символов
    
    // Пробуем Google API для определения языка
    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: 'en',
        dt: 't',
        q: trimmedText
      });

      const response = await fetch(`${this.GOOGLE_TRANSLATE_API}?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data[2]) {
          const detectedLang = this.normalizeLanguageCode(data[2]);
          if (detectedLang !== 'auto') {
            return detectedLang;
          }
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
    const totalChars = text.replace(/\s/g, '').length;
    
    if (totalChars === 0) return 'en';
    
    // Подсчитываем символы разных языков
    const scriptCounts = {
      cyrillic: (text.match(/[а-яё]/gi) || []).length,
      latin: (text.match(/[a-z]/gi) || []).length,
      chinese: (text.match(/[一-龯]/gi) || []).length,
      japanese: (text.match(/[ひらがなカタカナ]/gi) || []).length,
      korean: (text.match(/[가-힣]/gi) || []).length,
      arabic: (text.match(/[ء-ي]/gi) || []).length
    };

    // Определяем по преобладающим символам
    for (const [script, count] of Object.entries(scriptCounts)) {
      if (count / totalChars > 0.3) {
        switch (script) {
          case 'cyrillic': return 'ru';
          case 'chinese': return 'zh';
          case 'japanese': return 'ja';
          case 'korean': return 'ko';
          case 'arabic': return 'ar';
        }
      }
    }

    // Проверяем специфичные символы для европейских языков
    const languageMarkers = {
      'de': /[äöüß]/i,
      'fr': /[àâäéèêëïîôöùûüÿç]/i,
      'es': /[áéíóúñü¿¡]/i,
      'it': /[àèéìíîòóù]/i,
      'pt': /[ãçõ]/i,
      'pl': /[ąćęłńóśźż]/i,
      'tr': /[çğıöşü]/i
    };

    for (const [lang, pattern] of Object.entries(languageMarkers)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    // Анализ по ключевым словам
    const commonWords = {
      'ru': ['и', 'в', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'а', 'по', 'это', 'она', 'этот', 'к', 'но', 'они', 'мы', 'как', 'из', 'за', 'от', 'до', 'при', 'для', 'или', 'уже', 'если', 'время', 'более', 'нет', 'так', 'вы', 'сказать', 'этого', 'может', 'после', 'слово', 'день', 'его', 'новый', 'два', 'наш', 'том', 'дело', 'жизнь'],
      'en': ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'],
      'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'una', 'del', 'los', 'al', 'todo', 'está', 'muy', 'fue', 'han', 'era', 'sobre', 'mi', 'está', 'entre', 'durante', 'un', 'antes', 'llegar', 'luego', 'mucho', 'haber', 'qué', 'año', 'dos', 'querer', 'entre', 'así', 'primero', 'desde', 'grande', 'eso', 'ni', 'nos', 'llegar', 'pasar', 'tiempo', 'ella', 'sí', 'día', 'uno', 'bien', 'poco', 'deber', 'entonces', 'poner', 'aquí', 'parecer', 'fin', 'tanto', 'donde', 'saber', 'nada', 'cada', 'menos', 'dar', 'cuenta', 'cuando', 'muy', 'sin', 'vez', 'mujer', 'vida', 'igual', 'momento', 'grupo', 'agua', 'realizar', 'guerra', 'historia', 'forma', 'esperar', 'miembro', 'parte'],
      'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par', 'grand', 'ce', 'le', 'il', 'avoir', 'son', 'que', 'se', 'qui', 'en', 'vous', 'sur', 'avec', 'ne', 'y', 'aller', 'en', 'savoir', 'me', 'je', 'voir', 'en', 'au', 'du', 'te', 'donner', 'légal', 'lui', 'ou', 'là', 'marché', 'les', 'mais', 'à', 'elle', 'deux', 'même', 'faire', 'dire', 'sous', 'old', 'mot'],
      'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'nach', 'wird', 'an', 'werden', 'aus', 'er', 'hat', 'daß', 'sie', 'zu', 'ein', 'oder', 'aber', 'können', 'haben', 'wir', 'was', 'werden', 'sein', 'einen', 'welche', 'sind', 'noch', 'wie', 'einem', 'über', 'einen', 'so', 'zum', 'war', 'haben', 'nur', 'oder', 'auch', 'es', 'soll', 'werden', 'bei', 'ist', 'des', 'sich', 'ein', 'diesem', 'einer', 'er', 'auch', 'an', 'werden', 'aus', 'zu', 'im', 'sie', 'einem', 'mit', 'nach', 'einer', 'der', 'bei']
    };
    
    const words = lowerText.split(/\s+/).filter(word => word.length > 1);
    let maxMatches = 0;
    let detectedLang = 'en';
    
    for (const [lang, wordList] of Object.entries(commonWords)) {
      const matches = words.filter(word => wordList.includes(word)).length;
      const score = matches / Math.min(words.length, 20); // Нормализуем по количеству слов
      
      if (score > maxMatches) {
        maxMatches = score;
        detectedLang = lang;
      }
    }
    
    return detectedLang;
  }

  private static normalizeLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'auto': 'auto',
      'ru': 'ru', 'russian': 'ru',
      'en': 'en', 'english': 'en',
      'es': 'es', 'spanish': 'es',
      'fr': 'fr', 'french': 'fr',
      'de': 'de', 'german': 'de',
      'it': 'it', 'italian': 'it',
      'pt': 'pt', 'portuguese': 'pt',
      'zh': 'zh', 'chinese': 'zh', 'zh-cn': 'zh',
      'ja': 'ja', 'japanese': 'ja',
      'ko': 'ko', 'korean': 'ko',
      'ar': 'ar', 'arabic': 'ar',
      'hi': 'hi', 'hindi': 'hi',
      'tr': 'tr', 'turkish': 'tr',
      'nl': 'nl', 'dutch': 'nl',
      'sv': 'sv', 'swedish': 'sv',
      'da': 'da', 'danish': 'da',
      'no': 'no', 'norwegian': 'no',
      'fi': 'fi', 'finnish': 'fi',
      'pl': 'pl', 'polish': 'pl'
    };
    
    return mapping[code.toLowerCase()] || code;
  }

  private static dictionaryTranslation(text: string, fromLang: string, toLang: string): string {
    // Расширенный словарь с контекстными переводами
    const translations: Record<string, Record<string, string>> = {
      // Английский -> другие языки
      'hello': { 'ru': 'привет', 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'it': 'ciao', 'pt': 'olá', 'zh': '你好', 'ja': 'こんにちは', 'ko': '안녕하세요', 'ar': 'مرحبا', 'hi': 'नमस्ते', 'tr': 'merhaba', 'nl': 'hallo', 'sv': 'hej', 'da': 'hej', 'no': 'hei', 'fi': 'hei', 'pl': 'cześć' },
      'world': { 'ru': 'мир', 'es': 'mundo', 'fr': 'monde', 'de': 'welt', 'it': 'mondo', 'pt': 'mundo', 'zh': '世界', 'ja': '世界', 'ko': '세계', 'ar': 'عالم', 'hi': 'दुनिया', 'tr': 'dünya', 'nl': 'wereld', 'sv': 'värld', 'da': 'verden', 'no': 'verden', 'fi': 'maailma', 'pl': 'świat' },
      'goodbye': { 'ru': 'до свидания', 'es': 'adiós', 'fr': 'au revoir', 'de': 'auf wiedersehen', 'it': 'arrivederci', 'pt': 'tchau', 'zh': '再见', 'ja': 'さようなら', 'ko': '안녕히 가세요', 'ar': 'وداعا', 'hi': 'अलविदा', 'tr': 'hoşça kal', 'nl': 'tot ziens', 'sv': 'hej då', 'da': 'farvel', 'no': 'ha det', 'fi': 'näkemiin', 'pl': 'do widzenia' },
      'thank you': { 'ru': 'спасибо', 'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'it': 'grazie', 'pt': 'obrigado', 'zh': '谢谢', 'ja': 'ありがとう', 'ko': '감사합니다', 'ar': 'شكرا', 'hi': 'धन्यवाद', 'tr': 'teşekkür ederim', 'nl': 'dank je', 'sv': 'tack', 'da': 'tak', 'no': 'takk', 'fi': 'kiitos', 'pl': 'dziękuję' },
      'yes': { 'ru': 'да', 'es': 'sí', 'fr': 'oui', 'de': 'ja', 'it': 'sì', 'pt': 'sim', 'zh': '是', 'ja': 'はい', 'ko': '네', 'ar': 'نعم', 'hi': 'हाँ', 'tr': 'evet', 'nl': 'ja', 'sv': 'ja', 'da': 'ja', 'no': 'ja', 'fi': 'kyllä', 'pl': 'tak' },
      'no': { 'ru': 'нет', 'es': 'no', 'fr': 'non', 'de': 'nein', 'it': 'no', 'pt': 'não', 'zh': '不', 'ja': 'いいえ', 'ko': '아니요', 'ar': 'لا', 'hi': 'नहीं', 'tr': 'hayır', 'nl': 'nee', 'sv': 'nej', 'da': 'nej', 'no': 'nei', 'fi': 'ei', 'pl': 'nie' },
      'please': { 'ru': 'пожалуйста', 'es': 'por favor', 'fr': 's\'il vous plaît', 'de': 'bitte', 'it': 'per favore', 'pt': 'por favor', 'zh': '请', 'ja': 'お願いします', 'ko': '제발', 'ar': 'من فضلك', 'hi': 'कृपया', 'tr': 'lütfen', 'nl': 'alsjeblieft', 'sv': 'snälla', 'da': 'tak', 'no': 'takk', 'fi': 'ole hyvä', 'pl': 'proszę' },
      
      // Русский -> другие языки
      'привет': { 'en': 'hello', 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'it': 'ciao', 'pt': 'olá', 'zh': '你好', 'ja': 'こんにちは', 'ko': '안녕하세요', 'ar': 'مرحبا', 'hi': 'नमस्ते', 'tr': 'merhaba', 'nl': 'hallo', 'sv': 'hej', 'da': 'hej', 'no': 'hei', 'fi': 'hei', 'pl': 'cześć' },
      'мир': { 'en': 'world', 'es': 'mundo', 'fr': 'monde', 'de': 'welt', 'it': 'mondo', 'pt': 'mundo', 'zh': '世界', 'ja': '世界', 'ko': '세계', 'ar': 'عالم', 'hi': 'दुनिया', 'tr': 'dünya', 'nl': 'wereld', 'sv': 'värld', 'da': 'verden', 'no': 'verden', 'fi': 'maailma', 'pl': 'świat' },
      'спасибо': { 'en': 'thank you', 'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'it': 'grazie', 'pt': 'obrigado', 'zh': '谢谢', 'ja': 'ありがとう', 'ko': '감사합니다', 'ar': 'شكرا', 'hi': 'धन्यवाद', 'tr': 'teşekkür ederim', 'nl': 'dank je', 'sv': 'tack', 'da': 'tak', 'no': 'takk', 'fi': 'kiitos', 'pl': 'dziękuję' },
      'да': { 'en': 'yes', 'es': 'sí', 'fr': 'oui', 'de': 'ja', 'it': 'sì', 'pt': 'sim', 'zh': '是', 'ja': 'はい', 'ko': '네', 'ar': 'نعم', 'hi': 'हाँ', 'tr': 'evet', 'nl': 'ja', 'sv': 'ja', 'da': 'ja', 'no': 'ja', 'fi': 'kyllä', 'pl': 'tak' },
      'нет': { 'en': 'no', 'es': 'no', 'fr': 'non', 'de': 'nein', 'it': 'no', 'pt': 'não', 'zh': '不', 'ja': 'いいえ', 'ko': '아니요', 'ar': 'لا', 'hi': 'नहीं', 'tr': 'hayır', 'nl': 'nee', 'sv': 'nej', 'da': 'nej', 'no': 'nei', 'fi': 'ei', 'pl': 'nie' }
    };

    const lowerText = text.toLowerCase().trim();
    
    // Проверяем точные совпадения
    const translation = translations[lowerText]?.[toLang];
    if (translation) {
      // Сохраняем капитализацию оригинала
      if (text[0] && text[0] === text[0].toUpperCase()) {
        return translation.charAt(0).toUpperCase() + translation.slice(1);
      }
      return translation;
    }

    // Если перевод не найден, возвращаем исходный текст
    return text;
  }
}