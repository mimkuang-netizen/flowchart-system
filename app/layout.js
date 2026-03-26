import "./globals.css";

export const metadata = {
  title: "業務流程圖",
  description: "冠毅國際業務管理系統",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
