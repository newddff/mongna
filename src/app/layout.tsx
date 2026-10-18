import './globals.css';
import { SecondaryPageNavigation } from '../components/SiteNavigation';

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
      <head><link rel="stylesheet" href="/fan-theme.css" /></head>
      <body><SecondaryPageNavigation />{children}</body>
    </html>
  )
}
