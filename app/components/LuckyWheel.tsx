"use client";
import { motion, useAnimation } from "framer-motion";
import { useState } from "react";

interface LuckyWheelProps {
  prizes: string[];
  targetIndex: number;
  onFinished: (prizeName: string) => void;
  disabled?: boolean; // THÊM DÒNG NÀY
}

// Bảng màu Pink Luxury: 10 tone màu hồng khác nhau
const pinkPalette = [
  "#FFE4E1", // Misty Rose (Hồng phấn rất nhạt)
  "#FFD1DC", // Pastel Pink (Hồng pastel)
  "#FFB6C1", // Light Pink (Hồng sáng)
  "#FFA6C9", // Carnation Pink (Hồng hoa cẩm chướng)
  "#F8B8D0", // Muted Pink (Hồng trầm)
  "#F3A8C2", // Rosy Pink (Hồng vân anh)
  "#F4C2C2", // Baby Pink (Hồng baby)
  "#FFC0CB", // Classic Pink (Hồng cổ điển)
  "#ECA4B4", // Dusty Pink (Hồng bụi)
  "#FF9DBB", // Deep Pastel Pink (Hồng đậm pastel)
];

export default function LuckyWheel({ prizes, targetIndex, onFinished, disabled }: LuckyWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const controls = useAnimation();

  const count = prizes.length;
  const anglePerPrize = 360 / count;

  const spin = async () => {
    if (isSpinning || count === 0 || disabled) return;
    setIsSpinning(true);

    const rounds = 10;

    // Góc của tâm ô mục tiêu
    const targetCenterAngle = targetIndex * anglePerPrize + anglePerPrize / 2;
    // Góc cần đạt để ô mục tiêu ở đỉnh
    const finalVisualAngle = 360 - targetCenterAngle;
    // Góc hiện tại
    const currentVisualAngle = currentRotation % 360;

    // Góc bù trừ
    let diff = finalVisualAngle - currentVisualAngle;
    if (diff < 0) {
      diff += 360;
    }

    // Cộng dồn góc quay
    const spinAngle = rounds * 360 + diff;
    const nextRotation = currentRotation + spinAngle;

    await controls.start({
      rotate: nextRotation,
      transition: {
        duration: 7,
        ease: [0.1, 0, 0, 1],
      },
    });

    setCurrentRotation(nextRotation);
    setIsSpinning(false);
    onFinished(prizes[targetIndex]);
  };

  return (
    <div className="relative flex items-center justify-center select-none font-sans overflow-hidden py-10">
      {/* KIM CHỈ - Cố định ở 12 giờ */}
      <div
        className="absolute top-4 z-[60] w-10 h-12 bg-[#ff85a1]"
        style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
      ></div>

      <motion.div
        animate={controls}
        initial={{ rotate: 0 }}
        className="w-[320px] h-[320px] md:w-[500px] md:h-[500px] rounded-full border-[12px] border-[#ffd1d1] relative overflow-hidden bg-[#fff5f6]"
        style={{
          // Sử dụng mảng pinkPalette để tô màu
          background: `conic-gradient(from 0deg, ${prizes
            .map(
              (_, i) =>
                `${pinkPalette[i % pinkPalette.length]} ${i * anglePerPrize}deg ${(i + 1) * anglePerPrize}deg`
            )
            .join(", ")})`,
        }}
      >
        {prizes.map((text, i) => (
          // 1. LỚP WRAPPER: Rộng bằng cả vòng quay, chỉ nhận góc xoay
          <div
            key={i}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
              // -90deg để quy chuẩn hệ trục CSS (từ 3h) về 12h
              transform: `rotate(${-90 + i * anglePerPrize + anglePerPrize / 2}deg)`,
            }}
          >
            {/* 2. LỚP CHỨA TEXT: Đi từ tâm ra mép, tự động nằm giữa tia bán kính */}
            <div className="absolute top-1/2 left-1/2 w-1/2 -translate-y-1/2 flex items-center justify-end pr-10 md:pr-14">
              <span className="text-[11px] md:text-sm font-bold text-[#8b3d48] uppercase truncate max-w-[80%]">
                {text}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      <button
        onClick={spin}
        disabled={isSpinning || disabled}
        className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full z-[70] bg-white border-4 border-[#ffdae0] shadow-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-80 disabled:hover:scale-100"
      >
        <span className="text-[#ff85a1] font-black text-xl">SPIN</span>
      </button>
    </div>
  );
}