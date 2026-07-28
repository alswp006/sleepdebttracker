import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, TextField, Spacing, AlertDialog, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { saveRecord } from "@/lib/storage";
import { computeSleep } from "@/lib/sleepEngine";
import type { RouteState } from "@/lib/types";

const TARGET_SLEEP_MINUTES = 480;
const SHORT_SLEEP_THRESHOLD_MINUTES = 60;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fireHaptic(type: "success" | "error") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function InputPage() {
  const navigate = useNavigate();
  const state = (useLocation().state as RouteState["/input"]) ?? null;

  const [date, setDate] = useState(state?.date ?? todayISO());
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [futureErr, setFutureErr] = useState(false);
  const [emptyErr, setEmptyErr] = useState(false);
  const [shortSleepOpen, setShortSleepOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  function persist() {
    setSaving(true);
    saveRecord({ id: date, bedTime, wakeTime }, TARGET_SLEEP_MINUTES);
    setToastOpen(true);
    navigate("/", { state: { toast: "기록이 저장됐어요" } });
  }

  function handleSubmit() {
    if (date > todayISO()) {
      setFutureErr(true);
      return;
    }
    setFutureErr(false);

    if (!bedTime || !wakeTime) {
      setEmptyErr(true);
      return;
    }
    setEmptyErr(false);

    const { sleepMinutes } = computeSleep({ bedTime, wakeTime }, TARGET_SLEEP_MINUTES);
    if (sleepMinutes < SHORT_SLEEP_THRESHOLD_MINUTES) {
      fireHaptic("error");
      setShortSleepOpen(true);
      return;
    }

    persist();
  }

  function handleConfirmShortSleep() {
    setShortSleepOpen(false);
    persist();
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>오늘 수면 기록</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="기록 저장" onClick={handleSubmit} disabled={saving} />}
    >
      <TextField
        variant="box"
        type="date"
        label="날짜"
        aria-label="날짜"
        placeholder={todayISO()}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        hasError={futureErr}
        help={futureErr ? "미래 날짜는 기록할 수 없어요" : "오늘까지만 기록할 수 있어요"}
      />
      <Spacing size={12} />
      <TextField
        variant="box"
        type="time"
        label="취침 시간"
        aria-label="취침 시간"
        placeholder="23:30"
        value={bedTime}
        onChange={(e) => setBedTime(e.target.value)}
      />
      <Spacing size={12} />
      <TextField
        variant="box"
        type="time"
        label="기상 시간"
        aria-label="기상 시간"
        placeholder="06:30"
        value={wakeTime}
        onChange={(e) => setWakeTime(e.target.value)}
        hasError={emptyErr}
        help={emptyErr ? "취침·기상 시간을 모두 입력해주세요" : undefined}
      />

      <AlertDialog
        open={shortSleepOpen}
        title="수면 시간이 1시간 미만이에요"
        description="이대로 저장할까요?"
        onClose={() => setShortSleepOpen(false)}
        alertButton={
          <AlertDialog.AlertButton onClick={handleConfirmShortSleep}>
            저장할게요
          </AlertDialog.AlertButton>
        }
      />

      <Toast open={toastOpen} position="bottom" text="기록을 저장했어요" />
    </ScreenScaffold>
  );
}
