import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Modal } from 'react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';

const UsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [userStatuses, setUserStatuses] = useState({});
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState('');
  const [joinGroupPassword, setJoinGroupPassword] = useState('');
  const [joinGroupType, setJoinGroupType] = useState(CometChat.GROUP_TYPE.PUBLIC);
  const [joining, setJoining] = useState(false);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const debounceRef = useRef();

  const joinGroup = async (guid, groupType, password = "") => {
    try {

      const group = await CometChat.joinGroup(guid, groupType, password);
      return { success: true, group };
    } catch (error) {
      return { success: false, error };
    }
  };


  const fetchUsers = async (keyword = '', isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    setLoading(true);
    const limit = 30;
    let usersRequestBuilder = new CometChat.UsersRequestBuilder().setLimit(limit);
    if (keyword) {
      usersRequestBuilder = usersRequestBuilder.setSearchKeyword(keyword);
    }
    const usersRequest = usersRequestBuilder.build();

    try {
      const fetchedUsers = await usersRequest.fetchNext();
      setUsers(fetchedUsers);
    } catch (error) {
      console.log('Error fetching users:', error);
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUsers('',true);
  }, []);

  useEffect(() => {
    const listenerID = "USERS_SCREEN_PRESENCE_LISTENER";

    CometChat.addUserListener(
      listenerID,
      new CometChat.UserListener({
        onUserOnline: (onlineUser) => {
          setUserStatuses(prev => ({
            ...prev,
            [onlineUser.getUid()]: 'online',
          }));
        },
        onUserOffline: (offlineUser) => {
          setUserStatuses(prev => ({
            ...prev,
            [offlineUser.getUid()]: 'offline',
          }));
        },
      })
    );

    return () => CometChat.removeUserListener(listenerID);
  }, []);

  useEffect(() => {
    if (!users || users.length === 0) return;

    const statuses = {};
    users.forEach(user => {
      statuses[user.getUid()] = user.getStatus(); // "online" or "offline"
    });
    setUserStatuses(statuses);
  }, [users]);
  
  

  // Debounced search handler
  const handleSearch = (text) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(text);
    }, 800);
  };
  

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() =>
  navigation.navigate('Chat', {
    user: {
      uid: item.getUid(),
      name: item.getName(),
      isGroup: false,
      dp: item.getAvatar() || 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Windows_10_Default_Profile_Picture.svg/1024px-Windows_10_Default_Profile_Picture.svg.png?20221210150350',
    },
  })
}

    >
      <View style={styles.userContent}>
        <View style={{ position: 'relative' }}>
          <Image
            source={{
              uri: item.getAvatar() || 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Windows_10_Default_Profile_Picture.svg/1024px-Windows_10_Default_Profile_Picture.svg.png?20221210150350',
            }}
            style={styles.userAvatar}
          />
          {userStatuses[item.getUid()] === 'online' && (
            <View style={styles.presenceIndicator} />
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.getName()}</Text>
        </View>
      </View>

    </TouchableOpacity>
  );

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
      </View>
    );
  }
  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Users</Text>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')}>
          <Text style={styles.headerAction}>Create Group</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setJoinModalVisible(true)}>
          <Text style={styles.headerAction}>Join Group</Text>
        </TouchableOpacity>
      </View>


      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users"
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#888"
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color="#075E54"
            style={{ position: 'absolute', right: 20, top: 12 }}
          />
        )}
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.getUid()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
      />
      <Modal
        visible={joinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Group</Text>
            <TextInput
              placeholder="Enter Group ID"
              value={joinGroupId}
              onChangeText={setJoinGroupId}
              style={styles.modalInput}
              placeholderTextColor="#888"
            />
            <View style={styles.groupTypeRow}>
              <TouchableOpacity
                style={[
                  styles.groupTypeBtn,
                  joinGroupType === CometChat.GROUP_TYPE.PUBLIC && styles.groupTypeSelected
                ]}
                onPress={() => setJoinGroupType(CometChat.GROUP_TYPE.PUBLIC)}
              >
                <Text style={styles.groupTypeText}>Public</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.groupTypeBtn,
                  joinGroupType === CometChat.GROUP_TYPE.PRIVATE && styles.groupTypeSelected
                ]}
                onPress={() => setJoinGroupType(CometChat.GROUP_TYPE.PRIVATE)}
              >
                <Text style={styles.groupTypeText}>Private</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.groupTypeBtn,
                  joinGroupType === CometChat.GROUP_TYPE.PASSWORD && styles.groupTypeSelected
                ]}
                onPress={() => setJoinGroupType(CometChat.GROUP_TYPE.PASSWORD)}
              >
                <Text style={styles.groupTypeText}>Password</Text>
              </TouchableOpacity>
            </View>
            {joinGroupType === CometChat.GROUP_TYPE.PASSWORD && (
              <TextInput
                placeholder="Enter Group Password"
                value={joinGroupPassword}
                onChangeText={setJoinGroupPassword}
                style={styles.modalInput}
                placeholderTextColor="#888"
                secureTextEntry
              />
            )}
            <TouchableOpacity
              style={styles.joinBtnModal}
              onPress={async () => {
                if (!joinGroupId.trim()) {
                  alert("Please enter a Group ID");
                  return;
                }
                setJoining(true);
                const res = await joinGroup(joinGroupId, joinGroupType, joinGroupPassword);
                setJoining(false);
                if (res.success) {
                  alert("Joined the group!");
                  setJoinModalVisible(false);
                  setJoinGroupId('');
                  setJoinGroupPassword('');
                  setJoinGroupType(CometChat.GROUP_TYPE.PUBLIC);

                } else {
                  alert(res.error.message || "Failed to join group.");
                }
              }}
              disabled={joining}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                {joining ? 'Joining...' : 'Join'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default UsersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#075E54',
    color: 'white',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111',
  },
  
  presenceIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759', // iOS green
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'end',
    justifyContent: 'space-between',
    backgroundColor: '#075E54',
    padding: 16,
  },
  joinBtn: {
    backgroundColor: '#075E54',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  headerAction: {
    fontSize: 20,
    color: '#fff',
    marginHorizontal: 12,
    backgroundColor: '#128C7E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 7,
    overflow: 'hidden',
    fontWeight: 'bold',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#075E54',
    marginBottom: 12,
  },
  modalInput: {
    width: '100%',
    borderRadius: 10,
    borderColor: '#075E54',
    borderWidth: 1.2,
    padding: 10,
    marginTop: 10,
    fontSize: 16,
    color: '#222',
  },
  joinBtnModal: {
    backgroundColor: '#075E54',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 44,
    marginTop: 18,
    marginBottom: 6,
  },
  modalCancel: {
    color: '#888',
    marginTop: 6,
    fontSize: 15,
  },
  groupTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    width: '100%',
  },
  groupTypeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  groupTypeSelected: {
    backgroundColor: '#128C7E',
    borderColor: '#128C7E',
  },
  groupTypeText: {
    color: '#222',
    fontSize: 15,
    fontWeight: 'bold',
  },
  
  
  
  
  
});
