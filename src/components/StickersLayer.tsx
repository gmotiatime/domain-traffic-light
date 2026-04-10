import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export interface StickerData {
  src: string;
  side: "left" | "right";
  top: string;
  rotation?: number;
}

interface StickerProps extends StickerData {
  index: number;
}

const Sticker = ({ src, side, top, rotation = 0, index }: StickerProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Мягкий параллакс остается, он добавляет глубины
  const yOffset = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? -20 : 20, index % 2 === 0 ? 20 : -20]);

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        scale: 3, 
        rotate: rotation + (side === "left" ? -40 : 40),
        filter: "blur(15px)",
      }}
      whileInView={{ 
        opacity: 1, 
        scale: 1, 
        rotate: rotation,
        filter: "blur(0px)",
      }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ 
        type: "spring",
        damping: 12,
        stiffness: 90, 
        delay: 0.1 + (index * 0.05),
        duration: 0.7
      }}
      style={{
        position: "absolute",
        top,
        y: yOffset,
        zIndex: 10, // Ниже основного контента
        pointerEvents: "none",
        userSelect: "none",
      }}
      // Адаптивные стили через Tailwind классы
      className={`
        ${side === "left" ? "left-[-10vw] md:left-[4vw]" : "right-[-10vw] md:right-[4vw]"}
        w-[70px] md:w-[clamp(100px,12vw,170px)]
        opacity-30 md:opacity-100
        drop-shadow-lg md:drop-shadow-2xl
      `}
    >
      <img 
        src={src} 
        alt="" 
        className="w-full h-auto object-contain"
        loading="lazy"
      />
    </motion.div>
  );
};

export const StickersLayer = ({ items }: { items?: StickerData[] }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-10">
      <div className="relative w-full h-full">
        {items.map((sticker, index) => (
          <Sticker
            key={`${sticker.src}-${index}`}
            index={index}
            {...sticker}
          />
        ))}
      </div>
    </div>
  );
};
