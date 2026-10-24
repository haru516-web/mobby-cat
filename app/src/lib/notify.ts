import * as Notifications from 'expo-notifications';
import { REVEAL_HOUR } from './encounter';

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
      content: { title: '猫モビー', body: '今日のあなたは3匹の猫モビーと出会いました 🐾' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: REVEAL_HOUR, minute: 0 },
    });
    return true;
  } catch {
    return false;
  }
}

export async function disableDailyNotification() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
