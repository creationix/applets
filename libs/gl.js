
/**
 * @typedef {{location:number,vertex:WebGLBuffer,index:WebGLBuffer}} IndexedBufferInfo
 */

/**
 * @typedef {{location:WebGLUniformLocation,size:number,type:number}} UniformInfo
 */

/**
 * @typedef {{[name:string]:UniformInfo}} UniformInfos
 */

/**
* @typedef {{location:number,size:number,type:number,buffer:WebGLBuffer}} AttributeInfo
*/

/**
* @typedef {{[name:string]:AttributeInfo} AttributeInfos
*/

/**
 * @typedef {Object} ProgramInfo
 * @property {WebGLProgram} program
 * @property {UniformInfos} uniforms
 * @property {AttributeInfos} attributes
 */

/**
 * @typedef {Object} BufferInfo
 * @property {number} numElements
 * @property {WebGLBuffer|null} indices
 * @property {AttributeInfos} attribs
 */

/**
 * Load an image as a promise
 * @param {string} src
 */
export async function loadImage (src) {
  const img = document.createElement('img')
  img.setAttribute('src', src)
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })
  return img
}

/**
 * Create a program from shader source and look up attribute and uniform reflection data.
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 * @returns {ProgramInfo}
 */
export function createProgram (gl, vertSource, fragSource) {
  const vert = gl.createShader(gl.VERTEX_SHADER)
  if (!vert) throw new Error('Problem creating new vertex shader')
  const frag = gl.createShader(gl.FRAGMENT_SHADER)
  if (!frag) throw new Error('Problem creating new fragment shader')
  gl.shaderSource(vert, vertSource)
  gl.shaderSource(frag, fragSource)
  gl.compileShader(vert)
  gl.compileShader(frag)
  const program = gl.createProgram()
  if (!program) throw new Error('Problem creating new shader program')
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const messages = [gl.getProgramInfoLog(program)]
    const vertMessage = gl.getShaderInfoLog(vert)
    if (vertMessage) messages.push(vertMessage)
    const fragMessage = gl.getShaderInfoLog(frag)
    if (fragMessage) messages.push(fragMessage)
    throw new Error(messages.join('\n'))
  }
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)

  /** @type {UniformInfos} */
  const uniforms = {}
  for (let i = 0; i < numUniforms; i++) {
    const info = gl.getActiveUniform(program, i)
    if (!info) throw new Error('Problem reflecting uniform')
    const { name, size, type } = info
    const location = gl.getUniformLocation(program, name)
    uniforms[name] = { location, size, type }
  }
  /** @type {AttributeInfos} */
  const attributes = {}
  const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
  for (let i = 0; i < numAttributes; i++) {
    const info = gl.getActiveAttrib(program, i)
    if (!info) throw new Error('Problem reflecting attribute')
    const { name, size, type } = info
    const location = gl.getAttribLocation(program, name)
    attributes[name] = { location, size, type }
  }
  return { program, uniforms, attributes }
}

const typeSizes = {
  0x8b51: 3, // vec3
  0x8b52: 4 // vec4
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {AttributeInfos} attribs
 * @param {{[name:string]:Float32Array|Uint8Array|null}} arrays
 * @returns {BufferInfo}
 */
export function createBuffer (gl, attribs, arrays) {
  /** @type {number} */
  let numElements
  /** @type {WebGLBuffer?} */
  let indices = null

  const hasIndex = !!arrays.indices

  function setNum (num) {
    if (numElements === undefined) {
      numElements = num
    } else if (numElements !== num) {
      throw new Error('Element number mismatch')
    }
  }
  for (const name in arrays) {
    const array = arrays[name]
    const isIndex = name === 'indices'
    const target = isIndex ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER
    const buffer = gl.createBuffer()
    if (!buffer) throw new Error('Problem creating buffer')
    gl.bindBuffer(target, buffer)
    gl.bufferData(target, array, gl.STATIC_DRAW)
    gl.bindBuffer(target, null)

    if (isIndex) {
      indices = buffer
      setNum(array.length)
    } else {
      const info = attribs[name]
      info.buffer = buffer
      if (!hasIndex) {
        const typeSize = typeSizes[info.type]
        if (!typeSize) throw new Error(`No known size for type 0x${info.type.toString(16)}`)
        setNum(array.length / typeSize)
      }
    }
  }
  return { numElements, indices, attribs }
}

/**
 * Create a cubemap from a single texture.
 * The texture needs to be 2 wide by 3 tall in the following arrangement.
 *   +x -x
 *   +y -x
 *   +z -z
 * @param {WebGL2RenderingContext} gl
 * @param {HTMLImageElement} img
 */
export function createCubeMap (gl, img) {
  const width = img.width / 2
  const height = img.height / 3
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const texture = gl.createTexture()
  if (!texture) throw new Error('Problem creating cubemap texture')
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)
  ctx.drawImage(img, 0, 0, width, height, 0, 0, width, height)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  ctx.drawImage(img, width, 0, width, height, 0, 0, width, height)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  ctx.drawImage(img, 0, height, width, height, 0, 0, width, height)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  ctx.drawImage(img, width, height, width, height, 0, 0, width, height)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  ctx.drawImage(img, 0, height * 2, width, height, 0, 0, width, height)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  ctx.drawImage(img, width, height * 2, width, height, 0, 0, width, height)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP)
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null)
  return texture
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {number} w
 * @param {number} h
 * @param {number} d
 * @param {HTMLImageElement} img
 */
export function createArrayTexture (gl, w, h, d, img) {
  const texture = gl.createTexture()
  if (!texture) throw new Error('Problem creating array texture')
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, w, h, d)
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, w, h, d, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY)
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null)
  return texture
}

const attributeSetters = {
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {number} location
     * @param {number} size
     * @param {WebGLBuffer} value
     */
  0x8b51: function setFloatVec3Buffer (gl, location, size, value) {
    gl.bindBuffer(gl.ARRAY_BUFFER, value)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0)
  },
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {number} location
     * @param {number} size
     * @param {WebGLBuffer} value
     */
  0x8b52: function setFloatVec4Buffer (gl, location, size, value) {
    gl.bindBuffer(gl.ARRAY_BUFFER, value)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 0, 0)
  }
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {AttributeInfos} attributeInfo
 * @param {BufferInfo} bufferInfo
 */
export function setBuffersAndAttributes (gl, bufferInfo) {
  const { attribs, indices } = bufferInfo
  for (const name in attribs) {
    const info = attribs[name]
    if (!info) throw new Error(`Unknown attribute '${name}'`)
    const { location, size, type, buffer } = info
    const setter = attributeSetters[type]
    if (!setter) throw new Error(`Unsupported type 0x${type.toString(16)}`)
    setter(gl, location, size, buffer)
  }
  if (indices) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices)
  }
}

const uniformSetters = {
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {WebGLUniformLocation} location
     * @param {number} size
     * @param {Float32Array} value
     */
  0x8b5c: function setFloatMat4 (gl, location, size, value) {
    gl.uniformMatrix4fv(location, false, value)
  },
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {WebGLUniformLocation} location
     * @param {number} size
     * @param {WebGLTexture} value
     */
  0x8b60: function setSamplerCube (gl, location, size, value) {
    gl.uniform1i(location, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, value)
    gl.bindSampler(0, null)
  },
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {WebGLUniformLocation} location
     * @param {number} size
     * @param {WebGLTexture} value
     */
  0x8dc1: function setSampler2dArray (gl, location, size, value) {
    gl.uniform1i(location, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, value)
    gl.bindSampler(0, null)
  }
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {UniformInfos} uniformInfo
 * @param {{[name:string]:WebGLTexture|Float32Array}} uniforms
 */
export function setUniforms (gl, uniformInfo, uniforms) {
  for (const name in uniforms) {
    const info = uniformInfo[name]
    if (!info) throw new Error(`Unknown uniform '${name}'`)
    const value = uniforms[name]
    const { location, size, type } = info
    const setter = uniformSetters[type]
    if (!setter) throw new Error(`Unsupported type 0x${type.toString(16)}`)
    setter(gl, location, size, value)
  }
}
