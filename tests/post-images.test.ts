import { describe, expect, it } from "vitest";

import {
  MAX_POST_IMAGE_BYTES,
  checkPostImage,
  postImageUrl,
  safeImageName,
  sniffPostImageType,
  uploadedImageId,
} from "@/lib/post-images";
import { isSafeImageSource } from "@/lib/posts";

const png = () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = () => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = () => Uint8Array.from([..."RIFF"].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [..."WEBP"].map((c) => c.charCodeAt(0))));
const ascii = (text: string) => Uint8Array.from([...text].map((c) => c.charCodeAt(0)));

describe("sniffPostImageType", () => {
  it("recognises JPEG, PNG and WebP by their bytes", () => {
    expect(sniffPostImageType(jpeg())).toBe("image/jpeg");
    expect(sniffPostImageType(png())).toBe("image/png");
    expect(sniffPostImageType(webp())).toBe("image/webp");
  });

  it("refuses SVG, GIF, HTML and a script renamed .png", () => {
    expect(sniffPostImageType(ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffPostImageType(ascii("GIF89a......"))).toBeNull();
    expect(sniffPostImageType(ascii("<script>alert(1)</script>"))).toBeNull();
  });
});

describe("checkPostImage", () => {
  it("accepts a real image", () => {
    expect(checkPostImage(png())).toEqual({ ok: true, contentType: "image/png" });
  });

  it("refuses an empty file, an oversize one and a wrong format, each with its own status", () => {
    expect(checkPostImage(new Uint8Array(0))).toMatchObject({ ok: false, status: 400 });
    const big = new Uint8Array(MAX_POST_IMAGE_BYTES + 1);
    big.set(jpeg());
    expect(checkPostImage(big)).toMatchObject({ ok: false, status: 413 });
    expect(checkPostImage(ascii("not an image"))).toMatchObject({ ok: false, status: 415 });
  });

  it("accepts a file of exactly the limit", () => {
    const edge = new Uint8Array(MAX_POST_IMAGE_BYTES);
    edge.set(jpeg());
    expect(checkPostImage(edge).ok).toBe(true);
  });
});

describe("safeImageName", () => {
  it("drops paths, odd characters and the claimed extension", () => {
    expect(safeImageName("C:\\Users\\me\\My Photo (1).PNG", "image/jpeg")).toBe("My-Photo-1.jpg");
    expect(safeImageName("../../etc/passwd", "image/png")).toBe("passwd.png");
    expect(safeImageName("", "image/webp")).toBe("image.webp");
    expect(safeImageName("<script>.png", "image/png")).toBe("script.png");
  });

  it("caps the length", () => {
    expect(safeImageName(`${"a".repeat(300)}.png`, "image/png").length).toBeLessThanOrEqual(84);
  });
});

describe("uploaded image URLs", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";

  it("round-trips an id, and only recognises our own path", () => {
    expect(uploadedImageId(postImageUrl(id))).toBe(id);
    expect(uploadedImageId(`https://evil.example${postImageUrl(id)}`)).toBeNull();
    expect(uploadedImageId(`${postImageUrl(id)}?x=1`)).toBeNull();
    expect(uploadedImageId("/images/cover.webp")).toBeNull();
    expect(uploadedImageId(null)).toBeNull();
  });

  it("is a source the post validator already accepts", () => {
    expect(isSafeImageSource(postImageUrl(id))).toBe(true);
  });
});
