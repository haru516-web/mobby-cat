// ホームの背景。ここに足せば、ホームの「ホームに出す子」画面の背景えらびに出る。
// top：背景の奥にいる人や像の足元の高さ（部屋の高さに対する割合）。猫は、遠近をつけて（奥ほど小さく）これより下に並ぶ
export type HomeBg = { id: string; name: string; src: number; top: number };

export const HOME_BGS: HomeBg[] = [
  { id: 'lantern', name: '提灯の座敷', src: require('../../assets/ui/bg/room-home-lantern.webp'), top: 0.41 },
  { id: 'room', name: 'おへや', src: require('../../assets/ui/bg/room-home-full.png'), top: 0.27 },
  { id: 'street', name: '商店街', src: require('../../assets/ui/bg/room-home-street.webp'), top: 0.4 },
  { id: 'golden', name: '金の本堂', src: require('../../assets/ui/bg/room-home-golden.webp'), top: 0.42 },
  { id: 'monk', name: 'おつとめ', src: require('../../assets/ui/bg/room-home-monk.webp'), top: 0.42 },
  { id: 'engawa', name: '秋の縁側', src: require('../../assets/ui/bg/room-home-engawa.webp'), top: 0.4 },
  { id: 'shrine', name: '桜の神社', src: require('../../assets/ui/bg/room-home-shrine.webp'), top: 0.44 },
];
export const DEFAULT_HOME_BG = HOME_BGS[0];
export const homeBgOf = (id: string | null | undefined): HomeBg => HOME_BGS.find((b) => b.id === id) ?? DEFAULT_HOME_BG;
