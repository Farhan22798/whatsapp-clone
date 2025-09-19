import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import { CometChatCalls } from '@cometchat/calls-sdk-react-native';
import Icon from 'react-native-vector-icons/Feather';
import { cleanupActiveCall } from '../utils/functions';




const CallScreen = ({ route, navigation }) => {
  const { sessionId, isCaller } = route.params;
  

  const [callAccepted, setCallAccepted] = useState(false);
  const [callToken, setCallToken] = useState(null);
  const [callSettings, setCallSettings] = useState(null);

  const handleAcceptCall = async () => {
    try {
      const acceptedCall = await CometChat.acceptCall(sessionId);
      console.log('✅ Call accepted:', acceptedCall);
      setCallAccepted(true);
      navigation.navigate('OnGoingCall', {
        sessionId: acceptedCall.sessionId,
        isCaller: false, // since you're accepting
      });
    } catch (error) {
      console.log('❌ Accept call error:', error);
      Alert.alert('Error', 'Failed to accept call');


    }
  };

  const handleRejectCall = async () => {
    try {
      await CometChat.rejectCall(sessionId, CometChat.CALL_STATUS.REJECTED);
      navigation.navigate('Main');

    
    } catch (error) {
      console.log('❌ Reject call error:', error);
      
    }
  };

  const handleCancelCall = async () => {
    try {
      await CometChat.rejectCall(sessionId, CometChat.CALL_STATUS.CANCELLED);
      navigation.navigate('Main');
     
    } catch (error) {
      console.log('❌ Cancel call error:', error);
    
    }
  };




  if (isCaller && !callAccepted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📞 Calling...</Text>
        <Text style={styles.subtitle}>Session ID: {sessionId}</Text>
        <TouchableOpacity style={[styles.button, styles.red]} onPress={handleCancelCall}>
          <Icon name="phone-off" size={32} color="#fff" />
          <Text style={styles.btnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Receiver view (incoming call)
  if (!isCaller && !callAccepted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📲 Incoming Call</Text>
        <Text style={styles.subtitle}>Session ID: {sessionId}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.red]} onPress={handleRejectCall}>
            <Icon name="x" size={32} color="#fff" />
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.green]} onPress={handleAcceptCall}>
            <Icon name="phone" size={32} color="#fff" />
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3. Active call view
  if (callToken && callSettings) {
    return (
      <View style={{ flex: 1 }}>
        <CometChatCalls.Component
          callToken={callToken}
          callSettings={callSettings}
        />
      </View>
    );
  }

  // 4. Fallback loading
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connecting...</Text>
    </View>
  );
};

export default CallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 30,
    fontFamily: 'monospace',
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    width: 80,
    height: 80,
    marginHorizontal: 15,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  green: {
    backgroundColor: '#4CAF50',
  },
  red: {
    backgroundColor: '#f44336',
  },
  btnText: {
    marginTop: 6,
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
});
