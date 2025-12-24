"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import imageCompression from "browser-image-compression";

interface ImageItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

export default function Home() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取图片列表
  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/list");
      const data = await res.json();
      if (data.success) {
        setImages(data.images);
      }
    } catch (error) {
      console.error("获取图片失败:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchImages();
  };

  // 图片压缩
  const compressImage = async (file: File): Promise<File> => {
    if (file.size <= 1024 * 1024) return file; // 小于1MB不压缩

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      return await imageCompression(file, options);
    } catch {
      return file;
    }
  };

  // 上传图片
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      const totalFiles = files.length;
      let processedFiles = 0;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        const compressedFile = await compressImage(file);
        formData.append("files", compressedFile);
        processedFiles++;
        setUploadProgress(Math.round((processedFiles / totalFiles) * 50));
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(90);
      const data = await res.json();

      if (data.success) {
        setUploadProgress(100);
        await fetchImages();
      } else {
        alert(data.error || "上传失败");
      }
    } catch (error) {
      console.error("上传失败:", error);
      alert("上传失败，请重试");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 删除图片
  const handleDelete = async (urls: string[]) => {
    if (urls.length === 0) return;

    const confirmMsg = urls.length === 1
      ? "确定要删除这张图片吗？"
      : `确定要删除这 ${urls.length} 张图片吗？`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedImages(new Set());
        setSelectMode(false);
        await fetchImages();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败，请重试");
    }
  };

  // 切换选择
  const toggleSelect = (url: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedImages(newSelected);

    // 有选中时进入选择模式，无选中时退出
    setSelectMode(newSelected.size > 0);
  };

  // 长按进入选择模式
  const handleLongPress = (url: string) => {
    setSelectMode(true);
    setSelectedImages(new Set([url]));
  };

  // 拖拽上传
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            圣诞照片管理
          </h1>
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <button
                  onClick={() => {
                    setSelectMode(false);
                    setSelectedImages(new Set());
                  }}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(Array.from(selectedImages))}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg"
                >
                  删除 ({selectedImages.size})
                </button>
              </>
            ) : (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 dark:text-gray-300"
              >
                <svg
                  className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 上传进度条 */}
      {uploading && (
        <div className="fixed top-14 left-0 right-0 z-50">
          <div className="h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 py-2 bg-white dark:bg-gray-800">
            上传中 {uploadProgress}%
          </div>
        </div>
      )}

      {/* 图片网格 */}
      <main className="p-2">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square skeleton rounded-lg" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>暂无图片</p>
            <p className="text-sm mt-2">点击下方按钮上传</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map((image) => (
              <ImageCard
                key={image.url}
                image={image}
                selected={selectedImages.has(image.url)}
                selectMode={selectMode}
                onSelect={() => toggleSelect(image.url)}
                onLongPress={() => handleLongPress(image.url)}
                onPreview={() => setPreviewImage(image.url)}
                onDelete={() => handleDelete([image.url])}
                formatSize={formatSize}
              />
            ))}
          </div>
        )}
      </main>

      {/* 底部上传按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          上传图片
        </button>
      </div>

      {/* 图片预览 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2"
            onClick={() => setPreviewImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={previewImage}
            alt="预览"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// 图片卡片组件
function ImageCard({
  image,
  selected,
  selectMode,
  onSelect,
  onLongPress,
  onPreview,
  onDelete,
  formatSize,
}: {
  image: ImageItem;
  selected: boolean;
  selectMode: boolean;
  onSelect: () => void;
  onLongPress: () => void;
  onPreview: () => void;
  onDelete: () => void;
  formatSize: (bytes: number) => string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      onLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleClick = () => {
    if (selectMode) {
      onSelect();
    } else {
      onPreview();
    }
  };

  return (
    <div className="relative aspect-square group">
      {!imageLoaded && (
        <div className="absolute inset-0 skeleton rounded-lg" />
      )}
      <img
        src={image.url}
        alt={image.pathname}
        className={`w-full h-full object-cover rounded-lg cursor-pointer transition-opacity ${
          imageLoaded ? "opacity-100" : "opacity-0"
        } ${selected ? "ring-2 ring-green-500" : ""}`}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
      />

      {/* 选择圆圈 - 始终显示 */}
      <div
        className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          selected
            ? "bg-green-500 border-green-500"
            : "bg-white/50 border-white/80 backdrop-blur-sm"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {selected && (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* 悬浮菜单（桌面端） */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 右键菜单 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowMenu(false);
                onPreview();
              }}
              className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              查看
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete();
              }}
              className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-red-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
            <div className="px-6 py-2 text-xs text-gray-400 border-t dark:border-gray-700">
              {formatSize(image.size)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
