import React, { useMemo } from 'react';

const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
const PARTICLE_COUNT = isMobile ? 10 : 16;

interface ParticleBackgroundProps {
  /** 0–1: how warm the room feels; follows Tim Hồng during a game. */
  heat?: number;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ heat = 0 }) => {
  // Generate random fixed particles for glowing ambient embers/fireflies
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 5 + 2,
      duration: Math.random() * 10 + 6,
      delay: Math.random() * 5,
      color: i % 3 === 0 ? '#FF6B9D' : i % 3 === 1 ? '#D4AF37' : '#7A1F2B',
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#1a1a1a]">
      {/* Soft lights: gradients, not blurred discs. A blur on something that drifts is worked out again on every frame. */}
      <div className="bokeh bokeh--drift -left-[206px] -top-[206px] h-[720px] w-[720px] opacity-25" style={{ '--bokeh': '122, 31, 43' } as React.CSSProperties} />
      <div className="bokeh bokeh--drift -bottom-[174px] -right-[174px] h-[620px] w-[620px] opacity-20" style={{ '--bokeh': '255, 107, 157', animationDelay: '-9s' } as React.CSSProperties} />
      <div className="bokeh right-[calc(10%-110px)] top-[calc(20%-110px)] h-[570px] w-[570px] opacity-15" style={{ '--bokeh': '212, 175, 55' } as React.CSSProperties} />

      {/* Wine Radial Center Gradient Overlay */}
      <div
        className="absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(circle at center, #4a121a 0%, #1a1a1a 100%)' }}
      />

      {/* Warmth that builds with the game */}
      <div className="ambient-heat" style={{ opacity: Math.max(0, Math.min(1, heat)) * 0.6 }} />

      {/* Subtle Card Grid Texture overlay */}
      <div className="absolute inset-0 card-pattern opacity-15" />

      {/* Floating Light Firefly Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-slow"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            // Painted once with the dot; a drop-shadow filter would be redone on every frame.
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
