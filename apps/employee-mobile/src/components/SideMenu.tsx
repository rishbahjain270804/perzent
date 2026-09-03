import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@perzent/shared-types';
import { AutoUpdateService } from '../services/AutoUpdateService';

/**
 * Slide-in account menu opened from the dashboard hamburger. Groups everything that used to
 * clutter the main screen — profile, settings, about and help — behind one icon, plus Log out.
 * Pure RN (Modal + Linking), no navigation library.
 */

type MenuView = 'ROOT' | 'PROFILE' | 'SETTINGS' | 'ABOUT' | 'HELP';

const openUrl = (url: string) => Linking.openURL(url).catch(() => undefined);
const roleLabel = (role?: string) =>
  role === 'MANAGER' ? 'Manager' : role === 'OWNER' ? 'Owner' : 'Employee';

function initials(name?: string) {
  if (!name) return 'P';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'P';
}

export function SideMenu({
  visible,
  onClose,
  session,
  onLogout,
}: {
  visible: boolean;
  onClose: () => void;
  session: any;
  onLogout: () => void;
}) {
  const [view, setView] = useState<MenuView>('ROOT');
  const { version, versionCode } = AutoUpdateService.getCurrentVersion();
  const companyName = session?.company?.name || session?.company_name || null;

  const close = () => {
    setView('ROOT');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close} />
      <View style={styles.panel}>
        {/* Top bar */}
        <View style={styles.topBar}>
          {view !== 'ROOT' ? (
            <TouchableOpacity onPress={() => setView('ROOT')} hitSlop={10} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backText}>Menu</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.topTitle}>Account</Text>
          )}
          <TouchableOpacity onPress={close} hitSlop={10}>
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {view === 'ROOT' && (
            <>
              {/* Profile summary */}
              <View style={styles.profileHead}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(session?.full_name)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName} numberOfLines={1}>{session?.full_name || 'Employee'}</Text>
                  <Text style={styles.profileSub} numberOfLines={1}>
                    {roleLabel(session?.role)}{session?.designation ? ` · ${session.designation}` : ''}
                  </Text>
                </View>
              </View>

              <MenuRow icon="👤" label="Profile" onPress={() => setView('PROFILE')} />
              <MenuRow icon="⚙️" label="Settings" onPress={() => setView('SETTINGS')} />
              <MenuRow icon="❓" label="Help & support" onPress={() => setView('HELP')} />
              <MenuRow icon="ℹ️" label="About" onPress={() => setView('ABOUT')} />

              <TouchableOpacity style={styles.logoutRow} onPress={() => { close(); onLogout(); }}>
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>
              <Text style={styles.versionLine}>{BRAND.productName} v{version} ({versionCode})</Text>
            </>
          )}

          {view === 'PROFILE' && (
            <>
              <Text style={styles.sectionTitle}>Profile</Text>
              <Field label="Name" value={session?.full_name} />
              <Field label="Role" value={roleLabel(session?.role)} />
              {session?.designation ? <Field label="Designation" value={session.designation} /> : null}
              <Field label="Phone" value={session?.phone} />
              {session?.email ? <Field label="Email" value={session.email} /> : null}
              {companyName ? <Field label="Company" value={companyName} /> : null}
              <Text style={styles.hintText}>
                To change your name, phone, password or device, ask your manager or company owner.
              </Text>
            </>
          )}

          {view === 'SETTINGS' && (
            <>
              <Text style={styles.sectionTitle}>Settings</Text>
              <MenuRow icon="⬆️" label="Check for app updates" onPress={() => AutoUpdateService.manualCheck()} />
              <MenuRow icon="🔔" label="Notification settings" sub="Open Android settings" onPress={() => Linking.openSettings().catch(() => undefined)} />
              <MenuRow icon="📍" label="Location & permissions" sub="Open Android settings" onPress={() => Linking.openSettings().catch(() => undefined)} />
            </>
          )}

          {view === 'HELP' && (
            <>
              <Text style={styles.sectionTitle}>Help & support</Text>
              <Text style={styles.hintText}>
                Ask your manager first for passwords, device resets and attendance fixes. For app problems, use the links below.
              </Text>
              <MenuRow icon="📋" label="FAQ" onPress={() => openUrl(`${BRAND.webUrl}${BRAND.faqPath}`)} />
              <MenuRow icon="💬" label="Support" onPress={() => openUrl(`${BRAND.webUrl}${BRAND.supportPath}`)} />
              <MenuRow icon="✉️" label={BRAND.supportEmail} onPress={() => openUrl(`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(`${BRAND.productName} app v${version}`)}`)} />
            </>
          )}

          {view === 'ABOUT' && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.aboutHead}>
                <Text style={styles.aboutApp}>{BRAND.productName}</Text>
                <Text style={styles.aboutVersion}>Version {version} (build {versionCode})</Text>
                <Text style={styles.aboutDev}>Developed by {BRAND.developerName}</Text>
              </View>
              <MenuRow icon="🌐" label="Website" onPress={() => openUrl(BRAND.developerUrl)} />
              <MenuRow icon="🔒" label="Privacy policy" onPress={() => openUrl(`${BRAND.webUrl}${BRAND.privacyPath}`)} />
              <MenuRow icon="📄" label="Terms of service" onPress={() => openUrl(`${BRAND.webUrl}${BRAND.termsPath}`)} />
              <MenuRow icon="🗑️" label="Delete my account" onPress={() => openUrl(`${BRAND.webUrl}${BRAND.accountDeletionPath}`)} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function MenuRow({ icon, label, sub, onPress }: { icon: string; label: string; sub?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

/** Hamburger icon (three bars) drawn from Views — crisp at any density, no emoji. */
export function HamburgerIcon({ color = '#0F172A' }: { color?: string }) {
  return (
    <View style={styles.hamburger}>
      <View style={[styles.hamburgerBar, { backgroundColor: color }]} />
      <View style={[styles.hamburgerBar, { backgroundColor: color }]} />
      <View style={[styles.hamburgerBar, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  panel: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: '82%', maxWidth: 360,
    backgroundColor: '#FFFFFF', paddingTop: 52, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 16,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 },
  topTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backArrow: { fontSize: 26, color: '#16A34A', marginRight: 4, marginTop: -3 },
  backText: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  closeX: { fontSize: 18, color: '#64748B', fontWeight: '700' },
  body: { paddingHorizontal: 18, paddingBottom: 40 },

  profileHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#166534', fontSize: 17, fontWeight: '800' },
  profileName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  profileSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowIcon: { fontSize: 18, width: 30 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  rowSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  rowChevron: { fontSize: 20, color: '#CBD5E1' },

  logoutRow: { marginTop: 20, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', backgroundColor: '#FEF2F2' },
  logoutText: { color: '#DC2626', fontSize: 14, fontWeight: '800' },
  versionLine: { textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 14 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8, marginTop: 2 },
  hintText: { fontSize: 12, color: '#64748B', lineHeight: 18, marginTop: 6, marginBottom: 6 },

  field: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  fieldLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, color: '#0F172A', fontWeight: '600', marginTop: 2 },

  aboutHead: { paddingVertical: 8, marginBottom: 6 },
  aboutApp: { fontSize: 20, fontWeight: '800', color: '#166534' },
  aboutVersion: { fontSize: 13, color: '#64748B', marginTop: 2 },
  aboutDev: { fontSize: 13, color: '#64748B', marginTop: 2 },

  hamburger: { width: 22, height: 16, justifyContent: 'space-between' },
  hamburgerBar: { height: 2.4, borderRadius: 2, width: '100%' },
});
