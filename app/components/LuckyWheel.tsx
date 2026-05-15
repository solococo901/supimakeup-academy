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

export default function LuckyWheel({
  prizes,
  targetIndex,
  onFinished,
  disabled,
}: LuckyWheelProps) {
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
    <div className="relative flex flex-col items-center justify-center select-none font-sans overflow-hidden gap-8 py-10">
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
                `${pinkPalette[i % pinkPalette.length]} ${i * anglePerPrize}deg ${(i + 1) * anglePerPrize}deg`,
            )
            .join(", ")})`,
        }}
      >
        {prizes.map((text, i) => (
  <div
    key={i}
    className="absolute top-0 left-0 w-full h-full pointer-events-none"
    style={{
      transform: `rotate(${-90 + i * anglePerPrize + anglePerPrize / 2}deg)`,
    }}
  >
    {/* - w-[35%]: Giới hạn độ dài để không chạm mép ngoài và không đè nút SPIN
        - left-[58%]: Đẩy cụm chữ ra xa tâm vòng quay
    */}
    <div className="absolute top-1/2 left-[58%] w-[38%] -translate-y-1/2">
      <span 
        className="text-[8px] md:text-[11px] font-bold text-[#8b3d48] uppercase leading-[1.2] block text-center whitespace-normal break-words"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 4, // Cho phép xuống tối đa 4 dòng
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </span>
    </div>
  </div>
))}
      </motion.div>

      <button
        onClick={spin}
        disabled={isSpinning || disabled}
        className={`
          relative px-12 py-4 rounded-full text-white font-black text-xl md:text-2xl uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(255,133,161,0.4)] transition-all
          ${isSpinning || disabled 
            ? "bg-gray-300 cursor-not-allowed shadow-none" 
            : "bg-gradient-to-r from-[#ffb6c1] to-[#ff85a1] hover:scale-105 active:scale-95 active:shadow-inner"
          }
        `}
      >
        {isSpinning ? "Đang quay..." : "Quay ngay"}
        
        {/* Hiệu ứng bóng sáng cho nút thêm sang trọng */}
        <div className="absolute top-0 left-0 w-full h-full rounded-full bg-white/10 pointer-events-none"></div>
      </button>
    </div>
  );
}
