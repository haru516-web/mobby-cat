// 鼻ちょうちんで寝るスプライトシート（4列×2行・8コマ、1024×512）。assets/cat-act/<猫id>-sleep.webp
// 寝る（通常の16種）と、いないいないばあ・ひっくり返る・怒る（ブリティッシュショートヘアとせかいいっしゅうモビー）。ここにある猫だけ、ごろごろに加えてその動きも出る
export type ActKind = 'sleep' | 'peekaboo' | 'fall' | 'angry';
export const CAT_ACT: Record<string, Partial<Record<ActKind, number>>> = {
  'abyssinian': { sleep: require('../../assets/cat-act/abyssinian-sleep.webp') },
  'american-shorthair': { sleep: require('../../assets/cat-act/american-shorthair-sleep.webp') },
  'american-shorthair-brown-tabby': { sleep: require('../../assets/cat-act/american-shorthair-brown-tabby-sleep.webp') },
  'birman': { sleep: require('../../assets/cat-act/birman-sleep.webp') },
  'british-black': { sleep: require('../../assets/cat-act/british-black-sleep.webp') },
  'british-shorthair': {
    sleep: require('../../assets/cat-act/british-shorthair-sleep.webp'),
    peekaboo: require('../../assets/cat-act/british-shorthair-peekaboo.webp'),
    fall: require('../../assets/cat-act/british-shorthair-fall.webp'),
    angry: require('../../assets/cat-act/british-shorthair-angry.webp'),
  },
  'world-traveler': {
    peekaboo: require('../../assets/cat-act/world-traveler-peekaboo.webp'),
    fall: require('../../assets/cat-act/world-traveler-fall.webp'),
    angry: require('../../assets/cat-act/world-traveler-angry.webp'),
  },
  'european-shorthair': { sleep: require('../../assets/cat-act/european-shorthair-sleep.webp') },
  'exotic-shorthair': { sleep: require('../../assets/cat-act/exotic-shorthair-sleep.webp') },
  'japanese-bobtail': { sleep: require('../../assets/cat-act/japanese-bobtail-sleep.webp') },
  'maine-coon': { sleep: require('../../assets/cat-act/maine-coon-sleep.webp') },
  'persian': { sleep: require('../../assets/cat-act/persian-sleep.webp') },
  'persian-black-smoke': { sleep: require('../../assets/cat-act/persian-black-smoke-sleep.webp') },
  'ragdoll': { sleep: require('../../assets/cat-act/ragdoll-sleep.webp') },
  'russian-blue': { sleep: require('../../assets/cat-act/russian-blue-sleep.webp') },
  'scottish-fold': { sleep: require('../../assets/cat-act/scottish-fold-sleep.webp') },
  'siamese-seal-point': { sleep: require('../../assets/cat-act/siamese-seal-point-sleep.webp') },
};
