import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: next });
        applyTheme(next);
      },
    }),
    {
      name: 'cdc-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

/** Inline script (stringified) injected into <head> to set the theme class
 *  BEFORE React hydrates, preventing flash of wrong theme. */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var s = localStorage.getItem('cdc-theme');
    var t = s ? JSON.parse(s).state?.theme : null;
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`.trim();
