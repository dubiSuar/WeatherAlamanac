import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WeatherScreen from "../screens/weather/WeatherScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Weather" component={WeatherScreen} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          // Settings enters from the right, so it leaves to the right. A push
          // that dismissed downward would break the spatial relationship.
          animation: "slide_from_right",
        }}
      />
    </Stack.Navigator>
  );
}
