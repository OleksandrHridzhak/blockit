import { useThemeStyles, useAppTheme } from '@/features/appearance/theme';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ListRow, ListSection, ui as sharedUI } from './protection-ui';
import { parseSessionMinutes } from '@/core/session-duration';
import type { QuickTarget } from '@/features/groups/quick-actions';

export type QuickPanel = { target: QuickTarget; mode: 'pause' | 'all' | 'delete'; suspended: boolean };

export function QuickActionsSheet({ panel, onClose, onApply, onRemove }: {
  panel: QuickPanel; onClose: () => void; onApply: (minutes: number) => Promise<void>; onRemove: () => Promise<void>;
}) {
  const appleTheme = useAppTheme();
  const ui = useThemeStyles(sharedUI);
  const [text, setText] = useState('15');
  const [confirmDelete, setConfirmDelete] = useState(panel.mode === 'delete');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const minutes = parseSessionMinutes(text);
  async function perform(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await task(); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося виконати дію. Спробуй ще раз.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Закрити швидкі дії" disabled={busy} onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['bottom']} accessibilityViewIsModal style={{ backgroundColor: appleTheme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[ui.title, { flex: 1 }]}>{confirmDelete ? 'Видалити?' : 'Швидкі дії'}</Text>
            <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: appleTheme.tint }}>Закрити</Text></Pressable>
          </View>
          <Text style={ui.body}>{panel.target.name}</Text>
          {confirmDelete ? <>
            <Text style={ui.mutedText}>{panel.target.kind === 'group' ? 'Групу буде видалено, а блокування її застосунків припиниться. Історія залишиться.' : 'Застосунок буде прибрано зі списку блокування. Історія залишиться.'}</Text>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void perform(onRemove)} style={{ backgroundColor: '#762A30', padding: 16, borderRadius: 12 }}>
              <Text style={[ui.body, { textAlign: 'center' }]}>{busy ? 'Видаляємо…' : 'Видалити'}</Text>
            </Pressable>
            <Action secondary label="Скасувати" disabled={busy} onPress={onClose} />
          </> : <>
            <Text style={ui.mutedText}>Тимчасово вимкнути захист лише для {panel.target.kind === 'group' ? 'цієї групи' : 'цього застосунку'}. Після вибраного часу захист відновиться.</Text>
            <ListSection>
              {[15, 60].map(value => <ListRow key={value} disabled={busy} onPress={() => void perform(() => onApply(value))}><Text style={ui.body}>{value === 60 ? 'На 1 годину' : 'На 15 хвилин'}</Text></ListRow>)}
              <ListRow showSeparator={false}><Text style={[ui.body, { flex: 1 }]}>Власний час, хв</Text>
                <TextInput accessibilityLabel="Тривалість призупинення у хвилинах" value={text} onChangeText={setText} editable={!busy} inputMode="numeric" keyboardType="number-pad" maxLength={4} selectTextOnFocus
                  style={{ color: appleTheme.label, backgroundColor: appleTheme.tertiaryBg, borderRadius: 8, padding: 12, minWidth: 70, textAlign: 'center' }} />
              </ListRow>
            </ListSection>
            <Action label={busy ? 'Зберігаємо…' : 'Призупинити'} disabled={busy || minutes === null} onPress={() => void perform(() => onApply(minutes!))} />
            {minutes === null && <Text style={{ color: appleTheme.red }}>Введи цілу кількість хвилин від 1 до 1440.</Text>}
            {panel.mode === 'all' && <ListSection>
              {panel.suspended && <ListRow disabled={busy} onPress={() => void perform(() => onApply(0))}><Text style={ui.body}>Відновити захист</Text></ListRow>}
              <ListRow disabled={busy} onPress={() => void perform(() => onApply(-1))}><Text style={ui.body}>Вимкнути до ручного ввімкнення</Text></ListRow>
              <ListRow disabled={busy} showSeparator={false} onPress={() => setConfirmDelete(true)}><Text style={{ color: appleTheme.red, fontSize: 17 }}>Видалити зі списку</Text></ListRow>
            </ListSection>}
          </>}
          {error !== '' && <Text accessibilityRole="alert" style={{ color: appleTheme.red }}>{error}</Text>}
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}
