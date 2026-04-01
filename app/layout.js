import "./globals.css";
import Sidebar from "./Sidebar";

export const metadata = {
  title: "冠毅進銷存",
  description: "冠毅國際業務管理系統",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 print:ml-0">{children}</main>
      </body>
    </html>
  );
}
