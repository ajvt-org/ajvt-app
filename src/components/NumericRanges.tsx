import { Fragment } from "react";
import { tokenizeRanges } from "@/lib/bidiRanges";

export default function NumericRanges({ children }: { children: string }) {
  return (
    <>
      {tokenizeRanges(children).map((token, i) => {
        if (token.kind === "text") return <Fragment key={i}>{token.text}</Fragment>;
        if (token.kind === "fraction") {
          return (
            <span key={i} dir="ltr" style={{ unicodeBidi: "isolate" }}>
              {token.text}
            </span>
          );
        }
        return (
          <span key={i} dir="rtl" style={{ unicodeBidi: "isolate" }}>
            <bdi>{token.from}</bdi>
            {token.separator}
            <bdi>{token.to}</bdi>
          </span>
        );
      })}
    </>
  );
}
