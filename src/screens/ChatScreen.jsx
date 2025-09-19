
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Video from 'react-native-video';
import { Picker as EmojiMart } from 'emoji-mart-native';
import Icon from 'react-native-vector-icons/Feather';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import ActionMessage from '../components/ActionMessages';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { SafeAreaView } from 'react-native-safe-area-context';


const ChatScreen = ({ navigation, route }) => {
  const { uid, name, isGroup, dp } = route.params.user;
  

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [typingIndicator, setTypingIndicator] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [lastActiveAt, setLastActiveAt] = useState(null);
  const typingTimeoutRef = useRef(null);
  const [isGroupOwner, setIsGroupOwner] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [myScope, setMyScope] = useState(''); 
  const [bannedModalVisible, setBannedModalVisible] = useState(false);
  const [bannedMembers, setBannedMembers] = useState([]);
  const [bannedLoading, setBannedLoading] = useState(false);

  const [scopeModal, setScopeModal] = useState({
    visible: false,
    uid: null,
    name: null,
    currentScope: null,
});
  const flatListRef = useRef(null);
  const messageRequestRef = useRef(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerMessage, setReactionPickerMessage] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '👍'];
  const ESTIMATED_ITEM_HEIGHT = 20;

  const menuOptionsStyles = {
    optionsContainer: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: '#fff',
      elevation: 5,
      width: 160,
    },
  };
  
  

  const handleAddReaction = async (messageId, reaction) => {
    try {
      await CometChat.addReaction(messageId, reaction);
      const messageDetails = await CometChat.getMessageDetails(messageId);
      const reactions = messageDetails.getReactions?.() || [];

      setMessages(prev =>
        prev.map(msg =>
          msg.getId() === messageId ? messageDetails : msg
        )
      );
    } catch (e) {
      Alert.alert("Error", "Failed to add reaction");
      console.log("Add reaction error:", e);
    }
  };

  const handleRemoveReaction = async (messageId, reaction) => {
    try {
      await CometChat.removeReaction(messageId, reaction);
      const messageDetails = await CometChat.getMessageDetails(messageId);
      const reactions = messageDetails.getReactions?.() || [];

      setMessages(prev =>
        prev.map(msg =>
          msg.getId() === messageId ? messageDetails : msg
        )
      );
    } catch (e) {
      Alert.alert("Error", "Failed to remove reaction");
      console.log("Remove reaction error:", e);
    }
  };


  const handleMessageReceiptUpdate = (messageReceipt, type) => {
    const { messageId } = messageReceipt;
    const timestamp = type === 'read' ? messageReceipt.readAt : messageReceipt.deliveredAt;

    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.getId() === messageId) {
          if (type === 'delivered') {
            msg.setDeliveredAt(timestamp);
            console.log(`💾 Updated deliveredAt for ${messageId}:`, timestamp);
          } else if (type === 'read') {
            msg.setReadAt(timestamp);
            console.log(`💾 Updated readAt for ${messageId}:`, timestamp);
          }
        }
        return msg;
      })
    );
  };
  



  const pickAndSendMedia = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.images,
          DocumentPicker.types.video,
          DocumentPicker.types.audio,
        ],
        copyTo: 'cachesDirectory',
      });


      let messageType = CometChat.MESSAGE_TYPE.IMAGE;
      if (result.type.startsWith('video')) {
        messageType = CometChat.MESSAGE_TYPE.VIDEO;
      } else if (result.type.startsWith('audio')) {
        messageType = CometChat.MESSAGE_TYPE.AUDIO;
      }


      const file = {
        name: result.name,
        type: result.type,
        uri: Platform.OS === 'android' ? result.fileCopyUri : result.uri,
      };


      const mediaMessage = new CometChat.MediaMessage(
        uid,
        file,
        messageType,
        isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
      );


      CometChat.sendMediaMessage(mediaMessage)
        .then(msg => {
          setMessages(prev => [...prev, msg]);
          setTimeout(scrollToBottom, 500);
        })
        .catch(error => {
          console.log('Media sending failed:', error);
          Alert.alert('Error', 'Failed to send media');
        });
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to pick media');
      }
    }
  };



  const fetchMessages = async (initial = false) => {
    if (!messageRequestRef.current || loadingMore || !hasMoreMessages) return;

    try {
      setLoadingMore(true);
      const fetched = await messageRequestRef.current.fetchPrevious();
      

      if (fetched.length === 0) {
        setHasMoreMessages(false);
      } else {



        if (initial) {
          setMessages(fetched);
          fetched.forEach(msg => CometChat.markAsDelivered(msg).catch(() => { }));
          const last = fetched[fetched.length - 1];
          if (!last.getReadAt()) CometChat.markAsRead(last).catch(() => { });
        } else {
          setMessages(prev => [...fetched, ...prev]);
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: fetched.length * ESTIMATED_ITEM_HEIGHT,
              animated: false,
            });
          }, 100);
        }
      }
    } catch (e) {
      console.log("Pagination fetch error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchGroupMembers = async () => {
    setLoadingMembers(true);
    const membersRequest = new CometChat.GroupMembersRequestBuilder()
      .setGuid(uid)
      .setLimit(30)
      .build();

    try {
      const members = await membersRequest.fetchNext();
      setGroupMembers(members);


      const me = members.find(m => m.uid === loggedInUser?.uid);
      setMyScope(me ? me.scope : 'participant');
      console.log(myScope,"mera scope hai")

      setShowMembersModal(true);
    } catch (err) {
      Alert.alert("Error", "Could not load group members");
      console.log("Fetch group members error:", err);
    } finally {
      setLoadingMembers(false);
    }
  };
  

  const fetchAllUsers = async () => {
    try {
      const usersRequest = new CometChat.UsersRequestBuilder()
        .setLimit(30)
        // .setTags(['fam'])
        .build();
      const users = await usersRequest.fetchNext()
      setAllUsers(users);
      setShowAddMembersModal(true);
    } catch (e) {
      console.log('Could not fetch users:', e);
      Alert.alert('Error', 'Could not fetch users.');
    }
  };

  const pushLocalGroupActionMessage = (text, actorUid) => {
    const actionMsg = new CometChat.TextMessage(
      uid,
      text,
      CometChat.RECEIVER_TYPE.GROUP
    );

    actionMsg.setCategory(CometChat.CATEGORY_ACTION);
    actionMsg.setType('groupMember');
    actionMsg.message = text;

   
    actionMsg.setMetadata({ isSelfAction: true, actor: actorUid });

    setMessages(prev => [...prev, actionMsg]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  
  
  


  const addUserToGroup = async (userId) => {
    try {
      const membersList = [
        new CometChat.GroupMember(userId, CometChat.GROUP_MEMBER_SCOPE.PARTICIPANT)
      ];
      await CometChat.addMembersToGroup(uid, membersList, []);
      Alert.alert('Added', `User ${userId} added!`);
      setShowAddMembersModal(false);
      fetchGroupMembers();

      const addedUser = allUsers.find(u => u.uid === userId);
      const name = addedUser?.name || userId;

      pushLocalGroupActionMessage(`You added ${name}`, loggedInUser?.uid);
    } catch (err) {
      console.log('Add member failed:', err);
      Alert.alert('Error', 'Could not add user.');
    }
  };
  
  const handleKickMember = async (memberUid) => {
    try {
      await CometChat.kickGroupMember(uid, memberUid);
      Alert.alert("Removed", "User removed from group.");
      fetchGroupMembers();

      const kickedUser = groupMembers.find(u => u.uid === memberUid);
      const name = kickedUser?.name || memberUid;

      pushLocalGroupActionMessage(`You removed ${name}`, loggedInUser?.uid);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to remove user.");
    }
  };
  

  const leaveGroup = (guid) => {
    Alert.alert(
      "Leave Group?",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave", style: "destructive", onPress: async () => {
            try {
              await CometChat.leaveGroup(guid);
              Alert.alert("Left group", "You have left the group.");

              pushLocalGroupActionMessage(`You left the group`, loggedInUser?.uid);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Failed", error.message || "Failed to leave group");
            }
          }
        },
      ]
    );
  };

  const handleDeleteConversation = () => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const conversationId = isGroup ? uid : uid;
            const type = isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER;

            try {
              const result = await CometChat.deleteConversation(conversationId, type);
              console.log("Conversation deleted:", result);
              navigation.goBack(); 
            } catch (error) {
              console.warn("Error deleting conversation:", error);
              Alert.alert("Error", "Failed to delete conversation.");
            }
          },
        },
      ]
    );
  };
  
  

  const handleScopeChange = async (memberUid, newScope) => {
    try {
      await CometChat.updateGroupMemberScope(uid, memberUid, newScope);
      console.log("Done updating scope","uid:", uid,"memebrUid:",memberUid,"newScope:", newScope);
      Alert.alert("Success", "Role updated!");
      setScopeModal({ visible: false, uid: null, currentScope: null });
      setShowMembersModal(false);
      setTimeout(() => fetchGroupMembers(), 500);
      setTimeout(() => setShowMembersModal(true), 700);

      const targetUser = groupMembers.find(u => u.uid === memberUid);
      const name = targetUser?.name || memberUid;

      pushLocalGroupActionMessage(`You changed ${name}'s role to ${newScope}`, loggedInUser?.uid);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update role.");
    }
  };
  

  const handleDeleteGroup = (guid) => {
    Alert.alert(
      "Delete Group?",
      "Are you sure you want to delete this group? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            try {
              await CometChat.deleteGroup(guid);
              Alert.alert("Deleted", "The group has been deleted.");

              pushLocalGroupActionMessage(`You deleted the group`, loggedInUser?.uid);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Failed", error.message || "Failed to delete group.");
            }
          }
        },
      ]
    );
  };


  const handleBanMember = async ({ uid: memberUid, name }) => {
    try {
      await CometChat.banGroupMember(uid, memberUid);
      Alert.alert("Banned", "User has been banned from the group.");
      fetchGroupMembers();

      pushLocalGroupActionMessage(`You banned ${name || memberUid}`, loggedInUser?.uid);
    } catch (error) {
      Alert.alert("Failed", error.message || "Could not ban member.");
    }
  };
  

  const handleUnbanMember = async (memberUid) => {
    try {
      await CometChat.unbanGroupMember(uid, memberUid);
      Alert.alert("Unbanned", "User has been unbanned from the group.");
      fetchBannedMembers();
      fetchGroupMembers();
  
     
  
      pushLocalGroupActionMessage(`You unbanned ${name}`, loggedInUser?.uid);
    } catch (error) {
      Alert.alert("Failed", error.message || "Could not unban member.");
    }
  };
  

  const fetchBannedMembers = async () => {
    setBannedLoading(true);
    try {
      const limit = 30;
      const bannedRequest = new CometChat.BannedMembersRequestBuilder(uid)
        .setLimit(limit)
        .build();

      const fetched = await bannedRequest.fetchNext();
      setBannedMembers(fetched);
      setBannedModalVisible(true);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to fetch banned members.");
    } finally {
      setBannedLoading(false);
    }
  };
  
  
  
  
  

  const canChangeScope = (myScope, targetScope) => {
   
    if (myScope === 'admin') return targetScope !== 'admin';
    if (myScope === 'moderator') return targetScope === 'participant';
    return false;
  };
  
  
  const canKick = (myScope, targetScope, isMe) => {
    if (isMe) return false; 
    if (myScope === 'admin') return targetScope !== 'admin'; 
    if (myScope === 'moderator') return targetScope === 'participant';
    return false;
  };
  

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const makeCall = async () => {
    try {
      const receiverID = uid; 
      const callType = CometChat.CALL_TYPE.AUDIO;
      const receiverType = CometChat.RECEIVER_TYPE.USER;

      const call = new CometChat.Call(receiverID, callType, receiverType);
      call.setMetadata({
      "new":"metajson"

      });
      console.log("meta sent",call)
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


  
  
  
  const sendGroupCallInvite = async (callTypeParam) => {
    const receiverID = uid; 
    const receiverType = CometChat.RECEIVER_TYPE.GROUP;
    const callType = callTypeParam === 'audio' ? CometChat.CALL_TYPE.AUDIO : CometChat.CALL_TYPE.VIDEO;

    try {
      // console.log("ghusa yaha tak", receiverID, callType, receiverType)
      const call = new CometChat.Call(receiverID, callType, receiverType);
      const initiatedCall = await CometChat.initiateCall(call);


      // console.log("aaya yaha tak call and initiateedCall", call, initiatedCall)

      const customData = {
        sessionId: initiatedCall.getSessionId(),
        isCaller: true,
        callType: callTypeParam,
      };
      // console.log("aaya yaha tak ", customData)

      const customMessage = new CometChat.CustomMessage(
        receiverID,
        receiverType,
        "group-call",
        customData
      );

      customMessage.setConversationText("Group video call started. Tap to join!");

      await CometChat.sendCustomMessage(customMessage);

      // console.log("aaya yaha tak ", customMessage)

      
      navigation.navigate('OnGoingCall', {
        sessionId: customData.sessionId,
        isCaller: true,
      });

    } catch (err) {
      console.log("Group call initiation failed:", err);
      Alert.alert("Call failed", err.message);
    }
  };
  

  

  const joinGroupCall = (sessionId) => {
    navigation.navigate('OnGoingCall', {
      sessionId,
      isCaller: false
    });
  };
  
  
  
  
  
//old group call logic , calls popup on each group member's screens
  const initiateGroupCall = async (callType) => {
    try {
      const receiverID = uid; 
      const callType = callType === 'audio' ? CometChat.CALL_TYPE.AUDIO : CometChat.CALL_TYPE.VIDEO;
      const receiverType = CometChat.RECEIVER_TYPE.GROUP;

      const call = new CometChat.Call(receiverID, callType, receiverType);
      const initiatedCall = await CometChat.initiateCall(call);

      if (initiatedCall && initiatedCall.getSessionId()) {
        navigation.navigate('Call', {
          sessionId: initiatedCall.getSessionId(),
          isCaller: true,
        });
      }
    } catch (error) {
      console.warn('Group call failed:', error);
      Alert.alert('Call Failed', error.message || 'Unable to start group call.');
    }
  };

  
  


  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone) {
      setTimeout(() => {
        scrollToBottom();
        setInitialScrollDone(true);
      }, 1000);
    }
  }, [messages, initialScrollDone]);

  //group listener
  useEffect(() => {
    CometChat.getLoggedinUser().then(user => setLoggedInUser(user));

    if (!isGroup || !uid) return;

    const listenerID = `GROUP_LISTENER_${uid}`;

    CometChat.addGroupListener(
      listenerID,
      new CometChat.GroupListener({
        onGroupMemberJoined: (message) => {
          if (message?.getReceiver() !== uid) return;
          setMessages(prev => [...prev, message]);
        },
        onGroupMemberLeft: (message) => {
          if (message?.getReceiver() !== uid) return;
          setMessages(prev => [...prev, message]);
        },
        onMemberAddedToGroup: (message) => {
          if (message?.getReceiver() !== uid) return;
          setMessages(prev => [...prev, message]);
          setTimeout(scrollToBottom, 100);
        },
        onGroupMemberKicked: (message) => {
          if (message?.getReceiver() !== uid) return;
          setMessages(prev => [...prev, message]);
          setTimeout(scrollToBottom, 100);
        },
        onGroupMemberBanned: (message) => {
          if (message?.getReceiver() !== uid) return;
          setMessages(prev => [...prev, message]);
        },
        onGroupMemberUnbanned: (message) => {
          if (message?.getReceiver() !== uid) return;
          setMessages(prev => [...prev, message]);
        },
        onGroupMemberScopeChanged: (message) => {
          console.log(JSON.stringify(message),"Scope Changed Message")
          if (message?.getReceiver() !== uid) return;
          setMessages(prev => [...prev, message]);
        },
        onCustomMessageReceived: (message) => {
          console.log("📩 Custom message received:", message);

          const receiver = message.getReceiver();
          const receiverType = message.getReceiverType();

          // Verify the message is specifically for the current group
          const isForCurrentGroup = receiverType === CometChat.RECEIVER_TYPE.GROUP && receiver.guid === uid;

          if (!isForCurrentGroup) {
            console.log("📭 Ignored unrelated custom message:", message);
            return;
          }

          setMessages(prev => [...prev, message]);
          setTimeout(scrollToBottom, 100);
        },
        
      })
    );
    

    return () => {
      CometChat.removeGroupListener(listenerID);
    };
  }, [uid, isGroup]);
  


//message listener
  useEffect(() => {
    CometChat.getLoggedinUser().then(user => setLoggedInUser(user));

    const limit = 30;
    const requestBuilder = isGroup
      ? new CometChat.MessagesRequestBuilder().setGUID(uid).setLimit(limit).hideReplies(true)
      : new CometChat.MessagesRequestBuilder().setUID(uid).setLimit(limit).hideReplies(true)

    messageRequestRef.current = requestBuilder.build();
    fetchMessages(true);

    const listenerID = `CHAT_LISTENER_${uid}`;



    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({

       


        

        onTextMessageReceived: (message) => {
          const senderId = message.getSender().getUid();
          const receiverId = message.getReceiver();
          const receiverType = message.getReceiverType();

          const isForCurrentChat = isGroup
            ? receiverType === CometChat.RECEIVER_TYPE.GROUP && receiverId.guid === uid
            : receiverType === CometChat.RECEIVER_TYPE.USER &&
            (senderId === uid || receiverId === uid);

         
          CometChat.markAsDelivered(message).catch(() => { });

          if (!isForCurrentChat) {
            console.log("📭 Ignored unrelated message:", message);
            return;
          }

          console.log("📥 Text Message Received:", message);
          setMessages(prev => [...prev, message]);

          
          if (!isGroup && senderId !== uid) {
            CometChat.markAsDelivered(message).catch(() => { });
            CometChat.markAsRead(message).catch(() => { });
          }


          setTimeout(scrollToBottom, 100);
        },
        

        onMediaMessageReceived: (message) => {


          const senderId = message.getSender().getUid();
          const receiverId = message.getReceiver();
          const receiverType = message.getReceiverType();

          const isForCurrentChat = isGroup
            ? receiverType === CometChat.RECEIVER_TYPE.GROUP && receiverId.guid === uid
            : receiverType === CometChat.RECEIVER_TYPE.USER &&
            (senderId === uid || receiverId === uid);

          CometChat.markAsDelivered(message).catch(() => { });


          if (!isForCurrentChat) {
            console.log("📭 Ignored unrelated media message:", message);
            return;
          }

          console.log("📥 Media Message Received:", message);
          setMessages(prev => [...prev, message]);



     
          if (!isGroup && senderId !== uid) {
            CometChat.markAsDelivered(message).catch(() => { });
            CometChat.markAsRead(message).catch(() => { });
          }


          setTimeout(scrollToBottom, 500);
        },

       

        onMessageReactionAdded: async (reactionEvent) => {
          console.log("➕ Reaction Added Event Received:", reactionEvent);
          console.log("🎯 reactionEvent.reaction:", reactionEvent.reaction);

          const messageId = reactionEvent.reaction?.messageId;

          if (!messageId) {
            console.warn("⚠️ No valid messageId found in reactionEvent");
            return;
          }

          // Try to find the message locally first
          setMessages(prev => {
            const msgExists = prev.some(msg => msg.getId?.() === messageId);
            if (!msgExists) {
              console.warn("⚠️ Message not found in local state. Will attempt fetch.");
            }

            return prev.map(msg => {
              if (msg.getId?.() === messageId) {
                // Inject the reaction manually into the local message
                const currentReactions = msg.getReactions?.() || [];

                // Avoid duplicates
                const exists = currentReactions.some(r => r.id === reactionEvent.reaction.id);
                if (!exists) {
                  currentReactions.push(reactionEvent.reaction);
                  msg.setReactions?.(currentReactions);
                }

                return msg;
              }
              return msg;
            });
          });

          // Optionally: still try fetching from server (fallback)
          try {
            const fullMessage = await CometChat.getMessageDetails({ messageId });
            setMessages(prev =>
              prev.map(msg => (msg.getId?.() === messageId ? fullMessage : msg))
            );
          } catch (e) {
            console.log("❌ Fallback fetch failed after reaction:", e);
          }
        },
        onMessageReactionRemoved: async (reactionEvent) => {
          console.log("➖ Reaction Removed Event Received:", reactionEvent);
          const messageId = reactionEvent.reaction?.messageId;
          const emojiToRemove = reactionEvent.reaction?.reaction;

          if (!messageId || !emojiToRemove) {
            console.warn("⚠️ Invalid reaction event. Missing messageId or emoji.");
            return;
          }

          // Step 1: Update locally
          setMessages(prev => {
            return prev.map(msg => {
              const msgId = msg.getId?.() || msg.id;
              if (msgId === messageId) {
                const currentReactions = msg.getReactions?.() || [];

                const updatedReactions = currentReactions.map(r => {
                  if (r.reaction === emojiToRemove) {
                    const newCount = r.count - 1;
                    return newCount > 0
                      ? { ...r, count: newCount, getReactedByMe: () => false }
                      : null;
                  }
                  return r;
                }).filter(Boolean);

                msg.setReactions?.(updatedReactions);
                return msg;
              }
              return msg;
            });
          });

          // Step 2: fallback (non-blocking)
          try {
            const fullMessage = await CometChat.getMessageDetails({ messageId });
            setMessages(prev =>
              prev.map(msg => (msg.getId?.() === messageId ? fullMessage : msg))
            );
          } catch (e) {
            console.log("❌ Failed to fetch updated message after removing reaction:", e);
          }
        },


        onMessagesDelivered: (messageReceipt) => {
          console.log("📬 Delivered:", messageReceipt);
          handleMessageReceiptUpdate(messageReceipt, 'delivered');
        },
        
        onMessagesRead: (messageReceipt) => {
          console.log("Message Read:", messageReceipt);
          handleMessageReceiptUpdate(messageReceipt, 'read');
        },

        onMessageEdited: (message) => {
          const editedMessage = CometChat.TextMessage
            ? new CometChat.TextMessage(message.getReceiver(), message.getText(), message.getReceiverType())
            : message;

          editedMessage.setId(message.getId());
          editedMessage.setSender(message.getSender());
          editedMessage.setReceiver(message.getReceiver());
          editedMessage.setSentAt(message.getSentAt());
          editedMessage.setType(message.getType());
          editedMessage.setMetadata({ ...(message.getMetadata?.() || {}), edited: true });

          setMessages(prev =>
            prev.map(msg =>
              msg.getId() === message.getId()
                ? editedMessage
                : msg
            )
          );
        },


        onMessageDeleted: (message) => {
          const deletedMessage = new CometChat.TextMessage(
            message.getReceiver(),
            "This message was deleted",
            message.getReceiverType()
          );
          deletedMessage.setId(message.getId());
          deletedMessage.setSender(message.getSender());
          deletedMessage.setReceiver(message.getReceiver());
          deletedMessage.setSentAt(message.getSentAt());
          deletedMessage.setType(CometChat.MESSAGE_TYPE.TEXT);
          deletedMessage.setDeletedAt(Math.floor(Date.now() / 1000));
          deletedMessage.setMetadata({ ...(message.getMetadata?.() || {}), deletedAt: Date.now() });

          setMessages(prev =>
            prev.map(msg =>
              msg.getId() === deletedMessage.getId()
                ? deletedMessage
                : msg
            )
          );
        },




        onTypingStarted: (typingData) => {
          const senderId = typingData.sender.uid;
          const receiverType = typingData.receiverType;
          const receiverId = typingData.receiverId;

          const isFromCurrentChat =
            receiverType === CometChat.RECEIVER_TYPE.GROUP
              ? isGroup && receiverId === uid
              : !isGroup && senderId === uid;

          if (isFromCurrentChat) {
            if (receiverType === CometChat.RECEIVER_TYPE.GROUP) {
              setTypingIndicator(`${typingData.sender.name || senderId} is typing...`);
            } else {
              setTypingIndicator('typing...');
            }
          } else {
            console.log("💬 Ignored typing from unrelated chat:", senderId);
          }
        },

        onTypingEnded: (typingData) => {
          const senderId = typingData.sender.uid;
          const receiverType = typingData.receiverType;
          const receiverId = typingData.receiverId;

          const isFromCurrentChat =
            receiverType === CometChat.RECEIVER_TYPE.GROUP
              ? isGroup && receiverId === uid
              : !isGroup && senderId === uid;

          if (isFromCurrentChat) {
            setTypingIndicator('');
          }
        },
       
        
        




     
        
        




      })
    );

    return () => CometChat.removeMessageListener(listenerID);
  }, [uid]);

//thread reply listener
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("THREAD_REPLY_ADDED", (updatedParentMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.getId() === updatedParentMessage.getId() ? updatedParentMessage : msg
        )
      );
    });

    return () => subscription.remove();
  }, []);



//user presence listener
  useEffect(() => {
    const listenerID = `USER_PRESENCE_LISTENER_${uid}`;
    CometChat.addUserListener(
      listenerID,
      new CometChat.UserListener({
        onUserOnline: (onlineUser) => {
          if (onlineUser.getUid() === uid) setUserStatus('online');
        },
        onUserOffline: (offlineUser) => {
          if (offlineUser.getUid() === uid) {
            setUserStatus('offline');
            setLastActiveAt(offlineUser.getLastActiveAt());
          }
        },
      })
    );

    return () => CometChat.removeUserListener(listenerID);
  }, [uid]);



  useEffect(() => {
    if (!isGroup) {
      CometChat.getUser(uid).then(
        user => {
          setUserStatus(user.getStatus());
          setLastActiveAt(user.getLastActiveAt());
        },
        error => console.log('Error fetching user details:', error)
      );
    }
  }, [uid, isGroup]);

  useEffect(() => {
    if (!isGroup || !loggedInUser) return;
    CometChat.getGroup(uid)
      .then(group => {
        const ownerUid = group.getOwner();
        const myUid = loggedInUser.uid;
        console.log('Group owner UID:', ownerUid);
        console.log('My UID:', myUid);
        setIsGroupOwner(ownerUid === myUid);
      })
      .catch(console.log);
  }, [uid, isGroup, loggedInUser]);


  const sendMessage = () => {
    if (!messageText.trim()) return;

    if (editingMessage) {
      editingMessage.setText(messageText);

      editingMessage.setMetadata({ ...(editingMessage.getMetadata() || {}), edited: true });

      CometChat.editMessage(editingMessage).then(
        (updatedMessage) => {
          setMessages(prev =>
            prev.map(msg => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
          setMessageText('');
          setEditingMessage(null);
        },
        error => console.log("Edit failed:", error)
      );
      return;
    }

    const textMessage = new CometChat.TextMessage(
      uid,
      messageText,
      isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
    );

    CometChat.sendMessage(textMessage).then(
      msg => {
        setMessages(prev => [...prev, msg]);
        setMessageText('');
        setTimeout(scrollToBottom, 100);
      },
      error => console.log('Send message error:', error)
    );
  };

  const getScopeDisplay = (scope) => {
    switch (scope) {
      case "admin":
        return "Admin";
      case "owner":
        return "Owner";
      case "moderator":
        return "Moderator";
      case "participant":
      default:
        return "Member";
    }
  }
  

  const handleTyping = (text) => {
    setMessageText(text);

    const typingIndicator = new CometChat.TypingIndicator(
      uid,
      isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
    );

    CometChat.startTyping(typingIndicator);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      CometChat.endTyping(typingIndicator);
      typingTimeoutRef.current = null;
    }, 500);
  };

  const handleDeleteMessage = (message) => {
    CometChat.deleteMessage(message.getId()).then(
      () => {
        const deletedMessage = new CometChat.TextMessage(
          message.getReceiver(),
          "This message was deleted",
          message.getReceiverType()
        );
        deletedMessage.setId(message.getId());
        deletedMessage.setSender(message.getSender());
        deletedMessage.setReceiver(message.getReceiver());
        deletedMessage.setSentAt(message.getSentAt());
        deletedMessage.setType(CometChat.MESSAGE_TYPE.TEXT);
        deletedMessage.setDeletedAt(Math.floor(Date.now() / 1000));
        deletedMessage.setMetadata({ ...(message.getMetadata?.() || {}), deletedAt: Date.now() });

       
        setMessages(prev =>
          prev.map(msg =>
            msg.getId() === message.getId()
              ? deletedMessage
              : msg
          )
        );
      },
      error => {
        console.log("Delete failed:", error);
        Alert.alert("Error", "Failed to delete message.");
      }
    );
  };

 



  const onLongPressMessage = (message) => {
    if (!loggedInUser) return;

    const metadata = message.getMetadata?.() || {};
    const isDeleted = !!message.getDeletedAt?.() || !!metadata.deletedAt || message.getText?.() === "This message was deleted";
    if (isDeleted) return;

    setReactionPickerMessage(message);
    setShowReactionPicker(true);
  };


  const renderItem = ({ item }) => {
    
   

    if (!item || typeof item !== 'object' ||
      !item.getSender || typeof item.getSender !== 'function' ||
      !item.getType || typeof item.getType !== 'function' ||
      !item.getId || typeof item.getId !== 'function') {
      return null;
    }

    if (item.getCategory?.() === CometChat.CATEGORY_CUSTOM && item.getType?.() === 'group-call') {
      const data = item.getCustomData?.() || {};
      const { sessionId, callType } = data;

      if (!sessionId) return null;

      return (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            marginVertical: 10,
            marginHorizontal: 16,
            borderWidth: 1,
            borderColor: '#ddd',
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            📞 {callType === 'audio' ? 'Audio Call' : 'Video Call'}
          </Text>
          <Text style={{ fontSize: 14, color: '#555', marginBottom: 14 }}>
            A group {callType} call has started. Tap below to join.
          </Text>
          <TouchableOpacity
            onPress={() => joinGroupCall(sessionId)}
            style={{
              backgroundColor: '#075E54',
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
              Join Call
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    
    
    

  

    if (item.getCategory?.() === CometChat.CATEGORY_CALL) {
      const status = item.getStatus?.();    // e.g. 'ended', 'unanswered', 'canceled'
      if (status === CometChat.CALL_STATUS.INITIATED ||
        status === CometChat.CALL_STATUS.ONGOING) {
        return null;  // skip intermediate states
      }

      const type = item.getType?.();        // AUDIO or VIDEO
      const isAudio = type === CometChat.MESSAGE_TYPE.AUDIO;
      const isOutgoing = item.getSender?.().getUid?.() === loggedInUser?.uid;
      const other = (isOutgoing
        ? item.getReceiver()?.getName?.() ?? item.getReceiverId?.()
        : item.getSender()?.getName?.());

      let displayText = '';

      if (status === CometChat.CALL_STATUS.ENDED) {
        displayText = isOutgoing
          ? `You made an ${isAudio ? 'audio' : 'video'} call`
          : `${other} made an ${isAudio ? 'audio' : 'video'} call`;
      } else if (status === CometChat.CALL_STATUS.UNANSWERED) {
        displayText = isOutgoing
          ? 'You missed an outgoing call'
          : `You missed a call from ${other}`;
      } else {
        const stat = status.charAt(0).toUpperCase() + status.slice(1);
        displayText = isOutgoing
          ? `You ${stat.toLowerCase()} the call`
          : `${other} ${stat.toLowerCase()} the call`;
      }

      return (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <Text style={{ backgroundColor: '#eee', padding: 8, borderRadius: 6 }}>
            📞 {displayText}
          </Text>
        </View>
      );
    }
    

    // if (
    //   item.getCategory?.() === CometChat.CATEGORY_CALL &&
    //   item.getStatus?.() === CometChat.CALL_STATUS.ENDED
    // ) {
    //   const isOutgoing = item.getSender?.().getUid?.() === loggedInUser?.uid;
    //   const callType = item.getType?.(); // audio or video
    //   const otherUserName = isOutgoing
    //     ? item.getReceiverId?.() // or getReceiver()?.getName()
    //     : item.getSender?.().getName?.();

    //   const displayText = isOutgoing
    //     ? `You made a ${callType} call`
    //     : `${otherUserName} made a ${callType} call`;

    //   return (
    //     <View style={{ alignItems: 'center', marginVertical: 10 }}>
    //       <Text style={{ backgroundColor: '#eee', padding: 8, borderRadius: 6 }}>
    //         📞 {displayText}
    //       </Text>
    //     </View>
    //   );
    // }
    

   
    
    
  

    
    if (item.category === 'action' || item.type === 'groupMember') {
      const rawMessage = item.message || item.getMessage?.();
      if (!rawMessage || !rawMessage.trim()) return null; // <-- Prevent blank action messages

      const senderUid = item.getSender?.()?.getUid?.();
      const senderName = item.getSender?.()?.getName?.();
      const isMyMessage = senderUid === loggedInUser?.uid;

      let finalMessage = rawMessage;

      // console.log(JSON.stringify(item),"action msg")

      if (isMyMessage && senderName && rawMessage?.startsWith(senderName)) {
        finalMessage = rawMessage.replace(senderName, "You");
      }

      return <ActionMessage text={finalMessage} />;
    }
    
    

    try {
      const sender = item.getSender();

      if (!sender || typeof sender.getUid !== 'function') {
        return null;
      }
      const isMyMessage = loggedInUser && sender.getUid() === loggedInUser.uid;


      const metadata = item.getMetadata?.() || {};
      const isDeleted = !!item.getDeletedAt?.() || !!metadata.deletedAt || item.getText?.() === "This message was deleted";


      const isEdited = !!metadata.edited;



      if (isDeleted) {
        return (
          <View
            style={[
              styles.messageItem,
              isMyMessage ? styles.myMessage : styles.theirMessage,
              { backgroundColor: '#f0f0f0' }
            ]}
          >
            <Text style={{ fontStyle: 'italic', color: '#888' }}>
              🗑️ This message was deleted
            </Text>
          </View>
        );
      }

      const renderMediaContent = () => {
        const attachment = item.getAttachment?.();
        if (!attachment) {
          console.warn("⚠️ no attachment on media message", item);
          return null;
        }
        const url = attachment.fileUrl || attachment.url;
        if (!url) {
          console.warn("⚠️ media has no URL", attachment);
          return null;

        }

        switch (item.getType()) {
          case CometChat.MESSAGE_TYPE.IMAGE:
            return (
              <Image
                source={{ uri: url }}
                style={styles.mediaImage}
                resizeMode="cover"
                pointerEvents="none"
              />
            );
          case CometChat.MESSAGE_TYPE.VIDEO:
            return (
              <Video
                source={{ uri: url }}
                style={styles.mediaVideo}
                controls={true}
                paused={true}
                pointerEvents="none"
              />
            );
          case CometChat.MESSAGE_TYPE.AUDIO:
            return (
              <View style={styles.audioContainer}>
                <Icon name="headphones" size={24} color="#075E54" />
                <Video
                  source={{ uri: url }}
                  audioOnly={true}
                  controls={true}
                  paused={true}
                  style={styles.audioPlayer}
                  pointerEvents="none"
                />
              </View>
            );
          default:
            return null;
        }

      };




      return (
        <TouchableOpacity
          onLongPress={() => onLongPressMessage(item)}
          onPress={() => {
            navigation.navigate('Thread', {
              parentMessage: item,
              user: { uid, name, dp },
              isGroup,
            });
          }}

          activeOpacity={0.7}
        >
          <View
            style={[
              styles.messageItem,
              isMyMessage ? styles.myMessage : styles.theirMessage,
            ]}
          >
            <Text style={styles.sender}>
              {isMyMessage ? 'You' : (sender.getName?.() || 'Unknown')}
            </Text>

            {item.getType() === CometChat.MESSAGE_TYPE.TEXT ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={styles.text}>{item.getText?.() || ''}</Text>
                {isEdited && (
                  <Text style={styles.editedTag}> (edited)</Text>
                )}
              </View>
            ) : (
              renderMediaContent()
            )}

            <Text style={{ fontSize: 10, color: '#666', marginTop: 4, alignSelf: 'flex-end' }}>
              {formatTimestamp(item.getSentAt?.())}
            </Text>



            {isMyMessage && (
              <Text style={[styles.deliveryStatus, item.getReadAt?.() && styles.read]}>
                {item.getReadAt?.()
                  ? '✓✓'
                  : item.getDeliveredAt?.()
                    ? '✓✓'
                    : '✓'}
              </Text>
            )}




            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              {(item.getReactions?.() || []).map((reaction, index) => {
                const reactedByMe = reaction.getReactedByMe?.() || false;
                return (
                  <TouchableOpacity
                    key={`${reaction.reaction}_${index}`}
                    style={{
                      backgroundColor: reactedByMe ? '#d0f0d0' : '#eee',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginRight: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      if (reactedByMe) {
                        handleRemoveReaction(item.getId(), reaction.reaction);
                      } else {

                        console.log("You haven't reacted with this emoji.");
                      }
                    }}
                  >
                    <Text style={{
                      color: reactedByMe ? '#075E54' : '#000',
                      fontWeight: reactedByMe ? 'bold' : 'normal',
                    }}>
                      {reaction.reaction} {reaction.count}
                    </Text>


                  </TouchableOpacity>
                );
              })}
            </View>

            {item.getReplyCount?.() > 0 && (
              <TouchableOpacity
                style={{ marginTop: 6 }}
                onPress={() => navigation.navigate('Thread', {
                  parentMessage: item,
                  user: { uid, name, dp },
                  isGroup,
                })}
              >
                <Text style={{
                  fontSize: 13,
                  color: '#075E54',
                  fontStyle: 'italic',
                  textDecorationLine: 'underline',
                }}>
                  💬 {item.getReplyCount()} {item.getReplyCount() === 1 ? 'reply' : 'replies'}
                </Text>
              </TouchableOpacity>
            )}




          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.log('Error rendering message item', error);
      return null;
    }
  };


  

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

   
    const isMilliseconds = timestamp > 9999999999;
    const normalizedTimestamp = isMilliseconds ? timestamp / 1000 : timestamp;

    const date = new Date(normalizedTimestamp * 1000);

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };



  if (!loggedInUser) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }






  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#075E54' }} >
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Image source={{ uri: dp }} style={styles.profilePic} />
        <View style={styles.nameContainer}>
          <Text style={styles.headerName}>{name}</Text>
          {!isGroup && (
            <Text style={styles.statusText}>
              {userStatus === 'online'
                ? 'Online'
                : `Last seen: ${lastActiveAt ? formatTimestamp(lastActiveAt) : 'Unknown'}`}
            </Text>
          )}
          {!!typingIndicator && <Text style={styles.typingText}>{typingIndicator}</Text>}
        </View>

        <TouchableOpacity onPress={handleDeleteConversation}>
          <Icon name="trash-2" size={20} color="red" />
        </TouchableOpacity>


        {/* Call Icon for users */}
      { !isGroup && <TouchableOpacity onPress={makeCall} style={{ marginLeft: 12 }}>
          <Icon name="phone" size={22} color="#fff" />
        </TouchableOpacity>}

 

        {isGroup  &&
          <>
            {/* Audio Call */}
          <TouchableOpacity style={styles.iconButton} onPress={() => sendGroupCallInvite('audio')}>
              <Icon name="phone" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Video Call */}
          <TouchableOpacity style={styles.iconButton} onPress={() => sendGroupCallInvite('video')}>
              <Icon name="video" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Dropdown Menu */}
            <Menu>
              <MenuTrigger>
                <Icon name="more-vertical" size={22} color="#fff" style={{ marginLeft: 12 }} />
              </MenuTrigger>
              <MenuOptions customStyles={menuOptionsStyles}>
                <MenuOption onSelect={() => navigation.navigate('EditGroup', { group: { guid: uid, name, type: 'public' } })}>
                  <Text style={styles.menuText}>Edit Group</Text>
                </MenuOption>
                <MenuOption onSelect={fetchGroupMembers}>
                  <Text style={styles.menuText}>View Members</Text>
                </MenuOption>
                <MenuOption onSelect={() => leaveGroup(uid)}>
                  <Text style={styles.menuText}>Leave Group</Text>
                </MenuOption>
                {isGroupOwner && (
                  <MenuOption onSelect={() => handleDeleteGroup(uid)}>
                    <Text style={[styles.menuText, { color: 'red' }]}>Delete Group</Text>
                  </MenuOption>
                )}
              </MenuOptions>
            </Menu>
          </>
}
              

      </View>

      </SafeAreaView>



      {/* Chat Messages */}


      <FlatList
        ref={flatListRef}
        data={[...messages]
          .sort((a, b) => a.getSentAt() - b.getSentAt())
          .filter(msg => {
            if (!msg) {
              console.log('Filtered out: null/undefined message');
              return false;}
            if (msg.category === 'action' || msg.type === 'groupMember') return true;
            if (typeof msg.getId !== 'function' || typeof msg.getType !== 'function'  || typeof msg.getSender !== 'function') return false;
            if (!msg.getId() || !msg.getType() || !msg.getSender() || !msg.getSender().getUid) return false;
            // Filter out thread replies
            const isThreadReply = msg.getParentMessageId?.() && msg.getParentMessageId() !== 0;
            if (isThreadReply) return false;

            // Handle deleted messages
            const isDeleted = !!msg.getDeletedAt?.() || (msg.getText?.() === "This message was deleted");
            if (isDeleted) return true;

            // Get message type
            const type = msg.getType?.();

            

            if (msg.getCategory?.() === CometChat.CATEGORY_CUSTOM) return true;

            // Handle text messages
            if (type === CometChat.MESSAGE_TYPE.TEXT) {
              return msg.getText?.()?.trim() !== '';
            }

            // Handle media messages
            const isMedia = [
              CometChat.MESSAGE_TYPE.IMAGE,
              CometChat.MESSAGE_TYPE.VIDEO,
              CometChat.MESSAGE_TYPE.AUDIO
            ].includes(type);
            if (isMedia) return true;

            return false;
          })}
        keyExtractor={item => {
          try {
            if (item.category === 'action' || item.type === 'groupMember') {
              return `${item.id || item.getId?.()}_${Date.now()}`;
            }
            return item.getId?.()?.toString() || Math.random().toString();
          } catch {
            return Math.random().toString();
          }
        }}
        renderItem={renderItem}
        contentContainerStyle={{ flexGrow: 1 }}
        ListFooterComponent={
          loadingMore ? <Text style={styles.loadingText}>Loading more...</Text> : null
        }
        ListEmptyComponent={<Text style={styles.empty}>No messages yet</Text>}
        onScroll={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.y <= 50) fetchMessages(false);
        }}
        scrollEventThrottle={100}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        onError={(error) => {
          console.log('FlatList error:', error);
        }}
      />

      {showMembersModal && (
        <View   style={{
          position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center'
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, width: 280 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Group Members</Text>
            <TouchableOpacity
              onPress={fetchAllUsers}
              style={{ position: 'absolute', top: 12, right: 16 }}
            >
              <Icon name="user-plus" size={22} color="#075E54" />
            </TouchableOpacity>

            

            <FlatList
              data={groupMembers}
              keyExtractor={item => item.uid}
              renderItem={({ item }) => {
                const isMe = item.uid === loggedInUser.uid;
                return (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      backgroundColor: '#fff',
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                  >
                    <Image
                      source={{ uri: item.avatar || undefined }}
                      style={{
                        width: 34, height: 34, borderRadius: 17,
                        marginRight: 12, backgroundColor: '#e0e0e0',
                      }}
                    />

                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: '#333' }}>
                        {item.name || item.uid}
                      </Text>
                      <Text
                        style={{
                          color: item.scope === "owner" ? "#D11A2A" : item.scope === "admin" ? "#007bff" : item.scope === "moderator" ? "#6a1b9a" : "#555",
                          fontSize: 12,
                          fontWeight: 'bold',
                          fontStyle: 'italic',
                          marginTop: 2,
                        }}
                      >
                        {getScopeDisplay(item.scope)}
                      </Text>
                    </View>

                   
                    {canChangeScope(myScope, item.scope) && (
                      <>
                        <TouchableOpacity
                          onPress={() => setScopeModal({ visible: true, uid: item.uid, name: item.name, currentScope: item.scope })}
                          style={{ marginLeft: 6 }}
                        >
                          <Icon name="edit-2" size={18} color="#007bff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleBanMember({ visible: true, uid: item.uid, name: item.name, currentScope: item.scope })}
                          style={{ marginLeft: 6 }}
                        >
                          <Icon name="slash" size={18} color="red" />
                        </TouchableOpacity>
                      </>
                    )}

                    {canKick(myScope, item.scope, isMe) && (
                      <TouchableOpacity
                        onPress={() => handleKickMember(item.uid)}
                        style={{ padding: 4, marginLeft: 2 }}
                      >
                        <Icon name="user-minus" size={19} color="#D11A2A" />
                      </TouchableOpacity>
                    )}
                  </View>

                );
              }}
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#007bff',
                paddingVertical: 10,
                borderRadius: 8,
                marginTop: 20,
                marginHorizontal: 20,
              }}
              onPress={fetchBannedMembers}
            >
              <Text style={{ textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>
                View Banned Members
              </Text>
            </TouchableOpacity>




            <TouchableOpacity onPress={() => setShowMembersModal(false)} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
              <Text style={{ color: '#075E54', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}



      {scopeModal.visible && (
        <View style={{
          position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 1100,
          backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center'
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 18, width: 260 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 10 }}>
              Change Role for {scopeModal.name || scopeModal.uid}
            </Text>
            {["participant", "moderator", "admin"].map(role => (
              <TouchableOpacity
                key={role}
                disabled={scopeModal.currentScope === role}
                onPress={() => handleScopeChange(scopeModal.uid, role)}
                style={{
                  padding: 12, marginBottom: 6,
                  backgroundColor: scopeModal.currentScope === role ? "#eee" : "#e5f7ee",
                  borderRadius: 8,
                }}
              >
                <Text style={{
                  color: scopeModal.currentScope === role ? "#aaa" : "#075E54",
                  fontWeight: '500',
                  fontSize: 15
                }}>
                  {getScopeDisplay(role)}
                  {scopeModal.currentScope === role ? " (Current)" : ""}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setScopeModal({ visible: false, uid: null, name: null, currentScope: null })}
              style={{ marginTop: 8, alignSelf: 'flex-end' }}>
              <Text style={{ color: '#075E54', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}




      {showAddMembersModal && (
        <View style={{
          position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 1001,
          backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center'
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, width: 300 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Add Users to Group</Text>
            <FlatList
              data={allUsers}
              keyExtractor={item => item.uid}
              renderItem={({ item }) => {
                // Check if already in group
                const alreadyMember = groupMembers.some(member => member.uid === item.uid);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Image source={{ uri: item.avatar || undefined }} style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10, backgroundColor: '#eee' }} />
                    <Text style={{ flex: 1 }}>{item.name || item.uid}</Text>
                    {alreadyMember ? (
                      <Text style={{ fontStyle: 'italic', color: '#aaa', marginRight: 8 }}>Already in group</Text>
                    ) : (
                      <TouchableOpacity
                        onPress={() => addUserToGroup(item.uid)}
                        style={{ padding: 6 }}
                      >
                        <Icon name="plus-circle" size={20} color="#28a745" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />

            <TouchableOpacity onPress={() => setShowAddMembersModal(false)} style={{ marginTop: 14, alignSelf: 'flex-end' }}>
              <Text style={{ color: '#075E54', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={bannedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBannedModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            width: '85%',
            maxHeight: '70%'
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Banned Members</Text>

            {bannedLoading ? (
              <ActivityIndicator size="large" color="#075E54" />
            ) : bannedMembers.length === 0 ? (
              <Text style={{ color: '#555', textAlign: 'center' }}>No banned members found.</Text>
            ) : (
              <FlatList
                data={bannedMembers}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 10,
                    borderBottomWidth: 1,
                    borderColor: '#eee',
                    paddingBottom: 8
                  }}>
                    <Image
                      source={{ uri: item.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                      style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                    />
                    <Text style={{ flex: 1, fontSize: 16 }}>{item.name || item.uid}</Text>
                    <TouchableOpacity
                      onPress={() => handleUnbanMember(item.uid)}
                      style={{ backgroundColor: 'green', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Unban</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              onPress={() => setBannedModalVisible(false)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: '#888', textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>




      {showReactionPicker && reactionPickerMessage && (
        <View style={{
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minWidth: 220,
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>React to message</Text>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {QUICK_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  onPress={async () => {
                    setShowReactionPicker(false);
                    await handleAddReaction(reactionPickerMessage.getId(), emoji);
                  }}
                  style={{ marginHorizontal: 8, padding: 8 }}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  setShowReactionPicker(false);
                  setEmojiPickerMessageId(reactionPickerMessage.getId());
                  setShowEmojiPicker(true);
                }}
                style={{ marginHorizontal: 8, padding: 8 }}
              >
                <Text style={{ fontSize: 28 }}>➕</Text>
              </TouchableOpacity>
            </View>
            {reactionPickerMessage.getSender().getUid() === loggedInUser.uid && (
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowReactionPicker(false);
                    setEditingMessage(reactionPickerMessage);
                    setMessageText(reactionPickerMessage.getText());
                  }}
                  style={{ marginHorizontal: 12 }}
                >
                  <Text style={{ color: '#075E54', fontWeight: 'bold' }}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowReactionPicker(false);
                    handleDeleteMessage(reactionPickerMessage);
                  }}
                  style={{ marginHorizontal: 12 }}
                >
                  <Text style={{ color: 'red', fontWeight: 'bold' }}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={{ marginTop: 16 }}
              onPress={() => setShowReactionPicker(false)}
            >
              <Text style={{ color: '#075E54', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}


      {showEmojiPicker && (
        <View style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0, top: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 10,
            maxHeight: 400,
            width: 320,
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Pick an emoji</Text>
            <EmojiMart
              onEmojiSelect={emoji => {
                setShowEmojiPicker(false);
                if (emojiPickerMessageId) {
                  handleAddReaction(emojiPickerMessageId, emoji.native || emoji.colons || emoji);
                }
              }}
              theme="light"
            />
            <TouchableOpacity
              style={{ marginTop: 10, alignSelf: 'flex-end' }}
              onPress={() => setShowEmojiPicker(false)}
            >
              <Text style={{ color: '#075E54', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}


      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickAndSendMedia} style={styles.attachButton}>
          <Icon name="paperclip" size={24} color="#075E54" />
        </TouchableOpacity>
        <TextInput
          placeholder={editingMessage ? 'Edit message...' : 'Type a message'}
          value={messageText}
          onChangeText={handleTyping}
          style={styles.input}
          placeholderTextColor="#888"
        />
        {editingMessage && (
          <TouchableOpacity onPress={() => {
            setEditingMessage(null);
            setMessageText('');
          }}>
            <Text style={{ color: 'red', padding: 8, textAlign: 'center' }}>
              Cancel editing
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Icon name={editingMessage ? 'edit' : 'send'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ece5dd',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#075E54',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  callButton: {
    backgroundColor: '#25D366',
    borderRadius: 50,
    padding: 10,
  },
  callText: {
    fontSize: 24,
    color: '#fff',
  },
  messageItem: {
    marginVertical: 6,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
    borderTopLeftRadius: 0,
  },
  theirMessage: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderTopRightRadius: 0,
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  text: {
    fontSize: 16,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  typingIndicator: {
    paddingVertical: 5,
    backgroundColor: '#075E54',
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#aaa',
    fontSize: 16,
  },
  backButton: {
    paddingRight: 10,
  },

  backIcon: {
    fontSize: 22,
    color: '#fff',
    marginRight: 5,
  },

  nameContainer: {
    flex: 1,
    flexDirection: 'column',
  },

  typingText: {
    fontSize: 12,
    color: '#d0f0d0',
    marginTop: 2,
  },

  callButtonOutlined: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 20,
    padding: 6,
    marginLeft: 10,
  },

  callIcon: {
    fontSize: 18,
    color: '#fff',
  },



  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },



  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  backButton: {
    marginRight: 12,
    padding: 6,
  },

  backIcon: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '600',
  },

  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },

  nameContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },

  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  typingText: {
    fontSize: 12,
    color: '#d0f0d0',
    marginTop: 2,
  },

  callButtonOutlined: {
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 20,
    padding: 6,
    marginLeft: 10,
  },

  callIcon: {
    fontSize: 18,
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },

  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    color: '#000',
  },

  sendButton: {
    marginLeft: 8,
    backgroundColor: '#075E54',
    borderRadius: 25,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sendIcon: {
    fontSize: 18,
    color: 'white',
  },
  statusText: {
    fontSize: 12,
    color: '#d0f0d0',
    marginTop: 2,
  },
  editedTag: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  deliveryStatus: {
    fontSize: 12,
    color: 'black',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginVertical: 4,
  },

  mediaVideo: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#000',
    marginVertical: 4,
  },

  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },

  audioPlayer: {
    width: 150,
    height: 40,
    marginLeft: 8,
  },
  read: {
    color: 'blue',
  },
  iconButton: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)', // Optional subtle touch feedback
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMessage: {
    alignSelf: 'center',
    backgroundColor: '#E7F3EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 8,
    maxWidth: '85%',
  },
  actionText: {
    color: '#1F2937',
    fontSize: 13,
    textAlign: 'center',
  },
  iconButton: {
    marginLeft: 12,
  },

  menuText: {
    fontSize: 16,
    paddingVertical: 8,
    color: '#333',
  },

  // Optional: use inside <MenuOptions customStyles={...}>
  menuOptionsStyles: {
    optionsContainer: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: '#fff',
      elevation: 5,
      width: 160,
    },
  },
  





});