const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 resolution;
  uniform vec2 pointer;
  uniform float time;
  uniform float progress;

  float band(vec2 uv, float offset, float width) {
    float wave = sin((uv.y * 4.0 + time * 0.12 + offset) * 3.14159) * 0.055;
    return smoothstep(width, 0.0, abs(uv.x + wave - offset));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    uv.x *= resolution.x / resolution.y;
    vec2 mouse = pointer / resolution.xy;
    mouse.x *= resolution.x / resolution.y;

    float glow = 0.14 / max(0.12, distance(uv, mouse));
    float lime = band(uv, 0.42 + progress * 0.22, 0.24);
    float cyan = band(uv, 0.88 - progress * 0.18, 0.3);
    float red = band(uv, 1.28 + sin(progress * 6.283) * 0.08, 0.38);
    float grain = fract(sin(dot(gl_FragCoord.xy + time, vec2(12.9898, 78.233))) * 43758.5453);

    vec3 color = vec3(0.018, 0.02, 0.028);
    color += vec3(0.70, 1.0, 0.12) * lime * 0.28;
    color += vec3(0.05, 0.45, 0.72) * cyan * 0.22;
    color += vec3(0.72, 0.08, 0.07) * red * 0.18;
    color += vec3(0.12, 0.28, 0.30) * glow;
    color += (grain - 0.5) * 0.025;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl) => {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

export function initCharacterPrism({ selector = "[data-character-prism]" } = {}) {
  const section = document.querySelector(selector);
  if (!(section instanceof HTMLElement)) return;

  const labels = [...section.querySelectorAll("[data-character-label]")];
  const setActive = (index) => {
    const active = String(Math.min(labels.length - 1, Math.max(0, index)));
    section.dataset.characterActive = active;
    labels.forEach((label, labelIndex) => {
      label.setAttribute("aria-current", String(labelIndex) === active ? "true" : "false");
    });
  };

  let queued = false;
  const updateStage = () => {
    queued = false;
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(1, rect.height - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
    section.style.setProperty("--prism-progress", progress.toFixed(4));
    setActive(Math.round(progress * (labels.length - 1)));
  };
  const queueStage = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(updateStage);
  };
  updateStage();
  window.addEventListener("scroll", queueStage, { passive: true });
  window.addEventListener("resize", queueStage);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact = window.matchMedia("(max-width: 760px)").matches;
  const canvas = section.querySelector("canvas");
  if (!(canvas instanceof HTMLCanvasElement) || reduceMotion || compact) {
    section.classList.add("prism-fallback");
    return;
  }

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: true,
  });
  const program = gl ? createProgram(gl) : null;
  if (!gl || !program) {
    section.classList.add("prism-fallback");
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.useProgram(program);

  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "resolution");
  const pointer = gl.getUniformLocation(program, "pointer");
  const time = gl.getUniformLocation(program, "time");
  const progress = gl.getUniformLocation(program, "progress");
  const pointerState = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.42 };
  let visible = false;
  let frame = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const render = (timestamp) => {
    if (!visible || document.hidden) {
      frame = 0;
      return;
    }
    resize();
    const sectionProgress = Number.parseFloat(
      section.style.getPropertyValue("--prism-progress") || "0",
    );
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform2f(pointer, pointerState.x, canvas.height - pointerState.y);
    gl.uniform1f(time, timestamp * 0.001);
    gl.uniform1f(progress, sectionProgress);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    frame = requestAnimationFrame(render);
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !frame) frame = requestAnimationFrame(render);
    },
    { rootMargin: "20% 0px" },
  );
  observer.observe(section);

  section.addEventListener(
    "pointermove",
    (event) => {
      const rect = canvas.getBoundingClientRect();
      pointerState.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      pointerState.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    },
    { passive: true },
  );

  window.addEventListener("resize", resize);
  window.addEventListener(
    "pagehide",
    () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
    { once: true },
  );
}
