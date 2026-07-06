import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  image: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
}

export function ParallaxHero({ image, eyebrow, title, subtitle }: Props) {
  const imgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (imgRef.current) {
        imgRef.current.style.transform = `translate3d(0, ${y * 0.4}px, 0) scale(${1 + y * 0.0005})`;
        imgRef.current.style.opacity = String(Math.max(0, 1 - y / 700));
      }
      if (contentRef.current) {
        contentRef.current.style.transform = `translate3d(0, ${y * 0.2}px, 0)`;
        contentRef.current.style.opacity = String(Math.max(0, 1 - y / 500));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div ref={imgRef} className="absolute inset-0 will-change-transform">
        <img
          src={image}
          alt=""
          width={1920}
          height={1280}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background" />
        <div className="absolute inset-0 grid-bg opacity-30" />
      </div>

      <div
        ref={contentRef}
        className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 will-change-transform"
      >
        {eyebrow && (
          <div className="mb-6 inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] max-w-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground">
            {subtitle}
          </p>
        )}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-xs uppercase tracking-[0.3em]">Scroll</span>
          <div className="h-10 w-px bg-gradient-to-b from-primary to-transparent animate-pulse-glow" />
        </div>
      </div>
    </section>
  );
}
