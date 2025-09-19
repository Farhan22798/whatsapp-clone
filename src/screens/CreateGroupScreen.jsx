import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CometChat } from '@cometchat/chat-sdk-react-native';

const CreateGroupScreen = ({ navigation }) => {
    const [groupName, setGroupName] = useState('');
    const [groupType, setGroupType] = useState(CometChat.GROUP_TYPE.PUBLIC);
    const [groupPassword, setGroupPassword] = useState('');

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Group name is required');
            return;
        }
        const GUID = 'group_' + Date.now(); // unique id
        let group;
        if (groupType === CometChat.GROUP_TYPE.PASSWORD) {
            if (!groupPassword) {
                Alert.alert('Error', 'Password is required for password protected groups');
                return;
            }
            group = new CometChat.Group(GUID, groupName, groupType, groupPassword);
        } else {
            group = new CometChat.Group(GUID, groupName, groupType);
        }

        try {
            await CometChat.createGroup(group);
            Alert.alert('Success', 'Group created!');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', error.message || 'Could not create group');
            console.log('Create group error:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Group</Text>
            <TextInput
                style={styles.input}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Enter group name"
            />

            <Text style={{ marginVertical: 8, fontWeight: 'bold' }}>Group Type:</Text>
            <View style={styles.pickerWrapper}>
                <Picker
                    selectedValue={groupType}
                    style={styles.picker}
                    onValueChange={setGroupType}
                    dropdownIconColor="#075E54"
                >
                    <Picker.Item label="Public" value={CometChat.GROUP_TYPE.PUBLIC} />
                    <Picker.Item label="Private" value={CometChat.GROUP_TYPE.PRIVATE} />
                    <Picker.Item label="Password Protected" value={CometChat.GROUP_TYPE.PASSWORD} />
                </Picker>
            </View>

            {groupType === CometChat.GROUP_TYPE.PASSWORD && (
                <TextInput
                    style={styles.input}
                    value={groupPassword}
                    onChangeText={setGroupPassword}
                    placeholder="Enter group password"
                    secureTextEntry
                />
            )}

            <TouchableOpacity style={styles.button} onPress={handleCreateGroup}>
                <Text style={styles.buttonText}>Create Group</Text>
            </TouchableOpacity>
        </View>
    );
};

export default CreateGroupScreen;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 18 },
    button: { backgroundColor: '#075E54', padding: 15, borderRadius: 5 },
    buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
    pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 18, overflow: 'hidden' },
    picker: { height: 50, width: '100%' },
});
