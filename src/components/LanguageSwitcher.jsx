import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'mr', name: 'मराठी' },
  { code: 'ta', name: 'தமிழ்' }
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 glass-button py-2 px-4 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 transition-all text-sm font-medium"
        >
          <Globe className="w-4 h-4 text-blue-400" />
          {currentLang.name}
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 glass-panel border border-slate-700/50 shadow-2xl rounded-xl overflow-hidden py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  i18n.language === lang.code 
                    ? 'bg-blue-600/30 text-blue-400' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
