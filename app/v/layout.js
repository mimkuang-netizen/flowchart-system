/**
 * 公開分享頁的 layout — 覆寫 root layout 的 metadata
 * 不要讓客戶在瀏覽器分頁看到「冠毅進銷存」這個系統名
 */
export const metadata = {
  title: "文件預覽",
  description: "",
}

export default function PublicShareLayout({ children }) {
  return children
}
