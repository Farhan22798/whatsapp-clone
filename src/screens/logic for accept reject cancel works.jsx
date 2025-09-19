import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { CometChatCalls } from '@cometchat/calls-sdk-react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import Icon from 'react-native-vector-icons/Feather';
import { cleanupActiveCall } from '../utils/functions';

const CallScreen = ({ route, navigation }) => {
  const { sessionId, isCaller } = route.params;
  const [callSettings, setCallSettings] = useState(null);
  const [callToken, setCallToken] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const handleAcceptCall = async () => {
    try {
      const call = await CometChat.acceptCall(sessionId);
      console.log("Call accepted:", call);

      // Remove the startCall - not needed for Direct Calls
      setCallAccepted(true);
    } catch (error) {
      console.log("Error accepting call:", error);
      await cleanupActiveCall();
      navigation.goBack();
    }
  };

  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Get logged in user's auth token
        const loggedInUser = await CometChat.getLoggedinUser();
        const authToken = loggedInUser.getAuthToken();

        // Generate call token
        const tokenResponse = await CometChatCalls.generateToken(sessionId, authToken);
        setCallToken(tokenResponse.token);

        const callListener = new CometChatCalls.OngoingCallListener({
          onUserJoined: user => {
            console.log("User joined:", user);
          },
          onUserLeft: user => {
            console.log("User left:", user);
            navigation.goBack();
          },
          onCallEnded: () => {
            console.log("Call ended");
            cleanupActiveCall();
            navigation.goBack();
          },
          onError: error => {
            console.log("Call Error:", error);
            cleanupActiveCall();
            navigation.goBack();
          }
        });

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
        await cleanupActiveCall();
        navigation.goBack();
      }
    };

    // Initialize call for both users when call is accepted
    if (callAccepted || isCaller) {
      initializeCall();
    }

    return () => {
      cleanupActiveCall();
    };
  }, [sessionId, navigation, callAccepted, isCaller]);

  // Update navigation handlers
  const handleRejectCall = async () => {
    try {
      await CometChat.rejectCall(sessionId, 'rejected');
      await cleanupActiveCall();
      navigation.goBack();
    } catch (error) {
      console.log("Error rejecting call:", error);
      await cleanupActiveCall();
      navigation.goBack();
    }
  };

  const handleCancelCall = async () => {
    try {
      await CometChat.cancelCall(sessionId, 'cancelled');
      await cleanupActiveCall();
      navigation.goBack();
    } catch (error) {
      console.log("Error cancelling call:", error);
      await cleanupActiveCall();
      navigation.goBack();
    }
  };

  if (isCaller && !callAccepted) {
    return (
      <View style={styles.callingContainer}>
        <Text style={styles.callText}>Calling...</Text>
        <Text style={styles.sessionIdText}>{`Session ID: ${sessionId}`}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelCall}
          >
            <Icon name="phone-off" size={40} color="#fff" />
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show accept/reject screen for receiver
  if (!isCaller && !callAccepted) {
    return (
      <View style={styles.incomingCallContainer}>
        <Text style={styles.callText}>Incoming Call...</Text>
        <Text style={styles.sessionIdText}>{`Session ID: ${sessionId}`}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleRejectCall}
          >
            <Icon name="x-circle" size={40} color="#fff" />
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAcceptCall}
          >
            <Icon name="phone" size={40} color="#fff" />
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show call component when call is accepted
  if (callSettings && callToken) {
    return (
      <View style={styles.container}>
        <CometChatCalls.Component
          callSettings={callSettings}
          callToken={callToken}
        />
      </View>
    );
  }

  // Show loading screen
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Initializing call...</Text>
    </View>
  );
};



const styles = StyleSheet.create({
  // ... existing styles ...
  incomingCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 30,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    marginHorizontal: 20,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
  callText: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  sessionIdText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 15,
    fontFamily: 'monospace'
  },
  callingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    padding: 20,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  // Update existing buttonText style
  buttonText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CallScreen;