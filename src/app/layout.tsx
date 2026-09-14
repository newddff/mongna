export const metadata = {
  icons: {
    icon: 'https://cdn-icons-png.flaticon.com/512/1823/1823321.png',
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
