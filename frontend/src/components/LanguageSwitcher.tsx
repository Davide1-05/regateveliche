import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

type LanguageCode = 'en' | 'it' | 'de' | 'fr' | 'es';

interface LanguageOption {
  code: LanguageCode;
  name: string;
  flagImage: string;
}

const LANGUAGES: Record<LanguageCode, LanguageOption> = {
  en: { code: 'en', name: 'English', flagImage: '/flags/us.svg' },
  it: { code: 'it', name: 'Italiano', flagImage: '/flags/it.svg' },
  de: { code: 'de', name: 'Deutsch', flagImage: '/flags/de.svg' },
  fr: { code: 'fr', name: 'Français', flagImage: '/flags/fr.svg' },
  es: { code: 'es', name: 'Español', flagImage: '/flags/es.svg' },
};

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES[i18n.language as LanguageCode] || LANGUAGES.en;

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    i18n.changeLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="language-switcher" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="language-switcher-button"
        aria-label={t('common.language')}
        title={t('common.language')}
      >
        <img src={currentLang.flagImage} alt={`${currentLang.name} flag`} className="language-flag" />
        <span className="language-name">{currentLang.name}</span>
        <svg
          className={`language-arrow ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          {Object.values(LANGUAGES).map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
            >
              <img src={lang.flagImage} alt={`${lang.name} flag`} className="language-flag" />
              <span>{lang.name}</span>
              {i18n.language === lang.code && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;