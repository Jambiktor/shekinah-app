import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getEnvString } from "../config/env";
import { fetchSchoolTheme, getDefaultTheme } from "./service";
import { SchoolTheme, ThemeRequestParams } from "./types";

type ThemeContextValue = {
  theme: SchoolTheme;
  isLoading: boolean;
  refreshTheme: (params?: ThemeRequestParams) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: getDefaultTheme(),
  isLoading: false,
  refreshTheme: async () => {},
});

type Props = {
  children: React.ReactNode;
};

const ThemeProvider = ({ children }: Props) => {
  const [theme, setTheme] = useState<SchoolTheme>(getDefaultTheme());
  const [isLoading, setIsLoading] = useState(false);
  const defaultSchool = getEnvString("EXPO_PUBLIC_SCHOOL_SLUG") || undefined;
  const lastFetchKeyRef = useRef<string | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);

  const refreshTheme = useCallback(
    async (params: ThemeRequestParams = {}) => {
      const requestedSchool = params.school ?? defaultSchool;
      const requestedModule = params.module ?? params.app ?? undefined;
      const fetchKey = `${requestedSchool ?? "default"}|${requestedModule ?? "default"}`;

      // Deduplicate identical in-flight or repeated fetches (helps with React strict mode double-render).
      if (fetchKey === lastFetchKeyRef.current && inflightRef.current) {
        return inflightRef.current;
      }

      setIsLoading(true);
      // Mark the current fetch key immediately so a second call in the same tick
      // (e.g., StrictMode double-effect) reuses the in-flight promise instead of
      // starting another request.
      lastFetchKeyRef.current = fetchKey;
      const task = (async () => {
        try {
          console.log("[Theme] fetching theme", { school: requestedSchool, module: requestedModule });
          const result = await fetchSchoolTheme({
            school: requestedSchool,
            module: requestedModule,
          });
          console.log("[Theme] applied theme", {
            id: result.id,
            slug: result.slug,
            resolved_school: result.resolved_school,
            module: result.module?.theme_id,
          });
          setTheme(result);
        } catch (error) {
          console.warn("Failed to refresh theme", error);
        } finally {
          setIsLoading(false);
          inflightRef.current = null;
        }
      })();

      inflightRef.current = task;
      return task;
    },
    [defaultSchool]
  );

  useEffect(() => {
    refreshTheme().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isLoading,
      refreshTheme,
    }),
    [theme, isLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider;
