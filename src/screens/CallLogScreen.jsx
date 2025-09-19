import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Image,
} from 'react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import { CometChatCalls } from '@cometchat/calls-sdk-react-native';
import Icon from 'react-native-vector-icons/Feather'; // make sure you have this installed

const CallLogScreen = ({navigation}) => {
    const [callLogs, setCallLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [callLogRequest, setCallLogRequest] = useState(null);
    const [loggedInUid, setLoggedInUid] = useState(null);

    const getCallDetails = async (sessionId) => {
        try {
            const user = await CometChat.getLoggedinUser();
            const details = await CometChatCalls.getCallDetails(sessionId, user.getAuthToken());
            console.log("Call Details:", JSON.stringify(details));
            navigation.navigate('CallDetails', { details,user,sessionId });
        } catch (e) {
            console.log("Call detail fetch failed", e);
        }
    };


    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1️⃣ Get the logged-in user
                const loggedInUser = await CometChat.getLoggedinUser();
                setLoggedInUid(loggedInUser.uid);

                // 2️⃣ Build CallLogRequest
                const request = new CometChatCalls.CallLogRequestBuilder()
                    .setLimit(30)
                    .setAuthToken(loggedInUser.getAuthToken())
                    .setCallCategory('call')
                    .build();

                setCallLogRequest(request);

                // 3️⃣ Fetch first batch
                const results = await request.fetchNext();
                setCallLogs(results);
                console.log('Fetched initial call logs:', JSON.stringify(results));
            } catch (error) {
                console.warn('Failed to fetch call logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const fetchMore = async () => {
        if (!callLogRequest) return;
        try {
            const more = await callLogRequest.fetchNext();
            setCallLogs(prev => [...prev, ...more]);
        } catch (err) {
            console.warn('Pagination error:', err);
        }
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '';
        const date = new Date(ts);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const renderItem = ({ item }) => {
        // Ensure we skip calls initiated by the logged-in user to themselves
        if (item.initiator?.uid === loggedInUid && item.receiver?.uid === loggedInUid) {
            return null; // Don't render
        }

        // Determine if this was an outgoing call
        const isOutgoing = item?.initiator?.uid === loggedInUid;


        // Determine the other user
        const otherUser = isOutgoing ? item.receiver : item.initiator;

        const otherName = otherUser?.name || otherUser?.uid || 'Unknown';
        const otherAvatar = otherUser?.avatar || null;

        // Icons and colors
        const arrowIcon = isOutgoing ? 'arrow-up-right' : 'arrow-down-left';
        const arrowColor = isOutgoing ? '#007AFF' : '#34C759';
        const directionText = isOutgoing ? 'Outgoing Call' : 'Incoming Call';

        const callTypeIcon = item.type === 'video' ? 'video' : 'phone';

        // Format time
        const ts =
            item.callStartTime
                ? typeof item.callStartTime === 'number' && item.callStartTime > 1e12
                    ? item.callStartTime
                    : item.callStartTime * 1000
                : null;

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                style={styles.card}
                onPress={() => getCallDetails(item.sessionId)}
            >
                {/* Left Avatar */}
                <View style={styles.leftSection}>
                    {otherAvatar ? (
                        <Image source={{ uri: otherAvatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarPlaceholderText}>
                                {otherName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Middle Name + Status */}
                <View style={styles.centerSection}>
                    <View style={styles.rowTop}>
                        <Text style={styles.nameText}>{otherName}</Text>
                        <Text style={styles.timeText}>{formatTimestamp(ts)}</Text>
                    </View>

                    <View style={styles.rowBottom}>
                        <Icon name={arrowIcon} size={16} color={arrowColor} style={styles.arrowIcon} />
                        <Text style={styles.statusText}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Text>
                    </View>
                </View>

                {/* Right Call Type */}
                <View style={styles.rightSection}>
                    <Icon
                        name={callTypeIcon}
                        size={22}
                        color={item.type === 'video' ? '#E64A19' : '#075E54'}
                    />
                </View>
            </TouchableOpacity>
        );
    };
      

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#555" />
            </View>
        );
    }

    return (
        <FlatList
            data={callLogs}
            keyExtractor={(item) => item.sessionId}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.6}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No call logs yet.</Text>
                </View>
            }
        />
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: 50,
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        // Shadow for iOS:
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        // Elevation for Android:
        elevation: 2,
    },
    leftSection: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#ccc',
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ddd',
    },
    avatarPlaceholderText: {
        color: '#555',
        fontSize: 20,
        fontWeight: '600',
    },
    centerSection: {
        flex: 1,
        justifyContent: 'center',
    },
    rowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
    },
    timeText: {
        fontSize: 12,
        color: '#999',
    },
    rowBottom: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    arrowIcon: {
        marginRight: 6,
    },
    statusText: {
        fontSize: 14,
        color: '#666',
    },
    rightSection: {
        marginLeft: 12,
    },
});

export default CallLogScreen;
