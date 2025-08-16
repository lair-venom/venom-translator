import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Globe } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  languages: Language[];
  label: string;
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({
  value,
  onChange,
  languages,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedLanguage = languages.find(lang => lang.code === value);
  
  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (langCode: string) => {
    onChange(langCode);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      
      {/* Selected Language Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full glass-border rounded-lg p-4 text-white focus-orange border-0 appearance-none cursor-pointer hover-glow transition-all flex items-center justify-between group relative overflow-hidden"
      >
        <div className="text-left">
          <div className="font-medium text-white group-hover:text-orange-100 transition-colors">
            {selectedLanguage?.name || 'Выберите язык'}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {selectedLanguage?.code}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-orange-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 z-50 animate-slide-down">
          <div className="glass-border rounded-lg shadow-2xl overflow-hidden max-h-80">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-700/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Поиск языка..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400/50 rounded-lg border border-gray-600/30 focus:border-orange-400/50 transition-all"
                />
              </div>
            </div>

            {/* Language List */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700/30 transition-all flex items-center justify-between group relative ${
                      value === lang.code ? 'bg-gray-700/50 border-r-2 border-orange-500' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-white group-hover:text-orange-100 transition-colors">
                        {lang.name}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">
                        {lang.code}
                      </div>
                    </div>
                    {value === lang.code && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-400">
                  <Globe className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p>Язык не найден</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};