(function (root) {
  "use strict";

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value)));
  }

  function createViewport(width, height) {
    const safeWidth = Number(width) > 0 ? Number(width) : 1040;
    const safeHeight = Number(height) > 0 ? Number(height) : 500;
    return { x: 0, y: 0, w: safeWidth, h: safeHeight };
  }

  function zoomViewport(viewport, factor, centerX, centerY, fullViewport) {
    const current = Object.assign({}, viewport);
    const full = fullViewport || createViewport(current.w, current.h);
    const safeFactor = Number(factor) > 0 ? Number(factor) : 1;
    const nextWidth = clamp(current.w / safeFactor, full.w / 4, full.w * 2);
    const scale = nextWidth / current.w;
    const focusX = Number.isFinite(Number(centerX)) ? Number(centerX) : current.x + current.w / 2;
    const focusY = Number.isFinite(Number(centerY)) ? Number(centerY) : current.y + current.h / 2;

    return {
      x: focusX - (focusX - current.x) * scale,
      y: focusY - (focusY - current.y) * scale,
      w: nextWidth,
      h: nextWidth * (full.h / full.w),
    };
  }

  function panViewport(viewport, deltaX, deltaY, renderedWidth, renderedHeight) {
    const width = Math.max(1, Number(renderedWidth) || 1);
    const height = Math.max(1, Number(renderedHeight) || 1);

    return {
      x: viewport.x - Number(deltaX || 0) * (viewport.w / width),
      y: viewport.y - Number(deltaY || 0) * (viewport.h / height),
      w: viewport.w,
      h: viewport.h,
    };
  }

  function connectedEdgeIds(value) {
    return String(value || "")
      .split(/\s+/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function initializeFlow(figure) {
    const svg = figure.querySelector("[data-tl-flow-svg]");
    const viewportElement = figure.querySelector("[data-tl-flow-viewport]");
    const detail = figure.querySelector("[data-tl-flow-detail]");
    const pauseButton = figure.querySelector('[data-tl-flow-action="pause"]');
    const controls = figure.querySelector(".tl-flow__controls");

    if (!svg || !viewportElement || !detail || !pauseButton || !controls) {
      return;
    }

    const fullViewport = createViewport(svg.dataset.width, svg.dataset.height);
    let viewport = Object.assign({}, fullViewport);
    let dragState = null;
    let userSelectedMotion = false;
    const idleDetail = detail.textContent;
    const nodes = Array.from(figure.querySelectorAll("[data-tl-flow-node]"));
    const edges = new Map(
      Array.from(figure.querySelectorAll("[data-tl-flow-edge][id]")).map(function (edge) {
        return [edge.id, edge];
      }),
    );

    function applyViewport() {
      svg.setAttribute("viewBox", `${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`);
    }

    function fitViewport() {
      viewport = Object.assign({}, fullViewport);
      applyViewport();
    }

    function zoom(factor, centerX, centerY) {
      viewport = zoomViewport(viewport, factor, centerX, centerY, fullViewport);
      applyViewport();
    }

    function clearTrace() {
      figure.classList.remove("is-tracing");
      figure.querySelectorAll(".is-active").forEach(function (element) {
        element.classList.remove("is-active");
      });
      detail.textContent = idleDetail;
    }

    function traceNode(node) {
      clearTrace();
      figure.classList.add("is-tracing");
      node.classList.add("is-active");
      connectedEdgeIds(node.dataset.links).forEach(function (edgeId) {
        const edge = edges.get(edgeId);
        if (edge) {
          edge.classList.add("is-active");
        }
      });
      detail.textContent = node.dataset.detail || idleDetail;
    }

    nodes.forEach(function (node) {
      node.addEventListener("mouseenter", function () {
        traceNode(node);
      });
      node.addEventListener("mouseleave", function () {
        if (document.activeElement !== node) {
          clearTrace();
        }
      });
      node.addEventListener("focus", function () {
        traceNode(node);
      });
      node.addEventListener("blur", clearTrace);
      node.addEventListener("click", function (event) {
        event.stopPropagation();
        if (node.classList.contains("is-active")) {
          clearTrace();
        } else {
          traceNode(node);
        }
      });
      node.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          traceNode(node);
        } else if (event.key === "Escape") {
          clearTrace();
          node.blur();
        }
      });
    });

    svg.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || event.target.closest("[data-tl-flow-node]")) {
        return;
      }
      dragState = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      if (typeof svg.setPointerCapture === "function") {
        svg.setPointerCapture(event.pointerId);
      }
      viewportElement.classList.add("is-dragging");
    });

    svg.addEventListener("pointermove", function (event) {
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }
      const rectangle = svg.getBoundingClientRect();
      viewport = panViewport(
        viewport,
        event.clientX - dragState.x,
        event.clientY - dragState.y,
        rectangle.width,
        rectangle.height,
      );
      dragState.x = event.clientX;
      dragState.y = event.clientY;
      applyViewport();
    });

    function finishDrag(event) {
      if (dragState && (!event || event.pointerId === dragState.pointerId)) {
        dragState = null;
        viewportElement.classList.remove("is-dragging");
      }
    }

    svg.addEventListener("pointerup", finishDrag);
    svg.addEventListener("pointercancel", finishDrag);
    svg.addEventListener("click", function (event) {
      if (!event.target.closest("[data-tl-flow-node]")) {
        clearTrace();
      }
    });

    svg.addEventListener(
      "wheel",
      function (event) {
        if (!(event.ctrlKey || event.metaKey)) {
          return;
        }
        event.preventDefault();
        const rectangle = svg.getBoundingClientRect();
        const centerX = viewport.x + ((event.clientX - rectangle.left) / rectangle.width) * viewport.w;
        const centerY = viewport.y + ((event.clientY - rectangle.top) / rectangle.height) * viewport.h;
        zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, centerX, centerY);
      },
      { passive: false },
    );

    svg.addEventListener("keydown", function (event) {
      const panX = viewport.w * 0.06;
      const panY = viewport.h * 0.06;
      let handled = true;

      if (event.key === "ArrowLeft") {
        viewport.x -= panX;
      } else if (event.key === "ArrowRight") {
        viewport.x += panX;
      } else if (event.key === "ArrowUp") {
        viewport.y -= panY;
      } else if (event.key === "ArrowDown") {
        viewport.y += panY;
      } else if (event.key === "+" || event.key === "=") {
        zoom(1.25);
      } else if (event.key === "-") {
        zoom(1 / 1.25);
      } else if (event.key === "0" || event.key === "Home") {
        fitViewport();
      } else if (event.key === "Escape") {
        clearTrace();
      } else {
        handled = false;
      }

      if (handled) {
        event.preventDefault();
        if (!['+', '=', '-', '0', 'Home'].includes(event.key)) {
          applyViewport();
        }
      }
    });

    function setPaused(paused) {
      if (paused && typeof svg.pauseAnimations === "function") {
        svg.pauseAnimations();
      } else if (!paused && typeof svg.unpauseAnimations === "function") {
        svg.unpauseAnimations();
      }
      figure.classList.toggle("is-paused", paused);
      pauseButton.textContent = paused ? "Play" : "Pause";
      pauseButton.setAttribute("aria-pressed", String(paused));
    }

    controls.addEventListener("click", function (event) {
      const button = event.target.closest("[data-tl-flow-action]");
      if (!button) {
        return;
      }
      const action = button.dataset.tlFlowAction;
      if (action === "zoom-in") {
        zoom(1.25);
      } else if (action === "zoom-out") {
        zoom(1 / 1.25);
      } else if (action === "fit") {
        fitViewport();
      } else if (action === "pause") {
        userSelectedMotion = true;
        setPaused(pauseButton.getAttribute("aria-pressed") !== "true");
      }
    });

    if (typeof root.matchMedia === "function") {
      const motionPreference = root.matchMedia("(prefers-reduced-motion: reduce)");
      setPaused(motionPreference.matches);
      const handleMotionChange = function (event) {
        if (!userSelectedMotion) {
          setPaused(event.matches);
        }
      };
      if (typeof motionPreference.addEventListener === "function") {
        motionPreference.addEventListener("change", handleMotionChange);
      } else if (typeof motionPreference.addListener === "function") {
        motionPreference.addListener(handleMotionChange);
      }
    }

    figure.classList.add("is-enhanced");
    applyViewport();
  }

  function initializeToc(toc) {
    const links = Array.from(toc.querySelectorAll('a[href^="#"]'));
    const headings = links
      .map(function (link) {
        let id;
        try {
          id = decodeURIComponent(link.hash.slice(1));
        } catch (_error) {
          id = link.hash.slice(1);
        }
        const heading = document.getElementById(id);
        return heading ? { heading: heading, link: link } : null;
      })
      .filter(Boolean);

    if (!headings.length) {
      return;
    }

    const mobileQuery = typeof root.matchMedia === "function" ? root.matchMedia("(max-width: 65.99rem)") : null;

    function synchronizeDisclosure() {
      if (!mobileQuery) {
        return;
      }
      toc.open = !mobileQuery.matches || Boolean(root.location && root.location.hash);
    }

    function setActive(activeLink) {
      links.forEach(function (link) {
        const active = link === activeLink;
        link.classList.toggle("is-active", active);
        if (active) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    let scheduled = false;
    function updateActiveHeading() {
      scheduled = false;
      const threshold = Math.min(160, root.innerHeight * 0.25);
      let active = headings[0];
      headings.forEach(function (entry) {
        if (entry.heading.getBoundingClientRect().top <= threshold) {
          active = entry;
        }
      });
      setActive(active.link);
    }

    function scheduleUpdate() {
      if (!scheduled) {
        scheduled = true;
        root.requestAnimationFrame(updateActiveHeading);
      }
    }

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        setActive(link);
        if (mobileQuery && mobileQuery.matches) {
          toc.open = false;
        }
      });
    });

    root.addEventListener("scroll", scheduleUpdate, { passive: true });
    root.addEventListener("resize", scheduleUpdate, { passive: true });
    if (mobileQuery) {
      if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", synchronizeDisclosure);
      } else if (typeof mobileQuery.addListener === "function") {
        mobileQuery.addListener(synchronizeDisclosure);
      }
    }
    synchronizeDisclosure();
    updateActiveHeading();
  }

  function initialize() {
    document.querySelectorAll("[data-tl-flow]").forEach(initializeFlow);
    document.querySelectorAll("[data-tl-toc]").forEach(initializeToc);
  }

  const api = { clamp, createViewport, zoomViewport, panViewport, connectedEdgeIds };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
      initialize();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
