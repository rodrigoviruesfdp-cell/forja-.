"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Copy, Download, ImagePlus, Share } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Group, GroupRow } from "@/components/ui/group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { Media } from "@/domain/schemas";
import { Badge } from "@/features/achievements/badge";
import { usePhotoFormat, useWeightsOn } from "@/features/photos/use-photos";
import { useRoutineTree } from "@/features/routines/use-routines";
import { PageHeader } from "@/features/shell/page-header";
import { useUserData } from "@/features/user-data/user-data-context";
import {
  canvasBlob,
  loadPhoto,
  type Photo,
  renderAchievement,
  renderRoutine,
  renderSession,
  renderTransformation,
  svgToImage,
  type Template,
  type TransformationCard,
} from "./render";
import { useAchievementCard, useRoutineCard, useSessionShare } from "./use-share-content";

/** /share?session=…, ?routine=…, ?achievement=… or ?transformation=<before>,<after> */
export function ShareScreen() {
  const params = useSearchParams();
  const sessionId = params.get("session");
  const routineId = params.get("routine");
  const achievementKey = params.get("achievement");
  const transformation = params.get("transformation");
  if (sessionId) return <SessionShareScreen sessionId={sessionId} />;
  if (transformation) return <TransformationShareScreen ids={transformation.split(",")} />;
  if (achievementKey) return <AchievementShareScreen achievementKey={achievementKey} />;
  return <RoutineShareScreen routineId={routineId} />;
}

function Loading() {
  return (
    <div className="flex justify-center p-10">
      <Spinner />
    </div>
  );
}

function NotFound() {
  const t = useTranslations("share");
  return (
    <>
      <PageHeader title={t("title")} backFallback="/today" hideProfile compact />
      <p className="px-4 pt-2 text-muted-foreground">{t("notFound")}</p>
    </>
  );
}

interface Rendered {
  url: string;
  blob: Blob;
  canvas: HTMLCanvasElement;
}

/**
 * Renders `draw()` whenever `key` changes and keeps the latest image ready, so "Share" can
 * hand it to the phone straight from the tap (iOS only allows sharing right after a tap).
 */
function useRendered(draw: (() => HTMLCanvasElement) | null, type: "image/jpeg" | "image/png", key: string): Rendered | null {
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const produce = useEffectEvent(() => (draw ? draw() : null));

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    void (async () => {
      await document.fonts?.ready;
      const canvas = produce();
      if (!canvas || cancelled) return;
      const blob = await canvasBlob(canvas, type);
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setRendered({ url, blob, canvas });
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key, type]);

  return rendered;
}

/** Photo / Plain / Sticker, and the photo you pick for the first one. */
function useTemplatePicker() {
  const t = useTranslations("share");
  const [template, setTemplate] = useState<Template>("plain");
  const [photo, setPhoto] = useState<{ photo: Photo; release: () => void; id: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => photo?.release(), [photo]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const loaded = await loadPhoto(file);
      setPhoto({ ...loaded, id: Date.now() });
      setTemplate("photo");
    } catch {
      toast.error(t("photoError"));
    }
  }

  const rows = (
    <>
      <GroupRow className="py-3">
        <SegmentedControl<Template>
          aria-label={t("style")}
          value={template}
          options={(["photo", "plain", "sticker"] as const).map((value) => ({ value, label: t(`templates.${value}`) }))}
          onValueChange={(next) => {
            setTemplate(next);
            if (next === "photo" && !photo) input.current?.click();
          }}
        />
      </GroupRow>
      {template === "photo" ? (
        <GroupRow className="py-1">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-11 w-full cursor-pointer items-center gap-3 text-left font-medium text-planned"
          >
            <ImagePlus className="size-5" strokeWidth={2.2} />
            {photo ? t("changePhoto") : t("choosePhoto")}
          </button>
        </GroupRow>
      ) : null}
    </>
  );

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      // Opened by the Photo segment and the "Choose a photo" row; hidden from screen readers.
      aria-hidden
      tabIndex={-1}
      className="sr-only"
      onChange={(e) => {
        void pickPhoto(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  return { template, photo: photo?.photo ?? null, photoId: photo?.id ?? 0, rows, fileInput };
}

function SessionShareScreen({ sessionId }: { sessionId: string }) {
  const t = useTranslations("share");
  const share = useSessionShare(sessionId);
  const picker = useTemplatePicker();
  const [showPlace, setShowPlace] = useState(true);
  const { template } = picker;

  const card = share ? share.card(showPlace) : null;
  const type = template === "sticker" ? "image/png" : "image/jpeg";
  const rendered = useRendered(
    card ? () => renderSession(card, template, picker.photo) : null,
    type,
    `${JSON.stringify(card)}|${template}|${picker.photoId}`,
  );

  if (share === undefined) return <Loading />;
  if (share === null) return <NotFound />;

  return (
    <ShareLayout
      preview={rendered}
      sticker={template === "sticker"}
      stickerShape="wide"
      fileName={`${share.fileName}${template === "sticker" ? "-pegatina.png" : ".jpg"}`}
      controls={
        <>
          <Group>
            {picker.rows}
            {share.placeName ? (
              <GroupRow>
                <label htmlFor="share-place" className="flex-1">
                  {t("showPlace")}
                </label>
                <Switch id="share-place" checked={showPlace} onCheckedChange={setShowPlace} />
              </GroupRow>
            ) : null}
          </Group>
          {picker.fileInput}
        </>
      }
    />
  );
}

function AchievementShareScreen({ achievementKey }: { achievementKey: string }) {
  const t = useTranslations("share");
  const card = useAchievementCard(achievementKey);
  const picker = useTemplatePicker();
  const { template } = picker;
  const svg = useRef<SVGSVGElement>(null);
  const [badge, setBadge] = useState<{ image: HTMLImageElement; key: string } | null>(null);
  const badgeKey = card ? `${card.icon}|${card.tone}` : "";

  useEffect(() => {
    if (!svg.current || !badgeKey) return;
    let cancelled = false;
    void svgToImage(svg.current, 640).then((image) => {
      if (!cancelled) setBadge({ image, key: badgeKey });
    });
    return () => {
      cancelled = true;
    };
  }, [badgeKey]);

  const ready = card && badge?.key === badgeKey ? badge.image : null;
  const rendered = useRendered(
    card && ready ? () => renderAchievement(card.card, template, picker.photo, ready) : null,
    template === "sticker" ? "image/png" : "image/jpeg",
    `${JSON.stringify(card?.card ?? null)}|${template}|${picker.photoId}|${ready ? badgeKey : ""}`,
  );

  if (card === undefined) return <Loading />;
  if (card === null) return <NotFound />;

  return (
    <ShareLayout
      preview={rendered}
      sticker={template === "sticker"}
      stickerShape="square"
      fileName={`forja-logro-${achievementKey.replace(/_/g, "-")}${template === "sticker" ? "-pegatina.png" : ".jpg"}`}
      controls={
        <>
          <Group>{picker.rows}</Group>
          {picker.fileInput}
          {/* The medal, drawn once here to become part of the image. */}
          <div aria-hidden className="pointer-events-none fixed -left-[9999px] size-[100px] opacity-0">
            <Badge svgRef={svg} icon={card.icon} tone={card.tone} />
          </div>
        </>
      }
      hint={template === "sticker" ? t("hintSticker") : t("hintStory")}
    />
  );
}

function TransformationShareScreen({ ids }: { ids: string[] }) {
  const t = useTranslations("share");
  const tPhotos = useTranslations("photos");
  const fmt = usePhotoFormat();
  const { db, media } = useUserData();
  const [showWeight, setShowWeight] = useState(true);
  const [images, setImages] = useState<{ key: string; photos: Photo[] } | null | undefined>(undefined);
  const rows = useLiveQuery(async () => {
    const found = await db.media.bulkGet(ids);
    return found.every((row) => row && !row.deleted_at) && found.length === 2 ? (found as Media[]) : null;
  }, [db, ids.join(",")]);
  const weights = useWeightsOn(rows ? rows.map((row) => row.taken_at) : []);
  const key = rows ? rows.map((row) => row.id).join(",") : "";

  useEffect(() => {
    if (!rows) return;
    let cancelled = false;
    const releases: (() => void)[] = [];
    void (async () => {
      const blobs = await Promise.all(rows.map((row) => media.blob(row, "full")));
      if (blobs.some((blob) => !blob)) {
        if (!cancelled) setImages(null);
        return;
      }
      const loaded = await Promise.all(blobs.map((blob) => loadPhoto(blob as Blob)));
      releases.push(...loaded.map((item) => item.release));
      if (!cancelled) setImages({ key, photos: loaded.map((item) => item.photo) });
    })();
    return () => {
      cancelled = true;
      for (const release of releases) release();
    };
  }, [rows, media, key]);

  const [before, after] = rows ?? [];
  const change = before && after && weights.get(before.taken_at) && weights.get(after.taken_at)
    ? (weights.get(after.taken_at) as number) - (weights.get(before.taken_at) as number)
    : null;
  const card: TransformationCard | null =
    before && after
      ? {
          before: { label: tPhotos("before"), date: fmt.date(before.taken_at) },
          after: { label: tPhotos("after"), date: fmt.date(after.taken_at) },
          headline: fmt.between(before.taken_at, after.taken_at),
          detail: showWeight && change !== null ? tPhotos("weightChange", { value: fmt.weightDelta(change) }) : null,
        }
      : null;
  const ready = images && images.key === key ? images.photos : null;
  const rendered = useRendered(
    card && ready ? () => renderTransformation(card, ready[0] as Photo, ready[1] as Photo) : null,
    "image/jpeg",
    `${JSON.stringify(card)}|${ready ? key : ""}`,
  );

  if (rows === undefined) return <Loading />;
  if (rows === null || images === null) return <NotFound />;

  return (
    <ShareLayout
      preview={rendered}
      sticker={false}
      fileName="forja-transformacion.jpg"
      hint={t("hintTransformation")}
      controls={
        change !== null ? (
          <Group>
            <GroupRow>
              <label htmlFor="share-weight" className="flex-1">
                {t("showWeight")}
              </label>
              <Switch id="share-weight" checked={showWeight} onCheckedChange={setShowWeight} />
            </GroupRow>
          </Group>
        ) : null
      }
    />
  );
}

function RoutineShareScreen({ routineId }: { routineId: string | null }) {
  const tree = useRoutineTree(routineId);
  const card = useRoutineCard(tree);
  const rendered = useRendered(card ? () => renderRoutine(card) : null, "image/jpeg", JSON.stringify(card ?? null, (_, v) => (typeof v === "function" ? undefined : v)));
  if (tree === undefined) return <Loading />;
  if (!tree || !card) return <NotFound />;
  return <ShareLayout preview={rendered} sticker={false} fileName="forja-rutina.jpg" controls={null} />;
}

/** Preview on top, options in the middle, actions within thumb reach. */
function ShareLayout({
  preview,
  sticker,
  stickerShape = "wide",
  fileName,
  controls,
  hint,
}: {
  preview: Rendered | null;
  sticker: boolean;
  /** The sticker of a session is wide (3:2); an achievement's is square. */
  stickerShape?: "wide" | "square";
  fileName: string;
  controls: ReactNode;
  hint?: string;
}) {
  const t = useTranslations("share");
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    preview !== null &&
    navigator.canShare({ files: [new File([preview.blob], fileName, { type: preview.blob.type })] });

  function save() {
    if (!preview) return;
    const link = document.createElement("a");
    link.href = preview.url;
    link.download = fileName;
    link.click();
  }

  async function shareImage() {
    if (!preview) return;
    if (!canShareFiles) {
      save();
      return;
    }
    try {
      await navigator.share({ files: [new File([preview.blob], fileName, { type: preview.blob.type })] });
    } catch (error) {
      // Closing the share sheet is not an error; anything else falls back to saving.
      if ((error as Error).name !== "AbortError") save();
    }
  }

  function copySticker() {
    if (!preview) return;
    try {
      // Safari only copies images inside the tap itself: hand it the image as a promise.
      const item = new ClipboardItem({ "image/png": canvasBlob(preview.canvas, "image/png") });
      navigator.clipboard.write([item]).then(
        () => toast.success(t("copied")),
        () => toast.error(t("copyFailed")),
      );
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <>
      <PageHeader title={t("title")} backFallback="/today" hideProfile compact />
      <div className="flex flex-col gap-5 px-4 pb-6">
        <div className="flex justify-center">
          <div
            className={
              sticker
                ? "flex aspect-[9/16] h-[52dvh] items-center justify-center overflow-hidden rounded-[22px] border bg-[repeating-conic-gradient(#3a3a3c_0_25%,#2c2c2e_0_50%)] bg-[length:24px_24px] shadow-card"
                : "aspect-[9/16] h-[52dvh] overflow-hidden rounded-[22px] border bg-surface-2 shadow-card"
            }
          >
            {preview ? (
              // A blob URL made on the phone: no optimisation to do.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={t("preview")}
                className={sticker ? (stickerShape === "square" ? "w-full p-4" : "w-full") : "size-full object-cover"}
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Spinner />
              </div>
            )}
          </div>
        </div>

        {controls}

        <div className="flex flex-col gap-2">
          <Button size="lg" className="w-full" disabled={!preview} onClick={() => void shareImage()}>
            <Share />
            {t("share")}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!preview} onClick={save} className={sticker ? "" : "col-span-2"}>
              <Download />
              {t("save")}
            </Button>
            {sticker ? (
              <Button variant="secondary" disabled={!preview} onClick={copySticker}>
                <Copy />
                {t("copySticker")}
              </Button>
            ) : null}
          </div>
        </div>
        <p className="px-1 text-footnote text-muted-foreground">
          {hint ?? (sticker ? t("hintSticker") : t("hintStory"))} {t("privacy")}
        </p>
      </div>
    </>
  );
}
