import React from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import { formatClosedEffect, formatIssueEffect, issueTone } from "../format";
import type { ClosedIssue, Issue } from "../types";

// 局势分组：长期(贯穿一朝大计) vs 近期。纯前端按 fail_condition 文案判定。
export function groupIssues(issues: Issue[]) {
  const active = issues.filter((i) => i.kind === "situation" || i.kind === "initiative");
  const bySeq = (a: Issue, b: Issue) => {
    if (a.kind !== b.kind) return a.kind === "initiative" ? -1 : 1;
    return a.id - b.id;
  };
  const isLongTerm = (i: Issue) => /甲申|贯穿一朝|倾国之大计/.test(i.fail_condition || "");
  return {
    active,
    longTerm: active.filter(isLongTerm).sort(bySeq),
    nearTerm: active.filter((i) => !isLongTerm(i)).sort(bySeq),
  };
}

export function SituationPanel({ issues, closedIssues, hasLegacies, compact = false, onOpenDrawer }: {
  issues: Issue[];
  closedIssues: ClosedIssue[];
  hasLegacies: boolean;
  compact?: boolean;
  onOpenDrawer?: () => void;
}) {
  const { active, longTerm, nearTerm } = groupIssues(issues);
  if (!active.length && !closedIssues.length) return null;
  const compactLimit = 6;
  const shownClosed = compact ? closedIssues.slice(0, Math.min(2, compactLimit)) : closedIssues;
  const remainingCompactSlots = Math.max(0, compactLimit - shownClosed.length);
  const shownLongTerm = compact ? longTerm.slice(0, Math.min(2, remainingCompactSlots)) : longTerm;
  const shownNearTerm = compact ? nearTerm.slice(0, Math.max(0, remainingCompactSlots - shownLongTerm.length)) : nearTerm;
  const totalCount = active.length + closedIssues.length;
  const shownCount = shownClosed.length + shownLongTerm.length + shownNearTerm.length;
  const hiddenCount = Math.max(0, totalCount - shownCount);
  return (
    <aside
      className={`situation-panel ${hasLegacies ? "with-legacies" : ""} ${compact ? "compact" : ""}`}
      aria-label="局势进度"
    >
      {shownClosed.length ? (
        <div className="situation-closed-list">
          {shownClosed.map((ci) => (
            <div className={`situation-closed-row ${ci.status}`} key={`closed-${ci.id}`} tabIndex={0}>
              <div className="situation-closed-head">
                <span className="situation-closed-badge">{ci.status === "resolved" ? "已结案" : ci.status === "failed" ? "已崩坏" : "已撤"}</span>
                <span className="situation-closed-name">{ci.title}</span>
              </div>
              <div className="situation-closed-effect">{formatClosedEffect(ci.effect)}</div>
            </div>
          ))}
        </div>
      ) : null}
      {shownLongTerm.length ? (
        <div className="situation-group">
          <div className="situation-group-title">长期局势</div>
          <div className="situation-list">
            {shownLongTerm.map((issue) => <SituationRow key={issue.id} issue={issue} />)}
          </div>
        </div>
      ) : null}
      {shownNearTerm.length ? (
        <div className="situation-group">
          <div className="situation-group-title">近期局势</div>
          <div className="situation-list">
            {shownNearTerm.map((issue) => <SituationRow key={issue.id} issue={issue} />)}
          </div>
        </div>
      ) : null}
      {compact && hiddenCount > 0 ? (
        <button
          type="button"
          className="situation-more-hint"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDrawer?.();
          }}
        >
          共 {totalCount} 条，余 {hiddenCount} 条 · 查看全部
        </button>
      ) : null}
    </aside>
  );
}

export function SituationDrawer({ open, issues, closedIssues, onClose, maxDecreeIssues = 10, onChanged }: {
  open: boolean;
  issues: Issue[];
  closedIssues: ClosedIssue[];
  onClose: () => void;
  maxDecreeIssues?: number;
  onChanged?: () => void | Promise<void>;
}) {
  const { active, longTerm, nearTerm } = groupIssues(issues);
  const manualCount = active.filter((i) => i.is_manual).length;
  const [editor, setEditor] = React.useState<{ mode: "create" } | { mode: "edit"; issue: Issue } | null>(null);
  return (
    <>
      <div className={`situation-drawer-scrim ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`situation-drawer ${open ? "open" : ""}`} aria-label="局势进度抽屉" aria-hidden={!open}>
        <div className="situation-drawer-head">
          <div>
            <strong>局势进度</strong>
            <span>{active.length} 条在办 · {closedIssues.length} 条本回合结案</span>
          </div>
          <button onClick={onClose} aria-label="关闭局势抽屉">×</button>
        </div>
        <div className="situation-drawer-body">
          <div className="situation-manual-bar">
            <span className="situation-manual-count">手动局势 {manualCount} / {maxDecreeIssues}</span>
            <button
              type="button"
              className="situation-manual-add"
              disabled={manualCount >= maxDecreeIssues}
              title={manualCount >= maxDecreeIssues ? "已达上限，可在主菜单游戏设置调高" : "手动新建一条局势"}
              onClick={() => setEditor({ mode: "create" })}
            >
              ＋ 新建局势
            </button>
          </div>
          {manualCount >= maxDecreeIssues ? (
            <p className="situation-manual-hint">已达上限（{maxDecreeIssues}）。可在主菜单「游戏设置」调高，但会增加推演 token 消耗。</p>
          ) : null}
          {closedIssues.length ? (
            <section className="situation-drawer-section">
              <h3>本回合结案</h3>
              {closedIssues.map((ci) => (
                <article className={`situation-drawer-closed ${ci.status}`} key={`drawer-closed-${ci.id}`}>
                  <div className="situation-drawer-closed-head">
                    <b>{ci.status === "resolved" ? "已结案" : ci.status === "failed" ? "已崩坏" : "已撤"}</b>
                    <span>{ci.title}</span>
                  </div>
                  <p>{formatClosedEffect(ci.effect)}</p>
                </article>
              ))}
            </section>
          ) : null}
          <SituationDrawerGroup title="长期局势" issues={longTerm} onEdit={(i) => setEditor({ mode: "edit", issue: i })} onChanged={onChanged} />
          <SituationDrawerGroup title="近期局势" issues={nearTerm} onEdit={(i) => setEditor({ mode: "edit", issue: i })} onChanged={onChanged} />
        </div>
      </aside>
      {editor ? (
        <ManualIssueEditor
          editing={editor.mode === "edit" ? editor.issue : null}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await onChanged?.();
          }}
        />
      ) : null}
    </>
  );
}

function SituationDrawerGroup({ title, issues, onEdit, onChanged }: {
  title: string;
  issues: Issue[];
  onEdit?: (issue: Issue) => void;
  onChanged?: () => void | Promise<void>;
}) {
  if (!issues.length) return null;
  return (
    <section className="situation-drawer-section">
      <h3>{title}</h3>
      {issues.map((issue) => (
        <SituationDrawerRow issue={issue} key={`drawer-${issue.id}`} onEdit={onEdit} onChanged={onChanged} />
      ))}
    </section>
  );
}

function SituationDrawerRow({ issue, onEdit, onChanged }: {
  issue: Issue;
  onEdit?: (issue: Issue) => void;
  onChanged?: () => void | Promise<void>;
}) {
  const [detail, setDetail] = React.useState(false);
  const onDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定删除手动局势〔${issue.title}〕？`)) return;
    try {
      await api(`/api/issues/manual/${issue.id}`, { method: "DELETE" });
      await onChanged?.();
    } catch (err: any) {
      window.alert(err?.message || "删除失败");
    }
  };
  return (
    <>
      <article
        className={`situation-drawer-row ${issueTone(issue.bar_value)}`}
        role="button"
        tabIndex={0}
        onClick={() => setDetail(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetail(true);
          }
        }}
      >
        <div className="situation-drawer-row-head">
          <b>{issue.title}{issue.is_manual ? <span className="situation-manual-tag">手动</span> : null}</b>
          <span>{issue.bar_value}</span>
        </div>
        <div className="situation-bar">
          <i style={{ width: `${Math.max(0, Math.min(100, issue.bar_value))}%` }} />
        </div>
        <p>{issue.stage_text}</p>
        {issue.is_manual ? (
          <div className="situation-manual-actions" onClick={(e) => e.stopPropagation()}>
            <span className="situation-manual-dur">
              {issue.duration_turns ? `持续 ${issue.duration_turns} 回合` : "无期限"}
            </span>
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit?.(issue); }}>编辑</button>
            <button type="button" className="danger" onClick={onDelete}>删除</button>
          </div>
        ) : null}
      </article>
      {detail ? <SituationDetailModal issue={issue} onClose={() => setDetail(false)} /> : null}
    </>
  );
}

// 手动局势新建/编辑弹窗：仅目标(title) + 持续回合数；无成功/失败奖励。
function ManualIssueEditor({ editing, onClose, onSaved }: {
  editing: Issue | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = React.useState(editing?.title || "");
  const [duration, setDuration] = React.useState<number>(editing?.duration_turns || 0);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const save = async () => {
    if (!title.trim()) { setErr("目标不能为空"); return; }
    setBusy(true);
    setErr("");
    try {
      if (editing) {
        await api(`/api/issues/manual/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: title.trim(), duration_turns: duration }),
        });
      } else {
        await api("/api/issues/manual", {
          method: "POST",
          body: JSON.stringify({ title: title.trim(), duration_turns: duration }),
        });
      }
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "保存失败");
      setBusy(false);
    }
  };
  return createPortal(
    <div className="situation-detail-backdrop" onClick={onClose}>
      <div className="situation-detail manual-issue-editor" onClick={(e) => e.stopPropagation()}>
        <div className="situation-detail-head">
          <span>{editing ? "编辑手动局势" : "新建手动局势"}</span>
          <button className="situation-detail-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="manual-issue-form">
          {err ? <div className="manual-issue-err">{err}</div> : null}
          <label>
            目标
            <input
              type="text"
              value={title}
              maxLength={60}
              placeholder="如：整饬蓟镇军备"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            持续回合数
            <input
              type="number"
              min={0}
              max={120}
              value={duration}
              onChange={(e) => setDuration(Math.max(0, Number(e.target.value) || 0))}
            />
            <small className="manual-issue-hint">0 = 无期限；&gt;0 到期自动撤销。手动局势无成功/失败奖励。</small>
          </label>
          <div className="manual-issue-actions">
            <button onClick={onClose} disabled={busy}>取消</button>
            <button className="primary" onClick={save} disabled={busy}>{busy ? "保存中…" : "保存"}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SituationRow({ issue }: { issue: Issue }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = React.useState<{ x: number; y: number } | null>(null);
  const [detail, setDetail] = React.useState(false);
  const suppressRef = React.useRef(false);  // 关弹窗后抑制 tip，直到鼠标移出再进
  const showTip = () => {
    if (detail || suppressRef.current) return;
    const r = ref.current?.getBoundingClientRect();
    if (r) setTipPos({ x: r.right + 12, y: r.top });
  };
  const hideTip = () => { setTipPos(null); suppressRef.current = false; };  // 鼠标移出，解抑制
  const closeDetail = () => {
    setDetail(false);
    setTipPos(null);
    suppressRef.current = true;  // 关弹窗时鼠标多半还在行上，抑制到下次移出
  };
  return (
    <div ref={ref} className={`situation-row ${issueTone(issue.bar_value)}`} tabIndex={0}
      onClick={() => {
        setDetail(true);
        setTipPos(null);
      }} role="button"
      onMouseEnter={showTip} onMouseLeave={hideTip} onFocus={showTip} onBlur={hideTip}>
      <div className="situation-row-head">
        <span className="situation-name">{issue.title}</span>
        <b>{issue.bar_value}</b>
      </div>
      <div className="situation-bar">
        <i style={{ width: `${Math.max(0, Math.min(100, issue.bar_value))}%` }} />
      </div>
      {tipPos && !detail ? <SituationTip issue={issue} pos={tipPos} /> : null}
      {detail ? <SituationDetailModal issue={issue} onClose={closeDetail} /> : null}
    </div>
  );
}


// 局势悬浮框（精简）：只显数值，hover 触发。详细达成/失败点击弹窗看
export function SituationTip({ issue, pos }: { issue: Issue; pos: { x: number; y: number } }) {
  const W = 280, vw = window.innerWidth, vh = window.innerHeight;
  const left = pos.x + W > vw ? Math.max(8, pos.x - W - 24) : pos.x;
  const top = Math.min(pos.y, vh - 200);
  return createPortal(
    <div className="situation-tip-float" style={{ left, top: Math.max(8, top) }}>
        <div className="situation-tip-float-head">#{issue.id} {issue.title}</div>
        <div className="situation-tip-inner">
        <div className="situation-tip-row"><span>阶段</span><b>{issue.phase}</b></div>
        <div className="situation-tip-row"><span>进度</span><b>{issue.bar_value} / 100</b></div>
        <div className="situation-tip-row">
          <span>月度推进</span>
          <b>{issue.inertia > 0 ? `+${issue.inertia}` : issue.inertia}/月</b>
        </div>
        <div className="situation-tip-row">
          <span>当前影响</span>
          <b>{issue.ongoing_text || "无"}</b>
        </div>
        <p className="situation-tip-stage">{issue.stage_text}</p>
        <div className="situation-tip-more">点击查看达成 / 失败条件</div>
        </div>
    </div>,
    document.body
  );
}


// 局势详情弹窗（点击）：完整达成/失败条件 + 标签。居中模态，Portal 脱离梯形
export function SituationDetailModal({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  return createPortal(
    <div className="situation-detail-backdrop" onClick={onClose}>
      <div className="situation-detail" onClick={(e) => e.stopPropagation()}>
        <div className="situation-detail-head">
          <span>#{issue.id} {issue.title}</span>
          <button className="situation-detail-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="situation-tip-inner">
        <div className="situation-tip-row"><span>阶段</span><b>{issue.phase}</b></div>
        <div className="situation-tip-row"><span>进度</span><b>{issue.bar_value} / 100</b></div>
        <div className="situation-tip-row">
          <span>月度推进</span>
          <b>{issue.inertia > 0 ? `+${issue.inertia}` : issue.inertia}/月</b>
        </div>
        <div className="situation-tip-row">
          <span>当前影响</span>
          <b>{issue.ongoing_text || "无"}</b>
        </div>
        <p className="situation-tip-stage">{issue.stage_text}</p>
        <div className="situation-tip-outcome good">
          <div className="situation-tip-outcome-head">达成（{issue.bar_good_meaning}）</div>
          {issue.resolve_condition && <p>{issue.resolve_condition}</p>}
          <div className="situation-tip-effect">{formatIssueEffect(issue.effect_on_resolve)}</div>
        </div>
        <div className="situation-tip-outcome bad">
          <div className="situation-tip-outcome-head">失败（{issue.bar_bad_meaning}）</div>
          {issue.fail_condition && <p>{issue.fail_condition}</p>}
          <div className="situation-tip-effect">{formatIssueEffect(issue.effect_on_fail)}</div>
        </div>
        {issue.tags.length ? (
          <div className="situation-tip-tags">
            {issue.tags.map((tag) => <small key={tag}>{tag}</small>)}
          </div>
        ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function IssueGroup({ title, issues }: { title: string; issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <div className="issue-group">
      <h3>{title}</h3>
      <div className="issue-list">
        {issues.map((issue) => (
          <article className={`issue-line ${issueTone(issue.bar_value)}`} key={issue.id}>
            <div className="issue-head">
              <b>#{issue.id} {issue.title}</b>
              <span>{issue.phase} · {issue.bar_value}</span>
            </div>
            <div className="issue-progress" aria-label={`${issue.title}进度 ${issue.bar_value}`}>
              <span>{issue.bar_bad_meaning}</span>
              <div>
                <i style={{ width: `${Math.max(0, Math.min(100, issue.bar_value))}%` }} />
              </div>
              <span>{issue.bar_good_meaning}</span>
            </div>
            <p>{issue.stage_text}</p>
            {issue.tags.length ? (
              <div className="issue-tags">
                {issue.tags.map((tag) => <small key={tag}>{tag}</small>)}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
