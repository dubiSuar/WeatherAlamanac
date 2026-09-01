import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import AppStack from "./AppStack";

export default function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      // Matches the first colour stop of the auth gradient, so the handoff from
      // this screen to Login is a colour that's already there rather than a flash.
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050B22",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return user ? <AppStack /> : <AuthStack />;
}
