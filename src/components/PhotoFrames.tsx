"use client";

import Icon, { type IconName } from "./Icon";
import IconLabel from "./IconLabel";

export interface FrameProps {
  displayUrl: string | null;
  label: string;
  action: string;
  uploading: boolean;
  locked: boolean;
  placeholderIcon: IconName;
  onPick: () => void;
}

function Picture({
  displayUrl,
  label,
  placeholderIcon,
  size,
  whole,
}: {
  displayUrl: string | null;
  label: string;
  placeholderIcon: IconName;
  size: number;
  whole?: boolean;
}) {
  if (!displayUrl) {
    return (
      <span style={{ color: "var(--mint-500)" }}>
        <Icon name={placeholderIcon} size={size} />
      </span>
    );
  }
  if (!whole) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={displayUrl} alt={label} className="w-full h-full object-cover" />;
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={displayUrl} alt="" aria-hidden="true" className="photo-fill-blur" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={displayUrl} alt={label} className="photo-fill-img" />
    </>
  );
}

function Frame({
  locked,
  onPick,
  uploading,
  label,
  className,
  style,
  children,
}: {
  locked: boolean;
  onPick: () => void;
  uploading: boolean;
  label: string;
  className: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (locked) {
    return (
      <span className={className} style={style} aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={uploading}
      aria-label={label}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}

export function HeroFrame(props: FrameProps) {
  return (
    <Frame
      locked={props.locked}
      onPick={props.onPick}
      uploading={props.uploading}
      label={props.action}
      className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
      style={{
        background: "var(--mint-100)",
        border: "3px solid #fff",
        boxShadow: "0 2px 12px rgba(26, 63, 51, 0.14)",
      }}
    >
      <Picture displayUrl={props.displayUrl} label={props.label} placeholderIcon="user" size={40} />
      {!props.locked && (
        <span
          className="absolute bottom-0 inset-x-0 flex items-center justify-center py-1"
          style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
        >
          {props.uploading ? "..." : <Icon name="camera" size={14} />}
        </span>
      )}
    </Frame>
  );
}

export function CoverFrame(props: FrameProps) {
  return (
    <Frame
      locked={props.locked}
      onPick={props.onPick}
      uploading={props.uploading}
      label={props.label}
      className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{
        aspectRatio: "16 / 10",
        background: "var(--mint-100)",
        border: "2px dashed var(--mint-300)",
      }}
    >
      <Picture
        displayUrl={props.displayUrl}
        label={props.label}
        placeholderIcon={props.placeholderIcon}
        size={30}
        whole
      />
      {!props.locked && (
        <span
          className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 text-xs py-1 font-semibold"
          style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
        >
          {props.uploading ? "..." : <IconLabel name="camera">{props.action}</IconLabel>}
        </span>
      )}
    </Frame>
  );
}

// A face reads as a circle and a poster does not, so the small frame carries its
// corner as a prop rather than being copied into a second component.
export type FrameShape = "circle" | "square";

export function AvatarFrame(props: FrameProps & { shape?: FrameShape }) {
  const corner = props.shape === "square" ? "rounded-xl" : "rounded-full";
  return (
    <Frame
      locked={props.locked}
      onPick={props.onPick}
      uploading={props.uploading}
      label={props.label}
      className={`relative w-16 h-16 ${corner} overflow-hidden shrink-0 flex items-center justify-center`}
      style={{ background: "var(--mint-100)", border: "2px solid var(--mint-300)" }}
    >
      <Picture
        displayUrl={props.displayUrl}
        label={props.label}
        placeholderIcon={props.placeholderIcon}
        size={24}
      />
      {!props.locked && (
        <span
          className="absolute bottom-0 inset-x-0 flex items-center justify-center text-[10px] py-0.5"
          style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
        >
          {props.uploading ? "..." : <Icon name="camera" size={11} />}
        </span>
      )}
    </Frame>
  );
}

// An activity photo is a poster or a scene, so it keeps its corners.
export function TileFrame(props: FrameProps) {
  return <AvatarFrame {...props} shape="square" />;
}
