import { useState, useCallback, useMemo, useEffect } from "react";
import "./TradeCalc.css";

const RISK_OPTIONS = [0.5, 1, 2, 3, 5, 10];
const STORAGE_KEY = "tradecalc.state.v1";

const DEFAULT_STATE = {
  account: 0,
  risk: 0,
  entry: 0,
  sl: 0,
  entryType: "M",
  posActShares: "",
  targets: [
    { price: null, pct: null, type: "L" },
    { price: null, pct: null, type: "L" },
  ],
  marketRate: 0.02,
  limitRate: 0.015,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function n(v) {
  const x = parseFloat(v);
  return isFinite(x) ? x : NaN;
}

function fmtMoney(v, decimals = 2) {
  if (v == null || !isFinite(v)) return "—";
  const sign = v < 0 ? "-" : "";
  return (
    sign +
    "$" +
    Math.abs(v).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

function fmtPlusMoney(v) {
  if (v == null || !isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "−";
  return (
    sign +
    "$" +
    Math.abs(v).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })
  );
}

function fmtPct(v, decimals = 2) {
  if (v == null || !isFinite(v)) return "—";
  return (v * 100).toFixed(decimals) + "%";
}

function fmtInt(v) {
  if (v == null || !isFinite(v)) return "—";
  return Math.round(v).toLocaleString("en-US");
}

function fmtPrice(v) {
  if (v == null || !isFinite(v)) return "—";
  return "$" + v.toFixed(2);
}

function compute(state) {
  const E = n(state.entry);
  const S = n(state.sl);
  const PA = n(state.posActShares);
  const account = n(state.account);
  const risk = n(state.risk);
  const { marketRate, limitRate, entryType, targets } = state;

  if (!isFinite(E) || !isFinite(S) || E <= 0 || S <= 0 || E === S) {
    return { ready: false };
  }

  const direction = S > E ? "short" : "long";
  const slDiff = Math.abs(E - S);
  const riskAmt = (account * risk) / 100;

  const rateOf = (t) => (t === "L" ? limitRate : marketRate) / 100;
  const entryRate = rateOf(entryType);
  const stopRate = marketRate / 100;

  const calcShares = isFinite(riskAmt / slDiff) ? riskAmt / slDiff : 0;
  const actShares = isFinite(PA) && PA > 0 ? PA : null;

  const firstTarget = targets.find(
    (t) => isFinite(n(t.price)) && n(t.price) > 0,
  );
  const t1Price = firstTarget ? n(firstTarget.price) : null;
  const t1Diff =
    t1Price != null
      ? direction === "short"
        ? E - t1Price
        : t1Price - E
      : null;

  const buildTargetData = (shares) =>
    targets.map((t) => {
      const TP = n(t.price);
      const pctRaw = n(t.pct);
      const pct = isFinite(pctRaw) ? pctRaw / 100 : NaN;
      if (!isFinite(TP) || TP <= 0 || !isFinite(pct) || pct <= 0 || !shares) {
        return {
          sliceShares: null,
          exitFee: null,
          gross: null,
          net: null,
          priceDiff: null,
        };
      }
      const sliceShares = shares * pct;
      const exitFee = sliceShares * TP * rateOf(t.type);
      const priceDiff = direction === "short" ? E - TP : TP - E;
      const gross = sliceShares * priceDiff;
      const net = gross - exitFee;
      return { sliceShares, exitFee, gross, net, priceDiff };
    });

  const computeFor = (shares) => {
    if (!shares || shares <= 0) return null;
    const positionValue = shares * E;
    const entryFee = positionValue * entryRate;
    const tdata = buildTargetData(shares);
    const totalExitFees = tdata.reduce((s, x) => s + (x.exitFee || 0), 0);
    const expectedProfit = tdata.reduce((s, x) => s + (x.net || 0), 0);
    const stopExitFee = shares * S * stopRate;
    const riskDollar = slDiff * shares + entryFee + stopExitFee;
    const riskPct = riskDollar / account;
    const beOffset = (entryFee + totalExitFees) / shares;
    const breakEven = direction === "short" ? E - beOffset : E + beOffset;
    const potentialProfit = t1Diff != null ? shares * t1Diff : null;
    const profitPct = positionValue > 0 ? expectedProfit / account : null;
    const rr =
      direction === "long"
        ? Math.min(...tdata.map((x) => x.priceDiff || 0)) / (E - S)
        : Math.max(...tdata.map((x) => x.priceDiff || 0)) / (S - E);

    return {
      shares,
      positionValue,
      entryFee,
      totalExitFees,
      stopExitFee,
      riskDollar,
      riskPct,
      breakEven,
      potentialProfit,
      expectedProfit,
      profitPct,
      rr,
      tdata,
    };
  };

  return {
    ready: true,
    direction,
    riskAmt,
    calc: computeFor(calcShares),
    act: computeFor(actShares),
    calcShares,
    actShares,
  };
}

function MLToggle({ value, onChange }) {
  return (
    <div className="ml-toggle">
      {["M", "L"].map((v) => (
        <button
          key={v}
          type="button"
          className={value === v ? "active" : ""}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder, step = "any" }) {
  return (
    <input
      className="num-input"
      type="number"
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      step={step}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function MiniCard({ kind, shares, fee, profit }) {
  return (
    <div className="mini-card">
      <div className="mini-title">
        {kind} — {shares != null ? fmtInt(shares) : "—"} sh
      </div>
      <div className="mini-row">
        <span>Fee</span>
        <span className="mini-val">{fmtMoney(fee)}</span>
      </div>
      <div className="mini-row">
        <span>Profit</span>
        <span
          className={`mini-val ${profit != null && profit >= 0 ? "pos" : "neg"}`}
        >
          {profit != null ? fmtPlusMoney(profit) : "—"}
        </span>
      </div>
    </div>
  );
}

function TargetBlock({
  idx,
  target,
  onChange,
  onRemove,
  removable,
  actData,
  calcData,
}) {
  return (
    <div className="target-block">
      <div className="target-head">
        <span className="target-tag">T{idx + 1}</span>
        {removable && (
          <button className="target-remove" type="button" onClick={onRemove}>
            ×
          </button>
        )}
      </div>
      <div className="target-grid">
        <Field label="Price">
          <NumberInput
            value={target.price}
            onChange={(v) => onChange("price", v)}
            placeholder="0.00"
          />
        </Field>
        <Field label="% of pos">
          <NumberInput
            value={target.pct}
            onChange={(v) => onChange("pct", v)}
            placeholder="10"
          />
        </Field>
        <Field label="Type">
          <MLToggle value={target.type} onChange={(v) => onChange("type", v)} />
        </Field>
      </div>
      <div className="mini-cards">
        <MiniCard
          kind="Actual"
          shares={actData?.sliceShares}
          fee={actData?.exitFee}
          profit={actData?.gross}
        />
        <MiniCard
          kind="Calc"
          shares={calcData?.sliceShares}
          fee={calcData?.exitFee}
          profit={calcData?.gross}
        />
      </div>
    </div>
  );
}

function CompareRow({ label, act, calc, highlight, group }) {
  return (
    <tr className={`${highlight ? "row-hl" : ""} ${group ? "row-group" : ""}`}>
      <th>{label}</th>
      <td>{act}</td>
      <td>{calc}</td>
    </tr>
  );
}

export default function TradeCalc() {
  const [s, setS] = useState(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [s]);
  const set = useCallback((key, val) => {
    setS((p) => ({ ...p, [key]: val }));
  }, []);

  const setTarget = useCallback((idx, field, val) => {
    setS((p) => ({
      ...p,
      targets: p.targets.map((t, i) =>
        i === idx ? { ...t, [field]: val } : t,
      ),
    }));
  }, []);

  const addTarget = () => {
    if (s.targets.length >= 5) return;
    setS((p) => ({
      ...p,
      targets: [...p.targets, { price: "", pct: "", type: "M" }],
    }));
  };

  const removeTarget = (idx) => {
    setS((p) => ({ ...p, targets: p.targets.filter((_, i) => i !== idx) }));
  };

  const resetAll = () => {
    if (
      !window.confirm(
        "Reset all fields to defaults? This will clear saved data.",
      )
    )
      return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setS(DEFAULT_STATE);
  };

  const result = useMemo(() => compute(s), [s]);

  const directionLabel = result.ready ? result.direction.toUpperCase() : null;

  return (
    <div className="app">
      <div className="card">
        <div className="step-label">Step 2</div>
        <div className="step-title">TRADE SETUP</div>
        <div className="row-3">
          <Field label="Entry price">
            <NumberInput
              value={s.entry}
              onChange={(v) => set("entry", v)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Stop loss">
            <NumberInput
              value={s.sl}
              onChange={(v) => set("sl", v)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Entry">
            <MLToggle
              value={s.entryType}
              onChange={(v) => set("entryType", v)}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="step-label">Step 3</div>
        <div className="step-title">TARGETS</div>
        {s.targets.map((t, i) => (
          <TargetBlock
            key={i}
            idx={i}
            target={t}
            removable={s.targets.length > 1}
            onChange={(field, val) => setTarget(i, field, val)}
            onRemove={() => removeTarget(i)}
            actData={result.act?.tdata?.[i]}
            calcData={result.calc?.tdata?.[i]}
          />
        ))}
        {s.targets.length < 5 && (
          <button className="add-btn" type="button" onClick={addTarget}>
            + Add target
          </button>
        )}
      </div>

      <div className="card card-step4">
        <div className="step-label">Step 4</div>
        <div className="step-title-lg">Actual position (shares)</div>
        <NumberInput
          value={s.posActShares}
          onChange={(v) => set("posActShares", v)}
          placeholder="0"
        />
        <div className="hint">
          Dial in after targets — compare with calculated below
        </div>
      </div>

      <div className="card">
        <div className="compare-head">
          <span className="step-title">COMPARISON</span>
          {directionLabel && (
            <span className={`badge badge-${result.direction}`}>
              {directionLabel}
            </span>
          )}
        </div>
        <table className="compare-table">
          <thead>
            <tr>
              <th></th>
              <th>
                <span className="col-pill">Actual</span>
              </th>
              <th>
                <span className="col-pill">Calculated</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <CompareRow
              label="R:R"
              act={result.act?.rr != null ? `${result.act.rr.toFixed(2)}` : "—"}
              calc={
                result.calc?.rr != null ? `${result.calc.rr.toFixed(2)}` : "—"
              }
            />
            <CompareRow
              label="Risk $"
              act={fmtMoney(result.act?.riskDollar)}
              calc={fmtMoney(result.calc?.riskDollar)}
            />
            <CompareRow
              label="Risk %"
              act={fmtPct(result.act?.riskPct)}
              calc={fmtPct(result.calc?.riskPct)}
            />
            <CompareRow
              label="Entry fee"
              act={fmtMoney(result.act?.entryFee)}
              calc={fmtMoney(result.calc?.entryFee)}
            />
            <CompareRow
              label="Exit fees"
              act={fmtMoney(result.act?.totalExitFees)}
              calc={fmtMoney(result.calc?.totalExitFees)}
            />
            <CompareRow
              label="Break even"
              act={fmtPrice(result.act?.breakEven)}
              calc={fmtPrice(result.calc?.breakEven)}
            />
            <CompareRow
              label="Potential profit"
              act={fmtMoney(result.act?.potentialProfit)}
              calc={fmtMoney(result.calc?.potentialProfit)}
              group
            />
            <CompareRow
              label="Expected profit"
              act={fmtMoney(result.act?.expectedProfit)}
              calc={fmtMoney(result.calc?.expectedProfit)}
              highlight
            />
            <CompareRow
              label="Profit %"
              act={fmtPct(result.act?.profitPct)}
              calc={fmtPct(result.calc?.profitPct)}
            />
            <CompareRow
              label="Position value"
              act={fmtMoney(result.act?.positionValue)}
              calc={fmtMoney(result.calc?.positionValue)}
              group
            />
            <CompareRow
              label="Shares"
              act={result.act?.shares != null ? fmtInt(result.act.shares) : "—"}
              calc={
                result.calc?.shares != null ? fmtInt(result.calc.shares) : "—"
              }
            />
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="step-title">SETTINGS</div>
        <div className="account-row">
          <Field label="Account ($)">
            <NumberInput
              value={s.account}
              onChange={(v) => set("account", v)}
              placeholder="0"
            />
          </Field>
          <Field label="Risk %">
            <select
              className="select-input"
              value={s.risk}
              onChange={(e) => set("risk", parseFloat(e.target.value))}
            >
              {RISK_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="settings-row">
          <div className="settings-label">
            Market
            <br />
            rate
          </div>
          <div className="rate-input">
            <NumberInput
              value={s.marketRate}
              onChange={(v) => set("marketRate", parseFloat(v) || 0)}
              placeholder="0.02"
              step="0.001"
            />
            <span className="rate-suffix">%</span>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label">
            Limit
            <br />
            rate
          </div>
          <div className="rate-input">
            <NumberInput
              value={s.limitRate}
              onChange={(v) => set("limitRate", parseFloat(v) || 0)}
              placeholder="0.015"
              step="0.001"
            />
            <span className="rate-suffix">%</span>
          </div>
        </div>
        <button type="button" className="reset-btn" onClick={resetAll}>
          Reset all fields
        </button>
      </div>
    </div>
  );
}
