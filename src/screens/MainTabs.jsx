import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Native CLI: correct import
import HomeScreen from './HomeScreen';
import UsersScreen from './UsersScreen';
import CallLogScreen from './CallLogScreen';
import GroupScreen from './GroupScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs({setLoggedIn}) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Users') {
            iconName = focused ? 'person' : 'person-outline';
          }else if (route.name === 'CallLogs') {
            iconName = focused ? 'call' : 'call-outline';
          } else if (route.name === 'Groups') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'information-circle' : 'information-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#075E54',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="CallLogs" component={CallLogScreen} />
      <Tab.Screen name="Groups" component={GroupScreen} />
      <Tab.Screen name="Profile">
        {props => <ProfileScreen {...props} setLoggedIn={setLoggedIn} />}
      </Tab.Screen>

    </Tab.Navigator>
  );
}
