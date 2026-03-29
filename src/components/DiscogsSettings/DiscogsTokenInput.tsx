import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DiscogsTokenInputProps {
  consumerKey: string;
  consumerSecret: string;
  hasCredentials: boolean;
  isOAuthComplete: boolean;
  isOAuthLoading: boolean;
  onSaveCredentials: (consumerKey: string, consumerSecret: string) => void;
  onClearCredentials: () => void;
  onStartOAuth: () => void;
  onDisconnect: () => void;
}

export function DiscogsTokenInput({
  consumerKey,
  consumerSecret,
  hasCredentials,
  isOAuthComplete,
  isOAuthLoading,
  onSaveCredentials,
  onClearCredentials,
  onStartOAuth,
  onDisconnect,
}: DiscogsTokenInputProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [secretInput, setSecretInput] = useState('');

  const handleSave = () => {
    if (keyInput.trim() && secretInput.trim()) {
      onSaveCredentials(keyInput.trim(), secretInput.trim());
      setIsEditing(false);
      setKeyInput('');
      setSecretInput('');
    }
  };

  const handleEdit = () => {
    setKeyInput(consumerKey);
    setSecretInput(consumerSecret);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setKeyInput('');
    setSecretInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // STATE 1: Editing credentials
  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('discogs.consumerKeyPlaceholder')}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-56"
            autoFocus
          />
          <input
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('discogs.consumerSecretPlaceholder')}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-56"
          />
          <button
            onClick={handleSave}
            disabled={!keyInput.trim() || !secretInput.trim()}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('discogs.save')}
          </button>
          <button
            onClick={handleCancel}
            className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            {t('discogs.cancel')}
          </button>
        </div>
      </div>
    );
  }

  // STATE 2: Has credentials but not OAuth-connected
  if (hasCredentials && !isOAuthComplete) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-yellow-600 dark:text-yellow-400">
          {t('discogs.oauthRequired')}
        </span>
        <button
          onClick={onStartOAuth}
          disabled={isOAuthLoading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOAuthLoading
            ? t('discogs.oauthConnecting')
            : t('discogs.connectToDiscogs')}
        </button>
        <button
          onClick={handleEdit}
          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          {t('discogs.editCredentials')}
        </button>
        <button
          onClick={onClearCredentials}
          className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
        >
          {t('discogs.clearToken')}
        </button>
      </div>
    );
  }

  // STATE 3: Has credentials and OAuth-connected
  if (hasCredentials && isOAuthComplete) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-600 dark:text-green-400">
          {t('discogs.oauthConnected')}
        </span>
        <button
          onClick={handleEdit}
          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          {t('discogs.editCredentials')}
        </button>
        <button
          onClick={onDisconnect}
          disabled={isOAuthLoading}
          className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
        >
          {t('discogs.disconnectFromDiscogs')}
        </button>
        <button
          onClick={onClearCredentials}
          className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
        >
          {t('discogs.clearToken')}
        </button>
      </div>
    );
  }

  // STATE 4: No credentials
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsEditing(true)}
        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
      >
        {t('discogs.setCredentials')}
      </button>
    </div>
  );
}
