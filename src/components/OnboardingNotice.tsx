import { useState } from "react";
import { AlertDialog } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { getSettings, setSettings } from "@/lib/storage";
import type { UserSettings } from "@/lib/types";

// getSettings()가 null일 때(최초 실행) onboardedAt를 채워 저장하기 위한 기본값.
const DEFAULT_SETTINGS: UserSettings = {
  targetSleepMinutes: 480,
  targetBedTime: "23:00",
  targetWakeTime: "07:00",
  notificationEnabled: false,
  darkModeEnabled: false,
  updatedAt: 0,
};

/**
 * 첫 진입 시 서비스 안내를 1회 보여주고 onboardedAt를 저장한다.
 * onboardedAt가 이미 있으면 아무것도 렌더하지 않는다.
 * (결정론적 계산 앱이라 생성형 AI 고지는 불필요 — 이용 안내만 제공)
 */
export default function OnboardingNotice() {
  const [open, setOpen] = useState(() => getSettings()?.onboardedAt == null);

  const dismiss = () => {
    const now = Date.now();
    const base = getSettings() ?? DEFAULT_SETTINGS;
    setSettings({ ...base, onboardedAt: now, updatedAt: now });
    try {
      generateHapticFeedback({ type: "success" });
    } catch {
      // 토스 네이티브 브릿지 밖(로컬/검수 PC)에서는 throw — 조용히 무시
    }
    setOpen(false);
  };

  return (
    <AlertDialog
      open={open}
      title="수면 부채 트래커를 소개할게요"
      description="매일 잠든·일어난 시간을 기록하면 쌓인 수면 부채와 회복 플랜을 확인할 수 있어요. 기록은 이 기기에만 저장돼요."
      onClose={dismiss}
      alertButton={
        <AlertDialog.AlertButton onClick={dismiss}>확인</AlertDialog.AlertButton>
      }
    />
  );
}
