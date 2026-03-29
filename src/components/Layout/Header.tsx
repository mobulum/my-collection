import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-30">
      <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('app.title')}
        </h1>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
