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
        className="w-full glass-border rounded-xl p-4 text-white focus-orange border-0 appearance-none cursor-pointer hover-glow transition-all flex items-center justify-between group"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{selectedLanguage?.flag || '🌐'}</span>
          <div className="text-left">
            <div className="font-medium">{selectedLanguage?.name || 'Выберите язык'}</div>
            <div className="text-xs text-gray-400 uppercase">{selectedLanguage?.code}</div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-orange-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 animate-slide-down">
          <div className="glass-border rounded-xl shadow-2xl overflow-hidden max-h-80">
            {/* Search Input */}
            <div className="p-3 border-b border-orange-400 border-opacity-20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Поиск языка..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-transparent text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 rounded-lg"
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
                    className={`w-full px-4 py-3 text-left hover:bg-orange-400 hover:bg-opacity-10 transition-all flex items-center space-x-3 group ${
                      value === lang.code ? 'bg-orange-400 bg-opacity-20 border-r-2 border-orange-400' : ''
                    }`}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {lang.flag}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-white group-hover:text-orange-100">
                        {lang.name}
                      </div>
                      <div className="text-xs text-gray-400 uppercase">
                        {lang.code}
                      </div>
                    </div>
                    {value === lang.code && (
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-400">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
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