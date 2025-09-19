// import { CometChatCalls } from "@cometchat/calls-sdk-react-native";
// import { CometChat } from "@cometchat/chat-sdk-react-native";

// export const cleanupActiveCall = async () => {
//     try {
//         const activeCall = await CometChat.getActiveCall();
//         if (!activeCall) {
//             console.log("No active call to clean up");
//             return;
//         }

//         const promises = [
//             CometChat.endCall(activeCall.sessionId),
//             CometChat.clearActiveCall(),
//             CometChatCalls.endSession()
//         ];

//         await Promise.all(promises);
//         console.log("Cleaned up active call successfully");
//         return true;
//     } catch (error) {
//         console.log("Error cleaning up call:", error);
//         return false;
//     }
// };



import { CometChat } from '@cometchat/chat-sdk-react-native';

export const cleanupActiveCall = async () => {
    try {
        const activeCall =  CometChat.getActiveCall();
        if (activeCall) {
            console.log('🧹 Cleaning up active call with sessionId:', activeCall.getSessionId());
            await CometChat.endCall(activeCall.getSessionId());
            console.log('✅ Active call ended');
        } else {
            console.log('✅ No active call to clean up');
        }
    } catch (err) {
        console.log('❌ Error cleaning active call:', err);
    }
};
