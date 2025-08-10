import React from 'react';
import { ChevronDown } from 'lucide-react';

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
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full glass rounded-lg p-3 pr-10 text-white focus-orange border-0 appearance-none cursor-pointer hover-glow transition-all"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-gray-800">
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
};