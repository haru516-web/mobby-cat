import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATS } from '../data/catalog';
import { useGame } from '../state/game';
import { Bobbing, Btn, C, CatImage, RarityTag } from '../ui';

export default function ZukanScreen() {
  const { state } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const have = CATS.filter((c) => state.owned[c.id]).length;
  const cat = CATS.find((c) => c.id === open);
  const o = open ? state.owned[open] : undefined;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>図鑑</Text>
      <Text style={s.sub}>{have} / {CATS.length} 種類</Text>
      <View style={s.grid}>
        {CATS.map((c, i) => {
          const own = state.owned[c.id];
          return (
            <Pressable key={c.id} style={s.cell} onPress={() => setOpen(c.id)}>
              <CatImage id={c.id} size={90} silhouette={!own} />
              <Text style={s.no}>No.{String(i + 1).padStart(2, '0')}</Text>
              <Text style={s.name} numberOfLines={1}>{own ? c.name : '？？？'}</Text>
              {!!own && own.count > 1 && <Text style={s.badge}>×{own.count}</Text>}
            </Pressable>
          );
        })}
      </View>

      <Modal visible={!!cat} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={s.overlay} onPress={() => setOpen(null)}>
          {cat && (
            <View style={s.sheet}>
              <Bobbing><CatImage id={cat.id} size={200} silhouette={!o} /></Bobbing>
              <Text style={s.dn}>{o ? cat.name : '？？？'}</Text>
              <RarityTag r={cat.rarity} />
              {o ? (
                <View style={{ marginTop: 10, alignItems: 'center', gap: 2 }}>
                  <Text style={s.info}>初めて出会った日：{o.firstDay}</Text>
                  {!!o.firstReason && <Text style={s.info}>きっかけ：{o.firstReason}</Text>}
                  <Text style={s.info}>所持数：{o.count}</Text>
                </View>
              ) : (
                <Text style={[s.info, { marginTop: 10 }]}>まだ出会っていません。特別な日に会えるかも…？</Text>
              )}
              <View style={{ marginTop: 16, alignSelf: 'stretch' }}><Btn kind="ghost" label="閉じる" onPress={() => setOpen(null)} /></View>
            </View>
          )}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '800', color: C.ink },
  sub: { color: C.sub, marginTop: 4, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '31.5%', backgroundColor: C.card, borderRadius: 14, padding: 6, alignItems: 'center' },
  no: { fontSize: 10, color: C.sub },
  name: { fontSize: 11, fontWeight: '700', color: C.ink },
  badge: { position: 'absolute', top: 4, right: 6, fontSize: 11, fontWeight: '800', color: C.accent },
  overlay: { flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: C.bg, borderRadius: 24, padding: 20, alignItems: 'center' },
  dn: { fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 6, marginBottom: 4 },
  info: { color: C.ink, fontSize: 13 },
});
