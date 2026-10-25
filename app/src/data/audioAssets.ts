// 音源の一覧。.m4a は tools/make-audio.cjs で合成して作る（app/assets/audio/bgm・sfx）。
// ここに無い音は、鳴らさずに黙って飛ばす（落ちない）。
// 場面とファイル名の決まりは docs/codex/AUDIO_PROMPT.md。

export type BgmId = 'bgm_home' | 'bgm_deai' | 'bgm_welcome';
export type SfxId =
  | 'sfx_tap' | 'sfx_error'
  | 'sfx_pet' | 'sfx_welcome' | 'sfx_bell' | 'sfx_matatabi'
  | 'sfx_pick_free' | 'sfx_pick_extra' | 'sfx_pick_special'
  | 'sfx_gift' | 'sfx_shutter' | 'sfx_saved';
export type AudioId = BgmId | SfxId;

export const AUDIO: Partial<Record<AudioId, number>> = {
  bgm_home: require('../../assets/audio/bgm/bgm_home.m4a'),
  bgm_deai: require('../../assets/audio/bgm/bgm_deai.m4a'),
  bgm_welcome: require('../../assets/audio/bgm/bgm_welcome.m4a'),
  sfx_tap: require('../../assets/audio/sfx/sfx_tap.m4a'),
  sfx_error: require('../../assets/audio/sfx/sfx_error.m4a'),
  sfx_pet: require('../../assets/audio/sfx/sfx_pet.m4a'),
  sfx_welcome: require('../../assets/audio/sfx/sfx_welcome.m4a'),
  sfx_bell: require('../../assets/audio/sfx/sfx_bell.m4a'),
  sfx_matatabi: require('../../assets/audio/sfx/sfx_matatabi.m4a'),
  sfx_pick_free: require('../../assets/audio/sfx/sfx_pick_free.m4a'),
  sfx_pick_extra: require('../../assets/audio/sfx/sfx_pick_extra.m4a'),
  sfx_pick_special: require('../../assets/audio/sfx/sfx_pick_special.m4a'),
  sfx_gift: require('../../assets/audio/sfx/sfx_gift.m4a'),
  sfx_shutter: require('../../assets/audio/sfx/sfx_shutter.m4a'),
  sfx_saved: require('../../assets/audio/sfx/sfx_saved.m4a'),
};

export const BGM_IDS: BgmId[] = ['bgm_home', 'bgm_deai', 'bgm_welcome'];
