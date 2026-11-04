import { describe, expect, it } from "vitest";

import {
  isShareImageFresh,
  SHARE_CACHE_NAME,
  SHARE_IMAGE_KEY,
  SHARE_IMAGE_MAX_AGE_MS,
  takeSharedImage,
} from "@/app/lib/pwa/share-image";

const NOW = 1_800_000_000_000;

function fakeStorage(entry?: { body: Uint8Array; type: string; sharedAt: string | null }) {
  const store = new Map<string, Response>();
  if (entry) {
    store.set(
      SHARE_IMAGE_KEY,
      new Response(new Blob([entry.body as BlobPart]), {
        headers: { "content-type": entry.type, ...(entry.sharedAt === null ? {} : { "x-shared-at": entry.sharedAt }) },
      }),
    );
  }
  const opened: string[] = [];
  const storage = {
    open: async (name: string) => {
      opened.push(name);
      return {
        match: async (key: string) => store.get(key),
        delete: async (key: string) => store.delete(key),
      } as unknown as Cache;
    },
  };
  return { storage, store, opened };
}

describe("isShareImageFresh", () => {
  it("vale por 10 minutos e rejeita data ausente, inválida ou muito no futuro", () => {
    expect(isShareImageFresh(String(NOW - 1_000), NOW)).toBe(true);
    expect(isShareImageFresh(String(NOW - SHARE_IMAGE_MAX_AGE_MS), NOW)).toBe(true);
    expect(isShareImageFresh(String(NOW - SHARE_IMAGE_MAX_AGE_MS - 1), NOW)).toBe(false);
    expect(isShareImageFresh(null, NOW)).toBe(false);
    expect(isShareImageFresh("abc", NOW)).toBe(false);
    expect(isShareImageFresh("0", NOW)).toBe(false);
    expect(isShareImageFresh(String(NOW + 3_600_000), NOW)).toBe(false);
  });
});

describe("takeSharedImage", () => {
  it("devolve a imagem como arquivo e a apaga do cache (lê uma só vez)", async () => {
    const { storage, store, opened } = fakeStorage({
      body: new Uint8Array([1, 2, 3]),
      type: "image/png",
      sharedAt: String(NOW - 5_000),
    });

    const file = await takeSharedImage(storage, NOW);

    expect(opened).toEqual([SHARE_CACHE_NAME]);
    expect(file).toBeInstanceOf(File);
    expect(file?.type).toBe("image/png");
    expect(file?.size).toBe(3);
    expect(store.size).toBe(0);
    expect(await takeSharedImage(storage, NOW)).toBeNull();
  });

  it("sem imagem guardada, ou sem suporte a cache, devolve null", async () => {
    expect(await takeSharedImage(fakeStorage().storage, NOW)).toBeNull();
    expect(await takeSharedImage(undefined, NOW)).toBeNull();
  });

  it("imagem velha ou sem data vira null, mas também é apagada", async () => {
    for (const sharedAt of [String(NOW - SHARE_IMAGE_MAX_AGE_MS - 1), null]) {
      const { storage, store } = fakeStorage({ body: new Uint8Array([1]), type: "image/jpeg", sharedAt });
      expect(await takeSharedImage(storage, NOW)).toBeNull();
      expect(store.size).toBe(0);
    }
  });

  it("imagem vazia vira null", async () => {
    const { storage } = fakeStorage({ body: new Uint8Array([]), type: "image/png", sharedAt: String(NOW) });
    expect(await takeSharedImage(storage, NOW)).toBeNull();
  });
});
