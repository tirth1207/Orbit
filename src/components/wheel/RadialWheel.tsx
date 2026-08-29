import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { type WheelItemProps } from "../../types/types";

interface RadialWheelProps {
  items: WheelItemProps[];

  selectedIndex: number;
  hoveredIndex: number | null;

  onItemSelect: (index: number) => void;
  onItemHover: (index: number | null) => void;
  onClose: () => void;

  radius: number;
  deadZone: number;

  showCenter: boolean;
  centerIcon?: string;
}

const START_ANGLE = -Math.PI / 2;
const DRAG_ACTIVATION_DISTANCE = 6;

export const RadialWheel: React.FC<RadialWheelProps> = ({
  items,
  selectedIndex,
  hoveredIndex,
  onItemSelect,
  onItemHover,
  onClose,
  radius,
  deadZone,
  showCenter,
  centerIcon,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);

  const itemCount = items.length;
  const diameter = Math.max(radius * 2, 1);

  const pressStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [pointerAngleDeg, setPointerAngleDeg] = useState<number | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);

  // --------------------------------------------------
  // MOUNT
  // --------------------------------------------------

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  // --------------------------------------------------
  // SECTOR ANGLE
  // --------------------------------------------------

  const segmentAngle = useMemo(() => {
    if (itemCount === 0) {
      return 0;
    }

    return (Math.PI * 2) / itemCount;
  }, [itemCount]);

  // --------------------------------------------------
  // ANGLE HELPERS
  // --------------------------------------------------

  const radiansToDegrees = useCallback((radians: number) => {
    return (radians * 180) / Math.PI;
  }, []);

  const normalizeAngle = useCallback((angle: number) => {
    const twoPi = Math.PI * 2;

    angle %= twoPi;

    if (angle < 0) {
      angle += twoPi;
    }

    return angle;
  }, []);

  // --------------------------------------------------
  // POINTER -> SECTOR
  // --------------------------------------------------

  const resolvePointer = useCallback(
    (
      clientX: number,
      clientY: number,
    ): {
      index: number | null;
      angleDeg: number | null;
      inDeadZone: boolean;
      outsideWheel: boolean;
    } => {
      const wheel = wheelRef.current;

      if (!wheel || itemCount === 0 || segmentAngle === 0) {
        return {
          index: null,
          angleDeg: null,
          inDeadZone: false,
          outsideWheel: true,
        };
      }

      const rect = wheel.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      const distance = Math.sqrt(dx * dx + dy * dy);

      const inDeadZone = distance <= deadZone;

      const outsideWheel = distance > radius + 20;

      // Convert normal screen angle into:
      // 0°   = top
      // 90°  = right
      // 180° = bottom
      // 270° = left
      let angle = Math.atan2(dy, dx);

      angle -= START_ANGLE;

      angle = normalizeAngle(angle);

      const angleDeg = radiansToDegrees(angle);

      if (inDeadZone || outsideWheel) {
        return {
          index: null,
          angleDeg,
          inDeadZone,
          outsideWheel,
        };
      }

      // IMPORTANT:
      // This must match the visual sector geometry.
      const index = Math.floor(angle / segmentAngle);

      if (index < 0 || index >= itemCount) {
        return {
          index: null,
          angleDeg,
          inDeadZone,
          outsideWheel,
        };
      }

      return {
        index,
        angleDeg,
        inDeadZone,
        outsideWheel,
      };
    },
    [
      deadZone,
      itemCount,
      normalizeAngle,
      radiansToDegrees,
      radius,
      segmentAngle,
    ],
  );

  // --------------------------------------------------
  // POINTER MOVE
  // --------------------------------------------------

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const { index, angleDeg } = resolvePointer(
        event.clientX,
        event.clientY,
      );

      if (pressStateRef.current) {
        const { startX, startY } = pressStateRef.current;

        const traveled = Math.hypot(
          event.clientX - startX,
          event.clientY - startY,
        );

        if (traveled > DRAG_ACTIVATION_DISTANCE) {
          setIsDragging(true);
        }
      }

      setPointerAngleDeg(angleDeg);

      if (index !== null && !items[index]?.enabled) {
        onItemHover(null);
        return;
      }

      onItemHover(index);
    },
    [items, onItemHover, resolvePointer],
  );

  // --------------------------------------------------
  // POINTER LEAVE
  // --------------------------------------------------

  const handlePointerLeave = useCallback(() => {
    if (!pressStateRef.current) {
      onItemHover(null);
      setPointerAngleDeg(null);
    }
  }, [onItemHover]);

  // --------------------------------------------------
  // POINTER DOWN
  // --------------------------------------------------

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);

      pressStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };

      setIsDragging(false);

      const { index } = resolvePointer(
        event.clientX,
        event.clientY,
      );

      if (index !== null && items[index]?.enabled) {
        onItemHover(index);
      } else {
        onItemHover(null);
      }
    },
    [items, onItemHover, resolvePointer],
  );

  // --------------------------------------------------
  // POINTER UP
  // --------------------------------------------------

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pressState = pressStateRef.current;

      if (
        !pressState ||
        pressState.pointerId !== event.pointerId
      ) {
        return;
      }

      pressStateRef.current = null;

      setIsDragging(false);
      setPointerAngleDeg(null);

      if (
        event.currentTarget.hasPointerCapture(
          event.pointerId,
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      }

      const {
        index,
        inDeadZone,
        outsideWheel,
      } = resolvePointer(
        event.clientX,
        event.clientY,
      );

      if (outsideWheel) {
        onItemHover(null);
        return;
      }

      if (inDeadZone) {
        onClose();
        return;
      }

      if (index === null) {
        onItemHover(null);
        return;
      }

      const item = items[index];

      if (!item?.enabled) {
        return;
      }

      onItemSelect(index);
    },
    [
      items,
      onClose,
      onItemHover,
      onItemSelect,
      resolvePointer,
    ],
  );

  // --------------------------------------------------
  // POINTER CANCEL
  // --------------------------------------------------

  const handlePointerCancel = useCallback(() => {
    pressStateRef.current = null;

    setIsDragging(false);
    setPointerAngleDeg(null);

    onItemHover(null);
  }, [onItemHover]);

  // --------------------------------------------------
  // KEYBOARD NAVIGATION
  // --------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (itemCount === 0) {
        return;
      }

      if (
        event.key === "ArrowRight" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();

        let next =
          hoveredIndex === null
            ? 0
            : (hoveredIndex + 1) % itemCount;

        for (let i = 0; i < itemCount; i++) {
          if (items[next]?.enabled) {
            onItemHover(next);
            return;
          }

          next = (next + 1) % itemCount;
        }

        return;
      }

      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();

        let previous =
          hoveredIndex === null
            ? itemCount - 1
            : (hoveredIndex - 1 + itemCount) %
              itemCount;

        for (let i = 0; i < itemCount; i++) {
          if (items[previous]?.enabled) {
            onItemHover(previous);
            return;
          }

          previous =
            (previous - 1 + itemCount) %
            itemCount;
        }

        return;
      }

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        if (hoveredIndex === null) {
          return;
        }

        const item = items[hoveredIndex];

        if (!item?.enabled) {
          return;
        }

        event.preventDefault();

        onItemSelect(hoveredIndex);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    hoveredIndex,
    itemCount,
    items,
    onClose,
    onItemHover,
    onItemSelect,
  ]);

  // --------------------------------------------------
  // AUTO FOCUS
  // --------------------------------------------------

  useEffect(() => {
    const wheel = wheelRef.current;

    if (!wheel) {
      return;
    }

    wheel.focus();
  }, []);

  // --------------------------------------------------
  // SECTOR GEOMETRY
  // --------------------------------------------------

  const sectors = useMemo(() => {
    if (itemCount === 0) {
      return [];
    }

    return items.map((item, index) => {
      const startAngle =
        START_ANGLE +
        index * segmentAngle;

      const centerAngle =
        startAngle +
        segmentAngle / 2;

      return {
        item,
        index,
        centerAngle,
        centerAngleDeg:
          radiansToDegrees(centerAngle),
        startAngleDeg:
          radiansToDegrees(startAngle),
        endAngleDeg:
          radiansToDegrees(
            startAngle + segmentAngle,
          ),
      };
    });
  }, [
    items,
    itemCount,
    radiansToDegrees,
    segmentAngle,
  ]);

  // --------------------------------------------------
  // ACTIVE SECTOR
  // --------------------------------------------------

  const activeIndex =
    hoveredIndex ??
    (selectedIndex >= 0
      ? selectedIndex
      : null);

  const activeSector =
    activeIndex !== null
      ? sectors[activeIndex]
      : undefined;

  // --------------------------------------------------
  // WEDGE PATH
  // --------------------------------------------------

  const wedgePath = useMemo(() => {
    if (!activeSector) {
      return null;
    }

    const cx = radius;
    const cy = radius;

    const outer = radius - 4;
    const inner = deadZone + 4;

    const toRad = (deg: number) =>
      (deg * Math.PI) / 180;

    const point = (
      r: number,
      deg: number,
    ) => ({
      x:
        cx +
        r * Math.cos(toRad(deg)),
      y:
        cy +
        r * Math.sin(toRad(deg)),
    });

    const inset = Math.min(
      2,
      (activeSector.endAngleDeg -
        activeSector.startAngleDeg) *
        0.06,
    );

    const startDeg =
      activeSector.startAngleDeg +
      inset;

    const endDeg =
      activeSector.endAngleDeg -
      inset;

    const p1 = point(inner, startDeg);
    const p2 = point(outer, startDeg);
    const p3 = point(outer, endDeg);
    const p4 = point(inner, endDeg);

    const largeArc =
      endDeg - startDeg > 180 ? 1 : 0;

    return [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${outer} ${outer} 0 ${largeArc} 1 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${inner} ${inner} 0 ${largeArc} 0 ${p1.x} ${p1.y}`,
      "Z",
    ].join(" ");
  }, [
    activeSector,
    deadZone,
    radius,
  ]);

  // --------------------------------------------------
  // CLASS
  // --------------------------------------------------

  const wheelClassName = [
    "radial-wheel",
    mounted ? "is-mounted" : "",
    isDragging ? "is-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeDescendantId =
    activeIndex !== null &&
    items[activeIndex]
      ? `wheel-sector-${items[activeIndex].id}`
      : undefined;

  // --------------------------------------------------
  // EMPTY WHEEL
  // --------------------------------------------------

  if (itemCount === 0) {
    return (
      <div
        ref={wheelRef}
        className={wheelClassName}
        role="dialog"
        aria-modal="true"
        aria-label="Orbit radial menu"
        tabIndex={0}
        style={{
          width: diameter,
          height: diameter,
        }}
      >
        <div className="wheel-background" />

        {showCenter && (
          <button
            type="button"
            className="wheel-center"
            aria-label="Close wheel"
            onClick={onClose}
            style={{
              width: deadZone * 2,
              height: deadZone * 2,
            }}
          >
            {centerIcon && (
              <span className="center-icon">
                {centerIcon}
              </span>
            )}
          </button>
        )}
      </div>
    );
  }

  // --------------------------------------------------
  // WHEEL
  // --------------------------------------------------

  return (
    <div
      ref={wheelRef}
      className={wheelClassName}
      role="dialog"
      aria-modal="true"
      aria-label="Orbit radial menu"
      aria-activedescendant={
        activeDescendantId
      }
      tabIndex={0}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(event) =>
        event.preventDefault()
      }
      style={{
        width: diameter,
        height: diameter,
        touchAction: "none",

        ["--wheel-radius" as string]:
          `${radius}px`,

        ["--wheel-dead-zone" as string]:
          `${deadZone}px`,

        ["--wheel-item-count" as string]:
          itemCount,

        ["--wheel-segment-angle" as string]:
          `${360 / itemCount}deg`,
      }}
    >
      <div
        className="wheel-background"
        aria-hidden="true"
      />

      <div
        className="wheel-ring wheel-ring-outer"
        aria-hidden="true"
      />

      {/* -------------------------------------------- */}
      {/* ACTIVE WEDGE                                 */}
      {/* -------------------------------------------- */}

      {wedgePath && (
        <svg
          className="wheel-wedge-layer"
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
          aria-hidden="true"
        >
          <path
            className={
              hoveredIndex !== null
                ? "wheel-wedge is-hovered"
                : "wheel-wedge is-selected"
            }
            d={wedgePath}
          />
        </svg>
      )}

      {/* -------------------------------------------- */}
      {/* DRAG GUIDE                                   */}
      {/* -------------------------------------------- */}

      {isDragging &&
        pointerAngleDeg !== null && (
          <div
            className="wheel-guide-line"
            aria-hidden="true"
            style={{
              ["--guide-angle" as string]:
                `${pointerAngleDeg - 90}deg`,

              ["--guide-length" as string]:
                `${radius - deadZone - 8}px`,
            }}
          />
        )}

      {/* -------------------------------------------- */}
      {/* SECTORS                                      */}
      {/* -------------------------------------------- */}

      <div
        className="wheel-sectors"
        role="menu"
        aria-orientation="horizontal"
      >
        {sectors.map(
          ({
            item,
            index,
            centerAngleDeg,
          }) => {
            const isSelected =
              selectedIndex === index;

            const isHovered =
              hoveredIndex === index;

            const isDisabled =
              !item.enabled;

            const itemDistance =
              radius * 0.64;

            const angleRad =
              (centerAngleDeg * Math.PI) /
              180;

            const x =
              Math.cos(angleRad) *
              itemDistance;

            const y =
              Math.sin(angleRad) *
              itemDistance;

            return (
              <button
                key={item.id}
                id={`wheel-sector-${item.id}`}
                type="button"
                role="menuitem"
                className={[
                  "wheel-sector",
                  isSelected
                    ? "selected"
                    : "",
                  isHovered
                    ? "hovered"
                    : "",
                  isDisabled
                    ? "disabled"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={isDisabled}
                aria-label={item.name}
                aria-disabled={
                  isDisabled
                }
                aria-pressed={
                  isSelected
                }
                tabIndex={-1}
                title={
                  isDisabled
                    ? `${item.name} (unavailable)`
                    : item.name
                }
                style={{
                  left: "50%",
                  top: "50%",

                  /*
                  * Keep the actual position controlled by React.
                  * CSS animation uses --item-x / --item-y to
                  * create the opening/closing motion.
                  */
                  ["--item-x" as string]: `${x}px`,
                  ["--item-y" as string]: `${y}px`,

                  ["--sector-angle" as string]:
                    `${360 / itemCount}deg`,

                  ["--sector-index" as string]:
                    index,

                  ["--sector-center-angle" as string]:
                    `${centerAngleDeg}deg`,

                  /*
                  * Every item gets a slightly later animation.
                  */
                  ["--stagger-delay" as string]:
                    `${index * 45}ms`,

                  /*
                  * Hover scale is handled by CSS.
                  */
                  ["--hover-scale" as string]:
                    isHovered ? "1.08" : "1",
                }}
                onClick={(event) => {
                  if (
                    event.detail === 0 &&
                    item.enabled
                  ) {
                    onItemSelect(index);
                  }
                }}
              >
                {/* ---------------------------------- */}
                {/* CONTENT                             */}
                {/* ---------------------------------- */}

                <span className="sector-content">
                  {/* -------------------------------- */}
                  {/* ICON                              */}
                  {/* -------------------------------- */}

                  <span className="sector-icon">
                    {item.icon ? (
                      <img
                        src={item.icon}
                        alt=""
                        draggable={false}
                        onError={(event) => {
                          /*
                           * If the configured icon cannot
                           * be loaded, hide the broken image
                           * and show the fallback letter.
                           */
                          event.currentTarget.style.display =
                            "none";

                          const fallback =
                            event.currentTarget
                              .nextElementSibling;

                          if (
                            fallback instanceof HTMLElement
                          ) {
                            fallback.style.display =
                              "flex";
                          }
                        }}
                      />
                    ) : null}

                    <span
                      className="sector-icon-fallback"
                      style={{
                        display: item.icon
                          ? "none"
                          : "flex",
                      }}
                    >
                      {item.name
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </span>
                  </span>

                  {/* -------------------------------- */}
                  {/* LABEL                             */}
                  {/* -------------------------------- */}

                  <span className="sector-label">
                    {item.name}
                  </span>
                </span>

                <span
                  className="sector-glow"
                  aria-hidden="true"
                />
              </button>
            );
          },
        )}
      </div>

      {/* -------------------------------------------- */}
      {/* INNER RING                                   */}
      {/* -------------------------------------------- */}

      <div
        className="wheel-ring wheel-ring-inner"
        aria-hidden="true"
        style={{
          width: deadZone * 2,
          height: deadZone * 2,
        }}
      />

      {/* -------------------------------------------- */}
      {/* CENTER                                      */}
      {/* -------------------------------------------- */}

      {showCenter && (
        <button
          type="button"
          className="wheel-center"
          aria-label="Close wheel"
          onClick={onClose}
          style={{
            width: deadZone * 2,
            height: deadZone * 2,
          }}
        >
          <span
            className="center-icon"
            aria-hidden="true"
          >
            {centerIcon || "×"}
          </span>
        </button>
      )}

      <span
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {activeIndex !== null &&
        items[activeIndex]
          ? items[activeIndex].name
          : ""}
      </span>
    </div>
  );
};