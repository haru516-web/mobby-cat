import { forwardRef } from 'react';
import { View } from 'react-native';
import { cardReason, conditionTotal } from '../../core/conditions';
import type { ViewRef } from '../../services/share';
import { CAT_BY_ID, CatImage, T } from '../../ui/base';
import { RarityBadge } from '../../ui/kit';
import { Backdrop, Pic } from '../../ui/Slice';
import { UI, UIRect } from '../../ui/uiAssets';

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
      {/* 写真の窓は素材では透明で、差し込み領域よりひとまわり大きい。
          足跡柄の背景を窓より広く敷き、上に重ねるカード枠で縁を隠して、後ろの画面が透けないようにする */}
      <View style={{ position: 'absolute', left: (photo.x - 40) * k, top: (photo.y - 50) * k, width: (photo.w + 80) * k, height: (photo.h + 90) * k, overflow: 'hidden' }}>
        <Backdrop name="bg/app-cream" />
      </View>
      <View style={[box(photo), { alignItems: 'center', justifyContent: 'center' }]}>
        <CatImage id={id} size={photo.h * k * 0.92} />
      </View>
      <Pic name="share/discovery-card" width={width} style={{ position: 'absolute', left: 0, top: 0 }} />
      <View style={[box(catName), { justifyContent: 'center' }]}>
        <T w="x" size={catName.h * k * 0.5} numberOfLines={1}>{cat.name}</T>
      </View>
      <View style={[box(rarity), { alignItems: 'center', justifyContent: 'center' }]}>
        <RarityBadge cat={cat} height={rarity.h * k * 0.62} />
      </View>
      <View style={[box(encounterDate), { justifyContent: 'center' }]}>
        <T w="b" size={encounterDate.h * k * 0.55}>{`${y}年${m}月${d}日に出会いました`}</T>
      </View>
      <View style={[box(conditionHint), { justifyContent: 'center' }]}>
        <T w="m" size={conditionHint.h * k * 0.36} numberOfLines={2}>
          {reason ? `出会えた条件${conditionTotal(id) > 1 ? `（全${conditionTotal(id)}つのうちの1つ）` : ''}：${cardReason(id, reason)}` : 'ふらりと遊びに来てくれた子'}　#にゃこモビー
        </T>
      </View>
    </View>
  );
});
