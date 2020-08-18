import renderer from './renderer.js'

import { invert, targetTo, perspective } from './gl-matrix/src/mat4.js'
import { normalize, scaleAndAdd } from './gl-matrix/src/vec3.js'

document.body.textContent = ''
const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

/** @type {number} Width of viewport in pixels */
let width
/** @type {number} Height of viewport in pixels */
let height
const ctx = canvas.getContext('webgl2', {
  antialias: true,
  preserveDrawingBuffer: false
})
if (!ctx) throw new Error('Problem getting webgl2 context')

const M = new Float32Array(16)

renderer(ctx).then(scene => {
  // Auto resize canvas to fit in the window and have proper perspective.
  function resize () {
    width = window.innerWidth
    height = window.innerHeight
    canvas.setAttribute('width', width)
    canvas.setAttribute('height', height)
    scene.updateViewport(0, 0, width, height)
    scene.updateProjection(perspective(M, 1, width / height, 0.1, 100))
  }
  window.onresize = resize
  resize()

  const center = [8, 5, 8]
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
  function render () {
    const nowx = anglex || Date.now() * 0.001
    const nowy = angley || Date.now() * 0.0003
    const camera = [Math.sin(nowx) * 16, Math.sin(nowy) * 16, Math.cos(nowx) * 16]
    targetTo(M, scaleAndAdd(camera, center, normalize(camera, camera), 15), center, up)
    invert(M, M)
    scene.updateView(M)
    scene.clear()
    scene.draw(Date.now() * 0.001)

    window.requestAnimationFrame(render)
  }
})
