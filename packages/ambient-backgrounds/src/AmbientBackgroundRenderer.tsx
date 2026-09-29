import { lazy, Suspense, useMemo } from "react";
import { AuraGradientBackground } from "./aura/AuraGradientBackground";
import { resolveAmbientConfig, type AmbientResolvedConfig, type AmbientStyleId, type ProductId, type AmbientSurface } from "./ambientPresets";

const Waves = lazy(() => import("./backgrounds/Waves/Waves"));
const Lightfall = lazy(() => import("./backgrounds/Lightfall/Lightfall"));
const Topography = lazy(() => import("./backgrounds/Topography/Topography"));
const Ballpit = lazy(() => import("./backgrounds/Ballpit/Ballpit"));

export type AmbientBackgroundRendererProps = {
  product: ProductId;
  surface: AmbientSurface;
  isDark: boolean;
  style?: AmbientStyleId;
  reducedMotion?: boolean;
};

function EngineView({
  config,
  isDark,
  product,
  surface,
}: {
  config: AmbientResolvedConfig;
  isDark: boolean;
  product: ProductId;
  surface: AmbientSurface;
}) {
  const fallbackAura = config.auraThemeId;

  if (config.lightweightOnly && (config.engine === "lightfall" || config.engine === "topography" || config.engine === "ballpit")) {
    return <AuraGradientBackground isDark={isDark} themeId={fallbackAura} />;
  }

  switch (config.engine) {
    case "aura":
      return <AuraGradientBackground isDark={isDark} themeId={fallbackAura} />;
    case "waves":
      return (
        <Waves
          lineColor={isDark ? "rgba(166, 200, 255, 0.35)" : "rgba(37, 99, 235, 0.25)"}
          backgroundColor={isDark ? "rgba(10, 41, 255, 0.08)" : "rgba(255, 255, 255, 0.35)"}
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
      );
    case "lightfall":
      return (
        <Lightfall
          colors={isDark ? ["#A6C8FF", "#5227FF", "#FF9FFC"] : ["#93C5FD", "#6366F1", "#F9A8D4"]}
          backgroundColor={isDark ? "#0A29FF" : "#EEF2FF"}
          speed={1}
          streakCount={8}
          streakWidth={1}
          streakLength={1}
          glow={1}
          density={1}
          twinkle={1}
          zoom={2}
          backgroundGlow={1}
          opacity={1}
          mouseInteraction={surface !== "auth" || product === "fetchdesk"}
          mouseStrength={1}
          mouseRadius={0.6}
        />
      );
    case "topography":
      return (
        <Topography
          lowColor={isDark ? "#5227FF" : "#6366F1"}
          midColor={isDark ? "#FF9FFC" : "#A5B4FC"}
          highColor={isDark ? "#FFFFFF" : "#F8FAFC"}
          speed={0.35}
          morphAmount={3}
          morphSpeed={0.05}
          bands={2}
          thickness={0.01}
          scale={1}
          pixelSize={1}
          glow={0.5}
          colorMode="elevation"
          contrast={3}
          brightness={1}
          fillBands={false}
          opacity={1}
          grain
          grainIntensity={0.05}
          mouseInteraction={surface !== "auth"}
          mouseRadius={0.3}
          mouseStrength={0.4}
        />
      );
    case "ballpit":
      return (
        <>
          <AuraGradientBackground isDark={isDark} themeId={fallbackAura} />
          <Ballpit
            count={surface === "landing" ? 160 : 120}
            gravity={0.7}
            friction={0.8}
            wallBounce={0.95}
            followCursor={surface !== "auth"}
          />
        </>
      );
    default:
      return <AuraGradientBackground isDark={isDark} themeId={fallbackAura} />;
  }
}

export function AmbientBackgroundRenderer({
  product,
  surface,
  isDark,
  style = "auto",
  reducedMotion = false,
}: AmbientBackgroundRendererProps) {
  const config = useMemo(
    () => resolveAmbientConfig(product, surface, isDark, style),
    [product, surface, isDark, style],
  );

  if (reducedMotion) {
    return <AuraGradientBackground isDark={isDark} themeId={config.auraThemeId} />;
  }

  return (
    <Suspense fallback={<AuraGradientBackground isDark={isDark} themeId={config.auraThemeId} />}>
      <EngineView config={config} isDark={isDark} product={product} surface={surface} />
    </Suspense>
  );
}
