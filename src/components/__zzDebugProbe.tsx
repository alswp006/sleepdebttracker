import { useLocation } from "react-router-dom";

export function DebugProbe() {
  const location = useLocation();
  return null as any;
}

export function DebugProbeLog({ onLoc }: { onLoc: (l: any) => void }) {
  const location = useLocation();
  onLoc(location);
  return null;
}
