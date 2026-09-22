import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'hi', name: 'हिंदी' },
];

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const dropdownRef = useRef(null);

  // Read current language from cookie on mount
  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    const googtrans = getCookie('googtrans');
    if (googtrans) {
      // googtrans looks like '/en/te'
      const langCode = googtrans.split('/')[2];
      if (langCode && LANGUAGES.find(l => l.code === langCode)) {
        setCurrentLang(langCode);
      }
    } else {
      // Default to English
      setCurrentLang('en');
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode) => {
    setCurrentLang(langCode);
    setIsOpen(false);
    
    // Set the google translate cookie
    // If English, we can clear the translation or set it to /en/en
    if (langCode === 'en') {
      document.cookie = 'googtrans=/en/en; path=/';
      document.cookie = 'googtrans=/en/en; domain=' + window.location.hostname + '; path=/';
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/`;
      document.cookie = `googtrans=/en/${langCode}; domain=` + window.location.hostname + '; path=/';
    }
    
    // Reload page to apply translation
    window.location.reload();
  };

  const selectedLanguage = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-sm font-medium transition-all shadow-sm"
        style={{
          // Inherit color safely so it looks good on both Login (dark) and Layout (light) pages
          color: 'inherit',
          backgroundColor: isOpen ? 'rgba(0,0,0,0.05)' : 'transparent',
          borderColor: 'rgba(0,0,0,0.1)'
        }}
        title="Change Language"
      >
        <Globe size={16} />
        <span className="hidden sm:inline-block max-w-[80px] truncate">{selectedLanguage.name}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-fade-in origin-top-right transform transition-all">
          <div className="py-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-primary/5 transition-colors flex items-center justify-between
                  ${currentLang === lang.code ? 'text-primary font-semibold bg-primary/5' : 'text-gray-700'}
                `}
              >
                {lang.name}
                {currentLang === lang.code && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
