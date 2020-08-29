import makeScene from '../libs/scene.js'
import * as mat4 from '../libs/gl-matrix/src/mat4.js'
import * as vec3 from '../libs/gl-matrix/src/vec3.js'
import * as quat from '../libs/gl-matrix/src/quat.js'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(function () {
    console.log('Service Worker Registered')
  })
}

// document.body.textContent = ''
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
const gl = ctx

const P = mat4.create()
const V = mat4.create()

gl.clearColor(0, 0, 0, 1)
gl.enable(gl.DEPTH_TEST)
gl.enable(gl.CULL_FACE)
gl.cullFace(gl.BACK)

makeScene(gl).then(drawScene => {
  // Auto resize canvas to fit in the window and have proper perspective.
  function resize () {
    width = window.innerWidth
    height = window.innerHeight
    canvas.setAttribute('width', width)
    canvas.setAttribute('height', height)
    gl.viewport(0, 0, width, height)
  }
  window.onresize = resize
  resize()

  const move = {
    KeyQ: 0,
    KeyE: 0,
    KeyW: 0,
    KeyA: 0,
    KeyS: 0,
    KeyD: 0,
    joyX: 0,
    joyY: 0,
    joyZ: 0,
    get z () { return move.KeyW - move.KeyS + move.joyY },
    get x () { return move.KeyA - move.KeyD - move.joyX },
    get y () { return move.KeyQ - move.KeyE - move.joyZ },
    get speed () { return move.ControlLeft ? 0.008 : 0.004 },
    get fov () { return move.ControlLeft ? 75 : 60 },
    rotateY: 0,
    rotateX: 0
  }

  window.onkeydown = evt => {
    if (typeof move[evt.code] !== 'number') return
    evt.preventDefault()
    if (evt.repeat) return
    move[evt.code] = 1
    // console.log(move.x, move.y, move.z)
  }

  window.onkeyup = evt => {
    if (typeof move[evt.code] !== 'number') return
    evt.preventDefault()
    move[evt.code] = 0
    // console.log(move.x, move.y, move.z)
  }

  /**
   * @param {number} mx
   * @param {number} my
   */
  function onDrag (mx, my) {
    move.rotateY -= mx * 0.4
    while (move.rotateY < 0) move.rotateY += 360
    while (move.rotateY >= 360) move.rotateY -= 360
    move.rotateX = Math.max(-90, Math.min(90, move.rotateX - my * 0.5))
  }

  function onJoy (x, y) {
    move.joyX = Math.min(1, Math.max(-1, (x - 100) / 75))
    move.joyY = Math.min(1, Math.max(-1, (y - 100) / 75))
  }

  function onFly (y) {
    move.joyZ = Math.min(1, Math.max(-1, (y - 100) / 75))
  }

  window.onmousemove = evt => {
    if (document.pointerLockElement !== document.body) return
    evt.preventDefault()
    onDrag(evt.movementX, evt.movementY)
  }

  document.body.onclick = evt => {
    document.body.requestPointerLock()
    document.body.requestFullscreen()
  }

  /** @type {{[id:number]:{clientX:number,clientY:number,isRotate:boolean}}} */
  const touches = {}
  let touch = false
  window.addEventListener('touchstart', evt => {
    if (!touch) {
      touch = true
      document.getElementById('arrows').style.display = 'block'
      document.getElementById('fly').style.display = 'block'
    }
    evt.preventDefault()
    for (const { identifier, clientX, clientY } of evt.changedTouches) {
      const y = window.innerHeight - clientY
      const x = clientX
      if (y >= 25 && y <= 175) {
        if (x >= 25 && x <= 175) {
          touches[identifier] = { mode: 'joy' }
          return onJoy(x, y)
        }
        const rx = window.innerWidth - clientX
        if (rx >= 25 && rx <= 75) {
          touches[identifier] = { mode: 'fly' }
          return onFly(y)
        }
      }
      touches[identifier] = { clientX, clientY, mode: 'drag' }
    }
  })

  window.addEventListener('touchend', evt => {
    evt.preventDefault()
    for (const { identifier } of evt.changedTouches) {
      const { mode } = touches[identifier]
      delete touches[identifier]
      if (mode === 'joy') {
        move.joyX = 0
        move.joyY = 0
      } else if (mode === 'fly') {
        move.joyZ = 0
      }
    }
  })

  window.addEventListener('touchmove', evt => {
    evt.preventDefault()
    for (const { identifier, clientX, clientY } of evt.changedTouches) {
      const touch = touches[identifier]
      if (touch.mode === 'drag') {
        const mx = clientX - touch.clientX
        const my = clientY - touch.clientY
        touch.clientX = clientX
        touch.clientY = clientY
        onDrag(mx, my)
      } else if (touch.mode === 'joy') {
        onJoy(clientX, window.innerHeight - clientY)
      } else if (touch.mode === 'fly') {
        onFly(window.innerHeight - clientY)
      }
    }
  })

  let time = Date.now()

  const position = vec3.create()
  vec3.set(position, 10, 4.5, 8)

  const T = vec3.create()
  const Q = quat.create()

  window.requestAnimationFrame(render)
  function render () {
    const now = Date.now()
    const delta = time - now
    time = now
    const dist = delta * move.speed
    const ry = move.rotateY * Math.PI / 180
    const rx = move.rotateX * Math.PI / 180

    // Movement is enabled when pointer is locked
    const l = vec3.length(vec3.set(T, move.x, move.y, move.z))
    if (l > 1) vec3.scale(T, T, 1 / l)
    vec3.scaleAndAdd(position, position, vec3.rotateY(T, T, [0, 0, 0], ry), dist)

    quat.identity(Q)
    quat.rotateY(Q, Q, ry)
    quat.rotateX(Q, Q, rx)

    mat4.fromRotationTranslation(V, Q, position)

    mat4.perspective(P, move.fov * Math.PI / 180, width / height, 0.1, 1000)

    mat4.multiply(V, P, mat4.invert(V, V))
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    drawScene(V, { light1Pos: position, light2Pos: [8, 20, 8], eyePos: position })

    window.requestAnimationFrame(render)
  }
})
