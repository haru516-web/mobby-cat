import { View } from 'react-native';
import type { AgeGroup } from '../../services/account/purchase';
import { C, T } from '../../ui/base';
import { ImgButton } from '../../ui/kit';
import { Popup } from '../../ui/Popup';

// 年齢の区分を、自己申告で選んでもらう。年齢に応じた、毎月の購入の上限のため（15歳以下 5,000円、16〜19歳 10,000円、20歳以上 上限なし）。
// 間違えて選んだときは、下げられるが、上げられない。
export function AgePopup({ visible, onPick, onClose }: { visible: boolean; onPick: (group: AgeGroup) => void; onClose: () => void }) {
  return (
    <Popup visible={visible} onClose={onClose} maxWidth={340} heightRatio={0.56}>
      <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <T w="x" size={18} style={{ textAlign: 'center' }}>年齢を教えてください</T>
        <T w="m" size={12} color={C.sub} style={{ textAlign: 'center', lineHeight: 18 }}>
          年齢に応じて、毎月の購入の上限が決まります。15歳以下は5,000円、16〜19歳は10,000円まで、20歳以上は上限がありません。あとから、小さい区分に変えることはできますが、大きい区分には変えられません。
        </T>
        <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 6 }}>
          <ImgButton skin="ghost-outline" label="15歳以下" height={46} fontSize={14} onPress={() => onPick('under16')} />
          <ImgButton skin="ghost-outline" label="16〜19歳" height={46} fontSize={14} onPress={() => onPick('16to19')} />
          <ImgButton skin="ghost-outline" label="20歳以上" height={46} fontSize={14} onPress={() => onPick('adult')} />
        </View>
        <T w="b" size={11} color={C.accent} onPress={onClose} style={{ marginTop: 4 }}>やめる</T>
      </View>
    </Popup>
  );
}
