import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

/**
 * Emergency SOS control designed to be pressed by someone in distress:
 *   • one large, always-visible target — no menu to open, no small "confirm" button to find;
 *   • HOLD to send (default 1.6 s) so a pocket bump or a mis-tap never fires a false alarm, while
 *     a deliberate press is still one gesture;
 *   • a filling ring plus vibration pulses so the user feels and sees it working even without
 *     looking closely; releasing early cancels.
 * Pure JS (Animated + Vibration) — no native module, safe with the hand-maintained android/ dir.
 */

const HOLD_MS = 1600;

type Phase = 'idle' | 'holding' | 'sending' | 'sent';

export function SosButton({ onSend, disabled }: { onSend: () => Promise<void>; disabled?: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [hint, setHint] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buzzTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(false);

  useEffect(() => {
    // Gentle idle pulse so the control reads as "live / ready".
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.14, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (buzzTimer.current) clearInterval(buzzTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [pulse]);

  const reset = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (buzzTimer.current) { clearInterval(buzzTimer.current); buzzTimer.current = null; }
    Vibration.cancel();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const fire = async () => {
    completed.current = true;
    if (buzzTimer.current) { clearInterval(buzzTimer.current); buzzTimer.current = null; }
    Vibration.vibrate([0, 80, 60, 160]);
    setPhase('sending');
    try {
      await onSend();
      setPhase('sent');
      setTimeout(() => { setPhase('idle'); Animated.timing(progress, { toValue: 0, duration: 250, useNativeDriver: false }).start(); }, 2200);
    } catch {
      // The caller shows the error; just return the button to a usable state.
      setPhase('idle');
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  };

  const onPressIn = () => {
    if (disabled || phase === 'sending' || phase === 'sent') return;
    completed.current = false;
    setPhase('holding');
    setHint(false);
    Vibration.vibrate(35);
    // Escalating buzz while the ring fills, so a held press clearly feels different from a tap.
    buzzTimer.current = setInterval(() => Vibration.vibrate(25), 320);
    Animated.timing(progress, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start();
    holdTimer.current = setTimeout(fire, HOLD_MS);
  };

  const onPressOut = () => {
    if (completed.current || phase === 'sending' || phase === 'sent') return;
    // Released before the ring filled → treat as a tap and teach the gesture, don't send.
    reset();
    setPhase('idle');
    setHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), 2600);
  };

  const ringScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const label =
    phase === 'sending' ? 'SENDING…' :
    phase === 'sent' ? 'SENT ✓' :
    phase === 'holding' ? 'KEEP HOLDING' : 'SOS';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {hint && (
        <View style={styles.hintBubble}>
          <Text style={styles.hintText}>Press and hold to send an emergency alert</Text>
        </View>
      )}
      <Animated.View style={[styles.halo, { transform: [{ scale: phase === 'idle' ? pulse : 1 }] }]} pointerEvents="none" />
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || phase === 'sending' || phase === 'sent'}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS. Press and hold to send your live location to your employer."
        style={styles.button}
        hitSlop={10}
      >
        <Animated.View style={[styles.fill, { transform: [{ scale: ringScale }], opacity: phase === 'holding' ? 0.9 : 0 }]} pointerEvents="none" />
        {phase === 'sending' ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <View style={styles.center}>
            <Text style={styles.icon}>🚨</Text>
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const SIZE = 82;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 18, bottom: 26, alignItems: 'center', zIndex: 50 },
  halo: {
    position: 'absolute', width: SIZE + 22, height: SIZE + 22, borderRadius: (SIZE + 22) / 2,
    backgroundColor: 'rgba(220,38,38,0.22)', bottom: -11, right: -11,
  },
  button: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: '#DC2626',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#DC2626', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10,
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  fill: {
    position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: '#F87171',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  label: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.4, marginTop: 1 },
  hintBubble: {
    position: 'absolute', bottom: SIZE + 20, right: 0, width: 190, backgroundColor: '#0F172A',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
  },
  hintText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', lineHeight: 16 },
});
