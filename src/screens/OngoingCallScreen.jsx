import { Button, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import { CometChatCalls } from '@cometchat/calls-sdk-react-native';

const OngoingCallScreen = ({ route, navigation }) => {
    const { sessionId, isCaller } = route.params;
    const [callToken, setCallToken] = useState(null);
    const [callSettings, setCallSettings] = useState(null);
    const [endedByMe, setEndedByMe] = useState(false);

    const audioOnly = false;
    const defaultLayout = true;

    // Called when this user taps the “End Call” button:
    const handleEndCall = async () => {
        try {
            setEndedByMe(true);

            await CometChat.endCall();
            console.log('✅ CometChat.endCall() succeeded (caller ended).');
            navigation.navigate('Main');
        } catch (error) {
            console.log('❌ CometChat.endCall() error:', error);
        }
    };

    useEffect(() => {
        let isMounted = true; // cleanup flag

        const setupCall = async () => {
            try {
                // 1️⃣ Get logged-in user’s authToken
                const loggedInUser = await CometChat.getLoggedinUser();
                const authToken = loggedInUser.getAuthToken();

                // 2️⃣ Generate a call token
                const { token } = await CometChatCalls.generateToken(sessionId, authToken);
                if (!isMounted) return;
                setCallToken(token);
                console.log('🟢 Call token generated:', token);

                // 3️⃣ Build the OngoingCallListener per docs
                const callListener = new CometChatCalls.OngoingCallListener({
                    onUserJoined: user => {
                        console.log('👤 User joined:', user);
                    },
                    onUserLeft: user => {
                        console.log('👋 User left:', user);
                    },
                    onUserListUpdated: userList => {
                        console.log('👥 Active user list updated:', userList);
                    },
                    onCallEnded: async () => {
                        console.log('📞 onCallEnded triggered');

                        // If **you** did NOT manually end the call:
                        if (!endedByMe) {
                            try {
                                // Per docs: “other user” cleanup
                                 CometChat.clearActiveCall();
                                 CometChatCalls.endSession();
                                console.log('🧹 Cleared active call & ended session (receiver cleanup).');
                            } catch (e) {
                                console.log('❌ Receiver cleanup error:', e);
                            }
                        }

                        // In either case, pop back:
                        navigation.navigate('Main');

                    },
                    onSessionTimeout: () => {
                        console.log('⏰ onSessionTimeout: call timed out');
                    },
                    onCallEndButtonPressed: () => {
                        handleEndCall();
                        console.log('🔘 onCallEndButtonPressed');
                    },
                    onError: error => {
                        console.log('❌ onError in call:', error);
                        // Any unrecoverable error → navigate away
                        navigation.navigate('Main');
                    },
                    onAudioModesUpdated: audioModes => {
                        console.log('🎚️ onAudioModesUpdated:', audioModes);
                    },
                    onCallSwitchedToVideo: event => {
                        console.log('🔄 onCallSwitchedToVideo:', event);
                    },
                    onUserMuted: event => {
                        console.log('🔇 onUserMuted:', event);
                    },
                    onRecordingStarted: (startedBy) => {
                        console.log("🔴 Recording started by:", startedBy);
                    },
                    onRecordingStopped: (stoppedBy) => {
                        console.log("⏹️ Recording stopped by:", stoppedBy);
                      }
                });

                // 4️⃣ Build callSettings per docs
                const settings = new CometChatCalls.CallSettingsBuilder()
                    .enableDefaultLayout(true)
                    .showRecordingButton(true)
                    .setCallEventListener(callListener)
                    .setMode(CometChat.CALL_MODE.DEFAULT)
                    .startWithAudioMuted(false) 
                    .startWithVideoMuted(false) 
                    .showEndCallButton(true)     
                    .showMuteAudioButton(true)
                    .showAudioModeButton(true)
                    .setDefaultAudioMode(CometChat.AUDIO_MODE.SPEAKER)
                    .build();

                if (!isMounted) return;
                setCallSettings(settings);
            } catch (error) {
                console.log('❌ setupCall error:', error);
                navigation.goBack();
            }
        };

        setupCall();

        return () => {

            isMounted = false;
            CometChat.clearActiveCall();
            CometChatCalls.endSession();
            console.log("🧹 Cleanup done on unmount");
        };
    }, [sessionId, endedByMe, navigation]);

    // 5️⃣ If we have both a token and settings, render CometChatCalls.Component
    if (callToken && callSettings) {
        return (
            <View style={styles.fullscreen}>
                <CometChatCalls.Component
                    callToken={callToken}
                    callSettings={callSettings}
                />

                
            </View>
        );
    }

    // 6️⃣ Fallback “connecting” UI while token/settings load
    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔄 Connecting Call...</Text>
        </View>
    );
};

export default OngoingCallScreen;

const styles = StyleSheet.create({
    fullscreen: {
        flex: 1,
        backgroundColor: '#000',
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 18,
    },
});
