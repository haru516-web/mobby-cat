// ホームの背景。ここに足せば、ホームの「ホームに出す子」画面の背景えらびに出る。
// front / back は猫の置き場所の縦位置（部屋の高さに対する割合）。手前の3匹（1〜3番）と奥の3匹（4〜6番）。
// 奥の列は、背景の奥にいる人や像（画面の上から3〜4割）に重ならないように、背景ごとに決める
export type HomeBg = { id: string; name: string; src: number; front: [number, number, number]; back: [number, number, number] };

export const HOME_BGS: HomeBg[] = [
  { id: 'room', name: 'おへや', src: require('../../assets/ui/bg/room-home-full.png'), front: [0.62, 0.6, 0.66], back: [0.32, 0.34, 0.25] },
  { id: 'street', name: '商店街', src: require('../../assets/ui/bg/room-home-street.webp'), front: [0.68, 0.66, 0.7], back: [0.4, 0.41, 0.39] },
  { id: 'golden', name: '金の本堂', src: require('../../assets/ui/bg/room-home-golden.webp'), front: [0.68, 0.66, 0.7], back: [0.42, 0.43, 0.41] },
  { id: 'monk', name: 'おつとめ', src: require('../../assets/ui/bg/room-home-monk.webp'), front: [0.68, 0.66, 0.7], back: [0.42, 0.43, 0.41] },
  { id: 'shrine', name: '桜の神社', src: require('../../assets/ui/bg/room-home-shrine.webp'), front: [0.68, 0.66, 0.7], back: [0.44, 0.45, 0.43] },
];
export const DEFAULT_HOME_BG = HOME_BGS[0];
export const homeBgOf = (id: string | null | undefined): HomeBg => HOME_BGS.find((b) => b.id === id) ?? DEFAULT_HOME_BG;
