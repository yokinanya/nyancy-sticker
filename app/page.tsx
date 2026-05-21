import manifestData from "@/data/stickers.json";
import { StickerGallery } from "@/components/sticker-gallery";
import type { Manifest } from "@/lib/types";

export default function HomePage() {
  const manifest = manifestData as Manifest;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <StickerGallery manifest={manifest} />
    </div>
  );
}
