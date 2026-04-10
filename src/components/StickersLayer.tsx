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

  // Параллакс для ощущения глубины
  const yOffset = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? -40 : 40, index % 2 === 0 ? 40 : -40]);

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        scale: 2, 
        rotate: rotation + (side === "left" ? -20 : 20),
        filter: "blur(10px)",
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
        damping: 15,
        stiffness: 70, 
        delay: 0.05 * index,
        duration: 0.8
      }}
      style={{
        position: "absolute",
        top,
        y: yOffset,
        zIndex: 30,
        pointerEvents: "none",
        userSelect: "none",
      }}
      className={`
        ${side === "left" ? "left-0 md:left-4 xl:left-8" : "right-0 md:right-4 xl:right-8"}
        w-16 sm:w-20 md:w-28 lg:w-36 xl:w-40
        opacity-20 sm:opacity-50 md:opacity-80 xl:opacity-100
        drop-shadow-md md:drop-shadow-2xl
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
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-30">
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
