import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Sequence,
  Easing,
} from "remotion";

// Премиальная цветовая палитра
const colors = {
  background: "#0a0a0f",
  foreground: "#ffffff",
  violet: "#a78bfa",
  blue: "#60a5fa",
  cyan: "#22d3ee",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
};

// Компонент: Сетка с эффектом глубины
const GridBackground: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: opacity * 0.15,
        backgroundImage: `
          linear-gradient(${colors.violet}20 1px, transparent 1px),
          linear-gradient(90deg, ${colors.violet}20 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
        transform: `perspective(1000px) rotateX(60deg) translateY(${frame * 0.5}px)`,
        transformOrigin: "center top",
      }}
    />
  );
};

// Компонент: Плавающие частицы с глубиной
const FloatingParticles: React.FC<{ count: number; opacity: number }> = ({ count, opacity }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const x = (i * 137.5) % 100;
        const y = (i * 73.3) % 100;
        const speed = 0.3 + (i % 5) * 0.2;
        const size = 3 + (i % 6);
        const depth = (i % 3) * 0.3;
        const hue = i % 2 === 0 ? colors.violet : colors.cyan;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: "50%",
              background: hue,
              opacity: opacity * (0.4 + Math.sin(frame / 40 + i) * 0.3) * (1 - depth),
              transform: `translateY(${Math.sin(frame * speed / 25 + i) * 40}px) scale(${1 - depth})`,
              boxShadow: `0 0 ${size * 4}px ${hue}`,
              filter: `blur(${depth * 2}px)`,
            }}
          />
        );
      })}
    </>
  );
};

// Компонент: Glassmorphism карточка
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "32px",
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2)
        `,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Сцена 1: Титульный экран
const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 80, stiffness: 100 },
  });

  const titleProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 100 },
  });

  const subtitleProgress = spring({
    frame: frame - 35,
    fps,
    config: { damping: 100 },
  });

  const badgesProgress = spring({
    frame: frame - 55,
    fps,
    config: { damping: 100 },
  });

  // Выход
  const exitOpacity = interpolate(frame, [150, 180], [1, 0], {
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.ease),
  });

  const exitScale = interpolate(frame, [150, 180], [1, 0.95], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at top, ${colors.violet}15, ${colors.background} 50%)`,
        fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
      }}
    >
      <GridBackground opacity={logoProgress} />
      <FloatingParticles count={50} opacity={logoProgress * exitOpacity} />

      {/* Светящиеся орбы */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "20%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.violet}40, transparent 70%)`,
          filter: "blur(100px)",
          opacity: logoProgress * exitOpacity * 0.6,
          transform: `translate(${Math.sin(frame / 50) * 100}px, ${Math.cos(frame / 50) * 50}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "15%",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.cyan}30, transparent 70%)`,
          filter: "blur(120px)",
          opacity: logoProgress * exitOpacity * 0.5,
          transform: `translate(${Math.cos(frame / 60) * 80}px, ${Math.sin(frame / 60) * 60}px)`,
        }}
      />

      {/* Контент */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 100px",
          opacity: exitOpacity,
          transform: `scale(${exitScale})`,
        }}
      >
        {/* Логотип */}
        <div
          style={{
            fontSize: "160px",
            marginBottom: "50px",
            opacity: logoProgress,
            transform: `scale(${interpolate(logoProgress, [0, 1], [0.5, 1])}) rotate(${interpolate(logoProgress, [0, 1], [-20, 0])}deg)`,
            filter: `drop-shadow(0 0 60px ${colors.violet}) drop-shadow(0 0 30px ${colors.cyan})`,
          }}
        >
          🚦
        </div>

        {/* Заголовок */}
        <h1
          style={{
            fontSize: "100px",
            fontWeight: "800",
            margin: 0,
            background: `linear-gradient(135deg, ${colors.foreground} 0%, ${colors.violet} 40%, ${colors.cyan} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            textAlign: "center",
            opacity: titleProgress,
            transform: `translateY(${interpolate(titleProgress, [0, 1], [30, 0])}px)`,
            textShadow: `0 0 80px ${colors.violet}40`,
          }}
        >
          Доменный светофор.AI
        </h1>

        {/* Подзаголовок */}
        <p
          style={{
            fontSize: "36px",
            color: "rgba(255,255,255,0.7)",
            marginTop: "40px",
            fontWeight: "500",
            letterSpacing: "-0.01em",
            opacity: subtitleProgress,
            transform: `translateY(${interpolate(subtitleProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          Мгновенный AI-анализатор безопасности доменов
        </p>

        {/* Бейджи */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "60px",
            opacity: badgesProgress,
            transform: `translateY(${interpolate(badgesProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          {[
            { icon: "🛡️", text: "Защита от фишинга", color: colors.success },
            { icon: "⚡", text: "AI-анализ", color: colors.violet },
            { icon: "🌐", text: "Реальное время", color: colors.cyan },
          ].map((badge, i) => (
            <GlassCard
              key={i}
              style={{
                padding: "18px 36px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                transform: `translateY(${interpolate(badgesProgress, [0, 1], [20 + i * 5, 0])}px)`,
              }}
            >
              <span style={{ fontSize: "28px", filter: `drop-shadow(0 0 10px ${badge.color})` }}>
                {badge.icon}
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "rgba(255,255,255,0.9)",
                  letterSpacing: "-0.01em",
                }}
              >
                {badge.text}
              </span>
            </GlassCard>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Сцена 2: Как это работает
const HowItWorksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 100 },
  });

  const steps = [
    {
      number: "01",
      title: "Пауза",
      text: "Пользователь видит ссылку и останавливается перед вводом данных",
      icon: "⏸️",
      gradient: `linear-gradient(135deg, ${colors.blue}20, ${colors.cyan}10)`,
      color: colors.cyan,
      delay: 25,
    },
    {
      number: "02",
      title: "Проверка",
      text: "AI анализирует домен через фиды фишинга и ruleset паттернов",
      icon: "🔍",
      gradient: `linear-gradient(135deg, ${colors.violet}20, ${colors.blue}10)`,
      color: colors.violet,
      delay: 55,
    },
    {
      number: "03",
      title: "Действие",
      text: "Получает понятный вердикт и рекомендацию к действию",
      icon: "✅",
      gradient: `linear-gradient(135deg, ${colors.success}20, ${colors.cyan}10)`,
      color: colors.success,
      delay: 85,
    },
  ];

  const exitOpacity = interpolate(frame, [180, 210], [1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.background,
        fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
        padding: "100px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <FloatingParticles count={40} opacity={headerProgress * exitOpacity * 0.5} />

      <div style={{ maxWidth: "1720px", margin: "0 auto", width: "100%", opacity: exitOpacity }}>
        {/* Заголовок */}
        <div
          style={{
            marginBottom: "90px",
            opacity: headerProgress,
            transform: `translateY(${interpolate(headerProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 20px",
              background: `${colors.violet}15`,
              border: `1px solid ${colors.violet}30`,
              borderRadius: "50px",
              fontSize: "14px",
              fontWeight: "700",
              color: colors.violet,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "25px",
            }}
          >
            Логика сервиса
          </div>
          <h2
            style={{
              fontSize: "72px",
              fontWeight: "800",
              color: colors.foreground,
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
            }}
          >
            Пауза, проверка и действие
          </h2>
          <p
            style={{
              fontSize: "32px",
              color: "rgba(255,255,255,0.5)",
              marginTop: "15px",
              fontWeight: "500",
            }}
          >
            — в одном сценарии
          </p>
        </div>

        {/* Карточки */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "30px",
          }}
        >
          {steps.map((step, index) => {
            const stepProgress = spring({
              frame: frame - step.delay,
              fps,
              config: { damping: 100, stiffness: 200 },
            });

            return (
              <div
                key={index}
                style={{
                  opacity: stepProgress,
                  transform: `translateY(${interpolate(stepProgress, [0, 1], [50, 0])}px) scale(${interpolate(stepProgress, [0, 1], [0.9, 1])})`,
                }}
              >
                <GlassCard
                  style={{
                    padding: "50px",
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                    background: step.gradient,
                  }}
                >
                  {/* Светящийся акцент */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "4px",
                      background: `linear-gradient(90deg, ${step.color}, transparent)`,
                      boxShadow: `0 0 20px ${step.color}`,
                    }}
                  />

                  {/* Номер */}
                  <div
                    style={{
                      fontSize: "120px",
                      fontWeight: "900",
                      color: "rgba(255,255,255,0.03)",
                      position: "absolute",
                      top: "-20px",
                      right: "20px",
                      lineHeight: 1,
                    }}
                  >
                    {step.number}
                  </div>

                  {/* Иконка */}
                  <div
                    style={{
                      fontSize: "70px",
                      marginBottom: "30px",
                      filter: `drop-shadow(0 0 20px ${step.color})`,
                    }}
                  >
                    {step.icon}
                  </div>

                  {/* Заголовок */}
                  <h3
                    style={{
                      fontSize: "44px",
                      fontWeight: "700",
                      color: colors.foreground,
                      marginBottom: "20px",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {step.title}
                  </h3>

                  {/* Описание */}
                  <p
                    style={{
                      fontSize: "19px",
                      color: "rgba(255,255,255,0.7)",
                      lineHeight: 1.6,
                      margin: 0,
                      fontWeight: "400",
                    }}
                  >
                    {step.text}
                  </p>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Сцена 3: Технологии
const TechStackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 100 },
  });

  const features = [
    {
      icon: "🛡️",
      title: "Фиды фишинга",
      text: "OpenPhish и URLAbuse",
      color: colors.success,
      delay: 25,
    },
    {
      icon: "⚙️",
      title: "Локальный Ruleset",
      text: "Проверка паттернов и TLD",
      color: colors.warning,
      delay: 45,
    },
    {
      icon: "⚡",
      title: "AI-анализ",
      text: "Groq + языковые модели",
      color: colors.violet,
      delay: 65,
    },
    {
      icon: "💾",
      title: "Threat Cache",
      text: "Redis для быстрых ответов",
      color: colors.cyan,
      delay: 85,
    },
  ];

  const exitOpacity = interpolate(frame, [180, 210], [1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.background,
        fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
        padding: "100px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <FloatingParticles count={40} opacity={headerProgress * exitOpacity * 0.5} />

      <div style={{ maxWidth: "1720px", margin: "0 auto", width: "100%", opacity: exitOpacity }}>
        {/* Заголовок */}
        <div
          style={{
            marginBottom: "90px",
            textAlign: "center",
            opacity: headerProgress,
            transform: `translateY(${interpolate(headerProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 20px",
              background: `${colors.violet}15`,
              border: `1px solid ${colors.violet}30`,
              borderRadius: "50px",
              fontSize: "14px",
              fontWeight: "700",
              color: colors.violet,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "25px",
            }}
          >
            Подкапотная магия
          </div>
          <h2
            style={{
              fontSize: "72px",
              fontWeight: "800",
              color: colors.foreground,
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
            }}
          >
            Множественный анализ
          </h2>
          <p
            style={{
              fontSize: "32px",
              color: "rgba(255,255,255,0.5)",
              marginTop: "15px",
              fontWeight: "500",
            }}
          >
            Четыре уровня защиты в реальном времени
          </p>
        </div>

        {/* Сетка */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "30px",
          }}
        >
          {features.map((feature, index) => {
            const featureProgress = spring({
              frame: frame - feature.delay,
              fps,
              config: { damping: 100, stiffness: 200 },
            });

            return (
              <div
                key={index}
                style={{
                  opacity: featureProgress,
                  transform: `translateY(${interpolate(featureProgress, [0, 1], [50, 0])}px) scale(${interpolate(featureProgress, [0, 1], [0.9, 1])})`,
                }}
              >
                <GlassCard
                  style={{
                    padding: "60px",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Фоновое свечение */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "300px",
                      height: "300px",
                      borderRadius: "50%",
                      background: feature.color,
                      opacity: 0.15,
                      filter: "blur(80px)",
                      transform: "translate(-50%, -50%)",
                    }}
                  />

                  {/* Иконка */}
                  <div
                    style={{
                      fontSize: "90px",
                      marginBottom: "30px",
                      filter: `drop-shadow(0 0 30px ${feature.color})`,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {feature.icon}
                  </div>

                  {/* Заголовок */}
                  <h3
                    style={{
                      fontSize: "40px",
                      fontWeight: "700",
                      color: colors.foreground,
                      marginBottom: "15px",
                      letterSpacing: "-0.02em",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {feature.title}
                  </h3>

                  {/* Описание */}
                  <p
                    style={{
                      fontSize: "22px",
                      color: "rgba(255,255,255,0.7)",
                      margin: 0,
                      fontWeight: "500",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {feature.text}
                  </p>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Сцена 4: Финал
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contentProgress = spring({
    frame,
    fps,
    config: { damping: 80 },
  });

  const buttonProgress = spring({
    frame: frame - 50,
    fps,
    config: { damping: 100 },
  });

  const pulseScale = 1 + Math.sin(frame / 20) * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${colors.violet}20, ${colors.background} 60%)`,
        fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <FloatingParticles count={60} opacity={contentProgress} />

      {/* Вращающиеся кольца */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: `${600 + i * 200}px`,
            height: `${600 + i * 200}px`,
            border: `2px solid ${i % 2 === 0 ? colors.violet : colors.cyan}${Math.floor(20 / i).toString(16)}`,
            borderRadius: "50%",
            opacity: contentProgress * 0.3,
            transform: `rotate(${frame * (i % 2 === 0 ? 0.3 : -0.2)}deg)`,
          }}
        />
      ))}

      {/* Контент */}
      <div
        style={{
          textAlign: "center",
          zIndex: 1,
          maxWidth: "1200px",
          padding: "0 100px",
          opacity: contentProgress,
          transform: `scale(${interpolate(contentProgress, [0, 1], [0.9, 1])})`,
        }}
      >
        {/* Иконка */}
        <div
          style={{
            fontSize: "150px",
            marginBottom: "50px",
            filter: `drop-shadow(0 0 60px ${colors.violet}) drop-shadow(0 0 30px ${colors.cyan})`,
            transform: `scale(${pulseScale})`,
          }}
        >
          🚦
        </div>

        {/* Заголовок */}
        <h2
          style={{
            fontSize: "80px",
            fontWeight: "800",
            color: colors.foreground,
            marginBottom: "30px",
            lineHeight: 1.2,
            letterSpacing: "-0.03em",
            background: `linear-gradient(135deg, ${colors.foreground} 0%, ${colors.violet} 50%, ${colors.cyan} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Проверяй домен
          <br />
          до ввода данных
        </h2>

        {/* Подзаголовок */}
        <p
          style={{
            fontSize: "34px",
            color: "rgba(255,255,255,0.6)",
            marginBottom: "60px",
            fontWeight: "500",
          }}
        >
          Конкурсный проект по кибербезопасности
        </p>

        {/* Кнопка */}
        <div
          style={{
            opacity: buttonProgress,
            transform: `scale(${interpolate(buttonProgress, [0, 1], [0.8, 1]) * pulseScale})`,
          }}
        >
          <GlassCard
            style={{
              display: "inline-block",
              padding: "30px 70px",
              background: `linear-gradient(135deg, ${colors.violet}40, ${colors.cyan}30)`,
              border: `1px solid ${colors.violet}60`,
              boxShadow: `
                0 0 60px ${colors.violet}60,
                0 20px 40px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.2)
              `,
            }}
          >
            <span
              style={{
                fontSize: "34px",
                fontWeight: "700",
                color: colors.foreground,
                letterSpacing: "-0.01em",
              }}
            >
              Доменный светофор.AI
            </span>
          </GlassCard>
        </div>

        {/* Дополнительная информация */}
        <div
          style={{
            marginTop: "50px",
            fontSize: "18px",
            color: "rgba(255,255,255,0.4)",
            fontWeight: "500",
            opacity: buttonProgress,
          }}
        >
          Защита от фишинга • AI-анализ • Открытый исходный код
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Главный компонент
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <Sequence from={0} durationInFrames={180}>
        <TitleScene />
      </Sequence>
      <Sequence from={180} durationInFrames={210}>
        <HowItWorksScene />
      </Sequence>
      <Sequence from={390} durationInFrames={210}>
        <TechStackScene />
      </Sequence>
      <Sequence from={600} durationInFrames={300}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
