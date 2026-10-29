import * as Notifications from 'expo-notifications';
import { REVEAL_HOUR } from '../core/encounter';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 毎日20:00（端末のローカル時刻）に出会いを通知する。許可されなければ false。
export async function enableDailyNotification(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    const granted = cur.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      // 候補の数はまたたびパスで変わるので、数は書かない
      content: { title: 'にゃっコレ', body: '今日の出会いが届きました。どの子を迎えますか？ 🐾' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: REVEAL_HOUR, minute: 0 },
    });
    return true;
  } catch {
    return false;
  }
}

// 通知が許可されているか（設定画面の表示を、端末の設定に合わせるため）。分からないときは true（表示を勝手に変えない）
export async function hasNotifyAccess(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return true;
  }
}

// 通知をオンにしている記録で、予約が無いとき（機種変更で記録を戻したあとなど）に、許可を求めずに予約し直す
export async function ensureDailyNotification(): Promise<void> {
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    if ((await Notifications.getAllScheduledNotificationsAsync()).length > 0) return;
    await enableDailyNotification();
  } catch {}
}

export async function disableDailyNotification() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
