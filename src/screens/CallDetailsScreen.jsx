// src/screens/CallDetailsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import { CometChatCalls } from '@cometchat/calls-sdk-react-native';

const CallDetailsScreen = ({ navigation,route }) => {
    const { sessionId,user } = route.params;
    const [userStatus, setUserStatus] = useState(null);
    const [lastActiveAt, setLastActiveAt] = useState(null);


    const authToken= user.getAuthToken();

    const [callDetails, setCallDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [otherUser, setOtherUser] = useState(null);

    

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const loggedInUser = await CometChat.getLoggedinUser();
                const loggedInUid = loggedInUser.getUid();

                const callLogs = await CometChatCalls.getCallDetails(sessionId, loggedInUser.getAuthToken());
                const call = callLogs?.[0];
                setCallDetails(call);

                // Determine the "other" user (not the logged-in user)
                const isInitiatorMe = call?.initiator?.uid === loggedInUid;
                const other = isInitiatorMe ? call?.receiver : call?.initiator;
                setOtherUser(other);

                // Get presence status of the other user
                if (other?.uid) {
                    try {
                        const freshUser = await CometChat.getUser(other.uid);
                        setUserStatus(freshUser.getStatus());
                        setLastActiveAt(freshUser.getLastActiveAt());
                    } catch (e) {
                        console.warn('Failed to fetch user presence:', e);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch call details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, []);
    

    // Use this for duration
    const formatDuration = (durationStr) => {
        return durationStr || '0m 0s';
    };

    // Use this for date
    const formatDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = date.getFullYear();
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `${day}/${month}/${year} at ${time}`;
    };
      
  

    const initiateCall = async () => {
        try {
            const receiverID = otherUser.uid;
            const callType = CometChat.CALL_TYPE.VIDEO;
            const receiverType = CometChat.RECEIVER_TYPE.USER;

            const call = new CometChat.Call(receiverID, callType, receiverType);
            const initiatedCall = await CometChat.initiateCall(call);

            if (initiatedCall && initiatedCall.getSessionId()) {
                navigation.navigate('Call', {
                    sessionId: initiatedCall.getSessionId(),
                    isCaller: true,
                });
            }
        } catch (err) {
            console.log('Failed to start call:', err);
            Alert.alert('Call Failed', err.message || 'Could not start call.');
        }
    };
      

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" />;
    }

    if (!callDetails || !otherUser) {
        return <Text style={{ padding: 20 }}>Failed to load call details.</Text>;
    }

    const isOutgoing = callDetails?.initiator?.uid === user.uid;

    const directionIcon = isOutgoing ? 'arrow-up-right' : 'arrow-down-left';
    const directionColor = isOutgoing ? '#007AFF' : '#34C759';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.name}>{otherUser.name || otherUser.uid}</Text>
                    <Text style={styles.status}>
                        {userStatus === 'online'
                            ? 'Online'
                            : `Last seen: ${lastActiveAt ? formatDate(lastActiveAt) : 'Unknown'}`}
                    </Text>


                </View>
                <TouchableOpacity onPress={initiateCall}>
                    <Icon name="phone" size={24} color="#075E54" />
                </TouchableOpacity>
            </View>

            {/* Call Info */}
            <View style={styles.infoCard}>
                <View style={styles.row}>
                    <Icon name={directionIcon} size={18} color={directionColor} style={{ marginRight: 8 }} />
                    <Text style={styles.infoLabel}>
                        {isOutgoing ? 'Outgoing Call' : 'Incoming Call'}
                    </Text>
                </View>

                <Text style={styles.infoText}>Date: {formatDate(callDetails.initiatedAt)}</Text>
                <Text style={styles.infoText}>Duration: {formatDuration(callDetails.totalDuration)}</Text>

                <Text style={styles.infoText}>
                    Status: {callDetails.status.charAt(0).toUpperCase() + callDetails.status.slice(1)}
                </Text>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#FAFAFA',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        elevation: 1,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#ccc',
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
    },
    status: {
        fontSize: 13,
        color: '#888',
    },
    infoCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 10,
        elevation: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    infoText: {
        fontSize: 14,
        color: '#444',
        marginBottom: 6,
    },
});

export default CallDetailsScreen;
