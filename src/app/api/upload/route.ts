import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有选择文件" },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        continue;
      }

      // 生成唯一文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `photo_${timestamp}_${randomStr}.${ext}`;

      const blob = await put(filename, file, {
        access: "public",
        addRandomSuffix: false,
      });

      uploadedFiles.push({
        url: blob.url,
        pathname: blob.pathname,
      });
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "上传失败" },
      { status: 500 }
    );
  }
}
