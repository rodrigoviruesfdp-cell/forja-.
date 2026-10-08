"use client";

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
import { useRoutineTree } from "@/features/routines/use-routines";
import { PageHeader } from "@/features/shell/page-header";
import { canvasBlob, loadPhoto, type Photo, renderRoutine, renderSession, type Template } from "./render";
import { useRoutineCard, useSessionShare } from "./use-share-content";

/** /share?session=… or /share?routine=… */
export function ShareScreen() {
  const params = useSearchParams();
  const sessionId = params.get("session");
  const routineId = params.get("routine");
  return sessionId ? <SessionShareScreen sessionId={sessionId} /> : <RoutineShareScreen routineId={routineId} />;
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

function SessionShareScreen({ sessionId }: { sessionId: string }) {
  const t = useTranslations("share");
  const share = useSessionShare(sessionId);
  const [template, setTemplate] = useState<Template>("plain");
  const [photo, setPhoto] = useState<{ photo: Photo; release: () => void; id: number } | null>(null);
  const [showPlace, setShowPlace] = useState(true);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => photo?.release(), [photo]);

  const card = share ? share.card(showPlace) : null;
  const type = template === "sticker" ? "image/png" : "image/jpeg";
  const rendered = useRendered(
    card ? () => renderSession(card, template, photo?.photo ?? null) : null,
    type,
    `${JSON.stringify(card)}|${template}|${photo?.id ?? 0}`,
  );

  if (share === undefined) return <Loading />;
  if (share === null) return <NotFound />;

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

  return (
    <ShareLayout
      preview={rendered}
      sticker={template === "sticker"}
      fileName={`${share.fileName}${template === "sticker" ? "-pegatina.png" : ".jpg"}`}
      controls={
        <>
          <Group>
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
            {share.placeName ? (
              <GroupRow>
                <label htmlFor="share-place" className="flex-1">
                  {t("showPlace")}
                </label>
                <Switch id="share-place" checked={showPlace} onCheckedChange={setShowPlace} />
              </GroupRow>
            ) : null}
          </Group>
          <input
            ref={input}
            type="file"
            accept="image/*"
            aria-label={t("choosePhoto")}
            className="sr-only"
            onChange={(e) => {
              void pickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
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
  return <ShareLayout preview={rendered} sticker={false} fileName={`forja-rutina.jpg`} controls={null} />;
}

/** Preview on top, options in the middle, actions within thumb reach. */
function ShareLayout({
  preview,
  sticker,
  fileName,
  controls,
}: {
  preview: Rendered | null;
  sticker: boolean;
  fileName: string;
  controls: ReactNode;
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
              <img src={preview.url} alt={t("preview")} className={sticker ? "w-full" : "size-full object-cover"} />
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
          {sticker ? t("hintSticker") : t("hintStory")} {t("privacy")}
        </p>
      </div>
    </>
  );
}
