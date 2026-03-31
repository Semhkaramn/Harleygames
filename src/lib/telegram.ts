// Telegram WebApp types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  close: () => void;
  expand: () => void;
  ready: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  sendData: (data: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// Get Telegram WebApp instance
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

// Get current Telegram user
export function getTelegramUser(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  return webApp?.initDataUnsafe?.user || null;
}

// Check if running inside Telegram
export function isInTelegram(): boolean {
  const webApp = getTelegramWebApp();
  return !!webApp?.initData;
}

// Initialize Telegram WebApp
export function initTelegramWebApp(): TelegramWebApp | null {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor('#0a0a0a');
    webApp.setBackgroundColor('#0a0a0a');
    webApp.enableClosingConfirmation();
  }
  return webApp;
}

// Haptic feedback
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') {
  const webApp = getTelegramWebApp();
  if (!webApp?.HapticFeedback) return;

  switch (type) {
    case 'light':
    case 'medium':
    case 'heavy':
      webApp.HapticFeedback.impactOccurred(type);
      break;
    case 'success':
    case 'error':
    case 'warning':
      webApp.HapticFeedback.notificationOccurred(type);
      break;
    case 'selection':
      webApp.HapticFeedback.selectionChanged();
      break;
  }
}

// Show popup
export function showTelegramPopup(message: string, title?: string): Promise<void> {
  return new Promise((resolve) => {
    const webApp = getTelegramWebApp();
    if (webApp) {
      webApp.showPopup({ title, message, buttons: [{ type: 'ok' }] }, () => resolve());
    } else {
      alert(message);
      resolve();
    }
  });
}

// Show confirm dialog
export function showTelegramConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const webApp = getTelegramWebApp();
    if (webApp) {
      webApp.showConfirm(message, (confirmed) => resolve(confirmed));
    } else {
      resolve(confirm(message));
    }
  });
}

// Get initData for verification
export function getInitData(): string {
  const webApp = getTelegramWebApp();
  return webApp?.initData || '';
}

// Mock user for development
export function getMockUser(): TelegramUser {
  return {
    id: 123456789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'tr',
  };
}
