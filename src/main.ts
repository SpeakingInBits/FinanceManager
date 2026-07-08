import '@/styles/global.css';
import '@/components/register';
import { initRouter } from '@/router/router';
import { loadAllData, setThemeModeAction } from '@/state/actions';
import { appStore } from '@/state/app-store';

initRouter();
void loadAllData();

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (appStore.getState().themeMode === 'system') {
    void setThemeModeAction('system');
  }
});

if ('serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm('A new version is available. Reload now?')) {
          void updateSW(true);
        }
      },
    });
  });
}
