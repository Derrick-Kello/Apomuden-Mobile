import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';

type ListeningParticlesProps = {
  active: boolean;
  /** Slower, softer motion while sending audio for transcription */
  mode?: 'listening' | 'processing';
  accentColor: string;
  secondaryColor: string;
};

const PARTICLE_COUNT = 16;

type ParticleSpec = {
  baseAngle: number;
  orbitR: number;
  size: number;
  phase: number;
  speed: number;
};

function makeSpecs(): ParticleSpec[] {
  const specs: ParticleSpec[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t = (i / PARTICLE_COUNT) * Math.PI * 2;
    specs.push({
      baseAngle: t + (i % 3) * 0.35,
      orbitR: 28 + (i % 5) * 9 + (i % 2) * 4,
      size: 3 + (i % 4) * 1.5,
      phase: i * 0.42,
      speed: 0.85 + (i % 7) * 0.12,
    });
  }
  return specs;
}

const SPECS = makeSpecs();

function Particle({
  spec,
  progress,
  mode,
  color,
}: {
  spec: ParticleSpec;
  progress: SharedValue<number>;
  mode: 'listening' | 'processing';
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value * Math.PI * 2 * spec.speed + spec.phase;
    const wobble = mode === 'listening' ? 1 : 0.55;
    const r = spec.orbitR * (0.92 + 0.08 * Math.sin(p * 0.7));
    const x = Math.cos(spec.baseAngle + p * wobble) * r;
    const y = Math.sin(spec.baseAngle + p * 1.15 * wobble) * r * 0.95;
    const breathe = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(p * 1.8));
    const scale = mode === 'listening' ? 0.65 + 0.45 * breathe : 0.5 + 0.35 * breathe;

    return {
      opacity: mode === 'listening' ? 0.35 + 0.55 * breathe : 0.25 + 0.45 * breathe,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
    };
  }, [mode]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function ListeningParticles({
  active,
  mode = 'listening',
  accentColor,
  secondaryColor,
}: ListeningParticlesProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      const duration = mode === 'listening' ? 5200 : 7000;
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    }
  }, [active, mode, progress]);

  const coreStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value * Math.PI * 2;
    const s = active ? 1 + 0.06 * Math.sin(p * 2) : 0.92;
    return {
      opacity: active ? 0.35 + 0.15 * (0.5 + 0.5 * Math.sin(p * 1.5)) : 0.12,
      transform: [{ scale: s }],
    };
  }, [active]);

  return (
    <View style={styles.wrap} accessibilityLabel={active ? 'Listening animation' : undefined}>
      <Animated.View
        style={[
          styles.coreGlow,
          {
            backgroundColor: accentColor,
            shadowColor: accentColor,
          },
          coreStyle,
        ]}
      />
      {SPECS.map((spec, i) => (
        <Particle
          key={i}
          spec={spec}
          progress={progress}
          mode={mode}
          color={i % 3 === 0 ? accentColor : secondaryColor}
        />
      ))}
    </View>
  );
}

const CORE = 72;

const styles = StyleSheet.create({
  wrap: {
    width: CORE + 120,
    height: CORE + 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.three,
  },
  coreGlow: {
    position: 'absolute',
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 12,
  },
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});
