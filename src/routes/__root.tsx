import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
    </>
  ),
  notFoundComponent: () => {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
          <div className="mt-6">
            <a href="/" className="inline-flex items-center justify-center rounded-md bg-[#7aa2f7] px-4 py-2 text-sm font-medium text-[#0a0f18] transition-colors">
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  },
});
