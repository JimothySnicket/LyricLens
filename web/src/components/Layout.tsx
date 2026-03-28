import { Outlet, useLocation } from "react-router";
import { Nav } from "./Nav";

export function Layout() {
  const { pathname } = useLocation();
  const isMain = pathname === "/";

  return (
    <>
      {!isMain && <Nav />}
      <Outlet />
    </>
  );
}
