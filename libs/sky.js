import * as twgl from "./twgl.js/dist/4.x/twgl-full.module.js"
import { m4 } from "./twgl.js/dist/4.x/twgl-full.module.js"
/** @typedef { import('./twgl.js/dist/4.x/twgl').ProgramInfo } ProgramInfo */
/** @typedef { import('./twgl.js/dist/4.x/twgl').BufferInfo } BufferInfo */

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
export default function makeSky(gl) {

  /** 
   * Sky rendering program
   * @type {ProgramInfo}
   */
  const programInfo = twgl.createProgramInfo(gl, [vert, frag])

  /** 
   * Skybox cube (triangles face inward)
   * @type {BufferInfo} 
   */
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: [
      100, 100, 100,
      100, 100, -100,
      100, -100, 100,
      100, -100, -100,
      -100, 100, 100,
      -100, 100, -100,
      -100, -100, 100,
      -100, -100, -100,
    ],
    indices: [
      0, 3, 2, 3, 0, 1, // +X
      4, 7, 5, 7, 4, 6, // -X
      0, 5, 1, 5, 0, 4, // +Y
      2, 7, 6, 7, 2, 3, // -Y
      0, 6, 4, 6, 0, 2, // +Z
      1, 7, 3, 7, 1, 5, // -Z
    ]
  })

  /**
   * Skybox texture
   */
  const cubemap = twgl.createTexture(gl, {
    target: gl.TEXTURE_CUBE_MAP,
    src: '../imgs/orange-sky.webp',
  })

  return drawSky

  /**
   * Draw the skybox
   * @param {Float32Array} viewProjection
   */
  function drawSky(viewProjection) {
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, { viewProjection, cubemap });
    twgl.drawBufferInfo(gl, bufferInfo);
  }
}
