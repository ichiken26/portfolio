import { describe, expect, it } from "vitest";
import source from "./CmsEditor.tsx?raw";

describe("CMS save controls", () => {
  it("does not mark a saved response as another user edit", () => {
    expect(source).toContain("setStoredValue(saved)");
    expect(source).not.toContain("setValue(saved)");
  });

  it("provides manual save controls for both editor toolbars", () => {
    expect(source.match(/今すぐ保存/g)).toHaveLength(2);
    expect(source).toContain("disabled={!dirty || saving}");
  });

  it("shows the persisted image filename and upload result", () => {
    expect(source).toContain("現在の画像:");
    expect(source).toContain("imageFileName(p.imagePath)");
    expect(source).toContain("アップロード失敗:");
  });
});
