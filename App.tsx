import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import './global.css';

export default function App() {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Text className="text-lg font-bold text-blue-600">Welcome to Kolori!</Text>
      <Text className="text-gray-600 mt-2">NativeWind + TypeScript is ready!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
