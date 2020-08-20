import makeScene from "../libs/scene.js"
import * as mat4 from "../libs/gl-matrix/src/mat4.js"

// XR globals.
const xrButton = document.getElementById('xr-button')
let xrSession = null
let xrRefSpace = null

// WebGL scene globals.

/** @type {WebGL2RenderingContext} */
let gl = null

// Checks to see if WebXR is available and, if so, requests an XRDevice
// that is connected to the system and tests it to ensure it supports the
// desired session options.
function initXR() {
  // Is WebXR available on this UA?
  if (navigator.xr) {
    // If the device allows creation of exclusive sessions set it as the
    // target of the 'Enter XR' button.
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      if (supported) {
        // Updates the button to start an XR session when clicked.
        xrButton.addEventListener('click', onButtonClicked)
        xrButton.textContent = 'Enter VR'
        xrButton.disabled = false
      }
    })
  }
}

// Called when the user clicks the button to enter XR. If we don't have a
// session we'll request one, and if we do have a session we'll end it.
function onButtonClicked() {
  if (!xrSession) {
    navigator.xr.requestSession('immersive-vr').then(onSessionStarted)
  } else {
    xrSession.end()
  }
}

let drawScene

// Called when we've successfully acquired a XRSession. In response we
// will set up the necessary session state and kick off the frame loop.
async function onSessionStarted(session) {
  xrSession = session
  xrButton.textContent = 'Exit VR'

  // Listen for the sessions 'end' event so we can respond if the user
  // or UA ends the session for any reason.
  session.addEventListener('end', onSessionEnded)

  // Create a WebGL context to render with, initialized to be compatible
  // with the XRDisplay we're presenting to.
  const canvas = document.createElement('canvas')
  gl = canvas.getContext('webgl2', { xrCompatible: true })

  // Use the new WebGL context to create a XRWebGLLayer and set it as the
  // sessions baseLayer. This allows any content rendered to the layer to
  // be displayed on the XRDevice.
  session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) })

  gl.clearColor(0, 0, 0, 0.5)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)

  drawScene = await makeScene(gl)

  // Get a reference space, which is required for querying poses. In this
  // case an 'local' reference space means that all poses will be relative
  // to the location where the XRDevice was first detected.
  xrRefSpace = await session.requestReferenceSpace('local')

  // Inform the session that we're ready to begin drawing.
  session.requestAnimationFrame(onXRFrame)
}

// Called either when the user has explicitly ended the session by calling
// session.end() or when the UA has ended the session for any reason.
// At this point the session object is no longer usable and should be
// discarded.
function onSessionEnded(event) {
  xrSession = null
  xrButton.textContent = 'Enter VR'

  // In this simple case discard the WebGL context too, since we're not
  // rendering anything else to the screen with it.
  gl = null
}

const V = mat4.create()

// Called every time the XRSession requests that a new frame be drawn.
function onXRFrame(time, frame) {
  const session = frame.session

  // Inform the session that we're ready for the next frame.
  session.requestAnimationFrame(onXRFrame)

  // Get the XRDevice pose relative to the reference space we created
  // earlier.
  const pose = frame.getViewerPose(xrRefSpace)

  // Getting the pose may fail if, for example, tracking is lost. So we
  // have to check to make sure that we got a valid pose before attempting
  // to render with it. If not in this case we'll just leave the
  // framebuffer cleared, so tracking loss means the scene will simply
  // disappear.
  if (pose) {
    const glLayer = session.renderState.baseLayer

    // If we do have a valid pose, bind the WebGL layer's framebuffer,
    // which is where any content to be displayed on the XRDevice must be
    // rendered.
    gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer)

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    for (const view of pose.views) {
      const { x, y, width, height } = glLayer.getViewport(view)
      gl.viewport(x, y, width, height)
      mat4.multiply(V, view.projectionMatrix, mat4.translate(V, view.transform.inverse.matrix, [-10, -3 - 1.93, -8]))
      drawScene(V)
    }
  }
}

// Start the XR application.
initXR()
