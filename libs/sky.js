import {
  createBuffer,
  createCubeMap,
  createProgram,
  loadImage,
  setBuffersAndAttributes,
  setUniforms,
} from "./gl.js"

const vert = `#version 300 es
  precision highp float;

  in vec3 position;
  uniform mat4 viewProjection;

  out vec3 texCoord;

  void main() {
      gl_Position = viewProjection * vec4(position, 1);
      texCoord = position;
  }
`

const frag = `#version 300 es
  precision highp float;

  in vec3 texCoord;
  out vec4 fragColor;
  uniform samplerCube cubemap;

  void main (void) {
      fragColor = texture(cubemap, texCoord);
  }
`

/**
 * @param {WebGL2RenderingContext} gl
 */
export default async function makeSky(gl, url) {

  const skyImage = loadImage(url)

  const programInfo = createProgram(gl, vert, frag)

  const bufferInfo = createBuffer(gl, programInfo.attributes, {
    position: new Float32Array([
      1000, 1000, 1000,
      1000, 1000, -1000,
      1000, -1000, 1000,
      1000, -1000, -1000,
      -1000, 1000, 1000,
      -1000, 1000, -1000,
      -1000, -1000, 1000,
      -1000, -1000, -1000,
    ]),
    indices: new Uint8Array([
      0, 3, 2, 3, 0, 1, // +X
      4, 7, 5, 7, 4, 6, // -X
      0, 5, 1, 5, 0, 4, // +Y
      2, 7, 6, 7, 2, 3, // -Y
      0, 6, 4, 6, 0, 2, // +Z
      1, 7, 3, 7, 1, 5, // -Z
    ])
  })

  /**
   * Skybox texture
   */
  const cubemap = createCubeMap(gl, await skyImage)

  return drawSky

  /**
   * Draw the skybox
   * @param {Float32Array} viewProjection
   */
  function drawSky(viewProjection) {
    gl.useProgram(programInfo.program);
    setUniforms(gl, programInfo.uniforms, { viewProjection, cubemap })
    setBuffersAndAttributes(gl, bufferInfo)
    gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_BYTE, 0)
  }
}
