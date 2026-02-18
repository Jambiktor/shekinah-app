import { SchoolTheme } from "./types";

export const DEFAULT_THEME: SchoolTheme = {
  id: "default",
  slug: "default",
  name: "Default School",
  short_name: "School",
  aliases: [],
  description: "Fallback theme used before the remote theme is fetched.",
  colors: {
    primary: "#1E6FB6",
    secondary: "#2F7CC0",
    accent: "#5E9FCA",
    background: "#F4F7FB",
    surface: "#FFFFFF",
    text: "#0F172A",
    border: "#E6E9EF",
  },
  logo_url: "",
  meta: {
    cta: "#1E6FB6",
  },
  module: {
    name: "app",
    theme_id: "modern-deep",
  },
  modules: {},
};
