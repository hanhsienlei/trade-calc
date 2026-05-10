import { useState, useCallback } from "react";
import "./TradeCalc.css";

const DEFAULT_STATE = {
  account: 10000,
  entry: "",
  sl: "",
  posAct: "",
  mrate: 0.0006,
  lrate: 0.0012,
  risk: 1,
  etype: "long",
  targets: [
    { price: "", size: 100, type: "%" },
    { price: "", size: 100, type: "%" },
  ],
};

function fmt(v, decimals = 2) {
  if (v == null || isNaN(v) || !isFinite(v)) return "—";
  return v.toFixed(decimals);
}

function fmtDollar(v) {
  if (v == null || isNaN(v) || !isFinite(v)) return "—";
  return "$" + Math.abs(v).toFixed(2);
}

function calcTarget(state, tgt) {
  const { account, entry, sl, posAct, mrate, lrate, risk, etype } = state;
  const e = parseFloat(entry);
  const s = parseFloat(sl);
  const pa = parseFloat(posAct);
  const tp = parseFloat(tgt.price);
  if (!e || !s || isNaN(e) || isNaN(s)) return null;

  const riskAmt = (account * risk) / 100;
  const slPct = Math.abs(e - s) / e;

  // Calculated position size from risk
  const entryFeeRate = mrate;
  const exitFeeRate = lrate;
  const calcShares = riskAmt / (Math.abs(e - s) + e * entryFeeRate + s * exitFeeRate);
  const calcSize = calcShares * e;

  // Actual position (user-entered)
  const actShares = pa ? pa / e : null;
  const actSize = pa || null;

  const shares = actShares ?? calcShares;
  const size = actSize ?? calcSize;

  // Fees
  const entryFee = size * entryFeeRate;
  const exitFee = size * exitFeeRate;

  // Risk
  const riskDollar = Math.abs(e - s) * shares + entryFee + exitFee;
  const riskPct = riskDollar / account;

  // Break even
  const breakEven =
    etype === "long"
      ? e + (entryFee + exitFee) / shares
      : e - (entryFee + exitFee) / shares;

  if (!tp || isNaN(tp)) {
    return { entryFee, exitFee, riskDollar, riskPct, breakEven, calcSize, calcShares, actSize, actShares, shares, size };
  }

  // Target exit
  const targetExitFee = size * exitFeeRate;
  const priceDiff = etype === "long" ? tp - e : e - tp;
  const potentialProfit = priceDiff * shares;
  const expectedProfit = potentialProfit - entryFee - targetExitFee;
  const profitPct = expectedProfit / size;
  const slPriceDiff = etype === "long" ? e - s : s - e;
  const rr = slPriceDiff > 0 ? priceDiff / slPriceDiff : null;

  return { entryFee, exitFee, riskDollar, riskPct, breakEven, potentialProfit, expectedProfit, profitPct, rr, calcSize, calcShares, actSize, actShares, shares, size };
}

function NumInput({ label, value, onChange, prefix, suffix, step = "any", className = "" }) {
  return (
    <div className={`num-input-wrap ${className}`}>
      {label && <label>{label}</label>}
      <div className="num-input-inner">
        {prefix && <span className="num-affix">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={step}
          placeholder="0"
        />
        {suffix && <span className="num-affix">{suffix}</span>}
      </div>
    </div>
  );
}

function Pill({ options, value, onChange }) {
  return (
    <div className="pill">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, act, calc, highlight }) {
  return (
    <tr className={highlight ? "highlight" : ""}>
      <td className="row-label">{label}</td>
      <td className="row-act">{act ?? "—"}</td>
      <td className="row-calc">{calc ?? "—"}</td>
    </tr>
  );
}

function TargetSection({ idx, tgt, onChange, onRemove, result, entry, sl, etype }) {
  const handleField = (field) => (val) => onChange(idx, field, val);

  const rr = result?.rr;

  return (
    <div className="target-card">
      <div className="target-card-header">
        <span className="target-label">Target {idx + 1}</span>
        {idx > 0 && (
          <button className="remove-btn" onClick={() => onRemove(idx)} type="button">
            ✕
          </button>
        )}
      </div>

      <div className="target-inputs">
        <NumInput
          label="Exit Price"
          prefix={etype === "long" ? "▲" : "▼"}
          value={tgt.price}
          onChange={handleField("price")}
        />
        <div className="num-input-wrap">
          <label>Exit Size</label>
          <div className="num-input-inner size-inner">
            <input
              type="number"
              inputMode="decimal"
              value={tgt.size}
              onChange={(e) => handleField("size")(e.target.value)}
              placeholder="100"
              step="any"
            />
            <Pill
              options={[
                { label: "%", value: "%" },
                { label: "$", value: "$" },
              ]}
              value={tgt.type}
              onChange={handleField("type")}
            />
          </div>
        </div>
      </div>

      {result && (
        <table className="result-table">
          <thead>
            <tr>
              <th></th>
              <th>Actual</th>
              <th>Calc</th>
            </tr>
          </thead>
          <tbody>
            {rr != null && (
              <tr className="rr-row">
                <td className="row-label">R:R</td>
                <td colSpan={2} className="rr-val">1 : {fmt(rr)}</td>
              </tr>
            )}
            <Row label="Risk $" act={fmtDollar(result.riskDollar)} calc={fmtDollar(result.riskDollar)} />
            <Row label="Risk %" act={`${fmt(result.riskPct * 100)}%`} calc={`${fmt(result.riskPct * 100)}%`} />
            <Row label="Entry Fee" act={fmtDollar(result.entryFee)} calc={fmtDollar(result.entryFee)} />
            <Row label="Exit Fees" act={fmtDollar(result.exitFee)} calc={fmtDollar(result.exitFee)} />
            <Row label="Break Even" act={`$${fmt(result.breakEven)}`} calc={`$${fmt(result.breakEven)}`} />
            {result.potentialProfit != null && (
              <>
                <Row
                  label="Potential Profit"
                  act={fmtDollar(result.potentialProfit)}
                  calc={fmtDollar(result.potentialProfit)}
                  highlight
                />
                <Row
                  label="Expected Profit"
                  act={fmtDollar(result.expectedProfit)}
                  calc={fmtDollar(result.expectedProfit)}
                  highlight
                />
                <Row
                  label="Profit %"
                  act={`${fmt(result.profitPct * 100)}%`}
                  calc={`${fmt(result.profitPct * 100)}%`}
                  highlight
                />
              </>
            )}
            <tr className="section-divider"><td colSpan={3}></td></tr>
            <Row
              label="Position $"
              act={result.actSize != null ? fmtDollar(result.actSize) : "—"}
              calc={fmtDollar(result.calcSize)}
            />
            <Row
              label="Shares"
              act={result.actShares != null ? fmt(result.actShares, 4) : "—"}
              calc={fmt(result.calcShares, 4)}
            />
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function TradeCalc() {
  const [s, setS] = useState(DEFAULT_STATE);

  const set = useCallback((key, val) => {
    setS((prev) => ({ ...prev, [key]: val }));
  }, []);

  const setTarget = useCallback((idx, field, val) => {
    setS((prev) => {
      const targets = prev.targets.map((t, i) =>
        i === idx ? { ...t, [field]: val } : t
      );
      return { ...prev, targets };
    });
  }, []);

  const addTarget = () => {
    if (s.targets.length >= 4) return;
    setS((prev) => ({
      ...prev,
      targets: [...prev.targets, { price: "", size: 100, type: "%" }],
    }));
  };

  const removeTarget = (idx) => {
    setS((prev) => ({
      ...prev,
      targets: prev.targets.filter((_, i) => i !== idx),
    }));
  };

  const results = s.targets.map((t) => calcTarget(s, t));

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <span className="app-logo">⬡</span>
          <h1>TradeCalc</h1>
        </div>
        <Pill
          options={[
            { label: "Long ▲", value: "long" },
            { label: "Short ▼", value: "short" },
          ]}
          value={s.etype}
          onChange={(v) => set("etype", v)}
        />
      </header>

      <section className="input-section">
        <div className="section-label">Account</div>
        <div className="input-row">
          <NumInput label="Balance" prefix="$" value={s.account} onChange={(v) => set("account", v)} />
          <div className="num-input-wrap">
            <label>Risk %</label>
            <div className="risk-pills">
              {[0.5, 1, 1.5, 2].map((r) => (
                <button
                  key={r}
                  className={`risk-btn ${s.risk === r ? "active" : ""}`}
                  onClick={() => set("risk", r)}
                  type="button"
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="input-section">
        <div className="section-label">Trade Setup</div>
        <div className="input-row">
          <NumInput label="Entry" prefix="$" value={s.entry} onChange={(v) => set("entry", v)} />
          <NumInput label="Stop Loss" prefix="$" value={s.sl} onChange={(v) => set("sl", v)} />
        </div>
        <div className="input-row">
          <NumInput label="Actual Position $" prefix="$" value={s.posAct} onChange={(v) => set("posAct", v)} />
        </div>
      </section>

      <section className="input-section">
        <div className="section-label">Fees</div>
        <div className="input-row">
          <NumInput label="Maker Rate" value={s.mrate * 100} suffix="%" onChange={(v) => set("mrate", parseFloat(v) / 100 || 0)} />
          <NumInput label="Taker Rate" value={s.lrate * 100} suffix="%" onChange={(v) => set("lrate", parseFloat(v) / 100 || 0)} />
        </div>
      </section>

      <section className="targets-section">
        <div className="section-label">Targets</div>
        {s.targets.map((tgt, idx) => (
          <TargetSection
            key={idx}
            idx={idx}
            tgt={tgt}
            onChange={setTarget}
            onRemove={removeTarget}
            result={results[idx]}
            entry={s.entry}
            sl={s.sl}
            etype={s.etype}
          />
        ))}
        {s.targets.length < 4 && (
          <button className="add-target-btn" onClick={addTarget} type="button">
            + Add Target
          </button>
        )}
      </section>
    </div>
  );
}
