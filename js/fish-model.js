const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aTexCoord;
  uniform float uPhase;
  uniform float uDirection;
  varying vec2 vTexCoord;
  varying vec3 vNormal;

  void main() {
    float tailWeight = 1.0 - smoothstep(-0.72, -0.25, aPosition.y);
    float tailSway = sin(uPhase * 3.2) * 0.18 * tailWeight * tailWeight;
    vec3 position = aPosition;
    position.x += tailSway;
    gl_Position = vec4(position.y * uDirection * 0.95, position.x * 1.9, -position.z * 0.08, 1.0);
    vTexCoord = aTexCoord;
    vNormal = aNormal;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D uTexture;
  varying vec2 vTexCoord;
  varying vec3 vNormal;

  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    if (color.a < 0.05) discard;
    vec3 lightDirection = normalize(vec3(-0.33, 0.48, 0.81));
    float lighting = 0.55 + max(dot(normalize(vNormal), lightDirection), 0.0) * 0.5;
    gl_FragColor = vec4(color.rgb * lighting, color.a);
  }
`;

function readAccessor(document, binary, accessorIndex) {
  const accessor = document.accessors[accessorIndex];
  const bufferView = document.bufferViews[accessor.bufferView];
  const components = accessor.type === "SCALAR" ? 1 : Number(accessor.type.slice(-1));
  const componentBytes = accessor.componentType === 5126 || accessor.componentType === 5125
    ? 4
    : accessor.componentType === 5123
      ? 2
      : 1;
  const stride = bufferView.byteStride || components * componentBytes;
  const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const data = new DataView(binary);
  const values = new Float32Array(accessor.count * components);

  for (let item = 0; item < accessor.count; item += 1) {
    for (let component = 0; component < components; component += 1) {
      const offset = start + item * stride + component * componentBytes;
      let value;
      if (accessor.componentType === 5126) value = data.getFloat32(offset, true);
      else if (accessor.componentType === 5125) value = data.getUint32(offset, true);
      else if (accessor.componentType === 5123) value = data.getUint16(offset, true);
      else value = data.getUint8(offset);
      values[item * components + component] = accessor.normalized
        ? value / (accessor.componentType === 5121 ? 255 : 65535)
        : value;
    }
  }
  return values;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Fish shader compilation failed: ${message}`);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Fish shader link failed: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function createBuffer(gl, target, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return buffer;
}

export class FishModel {
  constructor(documentData, binary, textureImage) {
    this.document = documentData;
    this.textureImage = textureImage;
    this.hasProceduralTailRig = true;
    this.canvas = globalThis.document.createElement("canvas");
    this.canvas.width = 128;
    this.canvas.height = 64;
    this.gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    if (!this.gl) throw new Error("WebGL is unavailable for rendering the textured fish model.");

    const gl = this.gl;
    this.program = createProgram(gl);
    this.locations = {
      position: gl.getAttribLocation(this.program, "aPosition"),
      normal: gl.getAttribLocation(this.program, "aNormal"),
      texCoord: gl.getAttribLocation(this.program, "aTexCoord"),
      phase: gl.getUniformLocation(this.program, "uPhase"),
      direction: gl.getUniformLocation(this.program, "uDirection"),
      texture: gl.getUniformLocation(this.program, "uTexture"),
    };
    this.parts = [];

    for (const mesh of documentData.meshes) {
      for (const primitive of mesh.primitives) {
        if (primitive.attributes.TEXCOORD_0 === undefined || primitive.indices === undefined) {
          throw new Error("Fish model must include indexed geometry and texture coordinates.");
        }
        const positions = readAccessor(documentData, binary, primitive.attributes.POSITION);
        const normals = readAccessor(documentData, binary, primitive.attributes.NORMAL);
        const texCoords = readAccessor(documentData, binary, primitive.attributes.TEXCOORD_0);
        const indices = readAccessor(documentData, binary, primitive.indices);
        if (positions.length / 3 > 65535) {
          throw new Error("Fish model has too many vertices for the lightweight renderer.");
        }
        const indexData = new Uint16Array(indices.length);
        for (let index = 0; index < indices.length; index += 1) {
          if (indices[index] >= positions.length / 3) {
            throw new Error("Fish model contains an index outside its vertex data.");
          }
          indexData[index] = indices[index];
        }
        this.parts.push({
          position: createBuffer(gl, gl.ARRAY_BUFFER, positions),
          normal: createBuffer(gl, gl.ARRAY_BUFFER, normals),
          texCoord: createBuffer(gl, gl.ARRAY_BUFFER, texCoords),
          indices: createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, indexData),
          indexCount: indexData.length,
        });
      }
    }

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.program);
    gl.uniform1i(this.locations.texture, 0);
  }

  static async load(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fish model request failed (${response.status})`);
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    if (buffer.byteLength < 12 ||
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2) {
      throw new Error("Fish model is not a valid glTF 2.0 binary file.");
    }

    let offset = 12;
    let documentData = null;
    let binary = null;
    while (offset < buffer.byteLength) {
      if (offset + 8 > buffer.byteLength) throw new Error("Fish model contains a truncated chunk.");
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      offset += 8;
      if (offset + length > buffer.byteLength) throw new Error("Fish model contains an invalid chunk length.");
      if (type === 0x4e4f534a) {
        documentData = JSON.parse(
          new TextDecoder().decode(buffer.slice(offset, offset + length)).trim(),
        );
      } else if (type === 0x004e4942) {
        binary = buffer.slice(offset, offset + length);
      }
      offset += length;
    }
    if (!documentData || !binary) {
      throw new Error("Fish model is missing its glTF JSON or geometry data.");
    }

    const image = documentData.images && documentData.images[0];
    if (!image || image.bufferView === undefined || !image.mimeType) {
      throw new Error("Fish model is missing its embedded base-color texture.");
    }
    const imageView = documentData.bufferViews[image.bufferView];
    const imageBytes = binary.slice(
      imageView.byteOffset || 0,
      (imageView.byteOffset || 0) + imageView.byteLength,
    );
    const textureImage = await createImageBitmap(new Blob([imageBytes], { type: image.mimeType }));
    return new FishModel(documentData, binary, textureImage);
  }

  draw(ctx, fish) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform1f(this.locations.phase, fish.phase);
    gl.uniform1f(this.locations.direction, fish.direction);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    for (const part of this.parts) {
      gl.bindBuffer(gl.ARRAY_BUFFER, part.position);
      gl.enableVertexAttribArray(this.locations.position);
      gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, part.normal);
      gl.enableVertexAttribArray(this.locations.normal);
      gl.vertexAttribPointer(this.locations.normal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, part.texCoord);
      gl.enableVertexAttribArray(this.locations.texCoord);
      gl.vertexAttribPointer(this.locations.texCoord, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.indices);
      gl.drawElements(gl.TRIANGLES, part.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    const size = fish.size;
    ctx.drawImage(
      this.canvas,
      fish.x - 56 * size,
      fish.y + Math.sin(fish.phase) * 1.7 - 28 * size,
      112 * size,
      56 * size,
    );
  }
}
