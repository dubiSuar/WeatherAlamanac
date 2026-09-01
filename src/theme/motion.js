/**
 * Motion primitives.
 *
 * Apple describes springs with two designer-facing numbers instead of the
 * physics triplet: `dampingRatio` (overshoot) and `response` (how fast it
 * reaches the target, in seconds). React Native's Animated.spring wants
 * stiffness/damping/mass, so we convert.
 *
 *   omega     = 2 * PI / response      (undamped angular frequency, rad/s)
 *   stiffness = omega^2 * mass
 *   damping   = 2 * dampingRatio * omega * mass
 *
 * dampingRatio 1.0 = critically damped, settles with no bounce. Use it for
 * almost everything. Drop to ~0.8 only when the user's own gesture carried
 * momentum into the animation (a flick, a throw, a drag release) — overshoot
 * on something that merely faded in reads as wrong.
 */

export function spring(dampingRatio, response, mass = 1) {
  const omega = (2 * Math.PI) / response;
  return {
    stiffness: omega * omega * mass,
    damping: 2 * dampingRatio * omega * mass,
    mass,
    // Without this, RN stops the spring on a displacement threshold and you
    // get a visible sub-pixel snap at the end of a slow settle.
    restDisplacementThreshold: 0.15,
    restSpeedThreshold: 0.15,
  };
}

/** The values Apple actually ships, named. */
export const SPRINGS = {
  /** Reposition / move. No overshoot. The default for untouched UI. */
  move: spring(1.0, 0.4),
  /** Snappier reposition, for small elements. */
  quick: spring(1.0, 0.28),
  /** Sheets and drawers, released from a drag. Slight overshoot is earned. */
  sheet: spring(0.8, 0.3),
  /** Something the user flicked. */
  flick: spring(0.8, 0.4),
};

/**
 * Apple's momentum projection, from the Designing Fluid Interfaces sample.
 * Given a release velocity, where would the content come to rest? Snap to the
 * target nearest *that* point, not the nearest point to where the finger let
 * go — this is what makes a flick feel thrown instead of nudged.
 *
 * Note the exponential-decay form. The textbook v^2/(2a) is not what iOS uses
 * and feels noticeably shorter.
 *
 * @param velocity px/s
 * @param decelerationRate 0.998 = normal scroll feel, 0.99 = snappier
 */
export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. A hard stop reads as "frozen"; this
 * reads as "responsive, but there's nothing more here."
 *
 * @param overshoot how far past the bound the finger has travelled
 * @param dimension the size of the container, sets the resistance scale
 */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

/** Pick the snap point nearest a (usually projected) position. */
export function nearestSnapPoint(position, snapPoints) {
  return snapPoints.reduce((best, p) =>
    Math.abs(p - position) < Math.abs(best - position) ? p : best
  );
}

/**
 * PanResponder reports velocity in px/ms. Animated.spring integrates in
 * seconds. Getting this wrong is a 1000x error and the sheet either teleports
 * or crawls — hence the named helper rather than a bare `* 1000` at the
 * call site.
 */
export const perSecond = (velocityPerMs) => velocityPerMs * 1000;

/** Movement required before we commit to a drag direction. */
export const GESTURE_HYSTERESIS = 8;
