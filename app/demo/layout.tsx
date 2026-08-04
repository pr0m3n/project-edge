import { DemoNoticeProvider } from "@/components/demo/DemoNotice";
import "./demo-bar.css";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoNoticeProvider>{children}</DemoNoticeProvider>;
}
