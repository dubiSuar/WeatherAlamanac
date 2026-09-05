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
import { Mail, Lock, User, CloudSun } from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import PrimaryButton, { OrDivider } from "../../components/ui/PrimaryButton";
import Field from "../../components/ui/Field";
import ErrorBanner from "../../components/weather/ErrorBanner";
import { TYPE, INK } from "../../theme/type";
import {
  validateEmail,
  validateName,
  validatePassword,
  validateConfirm,
  collect,
} from "../../utils/validate";

const NIGHT_GRADIENT = ["#050B22", "#0E1B44", "#1F2C63", "#3A2E63"];

export default function RegisterScreen({ navigation }) {
  const { register, loginWithGoogle, authError, setAuthError } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const update = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
    // The confirm field's error is about a relationship between two fields, so
    // editing either one has to clear it.
    if (key === "password" && errors.confirm) setErrors((e) => ({ ...e, confirm: null }));
  };

  async function handleRegister() {
    const found = collect({
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password, { isNew: true }),
      confirm: validateConfirm(form.password, form.confirm),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    setAuthError("");
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
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
            <View style={{ paddingBottom: 26 }}>
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
              <Text style={{ ...TYPE.display, color: INK.primary }}>Create account</Text>
              <Text style={{ ...TYPE.callout, color: INK.tertiary, marginTop: 5 }}>
                Keep your cities and units across devices.
              </Text>
            </View>

            {!!authError && (
              <View style={{ marginBottom: 18 }}>
                <ErrorBanner message={authError} onDismiss={() => setAuthError("")} />
              </View>
            )}

            <View style={{ gap: 6 }}>
              <Field
                label="Name"
                value={form.name}
                onChangeText={update("name")}
                error={errors.name}
                icon={User}
                placeholder="Rosalind Achebe"
                autoComplete="name"
                returnKeyType="next"
              />
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
                helper="At least 6 characters."
                icon={Lock}
                placeholder="••••••••"
                secure
                secureVisible={showPassword}
                onToggleSecure={() => setShowPassword((v) => !v)}
                autoComplete="password-new"
                returnKeyType="next"
              />
              <Field
                label="Confirm password"
                value={form.confirm}
                onChangeText={update("confirm")}
                error={errors.confirm}
                icon={Lock}
                placeholder="••••••••"
                secure
                secureVisible={showPassword}
                onToggleSecure={() => setShowPassword((v) => !v)}
                autoComplete="password-new"
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />

              <PrimaryButton title="Sign up" onPress={handleRegister} loading={loading} />
              <OrDivider />
              <PrimaryButton
                title="Continue with Google"
                variant="ghost"
                onPress={handleGoogle}
                loading={googleLoading}
              />
            </View>

            <Pressable
              onPress={() => navigation.navigate("Login")}
              hitSlop={8}
              style={{ marginTop: 24, alignItems: "center" }}
            >
              <Text style={{ ...TYPE.footnote, color: INK.tertiary }}>
                Already registered?{" "}
                <Text style={{ color: INK.primary, fontWeight: "600" }}>Log in</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
