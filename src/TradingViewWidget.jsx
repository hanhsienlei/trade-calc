import React, { useEffect, useRef, memo } from "react";

function TradingViewWidget() {
  const container = useRef();

  useEffect(() => {
    const el = container.current;
    if (!el || el.querySelector("script")) return;
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
        {
          "symbol": "NASDAQ:AAPL",
          "colorTheme": "dark",
          "isTransparent": true,
          "locale": "en",
          "width": "100%"
        }`;
    el.appendChild(script);
    return () => {
      el.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    };
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright">
        <a
          href="https://www.tradingview.com/symbols/NASDAQ-AAPL/"
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">AAPL performance</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
