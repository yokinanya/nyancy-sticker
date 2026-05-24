"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import { uploadCharacterBackgroundAction } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import { Button, Modal } from "@/components/ui/heroui-compat";

const BACKGROUND_CROP_WIDTH = 1200;
const BACKGROUND_CROP_HEIGHT = 514;
const BACKGROUND_CROP_ASPECT = BACKGROUND_CROP_WIDTH / BACKGROUND_CROP_HEIGHT;
const BACKGROUND_CROP_QUALITY = 0.86;

interface CropDraft {
  file: File;
  url: string;
}

interface Props {
  characterId: string;
  feedback: ReturnType<typeof useFeedback>;
  isUploading: boolean;
  onUploaded: (url: string) => void;
  setUploading: (value: boolean) => void;
}

export function CharacterBackgroundUpload(props: Props) {
  const [draft, setDraft] = useState<CropDraft | null>(null);

  useEffect(() => () => revokeDraftUrl(draft), [draft]);

  const selectFile = (file: File) => {
    revokeDraftUrl(draft);
    setDraft({ file, url: URL.createObjectURL(file) });
  };

  return (
    <div className="grid gap-1">
      <label className="text-xs text-default-500">上传背景图</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          disabled={props.isUploading}
          onChange={(event) => handleFileInput(event.currentTarget, selectFile)}
          className="character-background-file-input"
        />
        {props.isUploading ? <span className="text-xs text-default-500">处理中...</span> : null}
      </div>
      {draft ? <BackgroundCropModal draft={draft} onClose={() => setDraft(null)} {...props} /> : null}
    </div>
  );
}

function BackgroundCropModal({
  characterId,
  draft,
  feedback,
  isUploading,
  onClose,
  onUploaded,
  setUploading,
}: Props & { draft: CropDraft; onClose: () => void }) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const cancel = () => {
    revokeDraftUrl(draft);
    onClose();
  };

  const upload = async () => {
    const file = await cropBackgroundFile(imageRef.current, completedCrop);
    revokeDraftUrl(draft);
    onClose();
    await uploadBackground({ characterId, feedback, file, onUploaded, setUploading });
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => !open && cancel()}>
        <Modal.Container>
          <Modal.Dialog className="motion-panel modal-surface w-full max-w-2xl">
            <Modal.Header>
              <Modal.Heading>裁剪背景图</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ReactCrop
                aspect={BACKGROUND_CROP_ASPECT}
                crop={crop}
                keepSelection
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={draft.url}
                  alt=""
                  className="max-h-[58vh] w-full select-none rounded-lg object-contain"
                  onLoad={(event) => setCrop(centerAspectPercentCrop(event))}
                />
              </ReactCrop>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" isDisabled={isUploading} onPress={cancel} className="motion-press">
                取消
              </Button>
              <Button variant="primary" isPending={isUploading} onPress={() => void upload()} className="motion-press">
                上传
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function centerAspectPercentCrop(event: SyntheticEvent<HTMLImageElement>): Crop {
  const { height, width } = event.currentTarget;
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, BACKGROUND_CROP_ASPECT, width, height),
    width,
    height,
  );
}

async function cropBackgroundFile(
  image: HTMLImageElement | null,
  crop: PixelCrop | null,
): Promise<File> {
  if (!image) throw new Error("图片尚未加载完成。");
  if (!crop?.width || !crop.height) throw new Error("请先选择裁剪区域。");

  const canvas = document.createElement("canvas");
  canvas.width = BACKGROUND_CROP_WIDTH;
  canvas.height = BACKGROUND_CROP_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持图片裁剪。");

  drawCroppedImage(ctx, image, crop);
  const blob = await canvasToWebp(canvas);
  return new File([blob], "character-background.webp", { type: "image/webp" });
}

function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  crop: PixelCrop,
): void {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    BACKGROUND_CROP_WIDTH,
    BACKGROUND_CROP_HEIGHT,
  );
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("背景图编码失败。"));
      },
      "image/webp",
      BACKGROUND_CROP_QUALITY,
    );
  });
}

async function uploadBackground({
  characterId,
  feedback,
  file,
  onUploaded,
  setUploading,
}: Pick<Props, "characterId" | "feedback" | "onUploaded" | "setUploading"> & { file: File }) {
  if (!characterId.trim()) throw new Error("请先填写角色 ID。");

  setUploading(true);
  try {
    const fd = new FormData();
    fd.set("characterId", characterId.trim());
    fd.set("backgroundImage", file);
    onUploaded(await uploadCharacterBackgroundAction(fd));
    feedback.success("背景图已上传。");
  } catch (error) {
    feedback.error(error instanceof Error ? error.message : "背景图上传失败。");
  } finally {
    setUploading(false);
  }
}

function handleFileInput(input: HTMLInputElement, onFile: (file: File) => void): void {
  const file = input.files?.[0];
  input.value = "";
  if (file) onFile(file);
}

function revokeDraftUrl(draft: CropDraft | null): void {
  if (draft) URL.revokeObjectURL(draft.url);
}
