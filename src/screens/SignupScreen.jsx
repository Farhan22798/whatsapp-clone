import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { CometChat } from '@cometchat/chat-sdk-react-native';

const SignupScreen = ({ navigation }) => {
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!uid.trim() || !name.trim()) {
      Alert.alert('Please enter both UID and Name');
      return;
    }

    setIsLoading(true);

    try {
      const user = new CometChat.User(uid);
      user.setName(name);
      const createdUser = await CometChat.createUser(user, '627b966ffeb3286f816b53ebea5319ab6d825cdb');
      console.log('User created:', createdUser);
      Alert.alert('Registration successful! Please login');
      navigation.navigate('Login');
    } catch (error) {
      console.log('Registration failed:', error);
      Alert.alert(`Registration failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <TextInput
        style={styles.input}
        placeholder="User ID"
        placeholderTextColor="#888"
        value={uid}
        onChangeText={setUid}
      />

      <TextInput
        style={styles.input}
        placeholder="Your Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginLink}>Login</Text>
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5ddd5',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    fontWeight: 'bold',
    color: '#075E54',
    alignSelf: 'center',
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 1,
  },
  button: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a8d5bb',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginText: {
    marginTop: 25,
    alignSelf: 'center',
    fontSize: 14,
    color: '#444',
  },
  loginLink: {
    color: '#075E54',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default SignupScreen;
