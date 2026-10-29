import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SUPPORT_EMAIL } from '../data/appInfo';
import { C, T } from './base';
import { ImgButton } from './kit';
import { Backdrop } from './Slice';

// 画面の描画で予期しないエラーが起きたときに、真っ白にせず、開き直す方法とお問い合わせ先を見せる（C-03）。
// 「もう一度ひらく」は、記録を読み込むところから作り直す（端末の記録はそのまま）
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean; key: number }> {
  state = { failed: false, key: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Render failed', error instanceof Error ? error.message : String(error));
  }

  render() {
    if (!this.state.failed) return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
    return (
      <View style={s.fill}>
        <Backdrop name="bg/screen-zukan" />
        <View style={s.box}>
          <T w="x" size={18} style={s.center}>うまく表示できませんでした</T>
          <T w="m" size={12} color={C.sub} style={[s.center, { lineHeight: 19 }]}>
            記録はそのまま残っています。もう一度ひらいても続くときは、アプリを閉じて開き直すか、お問い合わせください。
          </T>
          <ImgButton label="もう一度ひらく" height={46} onPress={() => this.setState((v) => ({ failed: false, key: v.key + 1 }))} style={{ alignSelf: 'stretch' }} />
          {!!SUPPORT_EMAIL && (
            <ImgButton skin="ghost-outline" label="お問い合わせ" height={42} fontSize={13} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('にゃっコレ 表示の不具合')}`).catch(() => {})} style={{ alignSelf: 'stretch' }} />
          )}
        </View>
      </View>
    );
  }
}

const s = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  box: { width: '100%', maxWidth: 360, padding: 24, gap: 12, alignItems: 'center' },
  center: { textAlign: 'center' },
});
