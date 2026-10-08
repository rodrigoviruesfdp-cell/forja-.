import { Wordmark } from "./wordmark";

/** First frame (also the static HTML the service worker caches). */
export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Wordmark className="text-large-title" />
    </div>
  );
}
