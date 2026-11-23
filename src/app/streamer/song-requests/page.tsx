import SongRequests from './SongRequests';

export default function SongRequestsPage() {
  return <SongRequests showDemo={process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development'} />;
}
