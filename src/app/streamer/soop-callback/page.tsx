// Keep the original callback usable while Developers/Vercel settings are migrated.
import SoopAuthCallback from '../../../components/SoopAuthCallback';
import { DEFAULT_SOOP_RETURN_TO } from '../../../lib/soop-auth-paths';
export default function LegacySoopCallbackPage() {
  return <SoopAuthCallback fallbackReturnTo={DEFAULT_SOOP_RETURN_TO} />;
}
