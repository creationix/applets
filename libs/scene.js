import makeSky from "./sky.js"
import makeChunk from "./chunk.js"

/**
 * @param {WebGL2RenderingContext} gl
 */
export default function makeScene(gl) {

  const drawSky = makeSky(gl)
  const drawChunk = makeChunk(gl)

  return drawScene

  /**
   * Draw the scene
   * @param {Float32Array} viewProjection
   */
  function drawScene(viewProjection) {
    drawChunk(viewProjection)
    drawSky(viewProjection)
  }

}