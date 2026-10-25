import { AnchorId } from '../../ui/TourAnchor';
import { TabKey } from '../../ui/kit';

// 初回起動後（相棒を選んだあと）に流れるチュートリアル。設定（右上の「設定」）からいつでも見返せる。
// 画面の該当箇所を明るく残して短い説明を出すだけで、下の画面は操作できない。
export type TourStep = {
  tab: TabKey; // この段で開いておくタブ
  anchor?: AnchorId; // 明るく残す場所（なければ説明だけ）
  nav?: TabKey; // 下のタブバーの、この1つだけを明るく残す
  title: string;
  detail: string;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    tab: 'home', anchor: 'header-items', title: 'お迎え券とまたたび',
    detail: 'お迎え券は、気になる子を追加で迎えるチケット。またたびは、今日の出会いの候補を増やします。タップするとショップが開きます。この説明は、右上の「設定」からいつでも見返せます。',
  },
  {
    tab: 'home', anchor: 'header-bell', title: 'ベル',
    detail: 'お知らせ、出会いの履歴、これから会えるかもしれない猫の予告が見られます。新しいお知らせがあると赤い点がつきます。',
  },
  {
    tab: 'home', anchor: 'home-room', title: '猫部屋',
    detail: '迎えた猫が暮らします。猫をタップするとなでられて、ハートが出ます。「さつえい」では猫と一緒に写真が撮れます。',
  },
  {
    tab: 'home', anchor: 'home-deai', title: '今日の出会い',
    detail: '毎日20時に新しい出会いが届きます。通知を許可しなくても、ここから受け取れます。',
  },
  {
    tab: 'deai', anchor: 'deai-hero', title: '無料のお迎えは1日1匹',
    detail: '開けなかった日も、次の日まで受け取れます。次の出会いまでの時間と、これから会える猫の予告もここから見られます。',
  },
  {
    tab: 'deai', anchor: 'deai-grid', title: '3匹の候補から選ぶ',
    detail: '気になる子をタップして、無料で1匹迎えましょう。「限定」の猫は、その日の条件がそろったときだけ現れます。',
  },
  {
    tab: 'deai', title: 'もっと迎えたいとき',
    detail: '無料の1匹を迎えたあと、お迎え券で候補の中から追加で迎えられます。またたびを使うと、見える候補が1匹ずつ増えます。またたびパスに入ると、毎日の候補が3匹から6匹になります。',
  },
  {
    tab: 'zukan', nav: 'zukan', title: '図鑑',
    detail: '迎えた猫が記録されます。まだ会えていない子はシルエットとヒントで、出会う条件を探せます。',
  },
  {
    tab: 'world', nav: 'world', title: '世界',
    detail: '世界を旅する猫や、みんなの目標が見られます。今はサンプル表示です。',
  },
];
