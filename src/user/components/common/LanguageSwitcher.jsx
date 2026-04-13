import React, { useState } from "react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
export function LanguageSwitcher() {
  const { currentLang, switchLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = languages.find((lang) => lang.code === currentLang);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 sm:w-auto sm:space-x-2 sm:rounded-lg"
      >
        <Globe className="h-4 w-4" />
        <span className="truncate text-sm font-medium">
          {currentLanguage?.nativeName}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  switchLanguage(language.code);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span>{language.nativeName}</span>
                  <span className="text-gray-400 text-xs">
                    ({language.name})
                  </span>
                </div>
                {currentLang === language.code && (
                  <Check className="h-4 w-4 text-primary-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
