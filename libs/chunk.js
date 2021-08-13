import data from './chunk-data.js'
import generateMesh from './gen-chunk-mesh.js'
import { blockNames } from './blocks.js'

import {
  createArrayTexture,
  createBuffer,
  createProgram,
  loadImage,
  setBuffersAndAttributes,
  setUniforms
} from './gl.js'

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
    int ns = 1-(ni & 1)*2;
    uv = vec3((meta >> 15) & 0x1f, (meta >> 10) & 0x1f, meta & 0x3ff);
    normal = (ni&4)==4 ? vec3(0,0,ns) : (ni&2)==2 ? vec3(0,ns,0) : vec3(ns,0,0);
    position = data.xyz;
  }
`

const frag = `#version 300 es
  precision highp float;

  uniform highp sampler2DArray blocks;
  uniform vec3 light1Pos;
  uniform vec3 light2Pos;
  uniform vec3 eyePos;

  in vec3 uv;
  in vec3 normal;
  in vec3 position;

  out vec4 outColor;

  void main(void) {
    vec4 textureColor = texture(blocks, uv);
    if (textureColor.a < 0.5) {
      discard;
    }
    float ambient = .2;

    vec3 lightDir = normalize(light1Pos - position);
    float diff = max(dot(normal, lightDir), 0.0)*.6;
    vec3 viewDir = normalize(eyePos - position);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.)*.2;
    float light1 = diff + spec;
    
    lightDir = normalize(light2Pos - position);
    diff = max(dot(normal, lightDir), 0.0)*.6;
    reflectDir = reflect(-lightDir, normal);
    spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.)*.2;
    float light2 = diff + spec;

    outColor = vec4(vec3(ambient + light1 + light2),1) * textureColor;
    // outColor = vec4(normal * 0.5 + 0.5, 1);
  }
`

/** Block textures image */
const img = loadImage('../imgs/minecraft-block-textures.avif')
// const img2 = loadImage('../imgs/blank.avif')

/**
 * @param {WebGL2RenderingContext} gl
 */
export default async function makeChunk(gl) {
  const programInfo = createProgram(gl, vert, frag)
  const bufferInfo = createBuffer(gl, programInfo.attributes, { data: generateMesh(data) })
  const blocks = createArrayTexture(gl, 16, 16, 32, await img)
  // const border = createArrayTexture(gl, 16, 16, 32, await img2)

  setInterval(() => {
    let i
    do { i = Math.floor(Math.random() * 4096) } while (!data[i])
    let x = (i >> 0) & 15
    let y = (i >> 4) & 15
    let z = (i >> 8) & 15
    do {
      x = Math.min(16, Math.max(0, x + Math.floor(Math.random() * 3) - 1))
      y = Math.min(16, Math.max(0, y + Math.floor(Math.random() * 3) - 1))
      z = Math.min(16, Math.max(0, z + Math.floor(Math.random() * 3) - 1))
    } while (data[x | (y << 4) | (z << 8)])
    data[x | (y << 4) | (z << 8)] = data[i]
    data[i] = 0

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.data.buffer)
    const newMesh = generateMesh(data)
    bufferInfo.numElements = newMesh.length >> 2
    gl.bufferData(gl.ARRAY_BUFFER, newMesh, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }, 500)

  return drawChunk

  /**
   * Draw the chunk
   * @param {Float32Array} viewProjection
   */
  function drawChunk(viewProjection, { eyePos, light1Pos, light2Pos }) {
    gl.useProgram(programInfo.program)
    setUniforms(gl, programInfo.uniforms, { viewProjection, blocks, eyePos, light1Pos, light2Pos })
    setBuffersAndAttributes(gl, bufferInfo)
    gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements)
    // setUniforms(gl, programInfo.uniforms, { blocks: border, position })
    // gl.drawArrays(gl.LINES, 0, bufferInfo.numElements)
  }
}
