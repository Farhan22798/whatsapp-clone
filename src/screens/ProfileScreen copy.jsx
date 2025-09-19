import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation, setLoggedIn }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // const navigation = useNavigation();

    useEffect(() => {
        CometChat.getLoggedinUser()
            .then(loggedInUser => {
                setUser(loggedInUser);
            })
            .catch(error => {
                console.error('Error fetching user:', error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleLogout = async () => {
        try {
            await CometChat.logout();
            await AsyncStorage.removeItem('LOGGED_IN_UID');
            setLoggedIn(false); // ❗ Make sure this is passed from App.tsx

            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };
      
      
      

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#075E54" />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>No user info available</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: user.avatar || 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Windows_10_Default_Profile_Picture.svg/1024px-Windows_10_Default_Profile_Picture.svg.png' }}
                style={styles.avatar}
            />
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.uid}>UID: {user.uid}</Text>

            {/* You can add more user details here if needed */}
            <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>UIkit v4.3.26</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.editButtonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingTop: 50,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 20,
        borderWidth: 3,
        borderColor: '#128C7E',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#075E54',
        marginBottom: 8,
    },
    uid: {
        fontSize: 16,
        color: '#555',
        marginBottom: 30,
    },
    editButton: {
        backgroundColor: '#128C7E',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    logoutButton: {
        marginTop: 200,
        backgroundColor: '#e55131',
        paddingVertical: 25,
        paddingHorizontal: 25,
        borderRadius: 90,
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 18,
        color: 'red',
        marginTop: 50,
    },
});
  

export default ProfileScreen;
