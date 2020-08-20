import makeScene from "../libs/scene.js"
import * as mat4 from "../libs/gl-matrix/src/mat4.js"
import * as vec3 from "../libs/gl-matrix/src/vec3.js"

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

const drawScene = makeScene(gl)
// Auto resize canvas to fit in the window and have proper perspective.
function resize() {
  width = window.innerWidth
  height = window.innerHeight
  canvas.setAttribute('width', width)
  canvas.setAttribute('height', height)
  gl.viewport(0, 0, width, height)
  mat4.perspective(P, 60 * Math.PI / 180, width / height, 0.5, 200)
}
window.onresize = resize
resize()

const target = [8, 3, 8]
const up = [0, 1, 0]

/** @type {number|null} */
let anglex = null
/** @type {number|null} */
let angley = null
window.onmousemove = (/** @type {MouseEvent} */ evt) => {
  anglex = evt.clientX * 0.02
  angley = evt.clientY * 0.02
}

window.requestAnimationFrame(render)
function render() {
  const nowx = anglex || Date.now() * 0.001
  const nowy = angley || Date.now() * 0.0003
  const eye = [Math.sin(nowx) * 16, Math.sin(nowy) * 16, Math.cos(nowx) * 16]
  // Move the eye relative to target
  vec3.scaleAndAdd(eye, target, vec3.normalize(eye, eye), 20)
  mat4.multiply(V, P, mat4.invert(V, mat4.targetTo(V, eye, target, up)))
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  drawScene(V)

  window.requestAnimationFrame(render)
}