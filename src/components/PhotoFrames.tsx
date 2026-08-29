"use client";

import Icon, { type IconName } from "./Icon";
import IconLabel from "./IconLabel";

export interface FrameProps {
  displayUrl: string | null;
  label: string;
  hint: string;
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
}: {
  displayUrl: string | null;
  label: string;
  placeholderIcon: IconName;
  size: number;
}) {
  if (!displayUrl) {
    return (
      <span style={{ color: "var(--mint-500)" }}>
        <Icon name={placeholderIcon} size={size} />
      </span>
    );
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={displayUrl} alt={label} className="w-full h-full object-cover" />;
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
      label={props.hint}
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
      className="relative w-full h-32 rounded-xl overflow-hidden flex items-center justify-center"
      style={{ background: "var(--mint-100)", border: "2px dashed var(--mint-300)" }}
    >
      <Picture
        displayUrl={props.displayUrl}
        label={props.label}
        placeholderIcon={props.placeholderIcon}
        size={30}
      />
      {!props.locked && (
        <span
          className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 text-xs py-1 font-semibold"
          style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
        >
          {props.uploading ? "..." : <IconLabel name="camera">{props.hint}</IconLabel>}
        </span>
      )}
    </Frame>
  );
}

export function AvatarFrame(props: FrameProps) {
  return (
    <Frame
      locked={props.locked}
      onPick={props.onPick}
      uploading={props.uploading}
      label={props.label}
      className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
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
