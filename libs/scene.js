import makeSky from './sky.js'
import makeChunk from './chunk.js'

/**
 * @param {WebGL2RenderingContext} gl
 */
export default async function makeScene(gl) {
  const [drawSky, drawChunk] = await Promise.all([
    makeSky(gl, `../imgs/${['blue', 'orange', 'cyan'][Math.floor(Math.random() * 3)]}-sky.avif`),
    makeChunk(gl)
  ])

  return drawScene

  /**
   * Draw the scene
   * @param {Float32Array} viewProjection
   */
  function drawScene(viewProjection, positions) {
    drawChunk(viewProjection, positions)
    drawSky(viewProjection, positions)
  }
}
