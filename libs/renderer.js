import data from './chunk-data.js'
import makeSky from "./sky.js"

/**
 * @param {WebGL2RenderingContext} gl
 */
export default async function renderer (gl) {
  const sky = makeSky(gl)
  // Load shaders and texture
  const [img, program] = await Promise.all([
    loadImage('../imgs/minecraft-block-textures.webp'),
    loadProgram(gl, '../libs/shaders/block.vert', '../libs/shaders/block.frag')
  ])
  gl.useProgram(program)

  // Load uniform locations.
  const projectionVar = gl.getUniformLocation(program, 'projection')
  const texVar = gl.getUniformLocation(program, 'tex')
  const viewVar = gl.getUniformLocation(program, 'view')

  const lightPosVar = gl.getUniformLocation(program, 'lightPos')
  const lightColorVar = gl.getUniformLocation(program, 'lightColor')
  const ambientColorVar = gl.getUniformLocation(program, 'ambientColor')

  gl.activeTexture(gl.TEXTURE0)
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex)
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 16, 16, 32)
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, 16, 16, 32, gl.RGBA, gl.UNSIGNED_BYTE, img)
  // gl.generateMipmap(gl.TEXTURE_2D_ARRAY)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.uniform1i(texVar, 0) // Note 0, not gl.TEXTURE0

  const vertexBuffer = gl.createBuffer()
  if (!vertexBuffer) throw new Error('Problem creating buffer')
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

  // Associate the shader programs to buffer objects
  const coordinates = gl.getAttribLocation(program, 'coordinates')
  gl.enableVertexAttribArray(coordinates)
  gl.vertexAttribPointer(coordinates, 4, gl.FLOAT, false, 0, 0)

  gl.clearColor(0, 0, 0, 0.5)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)

  return fnuction draw ([x,y,w,h], P, V, time) {
      const a = time / 12 * Math.PI
      gl.uniform3f(lightPosVar, Math.sin(a) * 100, -Math.abs(Math.cos(a) * 100), 0)
      gl.uniform3f(lightColorVar, 1, 0.9, 0.8)
      gl.uniform3f(ambientColorVar, 0.2, 0.2, 0.2)

      gl.viewport(x, y, w, h)
      gl.uniformMatrix4fv(projectionVar, false, P)
      gl.uniformMatrix4fv(viewVar, false, V)
      // gl.drawArrays(gl.LINES, 0, data.length >> 2)
      gl.drawArrays(gl.TRIANGLES, 0, data.length >> 2)
    }
  }
}

/**
 * Load two shaders from files and compile into a program.
 * @param {WebGL2RenderingContext} gl rendering context
 * @param {string} vertFile path to vertex shader file
 * @param {string} fragFile path to fragment shader file
 * @returns {Promise<WebGLProgram>}
 */
async function loadProgram (gl, vertFile, fragFile) {
  const program = gl.createProgram()
  const [vert, frag] = await Promise.all([
    loadShader(gl, vertFile, gl.VERTEX_SHADER),
    loadShader(gl, fragFile, gl.FRAGMENT_SHADER)
  ])
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  return program
}

/**
 * Load a shader from a file using fetch.
 * @param {string} path
 * @param {number} type
 * @returns {Promise<WebGLShader>}
 */
async function loadShader (gl, path, type) {
  const res = await window.fetch(path)
  const source = await res.text()
  const shader = gl.createShader(type)
  if (!shader) throw new Error(`GLERROR ${gl.getError()}: Problem creating shader`)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

/**
 * @param {string} path path to image file
 * @returns {Promise<HTMLImageElement>}
 */
async function loadImage (path) {
  const img = document.createElement('img')
  img.setAttribute('src', path)
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject })
  return img
}
