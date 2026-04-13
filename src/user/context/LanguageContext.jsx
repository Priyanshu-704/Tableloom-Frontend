import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getCurrentLanguage,
  setCurrentLanguage,
  languages,
} from "../../common/utils/i18n";
const LanguageContext = createContext();
export function LanguageProvider({ children }) {
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  useEffect(() => {
    setCurrentLanguage(currentLang);
  }, [currentLang]);
  const switchLanguage = (languageCode) => {
    setCurrentLang(languageCode);
  };
  const value = {
    currentLang,
    switchLanguage,
    languages,
  };
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
