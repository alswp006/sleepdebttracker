import { useEffect, useState } from "react";
import { Top, Paragraph, Spacing, Button, Badge, Toast, Asset } from "@toss/tds-mobile";
import { generateHapticFeedback, showFullScreenAd } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { EmptyState, LoadingState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { getRecords, getSettings, getRewardUnlock, setRewardUnlock } from "@/lib/storage";
import { getTotalDebt, buildRecoveryPlan, getWeekKey, type RecoveryPlanDay } from "@/lib/sleepEngine";

const DEFAULT_TARGET_BED_TIME = "23:30";
const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? "";
const AD_FAIL_MESSAGE = "광고 시청 후 플랜을 확인할 수 있어요";
const DAY_LABEL: Record<RecoveryPlanDay["dayOfWeek"], string> = {
  Saturday: "토요일",
  Sunday: "일요일",
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);
  const [targetBedTime, setTargetBedTime] = useState(DEFAULT_TARGET_BED_TIME);
  const [unlocked, setUnlocked] = useState(false);
  const [watching, setWatching] = useState(false);
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const records = Object.values(getRecords());
      setTotalDebt(getTotalDebt(records));
      setTargetBedTime(getSettings()?.targetBedTime ?? DEFAULT_TARGET_BED_TIME);
      setUnlocked(getRewardUnlock().plan !== null);
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function handleWatchAd() {
    if (watching) return;
    fireHaptic("tickWeak");
    setWatching(true);
    setAdError(false);

    const unlockPlan = () => {
      const weekKey = getWeekKey(todayISO());
      setRewardUnlock({ ...getRewardUnlock(), plan: weekKey });
      setUnlocked(true);
      setWatching(false);
    };

    const failWatch = () => {
      setWatching(false);
      setAdError(true);
    };

    try {
      showFullScreenAd({
        slotId: AD_SLOT_ID,
        onEvent: () => unlockPlan(),
        onError: () => failWatch(),
      } as Parameters<typeof showFullScreenAd>[0]);
    } catch {
      failWatch();
    }
  }

  const hasDebt = totalDebt > 0;
  const plan = hasDebt ? buildRecoveryPlan({ totalDebt, targetBedTime }) : null;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>회복 수면 플랜</Top.TitleParagraph>} />}>
      <Spacing size={16} />

      {loading ? (
        <LoadingState rows={4} testId="plan-loading" />
      ) : !hasDebt ? (
        <EmptyState
          icon={<Asset.ContentIcon name="icon-sleep" alt="수면 부채 없음" />}
          title="수면 부채가 없어요! 잘 자고 있어요"
        />
      ) : !unlocked ? (
        <Button variant="fill" display="block" onClick={handleWatchAd} disabled={watching}>
          {watching ? "광고 재생 중..." : "회복 플랜 보기"}
        </Button>
      ) : (
        plan?.days.map((day) => (
          <div key={day.dayOfWeek}>
            <Card testId="plan-card">
              <Paragraph.Text typography="t4">{DAY_LABEL[day.dayOfWeek]}</Paragraph.Text>
              <Spacing size={12} />
              <Paragraph.Text typography="t6">추가 수면</Paragraph.Text>
              <Paragraph.Text typography="t3">{day.additionalMinutes}분</Paragraph.Text>
              <Spacing size={12} />
              <div style={{ display: "flex", gap: 8 }}>
                <Badge size="medium" variant="weak" color="blue">
                  취침 {day.recommendedBedTime}
                </Badge>
                <Badge size="medium" variant="weak" color="blue">
                  기상 {day.recommendedWakeTime}
                </Badge>
              </div>
            </Card>
            <Spacing size={12} />
          </div>
        ))
      )}

      <Spacing size={64} />

      <Toast open={adError} position="bottom" text={AD_FAIL_MESSAGE} />

      <FloatingTabBar
        items={[
          { label: "홈", path: "/" },
          { label: "리포트", path: "/report" },
          { label: "플랜", path: "/plan" },
          { label: "진단", path: "/diagnosis" },
        ]}
      />
    </ScreenScaffold>
  );
}
