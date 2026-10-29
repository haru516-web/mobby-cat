import { AnchorId } from '../../ui/TourAnchor';
import { TabKey, WORLD_ON } from '../../ui/kit';

// 初回起動後（相棒を選んだあと）に流れるチュートリアル。設定（右上の「設定」）からいつでも見返せる。
// 利用者が押せるのは「もどる」「つぎへ」「スキップ」だけ。画面は、その段の説明に合う状態を実際に映す（タブを切り替える・ショップやお知らせを開く）。
export type TourPopup = 'shop' | 'notice';

export type TourStep = {
  tab: TabKey; // この段で開いておくタブ
  anchor?: AnchorId; // 明るく残す場所（なければ画面ぜんぶ）
  nav?: TabKey; // 下のナビボタンの、この1つだけを明るく残す
  popup?: TourPopup; // あれば、この段のあいだ、ショップ／お知らせを開いておく（説明はポップの中に出す）
  title: string;
  detail: string;
  items?: { icon: string; name: string; text: string }[]; // 画像つきの説明を、項目ごとに並べる
};

const ALL_STEPS: TourStep[] = [
  {
    tab: 'home', anchor: 'home-room',
    title: '猫部屋',
    detail: '迎えた猫が暮らします。猫をタップするとなでられて、ハートが出ます。「さつえい」では猫と一緒に写真が撮れます。',
  },
  {
    tab: 'home', popup: 'notice',
    title: 'ベル',
    detail: 'お知らせ、出会いの履歴、これから会えるかもしれない猫の予告が見られます。新しいお知らせがあると赤い点がつきます。',
  },
  {
    tab: 'deai', nav: 'deai',
    title: '今日の出会い',
    detail: '毎日20時に新しい出会いが届きます。通知を許可しなくても、ここから受け取れます。',
  },
  {
    tab: 'deai', anchor: 'deai-hero', title: '無料のお迎えは1日1匹',
    detail: '開けなかった日も、次の日まで受け取れます。次の出会いまでの時間もここから見られます。',
  },
  {
    tab: 'deai', anchor: 'deai-grid', title: '候補から選ぶ',
    detail: '気になる子をタップして、無料で1匹迎えましょう。どの猫も、その日の条件（歩数・天気・時間帯など）がそろった日にだけ、候補に入ります。シルエットの子は、またたびで見えるようになります。',
  },
  {
    tab: 'deai', title: 'もっと迎えたいとき',
    detail: '3つのアイテムで、迎えられる猫がふえます。',
    items: [
      { icon: 'icon/ticket-paw', name: 'お迎え券', text: '無料の1匹のあとに、好きな子を1匹ずつ追加で迎えられます。1枚で1匹。' },
      { icon: 'icon/matatabi-leaf', name: 'またたび', text: '迎える前に使うと、隠れているシルエットの子が1匹見えるようになります。1個で1匹。' },
      { icon: 'icon/matatabi-bag', name: 'またたびパス', text: '条件がそろった子を、毎日はじめから最大6匹まで見られて、毎月お迎え券が8枚届きます。いつでも解約できます。' },
    ],
  },
  {
    tab: 'deai', anchor: 'header-items',
    title: 'ショップの入口',
    detail: '画面の上にある、お迎え券とまたたびの数の表示がボタンです。ここを押すと、ショップが開きます。',
  },
  {
    tab: 'deai', popup: 'shop',
    title: 'ショップ',
    detail: 'お迎え券、またたび、またたびパスを手に入れられます。買わなくても、候補がいる日は1匹を無料で迎えられます。',
  },
  {
    tab: 'zukan', nav: 'zukan', title: '図鑑',
    detail: `迎えた猫が記録されます。まだ会えていない子はシルエットとヒントで、出会う条件を探せます。${WORLD_ON ? '' : 'このチュートリアルは、右上の「設定」からいつでも見返せます。'}`,
  },
  {
    tab: 'world', nav: 'world', title: '世界',
    detail: '世界を旅する猫や、みんなの目標が見られます。このチュートリアルは、右上の「設定」からいつでも見返せます。',
  },
];

// 世界を出さないあいだは、世界の段を外す
export const TOUR_STEPS: readonly TourStep[] = ALL_STEPS.filter((st) => WORLD_ON || st.tab !== 'world');
