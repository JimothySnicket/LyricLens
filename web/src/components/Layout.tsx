import { Outlet } from "react-router";
import { Nav } from "./Nav";

export function Layout() {
  return (
    <div className="min-h-screen bg-(--color-bg)">
      <Nav />
      <main className="max-w-5xl mx-auto px-6">
        <Outlet />
      </main>
    </div>
  );
}
