import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ActionSheetIOS,
    Platform,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Video from 'react-native-video';
import { Picker as EmojiMart } from 'emoji-mart-native';
import Icon from 'react-native-vector-icons/Feather';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import { DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '👍'];
const ESTIMATED_ITEM_HEIGHT = 20;

const ThreadScreen = ({ route, navigation }) => {
    const { parentMessage, user, isGroup } = route.params;
    const parentId = parentMessage.getId();

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [editingMessage, setEditingMessage] = useState(null);
    const [typingIndicator, setTypingIndicator] = useState('');
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [reactionPickerMessage, setReactionPickerMessage] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [initialScrollDone, setInitialScrollDone] = useState(false);

    const [emojiPickerMessageId, setEmojiPickerMessageId] = useState(null);

    const flatListRef = useRef();
    const messageRequestRef = useRef();
    const typingTimeoutRef = useRef();

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 150); 
    };
      
      

    const formatTimestamp = ts => {
        if (!ts) return '';
        const d = new Date(ts * 1000);
        let h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    };

    const handleReceiptUpdate = (receipt, type) => {
        setMessages(ms =>
            ms.map(m => {
                if (m.getId() === receipt.messageId) {
                    if (type === 'delivered') m.setDeliveredAt(receipt.deliveredAt);
                    else m.setReadAt(receipt.readAt);
                }
                return m;
            })
        );
    };

   

    const handleAddReaction = async (msgId, emoji) => {
        try {
            await CometChat.addReaction(msgId, emoji);
            const updated = await CometChat.getMessageDetails(msgId);
            setMessages(ms => ms.map(m => m.getId() === msgId ? updated : m));
            setTimeout(scrollToBottom, 100);
        } catch {
            Alert.alert('Error', 'Couldn’t react');
        }
    };
    const handleRemoveReaction = async (msgId, emoji) => {
        try {
            await CometChat.removeReaction(msgId, emoji);
            const updated = await CometChat.getMessageDetails(msgId);
            setMessages(ms => ms.map(m => m.getId() === msgId ? updated : m));
            setTimeout(scrollToBottom, 100);
        } catch {
            Alert.alert('Error', 'Couldn’t remove reaction');
        }
    };

   

    const pickAndSendMedia = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.images, DocumentPicker.types.video, DocumentPicker.types.audio],
                copyTo: 'cachesDirectory'
            });
            let type = CometChat.MESSAGE_TYPE.IMAGE;
            if (res.type.startsWith('video')) type = CometChat.MESSAGE_TYPE.VIDEO;
            if (res.type.startsWith('audio')) type = CometChat.MESSAGE_TYPE.AUDIO;
            const file = {
                name: res.name,
                type: res.type,
                uri: Platform.OS === 'android' ? res.fileCopyUri : res.uri
            };
            const m = new CometChat.MediaMessage(
                user.uid, file, type,
                isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
            );
            m.setParentMessageId(parentId);
            const sent = await CometChat.sendMediaMessage(m);
            setMessages(ms => [...ms, sent]);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            if (!DocumentPicker.isCancel(err)) Alert.alert('Error', 'Picking media failed');
        }
    };

   

    const handleDeleteMessage = async (message) => {
        try {
            await CometChat.deleteMessage(message.getId());

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
        } catch (error) {
            console.log("Delete failed:", error);
            Alert.alert("Error", "Failed to delete message.");
        }
    };
    

    const fetchMessages = async (initial = false) => {
        if (!messageRequestRef.current || loadingMore || !hasMore) return;

        try {
            setLoadingMore(true);
            const fetched = await messageRequestRef.current.fetchPrevious();

            if (!fetched.length) {
                setHasMore(false);
            } else {
                if (initial) {
                    setMessages(fetched.reverse());
                    setTimeout(scrollToBottom, 100);
                } else {
                    setMessages(prev => [...fetched.reverse(), ...prev]);
                    setTimeout(() => {
                        flatListRef.current?.scrollToOffset({
                            offset: fetched.length * ESTIMATED_ITEM_HEIGHT,
                            animated: false,
                        });
                    }, 100);
                }
            }
        } catch (e) {
            console.log('Thread fetch error:', e);
        } finally {
            setLoadingMore(false);
        }
    };
      
      


    const sendMessage = async () => {
        if (!text.trim()) return;
        if (editingMessage) {
            editingMessage.setText(text);
            editingMessage.setMetadata({ ...editingMessage.getMetadata(), edited: true });
            const upd = await CometChat.editMessage(editingMessage);
            setMessages(ms => ms.map(m => m.getId() === upd.getId() ? upd : m));
            setTimeout(scrollToBottom, 100);
            setText(''); setEditingMessage(null);
            return;
        }
        const tm = new CometChat.TextMessage(
            user.uid, text.trim(),
            isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
        );
        tm.setParentMessageId(parentId);
        const sent = await CometChat.sendMessage(tm);
        setMessages(ms => [...ms, sent]);
        setTimeout(scrollToBottom, 100);

        setText(''); 
 
        const updatedParent = await CometChat.getMessageDetails(parentMessage.getId());
        DeviceEventEmitter.emit('THREAD_REPLY_ADDED', updatedParent);
    };


    useEffect(() => {
        let currentUser = null;

        CometChat.getLoggedinUser().then(user => {
            setLoggedInUser(user);
            currentUser = user;

            const req = new CometChat.MessagesRequestBuilder()
                .setParentMessageId(parentId)
                .setLimit(10)
                .hideReplies(true)
                .build();

            messageRequestRef.current = req;

            fetchMessages(true); 
        });

        const LID = `THREAD_LISTENER_${parentId}`;
        CometChat.addMessageListener(LID, new CometChat.MessageListener({
            onTextMessageReceived: m => {
                if (m.getParentMessageId() === parentId) {
                    setMessages(ms => [...ms, m]);
                    CometChat.markAsDelivered(m).catch(() => { });
                    if (!isGroup && currentUser && m.getSender().getUid() === user.uid) {
                        CometChat.markAsRead(m).catch(() => { });
                    }
                    setTimeout(scrollToBottom, 100);
                }
            },
            onMediaMessageReceived: m => {
                if (m.getParentMessageId() === parentId) {
                    setMessages(ms => [...ms, m]);
                    CometChat.markAsDelivered(m).catch(() => { });
                    if (!isGroup && currentUser && m.getSender().getUid() === user.uid) {
                        CometChat.markAsRead(m).catch(() => { });
                    }
                    setTimeout(scrollToBottom, 100);
                }
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
                deletedMessage.setParentMessageId?.(message.getParentMessageId?.()); // VERY important in threads
                deletedMessage.setDeletedAt(Math.floor(Date.now() / 1000));
                deletedMessage.setMetadata({ ...(message.getMetadata?.() || {}), deletedAt: Date.now() });

                setMessages(prev =>
                    prev.map(msg =>
                        msg.getId?.() === deletedMessage.getId()
                            ? deletedMessage
                            : msg
                    )
                );
            },
            
              
              

            onMessageEdited: (editedMessage) => {
                const updated = CometChat.TextMessage
                    ? new CometChat.TextMessage(
                        editedMessage.getReceiver(),
                        editedMessage.getText(),
                        editedMessage.getReceiverType()
                    )
                    : editedMessage;

                updated.setId(editedMessage.getId());
                updated.setSender(editedMessage.getSender());
                updated.setReceiver(editedMessage.getReceiver());
                updated.setSentAt(editedMessage.getSentAt());
                updated.setType(editedMessage.getType());
                updated.setMetadata({ ...(editedMessage.getMetadata?.() || {}), edited: true });

                setMessages(prev =>
                    prev.map(msg =>
                        msg.getId?.() === updated.getId() ? updated : msg
                    )
                );
            },
            
            onMessageReactionAdded: async (reactionEvent) => {
                const messageId = reactionEvent.reaction?.messageId;
                if (!messageId) return;

                try {
                    const updated = await CometChat.getMessageDetails(messageId);
                    setMessages(prev =>
                        prev.map(msg => msg.getId?.() === messageId ? updated : msg)
                    );
                } catch (e) {
                    console.log("Failed to fetch updated message after reaction added:", e);
                }
            },

            onMessageReactionRemoved: async (reactionEvent) => {
                const messageId = reactionEvent.reaction?.messageId;
                if (!messageId) return;

                try {
                    const updated = await CometChat.getMessageDetails(messageId);
                    setMessages(prev =>
                        prev.map(msg => msg.getId?.() === messageId ? updated : msg)
                    );
                } catch (e) {
                    console.log("Failed to fetch updated message after reaction removed:", e);
                }
            },
            


            
            onMessagesDelivered: r => handleReceiptUpdate(r, 'delivered'),
            onMessagesRead: r => handleReceiptUpdate(r, 'read'),
            onTypingStarted: td => {
                if (td.sender.uid === user.uid && td.receiver === parentId) {
                    setTypingIndicator(`${user.name} is typing...`);
                }
            },
            onTypingEnded: () => setTypingIndicator(''),
        }));

        return () => CometChat.removeMessageListener(LID);
    }, []);


   

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('THREAD_REPLY_ADDED', upd =>
            setMessages(ms => ms.map(m => m.getId() === upd.getId() ? upd : m))
        );
        return () => sub.remove();
    }, []);


    useEffect(() => {
        if (messages.length && !initialScrollDone) {
            scrollToBottom();
            setInitialScrollDone(true);
        }
    }, [messages, initialScrollDone]);

    const getParentPreview = (msg) => {
        const type = msg.getType?.();
        switch (type) {
            case CometChat.MESSAGE_TYPE.TEXT:
                return msg.getText?.() || '';
            case CometChat.MESSAGE_TYPE.IMAGE:
                return '📷 Image';
            case CometChat.MESSAGE_TYPE.VIDEO:
                return '🎥 Video';
            case CometChat.MESSAGE_TYPE.AUDIO:
                return '🎵 Audio';
            default:
                return 'Message';
        }
    };
      

  
  


  

    const renderItem = ({ item }) => {
        if (!item?.getSender || !item?.getId) return null;
        const sender = item.getSender();
        if (!sender?.getUid) return null;

        const isMine = sender.getUid() === loggedInUser.uid;
        const meta = item.getMetadata?.() || {};
        const isEdited = !!meta.edited;
        const isDeleted = !!item.getDeletedAt?.() || !!(item.getMetadata?.()?.deletedAt) || item.getText?.() === "This message was deleted";

        if (isDeleted) {
            return (
                <View style={[
                    styles.messageItem,
                    item.getSender().getUid() === loggedInUser?.uid ? styles.myMessage : styles.theirMessage,
                    { backgroundColor: '#f0f0f0' }
                ]}>
                    <Text style={{ fontStyle: 'italic', color: '#888' }}>
                        🗑️ This message was deleted
                    </Text>
                </View>
            );
        }

        const renderMedia = () => {
            const att = item.getAttachment?.();
            if (!att) return null;
            const url = att.fileUrl || att.url;
            if (!url) return null;
            switch (item.getType()) {
                case CometChat.MESSAGE_TYPE.IMAGE:
                    return <Image source={{ uri: url }} style={styles.mediaImage} pointerEvents="none" />;
                case CometChat.MESSAGE_TYPE.VIDEO:
                    return <Video source={{ uri: url }} style={styles.mediaVideo} controls paused pointerEvents="none" />;
                case CometChat.MESSAGE_TYPE.AUDIO:
                    return (
                        <View style={styles.audioContainer}>
                            <Icon name="headphones" size={24} color="#075E54" />
                            <Video source={{ uri: url }} audioOnly controls paused style={styles.audioPlayer} pointerEvents="none" />
                        </View>
                    );
                default: return null;
            }
        };

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onLongPress={() => onLongPressMessage(item)}
            >
                <View style={[styles.messageItem, isMine ? styles.myMessage : styles.theirMessage]}>
                    <Text style={styles.sender}>{isMine ? 'You' : sender.getName()}</Text>
                    {item.getType() === CometChat.MESSAGE_TYPE.TEXT
                        ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Text style={styles.text}>{item.getText()}</Text>
                                {isEdited && <Text style={styles.editedTag}> (edited)</Text>}
                            </View>
                        )
                        : renderMedia()
                    }
                    <Text style={styles.time}>{formatTimestamp(item.getSentAt())}</Text>
                    {isMine && (
                        <Text style={[styles.deliveryStatus, item.readAt && styles.read]}>
                            {item.readAt ? '✓✓' : item.deliveredAt ? '✓✓' : '✓'}
                        </Text>
                    )}
                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                        {(item.getReactions?.() || []).map((r, i) => (
                            <TouchableOpacity key={i}
                                style={{
                                    backgroundColor: r.getReactedByMe() ? '#d0f0d0' : '#eee',
                                    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4
                                }}
                                onPress={() => r.getReactedByMe()
                                    ? handleRemoveReaction(item.getId(), r.reaction)
                                    : handleAddReaction(item.getId(), r.reaction)
                                }
                            >
                                <Text style={{
                                    color: r.getReactedByMe() ? '#075E54' : '#000',
                                    fontWeight: r.getReactedByMe() ? 'bold' : 'normal'
                                }}>
                                    {r.reaction} {r.count}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    

    const onLongPressMessage = message => {
        if (!loggedInUser) return;
        const meta = message.getMetadata?.() || {};
        if (message.getDeletedAt() || meta.deletedAt) return;

        const isMine = message.getSender().getUid() === loggedInUser.uid;
        let options = ['React'], handlers = [() => {
            setReactionPickerMessage(message); setShowReactionPicker(true);
        }];

        if (isMine) {
            options.push('Edit', 'Delete');
            handlers.push(
                () => { setEditingMessage(message); setText(message.getText()) },
                () => handleDeleteMessage(message)
            );
        }
        options.push('Cancel'); handlers.push(() => { });

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: options.length - 1 },
                idx => handlers[idx]()
            );
        } else {
           
            handlers[0]();
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: '#075E54' }}> 
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
                    <Text style={styles.backIcon}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Thread</Text>
                {!!typingIndicator && <Text style={styles.typing}>{typingIndicator}</Text>}
            </View>
            </SafeAreaView>
            
            <View style={styles.parent}>
                <Text style={styles.parentLabel}>Replying to:</Text>
                <Text>{getParentPreview(parentMessage)}</Text>

            </View>

          
            <FlatList
                ref={flatListRef}
                data={[...messages].sort((a, b) => a.getSentAt() - b.getSentAt())}
                inverted={false} 

                keyExtractor={item => item.getId().toString()}
                renderItem={renderItem}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}

                onContentSizeChange={() => {
                    if (!initialScrollDone && messages.length > 0) {
                        scrollToBottom();
                        setInitialScrollDone(true);
                    }
                }}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                onScroll={({ nativeEvent }) => {
                    if (nativeEvent.contentOffset.y <= 50 && messageRequestRef.current && hasMore) {
                        setLoadingMore(true);
                        messageRequestRef.current.fetchPrevious().then(prev => {
                            if (!prev.length) return setHasMore(false);
                            setMessages(old => [...prev.reverse(), ...old]);
                            setTimeout(() => {
                                flatListRef.current?.scrollToIndex({
                                    index: prev.length,
                                    animated: false,
                                    viewPosition: 0 
                                });
                            }, 100);
                            
                        }).finally(() => setLoadingMore(false));
                    }
                }}
                scrollEventThrottle={100}
                ListFooterComponent={loadingMore ? <Text style={styles.loading}>Loading…</Text> : null}
            />

           
            {showReactionPicker && reactionPickerMessage && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.picker}>
                        <Text style={styles.pickerTitle}>React to message</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                            {QUICK_EMOJIS.map(e => (
                                <TouchableOpacity
                                    key={e}
                                    style={styles.pickerEmoji}
                                    onPress={async () => {
                                        setShowReactionPicker(false);
                                        await handleAddReaction(reactionPickerMessage.getId(), e);
                                    }}
                                >
                                    <Text style={{ fontSize: 28 }}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.pickerEmoji}
                                onPress={() => {
                                    setShowReactionPicker(false);
                                    setEmojiPickerMessageId(reactionPickerMessage.getId());
                                    setShowEmojiPicker(true);
                                }}
                            >
                                <Text style={{ fontSize: 28 }}>➕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 👇 Edit/Delete buttons if the message is mine */}
                        {reactionPickerMessage.getSender().getUid() === loggedInUser?.uid && (
                            <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowReactionPicker(false);
                                        setEditingMessage(reactionPickerMessage);
                                        setText(reactionPickerMessage.getText());
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

                        <TouchableOpacity onPress={() => setShowReactionPicker(false)} style={{ marginTop: 12 }}>
                            <Text style={styles.pickerCancel}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}


         
            {showEmojiPicker && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.emojiPicker}>
                        <EmojiMart
                            onEmojiSelect={e => {
                                setShowEmojiPicker(false);
                                handleAddReaction(emojiPickerMessageId, e.native || e.colons);
                            }}
                            theme="light"
                        />
                        <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                            <Text style={styles.pickerCancel}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            
            <View style={styles.inputRow}>
                <TouchableOpacity onPress={pickAndSendMedia} style={styles.attach}>
                    <Icon name="paperclip" size={24} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={t => {
                        setText(t);
                        const ti = new CometChat.TypingIndicator(
                            parentId,
                            isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
                        );
                        CometChat.startTyping(ti);
                        typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => CometChat.endTyping(ti), 1000);
                    }}
                    placeholder={editingMessage ? 'Edit message...' : 'Type a reply'}
                />
                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                    <Icon name={editingMessage ? 'edit' : 'send'} size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ThreadScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ece5dd' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#075E54' },
    back: { marginRight: 12 }, backIcon: { fontSize: 26, color: '#fff' },
    headerText: { flex: 1, fontSize: 18, fontWeight: '600', color: '#fff' },
    typing: { color: '#d0f0d0', marginRight: 12 },

    parent: { backgroundColor: '#d9fdd3', padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
    parentLabel: { fontSize: 12, fontWeight: 'bold', color: '#075E54' },
    parentText: { fontSize: 14, marginTop: 2 },

    messageItem: { marginVertical: 6, padding: 10, borderRadius: 10, maxWidth: '80%' },
    myMessage: { backgroundColor: '#DCF8C6', alignSelf: 'flex-end', borderTopLeftRadius: 0 },
    theirMessage: { backgroundColor: '#fff', alignSelf: 'flex-start', borderTopRightRadius: 0 },
    sender: { fontWeight: 'bold', marginBottom: 4, color: '#333' },
    text: { fontSize: 16, color: '#000' },
    editedTag: { fontSize: 12, color: '#666', fontStyle: 'italic', marginLeft: 4 },
    time: { fontSize: 10, color: '#666', alignSelf: 'flex-end', marginTop: 4 },
    deliveryStatus: { fontSize: 12, color: '#00BFFF', alignSelf: 'flex-end', marginTop: 4 },
    read: { color: 'blue' },

    mediaImage: { width: 200, height: 200, borderRadius: 8, marginVertical: 4 },
    mediaVideo: { width: 200, height: 200, borderRadius: 8, backgroundColor: '#000', marginVertical: 4 },
    audioContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 8, borderRadius: 8, marginVertical: 4 },
    audioPlayer: { width: 150, height: 40, marginLeft: 8 },

    pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    picker: { backgroundColor: '#fff', padding: 16, borderRadius: 16, width: 250, alignItems: 'center' },
    pickerTitle: { fontWeight: 'bold', marginBottom: 8 },
    pickerEmoji: { marginHorizontal: 6 },
    pickerCancel: { color: '#075E54', marginTop: 12, fontWeight: '600' },

    emojiPicker: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },

    inputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#ccc', backgroundColor: '#fff', alignItems: 'center' },
    attach: { padding: 8, marginRight: 6 },
    input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16 },
    sendBtn: { marginLeft: 8, backgroundColor: '#075E54', padding: 10, borderRadius: 20 },

    loading: { textAlign: 'center', padding: 8, color: '#666' },
});
