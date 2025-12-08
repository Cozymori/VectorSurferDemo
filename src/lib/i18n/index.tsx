/**
 * i18n Internationalization System
 * 
 * Simple context-based internationalization for Korean, English, Japanese.
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

// Import translations
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

// Supported languages
export const LANGUAGES = {
    ko: { code: 'ko', name: '한국어', flag: '🇰🇷' },
    en: { code: 'en', name: 'English', flag: '🇺🇸' },
    ja: { code: 'ja', name: '日本語', flag: '🇯🇵' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Translation type
type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

const translations: Record<LanguageCode, Translations> = {
    ko,
    en,
    ja,
};

// Context type
interface I18nContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: string, fallback?: string) => string;
}

// Create context
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Get nested value from object by dot notation
function getNestedValue(obj: Translations, path: string): string | undefined {
    const keys = path.split('.');
    let current: TranslationValue = obj;

    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = (current as { [key: string]: TranslationValue })[key];
        } else {
            return undefined;
        }
    }

    return typeof current === 'string' ? current : undefined;
}

// Provider component
interface I18nProviderProps {
    children: ReactNode;
    defaultLanguage?: LanguageCode;
}

export function I18nProvider({ children, defaultLanguage = 'ko' }: I18nProviderProps) {
    const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage);

    // Load saved language on mount
    useEffect(() => {
        const saved = localStorage.getItem('language') as LanguageCode | null;
        if (saved && saved in LANGUAGES) {
            setLanguageState(saved);
        }
    }, []);

    // Set language with persistence
    const setLanguage = useCallback((lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);

        // Update HTML lang attribute
        document.documentElement.lang = lang;
    }, []);

    // Translation function
    const t = useCallback((key: string, fallback?: string): string => {
        const translation = getNestedValue(translations[language], key);
        if (translation) return translation;

        // Try fallback to English
        if (language !== 'en') {
            const enTranslation = getNestedValue(translations.en, key);
            if (enTranslation) return enTranslation;
        }

        // Return fallback or key
        return fallback || key;
    }, [language]);

    return (
        <I18nContext.Provider value= {{ language, setLanguage, t }
}>
    { children }
    </I18nContext.Provider>
  );
}

// Hook to use i18n
export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    return context;
}

// Hook for just the translation function (optimized)
export function useT() {
    const { t } = useTranslation();
    return t;
}
