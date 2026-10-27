import { useState } from 'react';
import { Text, View } from 'react-native';
import { APP_CATALOG, getCatalogApp } from '@/core/catalog';
import { getReturnTarget, setReturnTarget } from '@/features/intervention/return-target';
import { ListRow, ListSection, appleTheme, ui } from './protection-ui';

export function ReturnAppSetting({ tokenId, disabled = false, onChange }: {
  tokenId: string; disabled?: boolean; onChange?: (target: string | null) => void;
}) {
  const [selected, setSelected] = useState(() => getReturnTarget(tokenId));
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  function choose(target: string | null) {
    try {
      setReturnTarget(tokenId, target);
      setSelected(target); setExpanded(false); setError(''); onChange?.(target);
    } catch { setError('Не вдалося зберегти вибір. Спробуй ще раз.'); }
  }
  return <ListSection title="ПОВЕРНЕННЯ ПІСЛЯ ПАУЗИ" footer={error || 'Вибери цей застосунок один раз. Після завершення паузи Blockit відкриє його, якщо ти залишаєшся на екрані паузи.'}>
    <ListRow disabled={disabled} onPress={() => setExpanded(!expanded)} showSeparator={expanded}>
      <View style={{ flex: 1, gap: 4 }}><Text style={ui.body}>Відкривати після паузи</Text>
        <Text style={ui.mutedText}>{selected ? getCatalogApp(selected)?.name : 'Вибрати застосунок'}</Text></View>
      <Text style={{ color: appleTheme.tint }}>{expanded ? 'Згорнути' : 'Змінити'}</Text>
    </ListRow>
    {expanded && <>
      {APP_CATALOG.map(entry => <ListRow key={entry.id} disabled={disabled} onPress={() => choose(entry.id)}>
        <Text style={[ui.body, { color: selected === entry.id ? appleTheme.tint : appleTheme.label }]}>{entry.name}</Text>
      </ListRow>)}
      <ListRow disabled={disabled} showSeparator={false} onPress={() => choose(null)}><Text style={ui.body}>Залишатися в Blockit</Text></ListRow>
    </>}
  </ListSection>;
}
