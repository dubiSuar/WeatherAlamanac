import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { PreferencesProvider } from "./src/context/PreferencesContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <NavigationContainer>
            {/* Every screen is a dark gradient, so the status bar is light
                everywhere and never needs to change. translucent lets the
                gradient run under it on Android. */}
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <RootNavigator />
          </NavigationContainer>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
