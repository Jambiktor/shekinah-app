export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  border: string;
};

export type ThemeModule = {
  name?: string;
  theme_id?: string;
  details?: Record<string, unknown> | null;
};

export type SchoolTheme = {
  id?: string;
  slug?: string;
  name?: string;
  short_name?: string;
  aliases?: string[];
  description?: string;
  logo_url?: string;
  colors: ThemeColors;
  module?: ThemeModule;
  modules?: Record<string, ThemeModule>;
  meta?: Record<string, unknown>;
  is_default?: boolean;
  resolved_school?: string;
};

export type ThemeRequestParams = {
  school?: string | null;
  module?: string | null;
  app?: string | null;
};

export type SchoolThemeResponse = SchoolTheme & {
  resolved_school?: string;
  module?: ThemeModule;
};
