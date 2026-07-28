import { useLocation, UNSAFE_LocationContext } from "react-router-dom";
import React from "react";

export const importedLocationContext = UNSAFE_LocationContext;
export const importedReact = React;

export function ImportedProbe() {
  const loc = useLocation();
  const ctxVal = React.useContext(UNSAFE_LocationContext);
  // eslint-disable-next-line no-console
  console.log(
    "IMPORTED_PROBE pathname=", loc.pathname,
    "ctxObjId=", (UNSAFE_LocationContext as any)._id ?? "n/a",
    "ctxVal=", JSON.stringify((ctxVal as any)?.location?.pathname),
  );
  return null;
}
