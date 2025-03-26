import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface GlowingCardProps {
  children: React.ReactNode;
  className?: string;
}

const GlowingCard: React.FC<GlowingCardProps> = ({
  children,
  className = "",
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      let angle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);
      angle = (angle + 360) % 360;

      // Calculate distance from center for glow intensity
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
      const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
      const intensity = Math.min(distance / maxDistance, 1);

      card.style.setProperty("--start", `${angle}deg`);
      card.style.setProperty("--intensity", intensity.toString());

      // Smooth mouse position tracking
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mouse-x", `${x}%`);
      card.style.setProperty("--mouse-y", `${y}%`);
    };

    const handleMouseLeave = () => {
      card.style.setProperty("--intensity", "0");
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative group ${className}`}
      style={
        {
          "--start": "0deg",
          "--mouse-x": "50%",
          "--mouse-y": "50%",
          "--intensity": "0",
          "--gradient": `conic-gradient(
          from var(--start),
          #FB373C,
          #FC721C,
          #FFDC00,
          #1BCEFF,
          #2A6BFF,
          #D929FF,
          #FF0A5C,
          #FB373C
        )`,
        } as React.CSSProperties
      }
    >
      {/* Glow effect layer */}
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-50 transition-all duration-300 blur-lg"
        style={{
          background: "var(--gradient)",
          transform: "translate3d(0, 0, 0)",
          backgroundPosition: "var(--mouse-x) var(--mouse-y)",
          opacity: "calc(var(--intensity) * 0.4)",
          filter: "blur(calc(8px + var(--intensity) * 8px))",
        }}
      />

      {/* Border effect */}
      <div
        className="absolute -inset-[2px] rounded-2xl transition-all duration-500"
        style={{
          background: "var(--gradient)",
          backgroundPosition: "var(--mouse-x) var(--mouse-y)",
          opacity: "calc(0.1 + var(--intensity) * 0.9)",
          maskImage:
            "conic-gradient(from var(--start), white 20deg, transparent 40deg, transparent 320deg, white 340deg)",
          WebkitMaskImage:
            "conic-gradient(from var(--start), white 20deg, transparent 40deg, transparent 320deg, white 340deg)",
        }}
      />

      {/* Content layer */}
      <div className="relative bg-[#1A1F25] rounded-2xl p-8 shadow-xl transition-all duration-300">
        {children}
      </div>
    </motion.div>
  );
};

export default GlowingCard;
