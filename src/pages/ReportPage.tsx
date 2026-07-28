import { useEffect, useState } from "react";
import { Top, Paragraph, Spacing, Button, Asset, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback, showFullScreenAd } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { EmptyState, LoadingState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { getRecords, getRewardUnlock, setRewardUnlock } from "@/lib/storage";
import { getWeekKey } from "@/lib/sleepEngine";
import type { SleepRecord } from "@/lib/types";

const TARGET_SLEEP_MINUTES = 480;
const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? "";
const AD_FAIL_MESSAGE = "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function getWeekDates(dateISO: string): string[] {
  const [y, m, d] = dateISO.split("-").map(Number);
  const monday = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (monday.getUTCDay() + 6) % 7; // 0 = Monday
  monday.setUTCDate(monday.getUTCDate() - dayNum);

  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setUTCDate(monday.getUTCDate() + i);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  });
}

function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function ReportPage() {
  const [loading, setLoading] = useState(true);
  const [weekRecords, setWeekRecords] = useState<Record<string, SleepRecord>>({});
  const [unlocked, setUnlocked] = useState(false);
  const [watching, setWatching] = useState(false);
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    const weekKey = getWeekKey(todayISO());
    const timer = setTimeout(() => {
      const records = getRecords();
      const filtered = Object.fromEntries(
        Object.entries(records).filter(([id]) => getWeekKey(id) === weekKey)
      );
      setWeekRecords(filtered);
      setUnlocked(getRewardUnlock().report === weekKey);
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function handleWatchAd() {
    fireHaptic("tickWeak");
    setWatching(true);
    setAdError(false);

    const unlockThisWeek = () => {
      const weekKey = getWeekKey(todayISO());
      setRewardUnlock({ ...getRewardUnlock(), report: weekKey });
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
        onEvent: () => unlockThisWeek(),
        onError: () => failWatch(),
      } as Parameters<typeof showFullScreenAd>[0]);
    } catch {
      failWatch();
    }
  }

  const recordList = Object.values(weekRecords);
  const hasRecords = recordList.length > 0;
  const totalDebtMinutes = recordList.reduce((acc, r) => acc + Math.max(0, r.debtMinutes), 0);
  const avgSleepMinutes = hasRecords
    ? Math.round(recordList.reduce((acc, r) => acc + r.sleepMinutes, 0) / recordList.length)
    : 0;
  const weekDates = getWeekDates(todayISO());

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>주간 리포트</Top.TitleParagraph>} />}>
      <Spacing size={16} />

      {loading ? (
        <LoadingState rows={4} testId="report-loading" />
      ) : !hasRecords ? (
        <EmptyState
          icon={<Asset.ContentIcon name="icon-sleep" alt="이번 주 기록 없음" />}
          title="이번 주 기록이 없어요"
          description="수면을 기록하면 주간 리포트를 볼 수 있어요"
        />
      ) : !unlocked ? (
        <Button variant="fill" display="block" onClick={handleWatchAd} disabled={watching}>
          {watching ? "광고 재생 중..." : "주간 리포트 보기"}
        </Button>
      ) : (
        <>
          <Card testId="weekly-summary">
            <Paragraph.Text typography="t4">이번 주 요약</Paragraph.Text>
            <Spacing size={12} />
            <Paragraph.Text typography="t6">이번 주 부채</Paragraph.Text>
            <Paragraph.Text typography="t2">{formatHoursMinutes(totalDebtMinutes)}</Paragraph.Text>
            <Spacing size={12} />
            <Paragraph.Text typography="t6">평균 수면</Paragraph.Text>
            <Paragraph.Text typography="t2">{formatHoursMinutes(avgSleepMinutes)}</Paragraph.Text>
          </Card>

          <Spacing size={16} />

          <Card testId="weekly-bars">
            <Paragraph.Text typography="t4">최근 7일</Paragraph.Text>
            <Spacing size={12} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weekDates.map((date) => (
                <MiniBar
                  key={date}
                  ratio={(weekRecords[date]?.sleepMinutes ?? 0) / TARGET_SLEEP_MINUTES}
                  testId={`weekly-bar-${date}`}
                />
              ))}
            </div>
          </Card>
        </>
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
