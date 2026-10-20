import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import AppStack from "./AppStack";
import { ONBOARDING_KEY } from "../screens/auth/OnboardingScreen";

export default function RootNavigator() {
  const { user, initializing } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => {
        setShowOnboarding(!val);
        setOnboardingChecked(true);
      })
      .catch(() => {
        // If AsyncStorage fails, skip onboarding to avoid blocking the user
        setShowOnboarding(false);
        setOnboardingChecked(true);
      });
  }, []);

  // The flag above is read once at launch. Anyone who has signed in is past
  // onboarding, so a later logout should land on Login, not replay the slides.
  useEffect(() => {
    if (user) setShowOnboarding(false);
  }, [user]);

  if (initializing || !onboardingChecked) {
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

  if (user) return <AppStack />;

  return (
    <AuthStack initialRouteName={showOnboarding ? "Onboarding" : "Login"} />
  );
}
