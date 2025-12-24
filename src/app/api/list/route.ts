import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    // 检查环境变量
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { success: false, error: "BLOB_READ_WRITE_TOKEN 环境变量未配置" },
        { status: 500 }
      );
    }

    const { blobs } = await list();

    // 按上传时间倒序排列（最新的在前）
    const sortedBlobs = blobs.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return NextResponse.json({
      success: true,
      images: sortedBlobs.map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      })),
    });
  } catch (error) {
    console.error("List error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { success: false, error: `获取图片列表失败: ${message}` },
      { status: 500 }
    );
  }
}
