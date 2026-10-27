import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, AppBadge, appleTheme, ListRow, ListSection, Page, ui } from '@/components/protection-ui';
import { attemptTrend, protectionStats } from '@/core/protection-stats';
import { screenTime } from '@/features/screen-time/client';

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export default function StatsScreen() {
  const [data, setData] = useState(() => protectionStats([], Date.now(), timeZone()));
  const [now, setNow] = useState(() => Date.now());
  const [period, setPeriod] = useState<'days' | 'weeks'>('days');
  const [chartWidth, setChartWidth] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const history = await screenTime.history();
      const updatedAt = Date.now();
      setData(protectionStats(history, updatedAt, timeZone()));
      setNow(updatedAt);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося завантажити статистику.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    void refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => listener.remove();
  }, [refresh]));

  const trend = attemptTrend(data.history, now, timeZone());
  const bars = period === 'days' ? trend.days : trend.weeks;
  const max = Math.max(1, ...bars.map(bar => bar.attempts));
  const chartPoints = bars.map((bar, i) => ({
    x: 14 + i * Math.max(0, chartWidth - 28) / Math.max(1, bars.length - 1),
    y: 125 - (bar.attempts / max) * 92,
  }));
  const comparison = trend.change === null ? 'Порівняння з’явиться, коли буде достатньо історії'
    : trend.change === 0 ? 'Без змін порівняно з попередніми 7 днями'
    : `${Math.abs(trend.change)}% ${trend.change < 0 ? 'менше' : 'більше'}, ніж за попередні 7 днів`;

  return <Page>
    <View style={styles.header}><Text style={ui.largeTitle}>Статистика</Text><Text style={styles.subtitle}>Твоя увага з часом</Text></View>
    {error !== '' && <View accessibilityLiveRegion="polite"><Text style={ui.body}>{error}</Text><Action secondary label="Спробувати ще раз" onPress={() => void refresh()} /></View>}
    {loading && <Text style={ui.mutedText}>Завантажуємо статистику…</Text>}
    <View style={styles.card}>
      <Text style={styles.overline}>СПРОБИ ВІДКРИТИ</Text>
      <Text style={styles.number}>{trend.current}</Text>
      <Text style={styles.subtitle}>початків пауз за останні 7 днів</Text>
      <Text style={styles.comparison}>{comparison}</Text>
      <View style={styles.segment}>
        {(['days', 'weeks'] as const).map(value => <Pressable key={value} accessibilityRole="button"
          accessibilityState={{ selected: period === value }} onPress={() => setPeriod(value)}
          style={[styles.segmentItem, period === value && styles.segmentSelected]}>
          <Text style={[styles.segmentText, period === value && styles.segmentTextSelected]}>{value === 'days' ? 'Дні' : 'Тижні'}</Text>
        </Pressable>)}
      </View>
      <View style={styles.plot} onLayout={event => setChartWidth(event.nativeEvent.layout.width)}>
        <View style={styles.baseline} />
        {chartWidth > 0 && chartPoints.slice(1).map((point, index) => {
          const previous = chartPoints[index];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.hypot(dx, dy);
          return <View key={`line-${index}`} pointerEvents="none" style={[styles.line, {
            width: length, left: (point.x + previous.x - length) / 2,
            top: (point.y + previous.y) / 2, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
          }]} />;
        })}
        {chartWidth > 0 && bars.map((bar, i) => <View key={`${period}-${bar.label}`} style={[styles.pointContainer, { left: chartPoints[i].x - 20, top: chartPoints[i].y - 24 }]}
          accessible accessibilityLabel={`${bar.label}: ${bar.attempts} початків пауз`}>
          <Text style={styles.pointValue}>{bar.attempts}</Text><View style={styles.point} />
        </View>)}
      </View>
      <View style={styles.labels}>{bars.map(bar => <Text key={bar.label} style={styles.barLabel}>{bar.label}</Text>)}</View>
      <Text style={styles.footnote}>Рахуємо початки пауз після натискання кнопки на екрані блокування. {period === 'weeks' ? 'Кожна точка — 7 днів; остання включає сьогодні.' : 'Кожна точка — один день.'}</Text>
    </View>
    <View style={styles.savedCard}>
      <Text style={styles.overline}>ЗЕКОНОМЛЕНИЙ ЧАС</Text>
      <Text style={styles.savedValue}>Поки недоступно</Text>
      <Text style={styles.footnote}>Дані Screen Time для оцінки зекономленого часу ще не підключено.</Text>
    </View>
    <ListSection title="ПРОГРЕС ЗА ГРУПАМИ" footer="За збереженою історією пауз.">
      {data.groups.length === 0 ? <ListRow showSeparator={false}><Text style={ui.mutedText}>Поки немає даних</Text></ListRow> : data.groups.map((group, index) =>
        <ListRow key={group.id} showSeparator={index < data.groups.length - 1}>
          <AppBadge name={group.name} size={32} />
          <View style={{ flex: 1 }}><Text style={styles.groupName}>{group.name}</Text><Text style={styles.footnote}>{group.dismissed} відмов · {group.continued} доступів</Text></View>
          <Text style={styles.groupCount}>{group.attempts}</Text>
        </ListRow>)}
    </ListSection>
  </Page>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, paddingTop: 8, gap: 4 },
  subtitle: { fontFamily: ui.body.fontFamily, fontSize: 15, color: appleTheme.secondaryLabel },
  card: { backgroundColor: appleTheme.secondaryBg, borderRadius: 16, padding: 20, gap: 7 },
  overline: { fontFamily: ui.body.fontFamily, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, color: appleTheme.secondaryLabel },
  number: { fontFamily: ui.body.fontFamily, fontSize: 52, fontWeight: '700', letterSpacing: -1.5, color: appleTheme.label },
  comparison: { fontFamily: ui.body.fontFamily, fontSize: 13, color: appleTheme.tint, marginTop: 4 },
  segment: { flexDirection: 'row', backgroundColor: appleTheme.tertiaryBg, borderRadius: 9, padding: 3, marginTop: 16 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7 },
  segmentSelected: { backgroundColor: appleTheme.fill },
  segmentText: { fontFamily: ui.body.fontFamily, color: appleTheme.secondaryLabel, fontSize: 13, fontWeight: '600' },
  segmentTextSelected: { color: appleTheme.label },
  plot: { height: 145, marginTop: 16, position: 'relative' },
  baseline: { position: 'absolute', left: 0, right: 0, top: 126, height: 1, backgroundColor: appleTheme.separatorSubtle },
  line: { position: 'absolute', height: 2, backgroundColor: appleTheme.tint },
  pointContainer: { position: 'absolute', width: 40, height: 28, alignItems: 'center', justifyContent: 'space-between' },
  pointValue: { fontFamily: ui.body.fontFamily, color: appleTheme.secondaryLabel, fontSize: 11 },
  point: { width: 8, height: 8, borderRadius: 4, backgroundColor: appleTheme.tint },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { fontFamily: ui.body.fontFamily, color: appleTheme.secondaryLabel, fontSize: 10 },
  footnote: { fontFamily: ui.body.fontFamily, color: appleTheme.secondaryLabel, fontSize: 12, lineHeight: 17 },
  savedCard: { backgroundColor: appleTheme.secondaryBg, borderRadius: 16, padding: 20, gap: 8 },
  savedValue: { fontFamily: ui.body.fontFamily, color: appleTheme.label, fontSize: 20, fontWeight: '600' },
  groupName: { fontFamily: ui.body.fontFamily, color: appleTheme.label, fontSize: 16, fontWeight: '500' },
  groupCount: { fontFamily: ui.body.fontFamily, color: appleTheme.label, fontSize: 16, fontWeight: '600' },
});
