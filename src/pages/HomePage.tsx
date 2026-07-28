import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Chip, Button, Asset, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Card } from "@/components/Card";
import { Sparkline } from "@/components/Sparkline";
import { EmptyState, LoadingState } from "@/components/StateView";
import { AdSlot } from "@/components/AdSlot";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { getRecords, getStreak } from "@/lib/storage";
import { getTotalDebt, getPayoffDays } from "@/lib/sleepEngine";
import type { RouteState, SleepRecord } from "@/lib/types";

const RECOVERY_RATE_PER_DAY_MINUTES = 30;
const SPARKLINE_DAYS = 7;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDebtHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function buildRecentDebtTrend(records: Record<string, SleepRecord>): number[] {
  const today = new Date();
  const days: number[] = [];
  for (let i = SPARKLINE_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const id = `${y}-${m}-${day}`;
    days.push(records[id]?.debtMinutes ?? 0);
  }
  return days;
}

function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const routeState = (useLocation().state as RouteState["/"]) ?? undefined;

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record<string, SleepRecord>>({});
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRecords(getRecords());
      setStreakCount(getStreak().currentStreak);
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const recordList = Object.values(records);
  const isEmpty = !loading && recordList.length === 0;
  const totalDebtMinutes = getTotalDebt(recordList);
  const payoffDays = getPayoffDays(totalDebtMinutes, RECOVERY_RATE_PER_DAY_MINUTES);
  const today = todayISO();
  const hasTodayRecord = Boolean(records[today]);

  const streakLabel = streakCount > 0 ? `🔥 ${streakCount}일 연속` : "기록을 시작해보세요";

  function handleTodayClick() {
    fireHaptic("success");
    navigate("/input", { state: { date: today } });
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>수면 부채</Top.TitleParagraph>} />}>
      <div data-testid="streak-badge">
        <Chip>{streakLabel}</Chip>
      </div>

      <Spacing size={16} />

      {loading ? (
        <>
          <LoadingState rows={3} testId="home-loading" />
          <Paragraph.Text typography="t2">—</Paragraph.Text>
        </>
      ) : isEmpty ? (
        <EmptyState
          icon={<Asset.ContentIcon name="icon-sleep" alt="빈 기록" />}
          title="아직 기록이 없어요"
          description="첫 수면을 기록해보세요"
          action={
            <Button variant="weak" onClick={handleTodayClick}>
              첫 수면 기록하기
            </Button>
          }
        />
      ) : (
        <>
          <SummaryHero
            testId="debt-hero"
            label="누적 수면 부채"
            value={<Paragraph.Text typography="t2">{formatDebtHM(totalDebtMinutes)}</Paragraph.Text>}
            caption={`약 ${payoffDays}일 후 상환 완료`}
          />

          <Spacing size={16} />

          <Card testId="debt-sparkline">
            <Paragraph.Text typography="t4">최근 7일 추이</Paragraph.Text>
            <Spacing size={8} />
            <Sparkline data={buildRecentDebtTrend(records)} />
          </Card>

          <Spacing size={12} />

          <Card testId="payoff-card">
            <Paragraph.Text typography="t3">{`약 ${payoffDays}일 후 상환 완료`}</Paragraph.Text>
          </Card>

          {!hasTodayRecord ? (
            <>
              <Spacing size={16} />
              <Paragraph.Text typography="t6">오늘 수면을 기록해보세요</Paragraph.Text>
              <Spacing size={8} />
              <Button variant="fill" display="block" onClick={handleTodayClick}>
                오늘 기록하기
              </Button>
            </>
          ) : null}
        </>
      )}

      <Spacing size={24} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />
      <Spacing size={64} />

      <Toast open={Boolean(routeState?.toast)} position="bottom" text={routeState?.toast ?? ""} />

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
