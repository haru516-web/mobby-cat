// 歩く／鼻ちょうちんのスプライトシート（4列×2行・8コマ、1024×512）。assets/cat-act/<猫id>-walk|sleep.webp
// 今は通常のにゃこモビー16種ぶん。ここにある猫だけ、ごろごろに加えて歩く・寝る動きも出る
export const CAT_ACT: Record<string, { walk: number; sleep: number }> = {
  'abyssinian': { walk: require('../../assets/cat-act/abyssinian-walk.webp'), sleep: require('../../assets/cat-act/abyssinian-sleep.webp') },
  'american-shorthair': { walk: require('../../assets/cat-act/american-shorthair-walk.webp'), sleep: require('../../assets/cat-act/american-shorthair-sleep.webp') },
  'american-shorthair-brown-tabby': { walk: require('../../assets/cat-act/american-shorthair-brown-tabby-walk.webp'), sleep: require('../../assets/cat-act/american-shorthair-brown-tabby-sleep.webp') },
  'birman': { walk: require('../../assets/cat-act/birman-walk.webp'), sleep: require('../../assets/cat-act/birman-sleep.webp') },
  'british-black': { walk: require('../../assets/cat-act/british-black-walk.webp'), sleep: require('../../assets/cat-act/british-black-sleep.webp') },
  'british-shorthair': { walk: require('../../assets/cat-act/british-shorthair-walk.webp'), sleep: require('../../assets/cat-act/british-shorthair-sleep.webp') },
  'european-shorthair': { walk: require('../../assets/cat-act/european-shorthair-walk.webp'), sleep: require('../../assets/cat-act/european-shorthair-sleep.webp') },
  'exotic-shorthair': { walk: require('../../assets/cat-act/exotic-shorthair-walk.webp'), sleep: require('../../assets/cat-act/exotic-shorthair-sleep.webp') },
  'japanese-bobtail': { walk: require('../../assets/cat-act/japanese-bobtail-walk.webp'), sleep: require('../../assets/cat-act/japanese-bobtail-sleep.webp') },
  'maine-coon': { walk: require('../../assets/cat-act/maine-coon-walk.webp'), sleep: require('../../assets/cat-act/maine-coon-sleep.webp') },
  'persian': { walk: require('../../assets/cat-act/persian-walk.webp'), sleep: require('../../assets/cat-act/persian-sleep.webp') },
  'persian-black-smoke': { walk: require('../../assets/cat-act/persian-black-smoke-walk.webp'), sleep: require('../../assets/cat-act/persian-black-smoke-sleep.webp') },
  'ragdoll': { walk: require('../../assets/cat-act/ragdoll-walk.webp'), sleep: require('../../assets/cat-act/ragdoll-sleep.webp') },
  'russian-blue': { walk: require('../../assets/cat-act/russian-blue-walk.webp'), sleep: require('../../assets/cat-act/russian-blue-sleep.webp') },
  'scottish-fold': { walk: require('../../assets/cat-act/scottish-fold-walk.webp'), sleep: require('../../assets/cat-act/scottish-fold-sleep.webp') },
  'siamese-seal-point': { walk: require('../../assets/cat-act/siamese-seal-point-walk.webp'), sleep: require('../../assets/cat-act/siamese-seal-point-sleep.webp') },
};
