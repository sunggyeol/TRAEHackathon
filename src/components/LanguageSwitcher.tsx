'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="language-switcher">
      <button
        className={`lang-btn ${locale === 'ko' ? 'lang-btn--active' : ''}`}
        onClick={() => setLocale('ko')}
      >
        KO
      </button>
      <button
        className={`lang-btn ${locale === 'en' ? 'lang-btn--active' : ''}`}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
    </div>
  );
}
