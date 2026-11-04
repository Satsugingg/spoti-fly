import React, { useRef, useEffect, useState } from 'react';

interface MarqueeTextProps {
  text?: string;
  children?: React.ReactNode;
  className?: string;
  speed?: number; // pixels per second
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  children,
  className = '',
  speed = 25,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const overflow = textRef.current.scrollWidth > containerRef.current.clientWidth;
        setShouldScroll(overflow);
        setOffset(textRef.current.scrollWidth - containerRef.current.clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, children]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden whitespace-nowrap ${className}`}
      title={text}
    >
      <span
        ref={textRef}
        className={`inline-block transition-transform duration-300 ${
          shouldScroll ? 'animate-marquee' : ''
        }`}
        style={
          shouldScroll
            ? {
                animationDuration: `${Math.max(6, (offset + 100) / speed)}s`,
              }
            : undefined
        }
      >
        {children || text}
      </span>
    </div>
  );
};
