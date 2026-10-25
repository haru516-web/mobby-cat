import React, { forwardRef } from 'react';
import { View } from 'react-native';
import type { ViewRef } from '../lib/share';
import { CAT_BY_ID, CatImage, T } from './base';
import { RarityBadge } from './kit';
import { Backdrop, Pic } from './Slice';
import { UI, UIRect } from './uiAssets';

// SNS 向けの発見カード（share/discovery-card、4:5）。写真・文字は素材の差し込み領域に置く
export const DiscoveryCard = forwardRef<ViewRef, { id: string; day: string; reason?: string; width: number }>(function DiscoveryCard(
  { id, day, reason, width },
  ref,
) {
  const a = UI['share/discovery-card'];
  const cat = CAT_BY_ID[id];
  if (!a?.regions) return null;
  const k = width / a.w;
  const box = (r: UIRect) => ({ position: 'absolute' as const, left: r.x * k, top: r.y * k, width: r.w * k, height: r.h * k });
  const { photo, catName, rarity, encounterDate, conditionHint } = a.regions;
  const [y, m, d] = day.split('-').map(Number);
  return (
    <View ref={ref} collapsable={false} style={{ width, height: a.h * k }}>
      {/* 写真の窓は素材では透明なので、猫部屋を敷いて写真のように見せる */}
      <View style={[box(photo), { overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }]}>
        <Backdrop name="bg/room-home" />
        <CatImage id={id} size={photo.h * k * 0.92} />
      </View>
      <Pic name="share/discovery-card" width={width} style={{ position: 'absolute', left: 0, top: 0 }} />
      <View style={[box(catName), { justifyContent: 'center' }]}>
        <T w="x" size={catName.h * k * 0.5} numberOfLines={1}>{cat.name}</T>
      </View>
      <View style={[box(rarity), { alignItems: 'center', justifyContent: 'center' }]}>
        <RarityBadge cat={cat} limited={!!reason} height={rarity.h * k * 0.62} />
      </View>
      <View style={[box(encounterDate), { justifyContent: 'center' }]}>
        <T w="b" size={encounterDate.h * k * 0.55}>{`${y}年${m}月${d}日に出会いました`}</T>
      </View>
      <View style={[box(conditionHint), { justifyContent: 'center' }]}>
        <T w="m" size={conditionHint.h * k * 0.36} numberOfLines={2}>
          {reason ? `出会えた条件：${reason}` : 'ふらりと遊びに来てくれた子'}　#ねこモビー
        </T>
      </View>
    </View>
  );
});
