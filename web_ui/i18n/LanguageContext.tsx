import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en, TranslationSchema } from './locales/en';
import { am } from './locales/am';

type Locale = 'en' | 'am';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationSchema;
}

const translations: Record<Locale, TranslationSchema> = { en, am };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('legacy_keeper_locale');
    return (saved as Locale) || 'en';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('legacy_keeper_locale', newLocale);
  };

  const value = {
    locale,
    setLocale,
    t: translations[locale]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};