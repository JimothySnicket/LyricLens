import { Outlet } from "react-router";
import { Nav } from "./Nav";

export function Layout() {
  return (
    <div className="min-h-screen bg-(--color-bg)">
      <Nav />
      <Outlet />
    </div>
  );
}
