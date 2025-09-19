import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ActionMessage = ({ text }) => {
    return (
        <View style={styles.container}>
            <View style={styles.pillContainer}>
                <Text style={styles.text}>{text}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillContainer: {
        backgroundColor: '#E2F3DB',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        maxWidth: '80%',
    },
    text: {
        color: '#1F2937',
        fontSize: 12,
        textAlign: 'center',
    }
});

export default ActionMessage;