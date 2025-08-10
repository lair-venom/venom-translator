import Tesseract from 'tesseract.js';

export class OCRService {
  static async extractTextFromImage(imageFile: File): Promise<string> {
    try {
      console.log('Starting OCR processing...');
      
      const { data: { text } } = await Tesseract.recognize(
        imageFile,
        'eng+rus+spa+fra+deu+ita+por+chi_sim+jpn+kor+ara+hin+tur+nld+swe+dan+nor+fin+pol',
        {
          logger: m => console.log(m)
        }
      );
      
      const cleanText = text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
      
      if (!cleanText) {
        throw new Error('Не удалось распознать текст на изображении');
      }
      
      return cleanText;
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Ошибка при распознавании текста: ' + (error as Error).message);
    }
  }

  static async extractTextFromImageUrl(imageUrl: string): Promise<string> {
    try {
      const { data: { text } } = await Tesseract.recognize(
        imageUrl,
        'eng+rus+spa+fra+deu+ita+por+chi_sim+jpn+kor+ara+hin+tur+nld+swe+dan+nor+fin+pol',
        {
          logger: m => console.log(m)
        }
      );
      
      const cleanText = text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
      
      if (!cleanText) {
        throw new Error('Не удалось распознать текст на изображении');
      }
      
      return cleanText;
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Ошибка при распознавании текста: ' + (error as Error).message);
    }
  }
}