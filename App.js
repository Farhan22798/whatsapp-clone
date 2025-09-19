
import React, { useEffect, useState } from 'react';
import { navigationRef } from "./NavigationRef"
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CometChatCalls } from '@cometchat/calls-sdk-react-native';
import { MenuProvider } from 'react-native-popup-menu'
import { Alert } from 'react-native';
import { enableScreens } from 'react-native-screens';
enableScreens();
import messaging from '@react-native-firebase/messaging';
import HomeScreen from './src/screens/HomeScreen';
import UsersScreen from './src/screens/UsersScreen';
import SignupScreen from './src/screens/SignupScreen';
import ChatScreen from './src/screens/ChatScreen';
import { CometChat, CometChatNotifications } from '@cometchat/chat-sdk-react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import CallScreen from './src/screens/CallScreen';
import MainTabs from './src/screens/MainTabs';
import LoginScreen from './src/screens/LoginScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import EditGroupScreen from './src/screens/EditGroupScreen';
import OngoingCallScreen from './src/screens/OngoingCallScreen';
import CallLogScreen from './src/screens/CallLogScreen';
import CallDetailsScreen from './src/screens/CallDetailsScreen';
import GroupScreen from './src/screens/GroupScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance, AndroidCategory, EventType } from '@notifee/react-native';




const Stack = createNativeStackNavigator();

let appID = "2748663902141719";
let region = "in";
const authKey = '627b966ffeb3286f816b53ebea5319ab6d825cdb';

const App = ({ navigation }) => {

  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleIncomingCallNotification = async (callData) => {
    await notifee.displayNotification({
      title: `${callData.senderName || 'Someone'} is calling...`,
      body: 'Tap to answer',
      android: {
        channelId: 'calls',
        importance: AndroidImportance.HIGH,
        fullScreenAction: { id: 'default' },
        smallIcon: 'ic_launcher',
        category: AndroidCategory.CALL,
        sound: 'default',
        actions: [
          {
            title: 'Accept',
            pressAction: { id: 'ACCEPT_CALL' },
          },
          {
            title: 'Decline',
            pressAction: { id: 'REJECT_CALL' },
          },
        ],
      },
      data: callData,
    });
  };



  // const initFCM = async () => {
  //   if (Platform.OS !== 'android') return;
  //   // 1. Ask for permission
  //   const authStatus = await messaging().requestPermission();
  //   const enabled =
  //     authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
  //     authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  //   if (!enabled) {
  //     console.warn('❌ FCM permission denied');
  //     return;
  //   }

  //   // 2. Get & register FCM token with CometChat
  //   const fcmToken = await messaging().getToken();
  //   console.log('📲 FCM Token:', fcmToken);
  //   await CometChat.registerTokenForPushNotification(fcmToken);
  //   await CometChatNotifications.registerPushToken(
  //     fcmToken,
  //     CometChatNotifications.PushPlatforms.FCM_REACT_NATIVE_ANDROID,
  //     'push-52dd5'
  //   )
  //   // Note: CometChat.registerTokenForPushNotification is the CometChat SDK method to link your device token to the push extension :contentReference[oaicite:2]{index=2}

  //   // 3. Handle token refresh
  //   messaging().onTokenRefresh(async newToken => {
  //     console.log('🔄 FCM token refreshed:', newToken);
  //     await CometChat.registerTokenForPushNotification(newToken);
  //   });

  //   // 4. Foreground messages → basic Alert
  //   messaging().onMessage(async remoteMessage => {
  //     console.log('🔔 Foreground FCM message:', remoteMessage);
  //     // i didnt use notifee and didnt want alert also so commented this out
  //     // const { title, body } = remoteMessage.notification || {};
  //     // if (title || body) {
  //     //   Alert.alert(title ?? 'Notification', body ?? '');
  //     // }
  //   });

  //   // 5. User taps notification from background
  //   messaging().onNotificationOpenedApp(remoteMessage => {
  //     console.log('🏷️ Notification opened from background:', remoteMessage);
  //     // TODO: navigate to the right screen
  //     // e.g. navigationRef.current?.navigate('Chat', { uid: remoteMessage.data?.uid });
  //   });

  //   // 6. Cold-start (app launched by notification)
  //   const initialMsg = await messaging().getInitialNotification();
  //   if (initialMsg) {
  //     console.log('🚀 App opened from quit state by notification:', initialMsg);
  //     // TODO: same navigation logic
  //   }

  //   // 7. (Optional) Background handler for data-only messages
  //   messaging().setBackgroundMessageHandler(async remoteMessage => {
  //     console.log('🌙 Background FCM message:', remoteMessage);
  //     // No display—OS handles background notification if payload has `notification`
  //   });
  // }




  // useEffect(() => {
  //   const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
  //     const data = detail.notification?.data;

  //     if (type === EventType.ACTION_PRESS && detail.pressAction.id === 'ACCEPT_CALL') {
  //       console.log('✅ User accepted call');
  //       navigationRef.current?.navigate('Call', {
  //         sessionId: data?.sessionId,
  //         isCaller: false,
  //       });
  //     }

  //     if (type === EventType.ACTION_PRESS && detail.pressAction.id === 'REJECT_CALL') {
  //       console.log('❌ User rejected call');
  //       await CometChat.rejectCall(data?.sessionId, CometChat.CALL_STATUS.REJECTED);
  //     }
  //   });

  //   return () => unsubscribe();
  // }, []);


  const initFCM = async () => {
    if (Platform.OS !== 'android') return;

    await notifee.requestPermission();


    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.warn('❌ FCM permission denied');
      return;
    }

    const fcmToken = await messaging().getToken();
    console.log('📲 FCM Token:', fcmToken);

    await CometChat.registerTokenForPushNotification(fcmToken);
    await CometChatNotifications.registerPushToken(
      fcmToken,
      CometChatNotifications.PushPlatforms.FCM_REACT_NATIVE_ANDROID,
      'push-52dd5' // your extension ID
    );

    // ✅ Create notification channel
    await notifee.createChannel({
      id: 'default',
      name: 'Default Notifications',
      importance: AndroidImportance.HIGH,
    });

    // ✅ Foreground handler



    // ✅ Background tap (app already in memory)
    messaging().onNotificationOpenedApp(remoteMessage => {


      console.log('🏷️ Notification tapped (BG):', JSON.stringify(remoteMessage,null,2));
      console.log('🏷️ meta ke liye:', JSON.stringify(remoteMessage,null,2));
      const uid = remoteMessage?.data?.sender;
      if (uid) {
        navigationRef.current?.navigate('Chat', {
          user: {
            uid: data.sender,
            name: data.senderName,
            metadata: {},
          },
          isGroup: false,
        });

      }
    });

    // ✅ Cold start tap


    // const data = remoteMessage.data || {};


    const initialMsg = await messaging().getInitialNotification();
    const data = initialMsg?.data || {};

    if (initialMsg) {
      const data = initialMsg.data || {};
      console.log('🚀 Cold start notification tap:', data);

      // if (data?.type === 'call') {
      //   voipHandler.showIncomingCall(data.sender, data.senderName, data.sessionId);
      // }

      if (data?.type === 'call' && data?.sessionId) {
        // navigationRef.current?.navigate('Call', {
        //   sessionId: data.sessionId,
        //   sender: data.sender,
        //   receiver: data.receiver,
        //   callType: data.callType,
        //   isCaller: false,
        // });
        return
      } else if (data?.sender) {
        navigationRef.current?.navigate('Chat', {
          user: {
            uid: data.sender,
            name: data.senderName,
            metadata: {},
          },
          isGroup: false,
        });
      }
    }


    // ✅ Background data-only message
    // messaging().setBackgroundMessageHandler(async remoteMessage => {




    //   console.log('🌙 Background FCM message:', remoteMessage);
    //   const { title, body } = remoteMessage.notification || {};
    //   const data = remoteMessage.data || {};

    //   await notifee.displayNotification({
    //     title: title ?? data?.sender ?? 'New message',
    //     body: body ?? data?.message ?? '',
    //     android: {
    //       channelId: 'default',
    //       importance: AndroidImportance.HIGH,
    //       category: AndroidCategory.MESSAGE,
    //       pressAction: {
    //         id: 'default',
    //       },
    //     },
    //     data,
    //   });
    // });

    messaging().setBackgroundMessageHandler(async remoteMessage => {
      const data = remoteMessage?.data;

      if (data?.type === 'call') {
        // voipHandler.showIncomingCall(data.sender, data.senderName, data.sessionId);
        return

      } else {
        // Normal notifications
        await notifee.displayNotification({
          title: data?.sender || 'New Message',
          body: data?.message || 'Tap to open',
          android: {
            channelId: 'default',
            pressAction: { id: 'default' },
            importance: AndroidImportance.HIGH,
            sound: 'default',
          },
          data,
        });
      }
    });

  };

  useEffect(() => {
    messaging().onMessage(async remoteMessage => {
      console.log('🔔 Foreground FCM:', remoteMessage);

      const data = remoteMessage?.data;

   

      if (data?.type === 'call' && data?.sessionId) {
        // voipHandler.showIncomingCall(data.sender, data.senderName, data.sessionId);
        return

      } else {
        await notifee.displayNotification({
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
          },
          data,
        });
      }
    });
  }, []);


  useEffect(() => {
    const fetchStoredUid = async () => {
      const storedUid = await AsyncStorage.getItem('LOGGED_IN_UID');
      if (storedUid) {
        setUid(storedUid);
        console.log('Fetched UID in App.js:', storedUid);
      }
      setLoading(false);
    };

    fetchStoredUid();
  }, []);

  useEffect(() => {
    const unsubMsg = messaging().onMessage(msg =>
      console.log('🔥 Foreground payload:', JSON.stringify(msg, null, 2))
    );
    const unsubTap = messaging().onNotificationOpenedApp(msg =>
      console.log('📦 Tapped payload:', JSON.stringify(msg, null, 2))
    );

    messaging()
      .getInitialNotification()
      .then(msg => msg && console.log('🧊 Cold start payload:', JSON.stringify(msg, null, 2)));

    return () => {
      unsubMsg();
      unsubTap();
    };
  }, []);



  useEffect(() => {

    // Initialize CometChat SDK
    let appSetting = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion(region)
      .autoEstablishSocketConnection(true)
      .build();

    CometChat.init(appID, appSetting).then(
      () => {
        console.log("✅ CometChat initialization completed");

      },
      (error) => {
        console.log("❌ CometChat initialization/login failed:", error);
      }
    );


    // Initialize CometChatCalls SDK
    const callAppSetting = new CometChatCalls.CallAppSettingsBuilder()
      .setAppId(appID)
      .setRegion(region)
      .build();

    CometChatCalls.init(callAppSetting).then(
      () => {
        console.log("✅ CometChatCalls initialization completed");
      },
      (error) => {
        console.log("❌ CometChatCalls initialization failed:", error);
      }
    );

    // Request permissions (for Android)
    const requestPermissions = async () => {
      if (Platform.OS !== 'android') return;

      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        ]);

        Object.entries(granted).forEach(([permission, result]) => {
          console.log(`Permission: ${permission} - ${result}`);
        });

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.warn('[Permissions] Not all permissions granted');
        }

      } catch (err) {
        console.warn('[Permissions] Error requesting Android permissions', err);
      }
    };

    requestPermissions();

    const handleAutoLogin = async () => {
      try {
        const storedUid = await AsyncStorage.getItem('LOGGED_IN_UID'); // ✅ use consistent key
        if (storedUid) {
          console.log('Auto-login with UID:', storedUid);
          const user = await CometChat.login(storedUid, authKey);
          console.log('Auto-login successful:', user);
          setLoggedIn(true); // ✅ move after login
          initFCM(); // ✅ initialize FCM after login
          // voipHandler.initialize();
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } else {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } catch (error) {
        console.error('Auto-login failed:', error);
        Alert.alert('Auto-login failed', error.message || 'Please try again');
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    };


    handleAutoLogin()



    var listenerID = "UNIQUE_LISTENER_ID";
    CometChat.addCallListener(
      listenerID,
      new CometChat.CallListener({
        onIncomingCallReceived: (call) => {
          console.log("📲 Incoming call for meta:", JSON.stringify(call, null, 2));
          console.log("📲 meta call for meta=>:", JSON.stringify(call.metadata, null, 2));


          // console.log("ye hai get wala ", JSON.stringify(callMeta,null,2))
          if (call.receiverType === CometChat.RECEIVER_TYPE.USER) {


            navigationRef.current?.navigate('Call', {
              sessionId: call.sessionId,
              isCaller: false,
            });
          }
        },


        onOutgoingCallRejected: async (call) => {
          console.log("❌ Call rejected by receiver:", call);
          navigationRef.current?.navigate('Main');

        },

        onIncomingCallCancelled: async (call) => {
          console.log("🚫 Caller cancelled the call:", call);
          navigationRef.current?.navigate('Main');



        },
        onOutgoingCallAccepted: (call) => {
          console.log("✅ Outgoing call accepted:", call);
          navigationRef.current?.navigate('OnGoingCall', {
            sessionId: call.sessionId,
            isCaller: true,
          });
        },



      })
    );

    // ✅ Global message listener for delivery receipts
    const globalListenerID = "GLOBAL_MSG_LISTENER";
    CometChat.addMessageListener(
      globalListenerID,
      new CometChat.MessageListener({
        onTextMessageReceived: (message) => {
          console.log("📥 Global Text Received:", message);
          console.log("forMetaExtraction", message.getMetaData())
          CometChat.markAsDelivered(message).catch((err) =>
            console.log("❌ markAsDelivered error", err)
          );
        },
        onMediaMessageReceived: (message) => {
          console.log("📥 Global Media Received:", message);
          CometChat.markAsDelivered(message).catch((err) =>
            console.log("❌ markAsDelivered error", err)
          );
        },



      })
    );


    return () => {
      console.log('🧹 Removing CometChat Call Listener');
      CometChat.removeCallListener(listenerID);
      CometChat.removeMessageListener(globalListenerID);

    };
  }, []);



  // useEffect(() => {
  //   const checkLogin = async () => {
  //     const uid = await AsyncStorage.getItem('LOGGED_IN_UID');
  //     if (uid) {
  //       await CometChat.login(uid, authKey);
  //       setLoggedIn(true);
  //       initFCM(); // ✅ initialize FCM after login
  //       navigationRef.current?.reset({
  //         index: 0,
  //         routes: [{ name: 'Main' }],
  //       });
  //     } else {
  //       setLoggedIn(false);
  //       navigationRef.current?.reset({
  //         index: 0,
  //         routes: [{ name: 'Login' }],
  //       });
  //     }
  //   };

  //   checkLogin();
  // }, []);





  useEffect(() => {
    notifee.createChannel({
      id: 'calls',
      name: 'Calls',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      bypassDnd: true,
      vibration: true,
    });

  }, []);




  // notifee.onBackgroundEvent(async ({ type, detail }) => {
  //   const data = detail.notification?.data;
  //   if (data?.type === 'call' && data?.sessionId) {
  //     // Remove the notification
  //     if (detail.notification?.id) {
  //       await notifee.cancelNotification(detail.notification.id);
  //     }
  //     // Navigate to CallScreen
  //     navigationRef.current?.navigate('Call', {
  //       sessionId: data.sessionId,
  //       sender: data.sender,
  //       receiver: data.receiver,
  //       callType: data.callType,
  //       isCaller: false,
  //     });
  //   }
  // });



  const setupNotificationChannels = async () => {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    await notifee.createChannel({
      id: 'calls',
      name: 'Calls',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      bypassDnd: true,
    });
  };











  return (
    <MenuProvider>
      <NavigationContainer ref={navigationRef}>

        <Stack.Navigator screenOptions={{ headerShown: false }} >
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} setLoggedIn={setLoggedIn} />}
          </Stack.Screen>

          <Stack.Screen name="Main">
            {props => <MainTabs {...props} setLoggedIn={setLoggedIn} />}
          </Stack.Screen>
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Call" component={CallScreen} />
          <Stack.Screen name="OnGoingCall" component={OngoingCallScreen} />
          <Stack.Screen name="Users" component={UsersScreen} />
          <Stack.Screen name="Groups" component={GroupScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="CallLogs" component={CallLogScreen} />
          <Stack.Screen name="CallDetails" component={CallDetailsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Thread" component={ThreadScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="EditGroup" component={EditGroupScreen} />

        </Stack.Navigator>
      </NavigationContainer>
    </MenuProvider>


  );
};

export default App;
