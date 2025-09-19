import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const HomeScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);

  const fetchConversations = async () => {
    const limit = 30;
    const conversationRequest = new CometChat.ConversationsRequestBuilder()
      .setLimit(limit)
      .build();

    try {
      const convoList = await conversationRequest.fetchNext();
      setConversations(convoList);
    } catch (error) {
      console.log('Error fetching conversations:', error);
    }
  };

  useEffect(() => {
    fetchConversations();


    const interval = setInterval(() => {
      fetchConversations();
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storeUid = async () => {
      const user = await CometChat.getLoggedinUser();
      if (user?.uid) {
        await AsyncStorage.setItem('UID', user.uid);
        console.log('UID stored from HomeScreen:', user.uid);
      } else {
        console.log('No user logged in');
      }
    };

    storeUid();
  }, []);


  const renderItem = ({ item }) => {
    const userOrGroup = item.getConversationWith();
    const name = userOrGroup.getName();
    const dp = userOrGroup.avatar ? userOrGroup.avatar : userOrGroup.icon;

    const unreadCount = item.getUnreadMessageCount();
    const lastMessage = item.getLastMessage();
    const metadata = lastMessage?.getMetadata?.() || {};
    const isDeleted = !!lastMessage?.getDeletedAt?.() || !!metadata.deletedAt || lastMessage?.getText?.() === "This message was deleted";
    const isEdited = !!metadata.edited;
    const isReply = lastMessage?.getParentMessageId?.() > 0;

    let uid, guid;
    if ('getUid' in userOrGroup) uid = userOrGroup.getUid();
    if ('getGuid' in userOrGroup) guid = userOrGroup.getGuid();

    let lastText = 'No messages yet';
    let lastTime = '';

    if (lastMessage) {
      const sentAt = lastMessage.getSentAt();
      if (sentAt) {
        const date = new Date(sentAt * 1000);
        lastTime = date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      if (isDeleted) {
        lastText = '🗑️ This message was deleted';
      } else if (isReply) {
        lastText = '💬 Reply message';
      } else if (lastMessage.getType() === 'text') {
        lastText = lastMessage.getText();
        if (isEdited) lastText += ' (edited)';
      } else if (lastMessage.getType() === 'image') {
        lastText = '📷 Image';
      } else if (lastMessage.getType() === 'file') {
        lastText = '📎 File';
      }
    }

    const isUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('Chat', {
            user: {
              uid: uid || guid,
              name,
              dp,
              isGroup: !!guid,
            },
          })
        }
      >
        <View style={styles.avatarWrapper}>
          {dp ? (
            <Image source={{ uri: dp }} style={styles.avatar} />
          ) : (
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName}>{name}</Text>
            <View style={styles.rightColumn}>
              {isUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
              {lastTime ? (
                <Text style={styles.messageTime}>{lastTime}</Text>
              ) : null}
            </View>
          </View>

          <Text
            style={[
              styles.chatLastMessage,
              isUnread && styles.chatLastMessageUnread,
            ]}
            numberOfLines={1}
          >
            {lastText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };



  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Chats</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.getConversationId()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>No conversations found</Text>
        }
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ece5dd',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#075E54',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#555',
  },
  chatLastMessageUnread: {
    fontWeight: 'bold',
    color: '#111',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  avatarWrapper: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  initialsCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#bbb',
    justifyContent: 'center',
    alignItems: 'center',
  },

  initialsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },



});
