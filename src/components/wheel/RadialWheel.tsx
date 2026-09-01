import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";

import type { Action } from "../../types/types";
import type { RadialWheelProps } from "./types";

const START_ANGLE = -90;

const DEFAULT_RADIUS = 180;
const DEFAULT_ITEM_SIZE = 76;
const DEFAULT_ICON_SIZE = 30;
const NESTED_SECTOR_THICKNESS = 76;
const NESTED_RING_GAP = 12;

/*
 * Gap between neighboring sectors.
 */
const SECTOR_GAP = 2;

/*
 * Main donut.
 *
 * The larger the difference between these two values,
 * the thicker the white donut becomes.
 */
const INNER_RADIUS = 78;

/*
 * Extra thickness around the outside.
 */
const OUTER_ARC_THICKNESS = 8;

/* ================================================================
   HELPERS
================================================================ */

const getEnabledItems = (
  page: { items?: Action[] } | undefined
) => {
  return (page?.items ?? []).filter(
    (item) => item.enabled
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
    (angle * Math.PI) / 180;

  return {
    x:
      cx +
      radius * Math.cos(radians),

    y:
      cy +
      radius * Math.sin(radians),
  };
};

/* ================================================================
   DONUT / SECTOR PATH
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
    endAngle - startAngle > 180
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
  const wheelRef =
    useRef<HTMLDivElement>(null);

  const [mounted, setMounted] =
    useState(false);

  const [activeRootId, setActiveRootId] =
    useState<string | null>(null);

  const [activeChildIndex, setActiveChildIndex] =
    useState<number | null>(null);
  
  const [pageDragX, setPageDragX] = useState(0);
  const [isPageDragging, setIsPageDragging] = useState(false);

  const pagePointerStartX = useRef<number | null>(null);

  /* ==============================================================
     MOUNT
  ============================================================== */

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(() => {
        setMounted(true);
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, []);

  /* ==============================================================
     PAGES
  ============================================================== */

  const enabledPages = useMemo(
    () =>
      pages.filter(
        (page) => page.enabled
      ),
    [pages]
  );

  const currentPage = useMemo(
    () =>
      enabledPages.find(
        (page) =>
          page.id === currentPageId
      ) ??
      enabledPages[0] ??
      pages[0],
    [
      enabledPages,
      currentPageId,
      pages,
    ]
  );

  const enabledItems = useMemo(
    () =>
      getEnabledItems(
        currentPage
      ),
    [currentPage]
  );

  /* ==============================================================
     CONFIG
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

  /*
   * Main donut outer edge.
   */
  const outerRadius = radius;

  /*
   * Main donut inner edge.
   */
  const innerRadius = Math.min(
    INNER_RADIUS,
    outerRadius - 40
  );

  /*
   * Nested buttons sit outside
   * the outer arc.
   */
  const nestedRadius =
    outerRadius +
    OUTER_ARC_THICKNESS +
    NESTED_RING_GAP;

  /*
   * Extra room for buttons.
   */
  const padding =
    Math.max(
      itemSize,
      64
    );

  const svgRadius =
    nestedRadius +
    padding;

  const svgSize =
    svgRadius * 2;

  const center =
    svgSize / 2;

  /* ==============================================================
     SECTOR ANGLE
  ============================================================== */

  const sectorAngle =
    enabledItems.length > 0
      ? 360 /
        enabledItems.length
      : 0;

  /* ==============================================================
     LABEL POSITION
  ============================================================== */

  /*
   * Put labels in the center
   * of the large white sector.
   */
  const labelRadius =
    (innerRadius +
      outerRadius) /
    2;

  /* ==============================================================
     ROOT POSITIONS
  ============================================================== */

  const rootPositions = useMemo(
    () => {
      return enabledItems.map(
        (item, index) => {
          const angle =
            START_ANGLE +
            index * sectorAngle +
            sectorAngle / 2;

          const position =
            polarToCartesian(
              center,
              center,
              labelRadius,
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
    },
    [
      enabledItems,
      sectorAngle,
      center,
      labelRadius,
    ]
  );

  /* ==============================================================
     ACTIVE ROOT
  ============================================================== */

  const activeParent = useMemo(
    () => {
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
    },
    [
      activeRootId,
      enabledItems,
    ]
  );

  /* ==============================================================
     ACTIVE CHILDREN
  ============================================================== */

  const activeChildren =
    useMemo(
      () =>
        activeParent?.children?.filter(
          (child) =>
            child.enabled
        ) ?? [],
      [activeParent]
    );

  /* ==============================================================
     NESTED CHILD POSITIONS
  ============================================================== */

  const nestedChildren = useMemo(() => {
    if (!activeParent || activeChildren.length === 0) {
      return [];
    }

    const parentIndex = enabledItems.findIndex(
      (item) => item.id === activeParent.id
    );

    if (parentIndex < 0) {
      return [];
    }

    /*
    * Parent's CENTER angle.
    *
    * We use this only to determine where the
    * child fan should appear.
    */
    const parentAngle =
      START_ANGLE +
      parentIndex * sectorAngle +
      sectorAngle / 2;

    /*
    * Children are NOT restricted to the parent's
    * 90° sector.
    *
    * Give the children their own comfortable fan.
    */
    const childCount = activeChildren.length;

    /*
    * Minimum angular space per child.
    *
    * This is deliberately much larger than
    * sectorAngle / childCount.
    */
    const MIN_CHILD_ANGLE = 28;

    /*
    * Increase the fan as children are added.
    */
    const fanAngle = Math.max(
      sectorAngle + 20,
      childCount * MIN_CHILD_ANGLE
    );

    /*
    * Never make the fan absurdly large.
    */
    const clampedFanAngle = Math.min(
      fanAngle,
      150
    );

    const childAngle =
      childCount === 1
        ? parentAngle
        : clampedFanAngle /
          (childCount - 1);

    const fanStartAngle =
      parentAngle -
      clampedFanAngle / 2;

    return activeChildren.map(
      (child, index) => {
        const angle =
          childCount === 1
            ? parentAngle
            : fanStartAngle +
              index * childAngle;

        const position =
          polarToCartesian(
            center,
            center,
            nestedRadius,
            angle
          );

        /*
        * Each child owns a REAL sector.
        *
        * Make it smaller than the distance
        * between children so there is breathing
        * room between sectors.
        */
        const sectorHalfAngle =
          childCount === 1
            ? 22
            : Math.min(
                14,
                childAngle * 0.38
              );

        return {
          child,
          index,
          angle,

          startAngle:
            angle - sectorHalfAngle,

          endAngle:
            angle + sectorHalfAngle,

          x: position.x,
          y: position.y,
        };
      }
    );
  }, [
    activeParent,
    activeChildren,
    enabledItems,
    sectorAngle,
    center,
    nestedRadius,
  ]);

  const createNestedSectorPath = (
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
  ) => {
    return createSectorPath(
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle
    );
  };

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
          (pageIndex -
            1 +
            enabledPages.length) %
            enabledPages.length
        ]?.id
      : undefined;

  const nextPageId =
    enabledPages.length > 0
      ? enabledPages[
          (pageIndex + 1) %
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
    setActiveRootId(item.id);
    setActiveChildIndex(null);

    onItemHover(
      index,
      null
    );
  };

  const deactivateRoot = () => {
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
    /*
     * Parent item.
     */
    if (
      item.children &&
      item.children.length > 0
    ) {
      setActiveRootId(
        (previous) =>
          previous === item.id
            ? null
            : item.id
      );

      setActiveChildIndex(null);

      return;
    }

    /*
     * Normal action.
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
     BUTTON SIZES
  ============================================================== */

  const rootButtonSize =
    itemSize >= 96
      ? "h-20 w-32"
      : itemSize >= 84
        ? "h-[4.5rem] w-28"
        : "h-16 w-24";

  const childButtonSize =
    itemSize >= 96
      ? "h-20 w-20"
      : itemSize >= 84
        ? "h-[4.5rem] w-[4.5rem]"
        : "h-14 w-14";

  const iconClass =
    iconSize >= 40
      ? "text-4xl"
      : iconSize >= 32
        ? "text-3xl"
        : iconSize >= 24
          ? "text-2xl"
          : "text-xl";

  const handlePagePointerDown = (
    event: React.PointerEvent<SVGCircleElement>
  ) => {
    pagePointerStartX.current = event.clientX;

    setIsPageDragging(true);
    setPageDragX(0);

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const handlePagePointerMove = (
    event: React.PointerEvent<SVGCircleElement>
  ) => {
    if (
      pagePointerStartX.current === null
    ) {
      return;
    }

    const delta =
      event.clientX -
      pagePointerStartX.current;

    /*
    * Limit the amount the center can
    * visually follow the finger/mouse.
    */
    const clampedDelta = Math.max(
      -70,
      Math.min(70, delta)
    );

    setPageDragX(clampedDelta);
  };

  const handlePagePointerUp = (
    event: React.PointerEvent<SVGCircleElement>
  ) => {
    if (
      pagePointerStartX.current === null
    ) {
      return;
    }

    const delta =
      event.clientX -
      pagePointerStartX.current;

    const SWIPE_THRESHOLD = 45;

    /*
    * Swipe left -> next page
    */
    if (
      delta < -SWIPE_THRESHOLD &&
      nextPageId
    ) {
      onPageChange(nextPageId);
    }

    /*
    * Swipe right -> previous page
    */
    if (
      delta > SWIPE_THRESHOLD &&
      previousPageId
    ) {
      onPageChange(previousPageId);
    }

    pagePointerStartX.current = null;

    setPageDragX(0);
    setIsPageDragging(false);

    event.currentTarget.releasePointerCapture(
      event.pointerId
    );
  };

  const handlePagePointerCancel = () => {
    pagePointerStartX.current = null;

    setPageDragX(0);
    setIsPageDragging(false);
  };
  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <div
      ref={wheelRef}
      className={`
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
      `}
    >
      <svg
        className="
          relative
          z-10
          overflow-visible
        "
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        aria-label="Radial navigation"
      >
        {/* ========================================================
            BASE WHITE DONUT
        ========================================================= */}

        <circle
          cx={center}
          cy={center}
          r={
            (innerRadius +
              outerRadius) /
            2
          }
          className="
            fill-none
            stroke-white
          "
          strokeWidth={
            outerRadius -
            innerRadius
          }
        />

        {/* ========================================================
            INNER BLACK CUTOUT
        ========================================================= */}

{/* ============================================================
    CENTER PAGE SWITCHER
    - Drag left  -> next page
    - Drag right -> previous page
    - Tiny arrows for direct navigation
    - Page dots for direct navigation
    ============================================================ */}

      <g
        className={`
          select-none
          ${isPageDragging ? "cursor-grabbing" : "cursor-grab"}
        `}
      >
        {/* ----------------------------------------------------------
            CENTER BACKGROUND
            ---------------------------------------------------------- */}

        <circle
          cx={center}
          cy={center}
          r={innerRadius - 2}
          className="
            fill-black/10

            touch-none

            transition-transform
            duration-300
            ease-[cubic-bezier(0.22,1,0.36,1)]
          "
          style={{
            transform: `translate(${pageDragX}px, 0px)`,
            transformOrigin: `${center}px ${center}px`,
          }}
          onPointerDown={(event) => {
            pagePointerStartX.current = event.clientX;

            setIsPageDragging(true);
            setPageDragX(0);

            event.currentTarget.setPointerCapture(
              event.pointerId
            );
          }}
          onPointerMove={(event) => {
            if (pagePointerStartX.current === null) {
              return;
            }

            const rawDelta =
              event.clientX -
              pagePointerStartX.current;

            /*
            * Small amount of resistance makes
            * the interaction feel physical.
            */
            const resistedDelta =
              rawDelta * 0.55;

            const clampedDelta = Math.max(
              -42,
              Math.min(42, resistedDelta)
            );

            setPageDragX(clampedDelta);
          }}
          onPointerUp={(event) => {
            if (
              pagePointerStartX.current === null
            ) {
              return;
            }

            const delta =
              event.clientX -
              pagePointerStartX.current;

            const SWIPE_THRESHOLD = 45;

            if (
              delta < -SWIPE_THRESHOLD &&
              nextPageId
            ) {
              onPageChange(nextPageId);
            }

            if (
              delta > SWIPE_THRESHOLD &&
              previousPageId
            ) {
              onPageChange(previousPageId);
            }

            pagePointerStartX.current = null;
            setPageDragX(0);
            setIsPageDragging(false);

            event.currentTarget.releasePointerCapture(
              event.pointerId
            );
          }}
          onPointerCancel={() => {
            pagePointerStartX.current = null;
            setPageDragX(0);
            setIsPageDragging(false);
          }}
        />

        {/* ----------------------------------------------------------
            CENTER CONTENT
            ---------------------------------------------------------- */}

        <foreignObject
          x={center - (innerRadius - 2)}
          y={center - (innerRadius - 2)}
          width={(innerRadius - 2) * 2}
          height={(innerRadius - 2) * 2}
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
              transform: `translate(${pageDragX}px, 0px)`,
            }}
          >
            <div
              className="
                flex
                flex-col
                items-center
                justify-center
              "
            >
              {/* ----------------------------------------------------
                  PAGE NAVIGATION ROW
                  ---------------------------------------------------- */}

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
                  disabled={!previousPageId}
                  className="
                    pointer-events-auto

                    flex
                    h-5
                    w-5
                    shrink-0
                    items-center
                    justify-center

                    rounded-full

                    text-[15px]
                    leading-none
                    text-white

                    transition-all
                    duration-150
                    ease-out

                    hover:bg-black/5
                    hover:text-white

                    active:scale-90

                    disabled:pointer-events-none
                    disabled:opacity-20

                    focus-visible:outline-none
                    focus-visible:ring-1
                    focus-visible:ring-black/30
                  "
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onPointerMove={(event) => {
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();

                    if (previousPageId) {
                      onPageChange(previousPageId);
                    }
                  }}
                >
                  ‹
                </button>

                {/* PAGE NAME */}

                <div
                  className="
                    min-w-0
                    max-w-[120px]

                    overflow-hidden
                    text-ellipsis
                    whitespace-nowrap

                    text-center

                    text-lg
                    font-medium
                    tracking-tight

                    text-white

                    transition-all
                    duration-300
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                  "
                >
                  {currentPage?.name ?? "Orbit"}
                </div>

                {/* NEXT */}

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={!nextPageId}
                  className="
                    pointer-events-auto

                    flex
                    h-5
                    w-5
                    shrink-0
                    items-center
                    justify-center

                    rounded-full

                    text-[15px]
                    leading-none
                    text-white

                    transition-all
                    duration-150
                    ease-out

                    hover:bg-black/5
                    hover:text-white

                    active:scale-90

                    disabled:pointer-events-none
                    disabled:opacity-20

                    focus-visible:outline-none
                    focus-visible:ring-1
                    focus-visible:ring-black/30
                  "
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onPointerMove={(event) => {
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();

                    if (nextPageId) {
                      onPageChange(nextPageId);
                    }
                  }}
                >
                  ›
                </button>
              </div>

            </div>
          </div>
        </foreignObject>
      </g>

        {/* ========================================================
            OUTER WHITE RING
        ========================================================= */}

        <circle
          cx={center}
          cy={center}
          r={
            outerRadius +
            OUTER_ARC_THICKNESS /
              2
          }
          className="
            pointer-events-none
            fill-none
            stroke-white
          "
          strokeWidth={
            OUTER_ARC_THICKNESS
          }
        />

        {/* ========================================================
            SECTORS
        ========================================================= */}

        {enabledItems.map(
          (item, index) => {
            const startAngle =
              START_ANGLE +
              index * sectorAngle +
              SECTOR_GAP;

            const endAngle =
              START_ANGLE +
              (index + 1) *
                sectorAngle -
              SECTOR_GAP;

            const isActive =
              activeRootId ===
              item.id;

            /*
             * MAIN SECTOR
             */
            const sectorPath =
              createSectorPath(
                center,
                center,
                innerRadius,
                outerRadius,
                startAngle,
                endAngle
              );

            const outerArcStartAngle =
              START_ANGLE +
              index * sectorAngle;

            const outerArcEndAngle =
              START_ANGLE +
              (index + 1) * sectorAngle;

            const outerArcPath =
              createSectorPath(
                center,
                center,
                outerRadius - 1,
                outerRadius + OUTER_ARC_THICKNESS,
                outerArcStartAngle,
                outerArcEndAngle
              );

            /*
             * INNER ARC
             */
            const innerArcPath =
              createSectorPath(
                center,
                center,
                innerRadius - 5,
                innerRadius + 5,
                startAngle,
                endAngle
              );

            return (
              <g
                key={`sector-${item.id}`}
              >
                {/* ==================================================
                    MAIN LARGE SECTOR
                =================================================== */}

                <path
                  d={sectorPath}
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

                {/* ==================================================
                    OUTER ARC SEGMENT

                    This is interactive too.
                =================================================== */}

                <path
                  d={outerArcPath}
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
                    transition-colors
                    duration-150

                    ${
                      isActive
                        ? "fill-blue-700"
                        : "fill-white"
                    }
                  `}
                />

                {/* ==================================================
                    INNER ARC
                =================================================== */}

                <path
                  d={innerArcPath}
                  className={`
                    pointer-events-none

                    transition-colors
                    duration-150

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

        {/* ========================================================
            SECTOR DIVIDERS
        ========================================================= */}

        {enabledItems.map(
          (_, index) => {
            const angle =
              START_ANGLE +
              index * sectorAngle;

            const inner =
              polarToCartesian(
                center,
                center,
                innerRadius - 6,
                angle
              );

            const outer =
              polarToCartesian(
                center,
                center,
                outerRadius +
                  OUTER_ARC_THICKNESS,
                angle
              );

            return (
              <line
                key={`divider-${index}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                className="
                  pointer-events-none
                  stroke-[#0b0b0b]
                "
                strokeWidth="3"
              />
            );
          }
        )}

        {/* ========================================================
            NESTED CONNECTORS
        ========================================================= */}

        {activeParent &&
          nestedChildren.length >
            0 &&
          nestedChildren.map(
            ({
              child,
              x,
              y,
            }) => {
              const parentIndex =
                enabledItems.findIndex(
                  (item) =>
                    item.id ===
                    activeParent.id
                );

              const parentAngle =
                START_ANGLE +
                parentIndex *
                  sectorAngle +
                sectorAngle / 2;

              const parent =
                polarToCartesian(
                  center,
                  center,
                  outerRadius +
                    OUTER_ARC_THICKNESS,
                  parentAngle
                );

              return (
                <line
                  key={`connector-${child.id}`}
                  x1={parent.x}
                  y1={parent.y}
                  x2={x}
                  y2={y}
                  className="
                    pointer-events-none
                    stroke-white
                  "
                  strokeWidth="4"
                />
              );
            }
          )}

        {/* ========================================================
            ROOT BUTTONS / LABELS
        ========================================================= */}

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
                key={`root-${item.id}`}
                x={
                  x -
                  itemSize * 0.7
                }
                y={
                  y -
                  itemSize * 0.45
                }
                width={
                  itemSize * 1.4
                }
                height={
                  itemSize * 0.9
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
                    ${rootButtonSize}

                    relative

                    flex
                    h-full
                    w-full

                    items-center
                    justify-center

                    border-0
                    bg-transparent

                    outline-none

                    transition-colors
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
                  <span
                    className="
                      flex
                      flex-col
                      items-center
                      justify-center
                      gap-1
                    "
                  >
                    {/* ==================================================
                        ICON
                    =================================================== */}

                    <span
                      className={`
                        ${iconClass}

                        leading-none

                        transition-transform
                        duration-150

                        group-hover:scale-105
                      `}
                    >
                      {item.name ??
                        "•"}
                    </span>

                    {/* ==================================================
                        LABEL
                    =================================================== */}

                    {config.showLabels !==
                      false && (
                      <span
                        className="
                          max-w-24
                          truncate

                          text-[11px]
                          font-medium
                          tracking-wide
                        "
                      >
                        {item.name}
                      </span>
                    )}
                  </span>
                </button>
              </foreignObject>
            );
          }
        )}

        {/* ========================================================
            NESTED CHILDREN
        ========================================================= */}

        {activeParent &&
          nestedChildren.length > 0 &&
          nestedChildren.map(
            ({
              child,
              index,
              angle,
              startAngle,
              endAngle,
              x,
              y,
            }) => {
              const isActive =
                activeChildIndex === index;

              /*
              * Child sector starts outside the main wheel.
              */
              const childSectorInnerRadius =
                outerRadius +
                OUTER_ARC_THICKNESS +
                NESTED_RING_GAP;

              /*
              * Give the child sector enough radial depth
              * for the button/label.
              */
              const childSectorOuterRadius =
                childSectorInnerRadius +
                NESTED_SECTOR_THICKNESS;

              const childSectorPath =
                createSectorPath(
                  center,
                  center,
                  childSectorInnerRadius,
                  childSectorOuterRadius,
                  startAngle,
                  endAngle
                );

              return (
                <g
                  key={`child-${child.id}`}
                  className="group"
                >
                  {/* ==================================================
                      CHILD SECTOR
                  =================================================== */}

                  <path
                    d={childSectorPath}
                    onMouseEnter={() => {
                      setActiveChildIndex(index);

                      const parentIndex =
                        enabledItems.findIndex(
                          (item) =>
                            item.id ===
                            activeParent.id
                        );

                      onItemHover(
                        parentIndex,
                        index
                      );
                    }}
                    onMouseLeave={() => {
                      setActiveChildIndex(null);
                      onItemHover(null, null);
                    }}
                    onClick={() => {
                      const parentIndex =
                        enabledItems.findIndex(
                          (item) =>
                            item.id ===
                            activeParent.id
                        );

                      handleChildClick(
                        parentIndex,
                        index,
                        child
                      );
                    }}
                    className={`
                      cursor-pointer

                      transition-all
                      duration-150
                      ease-out

                      ${
                        isActive
                          ? `
                            fill-blue-700
                            stroke-blue-700
                          `
                          : `
                            fill-white
                            stroke-white
                            hover:fill-blue-100
                            hover:stroke-blue-100
                          `
                      }
                    `}
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />

                  {/* ==================================================
                      CHILD CONNECTOR
                  =================================================== */}

                  <line
                    x1={
                      polarToCartesian(
                        center,
                        center,
                        outerRadius +
                          OUTER_ARC_THICKNESS,
                        angle
                      ).x
                    }
                    y1={
                      polarToCartesian(
                        center,
                        center,
                        outerRadius +
                          OUTER_ARC_THICKNESS,
                        angle
                      ).y
                    }
                    x2={
                      polarToCartesian(
                        center,
                        center,
                        childSectorInnerRadius,
                        angle
                      ).x
                    }
                    y2={
                      polarToCartesian(
                        center,
                        center,
                        childSectorInnerRadius,
                        angle
                      ).y
                    }
                    className={`
                      pointer-events-none

                      transition-colors
                      duration-150

                      ${
                        isActive
                          ? "stroke-blue-700"
                          : "stroke-white"
                      }
                    `}
                    strokeWidth="4"
                  />

                  {/* ==================================================
                      CHILD CONTENT
                  =================================================== */}

                  <foreignObject
                    x={x - itemSize * 0.55}
                    y={y - itemSize * 0.45}
                    width={itemSize * 1.1}
                    height={itemSize * 0.9}
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
                        aria-label={child.name}
                        onMouseEnter={() => {
                          setActiveChildIndex(index);

                          const parentIndex =
                            enabledItems.findIndex(
                              (item) =>
                                item.id ===
                                activeParent.id
                            );

                          onItemHover(
                            parentIndex,
                            index
                          );
                        }}
                        onMouseLeave={() => {
                          setActiveChildIndex(null);
                          onItemHover(null, null);
                        }}
                        onClick={() => {
                          const parentIndex =
                            enabledItems.findIndex(
                              (item) =>
                                item.id ===
                                activeParent.id
                            );

                          handleChildClick(
                            parentIndex,
                            index,
                            child
                          );
                        }}
                        className={`
                          pointer-events-auto
                          group

                          flex
                          h-full
                          w-full

                          flex-col
                          items-center
                          justify-center

                          rounded-2xl

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
                        {/* ICON */}

                        <span
                          className={`
                            ${iconClass}

                            leading-none

                            transition-transform
                            duration-150

                            group-hover:scale-110
                          `}
                        >
                          {child.name ?? "•"}
                        </span>

                        {/* LABEL */}

                        {config.showLabels !==
                          false && (
                          <span
                            className="
                              mt-1

                              max-w-[90px]

                              truncate

                              text-center

                              text-[11px]
                              font-medium
                              leading-tight
                              tracking-wide
                            "
                          >
                            {child.name}
                          </span>
                        )}
                      </button>
                    </div>
                  </foreignObject>
                </g>
              );
            }
          )}

        {/* ========================================================
            CENTER HUB
        ========================================================= */}

        {config.showCenter !==
          false && (
          <foreignObject
            x={center - 58}
            y={center - 58}
            width="116"
            height="116"
            className="
              overflow-visible
            "
          >
            <button
              type="button"
              aria-label="Close radial wheel"
              onClick={onClose}
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

                bg-[#0b0b0b]

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
                <span
                  className="
                    flex
                    h-10
                    w-10

                    items-center
                    justify-center

                    rounded-full

                    border-2
                    border-white

                    text-lg
                    text-white

                    transition-colors
                    duration-150

                    group-hover:border-blue-700
                    group-hover:text-blue-700
                  "
                >
                  {config.centerIcon ??
                    "×"}
                </span>

                <span
                  className="
                    max-w-20
                    truncate

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

      {/* ==========================================================
          PAGE CONTROLS
      =========================================================== */}

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
          {/* Previous */}

          <button
            type="button"
            aria-label="Previous page"
            disabled={!previousPageId}
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

              transition-colors
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

          {/* Page */}

          <span
            className="
              rounded-full

              border-2
              border-white

              bg-[#0b0b0b]

              px-3
              py-1

              text-[8px]
              font-medium

              uppercase
              tracking-[0.15em]

              text-white
            "
          >
            {pageIndex + 1} /{" "}
            {enabledPages.length}
          </span>

          {/* Next */}

          <button
            type="button"
            aria-label="Next page"
            disabled={!nextPageId}
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

              transition-colors
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