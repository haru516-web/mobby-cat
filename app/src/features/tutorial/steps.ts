import { AnchorId } from '../../ui/TourAnchor';
import { TabKey } from '../../ui/kit';

// 初回起動後（相棒を選んだあと）に流れるチュートリアル。設定（右上の「設定」）からいつでも見返せる。
// 光っている場所を、実際に押してもらってから説明する段（expect あり）と、説明だけの段（expect なし）がある。
// 光っている場所以外は押せない。「もどる」「スキップ」はいつでも使える。
export type TourExpect = 'shop' | 'notice' | 'pet' | TabKey; // 押したときに起きること（ショップが開く／お知らせが開く／猫をなでる／タブが変わる）

export type TourStep = {
  tab: TabKey; // この段で開いておくタブ
  anchor?: AnchorId; // 明るく残す場所（なければ説明だけ）
  nav?: TabKey; // 下のナビボタンの、この1つだけを明るく残す
  expect?: TourExpect; // あれば、光っている場所を押してもらう
  point?: string; // 押してもらうあいだに出す、短い案内
  title: string;
  detail: string; // 押したあと（または説明だけの段）に出す説明
  items?: { icon: string; name: string; text: string }[]; // 画像つきの説明を、項目ごとに並べる
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    tab: 'home', anchor: 'header-items', expect: 'shop', point: 'お迎え券とまたたびの表示を、押してみよう',
    title: 'お迎え券とまたたび',
    detail: 'お迎え券は、気になる子を追加で迎えるチケット。またたびは、隠れている候補を見えるようにします。ここから、ショップで手に入れられます。この説明は、右上の「設定」からいつでも見返せます。',
  },
  {
    tab: 'home', anchor: 'header-bell', expect: 'notice', point: 'ベルを押してみよう',
    title: 'ベル',
    detail: 'お知らせ、出会いの履歴、これから会えるかもしれない猫の予告が見られます。新しいお知らせがあると赤い点がつきます。',
  },
  {
    tab: 'home', anchor: 'home-room', expect: 'pet', point: '猫をタップして、なでてみよう',
    title: '猫部屋',
    detail: '迎えた猫が暮らします。猫をタップするとなでられて、ハートが出ます。「さつえい」では猫と一緒に写真が撮れます。',
  },
  {
    tab: 'home', nav: 'deai', expect: 'deai', point: '下の「出会い」を押して、出会いの画面に進もう',
    title: '今日の出会い',
    detail: '毎日20時に新しい出会いが届きます。通知を許可しなくても、ここから受け取れます。',
  },
  {
    tab: 'deai', anchor: 'deai-hero', title: '無料のお迎えは1日1匹',
    detail: '開けなかった日も、次の日まで受け取れます。次の出会いまでの時間と、これから会える猫の予告もここから見られます。',
  },
  {
    tab: 'deai', anchor: 'deai-grid', title: '候補から選ぶ',
    detail: '気になる子をタップして、無料で1匹迎えましょう。シルエットの子は、またたびで見えるようになります。「限定」の猫は、その日の条件がそろったときだけ現れます。',
  },
  {
    tab: 'deai', title: 'もっと迎えたいとき',
    detail: '3つのアイテムで、迎えられる猫がふえます。',
    items: [
      { icon: 'icon/ticket-paw', name: 'お迎え券', text: '無料の1匹のあとに、好きな子を1匹ずつ追加で迎えられます。1枚で1匹。' },
      { icon: 'icon/matatabi-leaf', name: 'またたび', text: '迎える前に使うと、隠れているシルエットの子が1匹見えるようになります。1個で1匹。' },
      { icon: 'icon/matatabi-bag', name: 'またたびパス', text: '毎日の候補がはじめから6匹になり、毎月お迎え券が3枚届きます。いつでも解約できます。' },
    ],
  },
  {
    tab: 'deai', nav: 'zukan', expect: 'zukan', point: '下の「図鑑」を押してみよう',
    title: '図鑑へ',
    detail: '',
  },
  {
    tab: 'zukan', title: '図鑑',
    detail: '迎えた猫が記録されます。まだ会えていない子はシルエットとヒントで、出会う条件を探せます。',
  },
  {
    tab: 'zukan', nav: 'world', expect: 'world', point: '下の「世界」を押してみよう',
    title: '世界へ',
    detail: '',
  },
  {
    tab: 'world', title: '世界',
    detail: '世界を旅する猫や、みんなの目標が見られます。今はサンプル表示です。',
  },
];
