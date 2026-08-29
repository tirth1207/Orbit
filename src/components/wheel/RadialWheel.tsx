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

  onItemSelect: (
    index: number,
    childIndex?: number,
  ) => void;

  onItemHover: (
    index: number | null,
    childIndex?: number | null,
  ) => void;

  onClose: () => void;

  radius: number;
  deadZone: number;

  showCenter: boolean;
  centerIcon?: string;
}

const START_ANGLE = -Math.PI / 2;

const DRAG_ACTIVATION_DISTANCE = 6;

const CLOSE_CORRIDOR_DELAY = 200;

/*
 * Distance from the parent item to the child ring.
 *
 * Example:
 *
 *                 ChatGPT
 *                    ●
 *
 *              Claude ● Gemini
 *
 *                    ●
 *                   AI
 *
 * The children are positioned relative to AI,
 * NOT relative to the wheel center.
 */
const NESTED_DISTANCE = 115;

/*
 * Maximum angular spread of the child ring.
 */
const MAX_CHILD_ARC = Math.PI * 0.9;

/*
 * Minimum angular spread.
 */
const MIN_CHILD_ARC = Math.PI * 0.45;

/*
 * Size used when checking whether the pointer
 * is close enough to a child item.
 */
const CHILD_HIT_RADIUS = 62;

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
  const wheelRef =
    useRef<HTMLDivElement>(null);

  const itemCount =
    items.length;

  const diameter =
    Math.max(radius * 2, 1);

  /*
   * Pointer press state.
   */
  const pressStateRef =
    useRef<{
      pointerId: number;
      startX: number;
      startY: number;
    } | null>(null);

  /*
   * Timer used to keep the submenu open while the
   * pointer travels from the parent to the child.
   */
  const closeTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const [mounted, setMounted] =
    useState(false);

  /*
   * activePath:
   *
   * []
   *
   * [ "ai-menu" ]
   *
   * [ "ai-menu", "ai-chatgpt" ]
   */
  const [activePath, setActivePath] =
    useState<string[]>([]);

  /*
   * Used for the closing animation.
   */
  const [closingChildPath, setClosingChildPath] =
    useState<string[] | null>(null);

  /*
   * Used by the drag guide.
   */
  const [pointerAngleDeg, setPointerAngleDeg] =
    useState<number | null>(null);

  const [isDragging, setIsDragging] =
    useState(false);

  /* ==========================================================
     MOUNT
     ========================================================== */

  useEffect(() => {
    const raf =
      requestAnimationFrame(() => {
        setMounted(true);
      });

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ==========================================================
     CLOSE TIMER
     ========================================================== */

  const cancelCloseTimer =
    useCallback(() => {
      if (closeTimerRef.current) {
        clearTimeout(
          closeTimerRef.current,
        );

        closeTimerRef.current =
          null;
      }
    }, []);

  const scheduleCloseTimer =
    useCallback(() => {
      cancelCloseTimer();

      closeTimerRef.current =
        setTimeout(() => {
          setActivePath((previous) => {
            if (previous.length > 0) {
              setClosingChildPath(
                previous,
              );

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

  /* ==========================================================
     SYNC EXTERNAL HOVER
     ========================================================== */

  useEffect(() => {
    if (
      externalHoveredIndex !== null &&
      externalHoveredIndex >= 0 &&
      externalHoveredIndex <
        items.length
    ) {
      const item =
        items[externalHoveredIndex];

      if (
        item &&
        activePath[0] !== item.id
      ) {
        cancelCloseTimer();

        setActivePath([
          item.id,
        ]);
      }

      return;
    }

    if (
      externalHoveredIndex === null &&
      activePath.length === 1
    ) {
      const activeItem =
        items.find(
          (item) =>
            item.id ===
            activePath[0],
        );

      if (
        !activeItem?.children?.length
      ) {
        setActivePath([]);
      }
    }
  }, [
    externalHoveredIndex,
    items,
    activePath,
    cancelCloseTimer,
  ]);

  /* ==========================================================
     ANGLE HELPERS
     ========================================================== */

  const segmentAngle =
    useMemo(() => {
      if (itemCount === 0) {
        return 0;
      }

      return (
        (Math.PI * 2) /
        itemCount
      );
    }, [itemCount]);

  const radiansToDegrees =
    useCallback(
      (radians: number) => {
        return (
          (radians * 180) /
          Math.PI
        );
      },
      [],
    );

  const normalizeAngle =
    useCallback(
      (angle: number) => {
        const twoPi =
          Math.PI * 2;

        angle %= twoPi;

        if (angle < 0) {
          angle += twoPi;
        }

        return angle;
      },
      [],
    );

  /* ==========================================================
     PRIMARY SECTORS
     ========================================================== */

  const sectors =
    useMemo(() => {
      if (itemCount === 0) {
        return [];
      }

      return items.map(
        (item, index) => {
          const startAngle =
            START_ANGLE +
            index *
              segmentAngle;

          const centerAngle =
            startAngle +
            segmentAngle / 2;

          return {
            item,
            index,
            centerAngle,
            centerAngleDeg:
              radiansToDegrees(
                centerAngle,
              ),
            startAngleDeg:
              radiansToDegrees(
                startAngle,
              ),
            endAngleDeg:
              radiansToDegrees(
                startAngle +
                  segmentAngle,
              ),
          };
        },
      );
    }, [
      items,
      itemCount,
      radiansToDegrees,
      segmentAngle,
    ]);

  /* ==========================================================
     ACTIVE PRIMARY ITEM
     ========================================================== */

  const activePrimaryId =
    activePath[0] ?? null;

  const activePrimaryIndex =
    useMemo(() => {
      if (!activePrimaryId) {
        return -1;
      }

      return items.findIndex(
        (item) =>
          item.id ===
          activePrimaryId,
      );
    }, [
      activePrimaryId,
      items,
    ]);

  const activeSector =
    activePrimaryIndex >= 0
      ? sectors[
          activePrimaryIndex
        ]
      : undefined;

  /* ==========================================================
     ACTIVE PARENT
     ========================================================== */

  const activeParentItem =
    useMemo(() => {
      if (!activePrimaryId) {
        return null;
      }

      return (
        items.find(
          (item) =>
            item.id ===
            activePrimaryId,
        ) ?? null
      );
    }, [
      activePrimaryId,
      items,
    ]);

  const activeChildren =
    useMemo(() => {
      return (
        activeParentItem?.children
          ?.filter(
            (child) =>
              child.enabled,
          ) ?? []
      );
    }, [
      activeParentItem,
    ]);

  const activeChildId =
    activePath[1] ?? null;

  /* ==========================================================
     NESTED CHILD GEOMETRY
     ==========================================================

     IMPORTANT FIX:

     The old implementation did:

         childX =
           cos(angle) * nestedRadius

         childY =
           sin(angle) * nestedRadius

     That means children were positioned relative
     to the wheel CENTER.

     We now do:

         parentX =
           cos(parentAngle) * itemDistance

         parentY =
           sin(parentAngle) * itemDistance

         childX =
           parentX +
           cos(childAngle) * nestedDistance

         childY =
           parentY +
           sin(childAngle) * nestedDistance

     Therefore:

                  CHILD
                    ●
                   /
                  /
                [AI]
                  ●

     The submenu belongs to AI.
     ========================================================== */

  const childSectors =
    useMemo(() => {
      if (
        !activeParentItem ||
        activeChildren.length === 0 ||
        !activeSector
      ) {
        return [];
      }

      /*
       * --------------------------------------------------------
       * Parent position
       * --------------------------------------------------------
       */

      const parentDistance =
        radius * 0.64;

      const parentX =
        Math.cos(
          activeSector.centerAngle,
        ) *
        parentDistance;

      const parentY =
        Math.sin(
          activeSector.centerAngle,
        ) *
        parentDistance;

      /*
       * --------------------------------------------------------
       * Child count
       * --------------------------------------------------------
       */

      const childCount =
        activeChildren.length;

      /*
       * More children = wider arc.
       *
       * For 3:
       *
       *       ●
       *
       *   ●       ●
       *
       *       AI
       */

      const arcSpread =
        Math.min(
          MAX_CHILD_ARC,
          Math.max(
            MIN_CHILD_ARC,
            childCount *
              (Math.PI / 6),
          ),
        );

      /*
       * IMPORTANT:
       *
       * The arc is centered on the SAME
       * direction as the parent.
       *
       * We deliberately do NOT perform
       * viewport flipping here.
       *
       * This prevents:
       *
       *       AI
       *       ↓
       *   children
       *
       * from suddenly becoming:
       *
       *   children
       *       ↑
       *       AI
       *
       * when the viewport boundary is reached.
       */

      const baseAngle =
        activeSector.centerAngle;

      const startAngle =
        baseAngle -
        arcSpread / 2;

      const stepAngle =
        childCount > 1
          ? arcSpread /
            (childCount - 1)
          : 0;

      return activeChildren.map(
        (child, index) => {
          const angle =
            childCount === 1
              ? baseAngle
              : startAngle +
                index *
                  stepAngle;

          /*
           * Child is positioned FROM AI.
           */

          const x =
            parentX +
            Math.cos(angle) *
              NESTED_DISTANCE;

          const y =
            parentY +
            Math.sin(angle) *
              NESTED_DISTANCE;

          return {
            child,
            index,
            angle,
            angleDeg:
              radiansToDegrees(
                angle,
              ),
            x,
            y,
          };
        },
      );
    }, [
      activeParentItem,
      activeChildren,
      activeSector,
      radius,
      radiansToDegrees,
    ]);

  /* ==========================================================
     POINTER -> PRIMARY SECTOR
     ========================================================== */

  const resolvePointer =
    useCallback(
      (
        clientX: number,
        clientY: number,
      ): {
        index: number | null;
        angleDeg: number | null;
        inDeadZone: boolean;
        outsideWheel: boolean;
      } => {
        const wheel =
          wheelRef.current;

        if (
          !wheel ||
          itemCount === 0 ||
          segmentAngle === 0
        ) {
          return {
            index: null,
            angleDeg: null,
            inDeadZone: false,
            outsideWheel: true,
          };
        }

        const rect =
          wheel.getBoundingClientRect();

        const centerX =
          rect.left +
          rect.width / 2;

        const centerY =
          rect.top +
          rect.height / 2;

        const dx =
          clientX - centerX;

        const dy =
          clientY - centerY;

        const distance =
          Math.sqrt(
            dx * dx +
              dy * dy,
          );

        const inDeadZone =
          distance <=
          deadZone;

        /*
         * Allow pointer to reach the nested ring.
         */
        const outsideWheel =
          distance >
          radius +
            NESTED_DISTANCE +
            80;

        let angle =
          Math.atan2(
            dy,
            dx,
          );

        angle -=
          START_ANGLE;

        angle =
          normalizeAngle(
            angle,
          );

        const angleDeg =
          radiansToDegrees(
            angle,
          );

        if (
          inDeadZone ||
          outsideWheel
        ) {
          return {
            index: null,
            angleDeg,
            inDeadZone,
            outsideWheel,
          };
        }

        const index =
          Math.floor(
            angle /
              segmentAngle,
          );

        if (
          index < 0 ||
          index >= itemCount
        ) {
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

  /* ==========================================================
     POINTER MOVE
     ========================================================== */

  const handlePointerMove =
    useCallback(
      (
        event: React.PointerEvent<HTMLDivElement>,
      ) => {
        const {
          index,
          angleDeg,
          outsideWheel,
          inDeadZone,
        } =
          resolvePointer(
            event.clientX,
            event.clientY,
          );

        /*
         * Drag detection.
         */

        if (
          pressStateRef.current
        ) {
          const {
            startX,
            startY,
          } =
            pressStateRef.current;

          const traveled =
            Math.hypot(
              event.clientX -
                startX,
              event.clientY -
                startY,
            );

          if (
            traveled >
            DRAG_ACTIVATION_DISTANCE
          ) {
            setIsDragging(true);
          }
        }

        setPointerAngleDeg(
          angleDeg,
        );

        /*
         * ------------------------------------------------------
         * CENTER / OUTSIDE
         * ------------------------------------------------------
         */

        if (
          outsideWheel ||
          inDeadZone
        ) {
          /*
           * If a parent with children is active,
           * keep submenu alive briefly so the pointer
           * can travel toward it.
           */

          if (
            activeParentItem?.children
              ?.length
          ) {
            scheduleCloseTimer();
          } else {
            setActivePath([]);

            onItemHover(null);
          }

          return;
        }

        const wheel =
          wheelRef.current;

        if (!wheel) {
          return;
        }

        const rect =
          wheel.getBoundingClientRect();

        const centerX =
          rect.left +
          rect.width / 2;

        const centerY =
          rect.top +
          rect.height / 2;

        const distance =
          Math.hypot(
            event.clientX -
              centerX,
            event.clientY -
              centerY,
          );

        /* ======================================================
           PRIMARY RING
           ====================================================== */

        if (
          distance <=
          radius + 25
        ) {
          cancelCloseTimer();

          if (
            index !== null &&
            items[index]?.enabled
          ) {
            const item =
              items[index];

            if (
              activePath[0] !==
              item.id
            ) {
              /*
               * Animate old submenu out.
               */

              if (
                activePath.length >
                1
              ) {
                setClosingChildPath(
                  activePath,
                );

                setTimeout(() => {
                  setClosingChildPath(
                    null,
                  );
                }, 160);
              }

              setActivePath([
                item.id,
              ]);
            }

            onItemHover(index);
          }

          return;
        }

        /* ======================================================
           NESTED RING
           ====================================================== */

        if (
          activeParentItem?.children
            ?.length
        ) {
          const isNearChild =
            childSectors.some(
              (childSector) => {
                const childX =
                  centerX +
                  childSector.x;

                const childY =
                  centerY +
                  childSector.y;

                return (
                  Math.hypot(
                    event.clientX -
                      childX,
                    event.clientY -
                      childY,
                  ) <=
                  CHILD_HIT_RADIUS
                );
              },
            );

          if (
            isNearChild
          ) {
            cancelCloseTimer();
          } else {
            scheduleCloseTimer();
          }
        }
      },
      [
        activeParentItem,
        activePath,
        cancelCloseTimer,
        childSectors,
        items,
        onItemHover,
        radius,
        resolvePointer,
        scheduleCloseTimer,
      ],
    );

  /* ==========================================================
     CHILD POINTER ENTER
     ========================================================== */

  const handleChildPointerEnter =
    useCallback(
      (
        childId: string,
        childIndex: number,
      ) => {
        cancelCloseTimer();

        if (
          activeParentItem
        ) {
          setActivePath([
            activeParentItem.id,
            childId,
          ]);

          onItemHover(
            activePrimaryIndex,
            childIndex,
          );
        }
      },
      [
        activeParentItem,
        activePrimaryIndex,
        cancelCloseTimer,
        onItemHover,
      ],
    );

  /* ==========================================================
     CHILD POINTER LEAVE
     ========================================================== */

  const handleChildPointerLeave =
    useCallback(() => {
      scheduleCloseTimer();
    }, [
      scheduleCloseTimer,
    ]);

  /* ==========================================================
     POINTER LEAVE
     ========================================================== */

  const handlePointerLeave =
    useCallback(() => {
      if (
        !pressStateRef.current
      ) {
        if (
          activeParentItem?.children
            ?.length
        ) {
          scheduleCloseTimer();
        } else {
          setActivePath([]);

          onItemHover(null);
        }

        setPointerAngleDeg(
          null,
        );
      }
    }, [
      activeParentItem,
      onItemHover,
      scheduleCloseTimer,
    ]);

  /* ==========================================================
     POINTER DOWN
     ========================================================== */

  const handlePointerDown =
    useCallback(
      (
        event: React.PointerEvent<HTMLDivElement>,
      ) => {
        if (
          event.button !== 0
        ) {
          return;
        }

        event.currentTarget.setPointerCapture(
          event.pointerId,
        );

        pressStateRef.current = {
          pointerId:
            event.pointerId,
          startX:
            event.clientX,
          startY:
            event.clientY,
        };

        setIsDragging(false);

        const { index } =
          resolvePointer(
            event.clientX,
            event.clientY,
          );

        if (
          index !== null &&
          items[index]?.enabled
        ) {
          setActivePath([
            items[index].id,
          ]);

          onItemHover(index);
        }
      },
      [
        items,
        onItemHover,
        resolvePointer,
      ],
    );

  /* ==========================================================
     POINTER UP
     ========================================================== */

  const handlePointerUp =
    useCallback(
      (
        event: React.PointerEvent<HTMLDivElement>,
      ) => {
        const pressState =
          pressStateRef.current;

        if (
          !pressState ||
          pressState.pointerId !==
            event.pointerId
        ) {
          return;
        }

        pressStateRef.current =
          null;

        setIsDragging(false);

        setPointerAngleDeg(
          null,
        );

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
        } =
          resolvePointer(
            event.clientX,
            event.clientY,
          );

        /* ------------------------------------------------------
           Outside
           ------------------------------------------------------ */

        if (outsideWheel) {
          if (!activeChildId) {
            onItemHover(null);

            setActivePath([]);
          }

          return;
        }

        /* ------------------------------------------------------
           Center
           ------------------------------------------------------ */

        if (inDeadZone) {
          onClose();

          return;
        }

        /* ------------------------------------------------------
           Child
           ------------------------------------------------------ */

        if (
          activeChildId &&
          activeParentItem
        ) {
          const childIndex =
            activeChildren.findIndex(
              (child) =>
                child.id ===
                activeChildId,
            );

          if (
            childIndex >= 0
          ) {
            onItemSelect(
              activePrimaryIndex,
              childIndex,
            );

            return;
          }
        }

        /* ------------------------------------------------------
           Primary
           ------------------------------------------------------ */

        if (index === null) {
          return;
        }

        const item =
          items[index];

        if (
          !item?.enabled
        ) {
          return;
        }

        /*
         * Parent with children:
         * keep it open.
         */

        if (
          item.children &&
          item.children.length >
            0
        ) {
          setActivePath([
            item.id,
          ]);

          return;
        }

        /*
         * Normal item.
         */

        onItemSelect(index);
      },
      [
        activeChildId,
        activeChildren,
        activeParentItem,
        activePrimaryIndex,
        items,
        onClose,
        onItemSelect,
        onItemHover,
        resolvePointer,
      ],
    );

  /* ==========================================================
     POINTER CANCEL
     ========================================================== */

  const handlePointerCancel =
    useCallback(() => {
      pressStateRef.current =
        null;

      setIsDragging(false);

      setPointerAngleDeg(
        null,
      );

      setActivePath([]);

      onItemHover(null);
    }, [
      onItemHover,
    ]);

  /* ==========================================================
     KEYBOARD NAVIGATION
     ========================================================== */

  useEffect(() => {
    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (
          event.key ===
          "Escape"
        ) {
          event.preventDefault();

          onClose();

          return;
        }

        if (
          itemCount === 0
        ) {
          return;
        }

        /* ----------------------------------------------------
           Next
           ---------------------------------------------------- */

        if (
          event.key ===
            "ArrowRight" ||
          event.key ===
            "ArrowDown"
        ) {
          event.preventDefault();

          let next =
            activePrimaryIndex <
            0
              ? 0
              : (
                  activePrimaryIndex +
                  1
                ) % itemCount;

          for (
            let i = 0;
            i < itemCount;
            i++
          ) {
            if (
              items[next]?.enabled
            ) {
              setActivePath([
                items[next].id,
              ]);

              onItemHover(
                next,
              );

              return;
            }

            next =
              (next + 1) %
              itemCount;
          }

          return;
        }

        /* ----------------------------------------------------
           Previous
           ---------------------------------------------------- */

        if (
          event.key ===
            "ArrowLeft" ||
          event.key ===
            "ArrowUp"
        ) {
          event.preventDefault();

          let previous =
            activePrimaryIndex <
            0
              ? itemCount - 1
              : (
                  activePrimaryIndex -
                  1 +
                  itemCount
                ) % itemCount;

          for (
            let i = 0;
            i < itemCount;
            i++
          ) {
            if (
              items[previous]
                ?.enabled
            ) {
              setActivePath([
                items[previous].id,
              ]);

              onItemHover(
                previous,
              );

              return;
            }

            previous =
              (previous - 1 +
                itemCount) %
              itemCount;
          }

          return;
        }

        /* ----------------------------------------------------
           Enter / Space
           ---------------------------------------------------- */

        if (
          event.key ===
            "Enter" ||
          event.key ===
            " "
        ) {
          if (
            activePrimaryIndex <
            0
          ) {
            return;
          }

          const item =
            items[
              activePrimaryIndex
            ];

          if (
            !item?.enabled
          ) {
            return;
          }

          event.preventDefault();

          if (
            activeChildId
          ) {
            const childIndex =
              activeChildren.findIndex(
                (child) =>
                  child.id ===
                  activeChildId,
              );

            if (
              childIndex >= 0
            ) {
              onItemSelect(
                activePrimaryIndex,
                childIndex,
              );

              return;
            }
          }

          if (
            item.children &&
            item.children.length >
              0
          ) {
            setActivePath([
              item.id,
            ]);

            return;
          }

          onItemSelect(
            activePrimaryIndex,
          );
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
    activeChildId,
    activeChildren,
    activePrimaryIndex,
    itemCount,
    items,
    onClose,
    onItemHover,
    onItemSelect,
  ]);

  /* ==========================================================
     AUTO FOCUS
     ========================================================== */

  useEffect(() => {
    wheelRef.current?.focus();
  }, []);

  /* ==========================================================
     WEDGE
     ========================================================== */

  const wedgePath =
    useMemo(() => {
      if (!activeSector) {
        return null;
      }

      const cx = radius;

      const cy = radius;

      const outer =
        radius - 4;

      const inner =
        deadZone + 4;

      const toRad =
        (deg: number) =>
          (deg * Math.PI) /
          180;

      const point =
        (
          r: number,
          deg: number,
        ) => ({
          x:
            cx +
            r *
              Math.cos(
                toRad(deg),
              ),
          y:
            cy +
            r *
              Math.sin(
                toRad(deg),
              ),
        });

      const inset =
        Math.min(
          2,
          (
            activeSector.endAngleDeg -
            activeSector.startAngleDeg
          ) * 0.06,
        );

      const startDeg =
        activeSector.startAngleDeg +
        inset;

      const endDeg =
        activeSector.endAngleDeg -
        inset;

      const p1 =
        point(
          inner,
          startDeg,
        );

      const p2 =
        point(
          outer,
          startDeg,
        );

      const p3 =
        point(
          outer,
          endDeg,
        );

      const p4 =
        point(
          inner,
          endDeg,
        );

      const largeArc =
        endDeg -
          startDeg >
        180
          ? 1
          : 0;

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

  /* ==========================================================
     CLASS NAME
     ========================================================== */

  const wheelClassName =
    [
      "radial-wheel",
      mounted
        ? "is-mounted"
        : "",
      isDragging
        ? "is-dragging"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  const activeDescendantId =
    activePrimaryIndex >= 0 &&
    items[activePrimaryIndex]
      ? `wheel-sector-${items[activePrimaryIndex].id}`
      : undefined;

  /* ==========================================================
     CONNECTION LINES
     ==========================================================

     The connection now starts near the actual AI item
     and travels toward each child.

     This makes the nested menu visually attached to AI.
     ========================================================== */

  const visualConnections =
    useMemo(() => {
      if (
        !activeSector ||
        childSectors.length === 0
      ) {
        return null;
      }

      const parentDistance =
        radius * 0.64;

      const parentX =
        radius +
        Math.cos(
          activeSector.centerAngle,
        ) *
          parentDistance;

      const parentY =
        radius +
        Math.sin(
          activeSector.centerAngle,
        ) *
          parentDistance;

      return childSectors.map(
        ({
          child,
          x,
          y,
        }) => {
          const childX =
            radius + x;

          const childY =
            radius + y;

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
        },
      );
    }, [
      activeSector,
      childSectors,
      radius,
    ]);

  /* ==========================================================
     EMPTY STATE
     ========================================================== */

  if (
    itemCount === 0
  ) {
    return (
      <div
        ref={wheelRef}
        className={
          wheelClassName
        }
        role="dialog"
        aria-modal="true"
        aria-label="Orbit radial menu"
        tabIndex={0}
        style={{
          width: diameter,
          height: diameter,
        }}
      >
        <div
          className="wheel-background"
        />

        {showCenter && (
          <button
            type="button"
            className="wheel-center"
            aria-label="Close wheel"
            onClick={
              onClose
            }
            style={{
              width:
                deadZone * 2,
              height:
                deadZone * 2,
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

  /* ==========================================================
     CHILD RENDER STATE
     ========================================================== */

  const renderingChildren =
    childSectors.length >
    0;

  const isClosingChildren =
    closingChildPath !==
      null &&
    !renderingChildren;

  /* ==========================================================
     MAIN RENDER
     ========================================================== */

  return (
    <div
      ref={wheelRef}
      className={
        wheelClassName
      }
      role="dialog"
      aria-modal="true"
      aria-label="Orbit radial menu"
      aria-activedescendant={
        activeDescendantId
      }
      tabIndex={0}
      onPointerMove={
        handlePointerMove
      }
      onPointerLeave={
        handlePointerLeave
      }
      onPointerDown={
        handlePointerDown
      }
      onPointerUp={
        handlePointerUp
      }
      onPointerCancel={
        handlePointerCancel
      }
      onContextMenu={(
        event,
      ) =>
        event.preventDefault()
      }
      style={{
        width: diameter,
        height: diameter,

        touchAction: "none",

        /*
         * These CSS variables are used by
         * RadialWheel.css.
         */

        ["--wheel-radius" as string]:
          `${radius}px`,

        ["--nested-wheel-radius" as string]:
          `${NESTED_DISTANCE}px`,

        ["--wheel-dead-zone" as string]:
          `${deadZone}px`,

        ["--wheel-item-count" as string]:
          itemCount,

        ["--wheel-segment-angle" as string]:
          `${360 / itemCount}deg`,
      }}
    >
      {/* =====================================================
          MAIN BACKGROUND
          ===================================================== */}

      <div
        className="wheel-background"
        aria-hidden="true"
      />

      {/* =====================================================
          OUTER RING
          ===================================================== */}

      <div
        className="wheel-ring wheel-ring-outer"
        aria-hidden="true"
      />

      {/* =====================================================
          ACTIVE WEDGE + CONNECTIONS
          ===================================================== */}

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
              activePrimaryId
                ? "wheel-wedge is-hovered"
                : "wheel-wedge is-selected"
            }
            d={wedgePath}
          />

          {visualConnections}
        </svg>
      )}

      {/* =====================================================
          DRAG GUIDE
          ===================================================== */}

      {isDragging &&
        pointerAngleDeg !==
          null && (
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

      {/* =====================================================
          PRIMARY SECTORS
          ===================================================== */}

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
              selectedIndex ===
              index;

            const isActive =
              activePrimaryId ===
              item.id;

            const isDisabled =
              !item.enabled;

            const hasChildren =
              Boolean(
                item.children &&
                  item.children
                    .length >
                    0,
              );

            const childrenOpen =
              isActive &&
              hasChildren;

            const itemDistance =
              radius * 0.64;

            const angleRad =
              (centerAngleDeg *
                Math.PI) /
              180;

            const x =
              Math.cos(
                angleRad,
              ) *
              itemDistance;

            const y =
              Math.sin(
                angleRad,
              ) *
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

                  isActive
                    ? "hovered"
                    : "",

                  isDisabled
                    ? "disabled"
                    : "",

                  hasChildren
                    ? "has-children"
                    : "",

                  childrenOpen
                    ? "children-open"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={
                  isDisabled
                }
                aria-label={
                  item.name
                }
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

                  ["--item-x" as string]:
                    `${x}px`,

                  ["--item-y" as string]:
                    `${y}px`,

                  ["--sector-angle" as string]:
                    `${360 / itemCount}deg`,

                  ["--sector-index" as string]:
                    index,

                  ["--sector-center-angle" as string]:
                    `${centerAngleDeg}deg`,

                  ["--stagger-delay" as string]:
                    `${index * 45}ms`,

                  ["--hover-scale" as string]:
                    isActive
                      ? "1.08"
                      : "1",
                }}
                onClick={(
                  event,
                ) => {
                  /*
                   * Keyboard-triggered click.
                   */

                  if (
                    event.detail ===
                      0 &&
                    item.enabled
                  ) {
                    if (
                      hasChildren
                    ) {
                      setActivePath(
                        [item.id],
                      );
                    } else {
                      onItemSelect(
                        index,
                      );
                    }
                  }
                }}
              >
                <span className="sector-content">
                  {/* ICON */}

                  <span className="sector-icon">
                    {item.icon ? (
                      <img
                        src={
                          item.icon
                        }
                        alt=""
                        draggable={
                          false
                        }
                        onError={(
                          event,
                        ) => {
                          event.currentTarget.style.display =
                            "none";

                          const fallback =
                            event
                              .currentTarget
                              .nextElementSibling;

                          if (
                            fallback instanceof
                            HTMLElement
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
                        display:
                          item.icon
                            ? "none"
                            : "flex",
                      }}
                    >
                      {item.name
                        ?.charAt(
                          0,
                        )
                        ?.toUpperCase()}
                    </span>
                  </span>

                  {/* LABEL */}

                  <span className="sector-label">
                    {item.name}

                    {hasChildren && (
                      <span className="sector-indicator">
                        ✦
                      </span>
                    )}
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

      {/* =====================================================
          NESTED WHEEL
          ===================================================== */}

      {(renderingChildren ||
        isClosingChildren) && (
        <div
          className={[
            "nested-wheel",

            isClosingChildren
              ? "is-closing"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="menu"
          aria-label="Submenu"
        >
          {childSectors.map(
            ({
              child,
              index,
              x,
              y,
            }) => {
              const isChildActive =
                activeChildId ===
                child.id;

              const isChildDisabled =
                !child.enabled;

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
                  onPointerEnter={() =>
                    handleChildPointerEnter(
                      child.id,
                      index,
                    )
                  }
                  onPointerLeave={
                    handleChildPointerLeave
                  }
                  onPointerDown={(event) => {
                    /*
                    * IMPORTANT:
                    *
                    * The parent radial wheel uses pointer capture.
                    * Therefore relying on onClick for nested items
                    * is unreliable.
                    *
                    * Handle the child selection immediately on
                    * pointer-down instead.
                    */
                    event.preventDefault();
                    event.stopPropagation();

                    if (
                      isChildDisabled ||
                      activePrimaryIndex < 0
                    ) {
                      return;
                    }

                    console.log(
                      "[Orbit] Nested item selected:",
                      child.name,
                    );

                    onItemSelect(
                      activePrimaryIndex,
                      index,
                    );
                  }}
                  style={{
                    left: "50%",
                    top: "50%",

                    ["--item-x" as string]:
                      `${x}px`,

                    ["--item-y" as string]:
                      `${y}px`,

                    ["--nested-stagger-delay" as string]:
                      `${index * 55}ms`,

                    ["--hover-scale" as string]:
                      isChildActive
                        ? "1.1"
                        : "1",
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
                          display: child.icon
                            ? "none"
                            : "flex",
                        }}
                      >
                        {child.name
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </span>
                    </span>

                    <span className="sector-label">
                      {child.name}
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
      )}

      {/* =====================================================
          INNER RING
          ===================================================== */}

      <div
        className="wheel-ring wheel-ring-inner"
        aria-hidden="true"
        style={{
          width:
            deadZone * 2,
          height:
            deadZone * 2,
        }}
      />

      {/* =====================================================
          CENTER BUTTON
          ===================================================== */}

      {showCenter && (
        <button
          type="button"
          className="wheel-center"
          aria-label="Close wheel"
          onClick={onClose}
          style={{
            width:
              deadZone * 2,
            height:
              deadZone * 2,
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

      {/* =====================================================
          ACCESSIBILITY
          ===================================================== */}

      <span
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {activeParentItem
          ? activeParentItem.name
          : ""}
      </span>
    </div>
  );
};