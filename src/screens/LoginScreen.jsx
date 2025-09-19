import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../../NavigationRef';
import { voipHandler } from '../utils/voipHandler';

const LoginScreen = ({ navigation, setLoggedIn }) => {
  const AUTH_KEY = '627b966ffeb3286f816b53ebea5319ab6d825cdb';
  // const AUTH_KEY = '677d62cb4c7ed8640398b06fa0733e8e85035e30';
  const [uid, setUid] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // const handleLogin = async () => {
  //   if (!uid.trim()) {
  //     Alert.alert('Please enter User ID');
  //     return;
  //   }

  //   setIsLoading(true);

  //   try {
  //     const user = await CometChat.login(uid, AUTH_KEY);
  //     navigation.reset({
  //       index: 0,
  //       routes: [{ name: 'Main' }],
  //     });
  //   } catch (error) {
  //     console.log('Login failed:', error);
  //     Alert.alert(`Login failed: ${error}`);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

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


      console.log('🏷️ Notification tapped (BG):', JSON.stringify(remoteMessage, null, 2));
      console.log('🏷️ meta ke liye:', JSON.stringify(remoteMessage, null, 2));
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


    const data = remoteMessage.data || {};


    const initialMsg = await messaging().getInitialNotification();

    if (initialMsg) {
      const data = initialMsg.data || {};
      console.log('🚀 Cold start notification tap:', data);

      if (data?.type === 'call' && data?.sessionId) {
        navigationRef.current?.navigate('Call', {
          sessionId: data.sessionId,
          sender: data.sender,
          receiver: data.receiver,
          callType: data.callType,
          isCaller: false,
        });
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
        // Only show a notification with "CALL" category, fullScreenIntent, 
        // so that tapping it launches CallScreen

        await notifee.displayNotification({
          title: `${data.senderName || 'Someone'} is calling...`,
          body: 'Tap to answer',
          android: {
            channelId: 'calls',
            importance: AndroidImportance.HIGH,
            category: AndroidCategory.CALL,
            // This makes the notification full-screen
            fullScreenAction: { id: 'default' },
            pressAction: { id: 'ACCEPT_CALL' }, // This is the button tap
            smallIcon: 'ic_launcher',
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
          data, // <-- attach all call info
        });
        // No regular notification for call!
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

  const handleLogin = async () => {
    if (!uid.trim()) {
      Alert.alert('Please enter User ID');
      return;
    }

    setIsLoading(true);

    try {
      const user = await CometChat.login(uid, AUTH_KEY);
      // initFCM(); // Initialize FCM after login
      // voipHandler.initialize(); // Initialize VoIP handler
      

      // ✅ Save UID to AsyncStorage
      await AsyncStorage.setItem('LOGGED_IN_UID', uid);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      console.log('Login failed:', error);
      Alert.alert(`Login failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SDK</Text>

      <TextInput
        style={styles.input}
        placeholder="User ID"
        placeholderTextColor="#888"
        value={uid}
        onChangeText={setUid}
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <Pressable onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.signupText}>
          Don't have an account? <Text style={styles.signupLink}>Sign Up</Text>
        </Text>
      </Pressable>
    </View>
  );
};

export default LoginScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5ddd5',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    fontWeight: 'bold',
    color: '#075E54',
    alignSelf: 'center',
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 1,
  },
  button: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a8d5bb',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupText: {
    marginTop: 25,
    alignSelf: 'center',
    fontSize: 14,
    color: '#444',
  },
  signupLink: {
    color: '#075E54',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
