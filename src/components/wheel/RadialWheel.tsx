import React, {
  useEffect,
  useRef,
} from "react";

import { type WheelItemProps } from "../../types/types";

interface RadialWheelProps {
  items: WheelItemProps[];

  selectedIndex: number;

  hoveredIndex: number | null;

  onItemSelect: (
    index: number
  ) => void;

  onItemHover: (
    index: number | null
  ) => void;

  onClose: () => void;

  radius: number;

  deadZone: number;

  showCenter: boolean;

  centerIcon?: string;
}

const SECTOR_PADDING = 0.05;

export const RadialWheel: React.FC<
  RadialWheelProps
> = ({
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
  const wheelRef =
    useRef<HTMLDivElement>(null);

  const itemCount =
    items.length;

  const segmentAngle =
    itemCount > 0
      ? (2 * Math.PI) / itemCount
      : 0;

  // ================================================
  // MOUSE MOVEMENT
  // ================================================

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const wheel =
      wheelRef.current;

    if (!wheel || itemCount === 0) {
      onItemHover(null);
      return;
    }

    const rect =
      wheel.getBoundingClientRect();

    const centerX =
      rect.width / 2;

    const centerY =
      rect.height / 2;

    const mouseX =
      e.clientX - rect.left;

    const mouseY =
      e.clientY - rect.top;

    const dx =
      mouseX - centerX;

    const dy =
      mouseY - centerY;

    const distance =
      Math.sqrt(
        dx * dx + dy * dy
      );

    // ================================================
    // DEAD ZONE
    // ================================================

    if (distance < deadZone) {
      onItemHover(null);
      return;
    }

    // ================================================
    // ANGLE
    // ================================================

    let angle =
      Math.atan2(dy, dx);

    if (angle < 0) {
      angle +=
        2 * Math.PI;
    }

    // ================================================
    // SECTOR
    // ================================================

    let index =
      Math.floor(
        angle / segmentAngle
      );

    index = Math.max(
      0,
      Math.min(
        index,
        itemCount - 1
      )
    );

    onItemHover(index);
  };

  // ================================================
  // MOUSE LEAVE
  // ================================================

  const handleMouseLeave = () => {
    onItemHover(null);
  };

  // ================================================
  // ESCAPE
  // ================================================

  useEffect(() => {
    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (
          event.key === "Escape"
        ) {
          onClose();
        }
      };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  // ================================================
  // EMPTY WHEEL
  // ================================================

  if (itemCount === 0) {
    return (
      <div
        ref={wheelRef}
        className="radial-wheel"
        role="dialog"
        aria-modal="true"
        tabIndex={0}
        style={{
          width: radius * 2,
          height: radius * 2,
        }}
      >
        <div className="wheel-background" />

        {showCenter && (
          <div
            className="wheel-center"
            style={{
              width:
                deadZone * 2,
              height:
                deadZone * 2,
            }}
            onClick={onClose}
          >
            {centerIcon && (
              <div className="center-icon">
                {centerIcon}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ================================================
  // WHEEL
  // ================================================

  return (
    <div
      ref={wheelRef}
      className="radial-wheel"
      role="dialog"
      aria-modal="true"
      tabIndex={0}
      onMouseMove={
        handleMouseMove
      }
      onMouseLeave={
        handleMouseLeave
      }
      style={{
        width: radius * 2,
        height: radius * 2,
      }}
    >

      {/* Background */}

      <div className="wheel-background" />

      {/* Sectors */}

      {items.map(
        (item, index) => {
          const angle =
            index *
            (360 / itemCount);

          const isSelected =
            selectedIndex ===
            index;

          const isHovered =
            hoveredIndex ===
            index;

          return (
            <div
              key={item.id}
              className={[
                "wheel-sector",

                isSelected
                  ? "selected"
                  : "",

                isHovered
                  ? "hovered"
                  : "",

                !item.enabled
                  ? "disabled"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}

              onClick={() => {
                if (
                  item.enabled
                ) {
                  onItemSelect(
                    index
                  );
                }
              }}

              role="button"

              aria-label={
                item.name
              }

              aria-disabled={
                !item.enabled
              }

              style={{
                transform:
                  `rotate(${angle}deg)`,
              }}
            >

              <div
                className="sector-shape"
                style={
                  {
                    "--sector-angle":
                      `${360 / itemCount}deg`,

                    "--sector-padding":
                      `${SECTOR_PADDING}rad`,
                  } as React.CSSProperties
                }
              >

                <div
                  className="sector-icon"
                  style={{
                    transform:
                      `rotate(${-angle}deg)`,

                    backgroundImage:
                      item.icon
                        ? `url("${item.icon}")`
                        : undefined,
                  }}
                />

                <div
                  className="sector-label"
                  style={{
                    transform:
                      `rotate(${-angle}deg)`,
                  }}
                >
                  {item.name}
                </div>

              </div>
            </div>
          );
        }
      )}

      {/* Center */}

      {showCenter && (
        <div
          className="wheel-center"
          style={{
            width:
              deadZone * 2,
            height:
              deadZone * 2,
          }}
          onClick={onClose}
          role="button"
          aria-label="Close wheel"
        >
          {centerIcon && (
            <div className="center-icon">
              {centerIcon}
            </div>
          )}
        </div>
      )}

    </div>
  );
};