import { AdminConsole } from "@/components/admin/console/AdminConsole";

/** Az admin konzol közös kerete: adatréteg, menü, értesítések. */
export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminConsole>{children}</AdminConsole>;
}
