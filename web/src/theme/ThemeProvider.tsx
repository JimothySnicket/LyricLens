import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("lyriclens-theme") as Theme) || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("lyriclens-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "dark" : "dark"));

  return (
    <ThemeContext value={{ theme, toggle }}>
      {children}
    </ThemeContext>
  );
}

export const useTheme = () => useContext(ThemeContext);
