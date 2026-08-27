import React from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RemoteMaintenance } from '../services/RemoteConfigService';

/**
 * Full-screen status states. All of them keep the branding, explain what is happening in plain
 * words, say what the employee should do, and offer a retry. Background tracking is unaffected by
 * any of these screens (the native service keeps queueing points).
 */

type Support = { email: string | null; phone: string | null };

function StatusLayout({
  emoji,
  title,
  message,
  detail,
  onRetry,
  retrying,
  retryLabel = 'Try again',
  support,
  secondary,
}: {
  emoji: string;
  title: string;
  message: string;
  detail?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
  support?: Support;
  secondary?: React.ReactNode;
}) {
  return (
    <View style={styles.page}>
      <Image source={require('../../assets/perzent-lockup.png')} style={styles.lockup} resizeMode="contain" accessibilityLabel="Perzent" />
      <View style={styles.card}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {onRetry ? (
          <TouchableOpacity style={[styles.button, retrying && styles.buttonDisabled]} onPress={onRetry} disabled={retrying}>
            {retrying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{retryLabel}</Text>}
          </TouchableOpacity>
        ) : null}
        {secondary}
        {support && (support.email || support.phone) ? (
          <View style={styles.support}>
            <Text style={styles.supportLabel}>Need help?</Text>
            {support.phone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${support.phone}`).catch(() => undefined)}>
                <Text style={styles.supportLink}>Call {support.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {support.email ? (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${support.email}`).catch(() => undefined)}>
                <Text style={styles.supportLink}>{support.email}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
      <Image source={require('../../assets/developed-by-jsp-coders.png')} style={styles.branding} resizeMode="contain" accessibilityLabel="Developed by JSP Coders" />
    </View>
  );
}

const formatUntil = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return `Expected back by ${date.toLocaleString()}`;
};

export function MaintenanceScreen({
  maintenance,
  support,
  onRetry,
  retrying,
  onDuty,
}: {
  maintenance: RemoteMaintenance;
  support?: Support;
  onRetry: () => void;
  retrying?: boolean;
  onDuty?: boolean;
}) {
  return (
    <StatusLayout
      emoji="🛠️"
      title={maintenance.title || 'Perzent is under maintenance'}
      message={maintenance.message || 'We are making improvements. Please try again in a little while.'}
      detail={[formatUntil(maintenance.until), onDuty ? 'Your shift is still being tracked in the background — nothing is lost.' : null].filter(Boolean).join('\n')}
      onRetry={onRetry}
      retrying={retrying}
      retryLabel="Check again"
      support={support}
    />
  );
}

export function OfflineScreen({ onRetry, retrying, onDuty }: { onRetry: () => void; retrying?: boolean; onDuty?: boolean }) {
  return (
    <StatusLayout
      emoji="📶"
      title="No internet connection"
      message="Turn on mobile data or connect to Wi‑Fi to sign in or change your shift."
      detail={onDuty ? 'Your location is saved on the phone and will be sent automatically when you are back online.' : null}
      onRetry={onRetry}
      retrying={retrying}
      retryLabel="Retry"
    />
  );
}

export function ServerUnreachableScreen({ onRetry, retrying, support, httpStatus }: { onRetry: () => void; retrying?: boolean; support?: Support; httpStatus?: number }) {
  return (
    <StatusLayout
      emoji="⚠️"
      title="Can't reach the Perzent server"
      message="Your internet works, but our server did not respond. This is usually temporary."
      detail={httpStatus ? `Server responded with HTTP ${httpStatus}.` : null}
      onRetry={onRetry}
      retrying={retrying}
      support={support}
    />
  );
}

export function AccountInactiveScreen({ support, onSignOut }: { support?: Support; onSignOut: () => void }) {
  return (
    <StatusLayout
      emoji="🔒"
      title="Your account is inactive"
      message="Your employer has suspended this account. Contact your manager or company owner to reactivate it."
      support={support}
      secondary={
        <TouchableOpacity style={styles.linkButton} onPress={onSignOut}>
          <Text style={styles.linkText}>Sign in with a different account</Text>
        </TouchableOpacity>
      }
    />
  );
}

export function CrashScreen({ onRestart, errorText }: { onRestart: () => void; errorText?: string }) {
  return (
    <StatusLayout
      emoji="😵"
      title="Something went wrong"
      message="The app hit an unexpected problem. Tap below to reload — your shift and location data are safe."
      detail={errorText ? errorText.slice(0, 200) : null}
      onRetry={onRestart}
      retryLabel="Reload app"
    />
  );
}

/** Slim banner for announcements from the AppConfig row. */
export function AnnouncementBanner({ text, level }: { text: string; level: 'INFO' | 'WARNING' | 'CRITICAL' }) {
  const palette =
    level === 'CRITICAL'
      ? { bg: '#FEE2E2', fg: '#991B1B', border: '#FCA5A5' }
      : level === 'WARNING'
        ? { bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' }
        : { bg: '#DBEAFE', fg: '#1E40AF', border: '#93C5FD' };
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }]} accessibilityRole="alert">
      <Text style={[styles.bannerText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockup: { width: 220, height: 66, marginBottom: 28 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 21 },
  detail: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18, marginTop: 12 },
  button: { marginTop: 20, backgroundColor: '#16A34A', paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12, minWidth: 160, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  linkButton: { marginTop: 16 },
  linkText: { color: '#16A34A', fontWeight: '600', fontSize: 13 },
  support: { marginTop: 18, alignItems: 'center', gap: 4 },
  supportLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
  supportLink: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
  branding: { position: 'absolute', bottom: 28, width: 180, height: 64 },
  banner: { marginHorizontal: 16, marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  bannerText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
