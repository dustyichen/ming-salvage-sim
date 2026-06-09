import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateScenarioFile } from "../api";
import type {
  ScenarioCharacter,
  ScenarioCharactersFile,
  ScenarioEvent,
  ScenarioFaction,
} from "../types";

type FileKey = "characters" | "events" | "seed_events";

// 中文字段标签
const CHAR_LABELS: Record<string, string> = {
  name: "姓名",
  office: "官职",
  office_type: "官职类型",
  faction: "派系",
  loyalty: "忠诚",
  ability: "能力",
  integrity: "清廉",
  courage: "胆略",
  style: "风格",
  power_id: "势力",
  diplomacy: "外交",
  martial: "军事",
  stewardship: "治政",
  intrigue: "谋略",
  learning: "学识",
  location: "所在",
  birth_year: "生年",
  status: "状态",
  summary: "简介",
};
const CHAR_INT_FIELDS = new Set([
  "loyalty", "ability", "integrity", "courage",
  "diplomacy", "martial", "stewardship", "intrigue", "learning", "birth_year",
]);
const CHAR_STR_FIELDS = ["name", "office", "office_type", "faction", "style", "power_id", "location", "status", "summary"];
const CHAR_ARR_FIELDS = ["aliases", "personal_skills"];
const CHAR_ARR_LABELS: Record<string, string> = { aliases: "别名", personal_skills: "特长" };

const EVENT_LABELS: Record<string, string> = {
  id: "标识",
  title: "标题",
  kind: "类别",
  summary: "摘要",
  urgency: "紧急度",
  severity: "严重度",
  credibility: "可信度",
  event_type: "事项类型",
  resolve_condition: "达成条件",
  fail_condition: "失败条件",
  trigger_year: "触发年",
  trigger_month: "触发月",
  region_hint: "地区提示",
};
const EVENT_INT_FIELDS = new Set(["urgency", "severity", "credibility", "trigger_year", "trigger_month"]);
const EVENT_STR_FIELDS = ["id", "title", "kind", "summary", "resolve_condition", "fail_condition", "region_hint"];
const EVENT_ARR_FIELDS = ["interests", "audiences", "tags"];
const EVENT_ARR_LABELS: Record<string, string> = { interests: "相关方", audiences: "受众", tags: "标签" };
const EVENT_TYPES = ["situation", "node", "ending"];

const emptyFaction = (): ScenarioFaction => ({ name: "", satisfaction: 50, leverage: 50, agenda: "" });
const emptyCharacter = (): ScenarioCharacter => ({
  name: "", office: "", office_type: "", faction: "",
  loyalty: 50, ability: 50, integrity: 50, courage: 50, style: "", power_id: "ming",
  personal_skills: [], aliases: [],
});
const emptyEvent = (isSeed: boolean): ScenarioEvent => ({
  id: "", title: "", kind: "", summary: "",
  urgency: 50, severity: 50, credibility: 50,
  interests: [], audiences: [], event_type: "node",
  ...(isSeed ? { trigger_gate: {}, auto_trigger: false } : { trigger_year: 0, trigger_month: 0 }),
});

const arrToText = (v: unknown) => (Array.isArray(v) ? v.join("、") : "");
const textToArr = (s: string) =>
  s.split(/[、,，\n]/).map((x) => x.trim()).filter(Boolean);

function NumberInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function ScenarioEditor({
  scenarioId,
  initial,
  initialTab,
  focusKey,
  onClose,
  onSaved,
}: {
  scenarioId: string;
  initial: {
    characters: ScenarioCharactersFile | null;
    events: ScenarioEvent[] | null;
    seed_events: ScenarioEvent[] | null;
  };
  initialTab?: FileKey;
  focusKey?: string; // 人物姓名 / 派系名 / 事件 id，用于定位高亮
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = React.useState<FileKey>(initialTab ?? "characters");
  const [chars, setChars] = React.useState<ScenarioCharactersFile>(
    initial.characters ?? { factions: [], characters: [] }
  );
  const [events, setEvents] = React.useState<ScenarioEvent[]>(initial.events ?? []);
  const [seedEvents, setSeedEvents] = React.useState<ScenarioEvent[]>(initial.seed_events ?? []);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [ok, setOk] = React.useState("");
  const bodyRef = React.useRef<HTMLDivElement>(null);

  // 从预览点进来时，定位+高亮目标记录。
  React.useEffect(() => {
    if (!focusKey) return;
    const t = window.setTimeout(() => {
      const el = bodyRef.current?.querySelector(`[data-focuskey="${CSS.escape(focusKey)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("scenario-record-flash");
        window.setTimeout(() => el.classList.remove("scenario-record-flash"), 1800);
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [focusKey, tab]);

  const saveFile = async (file: FileKey, content: unknown) => {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await updateScenarioFile(scenarioId, file, content);
      setOk(`已保存「${file === "characters" ? "人物" : file === "events" ? "事项" : "候选事项"}」`);
      onSaved();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="menu-modal-bg" onClick={onClose}>
      <div className="menu-modal scenario-editor" onClick={(e) => e.stopPropagation()}>
        <h2>编辑剧本</h2>
        <div className="scenario-tabs">
          <button className={tab === "characters" ? "active" : ""} onClick={() => setTab("characters")}>
            人物（{chars.characters.length}）
          </button>
          <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>
            事项（{events.length}）
          </button>
          <button className={tab === "seed_events" ? "active" : ""} onClick={() => setTab("seed_events")}>
            候选事项（{seedEvents.length}）
          </button>
        </div>

        {err && <div className="menu-error">{err}</div>}
        {ok && <div className="menu-notice">{ok}</div>}

        <div className="scenario-editor-body" ref={bodyRef}>
          {tab === "characters" && (
            <CharactersTab value={chars} onChange={setChars} />
          )}
          {tab === "events" && (
            <EventsTab value={events} isSeed={false} onChange={setEvents} />
          )}
          {tab === "seed_events" && (
            <EventsTab value={seedEvents} isSeed onChange={setSeedEvents} />
          )}
        </div>

        <div className="menu-modal-actions">
          <button onClick={onClose} disabled={busy}>关闭</button>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              saveFile(
                tab,
                tab === "characters" ? chars : tab === "events" ? events : seedEvents
              )
            }
          >
            {busy ? "保存中…" : `保存当前标签`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CharactersTab({
  value,
  onChange,
}: {
  value: ScenarioCharactersFile;
  onChange: (v: ScenarioCharactersFile) => void;
}) {
  const setFaction = (i: number, patch: Partial<ScenarioFaction>) => {
    const factions = value.factions.slice();
    factions[i] = { ...factions[i], ...patch };
    onChange({ ...value, factions });
  };
  const setChar = (i: number, patch: Partial<ScenarioCharacter>) => {
    const characters = value.characters.slice();
    characters[i] = { ...characters[i], ...patch };
    onChange({ ...value, characters });
  };

  return (
    <div>
      <h3 className="scenario-section">派系</h3>
      {value.factions.map((f, i) => (
        <div key={i} className="scenario-record" data-focuskey={f.name || undefined}>
          <div className="scenario-record-head">
            <span>{f.name || "（未命名派系）"}</span>
            <button
              className="scenario-del"
              onClick={() => onChange({ ...value, factions: value.factions.filter((_, j) => j !== i) })}
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="scenario-fields">
            <label>名称<input value={f.name} onChange={(e) => setFaction(i, { name: e.target.value })} /></label>
            <label>满意<NumberInput value={f.satisfaction} onChange={(n) => setFaction(i, { satisfaction: n })} /></label>
            <label>影响<NumberInput value={f.leverage} onChange={(n) => setFaction(i, { leverage: n })} /></label>
            <label className="wide">诉求<input value={f.agenda} onChange={(e) => setFaction(i, { agenda: e.target.value })} /></label>
          </div>
        </div>
      ))}
      <button className="scenario-add" onClick={() => onChange({ ...value, factions: [...value.factions, emptyFaction()] })}>
        <Plus size={14} /> 添加派系
      </button>

      <h3 className="scenario-section">人物</h3>
      {value.characters.map((c, i) => (
        <div key={i} className="scenario-record" data-focuskey={c.name || undefined}>
          <div className="scenario-record-head">
            <span>{c.name || "（未命名人物）"}</span>
            <button
              className="scenario-del"
              onClick={() => onChange({ ...value, characters: value.characters.filter((_, j) => j !== i) })}
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="scenario-fields">
            {CHAR_STR_FIELDS.map((k) => (
              <label key={k} className={k === "summary" ? "wide" : ""}>
                {CHAR_LABELS[k] || k}
                <input value={String(c[k] ?? "")} onChange={(e) => setChar(i, { [k]: e.target.value })} />
              </label>
            ))}
            {[...CHAR_INT_FIELDS].map((k) => (
              <label key={k}>
                {CHAR_LABELS[k] || k}
                <NumberInput value={Number(c[k] ?? 0)} onChange={(n) => setChar(i, { [k]: n })} />
              </label>
            ))}
            {CHAR_ARR_FIELDS.map((k) => (
              <label key={k} className="wide">
                {CHAR_ARR_LABELS[k]}（顿号分隔）
                <input value={arrToText(c[k])} onChange={(e) => setChar(i, { [k]: textToArr(e.target.value) })} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="scenario-add" onClick={() => onChange({ ...value, characters: [...value.characters, emptyCharacter()] })}>
        <Plus size={14} /> 添加人物
      </button>
    </div>
  );
}

function EventsTab({
  value,
  isSeed,
  onChange,
}: {
  value: ScenarioEvent[];
  isSeed: boolean;
  onChange: (v: ScenarioEvent[]) => void;
}) {
  const setEvent = (i: number, patch: Partial<ScenarioEvent>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const gateKey = isSeed ? "trigger_gate" : "require";
  const gateLabel = isSeed ? "触发门槛 trigger_gate" : "前提门槛 require";

  return (
    <div>
      {value.map((ev, i) => (
        <div key={i} className="scenario-record" data-focuskey={ev.id || undefined}>
          <div className="scenario-record-head">
            <span>{ev.title || ev.id || "（未命名事项）"}</span>
            <button className="scenario-del" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 size={14} />
            </button>
          </div>
          <div className="scenario-fields">
            {EVENT_STR_FIELDS.map((k) => (
              <label key={k} className={k === "summary" || k.endsWith("condition") ? "wide" : ""}>
                {EVENT_LABELS[k] || k}
                <input value={String(ev[k] ?? "")} onChange={(e) => setEvent(i, { [k]: e.target.value })} />
              </label>
            ))}
            <label>
              {EVENT_LABELS.event_type}
              <select value={ev.event_type} onChange={(e) => setEvent(i, { event_type: e.target.value as ScenarioEvent["event_type"] })}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {[...EVENT_INT_FIELDS].filter((k) => isSeed ? !k.startsWith("trigger_") : true).map((k) => (
              <label key={k}>
                {EVENT_LABELS[k] || k}
                <NumberInput value={Number(ev[k] ?? 0)} onChange={(n) => setEvent(i, { [k]: n })} />
              </label>
            ))}
            {EVENT_ARR_FIELDS.map((k) => (
              <label key={k} className="wide">
                {EVENT_ARR_LABELS[k]}（顿号分隔）
                <input value={arrToText(ev[k])} onChange={(e) => setEvent(i, { [k]: textToArr(e.target.value) })} />
              </label>
            ))}
            {isSeed && (
              <label>
                auto_trigger（硬触发）
                <select value={ev.auto_trigger ? "1" : "0"} onChange={(e) => setEvent(i, { auto_trigger: e.target.value === "1" })}>
                  <option value="0">否</option>
                  <option value="1">是</option>
                </select>
              </label>
            )}
            <GateField
              label={gateLabel}
              value={(ev as any)[gateKey]}
              onChange={(parsed) => setEvent(i, { [gateKey]: parsed })}
            />
          </div>
        </div>
      ))}
      <button className="scenario-add" onClick={() => onChange([...value, emptyEvent(isSeed)])}>
        <Plus size={14} /> 添加{isSeed ? "候选事项" : "事项"}
      </button>
    </div>
  );
}

// 门槛字段：校验过的 JSON 文本框。保存前 JSON.parse；后端再用 validate_gate_expr 兜底。
function GateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (parsed: unknown) => void;
}) {
  const [text, setText] = React.useState(() => JSON.stringify(value ?? {}, null, 0));
  const [localErr, setLocalErr] = React.useState("");
  return (
    <label className="wide">
      {label}
      <small className="menu-hint">
        布尔条件树 JSON，如 {"{"}"民心": "&lt;=44"{"}"} 或 {"{"}"and": [...]{"}"}。空对象 {"{}"} = 无条件。
      </small>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : {};
            setLocalErr("");
            onChange(parsed);
          } catch {
            setLocalErr("JSON 格式错误，请修正后再保存。");
          }
        }}
      />
      {localErr && <span className="menu-error">{localErr}</span>}
    </label>
  );
}
