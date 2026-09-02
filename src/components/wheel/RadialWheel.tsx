import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PointerEvent as ReactPointerEvent,
} from "react";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Action } from "../../types/types";
import type { RadialWheelProps } from "./types";
import "./RadialWheel.css";

/* ================================================================
   CONSTANTS
================================================================ */

const START_ANGLE = -90;

const DEFAULT_RADIUS = 180;
const DEFAULT_ITEM_SIZE = 76;
const DEFAULT_ICON_SIZE = 30;

/*
 * Main wheel inner radius.
 */
const INNER_RADIUS = 78;

/*
 * Main wheel has no additional outer arc.
 */
const OUTER_ARC_THICKNESS = 0;

/*
 * Distance between the main wheel and child wheel.
 *
 * Keep this small so children remain visually connected
 * to their parent.
 */
const NESTED_RING_GAP = 18;

/*
 * Radial thickness of child sectors.
 */
const NESTED_SECTOR_THICKNESS = 88;

/*
 * Gap between root sectors.
 */
const SECTOR_GAP = 2;

/*
 * Very small angular gap between child sectors.
 */
const CHILD_SECTOR_GAP = 1;

/*
 * Maximum total spread of children.
 */
const MAX_CHILD_FAN_ANGLE = 58;

/*
 * Size of the child content container.
 */
const CHILD_CONTENT_SIZE = 70;

/* ================================================================
   ICON RESOLVER
================================================================ */

/*
 * Convert any common icon naming format into a normalized name.
 *
 * Examples:
 *
 * "Search"       -> "search"
 * "search"       -> "search"
 * "search-icon"  -> "searchicon"
 * "Code2"        -> "code2"
 * "code-2"       -> "code2"
 * "lucide:search" -> "search"
 */
const normalizeIconName = (
  value: unknown
): string => {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(
      /^lucide[:/-]?/i,
      ""
    )
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .toLowerCase();
};

/*
 * Convert a normalized icon name to PascalCase.
 *
 * Since separators are already removed, this mainly
 * capitalizes the first character.
 */
const toPascalCase = (
  value: string
): string => {
  if (!value) {
    return "";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
};

/*
 * Remove Icon suffix.
 *
 * Example:
 *
 * SearchIcon -> Search
 */
const removeIconSuffix = (
  value: string
): string => {
  if (
    value.endsWith("Icon")
  ) {
    return value.slice(
      0,
      -4
    );
  }

  return value;
};

/*
 * IMPORTANT:
 *
 * Lucide exports are not necessarily plain functions.
 * Many are ForwardRefExoticComponent objects.
 *
 * Therefore we cast the whole Lucide namespace once
 * instead of checking typeof candidate === "function".
 *
 * This also fixes TS2352.
 */
const lucideIconRegistry =
  LucideIcons as unknown as Record<
    string,
    LucideIcon
  >;

/*
 * Resolve icon from string.
 */
const resolveIcon = (
  value: unknown
): LucideIcon => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return LucideIcons.Circle;
  }

  const normalized =
    normalizeIconName(value);

  if (!normalized) {
    return LucideIcons.Circle;
  }

  const pascal =
    toPascalCase(
      normalized
    );

  const withoutIcon =
    removeIconSuffix(
      pascal
    );

  /*
   * Try a few possible names.
   */
  const candidates = [
    pascal,
    withoutIcon,
  ];

  for (
    const name of candidates
  ) {
    const icon =
      lucideIconRegistry[
        name
      ];

    if (icon) {
      return icon;
    }
  }

  /* Match every Lucide export, including names such as SkipForward. */
  const normalizedMatch = Object.entries(
    lucideIconRegistry
  ).find(([name]) => {
    const normalizedName = normalizeIconName(name);
    return (
      normalizedName === normalized ||
      normalizedName.replace(/icon$/, "") === normalized
    );
  })?.[1];

  if (normalizedMatch) {
    return normalizedMatch;
  }

  /*
   * Proper graphical fallback.
   *
   * Never render a text bullet.
   */
  return LucideIcons.Circle;
};

/*
 * Render resolved Lucide icon.
 */
const renderIcon = (
  icon: unknown,
  className: string,
  strokeWidth = 2
) => {
  const Icon =
    resolveIcon(icon);

  return (
    <Icon
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    />
  );
};

/* ================================================================
   HELPERS
================================================================ */

const getEnabledItems = (
  page:
    | {
        items?: Action[];
      }
    | undefined
) => {
  return (
    page?.items ?? []
  ).filter(
    (item) =>
      item.enabled
  );
};

/* ================================================================
   POLAR COORDINATES
================================================================ */

const polarToCartesian = (
  cx: number,
  cy: number,
  radius: number,
  angle: number
) => {
  const radians =
    (angle * Math.PI) /
    180;

  return {
    x:
      cx +
      radius *
        Math.cos(radians),

    y:
      cy +
      radius *
        Math.sin(radians),
  };
};

/* ================================================================
   SECTOR PATH
================================================================ */

const createSectorPath = (
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  const outerStart =
    polarToCartesian(
      cx,
      cy,
      outerRadius,
      startAngle
    );

  const outerEnd =
    polarToCartesian(
      cx,
      cy,
      outerRadius,
      endAngle
    );

  const innerStart =
    polarToCartesian(
      cx,
      cy,
      innerRadius,
      startAngle
    );

  const innerEnd =
    polarToCartesian(
      cx,
      cy,
      innerRadius,
      endAngle
    );

  const largeArcFlag =
    endAngle -
      startAngle >
    180
      ? 1
      : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,

    `A ${outerRadius} ${outerRadius}
      0 ${largeArcFlag} 1
      ${outerEnd.x} ${outerEnd.y}`,

    `L ${innerEnd.x} ${innerEnd.y}`,

    `A ${innerRadius} ${innerRadius}
      0 ${largeArcFlag} 0
      ${innerStart.x} ${innerStart.y}`,

    "Z",
  ].join(" ");
};

/* ================================================================
   COMPONENT
================================================================ */

export const RadialWheel: FC<
  RadialWheelProps
> = ({
  pages,
  currentPageId,
  config,
  onPageChange,
  onItemSelect,
  onItemHover,
  onClose,
}) => {
  /* ==============================================================
     STATE
  ============================================================== */

  const wheelRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    mounted,
    setMounted,
  ] = useState(false);

  const [
    activeRootId,
    setActiveRootId,
  ] = useState<
    string | null
  >(null);

  const [
    activeChildIndex,
    setActiveChildIndex,
  ] = useState<
    number | null
  >(null);

  const [
    pageDragX,
    setPageDragX,
  ] = useState(0);

  const [
    isPageDragging,
    setIsPageDragging,
  ] = useState(false);

  const [
    isMusicPlaying,
    setIsMusicPlaying,
  ] = useState(false);

  const pagePointerStartX =
    useRef<
      number | null
    >(null);

  /* ==============================================================
     MOUNT
  ============================================================== */

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(
        () => {
          setMounted(true);
        }
      );

    return () =>
      window.cancelAnimationFrame(
        frame
      );
  }, []);

  /* ==============================================================
     ENABLED PAGES
  ============================================================== */

  const enabledPages =
    useMemo(
      () =>
        pages.filter(
          (page) =>
            page.enabled
        ),
      [pages]
    );

  const currentPage =
    useMemo(
      () =>
        enabledPages.find(
          (page) =>
            page.id ===
            currentPageId
        ) ??
        enabledPages[0] ??
        pages[0],
      [
        enabledPages,
        currentPageId,
        pages,
      ]
    );

  /* ==============================================================
     ENABLED ROOT ITEMS
  ============================================================== */

  const enabledItems =
    useMemo(
      () =>
        getEnabledItems(
          currentPage
        ),
      [currentPage]
    );

  /* ==============================================================
     DIMENSIONS
  ============================================================== */

  const radius =
    config.radius ??
    DEFAULT_RADIUS;

  const itemSize =
    config.itemSize ??
    DEFAULT_ITEM_SIZE;

  const iconSize =
    config.iconSize ??
    DEFAULT_ICON_SIZE;

  const outerRadius =
    radius;

  const innerRadius =
    Math.min(
      INNER_RADIUS,
      outerRadius - 40
    );

  /*
   * Child ring starts just outside
   * the main wheel.
   */
  const childRingInnerRadius =
    outerRadius +
    OUTER_ARC_THICKNESS +
    NESTED_RING_GAP;

  /*
   * Child ring outer boundary.
   */
  const childRingOuterRadius =
    childRingInnerRadius +
    NESTED_SECTOR_THICKNESS;

  /*
   * Give the SVG enough room for
   * the child ring.
   */
  const svgPadding =
    Math.max(
      itemSize,
      CHILD_CONTENT_SIZE,
      72
    );

  const svgRadius =
    childRingOuterRadius +
    svgPadding;

  const svgSize =
    svgRadius * 2;

  const center =
    svgSize / 2;

  /* ==============================================================
     ROOT SECTOR ANGLE
  ============================================================== */

  const sectorAngle =
    enabledItems.length > 0
      ? 360 /
        enabledItems.length
      : 0;

  /* ==============================================================
     ROOT CONTENT RADIUS
  ============================================================== */

  const rootContentRadius =
    (
      innerRadius +
      outerRadius
    ) / 2;

  /* ==============================================================
     ROOT POSITIONS
  ============================================================== */

  const rootPositions =
    useMemo(() => {
      return enabledItems.map(
        (
          item,
          index
        ) => {
          const angle =
            START_ANGLE +
            index *
              sectorAngle +
            sectorAngle / 2;

          const position =
            polarToCartesian(
              center,
              center,
              rootContentRadius,
              angle
            );

          return {
            item,
            index,
            angle,
            x: position.x,
            y: position.y,
          };
        }
      );
    }, [
      enabledItems,
      sectorAngle,
      center,
      rootContentRadius,
    ]);

  /* ==============================================================
     ACTIVE ROOT
  ============================================================== */

  const activeParent =
    useMemo(() => {
      if (!activeRootId) {
        return null;
      }

      return (
        enabledItems.find(
          (item) =>
            item.id ===
            activeRootId
        ) ?? null
      );
    }, [
      activeRootId,
      enabledItems,
    ]);

  /* ==============================================================
     ACTIVE CHILDREN
  ============================================================== */

  const activeChildren =
    useMemo(() => {
      return (
        activeParent?.children?.filter(
          (child) =>
            child.enabled
        ) ?? []
      );
    }, [
      activeParent,
    ]);

  /* ==============================================================
     CHILD GEOMETRY
  ============================================================== */

  const nestedChildren =
    useMemo(() => {
      if (
        !activeParent ||
        activeChildren.length ===
          0
      ) {
        return [];
      }

      const parentIndex =
        enabledItems.findIndex(
          (item) =>
            item.id ===
            activeParent.id
        );

      if (
        parentIndex < 0
      ) {
        return [];
      }

      /*
       * ----------------------------------------------------------
       * PARENT CENTER ANGLE
       * ----------------------------------------------------------
       */

      const parentAngle =
        START_ANGLE +
        parentIndex *
          sectorAngle +
        sectorAngle / 2;

      const childCount =
        activeChildren.length;

      /*
       * ----------------------------------------------------------
       * CHILD FAN
       * ----------------------------------------------------------
       *
       * The old implementation allowed children to spread
       * much too far around the wheel.
       *
       * This version deliberately keeps the children close
       * to their parent.
       *
       * 1 child:
       *      parent
       *        |
       *      child
       *
       * 2 children:
       *
       *        child
       *          \
       *          parent
       *          /
       *        child
       *
       * 3 children:
       *
       *       child
       *          \
       *       child
       *          /
       *       child
       */

      let fanAngle = 0;

      if (childCount === 1) {
        // One child stays directly aligned with the parent.
        fanAngle = 0;
      } else if (childCount === 2) {
        // Keep the two-child layout tight.
        fanAngle = 34;
      } else if (childCount === 3) {
        // Give three children a little more breathing room.
        fanAngle = 58;
      } else if (childCount === 4) {
        // Four children need a noticeably wider fan.
        fanAngle = 82;
      } else if (childCount === 5) {
        fanAngle = 96;
      } else if (childCount === 6) {
        fanAngle = 108;
      } else {
        // More children: progressively widen, but keep it controlled.
        fanAngle = Math.min(
          120,
          108 + (childCount - 6) * 6
        );
      }

/*
 * Don't allow the children to spread completely
 * around the wheel.
 */
fanAngle = Math.min(
  fanAngle,
  MAX_CHILD_FAN_ANGLE > 82
    ? MAX_CHILD_FAN_ANGLE
    : 120
);

      /*
       * Distance between child centers.
       */
      const childStep =
        childCount <= 1
          ? 0
          : fanAngle /
            (childCount - 1);

      /*
       * Start angle of the child fan.
       */
      const fanStartAngle =
        parentAngle -
        fanAngle / 2;

      /*
       * ----------------------------------------------------------
       * CHILD SECTOR RADII
       * ----------------------------------------------------------
       */

      const childSectorInnerRadius =
        outerRadius +
        OUTER_ARC_THICKNESS +
        NESTED_RING_GAP;

      const childSectorOuterRadius =
        childSectorInnerRadius +
        NESTED_SECTOR_THICKNESS;

      /*
       * Put icon exactly in radial center.
       */
      const contentRadius =
        (
          childSectorInnerRadius +
          childSectorOuterRadius
        ) / 2;

      return activeChildren.map(
        (
          child,
          index
        ) => {
          /*
           * One child stays exactly
           * on the parent's center line.
           */
          const angle =
            childCount === 1
              ? parentAngle
              : fanStartAngle +
                index *
                  childStep;

          /*
           * Exact center point of this
           * child sector.
           */
          const position =
            polarToCartesian(
              center,
              center,
              contentRadius,
              angle
            );

          /*
           * ------------------------------------------------------
           * SECTOR WIDTH
           * ------------------------------------------------------
           *
           * For two children:
           *
           * center 1 ---- center 2
           *
           * each sector extends almost halfway
           * toward the other.
           *
           * This removes the large empty gap.
           */

          let sectorHalfAngle: number;

          if (
            childCount === 1
          ) {
            sectorHalfAngle =
              Math.min(
                24,
                sectorAngle *
                  0.35
              );
          } else {
            sectorHalfAngle =
              Math.max(
                10,
                childStep / 2 -
                  CHILD_SECTOR_GAP
              );
          }

          return {
            child,
            index,
            angle,

            startAngle:
              angle -
              sectorHalfAngle,

            endAngle:
              angle +
              sectorHalfAngle,

            /*
             * IMPORTANT:
             *
             * These are the actual center
             * coordinates of the child sector.
             */
            x: position.x,
            y: position.y,

            innerRadius:
              childSectorInnerRadius,

            outerRadius:
              childSectorOuterRadius,
          };
        }
      );
    }, [
      activeParent,
      activeChildren,
      enabledItems,
      sectorAngle,
      center,
      outerRadius,
    ]);

  /* ==============================================================
     PAGE NAVIGATION
  ============================================================== */

  const pageIndex =
    enabledPages.findIndex(
      (page) =>
        page.id ===
        currentPage?.id
    );

  const previousPageId =
    enabledPages.length > 0
      ? enabledPages[
          (
            pageIndex -
            1 +
            enabledPages.length
          ) %
            enabledPages.length
        ]?.id
      : undefined;

  const nextPageId =
    enabledPages.length > 0
      ? enabledPages[
          (
            pageIndex +
            1
          ) %
            enabledPages.length
        ]?.id
      : undefined;

  /* ==============================================================
     ROOT HOVER
  ============================================================== */

  const activateRoot = (
    item: Action,
    index: number
  ) => {
    setActiveRootId(
      item.id
    );

    setActiveChildIndex(
      null
    );

    onItemHover(
      index,
      null
    );
  };

  const deactivateRoot =
    () => {
      /*
       * Do not close the child ring here.
       *
       * The pointer needs to be able to travel
       * from the parent sector to the child sector.
       */
      onItemHover(
        null,
        null
      );
    };

  /* ==============================================================
     ROOT CLICK
  ============================================================== */

  const handleRootClick = (
    item: Action,
    index: number
  ) => {
    if (
      currentPage?.type === "music" &&
      item.type === "media" &&
      item.target === "playpause"
    ) {
      setIsMusicPlaying((playing) => !playing);
    }

    /*
     * If this item has children,
     * open/close its child ring.
     */
    if (
      item.children &&
      item.children.length > 0
    ) {
      setActiveRootId(
        (previous) =>
          previous ===
          item.id
            ? null
            : item.id
      );

      setActiveChildIndex(
        null
      );

      return;
    }

    /*
     * Normal root item.
     */
    onItemSelect(
      index,
      undefined,
      item
    );
  };

  /* ==============================================================
     CHILD CLICK
  ============================================================== */

  const handleChildClick = (
    parentIndex: number,
    childIndex: number,
    child: Action
  ) => {
    setActiveChildIndex(
      childIndex
    );

    onItemSelect(
      parentIndex,
      childIndex,
      child
    );
  };

  /* ==============================================================
     ICON SIZE
  ============================================================== */

  const iconClass =
    iconSize >= 40
      ? "h-10 w-10"
      : iconSize >= 32
        ? "h-8 w-8"
        : iconSize >= 24
          ? "h-6 w-6"
          : "h-5 w-5";

  /* ==============================================================
     CENTER PAGE DRAG
  ============================================================== */

  const handleCenterPointerDown =
    (
      event: ReactPointerEvent<SVGCircleElement>
    ) => {
      pagePointerStartX.current =
        event.clientX;

      setIsPageDragging(
        true
      );

      setPageDragX(0);

      event.currentTarget.setPointerCapture(
        event.pointerId
      );
    };

  const handleCenterPointerMove =
    (
      event: ReactPointerEvent<SVGCircleElement>
    ) => {
      if (
        pagePointerStartX.current ===
        null
      ) {
        return;
      }

      const rawDelta =
        event.clientX -
        pagePointerStartX.current;

      /*
       * Add resistance to dragging.
       */
      const resistedDelta =
        rawDelta * 0.55;

      const clampedDelta =
        Math.max(
          -42,
          Math.min(
            42,
            resistedDelta
          )
        );

      setPageDragX(
        clampedDelta
      );
    };

  const handleCenterPointerUp =
    (
      event: ReactPointerEvent<SVGCircleElement>
    ) => {
      if (
        pagePointerStartX.current ===
        null
      ) {
        return;
      }

      const delta =
        event.clientX -
        pagePointerStartX.current;

      const threshold =
        45;

      /*
       * Drag left -> next page.
       */
      if (
        delta <
          -threshold &&
        nextPageId
      ) {
        onPageChange(
          nextPageId
        );
      }

      /*
       * Drag right -> previous page.
       */
      if (
        delta >
          threshold &&
        previousPageId
      ) {
        onPageChange(
          previousPageId
        );
      }

      pagePointerStartX.current =
        null;

      setPageDragX(0);

      setIsPageDragging(
        false
      );

      try {
        event.currentTarget.releasePointerCapture(
          event.pointerId
        );
      } catch {
        /*
         * Pointer capture may already
         * have been released.
         */
      }
    };

  const handleCenterPointerCancel =
    () => {
      pagePointerStartX.current =
        null;

      setPageDragX(0);

      setIsPageDragging(
        false
      );
    };

  /* ==============================================================
     ROOT BUTTON SIZE
  ============================================================== */

  const rootButtonWidth =
    Math.max(
      74,
      itemSize
    );

  const rootButtonHeight =
    Math.max(
      64,
      itemSize
    );

  /* ==============================================================
     OUTSIDE CLICK
  ============================================================== */

  useEffect(() => {
    const isAngleInRange = (
      angle: number,
      startAngle: number,
      endAngle: number
    ) => {
      const normalize = (value: number) =>
        ((value % 360) + 360) % 360;

      const normalizedAngle = normalize(angle);
      const normalizedStart = normalize(startAngle);
      const normalizedEnd = normalize(endAngle);

      return normalizedStart <= normalizedEnd
        ? normalizedAngle >= normalizedStart &&
            normalizedAngle <= normalizedEnd
        : normalizedAngle >= normalizedStart ||
            normalizedAngle <= normalizedEnd;
    };

    const handleDocumentPointerDown = (
      event: PointerEvent
    ) => {
      const wheelElement = wheelRef.current;

      if (!wheelElement) {
        return;
      }

      const target = event.target;

      /* Keep controls such as the page switcher interactive. */
      const interactiveTarget =
        target instanceof Element
          ? target.closest(
              "button, a, input, select, textarea"
            )
          : null;

      if (
        interactiveTarget &&
        wheelElement.contains(interactiveTarget)
      ) {
        return;
      }

      const svg = wheelElement.querySelector("svg");
      const bounds = svg?.getBoundingClientRect();

      if (!svg || !bounds || bounds.width === 0) {
        return;
      }

      const scale =
        svgSize / bounds.width;
      const x =
        (event.clientX - bounds.left) * scale;
      const y =
        (event.clientY - bounds.top) * scale;
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(
        dx * dx + dy * dy
      );

      /* The center hub is part of the wheel even though it is not a donut. */
      const insideCenter =
        distance <= innerRadius + 6;
      const insideMainDonut =
        distance >= innerRadius - 6 &&
        distance <= outerRadius + 6;

      if (insideCenter || insideMainDonut) {
        return;
      }

      const insideChildSector =
        nestedChildren.some(
          ({
            startAngle,
            endAngle,
            innerRadius: childInnerRadius,
            outerRadius: childOuterRadius,
          }) =>
            distance >= childInnerRadius - 6 &&
            distance <= childOuterRadius + 6 &&
            isAngleInRange(
              (Math.atan2(dy, dx) * 180) /
                Math.PI,
              startAngle,
              endAngle
            )
        );

      if (!insideChildSector) {
        onClose();
      }
    };

    document.addEventListener(
      "pointerdown",
      handleDocumentPointerDown
    );

    return () =>
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown
      );
  }, [
    center,
    innerRadius,
    nestedChildren,
    onClose,
    outerRadius,
    svgSize,
  ]);

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <div
      ref={wheelRef}
      className={`
        radial-wheel

        relative

        flex
        items-center
        justify-center

        select-none

        transition-all
        duration-300
        ease-out

        ${
          mounted
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        }

        ${currentPage?.type === "music" ? "music-wheel" : ""}

        ${config.theme === "dark" ? "theme-dark" : "theme-light"}
      `}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="
          relative
          z-10
          overflow-visible
        "
        aria-label="Radial navigation"
      >
        {/* ======================================================
            MAIN WHEEL
        ====================================================== */}

        <circle
          cx={center}
          cy={center}
          r={
            (
              innerRadius +
              outerRadius
            ) / 2
          }
          fill="none"
          stroke="white"
          strokeWidth={
            outerRadius -
            innerRadius
          }
        />

        {/* ======================================================
            CENTER PAGE SWITCHER
        ====================================================== */}

        <g
          className={`
            select-none

            ${
              isPageDragging
                ? "cursor-grabbing"
                : "cursor-grab"
            }
          `}
        >
          <circle
            cx={center}
            cy={center}
            r={
              innerRadius - 2
            }
            className="
              fill-black/10
              touch-none
            "
            style={{
              transform:
                `translate(${pageDragX}px, 0px)`,

              transformOrigin:
                `${center}px ${center}px`,
            }}
            onPointerDown={
              handleCenterPointerDown
            }
            onPointerMove={
              handleCenterPointerMove
            }
            onPointerUp={
              handleCenterPointerUp
            }
            onPointerCancel={
              handleCenterPointerCancel
            }
          />

          <foreignObject
            x={
              center -
              (
                innerRadius -
                2
              )
            }
            y={
              center -
              (
                innerRadius -
                2
              )
            }
            width={
              (
                innerRadius -
                2
              ) * 2
            }
            height={
              (
                innerRadius -
                2
              ) * 2
            }
            className="
              pointer-events-none
              overflow-visible
            "
          >
            <div
              className="
                flex
                h-full
                w-full

                items-center
                justify-center
              "
              style={{
                transform:
                  `translate(${pageDragX}px, 0px)`,
              }}
            >
              <div
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >
                {/* PREVIOUS */}

                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={
                    !previousPageId
                  }
                  className="
                    pointer-events-auto

                    flex
                    h-6
                    w-6
                    shrink-0

                    items-center
                    justify-center

                    rounded-full

                    text-lg
                    text-white

                    transition-all

                    hover:bg-white/10
                    active:scale-90

                    disabled:pointer-events-none
                    disabled:opacity-20

                    focus-visible:outline-none
                    focus-visible:ring-1
                    focus-visible:ring-white/40
                  "
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();

                    if (
                      previousPageId
                    ) {
                      onPageChange(
                        previousPageId
                      );
                    }
                  }}
                >
                  ‹
                </button>

                {/* PAGE NAME */}

                <span
                  className="
                    max-w-[120px]

                    overflow-hidden
                    text-ellipsis
                    whitespace-nowrap

                    text-center

                    text-lg
                    font-medium
                    tracking-tight

                    text-white
                  "
                >
                  {currentPage?.name ??
                    "Orbit"}
                </span>

                {/* NEXT */}

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={
                    !nextPageId
                  }
                  className="
                    pointer-events-auto

                    flex
                    h-6
                    w-6
                    shrink-0

                    items-center
                    justify-center

                    rounded-full

                    text-lg
                    text-white

                    transition-all

                    hover:bg-white/10
                    active:scale-90

                    disabled:pointer-events-none
                    disabled:opacity-20

                    focus-visible:outline-none
                    focus-visible:ring-1
                    focus-visible:ring-white/40
                  "
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();

                    if (
                      nextPageId
                    ) {
                      onPageChange(
                        nextPageId
                      );
                    }
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </foreignObject>
        </g>

        {/* ======================================================
            ROOT SECTORS
        ====================================================== */}

        {enabledItems.map(
          (
            item,
            index
          ) => {
            const startAngle =
              START_ANGLE +
              index *
                sectorAngle +
              SECTOR_GAP;

            const endAngle =
              START_ANGLE +
              (
                index + 1
              ) *
                sectorAngle -
              SECTOR_GAP;

            const isActive =
              activeRootId ===
              item.id;

            const sectorPath =
              createSectorPath(
                center,
                center,
                innerRadius,
                outerRadius,
                startAngle,
                endAngle
              );

            return (
              <g
                key={
                  `root-sector-${item.id}`
                }
              >
                {/* ROOT SECTOR */}

                <path
                  d={
                    sectorPath
                  }
                  onMouseEnter={() =>
                    activateRoot(
                      item,
                      index
                    )
                  }
                  onMouseLeave={
                    deactivateRoot
                  }
                  onClick={() =>
                    handleRootClick(
                      item,
                      index
                    )
                  }
                  className={`
                    cursor-pointer

                    ${currentPage?.type === "music" ? "music-sector" : ""}

                    transition-colors
                    duration-150

                    ${
                      isActive
                        ? `
                          fill-blue-700
                          stroke-blue-700
                        `
                        : `
                          fill-white
                          stroke-white
                        `
                    }
                  `}
                  strokeWidth="8"
                  strokeLinejoin="round"
                />

                {/* INNER EDGE */}

                <path
                  d={createSectorPath(
                    center,
                    center,
                    innerRadius -
                      5,
                    innerRadius +
                      5,
                    startAngle,
                    endAngle
                  )}
                  className={`
                    pointer-events-none

                    ${
                      isActive
                        ? "fill-blue-700"
                        : "fill-white"
                    }
                  `}
                />
              </g>
            );
          }
        )}

        {/* ======================================================
            ROOT DIVIDERS
        ====================================================== */}

        {/* ======================================================
            ROOT CONTENT
        ====================================================== */}

        {rootPositions.map(
          ({
            item,
            index,
            x,
            y,
          }) => {
            const isActive =
              activeRootId ===
              item.id;

            return (
              <foreignObject
                key={
                  `root-content-${item.id}`
                }
                x={
                  x -
                  rootButtonWidth /
                    2
                }
                y={
                  y -
                  rootButtonHeight /
                    2
                }
                width={
                  rootButtonWidth
                }
                height={
                  rootButtonHeight
                }
                className="
                  overflow-visible
                "
              >
                <button
                  type="button"
                  aria-label={
                    item.name
                  }
                  onMouseEnter={() =>
                    activateRoot(
                      item,
                      index
                    )
                  }
                  onMouseLeave={
                    deactivateRoot
                  }
                  onClick={() =>
                    handleRootClick(
                      item,
                      index
                    )
                  }
                  className={`
                    group

                    flex
                    h-full
                    w-full

                    flex-col
                    items-center
                    justify-center

                    gap-1

                    border-0
                    bg-transparent

                    outline-none

                    transition-all
                    duration-150

                    ${
                      isActive
                        ? "text-white"
                        : "text-black"
                    }

                    focus-visible:ring-2
                    focus-visible:ring-blue-700
                  `}
                >
                  {/* ROOT ICON */}

                  <span
                    className={`
                      flex
                      shrink-0

                      items-center
                      justify-center

                      ${iconClass}

                      leading-none

                      transition-transform
                      duration-150

                      group-hover:scale-105
                    `}
                  >
                    {renderIcon(
                      item.icon,
                      "h-full w-full"
                    )}
                  </span>

                  {/* ROOT LABEL */}

                  {/* {config.showLabels !==
                    false && ( */}
                    <span
                      className="
                        max-w-[90px]

                        overflow-hidden
                        text-ellipsis
                        whitespace-nowrap

                        text-center

                        text-[10px]
                        font-medium
                        leading-tight
                      "
                    >
                      {item.name}
                    </span>
                  {/* )} */}
                </button>
              </foreignObject>
            );
          }
        )}

        {/* ======================================================
            CHILD SECTORS
        ====================================================== */}

        {activeParent &&
          nestedChildren.length >
            0 &&
          nestedChildren.map(
            ({
              child,
              index,
              startAngle,
              endAngle,
              x,
              y,
              innerRadius:
                childInnerRadius,
              outerRadius:
                childOuterRadius,
            }) => {
              const isActive =
                activeChildIndex ===
                index;

              const childSectorPath =
                createSectorPath(
                  center,
                  center,
                  childInnerRadius,
                  childOuterRadius,
                  startAngle,
                  endAngle
                );

              const parentIndex =
                enabledItems.findIndex(
                  (item) =>
                    item.id ===
                    activeParent.id
                );

              return (
                <g
                  key={
                    `child-${child.id}`
                  }
                >
                  {/* ==================================================
                      CHILD SECTOR
                  ================================================== */}

                  <path
                    d={
                      childSectorPath
                    }
                    onMouseEnter={() => {
                      setActiveChildIndex(
                        index
                      );

                      onItemHover(
                        parentIndex,
                        index
                      );
                    }}
                    onMouseLeave={() => {
                      setActiveChildIndex(
                        null
                      );

                      onItemHover(
                        null,
                        null
                      );
                    }}
                    onClick={() =>
                      handleChildClick(
                        parentIndex,
                        index,
                        child
                      )
                    }
                    className={`
                      cursor-pointer

                      transition-colors
                      duration-150

                      ${
                        isActive
                          ? `
                            fill-blue-700
                            stroke-blue-700
                          `
                          : `
                            fill-white
                            stroke-white
                          `
                      }
                    `}
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />

                  {/* ==================================================
                      CHILD CONTENT

                      x/y are the CENTER of the child sector.
                  ================================================== */}

                  <foreignObject
                    x={
                      x -
                      CHILD_CONTENT_SIZE /
                        2
                    }
                    y={
                      y -
                      CHILD_CONTENT_SIZE /
                        2
                    }
                    width={
                      CHILD_CONTENT_SIZE
                    }
                    height={
                      CHILD_CONTENT_SIZE
                    }
                    className="
                      pointer-events-none
                      overflow-visible
                    "
                  >
                    <div
                      className="
                        flex
                        h-full
                        w-full

                        items-center
                        justify-center
                      "
                    >
                      <button
                        type="button"
                        aria-label={
                          child.name
                        }
                        onMouseEnter={() => {
                          setActiveChildIndex(
                            index
                          );

                          onItemHover(
                            parentIndex,
                            index
                          );
                        }}
                        onMouseLeave={() => {
                          setActiveChildIndex(
                            null
                          );

                          onItemHover(
                            null,
                            null
                          );
                        }}
                        onClick={() =>
                          handleChildClick(
                            parentIndex,
                            index,
                            child
                          )
                        }
                        className={`
                          pointer-events-auto

                          group

                          flex
                          h-full
                          w-full

                          flex-col

                          items-center
                          justify-center

                          gap-0.5

                          border-0
                          bg-transparent

                          outline-none

                          transition-transform
                          duration-150

                          ${
                            isActive
                              ? "text-white"
                              : "text-black"
                          }

                          hover:scale-105

                          focus-visible:ring-2
                          focus-visible:ring-blue-700
                        `}
                      >
                        {/* CHILD ICON */}

                        <span
                          className={`
                            flex

                            ${iconClass}

                            shrink-0

                            items-center
                            justify-center

                            leading-none

                            transition-transform
                            duration-150

                            group-hover:scale-110
                          `}
                          >
                          {renderIcon(
                            child.icon,
                            "h-full w-full"
                          )}
                        </span>

                        {/* CHILD LABEL */}

                        {/* {config.showLabels !==
                          false && ( */}
                          <span
                            className="
                              max-w-[66px]

                              overflow-hidden
                              text-ellipsis
                              whitespace-nowrap

                              text-center

                              text-[10px]
                              font-medium
                              leading-none
                            "
                          >
                            {child.name}
                          </span>
                        {/* )} */}
                      </button>
                    </div>
                  </foreignObject>
                </g>
              );
            }
          )}

        {/* ======================================================
            CENTER HUB
        ====================================================== */}

        {config.showCenter !==
          false && (
          <foreignObject
            x={
              center - 58
            }
            y={
              center - 58
            }
            width="116"
            height="116"
            className="
              overflow-visible
            "
          >
            <button
              type="button"
              aria-label="Close radial wheel"
              onClick={
                onClose
              }
              className="
                group

                flex
                h-[116px]
                w-[116px]

                items-center
                justify-center

                rounded-full

                border-[6px]
                border-white

                bg-transparent

                text-white

                outline-none

                transition-colors
                duration-150

                hover:border-blue-700

                focus-visible:ring-2
                focus-visible:ring-blue-700
              "
            >
              <span
                className="
                  flex
                  flex-col

                  items-center
                  justify-center

                  gap-2
                "
              >
                {/* CENTER ICON */}

                <span
                  className={`
                    flex
                    h-10
                    w-10

                    items-center
                    justify-center

                    rounded-full

                    border-2
                    border-white

                    text-white

                    transition-colors

                    group-hover:border-blue-700
                    group-hover:text-blue-700
                    ${
                      currentPage?.type === "music"
                        ? `music-center-record ${isMusicPlaying ? "is-playing" : ""}`
                        : ""
                    }
                  `}
                >
                  {currentPage?.type === "music"
                    ? renderIcon("disc-3", "h-7 w-7")
                    : typeof config.centerIcon === "string"
                      ? renderIcon(config.centerIcon, "h-5 w-5")
                      : "×"}
                </span>

                {/* CENTER LABEL */}

                <span
                  className="
                    max-w-20

                    overflow-hidden
                    text-ellipsis
                    whitespace-nowrap

                    text-[8px]
                    font-semibold

                    uppercase
                    tracking-[0.2em]

                    text-white
                  "
                >
                  {currentPage?.name ??
                    "Orbit"}
                </span>
              </span>
            </button>
          </foreignObject>
        )}
      </svg>

      {/* ========================================================
          PAGE CONTROLS
      ========================================================= */}

      {config.showCenter !==
        false && (
        <div
          className="
            absolute

            bottom-[-28px]
            left-1/2

            z-50

            flex

            -translate-x-1/2

            items-center
            gap-2
          "
        >
          {/* PREVIOUS */}

          <button
            type="button"
            aria-label="Previous page"
            disabled={
              !previousPageId
            }
            onClick={() =>
              previousPageId &&
              onPageChange(
                previousPageId
              )
            }
            className="
              flex
              h-8
              w-8

              items-center
              justify-center

              rounded-full

              border-2
              border-white

              bg-white

              text-sm
              text-black

              outline-none

              transition-all
              duration-150

              hover:border-blue-700
              hover:bg-blue-700
              hover:text-white

              active:scale-95

              disabled:pointer-events-none
              disabled:opacity-30

              focus-visible:ring-2
              focus-visible:ring-blue-700
            "
          >
            ‹
          </button>

          {/* PAGE INDICATOR */}

          <span
            className="
              rounded-full

              border-2
              border-white

              bg-transparent

              px-3
              py-1

              text-[8px]
              font-medium

              uppercase
              tracking-[0.15em]

              text-white
            "
          >
            {Math.max(
              0,
              pageIndex + 1
            )}{" "}
            /{" "}
            {enabledPages.length}
          </span>

          {/* NEXT */}

          <button
            type="button"
            aria-label="Next page"
            disabled={
              !nextPageId
            }
            onClick={() =>
              nextPageId &&
              onPageChange(
                nextPageId
              )
            }
            className="
              flex
              h-8
              w-8

              items-center
              justify-center

              rounded-full

              border-2
              border-white

              bg-white

              text-sm
              text-black

              outline-none

              transition-all
              duration-150

              hover:border-blue-700
              hover:bg-blue-700
              hover:text-white

              active:scale-95

              disabled:pointer-events-none
              disabled:opacity-30

              focus-visible:ring-2
              focus-visible:ring-blue-700
            "
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};
