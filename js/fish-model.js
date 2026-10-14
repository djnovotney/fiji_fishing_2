const FLOAT_BYTES = 4;
const UNSIGNED_SHORT_BYTES = 2;

function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiplyMatrices(a, b) {
  const result = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        result[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
      }
    }
  }
  return result;
}

function translationMatrix([x, y, z]) {
  const matrix = identityMatrix();
  matrix[12] = x;
  matrix[13] = y;
  matrix[14] = z;
  return matrix;
}

function rotationMatrix([x, y, z, w]) {
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  return [
    1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
    2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
    2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
    0, 0, 0, 1,
  ];
}

function scaleMatrix([x, y, z]) {
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export class FishModel {
  constructor(document, binary) {
    this.document = document;
    this.binary = binary;
    this.accessorCache = new Map();
    this.nodesByMesh = new Map();
    this.parents = new Map();
    this.sprites = new Map();
    for (let index = 0; index < document.nodes.length; index += 1) {
      const node = document.nodes[index];
      if (node.mesh !== undefined) this.nodesByMesh.set(node.mesh, index);
      for (const child of node.children || []) this.parents.set(child, index);
    }
    this.primitives = document.meshes.map((mesh) => mesh.primitives.map((primitive) => ({
      positions: this.accessor(primitive.attributes.POSITION),
      normals: this.accessor(primitive.attributes.NORMAL),
      colors: this.accessor(primitive.attributes.COLOR_0),
      joints: primitive.attributes.JOINTS_0 === undefined
        ? null
        : this.accessor(primitive.attributes.JOINTS_0),
      weights: primitive.attributes.WEIGHTS_0 === undefined
        ? null
        : this.accessor(primitive.attributes.WEIGHTS_0),
      indices: this.accessor(primitive.indices),
      material: primitive.material,
    })));
    const skin = document.skins && document.skins[0];
    this.skin = skin ? {
      joints: skin.joints,
      inverseBindMatrices: this.accessor(skin.inverseBindMatrices),
    } : null;
  }

  static async load(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fish model request failed (${response.status})`);
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
      throw new Error("Fish model is not a valid glTF 2.0 binary file.");
    }
    let offset = 12;
    let document = null;
    let binary = null;
    while (offset < buffer.byteLength) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      offset += 8;
      if (type === 0x4e4f534a) {
        document = JSON.parse(new TextDecoder().decode(buffer.slice(offset, offset + length)).trim());
      } else if (type === 0x004e4942) {
        binary = buffer.slice(offset, offset + length);
      }
      offset += length;
    }
    if (!document || !binary) throw new Error("Fish model is missing its glTF JSON or geometry data.");
    return new FishModel(document, binary);
  }

  accessor(index) {
    if (this.accessorCache.has(index)) return this.accessorCache.get(index);
    const accessor = this.document.accessors[index];
    const view = this.document.bufferViews[accessor.bufferView];
    const componentBytes = accessor.componentType === 5126
      ? FLOAT_BYTES
      : accessor.componentType === 5123
        ? UNSIGNED_SHORT_BYTES
        : 1;
    const componentCount = accessor.type === "SCALAR"
      ? 1
      : accessor.type === "VEC2"
        ? 2
        : accessor.type === "VEC3"
          ? 3
          : accessor.type === "VEC4"
            ? 4
            : 16;
    const stride = view.byteStride || componentBytes * componentCount;
    const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const data = new DataView(this.binary);
    const values = new Array(accessor.count);
    for (let item = 0; item < accessor.count; item += 1) {
      values[item] = new Array(componentCount);
      for (let component = 0; component < componentCount; component += 1) {
        const offset = start + item * stride + component * componentBytes;
        if (accessor.componentType === 5126) values[item][component] = data.getFloat32(offset, true);
        else if (accessor.componentType === 5123) values[item][component] = data.getUint16(offset, true);
        else values[item][component] = data.getUint8(offset);
      }
    }
    this.accessorCache.set(index, values);
    return values;
  }

  nodeMatrix(nodeIndex, tailSwing) {
    const node = this.document.nodes[nodeIndex];
    let local;
    if (node.matrix) {
      local = node.matrix;
    } else {
      const translation = node.translation || [0, 0, 0];
      let rotation = node.rotation || [0, 0, 0, 1];
      if (node.name === "Tail hinge joint") {
        const halfAngle = tailSwing / 2;
        rotation = [0, 0, Math.sin(halfAngle), Math.cos(halfAngle)];
      }
      local = multiplyMatrices(
        translationMatrix(translation),
        multiplyMatrices(rotationMatrix(rotation), scaleMatrix(node.scale || [1, 1, 1])),
      );
    }
    const parent = this.parents.get(nodeIndex);
    return parent === undefined
      ? local
      : multiplyMatrices(this.nodeMatrix(parent, tailSwing), local);
  }

  skinnedPoint(primitive, vertexIndex, meshNodeIndex, nodeMatrices) {
    const position = primitive.positions[vertexIndex];
    if (!primitive.joints || !primitive.weights || !this.skin) {
      return transformPoint(nodeMatrices[meshNodeIndex], position);
    }
    const point = [0, 0, 0];
    const meshInverse = nodeMatrices[meshNodeIndex];
    for (let influence = 0; influence < 4; influence += 1) {
      const weight = primitive.weights[vertexIndex][influence];
      if (weight === 0) continue;
      const joint = this.skin.joints[primitive.joints[vertexIndex][influence]];
      const inverseBind = this.skin.inverseBindMatrices[joint === this.skin.joints[0] ? 0 : 1];
      const skinMatrix = multiplyMatrices(nodeMatrices[joint], this.matrixFromFlat(inverseBind));
      const skinned = transformPoint(skinMatrix, position);
      point[0] += skinned[0] * weight;
      point[1] += skinned[1] * weight;
      point[2] += skinned[2] * weight;
    }
    return transformPoint(meshInverse, point);
  }

  matrixFromFlat(values) {
    return values;
  }

  buildSprite(tailSwing) {
    const nodeMatrices = this.document.nodes.map((_, index) => this.nodeMatrix(index, tailSwing));
    const triangles = [];
    for (const [meshIndex, nodeIndex] of this.nodesByMesh) {
      const node = this.document.nodes[nodeIndex];
      for (const primitive of this.primitives[meshIndex]) {
        for (let i = 0; i < primitive.indices.length; i += 3) {
          const indices = primitive.indices.slice(i, i + 3);
          const points = indices.map((index) => this.skinnedPoint(primitive, index, nodeIndex, nodeMatrices));
          const colors = indices.map((index) => primitive.colors[index]);
          const normals = indices.map((index) => primitive.normals[index]);
          triangles.push({
            points,
            colors,
            normals,
            z: (points[0][2] + points[1][2] + points[2][2]) / 3,
            nodeName: node.name,
          });
        }
      }
    }
    triangles.sort((a, b) => a.z - b.z);

    const sprite = document.createElement("canvas");
    sprite.width = 112;
    sprite.height = 56;
    const ctx = sprite.getContext("2d");
    const scale = 30;
    const light = [-0.33, 0.48, 0.81];
    ctx.save();
    ctx.translate(sprite.width / 2, sprite.height / 2);
    ctx.scale(scale, -scale);
    for (const triangle of triangles) {
      const nx = (triangle.normals[0][0] + triangle.normals[1][0] + triangle.normals[2][0]) / 3;
      const ny = (triangle.normals[0][1] + triangle.normals[1][1] + triangle.normals[2][1]) / 3;
      const nz = (triangle.normals[0][2] + triangle.normals[1][2] + triangle.normals[2][2]) / 3;
      const lightLevel = 0.48 + Math.max(0, dot([nx, ny, nz], light)) * 0.56;
      const color = [0, 1, 2].map((channel) => {
        const vertexColor = triangle.colors.reduce((sum, value) => sum + value[channel], 0) / 3;
        return Math.round(Math.max(0, Math.min(255, vertexColor * lightLevel * 255)));
      });
      ctx.fillStyle = `rgb(${color[0]} ${color[1]} ${color[2]})`;
      ctx.beginPath();
      ctx.moveTo(triangle.points[0][0], triangle.points[0][1]);
      ctx.lineTo(triangle.points[1][0], triangle.points[1][1]);
      ctx.lineTo(triangle.points[2][0], triangle.points[2][1]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return sprite;
  }

  draw(ctx, fish) {
    const swimFrame = Math.round((Math.sin(fish.phase * 3.2) + 1) * 4);
    if (!this.sprites.has(swimFrame)) {
      this.sprites.set(swimFrame, this.buildSprite((swimFrame / 4 - 1) * 0.17));
    }
    ctx.save();
    ctx.translate(fish.x, fish.y + Math.sin(fish.phase) * 1.7);
    ctx.scale(fish.direction * fish.size, fish.size);
    ctx.drawImage(this.sprites.get(swimFrame), -56, -28, 112, 56);
    ctx.restore();
  }
}
