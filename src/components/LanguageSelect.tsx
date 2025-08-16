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
        className="w-full glass-border rounded-2xl p-4 text-white focus-orange border-0 appearance-none cursor-pointer hover-glow transition-all flex items-center justify-between group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-6 rounded-sm bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-xs font-bold shadow-lg border border-gray-500/30">
              {selectedLanguage?.flag || '🌐'}
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div className="text-left">
            <div className="font-semibold text-white group-hover:text-orange-100 transition-colors">{selectedLanguage?.name || 'Выберите язык'}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">{selectedLanguage?.code}</div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-orange-400 transition-all duration-300 group-hover:text-orange-300 ${isOpen ? 'rotate-180 scale-110' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 z-50 animate-slide-down">
          <div className="glass-border rounded-2xl shadow-2xl overflow-hidden max-h-80 border border-orange-400/20">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-600/50 bg-gradient-to-r from-gray-800/50 to-gray-700/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-400/70" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Поиск языка..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 rounded-xl border border-gray-600/30 focus:border-orange-400/50 transition-all"
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
                    className={`w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-orange-400/10 hover:to-purple-400/10 transition-all flex items-center space-x-3 group relative ${
                      value === lang.code ? 'bg-gradient-to-r from-orange-400/15 to-purple-400/15 border-r-2 border-orange-500' : ''
                    }`}
                  >
                    <div className="relative">
                      <div className="w-8 h-6 rounded-sm bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-xs font-bold shadow-lg border border-gray-500/30 group-hover:border-orange-400/50 transition-all group-hover:scale-110">
                        {lang.flag}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white group-hover:text-orange-100">
                        {lang.name}
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">
                        {lang.code}
                      </div>
                    </div>
                    {value === lang.code && (
                      <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full animate-pulse shadow-lg shadow-orange-400/50"></div>
                    )}
                    {value === lang.code && (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/5 to-purple-400/5 pointer-events-none"></div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-400 bg-gradient-to-br from-gray-800/30 to-gray-700/30">
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