import type { LocalDb, MediaFile } from "@/data/local/db";
import { RemoteError } from "@/data/sync/remote";
import type { Media } from "@/domain/schemas";
import type { MediaRemote } from "./remote";

export type PhotoVariant = "full" | "thumb";

/**
 * Moves photo files between the phone and Storage (the `media` rows travel with the normal
 * sync). Files are uploaded before the rows, so another phone seldom sees a row whose file is
 * not there yet; files of photos deleted here are removed from Storage, and other phones drop
 * their copies when the deletion reaches them. Downloads happen only when a photo is shown.
 */
export class MediaSync {
  private readonly downloads = new Map<string, Promise<Blob | null>>();

  constructor(
    private readonly db: LocalDb,
    private readonly remote: MediaRemote,
  ) {}

  /** Uploads the files of new photos. A file that fails stays pending for the next time. */
  async uploadPending(): Promise<number> {
    const pending = await this.db.media_files.where("uploaded").equals(0).toArray();
    let uploaded = 0;
    for (const file of pending) {
      const row = await this.db.media.get(file.id);
      if (!row || row.deleted_at) continue;
      try {
        if (file.full) await this.remote.upload(row.storage_path, file.full);
        if (file.thumb && row.thumb_path) await this.remote.upload(row.thumb_path, file.thumb);
        await this.db.media_files.update(file.id, { uploaded: 1 });
        uploaded += 1;
      } catch (error) {
        if (error instanceof RemoteError && error.kind !== "rejected") throw error;
        console.warn("Photo upload refused", error);
      }
    }
    return uploaded;
  }

  /** Deletes from Storage the files of photos deleted on this phone. */
  async removePending(): Promise<void> {
    const removals = await this.db.media_removals.toArray();
    if (removals.length === 0) return;
    const paths = removals.map((removal) => removal.path);
    await this.remote.remove(paths);
    await this.db.media_removals.bulkDelete(paths);
  }

  /** Drops the local copies of photos deleted on another phone. */
  async dropDeleted(): Promise<void> {
    const files = await this.db.media_files.toArray();
    const rows = await this.db.media.bulkGet(files.map((file) => file.id));
    const gone = files.filter((file, i) => {
      const row = rows[i];
      return row ? !!row.deleted_at : file.uploaded === 1;
    });
    if (gone.length > 0) await this.db.media_files.bulkDelete(gone.map((file) => file.id));
  }

  /** Before the rows go up: the files. */
  async beforeSync(): Promise<void> {
    await this.uploadPending();
    await this.removePending();
  }

  /** After new rows came down. */
  async afterSync(): Promise<void> {
    await this.dropDeleted();
  }

  /**
   * A photo's image: from the phone, or downloaded once and kept. Null while it cannot be had
   * (no connection, or the other phone has not uploaded it yet).
   */
  async blob(row: Media, variant: PhotoVariant): Promise<Blob | null> {
    const local = await this.db.media_files.get(row.id);
    const stored = local?.[variant];
    if (stored) return stored;
    const path = variant === "thumb" ? (row.thumb_path ?? row.storage_path) : row.storage_path;
    const key = `${row.id}:${variant}`;
    let download = this.downloads.get(key);
    if (!download) {
      download = this.fetch(row.id, path, variant).finally(() => this.downloads.delete(key));
      this.downloads.set(key, download);
    }
    return download;
  }

  private async fetch(id: string, path: string, variant: PhotoVariant): Promise<Blob | null> {
    try {
      const file = await this.remote.download(path);
      if (!file) return null;
      const current: MediaFile = (await this.db.media_files.get(id)) ?? { id, uploaded: 1 };
      await this.db.media_files.put({ ...current, [variant]: file });
      return file;
    } catch (error) {
      if (error instanceof RemoteError) return null;
      throw error;
    }
  }
}
