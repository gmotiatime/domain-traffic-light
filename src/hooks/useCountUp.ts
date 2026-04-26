import { useEffect, useState, useRef, useCallback } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  start?: number;
}

export function useCountUp({ end, duration = 2000, start = 0 }: CountUpProps) {
  const [count, setCount] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const startAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    setIsAnimating(true);
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(start + (end - start) * easeOutQuart);

      setCount(currentCount);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        setIsAnimating(false);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [end, duration, start]);

  return { count, startAnimation, isAnimating };
}
