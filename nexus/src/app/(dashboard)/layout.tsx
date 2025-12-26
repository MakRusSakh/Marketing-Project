import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900">Marketing Nexus</h1>
          </div>
          <nav className="px-4 space-y-1">
            {/* Navigation items will be added here */}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          <header className="bg-white border-b border-gray-200">
            <div className="px-8 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
                {/* User menu will be added here */}
              </div>
            </div>
          </header>
          <main className="p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
