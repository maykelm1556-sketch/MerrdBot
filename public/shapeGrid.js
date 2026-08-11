// ShapeGrid en JS puro (convertido desde el componente React original)
// Fondo animado de cuadrícula con efecto hover.

function initShapeGrid(canvas, opciones = {}) {
  const {
    direction = 'right',
    speed = 1,
    borderColor = '#999',
    squareSize = 40,
    hoverFillColor = '#222',
    shape = 'square',
    hoverTrailAmount = 0
  } = opciones;

  const ctx = canvas.getContext('2d');

  const isHex = shape === 'hexagon';
  const isTri = shape === 'triangle';
  const hexHoriz = squareSize * 1.5;
  const hexVert = squareSize * Math.sqrt(3);

  let numSquaresX, numSquaresY;
  const gridOffset = { x: 0, y: 0 };
  let hoveredSquare = null;
  const trailCells = [];
  const cellOpacities = new Map();
  let requestId = null;

  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    numSquaresX = Math.ceil(canvas.width / squareSize) + 1;
    numSquaresY = Math.ceil(canvas.height / squareSize) + 1;
  }

  function drawHex(cx, cy, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const vx = cx + size * Math.cos(angle);
      const vy = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
  }

  function drawCircle(cx, cy, size) {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
  }

  function drawTriangle(cx, cy, size, flip) {
    ctx.beginPath();
    if (flip) {
      ctx.moveTo(cx, cy + size / 2);
      ctx.lineTo(cx + size / 2, cy - size / 2);
      ctx.lineTo(cx - size / 2, cy - size / 2);
    } else {
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx + size / 2, cy + size / 2);
      ctx.lineTo(cx - size / 2, cy + size / 2);
    }
    ctx.closePath();
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isHex) {
      const colShift = Math.floor(gridOffset.x / hexHoriz);
      const offsetX = ((gridOffset.x % hexHoriz) + hexHoriz) % hexHoriz;
      const offsetY = ((gridOffset.y % hexVert) + hexVert) % hexVert;

      const cols = Math.ceil(canvas.width / hexHoriz) + 3;
      const rows = Math.ceil(canvas.height / hexVert) + 3;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const cx = col * hexHoriz + offsetX;
          const cy = row * hexVert + ((col + colShift) % 2 !== 0 ? hexVert / 2 : 0) + offsetY;

          const cellKey = `${col},${row}`;
          const alpha = cellOpacities.get(cellKey);
          if (alpha) {
            ctx.globalAlpha = alpha;
            drawHex(cx, cy, squareSize);
            ctx.fillStyle = hoverFillColor;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          drawHex(cx, cy, squareSize);
          ctx.strokeStyle = borderColor;
          ctx.stroke();
        }
      }
    } else if (isTri) {
      const halfW = squareSize / 2;
      const colShift = Math.floor(gridOffset.x / halfW);
      const rowShift = Math.floor(gridOffset.y / squareSize);
      const offsetX = ((gridOffset.x % halfW) + halfW) % halfW;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

      const cols = Math.ceil(canvas.width / halfW) + 4;
      const rows = Math.ceil(canvas.height / squareSize) + 4;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const cx = col * halfW + offsetX;
          const cy = row * squareSize + squareSize / 2 + offsetY;
          const flip = ((col + colShift + row + rowShift) % 2 + 2) % 2 !== 0;

          const cellKey = `${col},${row}`;
          const alpha = cellOpacities.get(cellKey);
          if (alpha) {
            ctx.globalAlpha = alpha;
            drawTriangle(cx, cy, squareSize, flip);
            ctx.fillStyle = hoverFillColor;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          drawTriangle(cx, cy, squareSize, flip);
          ctx.strokeStyle = borderColor;
          ctx.stroke();
        }
      }
    } else if (shape === 'circle') {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

      const cols = Math.ceil(canvas.width / squareSize) + 3;
      const rows = Math.ceil(canvas.height / squareSize) + 3;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const cx = col * squareSize + squareSize / 2 + offsetX;
          const cy = row * squareSize + squareSize / 2 + offsetY;

          const cellKey = `${col},${row}`;
          const alpha = cellOpacities.get(cellKey);
          if (alpha) {
            ctx.globalAlpha = alpha;
            drawCircle(cx, cy, squareSize);
            ctx.fillStyle = hoverFillColor;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          drawCircle(cx, cy, squareSize);
          ctx.strokeStyle = borderColor;
          ctx.stroke();
        }
      }
    } else {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

      const cols = Math.ceil(canvas.width / squareSize) + 3;
      const rows = Math.ceil(canvas.height / squareSize) + 3;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const sx = col * squareSize + offsetX;
          const sy = row * squareSize + offsetY;

          const cellKey = `${col},${row}`;
          const alpha = cellOpacities.get(cellKey);
          if (alpha) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(sx, sy, squareSize, squareSize);
            ctx.globalAlpha = 1;
          }

          ctx.strokeStyle = borderColor;
          ctx.strokeRect(sx, sy, squareSize, squareSize);
        }
      }
    }

    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function updateCellOpacities() {
    const targets = new Map();

    if (hoveredSquare) {
      targets.set(`${hoveredSquare.x},${hoveredSquare.y}`, 1);
    }

    if (hoverTrailAmount > 0) {
      for (let i = 0; i < trailCells.length; i++) {
        const t = trailCells[i];
        const key = `${t.x},${t.y}`;
        if (!targets.has(key)) {
          targets.set(key, (trailCells.length - i) / (trailCells.length + 1));
        }
      }
    }

    for (const [key] of targets) {
      if (!cellOpacities.has(key)) {
        cellOpacities.set(key, 0);
      }
    }

    for (const [key, opacity] of cellOpacities) {
      const target = targets.get(key) || 0;
      const next = opacity + (target - opacity) * 0.4;
      if (next < 0.005) {
        cellOpacities.delete(key);
      } else {
        cellOpacities.set(key, next);
      }
    }
  }

  function updateAnimation() {
    const effectiveSpeed = Math.max(speed, 0.1);
    const wrapX = isHex ? hexHoriz * 2 : squareSize;
    const wrapY = isHex ? hexVert : isTri ? squareSize * 2 : squareSize;

    switch (direction) {
      case 'right':
        gridOffset.x = (gridOffset.x - effectiveSpeed + wrapX) % wrapX;
        break;
      case 'left':
        gridOffset.x = (gridOffset.x + effectiveSpeed + wrapX) % wrapX;
        break;
      case 'up':
        gridOffset.y = (gridOffset.y + effectiveSpeed + wrapY) % wrapY;
        break;
      case 'down':
        gridOffset.y = (gridOffset.y - effectiveSpeed + wrapY) % wrapY;
        break;
      case 'diagonal':
        gridOffset.x = (gridOffset.x - effectiveSpeed + wrapX) % wrapX;
        gridOffset.y = (gridOffset.y - effectiveSpeed + wrapY) % wrapY;
        break;
      default:
        break;
    }

    updateCellOpacities();
    drawGrid();
    requestId = requestAnimationFrame(updateAnimation);
  }

  function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let col, row;

   if (isHex) {
      const colShift = Math.floor(gridOffset.x / hexHoriz);
      const offsetX = ((gridOffset.x % hexHoriz) + hexHoriz) % hexHoriz;
      const offsetY = ((gridOffset.y % hexVert) + hexVert) % hexVert;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      const colAprox = adjustedX / hexHoriz;
      const colCandidatos = [Math.floor(colAprox), Math.ceil(colAprox)];

      let mejorDistancia = Infinity;
      let mejorCol = colCandidatos[0];
      let mejorRow = 0;

      for (const c of colCandidatos) {
        const rowOffsetC = (c + colShift) % 2 !== 0 ? hexVert / 2 : 0;
        const rAprox = (adjustedY - rowOffsetC) / hexVert;
        for (const r of [Math.floor(rAprox), Math.ceil(rAprox)]) {
          const cx = c * hexHoriz;
          const cy = r * hexVert + rowOffsetC;
          const dist = (cx - adjustedX) ** 2 + (cy - adjustedY) ** 2;
          if (dist < mejorDistancia) {
            mejorDistancia = dist;
            mejorCol = c;
            mejorRow = r;
          }
        }
      }

      col = mejorCol;
      row = mejorRow;
    } else if (isTri) {
      const halfW = squareSize / 2;
      const offsetX = ((gridOffset.x % halfW) + halfW) % halfW;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      col = Math.round(adjustedX / halfW);
      row = Math.floor(adjustedY / squareSize);
    } else if (shape === 'circle') {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      col = Math.round(adjustedX / squareSize);
      row = Math.round(adjustedY / squareSize);
    } else {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      col = Math.floor(adjustedX / squareSize);
      row = Math.floor(adjustedY / squareSize);
    }

    if (!hoveredSquare || hoveredSquare.x !== col || hoveredSquare.y !== row) {
      if (hoveredSquare && hoverTrailAmount > 0) {
        trailCells.unshift({ ...hoveredSquare });
        if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
      }
      hoveredSquare = { x: col, y: row };
    }
  }

  function handleMouseLeave() {
    if (hoveredSquare && hoverTrailAmount > 0) {
      trailCells.unshift({ ...hoveredSquare });
      if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
    }
    hoveredSquare = null;
  }

  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  let isVisible = false;
  let isPageVisible = !document.hidden;

  function tryStart() {
    if (isVisible && isPageVisible && !requestId) {
      requestId = requestAnimationFrame(updateAnimation);
    }
  }
  function tryStop() {
    if (requestId) {
      cancelAnimationFrame(requestId);
      requestId = null;
    }
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      isVisible ? tryStart() : tryStop();
    },
    { threshold: 0 }
  );
  io.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    isPageVisible ? tryStart() : tryStop();
  });

  resizeCanvas();
  tryStart();

  // Devuelve una función por si en algún momento se necesita detener/limpiar
  return function destruir() {
    window.removeEventListener('resize', resizeCanvas);
    tryStop();
    io.disconnect();
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
  };
}