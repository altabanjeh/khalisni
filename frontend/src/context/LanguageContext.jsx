/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import {
  getDirectionForLanguage,
  getInitialLanguage,
  getLocaleForLanguage,
  isRtlLanguage,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
} from '../utils/i18n'

const defaultLanguageContext = {
  language: 'ar',
  locale: 'ar-JO',
  direction: 'rtl',
  isArabic: true,
  setLanguage: () => {},
}

const LanguageContext = createContext(defaultLanguageContext)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  useEffect(() => {
    const normalizedLanguage = normalizeLanguage(language)
    document.documentElement.lang = normalizedLanguage
    document.documentElement.dir = getDirectionForLanguage(normalizedLanguage)
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage)
  }, [language])

  function setLanguage(nextLanguage) {
    setLanguageState(normalizeLanguage(nextLanguage))
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        locale: getLocaleForLanguage(language),
        direction: getDirectionForLanguage(language),
        isArabic: isRtlLanguage(language),
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
