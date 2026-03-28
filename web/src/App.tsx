import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Layout } from "./components/Layout";
import { Main } from "./pages/Main";
import { DeepDive } from "./pages/DeepDive";
import { Visualizer } from "./pages/Visualizer";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Main />} />
            <Route path="deep-dive" element={<DeepDive />} />
            <Route path="visualizer" element={<Visualizer />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
