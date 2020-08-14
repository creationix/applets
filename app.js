import { invert, targetTo, perspective, create as createMat4 } from './gl-matrix/src/mat4.js'
import { normalize, scaleAndAdd } from './gl-matrix/src/vec3.js'

document.body.textContent = ''
const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

/** @type {number} Width of viewport in pixels */
let width
/** @type {number} Height of viewport in pixels */
let height

const ctx = canvas.getContext('webgl2', {
  antialias: true,
  preserveDrawingBuffer: false
})
if (!ctx) throw new Error('Problem getting webgl2 context')
const gl = ctx

const img = document.createElement('img')
img.setAttribute('src', 'minecraft-block-textures.png')
img.onload = draw

/**
 * @param {string[]} strings
 * @param  {...any} parts
 * @returns {WebGLShader}
 */
function vert (strings, ...parts) {
  if (parts.length) throw new Error('No interpolation allowed yet')
  const source = strings.join('')
  const shader = gl.createShader(gl.VERTEX_SHADER)
  if (!shader) throw new Error(`GLERROR ${gl.getError()}: Problem creating shader`)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

/**
 * @param {string[]} strings
 * @param  {...any} parts
 * @returns {WebGLShader}
 */
function frag (strings, ...parts) {
  if (parts.length) throw new Error('No interpolation allowed yet')
  const source = strings.join('')
  const shader = gl.createShader(gl.FRAGMENT_SHADER)
  if (!shader) throw new Error(`GLERROR ${gl.getError()}: Problem creating shader`)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

function draw () {
  // Create and compile Shader programs
  const program = gl.createProgram()
  gl.attachShader(program, vert`#version 300 es
    precision highp float;

    in vec4 coordinates;

    uniform mat4 view;
    uniform mat4 projection;

    out float textureIndex;
    out highp vec3 textureCoord;
    out mediump vec3 normal;

    void main(void) {
      gl_Position = projection * view * vec4(coordinates.xyz, 1.0);
      int meta = int(coordinates.w);
      textureCoord = vec3((meta >> 15) & 0x1f, (meta >> 10) & 0x1f, meta & 0x3ff);
      int ni = meta >> 20;
      int ns = (ni & 1)*2-1;
      normal = (ni&4)==4 ? vec3(ns,0,0) : (ni&2)==2 ? vec3(0,ns,0) : vec3(0,0,ns);
    }
  `)
  gl.attachShader(program, frag`#version 300 es
    precision highp float;

    uniform mediump sampler2DArray tex;

    in highp vec3 textureCoord;
    in mediump vec3 normal;

    out vec4 outColor;

    void main(void) {
      vec4 normalColor =vec4((normal + vec3(1,1,1)) *.5,1);
      vec4 textureColor = texture(tex, textureCoord);
      if(textureColor.a < 0.5) discard;
      outColor = mix(textureColor, normalColor, 0.);
    }
  `)
  gl.linkProgram(program)
  gl.useProgram(program)

  const M = createMat4()

  const projectionVar = gl.getUniformLocation(program, 'projection')

  function resize () {
    width = window.innerWidth
    height = window.innerHeight
    canvas.setAttribute('width', width)
    canvas.setAttribute('height', height)
    gl.viewport(0, 0, width, height)
    gl.uniformMatrix4fv(projectionVar, false, perspective(M, 1, width / height, 0.1, 100))
  }
  window.onresize = resize

  const samplerLoc = gl.getUniformLocation(program, 'tex')
  // Load the texture if it's used.
  if (samplerLoc) {
    gl.activeTexture(gl.TEXTURE0)
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex)
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 16, 16, 32)
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, 16, 16, 32, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    // gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, 16, 16, 32, 0, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.uniform1i(samplerLoc, 0) // Note 0, not gl.TEXTURE0
    // gl.bindTexture(gl.TEXTURE_2D_ARRAY, null)
  }

  // 10 bits for texture index
  const BARREL_TOP = 0
  const BARREL_SIDE = 1
  const BARREL_BOTTOM = 2
  const BARREL_OPEN = 3
  const BOOKSHELF = 4
  const OAK_PLANKS = 5
  const OAK_LOG = 6
  const OAK_END = 7
  const STRIPPED_OAK_LOG = 8
  const STRIPPED_OAK_END = 9
  const STONE = 10
  const GRASS_BLOCK_TOP = 11
  const GRASS_BLOCK_SIDE = 12
  const DIRT_BLOCK = 13
  const HAY_TOP = 14
  const HAY_SIDE = 15
  const GLASS = 16
  const FURNACE_BOTTOM = 17
  const FURNACE_SIDE = 18
  const FURNACE_FRONT = 19
  const FURNACE_FRONT_ON = 20
  const MUSIC_BOX_TOP = 21
  const MUSIC_BOX_SIDE = 22
  const LOOM_TOP = 23
  const LOOM_FRONT = 24
  const LOOM_SIDE = 25
  const COBBLESTONE = 26
  const CRAFTING_TABLE_TOP = 27
  const CRAFTING_TABLE_FRONT = 28
  const CRAFTING_TABLE_SIDE = 29
  const PUMPKIN_TOP = 30
  const PUMPKIN_SIDE = 31

  // 5 bits for texture x coordinate (needs 0-16 range)
  // 5 bits for texture y coordinate (needs 0-16 range)
  const TL = (w, h) => 0
  const BL = (w, h) => h << 10
  const TR = (w, h) => w << 15
  const BR = (w, h) => w << 15 | h << 10

  // 3 bits for normal index
  const RIGHT = 0 << 20 // 1,0,0
  const LEFT = 1 << 20 // -1,0,0
  const TOP = 2 << 20 // 0,1,0
  const BOTTOM = 3 << 20 // 0,-1,0
  const FRONT = 4 << 20 // 0,0,1
  const BACK = 5 << 20 // 0,0,-1

  // 1 bit of precision leftover

  function generateBlock (x, y, z, w, h, d, right, left, top, bottom, front, back) {
    return [
      // x, y, z, normal index | texture coordinate index | texture index
      x + w, y + 0, z + 0, RIGHT | BR(d, h) | right,
      x + w, y + h, z + 0, RIGHT | TR(d, h) | right,
      x + w, y + 0, z + d, RIGHT | BL(d, h) | right,
      x + w, y + 0, z + d, RIGHT | BL(d, h) | right,
      x + w, y + h, z + 0, RIGHT | TR(d, h) | right,
      x + w, y + h, z + d, RIGHT | TL(d, h) | right,
      x + 0, y + 0, z + 0, LEFT | BL(d, h) | left,
      x + 0, y + 0, z + d, LEFT | BR(d, h) | left,
      x + 0, y + h, z + 0, LEFT | TL(d, h) | left,
      x + 0, y + h, z + 0, LEFT | TL(d, h) | left,
      x + 0, y + 0, z + d, LEFT | BR(d, h) | left,
      x + 0, y + h, z + d, LEFT | TR(d, h) | left,
      x + 0, y + h, z + 0, TOP | TL(w, d) | top,
      x + 0, y + h, z + d, TOP | BL(w, d) | top,
      x + w, y + h, z + 0, TOP | TR(w, d) | top,
      x + w, y + h, z + 0, TOP | TR(w, d) | top,
      x + 0, y + h, z + d, TOP | BL(w, d) | top,
      x + w, y + h, z + d, TOP | BR(w, d) | top,
      x + 0, y + 0, z + 0, BOTTOM | TR(w, d) | bottom,
      x + w, y + 0, z + 0, BOTTOM | TL(w, d) | bottom,
      x + 0, y + 0, z + d, BOTTOM | BR(w, d) | bottom,
      x + 0, y + 0, z + d, BOTTOM | BR(w, d) | bottom,
      x + w, y + 0, z + 0, BOTTOM | TL(w, d) | bottom,
      x + w, y + 0, z + d, BOTTOM | BL(w, d) | bottom,
      x + 0, y + 0, z + d, FRONT | BL(w, h) | front,
      x + w, y + 0, z + d, FRONT | BR(w, h) | front,
      x + 0, y + h, z + d, FRONT | TL(w, h) | front,
      x + 0, y + h, z + d, FRONT | TL(w, h) | front,
      x + w, y + 0, z + d, FRONT | BR(w, h) | front,
      x + w, y + h, z + d, FRONT | TR(w, h) | front,
      x + 0, y + 0, z + 0, BACK | BR(w, h) | back,
      x + 0, y + h, z + 0, BACK | TR(w, h) | back,
      x + w, y + 0, z + 0, BACK | BL(w, h) | back,
      x + w, y + 0, z + 0, BACK | BL(w, h) | back,
      x + 0, y + h, z + 0, BACK | TR(w, h) | back,
      x + w, y + h, z + 0, BACK | TL(w, h) | back
    ]
  }
  // Define the geometry and store it in buffer objects
  const data = new Float32Array([
    ...generateBlock(0, 0, 0, 16, 1, 16, STONE, STONE, STONE, STONE, STONE, STONE),
    ...generateBlock(0, 1, 0, 16, 1, 16, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK),

    ...generateBlock(0, 2, 0, 5, 1, 16, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
    ...generateBlock(14, 2, 0, 2, 1, 16, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
    ...generateBlock(5, 2, 0, 9, 1, 4, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
    ...generateBlock(5, 2, 11, 9, 1, 5, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),

    ...generateBlock(5, 2, 4, 9, 1, 7, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE),
    ...generateBlock(5, 3, 4, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
    ...generateBlock(5, 3, 10, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
    ...generateBlock(13, 3, 4, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
    ...generateBlock(13, 3, 10, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),

    ...generateBlock(5, 3, 5, 1, 2, 5, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
    ...generateBlock(5, 6, 5, 1, 2, 5, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
    ...generateBlock(5, 8, 6, 1, 1, 3, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
    ...generateBlock(5, 9, 7, 1, 1, 1, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
    ...generateBlock(5, 5, 5, 1, 1, 5, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),

    ...generateBlock(6, 3, 4, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
    ...generateBlock(12, 3, 4, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
    ...generateBlock(7, 3, 4, 5, 1, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
    ...generateBlock(7, 6, 4, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
    ...generateBlock(7, 4, 4, 5, 2, 1, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),

    ...generateBlock(6, 3, 10, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
    ...generateBlock(12, 3, 10, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
    ...generateBlock(7, 3, 10, 5, 1, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
    ...generateBlock(7, 6, 10, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
    ...generateBlock(7, 4, 10, 5, 2, 1, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),
    ...generateBlock(7, 6, 10, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),

    ...generateBlock(1, 3, 2, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
    ...generateBlock(2, 3, 4, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
    ...generateBlock(3, 3, 3, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
    ...generateBlock(2, 3, 2, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
    ...generateBlock(4, 3, 1, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),

    ...generateBlock(6, 3, 5, 2, 2, 3, HAY_SIDE, HAY_SIDE, HAY_TOP, HAY_TOP, HAY_SIDE, HAY_SIDE),
    ...generateBlock(8, 3, 5, 1, 1, 1, BARREL_SIDE, BARREL_SIDE, BARREL_TOP, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE),
    ...generateBlock(6, 3, 8, 1, 1, 1, BARREL_SIDE, BARREL_SIDE, BARREL_OPEN, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE),

    ...generateBlock(6, 3, 9, 2, 3, 1, BOOKSHELF, BOOKSHELF, OAK_PLANKS, OAK_PLANKS, BOOKSHELF, BOOKSHELF),
    ...generateBlock(9, 3, 9, 1, 1, 1, FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT),
    ...generateBlock(10, 3, 9, 1, 1, 1, FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT_ON),
    ...generateBlock(11, 3, 9, 1, 1, 1, MUSIC_BOX_SIDE, MUSIC_BOX_SIDE, MUSIC_BOX_TOP, MUSIC_BOX_TOP, MUSIC_BOX_SIDE, MUSIC_BOX_SIDE),

    ...generateBlock(11, 3, 5, 1, 1, 1, LOOM_SIDE, LOOM_SIDE, LOOM_TOP, OAK_PLANKS, LOOM_FRONT, LOOM_SIDE),
    ...generateBlock(12, 3, 5, 1, 1, 1, CRAFTING_TABLE_SIDE, CRAFTING_TABLE_SIDE, CRAFTING_TABLE_TOP, OAK_PLANKS, CRAFTING_TABLE_FRONT, CRAFTING_TABLE_SIDE)

  ])
  const vertexBuffer = gl.createBuffer()
  if (!vertexBuffer) throw new Error('Problem creating buffer')
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

  // Associate the shader programs to buffer objects
  const coordinates = gl.getAttribLocation(program, 'coordinates')
  gl.enableVertexAttribArray(coordinates)
  gl.vertexAttribPointer(coordinates, 4, gl.FLOAT, false, 0, 0)

  const viewVar = gl.getUniformLocation(program, 'view')

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0)

  // Enable the depth test
  gl.enable(gl.DEPTH_TEST)

  // gl.enable(gl.SAMPLE_COVERAGE)
  // gl.sampleCoverage(0.5, false)

  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)

  const center = [8, 8, 8]
  const up = [0, 1, 0]

  resize()

  /** @type {number|null} */
  let anglex = null
  /** @type {number|null} */
  let angley = null
  window.onmousemove = (/** @type {MouseEvent} */ evt) => {
    anglex = evt.clientX * 0.02
    angley = evt.clientY * 0.02
  }

  window.requestAnimationFrame(render)
  function render () {
    const nowx = anglex || Date.now() * 0.001
    const nowy = angley || Date.now() * 0.0003
    const camera = [Math.sin(nowx) * 16, Math.sin(nowy) * 16, Math.cos(nowx) * 16]
    targetTo(M, scaleAndAdd(camera, center, normalize(camera, camera), 30), center, up)
    invert(M, M)
    gl.uniformMatrix4fv(viewVar, false, M)

    // Clear the color buffer bit
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.drawArrays(gl.TRIANGLES, 0, data.length >> 2)

    window.requestAnimationFrame(render)
  }
}
