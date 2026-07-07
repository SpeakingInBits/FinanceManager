export type ThemeMode = 'system' | 'light' | 'dark';

export interface SettingEntry<V = unknown> {
  key: string;
  value: V;
}
