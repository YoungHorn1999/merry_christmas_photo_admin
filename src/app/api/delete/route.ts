import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function DELETE(request: Request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有指定要删除的图片" },
        { status: 400 }
      );
    }

    // 批量删除
    await del(urls);

    return NextResponse.json({
      success: true,
      deleted: urls.length,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, error: "删除失败" },
      { status: 500 }
    );
  }
}
