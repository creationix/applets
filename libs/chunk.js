import data from './chunk-data.js'
import * as twgl from "./twgl.js/dist/4.x/twgl-full.module.js"
import { m4 } from "./twgl.js/dist/4.x/twgl-full.module.js"
/** @typedef { import('./twgl.js/dist/4.x/twgl').ProgramInfo } ProgramInfo */
/** @typedef { import('./twgl.js/dist/4.x/twgl').BufferInfo } BufferInfo */

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

/**
 * @param {WebGL2RenderingContext} gl
 */
export default function makeChunk(gl) {

	/**
	 * Chunk rendering program
	 * @type {ProgramInfo}
	 */
	const programInfo = twgl.createProgramInfo(gl, [vert, frag])

	/**
	 * Entire scene is encoded in a single buffer
	 * @type {BufferInfo}
	 */
	const bufferInfo = twgl.createBufferInfoFromArrays(gl, { 
	  data: { numComponents: 4, data } 
	})

	/**
	 * Blocks textures as an array.
	 */
	const blocks = twgl.createTexture(gl, {
		target: gl.TEXTURE_2D_ARRAY,
		width: 16,
		height: 16,
		depth: 32,
		min: gl.LINEAR,
		mag: gl.NEAREST,
		wrap: gl.REPEAT,
		src: '../imgs/minecraft-block-textures.webp'
	})
	
  return drawChunk

  /**
   * Draw the chunk
   * @param {Float32Array} viewProjection
   */
  function drawChunk(viewProjection) {
  	gl.useProgram(programInfo.program)
  	twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
  	twgl.setUniforms(programInfo, { viewProjection, blocks })
  	twgl.drawBufferInfo(gl, bufferInfo)
  }

}
