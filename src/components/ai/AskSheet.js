import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Easing,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { X, ArrowUp, RotateCcw, AlertCircle } from "lucide-react-native";

import { TYPE, INK, ACCENT } from "../../theme/type";
import {
  SPRINGS,
  project,
  rubberband,
  nearestSnapPoint,
  perSecond,
  GESTURE_HYSTERESIS,
} from "../../theme/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import Material from "../ui/Material";
import ChatMessage from "./ChatMessage";
import SuggestionChips from "./SuggestionChips";

/**
 * Bottom sheet for asking Almanac about the forecast.
 *
 * The gesture work here is the point of the component, so the reasoning is
 * written down:
 *
 * - `useNativeDriver: false` on the sheet's translateY. Native driver keeps the
 *   value on the UI thread, which means JS can't read the live position
 *   synchronously when a drag interrupts a running spring. Interruptibility
 *   matters more than shaving a bridge hop for one transform, so the value
 *   stays in JS. Everything decorative still uses the native driver.
 *
 * - Drag is 1:1 and respects the grab offset — the sheet doesn't jump so the
 *   finger lands mid-handle.
 *
 * - Release doesn't snap to the nearest point from where the finger stopped. It
 *   projects where the momentum would carry the sheet and snaps to the point
 *   nearest *that*, so a flick throws it.
 *
 * - The release velocity is handed to the spring as its initial velocity, so
 *   there's no seam between the finger moving the sheet and the sheet moving
 *   itself.
 *
 * - Dragging above the top snap point rubber-bands rather than hitting a wall.
 *
 * Only the header is a drag surface. The message list owns vertical panning
 * below it, and arbitrating between "scroll the list" and "drag the sheet"
 * needs the gesture-handler/reanimated pair to do without jitter; with the
 * handle-only rule this behaves correctly on both platforms today.
 */
export default function AskSheet({
  visible,
  onClose,
  chat,
  suggestions,
  locationLabel,
}) {
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const SHEET_HEIGHT = Math.round(height * 0.88);
  const PEEK = Math.round(SHEET_HEIGHT * 0.44);
  const SNAP_POINTS = useMemo(() => [0, PEEK], [PEEK]);
  const DISMISS_LINE = PEEK + (SHEET_HEIGHT - PEEK) * 0.35;

  const y = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const position = useRef(SHEET_HEIGHT); // live mirror of `y`, incl. offset
  const grabbedAt = useRef(0);
  const [rendered, setRendered] = useState(false);
  const [draft, setDraft] = useState("");

  const scrollRef = useRef(null);
  const pinnedToBottom = useRef(true);

  useEffect(() => {
    const id = y.addListener(({ value }) => {
      position.current = value;
    });
    return () => y.removeListener(id);
  }, [y]);

  // ---------------------------------------------------------------- open/close

  const animateTo = useCallback(
    (toValue, { velocity = 0, spring = SPRINGS.sheet, onDone } = {}) => {
      if (reduced) {
        // Non-vestibular equivalent: no travel, just a short fade handled by
        // the container's opacity. Jump the transform.
        y.setValue(toValue);
        onDone?.();
        return;
      }
      Animated.spring(y, {
        toValue,
        velocity,
        useNativeDriver: false,
        ...spring,
      }).start(({ finished }) => finished && onDone?.());
    },
    [y, reduced]
  );

  useEffect(() => {
    if (visible) {
      setRendered(true);
      y.setValue(SHEET_HEIGHT);
      // Entering with no prior gesture, so no overshoot is earned here.
      animateTo(0, { spring: SPRINGS.move });
    } else if (rendered) {
      animateTo(SHEET_HEIGHT, { spring: SPRINGS.move, onDone: () => setRendered(false) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, SHEET_HEIGHT]);

  const dismiss = useCallback(
    (velocity = 0) => {
      chat.stop();
      animateTo(SHEET_HEIGHT, {
        velocity,
        spring: SPRINGS.sheet,
        onDone: () => {
          setRendered(false);
          onClose();
        },
      });
      // No reduced-motion branch needed: animateTo jumps and calls onDone
      // synchronously in that case.
    },
    [animateTo, SHEET_HEIGHT, onClose, chat]
  );

  // ------------------------------------------------------------------ gestures

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Hysteresis: don't steal the gesture until it's clearly a vertical
        // drag, so a tap on the close button stays a tap.
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dy) > GESTURE_HYSTERESIS && Math.abs(g.dy) > Math.abs(g.dx),

        onPanResponderGrant: () => {
          // Interrupt: stop wherever the spring currently is and rebase from
          // that presentation value. Reading the target instead would snap.
          y.stopAnimation((current) => {
            position.current = current;
            grabbedAt.current = current;
            y.setOffset(current);
            y.setValue(0);
          });
        },

        onPanResponderMove: (_e, g) => {
          const raw = grabbedAt.current + g.dy;
          if (raw < 0) {
            // Past the top: resist progressively instead of stopping dead.
            const resisted = -rubberband(-raw, SHEET_HEIGHT);
            y.setValue(resisted - grabbedAt.current);
          } else {
            y.setValue(g.dy);
          }
        },

        onPanResponderRelease: (_e, g) => {
          y.flattenOffset();
          const from = grabbedAt.current + g.dy;
          const velocity = perSecond(g.vy);
          const projected = from + project(velocity);

          if (projected > DISMISS_LINE) {
            dismiss(velocity);
            return;
          }
          const target = nearestSnapPoint(projected, SNAP_POINTS);
          // Velocity handoff — the spring picks up exactly where the finger
          // left off, so drag and animation are one continuous motion.
          animateTo(target, { velocity, spring: SPRINGS.sheet });
        },

        onPanResponderTerminate: () => {
          y.flattenOffset();
          animateTo(nearestSnapPoint(position.current, SNAP_POINTS));
        },
      }),
    [y, SHEET_HEIGHT, SNAP_POINTS, DISMISS_LINE, animateTo, dismiss]
  );

  // ------------------------------------------------------------------- scrim

  const scrimOpacity = y.interpolate({
    inputRange: [0, SHEET_HEIGHT],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // --------------------------------------------------------------- messages

  const { messages, send, stop, retry, clear, streaming, error, dismissError } = chat;

  const onSend = useCallback(
    (text) => {
      const value = (text ?? draft).trim();
      if (!value) return;
      setDraft("");
      pinnedToBottom.current = true;
      send(value);
    },
    [draft, send]
  );

  // Follow the stream only while the user is already at the bottom. Yanking
  // them back down while they're reading something further up is worse than a
  // stream that runs off-screen.
  useEffect(() => {
    if (pinnedToBottom.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: !reduced }));
    }
  }, [messages, reduced]);

  const onScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    pinnedToBottom.current =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 48;
  }, []);

  if (!rendered) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Dimming scrim. A modal task pushes the background back rather than
            sitting beside it, so this one does dim. */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(4,7,15,0.55)",
            opacity: scrimOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => dismiss()} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          style={{
            height: SHEET_HEIGHT,
            transform: [{ translateY: y }],
            opacity: reduced ? scrimOpacity : 1,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
          }}
        >
          {/* The heaviest weight in the app. The screen behind is already a
              light translucent stack, and layering pale glass on pale glass
              collapses legibility. */}
          <Material weight="sheet" style={{ flex: 1 }}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: "rgba(255,255,255,0.14)",
              }}
            />

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              {/* ------------------------------------------------- drag handle */}
              <View {...pan.panHandlers} style={{ paddingTop: 10, paddingHorizontal: 20 }}>
                <View
                  style={{
                    alignSelf: "center",
                    width: 38,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "rgba(255,255,255,0.28)",
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    paddingTop: 14,
                    paddingBottom: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...TYPE.title, color: INK.primary }}>Almanac</Text>
                    <Text style={{ ...TYPE.caption, color: INK.tertiary, marginTop: 2 }}>
                      Reading the forecast for {locationLabel}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {messages.length > 0 && (
                      <IconButton label="Start over" onPress={clear}>
                        <RotateCcw size={15} color={INK.secondary} strokeWidth={2} />
                      </IconButton>
                    )}
                    <IconButton label="Close" onPress={() => dismiss()}>
                      <X size={16} color={INK.secondary} strokeWidth={2} />
                    </IconButton>
                  </View>
                </View>
              </View>

              {/* ------------------------------------------------- transcript */}
              <View style={{ flex: 1 }}>
                <ScrollView
                  ref={scrollRef}
                  onScroll={onScroll}
                  scrollEventThrottle={64}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 14,
                    paddingBottom: 20,
                    gap: 18,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.length === 0 && (
                    <View style={{ gap: 16, paddingTop: 4 }}>
                      <Text style={{ ...TYPE.body, color: INK.secondary, maxWidth: 320 }}>
                        Almanac only sees the forecast on this screen. Ask about timing,
                        clothing, or whether a plan survives the afternoon.
                      </Text>
                      <SuggestionChips suggestions={suggestions} onSelect={onSend} />
                    </View>
                  )}

                  {messages.map((m, i) => (
                    <ChatMessage
                      key={m.id}
                      message={m}
                      streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                    />
                  ))}

                  {error && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 10,
                        borderWidth: 1,
                        borderColor: "rgba(228,133,79,0.32)",
                        backgroundColor: "rgba(228,133,79,0.10)",
                        borderRadius: 16,
                        padding: 13,
                      }}
                    >
                      <AlertCircle size={15} color={ACCENT} strokeWidth={2} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, gap: 8 }}>
                        <Text style={{ ...TYPE.footnote, color: INK.primary }}>{error.message}</Text>
                        {error.kind !== "unconfigured" && (
                          <Pressable onPress={retry} hitSlop={8}>
                            <Text style={{ ...TYPE.footnote, color: ACCENT, fontWeight: "600" }}>
                              Try again
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <Pressable onPress={dismissError} hitSlop={8}>
                        <X size={13} color={INK.tertiary} strokeWidth={2} />
                      </Pressable>
                    </View>
                  )}
                </ScrollView>

                {/* Scroll edge effect instead of a 1px rule: content fades
                    where it passes under the header. */}
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(11,15,25,0.95)", "rgba(11,15,25,0)"]}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }}
                />
              </View>

              {/* --------------------------------------------------- composer */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: Platform.OS === "ios" ? 28 : 16,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.08)",
                }}
              >
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Ask about the forecast"
                  placeholderTextColor={INK.quaternary}
                  multiline
                  onSubmitEditing={() => onSend()}
                  blurOnSubmit={false}
                  style={{
                    flex: 1,
                    ...TYPE.callout,
                    color: INK.primary,
                    maxHeight: 108,
                    minHeight: 42,
                    paddingHorizontal: 15,
                    paddingTop: 11,
                    paddingBottom: 11,
                    borderRadius: 21,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                />
                <SendButton
                  streaming={streaming}
                  enabled={draft.trim().length > 0}
                  onSend={() => onSend()}
                  onStop={stop}
                />
              </View>
            </KeyboardAvoidingView>
          </Material>
        </Animated.View>
      </View>
    </Modal>
  );
}

function IconButton({ children, onPress, label }) {
  const press = useRef(new Animated.Value(0)).current;
  return (
    <Animated.View
      style={{
        transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }],
      }}
    >
      <Pressable
        accessibilityLabel={label}
        onPressIn={() =>
          Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(press, { toValue: 0, duration: 130, useNativeDriver: true }).start()
        }
        onPress={onPress}
        hitSlop={8}
        style={{
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          backgroundColor: "rgba(255,255,255,0.09)",
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function SendButton({ streaming, enabled, onSend, onStop }) {
  const press = useRef(new Animated.Value(0)).current;
  const active = streaming || enabled;
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: active ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [active, fill]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }],
      }}
    >
      <Animated.View
        style={{
          borderRadius: 21,
          backgroundColor: fill.interpolate({
            inputRange: [0, 1],
            outputRange: ["rgba(255,255,255,0.08)", ACCENT],
          }),
        }}
      >
        <Pressable
          accessibilityLabel={streaming ? "Stop" : "Send"}
          disabled={!active}
          onPressIn={() =>
            Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()
          }
          onPressOut={() =>
            Animated.timing(press, { toValue: 0, duration: 130, useNativeDriver: true }).start()
          }
          onPress={streaming ? onStop : onSend}
          style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
        >
          {streaming ? (
            // A plain View rather than lucide's Square. The icon would work
            // (fill does override its default), but it renders stroke *and*
            // fill, so the glyph reads heavier than the 12px it claims and the
            // corner radius isn't ours to set.
            <View style={{ width: 12, height: 12, borderRadius: 2.5, backgroundColor: "#11151F" }} />
          ) : (
            <ArrowUp size={19} color={active ? "#11151F" : INK.quaternary} strokeWidth={2.5} />
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
