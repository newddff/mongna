export const metadata = {
 icons: { 
   icon: ' https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png',
 },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
