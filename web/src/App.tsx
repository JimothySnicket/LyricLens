import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Layout } from "./components/Layout";
import { Search } from "./pages/Search";
import { Visualizer } from "./pages/Visualizer";
import { HowItWorks } from "./pages/HowItWorks";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Search />} />
            <Route path="visualizer" element={<Visualizer />} />
            <Route path="how-it-works" element={<HowItWorks />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
