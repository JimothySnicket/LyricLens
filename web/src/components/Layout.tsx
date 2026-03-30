import { Outlet, useLocation } from "react-router";
import { Nav } from "./Nav";

export function Layout() {
  const { pathname } = useLocation();
  const isMain = pathname === "/";

  return (
    <>
      {!isMain && <Nav />}
      <main>
        <Outlet />
      </main>
      {!isMain && (
        <footer className="border-t border-(--color-border-subtle) py-6 px-6 text-center text-xs text-(--color-text-tertiary)">
          <span>Jamie Donaldson</span>
          <span className="mx-2">&middot;</span>
          <a
            href="mailto:jamie.e.donaldson@gmail.com"
            className="hover:text-(--color-text) transition-colors"
          >
            jamie.e.donaldson@gmail.com
          </a>
          <span className="mx-2">&middot;</span>
          <a
            href="https://github.com/JimothySnicket"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-(--color-text) transition-colors"
          >
            GitHub
          </a>
        </footer>
      )}
    </>
  );
}
