import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { CometChatCalls } from '@cometchat/calls-sdk-react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import Icon from 'react-native-vector-icons/Feather';

const CallScreen = ({ route, navigation }) => {
    const { sessionId, isCaller } = route.params;
    const [callSettings, setCallSettings] = useState(null);
    const [callToken, setCallToken] = useState(null);

    useEffect(() => {
        const initializeCall = async () => {
            try {
                // Get logged in user's auth token
                const loggedInUser = await CometChat.getLoggedinUser();
                const authToken = loggedInUser.getAuthToken();

                // Generate call token
                const tokenResponse = await CometChatCalls.generateToken(sessionId, authToken);
                setCallToken(tokenResponse.token);

                // Setup call listener
                const callListener = new CometChatCalls.OngoingCallListener({
                    onUserJoined: user => {
                        console.log("User joined:", user);
                    },
                    onUserLeft: user => {
                        console.log("User left:", user);
                    },
                    onCallEnded: () => {
                        console.log("Call ended");
                        navigation.goBack();
                    },
                    onError: error => {
                        console.log("Call Error:", error);
                        navigation.goBack();
                    },
                    onAudioModesUpdated: audioModes => {
                        console.log("Audio modes updated:", audioModes);
                    },
                });

                // Configure call settings
                const settings = new CometChatCalls.CallSettingsBuilder()
                    .enableDefaultLayout(true)
                    .setIsAudioOnlyCall(true)
                    .setCallEventListener(callListener)
                    .showEndCallButton(true)
                    .showMuteAudioButton(true)
                    .showAudioModeButton(true)
                    .setDefaultAudioMode(CometChat.AUDIO_MODE.SPEAKER)
                    .build();

                setCallSettings(settings);

            } catch (error) {
                console.log("Error initializing call:", error);
                navigation.goBack();
            }
        };

        initializeCall();

        return () => {
            // Cleanup
            CometChatCalls.endSession();
        };
    }, [sessionId, navigation]);

    if (!callSettings || !callToken) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Initializing call...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CometChatCalls.Component
                callSettings={callSettings}
                callToken={callToken}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1c1c1c',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1c1c1c',
    }
});

export default CallScreen;