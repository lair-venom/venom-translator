import React, { useState } from 'react';
import { Copy, RotateCcw, History, ArrowRightLeft } from 'lucide-react';
import { Logo } from './components/Logo';
import { LanguageSelect } from './components/LanguageSelect';
import { TextArea } from './components/TextArea';
import { ImageUpload } from './components/ImageUpload';
import { NotificationContainer } from './components/Notification';
import { useNotifications } from './hooks/useNotifications';
import { useTranslation } from './hooks/useTranslation';
import { languages, targetLanguages } from './data/languages';

function App() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [fromLanguage, setFromLanguage] = useState('auto');
  const [toLanguage, setToLanguage] = useState('en');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [showHistory, setShowHistory] = useState(false);

  const { notifications, addNotification, removeNotification } = useNotifications();
  const { translateText, translateImage, loading, history, clearHistory } = useTranslation();

  const handleTextTranslate = async () => {
    if (!sourceText.trim()) {
      addNotification('warning', 'Предупреждение', 'Введите текст для перевода');
      return;
    }

    try {
      const result = await translateText(sourceText, fromLanguage, toLanguage);
      setTranslatedText(result);
      
      if (result === sourceText) {
        addNotification('info', 'Информация', 'Текст уже на целевом языке');
      } else {
        addNotification('success', 'Успешно', 'Текст переведен');
      }
    } catch (error) {
      addNotification('error', 'Ошибка', `Не удалось перевести текст: ${(error as Error).message}`);
    }
  };

  const handleImageTranslate = async (imageFile: File) => {
    try {
      addNotification('info', 'Обработка', 'Распознаем текст на изображении...');
      
      const imageUrl = URL.createObjectURL(imageFile);
      setCurrentImage(imageUrl);
      
      const result = await translateImage(imageFile, fromLanguage, toLanguage);
      setSourceText(result.extractedText);
      setTranslatedText(result.translatedText);
      
      if (result.extractedText) {
        addNotification('success', 'Успешно', `Распознан текст: "${result.extractedText.substring(0, 50)}${result.extractedText.length > 50 ? '...' : ''}"`);
      } else {
        addNotification('warning', 'Внимание', 'Текст на изображении не найден');
      }
    } catch (error) {
      console.error('Image translation error:', error);
      addNotification('error', 'Ошибка', `Ошибка обработки изображения: ${(error as Error).message}`);
      setCurrentImage(null);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addNotification('success', 'Скопировано', 'Текст скопирован в буфер обмена');
    } catch (error) {
      addNotification('error', 'Ошибка', 'Не удалось скопировать текст');
    }
  };

  const handleSwapLanguages = () => {
    if (fromLanguage === 'auto') return;
    
    setFromLanguage(toLanguage);
    setToLanguage(fromLanguage);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleClearAll = () => {
    setSourceText('');
    setTranslatedText('');
    setCurrentImage(null);
    addNotification('info', 'Очищено', 'Все поля очищены');
  };

  const handleClearImage = () => {
    setCurrentImage(null);
    if (currentImage) {
      URL.revokeObjectURL(currentImage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-400/5 to-gray-600/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-gray-600/5 to-orange-500/5 rounded-full blur-3xl animate-float-gentle"></div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex justify-center mb-8">
            <Logo />
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="glass rounded-full p-1 flex">
              <button
                onClick={() => setMode('text')}
                className={`px-6 py-2 rounded-full transition-all ${
                  mode === 'text' 
                    ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Текст
              </button>
              <button
                onClick={() => setMode('image')}
                className={`px-6 py-2 rounded-full transition-all ${
                  mode === 'image' 
                    ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Изображение
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <LanguageSelect
              value={fromLanguage}
              onChange={setFromLanguage}
              languages={languages}
              label="Исходный язык"
            />
            
            <div className="flex justify-center items-end pb-4">
              <button
                onClick={handleSwapLanguages}
                disabled={fromLanguage === 'auto'}
                className={`p-4 rounded-full transition-all ${
                  fromLanguage === 'auto' 
                    ? 'glass-border text-gray-500 cursor-not-allowed' 
                    : 'glass-border hover:bg-orange-400 hover:bg-opacity-20 text-orange-400 hover-glow'
                }`}
              >
                <ArrowRightLeft className="w-6 h-6" />
              </button>
            </div>

            <LanguageSelect
              value={toLanguage}
              onChange={setToLanguage}
              languages={targetLanguages}
              label="Язык перевода"
            />
          </div>

          {/* Translation Interface */}
          {mode === 'text' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <TextArea
                value={sourceText}
                onChange={setSourceText}
                placeholder="Введите текст для перевода..."
                label="Исходный текст"
              />
              
              <div className="relative">
                <TextArea
                  value={translatedText}
                  onChange={() => {}}
                  placeholder="Перевод появится здесь..."
                  label="Перевод"
                  readonly
                  loading={loading}
                />
                {translatedText && (
                  <button
                    onClick={() => handleCopyToClipboard(translatedText)}
                    className="absolute top-8 right-3 p-2 glass-border rounded-lg hover:bg-orange-400 hover:bg-opacity-20 text-orange-400 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 mb-8">
              <ImageUpload
                onImageSelect={handleImageTranslate}
                currentImage={currentImage}
                onClearImage={handleClearImage}
                loading={loading}
              />
              
              {(sourceText || translatedText) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TextArea
                    value={sourceText}
                    onChange={() => {}}
                    placeholder="Распознанный текст появится здесь..."
                    label="Распознанный текст"
                    readonly
                  />
                  
                  <div className="relative">
                    <TextArea
                      value={translatedText}
                      onChange={() => {}}
                      placeholder="Перевод появится здесь..."
                      label="Перевод"
                      readonly
                      loading={loading}
                    />
                    {translatedText && (
                      <button
                        onClick={() => handleCopyToClipboard(translatedText)}
                        className="absolute top-8 right-3 p-2 glass-border rounded-lg hover:bg-orange-400 hover:bg-opacity-20 text-orange-400 transition-all"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {mode === 'text' && (
              <button
                onClick={handleTextTranslate}
                disabled={loading || !sourceText.trim()}
                className="px-8 py-3 bg-gradient-to-r from-orange-400 to-orange-600 text-white rounded-lg hover:from-orange-500 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-glow"
              >
                {loading ? 'Переводим...' : 'Перевести'}
              </button>
            )}
            
            <button
              onClick={handleClearAll}
              className="px-6 py-3 glass-border text-gray-300 rounded-lg hover:bg-gray-700 hover:bg-opacity-50 transition-all hover-glow"
            >
              <RotateCcw className="w-4 h-4 mr-2 inline" />
              Очистить
            </button>
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-6 py-3 glass-border text-gray-300 rounded-lg hover:bg-gray-700 hover:bg-opacity-50 transition-all hover-glow"
            >
              <History className="w-4 h-4 mr-2 inline" />
              История
            </button>
          </div>

          {/* History */}
          {showHistory && history.length > 0 && (
            <div className="glass-border rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">История переводов</h3>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-400">
                  Всего переводов: {history.length}
                </span>
                <button
                  onClick={clearHistory}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Очистить историю
                </button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {history.map((item) => (
                  <div key={item.id} className="glass-border rounded-lg p-4 hover-glow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-orange-400">
                        {item.fromLanguage.toUpperCase()} → {item.toLanguage.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 mb-1">
                      <strong>Исходный:</strong> {item.sourceText}
                    </div>
                    <div className="text-sm text-white">
                      <strong>Перевод:</strong> {item.translatedText}
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(item.translatedText)}
                      className="mt-2 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Копировать перевод
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}

export default App;