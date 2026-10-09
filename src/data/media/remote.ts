import type { SupabaseClient } from "@supabase/supabase-js";
import { RemoteError } from "@/data/sync/remote";

/** What photo sync needs from the server: Supabase Storage in production, a fake in tests. */
export interface MediaRemote {
  /** Uploads (or replaces) a file. Throws RemoteError. */
  upload(path: string, file: Blob): Promise<void>;
  /** Deletes files (missing ones are fine). Throws RemoteError. */
  remove(paths: string[]): Promise<void>;
  /** The file, or null if it is not there (yet). Throws RemoteError on network problems. */
  download(path: string): Promise<Blob | null>;
}

export const MEDIA_BUCKET = "media";

function toRemoteError(error: { message: string; statusCode?: string | number; status?: number }): RemoteError {
  const status = Number(error.statusCode ?? error.status ?? 0);
  if (status === 401 || status === 403) return new RemoteError("auth", error.message);
  if (status >= 400 && status < 500) return new RemoteError("rejected", error.message);
  return new RemoteError("network", error.message);
}

/** The private "media" bucket; Storage policies keep every user inside their own folder. */
export class SupabaseMediaRemote implements MediaRemote {
  constructor(private readonly supabase: SupabaseClient) {}

  private get bucket() {
    return this.supabase.storage.from(MEDIA_BUCKET);
  }

  async upload(path: string, file: Blob): Promise<void> {
    const { error } = await this.bucket.upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (error) throw toRemoteError(error as never);
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await this.bucket.remove(paths);
    if (error) throw toRemoteError(error as never);
  }

  async download(path: string): Promise<Blob | null> {
    const { data, error } = await this.bucket.download(path);
    if (error) {
      const remote = toRemoteError(error as never);
      if (remote.kind === "rejected") return null;
      throw remote;
    }
    return data;
  }
}
