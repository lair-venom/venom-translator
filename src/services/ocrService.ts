import Tesseract from 'tesseract.js';

export class OCRService {
  static async extractTextFromImage(imageFile: File): Promise<string> {
    try {
      console.log('Starting advanced OCR processing...');
      
      // Предварительная обработка изображения для лучшего распознавания
      const processedImage = await this.preprocessImage(imageFile);
      
      const { data: { text } } = await Tesseract.recognize(
        processedImage,
        'eng+rus+spa+fra+deu+ita+por+chi_sim+jpn+kor+ara+hin+tur+nld+swe+dan+nor+fin+pol+ukr+bel+ces+slk+hun+ron+bul+hrv+srp+slv+est+lav+lit',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
          preserve_interword_spaces: '1'
        }
      );
      
      // Улучшенная очистка текста с сохранением структуры
      const cleanText = this.cleanExtractedText(text);
      
      if (!cleanText || cleanText.length < 2) {
        throw new Error('Текст на изображении не обнаружен. Убедитесь, что изображение содержит четкий текст.');
      }
      
      console.log('OCR completed successfully:', cleanText);
      return cleanText;
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Ошибка при распознавании текста: ' + (error as Error).message);
    }
  }

  private static async preprocessImage(imageFile: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Увеличиваем размер для лучшего распознавания
          const scale = Math.max(1, 1200 / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          // Рисуем изображение с улучшенным качеством
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Применяем фильтры для улучшения контраста
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Увеличиваем контраст
          for (let i = 0; i < data.length; i += 4) {
            // Конвертируем в оттенки серого для лучшего OCR
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            
            // Увеличиваем контраст
            const contrast = 1.5;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            const newGray = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
            
            data[i] = newGray;     // R
            data[i + 1] = newGray; // G
            data[i + 2] = newGray; // B
            // data[i + 3] остается без изменений (alpha)
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          // Конвертируем обратно в файл
          canvas.toBlob((blob) => {
            if (blob) {
              const processedFile = new File([blob], imageFile.name, { type: 'image/png' });
              resolve(processedFile);
            } else {
              reject(new Error('Failed to process image'));
            }
          }, 'image/png', 0.95);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  }

  private static cleanExtractedText(text: string): string {
    if (!text) return '';
    
    // Улучшенная очистка с сохранением структуры
    let cleaned = text
      // Нормализуем пробелы и табуляции
      .replace(/[ \t]+/g, ' ')
      // Убираем лишние переносы строк
      .replace(/\n{3,}/g, '\n\n')
      // Очищаем строки от лишних пробелов
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 || line === '') // Сохраняем пустые строки для структуры
      .join('\n')
      .trim();
    
    // Убираем артефакты OCR
    cleaned = cleaned
      // Убираем очевидные артефакты
      .replace(/[|\\\/\[\]{}()<>_~`]/g, '')
      // Исправляем пунктуацию
      .replace(/\s+([.,:;!?])/g, '$1')
      .replace(/([.,:;!?])\s*([.,:;!?])/g, '$1 $2')
      // Убираем множественные пробелы
      .replace(/\s{2,}/g, ' ')
      // Исправляем распространенные ошибки OCR
      .replace(/\b0\b/g, 'O') // Ноль вместо буквы O
      .replace(/\b1\b/g, 'I') // Единица вместо буквы I
      .replace(/rn/g, 'm') // rn часто распознается вместо m
      .replace(/\|/g, 'l'); // Вертикальная черта вместо l
    
    return cleaned;
  }

  static async extractTextFromImageUrl(imageUrl: string): Promise<string> {
    try {
      // Загружаем изображение как файл
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      
      return await this.extractTextFromImage(file);
    } catch (error) {
      console.error('OCR Error from URL:', error);
      throw new Error('Ошибка при распознавании текста: ' + (error as Error).message);
    }
  }
}