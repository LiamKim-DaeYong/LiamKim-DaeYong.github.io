(() => {
  const renderMermaidBlocks = async () => {
    const codeBlocks = Array.from(document.querySelectorAll("pre code.language-mermaid"));
    if (codeBlocks.length === 0 || !window.mermaid) {
      return;
    }

    codeBlocks.forEach((codeBlock, index) => {
      const source = (codeBlock.textContent || "").trim();
      const pre = codeBlock.closest("pre");
      if (!pre || source.length === 0) {
        return;
      }

      const container = document.createElement("div");
      container.className = "mermaid";
      container.dataset.diagramIndex = String(index + 1);
      container.textContent = source;
      pre.replaceWith(container);
    });

    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "neutral"
    });

    const nodes = document.querySelectorAll(".mermaid");
    if (nodes.length === 0) {
      return;
    }

    try {
      if (typeof window.mermaid.run === "function") {
        await window.mermaid.run({ nodes });
      } else if (typeof window.mermaid.init === "function") {
        window.mermaid.init(undefined, nodes);
      }
    } catch (error) {
      console.error("Mermaid render failed:", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void renderMermaidBlocks();
    });
  } else {
    void renderMermaidBlocks();
  }
})();
