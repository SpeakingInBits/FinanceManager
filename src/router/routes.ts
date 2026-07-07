export interface RouteDef {
  path: string;
  tag: string;
  label: string;
  icon: string;
}

export const routes: RouteDef[] = [
  { path: '/dashboard', tag: 'dashboard-view', label: 'Dashboard', icon: 'home' },
  { path: '/transactions', tag: 'transactions-view', label: 'Transactions', icon: 'list' },
  { path: '/categories', tag: 'categories-view', label: 'Categories', icon: 'tag' },
  { path: '/budgets', tag: 'budgets-view', label: 'Budgets', icon: 'wallet' },
  { path: '/charts', tag: 'charts-view', label: 'Charts', icon: 'chart' },
];

export const DEFAULT_ROUTE = routes[0]!.path;
