"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

interface Tilt3DCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
}

export function Tilt3DCard({
  children,
  className = "",
  maxTilt = 8,
  glare = true,
}: Tilt3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]), {
    stiffness: 240,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]), {
    stiffness: 240,
    damping: 22,
  });

  const glareX = useSpring(useTransform(mouseX, [0, 1], [0, 100]), {
    stiffness: 200,
    damping: 24,
  });
  const glareY = useSpring(useTransform(mouseY, [0, 1], [0, 100]), {
    stiffness: 200,
    damping: 24,
  });

  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(163, 224, 79, 0.22), transparent 58%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <div style={{ perspective: "1000px" }} className="h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`relative h-full will-change-transform group ${className}`}
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden="true"
            style={{ background: glareBg }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </motion.div>
    </div>
  );
}

interface Floating3DElementProps {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  rotate?: number;
  duration?: number;
  delay?: number;
}

export function Floating3DElement({
  children,
  className = "",
  amplitude = 8,
  rotate = 2.5,
  duration = 5.5,
  delay = 0,
}: Floating3DElementProps) {
  return (
    <motion.div
      animate={{
        y: [0, -amplitude, 0],
        rotateZ: [-rotate, rotate, -rotate],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface ScrollParallaxLayerProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}

export function ScrollParallaxLayer({
  children,
  className = "",
  offset = 36,
}: ScrollParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

export function AnimatedFlowConnector({ active = false }: { active?: boolean }) {
  return (
    <div aria-hidden="true" className="relative flex h-6 w-10 items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <line
          x1="12"
          y1="0"
          x2="12"
          y2="24"
          stroke={active ? "#0f8a5f" : "#cde3d6"}
          strokeWidth="2.5"
          strokeDasharray="4 4"
        />
        {active && (
          <motion.circle
            cx="12"
            r="3.5"
            fill="#a3e04f"
            stroke="#0b3d2c"
            strokeWidth="1.5"
            animate={{ cy: [2, 22] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          />
        )}
      </svg>
    </div>
  );
}

export function PulseBeacon({
  color = "#a3e04f",
  size = "sm",
}: {
  color?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";
  return (
    <span className={`relative inline-flex ${dim} shrink-0`}>
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}
