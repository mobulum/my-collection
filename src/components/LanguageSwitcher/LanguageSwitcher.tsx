import { useTranslation } from 'react-i18next';

const LANGUAGES = ['en', 'pl'] as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`px-2 py-1 text-sm rounded transition-colors cursor-pointer ${
            i18n.language === lng
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
          aria-label={t(`language.${lng}`)}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
