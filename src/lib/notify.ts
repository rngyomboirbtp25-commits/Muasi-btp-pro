import { Alert, Platform } from 'react-native';

/** Message simple, compatible mobile et web. */
export function notify(title: string, msg: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(`${title}\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

/** Demande de confirmation (ex. suppression). */
export function confirm(title: string, msg: string, onYes: () => void, yesLabel = 'Supprimer') {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n${msg}`)) onYes();
    return;
  }
  Alert.alert(title, msg, [
    { text: 'Annuler', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: onYes },
  ]);
}
