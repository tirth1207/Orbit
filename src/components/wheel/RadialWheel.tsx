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

  onItemSelect: (index: number, childIndex?: number) => void;
  onItemHover: (index: number | null, childIndex?: number | null) => void;
  onClose: () => void;

  radius: number;
  deadZone: number;

  showCenter: boolean;
  centerIcon?: string;
}

const START_ANGLE = -Math.PI / 2;
const DRAG_ACTIVATION_DISTANCE = 6;
const CLOSE_CORRIDOR_DELAY = 200;

export const RadialWheel: React.FC<RadialWheelProps> = ({
  items,
  selectedIndex,
  hoveredIndex: externalHoveredIndex,
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

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mounted, setMounted] = useState(false);
  const [activePath, setActivePath] = useState<string[]>([]);
  const [closingChildPath, setClosingChildPath] = useState<string[] | null>(null);
  const [pointerAngleDeg, setPointerAngleDeg] = useState<number | null>(null);
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
  // TIMER HELPERS FOR SAFE ZONE / CORRIDOR
  // --------------------------------------------------

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleCloseTimer = useCallback(() => {
    cancelCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setActivePath((prev) => {
        if (prev.length > 0) {
          setClosingChildPath(prev);
          setTimeout(() => {
            setClosingChildPath(null);
          }, 160);
        }
        return [];
      });
    }, CLOSE_CORRIDOR_DELAY);
  }, [cancelCloseTimer]);

  useEffect(() => {
    return () => {
      cancelCloseTimer();
    };
  }, [cancelCloseTimer]);

  // Sync external hoveredIndex when controlled from outside
  useEffect(() => {
    if (externalHoveredIndex !== null && externalHoveredIndex >= 0 && externalHoveredIndex < items.length) {
      const item = items[externalHoveredIndex];
      if (item && activePath[0] !== item.id) {
        cancelCloseTimer();
        setActivePath([item.id]);
      }
    } else if (externalHoveredIndex === null && activePath.length === 1 && !items.find(i => i.id === activePath[0])?.children?.length) {
      setActivePath([]);
    }
  }, [externalHoveredIndex, items]);

  // --------------------------------------------------
  // SECTOR ANGLE & GEOMETRY
  // --------------------------------------------------

  const segmentAngle = useMemo(() => {
    if (itemCount === 0) {
      return 0;
    }

    return (Math.PI * 2) / itemCount;
  }, [itemCount]);

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

  // Primary Sectors Geometry
  const sectors = useMemo(() => {
    if (itemCount === 0) {
      return [];
    }

    return items.map((item, index) => {
      const startAngle = START_ANGLE + index * segmentAngle;
      const centerAngle = startAngle + segmentAngle / 2;

      return {
        item,
        index,
        centerAngle,
        centerAngleDeg: radiansToDegrees(centerAngle),
        startAngleDeg: radiansToDegrees(startAngle),
        endAngleDeg: radiansToDegrees(startAngle + segmentAngle),
      };
    });
  }, [items, itemCount, radiansToDegrees, segmentAngle]);

  // Derived Active Primary Item
  const activePrimaryId = activePath[0] ?? null;
  const activePrimaryIndex = useMemo(() => {
    if (!activePrimaryId) return -1;
    return items.findIndex((item) => item.id === activePrimaryId);
  }, [activePrimaryId, items]);

  const activeSector = activePrimaryIndex >= 0 ? sectors[activePrimaryIndex] : undefined;

  // Active Parent Item & Children
  const activeParentItem = useMemo(() => {
    if (!activePrimaryId) return null;
    return items.find((item) => item.id === activePrimaryId) || null;
  }, [activePrimaryId, items]);

  const activeChildren = useMemo(() => {
    return activeParentItem?.children?.filter((child) => child.enabled) ?? [];
  }, [activeParentItem]);

  const activeChildId = activePath[1] ?? null;

  // --------------------------------------------------
  // CHILD RING GEOMETRY & BOUNDARY AWARENESS
  // --------------------------------------------------

  const nestedRadius = useMemo(() => radius + 95, [radius]);

  const childSectors = useMemo(() => {
    if (!activeParentItem || activeChildren.length === 0 || !activeSector) {
      return [];
    }

    let baseCenterAngle = activeSector.centerAngle;

    // Viewport Boundary Check
    if (wheelRef.current) {
      const rect = wheelRef.current.getBoundingClientRect();
      const wheelCenterX = rect.left + rect.width / 2;
      const wheelCenterY = rect.top + rect.height / 2;
      const expectedX = wheelCenterX + Math.cos(baseCenterAngle) * nestedRadius;
      const expectedY = wheelCenterY + Math.sin(baseCenterAngle) * nestedRadius;

      const padding = 70;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (expectedX > vw - padding && Math.cos(baseCenterAngle) > 0) {
        // Shift left
        baseCenterAngle = Math.PI - baseCenterAngle;
      } else if (expectedX < padding && Math.cos(baseCenterAngle) < 0) {
        // Shift right
        baseCenterAngle = Math.PI - baseCenterAngle;
      }

      if (expectedY > vh - padding && Math.sin(baseCenterAngle) > 0) {
        // Shift up
        baseCenterAngle = -baseCenterAngle;
      } else if (expectedY < padding && Math.sin(baseCenterAngle) < 0) {
        // Shift down
        baseCenterAngle = -baseCenterAngle;
      }
    }

    const childCount = activeChildren.length;
    const arcSpread = Math.min(Math.PI * 0.85, Math.max(Math.PI / 4, childCount * (Math.PI / 7)));
    const startArcAngle = baseCenterAngle - arcSpread / 2;
    const stepAngle = childCount > 1 ? arcSpread / (childCount - 1) : 0;

    return activeChildren.map((child, index) => {
      const angle = childCount === 1 ? baseCenterAngle : startArcAngle + index * stepAngle;
      const x = Math.cos(angle) * nestedRadius;
      const y = Math.sin(angle) * nestedRadius;

      return {
        child,
        index,
        angle,
        angleDeg: radiansToDegrees(angle),
        x,
        y,
      };
    });
  }, [activeParentItem, activeChildren, activeSector, nestedRadius, radiansToDegrees]);

  // --------------------------------------------------
  // POINTER -> SECTOR RESOLUTION
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
      const outsideWheel = distance > nestedRadius + 60;

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
    [deadZone, itemCount, nestedRadius, normalizeAngle, radiansToDegrees, segmentAngle],
  );

  // --------------------------------------------------
  // POINTER MOVE & HOVER LOGIC
  // --------------------------------------------------

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const { index, angleDeg, outsideWheel, inDeadZone } = resolvePointer(
        event.clientX,
        event.clientY,
      );

      if (pressStateRef.current) {
        const { startX, startY } = pressStateRef.current;
        const traveled = Math.hypot(event.clientX - startX, event.clientY - startY);
        if (traveled > DRAG_ACTIVATION_DISTANCE) {
          setIsDragging(true);
        }
      }

      setPointerAngleDeg(angleDeg);

      if (outsideWheel || inDeadZone) {
        if (activeParentItem?.children?.length) {
          scheduleCloseTimer();
        } else {
          setActivePath([]);
          onItemHover(null);
        }
        return;
      }

      // Check distance from center to determine if pointer is in primary wheel vs outer child area
      const wheel = wheelRef.current;
      if (wheel) {
        const rect = wheel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.hypot(event.clientX - centerX, event.clientY - centerY);

        if (dist <= radius + 25) {
          // Pointer is over primary wheel
          cancelCloseTimer();
          if (index !== null && items[index]?.enabled) {
            const item = items[index];
            if (activePath[0] !== item.id) {
              if (activePath.length > 1) {
                setClosingChildPath(activePath);
                setTimeout(() => setClosingChildPath(null), 160);
              }
              setActivePath([item.id]);
            }
            onItemHover(index);
          }
          return;
        } else if (activeParentItem?.children?.length) {
          // Pointer is in outer ring area
          // Check distance to any child sector to decide whether to cancel close timer
          const isNearChild = childSectors.some((cs) => {
            const childCx = rect.left + rect.width / 2 + cs.x;
            const childCy = rect.top + rect.height / 2 + cs.y;
            return Math.hypot(event.clientX - childCx, event.clientY - childCy) <= 55;
          });

          if (isNearChild) {
            cancelCloseTimer();
          } else {
            scheduleCloseTimer();
          }
        }
      }
    },
    [activeParentItem, activePath, cancelCloseTimer, items, onItemHover, radius, resolvePointer, scheduleCloseTimer],
  );

  const handleChildPointerEnter = useCallback(
    (childId: string, childIndex: number) => {
      cancelCloseTimer();
      if (activeParentItem) {
        setActivePath([activeParentItem.id, childId]);
        onItemHover(activePrimaryIndex, childIndex);
      }
    },
    [activeParentItem, activePrimaryIndex, cancelCloseTimer, onItemHover],
  );

  const handleChildPointerLeave = useCallback(() => {
    scheduleCloseTimer();
  }, [scheduleCloseTimer]);

  const handlePointerLeave = useCallback(() => {
    if (!pressStateRef.current) {
      if (activeParentItem?.children?.length) {
        scheduleCloseTimer();
      } else {
        setActivePath([]);
        onItemHover(null);
      }
      setPointerAngleDeg(null);
    }
  }, [activeParentItem, onItemHover, scheduleCloseTimer]);

  // --------------------------------------------------
  // POINTER DOWN / UP / CANCEL
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

      const { index } = resolvePointer(event.clientX, event.clientY);

      if (index !== null && items[index]?.enabled) {
        setActivePath([items[index].id]);
        onItemHover(index);
      }
    },
    [items, onItemHover, resolvePointer],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pressState = pressStateRef.current;

      if (!pressState || pressState.pointerId !== event.pointerId) {
        return;
      }

      pressStateRef.current = null;
      setIsDragging(false);
      setPointerAngleDeg(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const { index, inDeadZone, outsideWheel } = resolvePointer(
        event.clientX,
        event.clientY,
      );

      if (outsideWheel) {
        if (!activeChildId) {
          onItemHover(null);
          setActivePath([]);
        }
        return;
      }

      if (inDeadZone) {
        onClose();
        return;
      }

      // If a child item is currently hovered/active, select child
      if (activeChildId && activeParentItem) {
        const cIndex = activeChildren.findIndex((c) => c.id === activeChildId);
        if (cIndex >= 0) {
          onItemSelect(activePrimaryIndex, cIndex);
          return;
        }
      }

      if (index === null) {
        return;
      }

      const item = items[index];
      if (!item?.enabled) {
        return;
      }

      // If parent has children, hovering opens children. Clicking parent with children opens/selects if intended.
      if (item.children && item.children.length > 0) {
        setActivePath([item.id]);
        return;
      }

      onItemSelect(index);
    },
    [
      activeChildId,
      activeChildren,
      activeParentItem,
      activePrimaryIndex,
      items,
      onClose,
      onItemHover,
      onItemSelect,
      resolvePointer,
    ],
  );

  const handlePointerCancel = useCallback(() => {
    pressStateRef.current = null;
    setIsDragging(false);
    setPointerAngleDeg(null);
    setActivePath([]);
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

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        let next = activePrimaryIndex < 0 ? 0 : (activePrimaryIndex + 1) % itemCount;

        for (let i = 0; i < itemCount; i++) {
          if (items[next]?.enabled) {
            setActivePath([items[next].id]);
            onItemHover(next);
            return;
          }
          next = (next + 1) % itemCount;
        }
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        let previous =
          activePrimaryIndex < 0 ? itemCount - 1 : (activePrimaryIndex - 1 + itemCount) % itemCount;

        for (let i = 0; i < itemCount; i++) {
          if (items[previous]?.enabled) {
            setActivePath([items[previous].id]);
            onItemHover(previous);
            return;
          }
          previous = (previous - 1 + itemCount) % itemCount;
        }
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        if (activePrimaryIndex < 0) {
          return;
        }

        const item = items[activePrimaryIndex];
        if (!item?.enabled) {
          return;
        }

        event.preventDefault();
        if (activeChildId) {
          const cIndex = activeChildren.findIndex((c) => c.id === activeChildId);
          if (cIndex >= 0) {
            onItemSelect(activePrimaryIndex, cIndex);
            return;
          }
        }
        onItemSelect(activePrimaryIndex);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeChildId,
    activeChildren,
    activePrimaryIndex,
    itemCount,
    items,
    onClose,
    onItemHover,
    onItemSelect,
  ]);

  // Auto Focus
  useEffect(() => {
    wheelRef.current?.focus();
  }, []);

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

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const point = (r: number, deg: number) => ({
      x: cx + r * Math.cos(toRad(deg)),
      y: cy + r * Math.sin(toRad(deg)),
    });

    const inset = Math.min(2, (activeSector.endAngleDeg - activeSector.startAngleDeg) * 0.06);
    const startDeg = activeSector.startAngleDeg + inset;
    const endDeg = activeSector.endAngleDeg - inset;

    const p1 = point(inner, startDeg);
    const p2 = point(outer, startDeg);
    const p3 = point(outer, endDeg);
    const p4 = point(inner, endDeg);

    const largeArc = endDeg - startDeg > 180 ? 1 : 0;

    return [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${outer} ${outer} 0 ${largeArc} 1 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${inner} ${inner} 0 ${largeArc} 0 ${p1.x} ${p1.y}`,
      "Z",
    ].join(" ");
  }, [activeSector, deadZone, radius]);

  // --------------------------------------------------
  // CLASS NAMES
  // --------------------------------------------------

  const wheelClassName = [
    "radial-wheel",
    mounted ? "is-mounted" : "",
    isDragging ? "is-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeDescendantId =
    activePrimaryIndex >= 0 && items[activePrimaryIndex]
      ? `wheel-sector-${items[activePrimaryIndex].id}`
      : undefined;

  // --------------------------------------------------
  // VISUAL CONNECTION LINE / WEDGE
  // --------------------------------------------------

  const visualConnections = useMemo(() => {
    if (!activeSector || childSectors.length === 0) {
      return null;
    }

    const parentX = radius + Math.cos(activeSector.centerAngle) * (radius * 0.64);
    const parentY = radius + Math.sin(activeSector.centerAngle) * (radius * 0.64);

    return childSectors.map(({ child, x, y }) => {
      const childX = radius + x;
      const childY = radius + y;

      return (
        <line
          key={`conn-${child.id}`}
          x1={parentX}
          y1={parentY}
          x2={childX}
          y2={childY}
          className="wheel-connection-line"
        />
      );
    });
  }, [activeSector, childSectors, radius]);

  // --------------------------------------------------
  // RENDER
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
            {centerIcon && <span className="center-icon">{centerIcon}</span>}
          </button>
        )}
      </div>
    );
  }

  const renderingChildren = childSectors.length > 0;
  const isClosingChildren = closingChildPath !== null && !renderingChildren;

  return (
    <div
      ref={wheelRef}
      className={wheelClassName}
      role="dialog"
      aria-modal="true"
      aria-label="Orbit radial menu"
      aria-activedescendant={activeDescendantId}
      tabIndex={0}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        width: diameter,
        height: diameter,
        touchAction: "none",
        ["--wheel-radius" as string]: `${radius}px`,
        ["--nested-wheel-radius" as string]: `${nestedRadius}px`,
        ["--wheel-dead-zone" as string]: `${deadZone}px`,
        ["--wheel-item-count" as string]: itemCount,
        ["--wheel-segment-angle" as string]: `${360 / itemCount}deg`,
      }}
    >
      <div className="wheel-background" aria-hidden="true" />
      <div className="wheel-ring wheel-ring-outer" aria-hidden="true" />

      {/* ACTIVE WEDGE */}
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
              activePrimaryId ? "wheel-wedge is-hovered" : "wheel-wedge is-selected"
            }
            d={wedgePath}
          />

          {/* CONNECTIONS TO NESTED RING */}
          {visualConnections}
        </svg>
      )}

      {/* DRAG GUIDE */}
      {isDragging && pointerAngleDeg !== null && (
        <div
          className="wheel-guide-line"
          aria-hidden="true"
          style={{
            ["--guide-angle" as string]: `${pointerAngleDeg - 90}deg`,
            ["--guide-length" as string]: `${radius - deadZone - 8}px`,
          }}
        />
      )}

      {/* PRIMARY SECTORS */}
      <div className="wheel-sectors" role="menu" aria-orientation="horizontal">
        {sectors.map(({ item, index, centerAngleDeg }) => {
          const isSelected = selectedIndex === index;
          const isActive = activePrimaryId === item.id;
          const isDisabled = !item.enabled;
          const hasChildren = Boolean(item.children && item.children.length > 0);
          const childrenOpen = isActive && hasChildren;

          const itemDistance = radius * 0.64;
          const angleRad = (centerAngleDeg * Math.PI) / 180;
          const x = Math.cos(angleRad) * itemDistance;
          const y = Math.sin(angleRad) * itemDistance;

          return (
            <button
              key={item.id}
              id={`wheel-sector-${item.id}`}
              type="button"
              role="menuitem"
              className={[
                "wheel-sector",
                isSelected ? "selected" : "",
                isActive ? "hovered" : "",
                isDisabled ? "disabled" : "",
                hasChildren ? "has-children" : "",
                childrenOpen ? "children-open" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={isDisabled}
              aria-label={item.name}
              aria-disabled={isDisabled}
              aria-pressed={isSelected}
              tabIndex={-1}
              title={isDisabled ? `${item.name} (unavailable)` : item.name}
              style={{
                left: "50%",
                top: "50%",
                ["--item-x" as string]: `${x}px`,
                ["--item-y" as string]: `${y}px`,
                ["--sector-angle" as string]: `${360 / itemCount}deg`,
                ["--sector-index" as string]: index,
                ["--sector-center-angle" as string]: `${centerAngleDeg}deg`,
                ["--stagger-delay" as string]: `${index * 45}ms`,
                ["--hover-scale" as string]: isActive ? "1.08" : "1",
              }}
              onClick={(event) => {
                if (event.detail === 0 && item.enabled) {
                  if (hasChildren) {
                    setActivePath([item.id]);
                  } else {
                    onItemSelect(index);
                  }
                }
              }}
            >
              <span className="sector-content">
                <span className="sector-icon">
                  {item.icon ? (
                    <img
                      src={item.icon}
                      alt=""
                      draggable={false}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        const fallback = event.currentTarget.nextElementSibling;
                        if (fallback instanceof HTMLElement) {
                          fallback.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}

                  <span
                    className="sector-icon-fallback"
                    style={{
                      display: item.icon ? "none" : "flex",
                    }}
                  >
                    {item.name?.charAt(0)?.toUpperCase()}
                  </span>
                </span>

                <span className="sector-label">
                  {item.name}
                  {hasChildren && <span className="sector-indicator">✦</span>}
                </span>
              </span>

              <span className="sector-glow" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* NESTED WHEEL (LEVEL 1 RING) */}
      {(renderingChildren || isClosingChildren) && (
        <div
          className={[
            "nested-wheel",
            isClosingChildren ? "is-closing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="menu"
          aria-label="Submenu"
        >
          {childSectors.map(({ child, index, x, y }) => {
            const isChildActive = activeChildId === child.id;
            const isChildDisabled = !child.enabled;

            return (
              <button
                key={child.id}
                id={`nested-sector-${child.id}`}
                type="button"
                role="menuitem"
                className={[
                  "wheel-sector",
                  "nested-sector",
                  isChildActive ? "hovered" : "",
                  isChildDisabled ? "disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={isChildDisabled}
                aria-label={child.name}
                aria-disabled={isChildDisabled}
                tabIndex={-1}
                onPointerEnter={() => handleChildPointerEnter(child.id, index)}
                onPointerLeave={handleChildPointerLeave}
                style={{
                  left: "50%",
                  top: "50%",
                  ["--item-x" as string]: `${x}px`,
                  ["--item-y" as string]: `${y}px`,
                  ["--nested-stagger-delay" as string]: `${index * 40}ms`,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (activePrimaryIndex >= 0 && child.enabled) {
                    onItemSelect(activePrimaryIndex, index);
                  }
                }}
              >
                <span className="sector-content">
                  <span className="sector-icon">
                    {child.icon ? (
                      <img
                        src={child.icon}
                        alt=""
                        draggable={false}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          const fallback = event.currentTarget.nextElementSibling;
                          if (fallback instanceof HTMLElement) {
                            fallback.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}

                    <span
                      className="sector-icon-fallback"
                      style={{
                        display: child.icon ? "none" : "flex",
                      }}
                    >
                      {child.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </span>

                  <span className="sector-label">{child.name}</span>
                </span>
                <span className="sector-glow" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      {/* INNER RING */}
      <div
        className="wheel-ring wheel-ring-inner"
        aria-hidden="true"
        style={{
          width: deadZone * 2,
          height: deadZone * 2,
        }}
      />

      {/* CENTER BUTTON */}
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
          <span className="center-icon" aria-hidden="true">
            {centerIcon || "×"}
          </span>
        </button>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {activeParentItem ? activeParentItem.name : ""}
      </span>
    </div>
  );
};