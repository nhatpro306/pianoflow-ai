"use client";

import React from "react";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Piano,
  Hourglass,
  HandMetal,
  Gauge,
  Zap,
  Sparkles,
  CheckCircle2,
  Mic,
  Usb,
  Keyboard as KeyboardIcon,
} from "lucide-react";

export interface QuickStartGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickStartGuideModal({
  open,
  onClose,
}: QuickStartGuideModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="📖 Hướng dẫn sử dụng PianoFlow AI (Quick Start Guide)"
      className="max-w-3xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
        <p className="text-xs text-zinc-400">
          Chào mừng bạn đến với <strong className="text-zinc-200">PianoFlow AI</strong> — nền tảng luyện tập piano tương tác 250 tác phẩm với công nghệ AI Waterfall, phản hồi âm thanh thực và phân tích micro-timing.
        </p>

        {/* 4 Core Concept Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: Cách chơi */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-cyan-500/20 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Piano className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>1. Cách chơi & Kết nối</span>
                  </h3>
                </div>
                <Badge variant="accent" size="sm" className="text-[10px]">
                  MIDI / Phím / Mic
                </Badge>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Bạn có thể chơi piano theo <strong>3 phương thức</strong> linh hoạt:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
                <li className="flex items-start gap-1.5">
                  <Usb className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Đàn MIDI:</strong> Cắm dây USB hoặc Bluetooth MIDI (tự nhận diện độ trễ cực thấp).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <KeyboardIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Bàn phím máy tính:</strong> Gõ trực tiếp các phím <code className="px-1 py-0.5 rounded bg-black/40 text-cyan-300 font-mono text-[11px]">A S D F G H J K</code>.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Micro AI:</strong> Bật mic để nhận diện cao độ piano cơ trực tiếp theo thời gian thực.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card 2: Chế độ Chờ nốt (Wait Mode) */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Hourglass className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>2. Chế độ Chờ nốt (Wait Mode)</span>
                  </h3>
                </div>
                <Badge variant="hand-rh" size="sm" className="text-[10px]">
                  Interactive
                </Badge>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Thác nốt tự động <strong>dừng lại đợi bạn bấm đúng nốt</strong> trên đàn mới chạy tiếp mà không lo trễ nhịp:
              </p>
              <div className="mt-2.5 p-2 rounded-lg bg-black/40 border border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-purple-300 font-medium">Nốt tím = Tay phải (RH)</span>
                  <span className="text-zinc-500 text-[11px]">Melody & Hòa âm cao</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0" />
                  <span className="text-cyan-300 font-medium">Nốt xanh = Tay trái (LH)</span>
                  <span className="text-zinc-500 text-[11px]">Bass Root & Rải hợp âm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Tập riêng từng tay & Đệm tự động */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <HandMetal className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>3. Tập riêng từng tay & Đệm tự động</span>
                  </h3>
                </div>
                <Badge variant="success" size="sm" className="text-[10px]">
                  Dual-Hand AI
                </Badge>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Tập trung chinh phục từng phần tác phẩm mà không bị quá tải:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Chọn <strong>Tay Phải (RH)</strong>: Bạn chỉ bấm giai điệu, AI tự động chơi phần đệm Bass tay trái.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Chọn <strong>Tay Trái (LH)</strong>: Bạn tập thế bấm hợp âm bass, AI tự đệm giai điệu SoundFont chuẩn studio.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card 4: Micro-Timing */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>4. Đồng hồ nhịp Micro-Timing</span>
                  </h3>
                </div>
                <Badge variant="warning" size="sm" className="text-[10px]">
                  Precision ms
                </Badge>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Đo độ chuẩn xác từng mili-giây so với nhịp chuẩn:
              </p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-1.5 rounded bg-black/30 border border-emerald-500/20">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> In The Pocket (≤ 35ms)
                  </span>
                  <span className="text-zinc-400 text-[11px]">Hoàn hảo tuyệt đối</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-black/30 border border-amber-500/20">
                  <span className="text-amber-400 font-semibold">Early / Late (35ms - 80ms)</span>
                  <span className="text-zinc-400 text-[11px]">Hơi vội hoặc hơi trễ</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Phím tắt nhanh (Keyboard Shortcuts) */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-950/40 via-zinc-900 to-cyan-950/40 border border-white/10">
          <div className="flex items-center gap-2 mb-2.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              5. Phím tắt nhanh trên bàn phím (Quick Shortcuts)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center text-center">
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] mb-1">
                Spacebar
              </kbd>
              <span className="text-zinc-400 text-[11px]">Play / Pause</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center text-center">
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] mb-1">
                ← / →
              </kbd>
              <span className="text-zinc-400 text-[11px]">Tua nhịp (Seek)</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center text-center">
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] mb-1">
                1 / 2 / 3
              </kbd>
              <span className="text-zinc-400 text-[11px]">Chọn Cả 2 / Phải / Trái</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center text-center">
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] mb-1">
                Esc
              </kbd>
              <span className="text-zinc-400 text-[11px]">Đóng cửa sổ</span>
            </div>
          </div>
        </div>
      </div>

      <DialogActions className="justify-between items-center sm:justify-end">
        <Button
          variant="gradient"
          size="sm"
          onClick={onClose}
          className="w-full sm:w-auto font-semibold"
        >
          Đã hiểu & Bắt đầu luyện tập 🚀
        </Button>
      </DialogActions>
    </Dialog>
  );
}
