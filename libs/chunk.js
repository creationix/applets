import data from './chunk-data.js'
import {
  createArrayTexture,
  createBuffer,
  createProgram,
  loadImage,
  setBuffersAndAttributes,
  setUniforms,
} from "./gl.js"

const vert = `#version 300 es
  precision highp float;

  uniform mat4 viewProjection;

  in vec4 data;

  out vec3 uv;
  out vec3 normal;
  out vec3 position;

  void main(void) {
    gl_Position = viewProjection * vec4(data.xyz, 1.0);

    int meta = int(data.w);
    int ni = meta >> 20;
    int ns = (ni & 1)*2-1;
    uv = vec3((meta >> 15) & 0x1f, (meta >> 10) & 0x1f, meta & 0x3ff);
    normal = (ni&4)==4 ? vec3(ns,0,0) : (ni&2)==2 ? vec3(0,ns,0) : vec3(0,0,ns);
    position = data.xyz;
  }
`

const frag = `#version 300 es
  precision highp float;

  uniform highp sampler2DArray blocks;

  in vec3 uv;
  in vec3 normal;
  in vec3 position;

  out vec4 outColor;

  void main(void) {
    vec4 textureColor = texture(blocks, uv);
    if (textureColor.a < 0.5) {
      discard;
    }
    outColor = textureColor;
    // TODO: lighting?
  }
`

/** Block textures image */
const img = loadImage('../imgs/minecraft-block-textures.webp')

/**
 * @param {WebGL2RenderingContext} gl
 */
export default async function makeChunk(gl) {

  const programInfo = createProgram(gl, vert, frag)
	const bufferInfo = createBuffer(gl, programInfo.attributes, { data })
  const blocks = createArrayTexture(gl, 16, 16, 32, await img)

  return drawChunk

  /**
   * Draw the chunk
   * @param {Float32Array} viewProjection
   */
  function drawChunk(viewProjection) {
    gl.useProgram(programInfo.program)
    setUniforms(gl, programInfo.uniforms, { viewProjection, blocks })
    setBuffersAndAttributes(gl, bufferInfo)
    gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements)
  }

}
