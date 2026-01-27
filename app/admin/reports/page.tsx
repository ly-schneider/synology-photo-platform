import { ReportsPage } from "@/components/admin/reports-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meldungen - Admin",
  robots: { index: false, follow: false },
};

export default function AdminReportsPage() {
  return <ReportsPage />;
}
