import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmployeeApi } from '../services/EmployeeApi';
import { OwnerMap, MapMember } from '../components/OwnerMap';
import { Icon, IconName } from '../components/Icon';

type Tab = 'MAP' | 'TEAM' | 'SOS' | 'LEAVES';

interface Member {
  user_id: string;
  full_name: string;
  designation?: string;
  department_name?: string;
  shift_status: string;
  is_moving?: boolean;
  is_gps_disconnected?: boolean;
  has_tamper_alert?: boolean;
  battery_level?: number | null;
  current_location?: { latitude: number; longitude: number; address_name?: string } | null;
}

interface SosAlert {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  note?: string | null;
  status: string;
  created_at: string;
  user?: { full_name?: string; phone?: string; designation?: string | null } | null;
}

interface LeaveReq {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  user?: { full_name?: string; designation?: string | null } | null;
}

const TABS: Array<{ key: Tab; label: string; icon: IconName }> = [
  { key: 'MAP', label: 'Map', icon: 'mapPin' },
  { key: 'TEAM', label: 'Team', icon: 'users' },
  { key: 'SOS', label: 'SOS', icon: 'alert' },
  { key: 'LEAVES', label: 'Leaves', icon: 'calendar' },
];

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(iso).slice(0, 10);
  }
};

const statusColor = (m: Member) =>
  m.shift_status === 'CHECKED_IN' ? '#16A34A' : m.shift_status === 'ON_BREAK' ? '#D97706' : '#94A3B8';
const statusLabel = (m: Member) =>
  m.shift_status === 'CHECKED_IN' ? (m.is_gps_disconnected ? 'GPS lost' : m.is_moving ? 'Moving' : 'On duty')
    : m.shift_status === 'ON_BREAK' ? 'On break' : 'Off duty';

export default function OwnerAppScreen({ session, onLogout }: { session: any; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('MAP');
  const [team, setTeam] = useState<Member[]>([]);
  const [sos, setSos] = useState<SosAlert[]>([]);
  const [leaves, setLeaves] = useState<LeaveReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', phone: '', password: '', designation: '' });
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState('');

  const loadTeam = useCallback(async (bg = false) => {
    if (!bg) setLoading(true);
    try {
      const data: any = await EmployeeApi.ownerTeam(session);
      setTeam(Array.isArray(data) ? data : data?.members ?? []);
    } catch { /* keep last */ } finally { if (!bg) setLoading(false); }
  }, [session]);

  const loadSos = useCallback(async () => {
    try { const d: any = await EmployeeApi.ownerSos(session, false); setSos(d?.alerts ?? []); } catch { /* */ }
  }, [session]);

  const loadLeaves = useCallback(async () => {
    try { const d: any = await EmployeeApi.ownerLeaves(session, 'PENDING'); setLeaves(d?.requests ?? []); } catch { /* */ }
  }, [session]);

  useEffect(() => { loadTeam(); loadSos(); loadLeaves(); }, [loadTeam, loadSos, loadLeaves]);

  // Poll the team + active SOS while the app is open.
  useEffect(() => {
    const t = setInterval(() => { loadTeam(true); loadSos(); }, 20000);
    return () => clearInterval(t);
  }, [loadTeam, loadSos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTeam(true), loadSos(), loadLeaves()]);
    setRefreshing(false);
  };

  const mapMembers: MapMember[] = useMemo(
    () => team
      .filter((m) => m.current_location && (m.shift_status === 'CHECKED_IN' || m.shift_status === 'ON_BREAK'))
      .map((m) => ({
        user_id: m.user_id,
        full_name: m.full_name,
        latitude: m.current_location!.latitude,
        longitude: m.current_location!.longitude,
        moving: m.is_moving,
        stale: m.is_gps_disconnected,
      })),
    [team],
  );

  const onDuty = team.filter((m) => m.shift_status === 'CHECKED_IN' || m.shift_status === 'ON_BREAK').length;
  const activeSos = sos.filter((a) => a.status === 'ACTIVE');

  const resolveSos = (a: SosAlert, action: 'RESOLVE' | 'DISMISS') => {
    setBusyId(a.id);
    EmployeeApi.resolveSos(session, a.id, action)
      .then(() => loadSos())
      .catch((e: any) => Alert.alert('Could not update', e?.message || 'Try again'))
      .finally(() => setBusyId(''));
  };

  const reviewLeave = (l: LeaveReq, action: 'APPROVE' | 'REJECT') => {
    setBusyId(l.id);
    EmployeeApi.reviewLeave(session, l.id, action)
      .then(() => loadLeaves())
      .catch((e: any) => Alert.alert('Could not review', e?.message || 'Try again'))
      .finally(() => setBusyId(''));
  };

  const submitAdd = () => {
    if (!addForm.full_name.trim() || !addForm.phone.trim() || addForm.password.length < 6) {
      setAddErr('Name, phone, and a password of at least 6 characters are required.');
      return;
    }
    setAdding(true);
    setAddErr('');
    EmployeeApi.addEmployee(session, {
      full_name: addForm.full_name.trim(),
      phone: addForm.phone.trim(),
      password: addForm.password,
      designation: addForm.designation.trim() || undefined,
    })
      .then(() => {
        setAddOpen(false);
        setAddForm({ full_name: '', phone: '', password: '', designation: '' });
        loadTeam();
      })
      .catch((e: any) => setAddErr(e?.message || 'Could not add the employee.'))
      .finally(() => setAdding(false));
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{session?.company?.name || 'Your company'}</Text>
          <Text style={styles.sub}>{session?.full_name} · Owner</Text>
        </View>
        <TouchableOpacity onPress={() => loadTeam()} style={styles.hIcon} accessibilityLabel="Refresh"><Icon name="refresh" size={20} color="#334155" /></TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={styles.hIcon} accessibilityLabel="Log out"><Icon name="logout" size={20} color="#334155" /></TouchableOpacity>
      </View>

      {/* Summary strip */}
      <View style={styles.strip}>
        <Text style={styles.stripItem}><Text style={styles.stripNum}>{team.length}</Text> staff</Text>
        <Text style={styles.stripItem}><Text style={[styles.stripNum, { color: '#16A34A' }]}>{onDuty}</Text> on duty</Text>
        {activeSos.length > 0
          ? <Text style={styles.stripItem}><Text style={[styles.stripNum, { color: '#DC2626' }]}>{activeSos.length}</Text> SOS</Text>
          : <Text style={styles.stripItem}><Text style={[styles.stripNum, { color: '#16A34A' }]}>0</Text> SOS</Text>}
        <Text style={styles.stripItem}><Text style={[styles.stripNum, { color: '#B45309' }]}>{leaves.length}</Text> to approve</Text>
      </View>

      {/* Body */}
      <View style={{ flex: 1 }}>
        {tab === 'MAP' && (
          mapMembers.length > 0
            ? <OwnerMap members={mapMembers} />
            : <Empty icon="mapPin" title="No one on the map" text={loading ? 'Loading team…' : 'No employees are sharing location right now.'} />
        )}

        {tab === 'TEAM' && (
          <FlatList
            data={team}
            keyExtractor={(m) => m.user_id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />}
            ListHeaderComponent={
              <TouchableOpacity style={styles.addBtn} onPress={() => { setAddErr(''); setAddOpen(true); }}>
                <Icon name="users" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add team member</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={<Empty icon="users" title="No employees" text={loading ? 'Loading…' : 'Tap “Add team member” to add your first employee.'} />}
            contentContainerStyle={styles.list}
            renderItem={({ item: m }) => (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name}>{m.full_name}</Text>
                    <Text style={styles.meta}>{[m.designation, m.department_name].filter(Boolean).join(' · ') || '—'}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: statusColor(m) + '22', borderColor: statusColor(m) + '55' }]}>
                    <Text style={[styles.pillText, { color: statusColor(m) }]}>{statusLabel(m)}</Text>
                  </View>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.loc} numberOfLines={1}>
                    {m.current_location?.address_name || (m.shift_status === 'CHECKED_IN' ? 'Waiting for GPS' : 'No shift today')}
                  </Text>
                  {m.current_location && (
                    <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps?q=${m.current_location!.latitude},${m.current_location!.longitude}`)}>
                      <Text style={styles.link}>Map ›</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />
        )}

        {tab === 'SOS' && (
          <FlatList
            data={sos}
            keyExtractor={(a) => a.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />}
            ListEmptyComponent={<Empty icon="alert" title="No SOS alerts" text="Emergency alerts from the team appear here." />}
            contentContainerStyle={styles.list}
            renderItem={({ item: a }) => (
              <View style={[styles.card, a.status === 'ACTIVE' && styles.cardAlert]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{a.user?.full_name || 'Employee'}</Text>
                    <Text style={styles.meta}>{new Date(a.created_at).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: a.status === 'ACTIVE' ? '#FEE2E2' : '#F1F5F9', borderColor: a.status === 'ACTIVE' ? '#FCA5A5' : '#E2E8F0' }]}>
                    <Text style={[styles.pillText, { color: a.status === 'ACTIVE' ? '#DC2626' : '#64748B' }]}>{a.status}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps?q=${a.latitude},${a.longitude}`)}>
                  <Text style={styles.link}>Open live location (±{Math.round(a.accuracy)} m) ›</Text>
                </TouchableOpacity>
                {a.user?.phone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${a.user!.phone}`)}><Text style={styles.link}>Call {a.user.phone}</Text></TouchableOpacity>
                )}
                {a.status === 'ACTIVE' && (
                  <View style={styles.actions}>
                    <TouchableOpacity disabled={busyId === a.id} onPress={() => resolveSos(a, 'RESOLVE')} style={[styles.btn, styles.btnGreen]}>
                      <Text style={styles.btnText}>{busyId === a.id ? '…' : 'Mark resolved'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={busyId === a.id} onPress={() => resolveSos(a, 'DISMISS')} style={[styles.btn, styles.btnGrey]}>
                      <Text style={[styles.btnText, { color: '#334155' }]}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        )}

        {tab === 'LEAVES' && (
          <FlatList
            data={leaves}
            keyExtractor={(l) => l.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />}
            ListEmptyComponent={<Empty icon="calendar" title="No pending leaves" text="Requests awaiting your approval appear here." />}
            contentContainerStyle={styles.list}
            renderItem={({ item: l }) => (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{l.user?.full_name || 'Employee'}</Text>
                    <Text style={styles.meta}>{l.leave_type} · {l.total_days} day{l.total_days > 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.meta}>{fmtDate(l.start_date)} → {fmtDate(l.end_date)}</Text>
                </View>
                {!!l.reason && <Text style={styles.reason}>{l.reason}</Text>}
                <View style={styles.actions}>
                  <TouchableOpacity disabled={busyId === l.id} onPress={() => reviewLeave(l, 'APPROVE')} style={[styles.btn, styles.btnGreen]}>
                    <Text style={styles.btnText}>{busyId === l.id ? '…' : 'Approve'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={busyId === l.id} onPress={() => reviewLeave(l, 'REJECT')} style={[styles.btn, styles.btnRed]}>
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Bottom tabs */}
      <View style={styles.tabbar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const badge = t.key === 'SOS' ? activeSos.length : t.key === 'LEAVES' ? leaves.length : 0;
          return (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <View>
                <Icon name={t.icon} size={22} color={active ? '#16A34A' : '#94A3B8'} />
                {badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
              </View>
              <Text style={[styles.tabLabel, { color: active ? '#16A34A' : '#94A3B8' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && tab === 'MAP' && (
        <View style={styles.loadOverlay}><ActivityIndicator color="#16A34A" /></View>
      )}

      {/* Add employee */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => !adding && setAddOpen(false)}>
        <View style={styles.mBackdrop}>
          <View style={styles.mCard}>
            <Text style={styles.mTitle}>Add team member</Text>
            <Text style={styles.mSub}>They sign in on this app with the phone and password you set.</Text>
            <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#94A3B8" value={addForm.full_name} onChangeText={(t) => setAddForm((f) => ({ ...f, full_name: t }))} />
            <TextInput style={styles.input} placeholder="Phone (e.g. +91 98765 43210)" placeholderTextColor="#94A3B8" keyboardType="phone-pad" value={addForm.phone} onChangeText={(t) => setAddForm((f) => ({ ...f, phone: t }))} />
            <TextInput style={styles.input} placeholder="Temporary password (min 6)" placeholderTextColor="#94A3B8" secureTextEntry value={addForm.password} onChangeText={(t) => setAddForm((f) => ({ ...f, password: t }))} />
            <TextInput style={styles.input} placeholder="Designation (optional)" placeholderTextColor="#94A3B8" value={addForm.designation} onChangeText={(t) => setAddForm((f) => ({ ...f, designation: t }))} />
            {!!addErr && <Text style={styles.mErr}>{addErr}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity disabled={adding} onPress={() => setAddOpen(false)} style={[styles.btn, styles.btnGrey]}><Text style={[styles.btnText, { color: '#334155' }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={adding} onPress={submitAdd} style={[styles.btn, styles.btnGreen]}><Text style={styles.btnText}>{adding ? 'Adding…' : 'Add'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Empty({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={30} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  hello: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  hIcon: { padding: 8, marginLeft: 2 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  stripItem: { fontSize: 12, color: '#64748B' },
  stripNum: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  list: { padding: 12, gap: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  cardAlert: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  meta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  loc: { flex: 1, fontSize: 12, color: '#475569' },
  link: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  reason: { fontSize: 12, color: '#475569', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  btnGreen: { backgroundColor: '#16A34A' },
  btnRed: { backgroundColor: '#DC2626' },
  btnGrey: { backgroundColor: '#E2E8F0' },
  btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  tabbar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingBottom: 6, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '700' },
  badge: { position: 'absolute', top: -5, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 4 },
  emptyText: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  loadOverlay: { position: 'absolute', top: 120, alignSelf: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16A34A', paddingVertical: 11, borderRadius: 12, marginBottom: 8 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  mBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  mCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34, gap: 10 },
  mTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  mSub: { fontSize: 12, color: '#64748B', marginTop: -4, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0F172A' },
  mErr: { color: '#DC2626', fontSize: 12 },
});
