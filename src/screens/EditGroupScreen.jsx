import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CometChat } from '@cometchat/chat-sdk-react-native';

const EditGroupScreen = ({ route, navigation }) => {
    // Expect group info to come from navigation
    const { group } = route.params; // group: {guid, name, type, password}
    const [groupName, setGroupName] = useState(group.name);
    const [groupType, setGroupType] = useState(group.type);
    const [groupPassword, setGroupPassword] = useState(group.type === CometChat.GROUP_TYPE.PASSWORD ? group.password : '');

    const handleUpdateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Group name is required');
            return;
        }

        try {
            // Create group instance with all necessary params
            const groupObj = new CometChat.Group(
                group.guid,                        // GUID (group id)
                groupName,                         // New Group Name
                groupType,                         // New Group Type
                groupType === CometChat.GROUP_TYPE.PASSWORD ? groupPassword : '' // Password only if PASSWORD type
            );

            const updatedGroup = await CometChat.updateGroup(groupObj);
            Alert.alert('Success', 'Group updated!');
            navigation.goBack();

        } catch (error) {
            Alert.alert('Error', error.message || 'Could not update group');
            console.log('Update group error:', error);
        }
    };
      
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit Group</Text>
            <TextInput
                style={styles.input}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group Name"
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
                    placeholder="Group Password"
                    secureTextEntry
                />
            )}

            <TouchableOpacity style={styles.button} onPress={handleUpdateGroup}>
                <Text style={styles.buttonText}>Update Group</Text>
            </TouchableOpacity>
        </View>
    );
};

export default EditGroupScreen;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 18 },
    button: { backgroundColor: '#075E54', padding: 15, borderRadius: 5 },
    buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
    pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 18, overflow: 'hidden' },
    picker: { padding:30, height: 40, width: '100%' },
});
