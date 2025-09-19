/**
 * @format
 */

import {AppRegistry, Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, { AndroidCategory, AndroidImportance, EventType } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { navigationRef } from './NavigationRef'; // ✅ Required
import { StackActions } from '@react-navigation/native';

if (Platform.OS === 'android') {
    // 🧠 Handle background tap (Answer / Decline)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
        const data = detail.notification?.data;

        if (type === EventType.ACTION_PRESS && data?.type === 'call') {
            console.log('📲 Background tap received:', detail.pressAction.id);

            if (detail.notification?.id) {
                await notifee.cancelNotification(detail.notification.id);
            }

            if (detail.pressAction.id === 'ACCEPT_CALL') {
                navigationRef.current?.navigate('Call', {
                    sessionId: data.sessionId,
                    sender: data.sender,
                    receiver: data.receiver,
                    callType: data.callType,
                    isCaller: false,
                });
            } else if (detail.pressAction.id === 'REJECT_CALL') {
                await CometChat.rejectCall(data.sessionId, CometChat.CALL_STATUS.REJECTED);
            }
        }
    });

    // 🧠 Handle background FCM message
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        const data = remoteMessage.data || {};

        if (data?.type === 'call') {
            // await notifee.displayNotification({
            //     title: `${data.senderName || 'Someone'} is calling...`,
            //     body: 'Tap to answer',
            //     android: {
            //         channelId: 'calls',
            //         importance: AndroidImportance.HIGH,
            //         category: AndroidCategory.CALL,
            //         fullScreenAction: { id: 'default' },
            //         pressAction: { id: 'ACCEPT_CALL' },
            //         smallIcon: 'ic_launcher',
            //         sound: 'default',
            //         actions: [
            //             { title: 'Accept', pressAction: { id: 'ACCEPT_CALL' } },
            //             { title: 'Decline', pressAction: { id: 'REJECT_CALL' } },
            //         ],
            //     },
            //     data,
            // });
     return
        }
    });
}

AppRegistry.registerComponent(appName, () => App);
