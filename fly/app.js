import makeScene from "../libs/scene.js"
import * as mat4 from "../libs/gl-matrix/src/mat4.js"
import * as vec3 from "../libs/gl-matrix/src/vec3.js"
import * as quat from "../libs/gl-matrix/src/quat.js"

document.body.textContent = ''
const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

/** @type {number} Width of viewport in pixels */
let width
/** @type {number} Height of viewport in pixels */
let height
const ctx = canvas.getContext('webgl2', {
  antialias: true,
  preserveDrawingBuffer: true
})
if (!ctx) throw new Error('Problem getting webgl2 context')
const gl = ctx;

const P = mat4.create()
const V = mat4.create()

gl.clearColor(0, 0, 0, 0.8)
gl.enable(gl.DEPTH_TEST)
gl.enable(gl.CULL_FACE)
gl.cullFace(gl.BACK)

makeScene(gl).then(drawScene => {
  // Auto resize canvas to fit in the window and have proper perspective.
  function resize() {
    width = window.innerWidth
    height = window.innerHeight
    canvas.setAttribute('width', width)
    canvas.setAttribute('height', height)
    gl.viewport(0, 0, width, height)
  }
  window.onresize = resize
  resize()

  let move = {
    ShiftLeft: 0, Space: 0, ControlLeft: 0,
    KeyW: 0, KeyA: 0, KeyS: 0, KeyD: 0,
    get z() { return move.KeyW - move.KeyS },
    get x() { return move.KeyA - move.KeyD },
    get y() { return move.ShiftLeft - move.Space },
    get speed() { return move.ControlLeft ? 0.008 : 0.004 },
    get fov() { return move.ControlLeft ? 75 : 60 },
    rotateY: 0,
    rotateX: 0,
  }

  window.onkeydown = evt => {
    if (typeof move[evt.code] !== "number") return
    evt.preventDefault();
    if (evt.repeat) return;
    move[evt.code] = 1
    // console.log(move.x, move.y, move.z)
  }

  window.onkeyup = evt => {
    if (typeof move[evt.code] !== "number") return
    evt.preventDefault();
    move[evt.code] = 0
    // console.log(move.x, move.y, move.z)
  }

  window.onpointermove = evt => {
    if (document.pointerLockElement !== canvas) return;
    evt.preventDefault()
    move.rotateY -= evt.movementX * .2
    while (move.rotateY < 0) move.rotateY += 360
    while (move.rotateY >= 360) move.rotateY -= 360
    move.rotateX = Math.max(-90, Math.min(90, move.rotateX - evt.movementY * .33))
    // console.log(move.rotateY, move.rotateX)
  }

  canvas.onclick = evt => {
    canvas.requestPointerLock()
    canvas.requestFullscreen()
  }

  /** @type {number|null} */
  let anglex = null
  /** @type {number|null} */
  let angley = null
  window.onmousemove = (/** @type {MouseEvent} */ evt) => {
    anglex = evt.clientX * 0.02
    angley = evt.clientY * 0.02
  }
  let time = Date.now()

  const position = vec3.create()
  vec3.set(position, 10, 4.5, 8)

  const T = vec3.create()
  const Q = quat.create()

  window.requestAnimationFrame(render)
  function render() {
    const now = Date.now()
    const delta = time - now
    time = now
    const dist = delta * move.speed
    const ry = move.rotateY * Math.PI / 180
    const rx = move.rotateX * Math.PI / 180

    // Movement is enabled when pointer is locked
    if (document.pointerLockElement === canvas) {
      vec3.scaleAndAdd(position, position, vec3.rotateY(T, vec3.normalize(T, vec3.set(T, move.x, move.y, move.z)), [0, 0, 0], ry), dist)
    }

    quat.identity(Q)
    quat.rotateY(Q, Q, ry)
    quat.rotateX(Q, Q, rx)

    mat4.fromRotationTranslation(V, Q, position)

    mat4.perspective(P, move.fov * Math.PI / 180, width / height, 0.1, 3000)


    mat4.multiply(V, P, mat4.invert(V, V))
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    drawScene(V)

    window.requestAnimationFrame(render)
  }
})