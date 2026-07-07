import { appStore } from '@/state/app-store';
import { DEFAULT_ROUTE, routes } from './routes';

function normalize(hash: string): string {
  const path = hash.replace(/^#/, '') || DEFAULT_ROUTE;
  return routes.some((r) => r.path === path) ? path : DEFAULT_ROUTE;
}

export function currentRoute(): string {
  return normalize(window.location.hash);
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function initRouter(): void {
  const apply = () => appStore.setState({ route: currentRoute() });
  window.addEventListener('hashchange', apply);
  apply();
}
