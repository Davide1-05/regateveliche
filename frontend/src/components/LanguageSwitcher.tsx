import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES[i18n.language as LanguageCode] || LANGUAGES.en;

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  // Chiudi cliccando fuori dal menu o dal pulsante
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const handleLanguageChange = (lang: LanguageCode) => {
    i18n.changeLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="language-switcher">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
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

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="language-dropdown"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            right: `${coords.right}px`,
            zIndex: 2147483647, // Max safe integer for z-index - always on top
            backgroundColor: '#0f172a',
            minWidth: '150px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
            padding: '4px',
          }}
        >
          {Object.values(LANGUAGES).map((lang) => (
            <button
              key={lang.code}
              type="button"
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default LanguageSwitcher;