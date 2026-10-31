// ノーマル猫の固定条件表。各行は異なる3〜4条件。設計用スクリプト: tools/design-normal-recipes.mjs
export const NORMAL_RECIPES: Record<string, string[]> = {
  'abyssinian': ['steps3000', 'rain', 'noon'], // 散歩
  'abyssinian-blue': ['moon-waning', 'evening', 'battery-middle'], // 月と暮らす
  'abyssinian-fawn': ['autumn', 'steps3000', 'battery-half'], // 季節の散歩
  'aegean': ['favorites3', 'rain', 'noon', 'moon-growing'], // お気に入りの仲間
  'american-bobtail': ['normal5', 'moon-growing', 'evening', 'sunny'], // ノーマルの仲間
  'american-curl': ['rare1', 'battery-middle', 'night', 'weekday'], // 珍しい仲間
  'american-curl-blue-white': ['pets100', 'battery-middle', 'morning', 'sunny'], // なでる暮らし
  'american-curl-red-tabby': ['home-set', 'rain', 'battery-middle', 'moon-growing'], // 部屋の模様替え
  'american-shorthair': ['birthday-set', 'spring', 'night', 'battery-half'], // 誕生日の登録
  'american-shorthair-brown-tabby': ['streak-week', 'battery-half', 'weekday'], // 起動の習慣
  'american-shorthair-calico': ['gap3', 'noon', 'battery-middle'], // 久しぶり
  'american-wirehair': ['rain', 'moon-waning', 'charging'], // 空と電池
  'arabian-mau': ['noon', 'moon-growing', 'weekday'], // 一日のリズム
  'asian-black-smoke': ['owned3', 'steps-walk', 'morning', 'moon-waning'], // 仲間との暮らし
  'asian-ticked-tabby': ['steps3000', 'sunny', 'morning'], // 散歩
  'australian-mist': ['moon-waning', 'evening', 'charging'], // 月と暮らす
  'balinese': ['spring', 'steps-rest', 'charging'], // 季節の散歩
  'balinese-chocolate-point': ['favorites1', 'rain', 'noon', 'moon-growing'], // お気に入りの仲間
  'balinese-lilac-point': ['normal5', 'moon-waning', 'noon', 'rain'], // ノーマルの仲間
  'bambino': ['rare3', 'battery-ready', 'evening', 'weekday'], // 珍しい仲間
  'bengal': ['pets30', 'battery-high', 'night', 'cloudy'], // なでる暮らし
  'bengal-marble': ['home-set', 'cloudy', 'charging', 'moon-waning'], // 部屋の模様替え
  'bengal-silver': ['birthday-set', 'spring', 'night', 'battery-high'], // 誕生日の登録
  'bengal-snow-lynx': ['streak-week', 'charging', 'weekday'], // 起動の習慣
  'birman': ['gap3', 'morning', 'battery-half'], // 久しぶり
  'birman-blue-point': ['cloudy', 'moon-waning', 'battery-middle'], // 空と電池
  'birman-chocolate-point': ['morning', 'moon-waning', 'weekend'], // 一日のリズム
  'bombay': ['owned20', 'steps5000', 'morning', 'moon-waning'], // 仲間との暮らし
  'british-bicolor': ['steps-walk', 'cloudy', 'night'], // 散歩
  'british-black': ['moon-growing', 'evening', 'battery-high'], // 月と暮らす
  'british-golden-shaded': ['summer', 'steps5000', 'battery-high'], // 季節の散歩
  'british-lilac': ['favorites1', 'sunny', 'noon', 'moon-waning'], // お気に入りの仲間
  'british-longhair': ['normal30', 'moon-waning', 'noon', 'cloudy'], // ノーマルの仲間
  'british-shorthair': ['rare1', 'battery-ready', 'noon', 'weekday'], // 珍しい仲間
  'british-silver-tabby': ['pets100', 'battery-ready', 'noon', 'cloudy'], // なでる暮らし
  'burmese': ['home-set', 'rain', 'charging', 'moon-waning'], // 部屋の模様替え
  'burmese-blue': ['birthday-set', 'spring', 'noon', 'battery-ready'], // 誕生日の登録
  'burmese-champagne': ['streak7', 'battery-ready', 'weekend'], // 起動の習慣
  'burmilla': ['gap3', 'noon', 'battery-high'], // 久しぶり
  'burmilla-longhair': ['sunny', 'moon-waning', 'charging'], // 空と電池
  'chartreux': ['night', 'moon-growing', 'weekday'], // 一日のリズム
  'chatora': ['owned20', 'steps3000', 'night', 'moon-growing'], // 仲間との暮らし
  'chausie': ['steps1000', 'rain', 'noon'], // 散歩
  'colorpoint-shorthair': ['moon-growing', 'night', 'charging'], // 月と暮らす
  'cornish-rex': ['spring', 'steps-active', 'battery-half'], // 季節の散歩
  'cornish-rex-black-white': ['favorites3', 'sunny', 'evening', 'moon-growing'], // お気に入りの仲間
  'cornish-rex-red': ['normal15', 'moon-waning', 'noon', 'sunny'], // ノーマルの仲間
  'cymric': ['rare1', 'charging', 'morning', 'weekday'], // 珍しい仲間
  'devon-rex': ['pets5', 'battery-half', 'noon', 'sunny'], // なでる暮らし
  'devon-rex-chocolate': ['home-set', 'cloudy', 'battery-ready', 'moon-waning'], // 部屋の模様替え
  'devon-rex-white': ['birthday-set', 'autumn', 'evening', 'charging'], // 誕生日の登録
  'donskoy': ['streak7', 'battery-high', 'weekday'], // 起動の習慣
  'dragon-li': ['gap3', 'morning', 'battery-middle'], // 久しぶり
  'egyptian-mau': ['rain', 'moon-waning', 'battery-middle'], // 空と電池
  'egyptian-mau-bronze': ['morning', 'moon-growing', 'weekday'], // 一日のリズム
  'egyptian-mau-smoke': ['owned10', 'steps-walk', 'morning', 'moon-waning'], // 仲間との暮らし
  'european-burmese': ['steps5000', 'cloudy', 'morning'], // 散歩
  'european-shorthair': ['moon-growing', 'morning', 'charging'], // 月と暮らす
  'exotic-shorthair': ['autumn', 'steps1000', 'battery-half'], // 季節の散歩
  'exotic-shorthair-chocolate': ['favorites1', 'cloudy', 'evening', 'moon-growing'], // お気に入りの仲間
  'exotic-shorthair-cream': ['normal5', 'moon-waning', 'morning', 'sunny'], // ノーマルの仲間
  'german-rex': ['rare1', 'charging', 'morning', 'weekend'], // 珍しい仲間
  'hachiware': ['pets5', 'charging', 'morning', 'cloudy'], // なでる暮らし
  'haiiro-neko': ['home-set', 'cloudy', 'battery-half', 'moon-growing'], // 部屋の模様替え
  'havana-brown': ['birthday-set', 'spring', 'morning', 'battery-half'], // 誕生日の登録
  'highland-fold': ['streak-first', 'battery-high', 'weekday'], // 起動の習慣
  'highland-straight': ['gap3', 'morning', 'battery-high'], // 久しぶり
  'highlander': ['rain', 'moon-waning', 'battery-half'], // 空と電池
  'himalayan': ['noon', 'moon-waning', 'weekend'], // 一日のリズム
  'japanese-bobtail': ['owned10', 'steps3000', 'morning', 'moon-growing'], // 仲間との暮らし
  'japanese-bobtail-longhair': ['steps-active', 'cloudy', 'noon'], // 散歩
  'japanese-bobtail-red-white': ['moon-waning', 'morning', 'battery-half'], // 月と暮らす
  'javanese': ['autumn', 'steps1000', 'battery-ready'], // 季節の散歩
  'karelian-bobtail': ['favorites6', 'sunny', 'night', 'moon-waning'], // お気に入りの仲間
  'khao-manee': ['normal15', 'moon-waning', 'noon', 'rain'], // ノーマルの仲間
  'kijishiro': ['rare3', 'charging', 'night', 'weekend'], // 珍しい仲間
  'kijitora': ['pets30', 'battery-half', 'noon', 'sunny'], // なでる暮らし
  'korat': ['home-set', 'cloudy', 'battery-high', 'moon-waning'], // 部屋の模様替え
  'kurilian-bobtail': ['birthday-set', 'spring', 'morning', 'battery-middle'], // 誕生日の登録
  'kuro-neko': ['streak-first', 'battery-half', 'weekday'], // 起動の習慣
  'laperm': ['gap3', 'morning', 'battery-ready'], // 久しぶり
  'laperm-black': ['sunny', 'moon-growing', 'battery-ready'], // 空と電池
  'laperm-red-white': ['night', 'moon-waning', 'weekday'], // 一日のリズム
  'lykoi': ['owned10', 'steps-active', 'evening', 'moon-waning'], // 仲間との暮らし
  'maine-coon': ['steps-rest', 'rain', 'morning'], // 散歩
  'maine-coon-black': ['moon-growing', 'night', 'battery-middle'], // 月と暮らす
  'maine-coon-red-tabby': ['winter', 'steps-rest', 'battery-high'], // 季節の散歩
  'maine-coon-silver-tabby': ['favorites3', 'cloudy', 'night', 'moon-waning'], // お気に入りの仲間
  'manx': ['normal30', 'moon-growing', 'morning', 'sunny'], // ノーマルの仲間
  'manx-blue-white': ['rare3', 'battery-middle', 'night', 'weekend'], // 珍しい仲間
  'manx-red-tabby': ['pets30', 'charging', 'morning', 'sunny'], // なでる暮らし
  'mekong-bobtail': ['home-set', 'rain', 'battery-middle', 'moon-waning'], // 部屋の模様替え
  'mike-neko': ['birthday-set', 'autumn', 'night', 'battery-high'], // 誕生日の登録
  'minskin': ['streak7', 'battery-half', 'weekend'], // 起動の習慣
  'munchkin': ['gap3', 'evening', 'battery-high'], // 久しぶり
  'napoleon': ['rain', 'moon-growing', 'charging'], // 空と電池
  'nebelung': ['morning', 'moon-waning', 'weekday'], // 一日のリズム
  'neva-masquerade': ['owned20', 'steps5000', 'morning', 'moon-growing'], // 仲間との暮らし
  'norwegian-forest': ['steps-walk', 'sunny', 'morning'], // 散歩
  'norwegian-forest-black-white': ['moon-waning', 'morning', 'battery-ready'], // 月と暮らす
  'norwegian-forest-silver-tabby': ['spring', 'steps-walk', 'battery-ready'], // 季節の散歩
  'ocicat': ['favorites6', 'rain', 'evening', 'moon-growing'], // お気に入りの仲間
  'ocicat-silver': ['normal5', 'moon-growing', 'morning', 'cloudy'], // ノーマルの仲間
  'oriental-longhair': ['rare3', 'battery-high', 'morning', 'weekend'], // 珍しい仲間
  'oriental-shorthair': ['pets30', 'battery-ready', 'evening', 'sunny'], // なでる暮らし
  'persian': ['home-set', 'cloudy', 'battery-middle', 'moon-waning'], // 部屋の模様替え
  'persian-black-smoke': ['birthday-set', 'winter', 'evening', 'battery-middle'], // 誕生日の登録
  'persian-blue-cream': ['streak7', 'charging', 'weekday'], // 起動の習慣
  'persian-chinchilla-silver': ['gap3', 'night', 'charging'], // 久しぶり
  'persian-red-tabby': ['rain', 'moon-waning', 'battery-ready'], // 空と電池
  'peterbald': ['night', 'moon-growing', 'weekend'], // 一日のリズム
  'pixie-bob': ['owned3', 'steps-active', 'evening', 'moon-growing'], // 仲間との暮らし
  'ragamuffin': ['steps1000', 'cloudy', 'evening'], // 散歩
  'ragamuffin-cream-white': ['moon-growing', 'morning', 'battery-high'], // 月と暮らす
  'ragamuffin-tortie-white': ['summer', 'steps100', 'battery-middle'], // 季節の散歩
  'ragdoll': ['favorites6', 'cloudy', 'night', 'moon-waning'], // お気に入りの仲間
  'ragdoll-blue-colorpoint': ['normal5', 'moon-growing', 'noon', 'cloudy'], // ノーマルの仲間
  'ragdoll-lilac-bicolor': ['rare1', 'battery-high', 'night', 'weekend'], // 珍しい仲間
  'ragdoll-seal-mitted': ['pets5', 'battery-high', 'evening', 'rain'], // なでる暮らし
  'russian-black': ['home-set', 'rain', 'battery-high', 'moon-waning'], // 部屋の模様替え
  'russian-blue': ['birthday-set', 'autumn', 'morning', 'battery-high'], // 誕生日の登録
  'russian-white': ['streak-first', 'battery-ready', 'weekend'], // 起動の習慣
  'saba-tora': ['gap3', 'evening', 'charging'], // 久しぶり
  'sabi-neko': ['cloudy', 'moon-growing', 'battery-high'], // 空と電池
  'savannah': ['evening', 'moon-waning', 'weekend'], // 一日のリズム
  'scottish-fold': ['owned10', 'steps1000', 'evening', 'moon-waning'], // 仲間との暮らし
  'scottish-fold-bicolor': ['steps-rest', 'cloudy', 'night'], // 散歩
  'scottish-fold-silver-tabby': ['moon-growing', 'evening', 'battery-middle'], // 月と暮らす
  'scottish-fold-white': ['autumn', 'steps-walk', 'battery-high'], // 季節の散歩
  'scottish-straight': ['favorites6', 'cloudy', 'evening', 'moon-growing'], // お気に入りの仲間
  'selkirk-rex': ['normal15', 'moon-waning', 'noon', 'cloudy'], // ノーマルの仲間
  'selkirk-rex-chocolate': ['rare3', 'charging', 'morning', 'weekday'], // 珍しい仲間
  'selkirk-rex-cream': ['pets5', 'battery-high', 'night', 'sunny'], // なでる暮らし
  'selkirk-rex-longhair': ['home-set', 'sunny', 'battery-high', 'moon-waning'], // 部屋の模様替え
  'serengeti': ['birthday-set', 'spring', 'night', 'battery-middle'], // 誕生日の登録
  'shiro-neko': ['streak7', 'battery-ready', 'weekday'], // 起動の習慣
  'siamese-blue-point': ['gap3', 'morning', 'charging'], // 久しぶり
  'siamese-chocolate-point': ['sunny', 'moon-growing', 'charging'], // 空と電池
  'siamese-flame-point': ['morning', 'moon-growing', 'weekend'], // 一日のリズム
  'siamese-seal-point': ['owned20', 'steps100', 'night', 'moon-waning'], // 仲間との暮らし
  'siberian': ['steps3000', 'rain', 'evening'], // 散歩
  'siberian-blue': ['moon-waning', 'noon', 'battery-high'], // 月と暮らす
  'siberian-golden-tabby': ['autumn', 'steps5000', 'battery-middle'], // 季節の散歩
  'siberian-tortie-white': ['favorites6', 'rain', 'night', 'moon-growing'], // お気に入りの仲間
  'singapura': ['normal30', 'moon-growing', 'night', 'rain'], // ノーマルの仲間
  'skookum': ['rare3', 'battery-ready', 'night', 'weekday'], // 珍しい仲間
  'snowshoe': ['pets5', 'battery-high', 'noon', 'rain'], // なでる暮らし
  'sokoke': ['home-set', 'rain', 'battery-half', 'moon-growing'], // 部屋の模様替え
  'somali': ['birthday-set', 'summer', 'night', 'battery-half'], // 誕生日の登録
  'somali-blue': ['streak-week', 'battery-ready', 'weekend'], // 起動の習慣
  'somali-fawn': ['gap3', 'noon', 'battery-half'], // 久しぶり
  'sphynx': ['cloudy', 'moon-waning', 'battery-ready'], // 空と電池
  'suffolk-lilac': ['evening', 'moon-growing', 'weekend'], // 一日のリズム
  'suphalak': ['owned3', 'steps-rest', 'night', 'moon-growing'], // 仲間との暮らし
  'tennessee-rex': ['steps3000', 'cloudy', 'evening'], // 散歩
  'thai': ['moon-growing', 'night', 'battery-half'], // 月と暮らす
  'tonkinese': ['summer', 'steps-walk', 'battery-ready'], // 季節の散歩
  'tonkinese-champagne-mink': ['favorites6', 'rain', 'night', 'moon-waning'], // お気に入りの仲間
  'tonkinese-platinum-mink': ['normal5', 'moon-waning', 'evening', 'rain'], // ノーマルの仲間
  'toybob': ['rare3', 'battery-ready', 'morning', 'weekend'], // 珍しい仲間
  'toyger': ['pets100', 'charging', 'noon', 'cloudy'], // なでる暮らし
  'turkish-angora': ['home-set', 'rain', 'battery-high', 'moon-growing'], // 部屋の模様替え
  'turkish-angora-black-smoke': ['birthday-set', 'spring', 'noon', 'battery-high'], // 誕生日の登録
  'turkish-angora-red-tabby': ['streak-week', 'battery-middle', 'weekday'], // 起動の習慣
  'turkish-van': ['gap3', 'night', 'battery-high'], // 久しぶり
  'turkish-van-black': ['cloudy', 'moon-growing', 'charging'], // 空と電池
  'turkish-van-cream': ['evening', 'moon-waning', 'weekday'], // 一日のリズム
  'ukrainian-levkoy': ['owned20', 'steps-active', 'morning', 'moon-waning'], // 仲間との暮らし
  'ural-rex': ['steps3000', 'sunny', 'noon'], // 散歩
};
