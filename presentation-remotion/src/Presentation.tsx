import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio } from 'remotion';
import React from 'react';

/* ─────────────────────── helpers ─────────────────────── */
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const fadeIn = (frame: number, start: number, dur = 30) =>
  interpolate(frame, [start, start + dur], [0, 1], clamp);

const fadeOut = (frame: number, start: number, dur = 25) =>
  interpolate(frame, [start, start + dur], [1, 0], clamp);

const slideUp = (frame: number, fps: number, delay = 0) =>
  spring({ frame: Math.max(0, frame - delay), fps, from: 60, to: 0, config: { damping: 18, stiffness: 80 } });

/* ─────────────── Ambient Orb (背景光球) ─────────────── */
const AmbientOrb: React.FC<{
  x: string; y: string; size: number;
  color: string; opacity: number; blur?: number;
}> = ({ x, y, size, color, opacity, blur = 200 }) => (
  <div style={{
    position: 'absolute', left: x, top: y,
    width: size, height: size, borderRadius: '50%',
    background: color, opacity, filter: `blur(${blur}px)`,
    pointerEvents: 'none',
  }} />
);

/* ──────────────── Glass Panel (стекло) ──────────────── */
const GlassPanel: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  opacity?: number;
}> = ({ children, style, opacity = 0.08 }) => (
  <div style={{
    background: `rgba(255,255,255,${opacity})`,
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderRadius: 36,
    border: '1px solid rgba(255,255,255,0.12)',
    padding: '60px 72px',
    boxShadow: '0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    ...style,
  }}>
    {children}
  </div>
);

/* ───────────── Cross-fade wrapper (переходы) ─────────── */
const SlideWrap: React.FC<{
  frame: number; duration: number; children: React.ReactNode;
  bg?: string;
}> = ({ frame, duration, children, bg }) => {
  const enter = fadeIn(frame, 0, 35);
  const exit = fadeOut(frame, duration - 30, 30);
  const opacity = Math.min(enter, exit);
  const scale = interpolate(frame, [0, duration], [1.02, 1], { ...clamp });

  return (
    <AbsoluteFill style={{
      justifyContent: 'center', alignItems: 'center',
      opacity, transform: `scale(${scale})`,
      background: bg || '#000',
    }}>
      {children}
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  MAIN COMPOSITION                                      */
/* ═══════════════════════════════════════════════════════ */

export const Presentation: React.FC<{ audioUrl?: string }> = ({ audioUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const S = 250; // frames per slide
  const slides = [
    { start: 0,     end: S },       // 0  – Intro
    { start: S,     end: S*2 },     // 1  – Problem
    { start: S*2,   end: S*3 },     // 2  – Solution
    { start: S*3,   end: S*4 },     // 3  – AI
    { start: S*4,   end: S*5 },     // 4  – Impact
    { start: S*5,   end: S*6+10 },  // 5  – CTA (чуть длиннее)
  ];

  const cur = slides.findIndex(s => frame >= s.start && frame < s.end);

  return (
    <AbsoluteFill style={{
      backgroundColor: '#000',
      fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
      overflow: 'hidden',
    }}>
      {audioUrl && <Audio src={audioUrl} volume={0.85} />}

      {cur === 0 && <IntroSlide   f={frame - slides[0].start} fps={fps} d={S} />}
      {cur === 1 && <ProblemSlide  f={frame - slides[1].start} fps={fps} d={S} />}
      {cur === 2 && <SolutionSlide f={frame - slides[2].start} fps={fps} d={S} />}
      {cur === 3 && <AISlide       f={frame - slides[3].start} fps={fps} d={S} />}
      {cur === 4 && <ImpactSlide   f={frame - slides[4].start} fps={fps} d={S} />}
      {cur === 5 && <CTASlide      f={frame - slides[5].start} fps={fps} d={S+10} />}
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  SLIDE 0 — INTRO                                       */
/* ═══════════════════════════════════════════════════════ */

const IntroSlide: React.FC<{ f: number; fps: number; d: number }> = ({ f, fps, d }) => {
  const titleY = slideUp(f, fps, 5);
  const subtitleY = slideUp(f, fps, 18);
  const tagY = slideUp(f, fps, 32);

  // ambient orb movement
  const orbX = interpolate(f, [0, d], [35, 55]);
  const orbY = interpolate(f, [0, d], [25, 45]);

  return (
    <SlideWrap frame={f} duration={d}
      bg="radial-gradient(ellipse 120% 100% at 50% 110%, #1a1a2e 0%, #0a0a0a 60%, #000 100%)">

      {/* ambient glow */}
      <AmbientOrb x={`${orbX}%`} y={`${orbY}%`} size={700} color="#6366f1" opacity={0.12} blur={250} />
      <AmbientOrb x="20%" y="15%" size={400} color="#a855f7" opacity={0.08} blur={200} />
      <AmbientOrb x="75%" y="70%" size={500} color="#3b82f6" opacity={0.06} blur={220} />

      <div style={{ textAlign: 'center', zIndex: 1, padding: '0 100px' }}>
        {/* small tag */}
        <div style={{
          fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase' as const, letterSpacing: 8,
          marginBottom: 40,
          opacity: fadeIn(f, 25, 30),
          transform: `translateY(${tagY}px)`,
        }}>
          Кибербезопасность нового поколения
        </div>

        {/* main title */}
        <h1 style={{
          fontSize: 180, fontWeight: 800, margin: 0, lineHeight: 1,
          letterSpacing: -6,
          background: 'linear-gradient(180deg, #fff 20%, rgba(255,255,255,0.5) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: fadeIn(f, 8, 35),
          transform: `translateY(${titleY}px)`,
        }}>
          Доменный
          <br />
          Светофор
        </h1>

        {/* subtitle */}
        <p style={{
          fontSize: 52, fontWeight: 500, color: '#86868b', margin: 0, marginTop: 40,
          letterSpacing: -0.5,
          opacity: fadeIn(f, 20, 30),
          transform: `translateY(${subtitleY}px)`,
        }}>
          Защита от фишинга. Мгновенно.
        </p>
      </div>
    </SlideWrap>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  SLIDE 1 — PROBLEM                                     */
/* ═══════════════════════════════════════════════════════ */

const ProblemSlide: React.FC<{ f: number; fps: number; d: number }> = ({ f, fps, d }) => {
  const lines = [
    { text: 'Фишинговые атаки выросли на 150% за год.', delay: 15 },
    { text: 'Школьники и студенты — главная цель.', delay: 35 },
    { text: 'Один клик — и данные украдены.', delay: 55 },
  ];

  return (
    <SlideWrap frame={f} duration={d}
      bg="radial-gradient(ellipse at 30% 50%, #1c0a0a 0%, #000 70%)">

      <AmbientOrb x="15%" y="30%" size={600} color="#ef4444" opacity={0.15} blur={250} />
      <AmbientOrb x="80%" y="60%" size={400} color="#dc2626" opacity={0.06} blur={180} />

      <div style={{ zIndex: 1, padding: '0 160px', width: '100%' }}>
        {/* headline */}
        <h2 style={{
          fontSize: 110, fontWeight: 800, letterSpacing: -4, margin: 0, marginBottom: 80,
          color: '#ff453a',
          textShadow: '0 0 120px rgba(255,69,58,0.35)',
          opacity: fadeIn(f, 0, 30),
          transform: `translateY(${slideUp(f, fps, 0)}px)`,
        }}>
          Проблема.
        </h2>

        {/* staggered lines */}
        {lines.map((l, i) => (
          <p key={i} style={{
            fontSize: 52, fontWeight: 600, margin: 0, marginBottom: 36,
            color: i === lines.length - 1 ? '#ff453a' : '#f5f5f7',
            opacity: fadeIn(f, l.delay, 25),
            transform: `translateX(${spring({
              frame: Math.max(0, f - l.delay), fps,
              from: -40, to: 0, config: { damping: 20 },
            })}px)`,
          }}>
            {l.text}
          </p>
        ))}
      </div>
    </SlideWrap>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  SLIDE 2 — SOLUTION                                    */
/* ═══════════════════════════════════════════════════════ */

const SolutionSlide: React.FC<{ f: number; fps: number; d: number }> = ({ f, fps, d }) => {
  const cards = [
    { icon: '🔍', title: 'Punycode-анализ',   desc: 'Выявляем подмену символов' },
    { icon: '⏱',  title: 'Возраст домена',    desc: 'Свежие домены — подозрительны' },
    { icon: '🧬', title: 'Слова-ловушки',     desc: 'login, secure, verify…' },
  ];

  return (
    <SlideWrap frame={f} duration={d}
      bg="radial-gradient(ellipse at 60% 40%, #0a1a0a 0%, #000 70%)">

      <AmbientOrb x="50%" y="30%" size={700} color="#34d399" opacity={0.1} blur={260} />
      <AmbientOrb x="25%" y="70%" size={350} color="#10b981" opacity={0.06} blur={180} />

      <div style={{ zIndex: 1, textAlign: 'center', width: '100%', padding: '0 120px' }}>
        <h2 style={{
          fontSize: 120, fontWeight: 800, letterSpacing: -4, margin: 0, marginBottom: 30,
          color: '#30d158',
          textShadow: '0 0 100px rgba(48,209,88,0.25)',
          opacity: fadeIn(f, 0, 30),
          transform: `translateY(${slideUp(f, fps, 0)}px)`,
        }}>
          Анализ до клика.
        </h2>

        <p style={{
          fontSize: 44, fontWeight: 500, color: '#86868b', margin: 0, marginBottom: 80,
          opacity: fadeIn(f, 15, 25),
          transform: `translateY(${slideUp(f, fps, 12)}px)`,
        }}>
          Три слоя проверки — нулевой сбор данных
        </p>

        {/* Glass cards row */}
        <div style={{
          display: 'flex', gap: 40, justifyContent: 'center',
          opacity: fadeIn(f, 30, 35),
        }}>
          {cards.map((c, i) => (
            <GlassPanel key={i} style={{
              flex: 1, maxWidth: 440, textAlign: 'center',
              opacity: fadeIn(f, 35 + i * 12, 25),
              transform: `translateY(${slideUp(f, fps, 35 + i * 12)}px) scale(${
                interpolate(f, [35 + i*12, 65 + i*12], [0.92, 1], clamp)
              })`,
            }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>{c.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#f5f5f7', marginBottom: 12 }}>
                {c.title}
              </div>
              <div style={{ fontSize: 28, fontWeight: 500, color: '#86868b' }}>
                {c.desc}
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </SlideWrap>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  SLIDE 3 — AI FEATURES                                 */
/* ═══════════════════════════════════════════════════════ */

const AISlide: React.FC<{ f: number; fps: number; d: number }> = ({ f, fps, d }) => {
  const features = [
    { label: 'Объяснение простым языком',  icon: '💬' },
    { label: 'Непрерывное обучение',       icon: '🧠' },
    { label: 'Предсказание zero-day',      icon: '🔮' },
  ];

  // Rotating ambient orb
  const angle = interpolate(f, [0, d], [0, 45]);
  const orbCx = 50 + 15 * Math.cos((angle * Math.PI) / 180);
  const orbCy = 50 + 15 * Math.sin((angle * Math.PI) / 180);

  return (
    <SlideWrap frame={f} duration={d}
      bg="radial-gradient(ellipse at 50% 50%, #0a0a1e 0%, #000 70%)">

      <AmbientOrb x={`${orbCx}%`} y={`${orbCy}%`} size={800} color="#6366f1" opacity={0.12} blur={300} />
      <AmbientOrb x="70%" y="20%" size={400} color="#818cf8" opacity={0.07} blur={200} />
      <AmbientOrb x="20%" y="75%" size={350} color="#4f46e5" opacity={0.05} blur={180} />

      <div style={{ zIndex: 1, padding: '0 160px', width: '100%' }}>
        <h2 style={{
          fontSize: 120, fontWeight: 800, letterSpacing: -4, margin: 0, marginBottom: 20,
          background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 40%, #a78bfa 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: fadeIn(f, 0, 30),
          transform: `translateY(${slideUp(f, fps, 0)}px)`,
        }}>
          Powered by AI.
        </h2>

        <p style={{
          fontSize: 44, fontWeight: 500, color: '#6b7280', margin: 0, marginBottom: 80,
          opacity: fadeIn(f, 12, 25),
          transform: `translateY(${slideUp(f, fps, 10)}px)`,
        }}>
          Интеллект, который учится и объясняет
        </p>

        <div style={{ display: 'flex', gap: 48 }}>
          {features.map((ft, i) => (
            <GlassPanel key={i} opacity={0.06} style={{
              flex: 1,
              opacity: fadeIn(f, 30 + i * 18, 28),
              transform: `translateY(${slideUp(f, fps, 30 + i * 18)}px)`,
            }}>
              <div style={{ fontSize: 56, marginBottom: 24 }}>{ft.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#e5e7eb', lineHeight: 1.3 }}>
                {ft.label}
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </SlideWrap>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  SLIDE 4 — IMPACT (цифры)                              */
/* ═══════════════════════════════════════════════════════ */

const ImpactSlide: React.FC<{ f: number; fps: number; d: number }> = ({ f, fps, d }) => {
  const stats = [
    { value: '95%', label: 'Точность', color: '#30d158', glow: 'rgba(48,209,88,0.2)' },
    { value: '2 сек', label: 'Оценка домена', color: '#0a84ff', glow: 'rgba(10,132,255,0.2)' },
    { value: '0', label: 'Сбор данных', color: '#ff9f0a', glow: 'rgba(255,159,10,0.2)' },
  ];

  return (
    <SlideWrap frame={f} duration={d}
      bg="radial-gradient(ellipse at 50% 60%, #0d0d15 0%, #000 70%)">

      <AmbientOrb x="50%" y="50%" size={900} color="#1e3a5f" opacity={0.1} blur={350} />

      <div style={{ zIndex: 1, textAlign: 'center', width: '100%', padding: '0 100px' }}>
        <h2 style={{
          fontSize: 100, fontWeight: 800, letterSpacing: -3, margin: 0, marginBottom: 90,
          color: '#f5f5f7',
          opacity: fadeIn(f, 0, 30),
          transform: `translateY(${slideUp(f, fps, 0)}px)`,
        }}>
          Результаты говорят сами.
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 80 }}>
          {stats.map((s, i) => {
            const delay = 20 + i * 22;
            return (
              <div key={i} style={{
                textAlign: 'center',
                opacity: fadeIn(f, delay, 30),
                transform: `translateY(${slideUp(f, fps, delay)}px)`,
              }}>
                <div style={{
                  fontSize: 140, fontWeight: 900, letterSpacing: -5,
                  color: s.color,
                  textShadow: `0 0 80px ${s.glow}`,
                  lineHeight: 1,
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontSize: 36, fontWeight: 500, color: '#6b7280', marginTop: 20,
                }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideWrap>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  SLIDE 5 — CTA                                         */
/* ═══════════════════════════════════════════════════════ */

const CTASlide: React.FC<{ f: number; fps: number; d: number }> = ({ f, fps, d }) => {
  // pulsating orb
  const pulse = interpolate(f, [0, d], [0.08, 0.18]);

  return (
    <SlideWrap frame={f} duration={d}
      bg="radial-gradient(ellipse at 50% 50%, #0f0a1e 0%, #000 65%)">

      <AmbientOrb x="50%" y="45%" size={900} color="#7c3aed" opacity={pulse} blur={300} />
      <AmbientOrb x="30%" y="30%" size={400} color="#6366f1" opacity={0.06} blur={200} />
      <AmbientOrb x="70%" y="65%" size={500} color="#8b5cf6" opacity={0.05} blur={240} />

      <div style={{ zIndex: 1, textAlign: 'center', padding: '0 160px' }}>
        <h2 style={{
          fontSize: 130, fontWeight: 800, letterSpacing: -5, margin: 0, marginBottom: 30,
          background: 'linear-gradient(180deg, #fff 30%, rgba(255,255,255,0.55) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: fadeIn(f, 5, 35),
          transform: `translateY(${slideUp(f, fps, 5)}px)`,
        }}>
          Будущее
          <br />
          безопасности.
        </h2>

        {/* URL pill */}
        <GlassPanel opacity={0.1} style={{
          display: 'inline-block', padding: '28px 64px', borderRadius: 100, marginTop: 50,
          opacity: fadeIn(f, 30, 30),
          transform: `translateY(${slideUp(f, fps, 28)}px) scale(${
            interpolate(f, [30, 60], [0.9, 1], clamp)
          })`,
        }}>
          <span style={{
            fontSize: 48, fontWeight: 700,
            background: 'linear-gradient(90deg, #c084fc, #818cf8, #60a5fa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            domain-light.vercel.app
          </span>
        </GlassPanel>

        {/* Contest tag */}
        <p style={{
          fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginTop: 50,
          letterSpacing: 4, textTransform: 'uppercase' as const,
          opacity: fadeIn(f, 50, 30),
          transform: `translateY(${slideUp(f, fps, 45)}px)`,
        }}>
          Конкурс цифровой безопасности 2026
        </p>
      </div>
    </SlideWrap>
  );
};
