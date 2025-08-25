import { useState, useEffect, createContext, useContext } from 'react';
import en from '../translations/en.json';
import fr from '../translations/fr.json';
import es from '../translations/es.json';

const translations = {
  en,
  fr,
  es,
};

const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Load language from localStorage, default to 'en'
    try {
      return localStorage.getItem('kolori_language') || 'en';
    } catch {
      return 'en';
    }
  });

  // Save language to localStorage whenever it changes
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    try {
      localStorage.setItem('kolori_language', newLanguage);
    } catch {
      // Handle localStorage errors silently
    }
  };

  const t = (key, replacements = {}) => {
    let translation = translations[language][key] || key;
    Object.keys(replacements).forEach(placeholder => {
      // Handle both {placeholder} and @@placeholder@@ patterns
      translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
      translation = translation.replace(`@@${placeholder}@@`, replacements[placeholder]);
    });
    return translation;
  };

  return (
    <TranslationContext.Provider value={{ t, setLanguage: handleLanguageChange, language }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslations = () => useContext(TranslationContext);
