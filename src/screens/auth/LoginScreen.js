import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, Lock, CloudSun } from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import PrimaryButton, { OrDivider } from "../../components/ui/PrimaryButton";
import Field from "../../components/ui/Field";
import ErrorBanner from "../../components/weather/ErrorBanner";
import { TYPE, INK } from "../../theme/type";
import { validateEmail, validatePassword, collect } from "../../utils/validate";

// The clear-night stops from the weather themes, so the gate reads as the same
// product rather than a login bolted on the front of one.
const NIGHT_GRADIENT = ["#050B22", "#0E1B44", "#1F2C63", "#3A2E63"];

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle, authError, setAuthError } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Clearing a field's error as soon as it's edited: leaving it visible while
  // someone is actively fixing it is just nagging.
  const update = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  async function handleLogin() {
    const found = collect({
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    setAuthError("");
    setLoading(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
    } catch {
      // AuthContext has already mapped this to a readable message.
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setAuthError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      // as above
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <LinearGradient colors={NIGHT_GRADIENT} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingVertical: 32,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Left-aligned rather than a centred stack. The eye starts at the
                left edge and the fields below are left-aligned anyway; centring
                the header only breaks that line. */}
            <View style={{ paddingBottom: 30 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.10)",
                  marginBottom: 18,
                }}
              >
                <CloudSun size={26} color="#fff" strokeWidth={1.75} />
              </View>
              <Text style={{ ...TYPE.display, color: INK.primary }}>Welcome back</Text>
              <Text style={{ ...TYPE.callout, color: INK.tertiary, marginTop: 5 }}>
                Sign in to pick up your saved cities.
              </Text>
            </View>

            {!!authError && (
              <View style={{ marginBottom: 18 }}>
                <ErrorBanner message={authError} onDismiss={() => setAuthError("")} />
              </View>
            )}

            <View style={{ gap: 6 }}>
              <Field
                label="Email"
                value={form.email}
                onChangeText={update("email")}
                error={errors.email}
                icon={Mail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <Field
                label="Password"
                value={form.password}
                onChangeText={update("password")}
                error={errors.password}
                icon={Lock}
                placeholder="••••••••"
                secure
                secureVisible={showPassword}
                onToggleSecure={() => setShowPassword((v) => !v)}
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />

              <PrimaryButton title="Log in" onPress={handleLogin} loading={loading} />
              <OrDivider />
              <PrimaryButton
                title="Continue with Google"
                variant="ghost"
                onPress={handleGoogle}
                loading={googleLoading}
              />
            </View>

            <Pressable
              onPress={() => navigation.navigate("Register")}
              hitSlop={8}
              style={{ marginTop: 28, alignItems: "center" }}
            >
              <Text style={{ ...TYPE.footnote, color: INK.tertiary }}>
                No account yet?{" "}
                <Text style={{ color: INK.primary, fontWeight: "600" }}>Create one</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
