import { useState } from "react";
import { flushSync } from "react-dom";
import { Top, Paragraph, Spacing, Button, Badge, Chip } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { getItem, setItem, removeItem } from "@/lib/storage";
import { SDT_KEYS } from "@/lib/types";

type Chronotype = "MORNING" | "INTERMEDIATE" | "EVENING";
type Choice = "morning" | "evening";

interface StoredChronotypeResult {
  type: Chronotype;
  score: number;
  answeredAt: number;
}

interface Question {
  id: number;
  text: string;
  morningLabel: string;
  eveningLabel: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "평일 기상 시간은 언제에 가까운가요?",
    morningLabel: "오전 6시 전에 눈이 떠져요",
    eveningLabel: "오전 8시는 지나야 눈이 떠져요",
  },
  {
    id: 2,
    text: "집중이 가장 잘 되는 시간대는?",
    morningLabel: "오전 시간대",
    eveningLabel: "밤 시간대",
  },
  {
    id: 3,
    text: "졸음이 몰려오는 시간은?",
    morningLabel: "밤 10시 전에 졸려요",
    eveningLabel: "새벽 1시는 지나야 졸려요",
  },
  {
    id: 4,
    text: "주말 기상 시간은 평일과 비슷한가요?",
    morningLabel: "네, 늦잠을 잘 안 자요",
    eveningLabel: "주말엔 늦게까지 자요",
  },
  {
    id: 5,
    text: "밤 늦은 약속 다음 날 컨디션은?",
    morningLabel: "다음 날이 부담돼요",
    eveningLabel: "다음 날도 거뜬해요",
  },
];

const TYPE_LABEL: Record<Chronotype, string> = {
  MORNING: "아침형",
  INTERMEDIATE: "중간형",
  EVENING: "저녁형",
};

const TYPE_DESCRIPTION: Record<Chronotype, string> = {
  MORNING: "아침에 컨디션이 가장 좋아요. 저녁엔 일찍 잠자리에 드는 게 잘 맞아요.",
  INTERMEDIATE: "아침저녁 컨디션 차이가 크지 않아요. 규칙적인 수면 시간이 도움이 돼요.",
  EVENING: "밤에 집중력이 오르는 편이에요. 아침엔 컨디션을 끌어올릴 시간이 필요해요.",
};

export function classifyChronotype(score: number): Chronotype {
  if (score >= 67) return "MORNING";
  if (score >= 34) return "INTERMEDIATE";
  return "EVENING";
}

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function ChoiceOption({
  testId,
  label,
  selected,
  onSelect,
}: {
  testId: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div data-testid={testId} onClick={onSelect} style={{ flex: 1 }}>
      <Button variant={selected ? "fill" : "weak"} display="block">
        {label}
      </Button>
    </div>
  );
}

export default function DiagnosisPage() {
  const [answers, setAnswers] = useState<Record<number, Choice>>({});
  const [result, setResult] = useState<StoredChronotypeResult | null>(() =>
    getItem<StoredChronotypeResult>(SDT_KEYS.chronotype)
  );
  const [error, setError] = useState(false);

  function handleSelect(questionId: number, choice: Choice) {
    fireHaptic();
    flushSync(() => {
      setAnswers((prev) => ({ ...prev, [questionId]: choice }));
    });
  }

  function handleSubmit() {
    if (Object.keys(answers).length < QUESTIONS.length) {
      flushSync(() => setError(true));
      return;
    }
    const score = QUESTIONS.reduce(
      (sum, q) => sum + (answers[q.id] === "morning" ? 20 : 0),
      0
    );
    const saved: StoredChronotypeResult = {
      type: classifyChronotype(score),
      score,
      answeredAt: Date.now(),
    };
    setItem(SDT_KEYS.chronotype, saved);
    flushSync(() => {
      setError(false);
      setResult(saved);
    });
  }

  function handleRetry() {
    removeItem(SDT_KEYS.chronotype);
    flushSync(() => {
      setAnswers({});
      setError(false);
      setResult(null);
    });
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>수면 유형 진단</Top.TitleParagraph>} />}>
      <Spacing size={16} />

      {result ? (
        <>
          <Card testId="chronotype-result">
            <Badge size="medium" variant="fill" color="blue">
              {TYPE_LABEL[result.type]}
            </Badge>
            <Spacing size={12} />
            <Paragraph.Text typography="t5">{TYPE_DESCRIPTION[result.type]}</Paragraph.Text>
          </Card>
          <Spacing size={16} />
          <Button variant="weak" display="block" onClick={handleRetry}>
            다시 검사하기
          </Button>
        </>
      ) : (
        <>
          <Chip>{`${answeredCount} / ${QUESTIONS.length}`}</Chip>
          <Spacing size={16} />

          {QUESTIONS.map((q) => (
            <div key={q.id}>
              <Card>
                <Paragraph.Text typography="t5">{q.text}</Paragraph.Text>
                <Spacing size={12} />
                <div style={{ display: "flex", gap: 8 }}>
                  <ChoiceOption
                    testId={`diagnosis-q${q.id}-morning`}
                    label={q.morningLabel}
                    selected={answers[q.id] === "morning"}
                    onSelect={() => handleSelect(q.id, "morning")}
                  />
                  <ChoiceOption
                    testId={`diagnosis-q${q.id}-evening`}
                    label={q.eveningLabel}
                    selected={answers[q.id] === "evening"}
                    onSelect={() => handleSelect(q.id, "evening")}
                  />
                </div>
              </Card>
              <Spacing size={12} />
            </div>
          ))}

          {error && (
            <>
              <Paragraph.Text typography="st13">모든 문항에 답해주세요</Paragraph.Text>
              <Spacing size={12} />
            </>
          )}

          <Button variant="fill" display="block" onClick={handleSubmit}>
            결과 보기
          </Button>
        </>
      )}

      <Spacing size={64} />

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
