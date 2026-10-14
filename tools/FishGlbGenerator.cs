using System;
using System.Collections.Generic;

public static class FishGlbGenerator
{
    private const float Pi = 3.14159265358979323846f;

    private sealed class Vertex
    {
        public float[] Position;
        public float[] Normal;
        public float[] Color;
        public float[] Weights;
        public ushort[] Joints;
    }

    private sealed class Geometry
    {
        public string Name;
        public int Material;
        public bool Skinned;
        public readonly List<Vertex> Vertices = new List<Vertex>();
        public readonly List<ushort> Indices = new List<ushort>();
    }

    private static readonly List<byte> Binary = new List<byte>();
    private static readonly List<object> BufferViews = new List<object>();
    private static readonly List<object> Accessors = new List<object>();
    private static readonly List<object> Meshes = new List<object>();
    private static readonly List<object> Geometries = new List<object>();

    private static Dictionary<string, object> Dict(params object[] pairs)
    {
        var result = new Dictionary<string, object>();
        for (int i = 0; i < pairs.Length; i += 2)
            result[(string)pairs[i]] = pairs[i + 1];
        return result;
    }

    private static void AlignBinary()
    {
        while ((Binary.Count & 3) != 0) Binary.Add(0);
    }

    private static int AddAccessor(float[] values, int count, string type, int target, float[] min, float[] max)
    {
        AlignBinary();
        int offset = Binary.Count;
        for (int i = 0; i < values.Length; i++) Binary.AddRange(BitConverter.GetBytes(values[i]));
        BufferViews.Add(Dict("buffer", 0, "byteOffset", offset, "byteLength", Binary.Count - offset, "target", target));
        var accessor = Dict("bufferView", BufferViews.Count - 1, "componentType", 5126, "count", count, "type", type);
        if (min != null) accessor["min"] = min;
        if (max != null) accessor["max"] = max;
        Accessors.Add(accessor);
        return Accessors.Count - 1;
    }

    private static int AddUShortAccessor(ushort[] values, int count, string type, int target)
    {
        AlignBinary();
        int offset = Binary.Count;
        for (int i = 0; i < values.Length; i++) Binary.AddRange(BitConverter.GetBytes(values[i]));
        BufferViews.Add(Dict("buffer", 0, "byteOffset", offset, "byteLength", Binary.Count - offset, "target", target));
        Accessors.Add(Dict("bufferView", BufferViews.Count - 1, "componentType", 5123, "count", count, "type", type));
        return Accessors.Count - 1;
    }

    private static int AddFloatScalarAccessor(float[] values)
    {
        AlignBinary();
        int offset = Binary.Count;
        for (int i = 0; i < values.Length; i++) Binary.AddRange(BitConverter.GetBytes(values[i]));
        BufferViews.Add(Dict("buffer", 0, "byteOffset", offset, "byteLength", Binary.Count - offset));
        Accessors.Add(Dict("bufferView", BufferViews.Count - 1, "componentType", 5126, "count", values.Length, "type", "SCALAR"));
        return Accessors.Count - 1;
    }

    private static float Clamp(float x, float low, float high) { return Math.Max(low, Math.Min(high, x)); }

    private static float RadiusAt(float x, float[] profile)
    {
        float startX = -1.28f;
        float step = 2.58f / (profile.Length - 1);
        float t = Clamp((x - startX) / step, 0, profile.Length - 1.001f);
        int index = (int)t;
        float fraction = t - index;
        return profile[index] + (profile[index + 1] - profile[index]) * fraction;
    }

    private static Vertex MakeVertex(float x, float y, float z, float nx, float ny, float nz, float r, float g, float b, bool skin)
    {
        float length = (float)Math.Sqrt(nx * nx + ny * ny + nz * nz);
        nx /= length; ny /= length; nz /= length;
        float tailWeight = skin ? Clamp((-x - 0.72f) / 0.48f, 0, 1) : 0;
        return new Vertex
        {
            Position = new[] { x, y, z },
            Normal = new[] { nx, ny, nz },
            Color = new[] { r, g, b },
            Joints = new ushort[] { 0, 1, 0, 0 },
            Weights = new[] { 1 - tailWeight, tailWeight, 0f, 0f }
        };
    }

    private static void AddTriangle(Geometry geometry, Vertex a, Vertex b, Vertex c)
    {
        ushort start = (ushort)geometry.Vertices.Count;
        geometry.Vertices.Add(a); geometry.Vertices.Add(b); geometry.Vertices.Add(c);
        geometry.Indices.Add(start); geometry.Indices.Add((ushort)(start + 1)); geometry.Indices.Add((ushort)(start + 2));
    }

    private static Vertex FlatVertex(float[] p, float[] color, float[] normal)
    {
        return MakeVertex(p[0], p[1], p[2], normal[0], normal[1], normal[2], color[0], color[1], color[2], false);
    }

    private static Geometry BuildBody()
    {
        var body = new Geometry { Name = "Spotted blue body", Material = 0, Skinned = true };
        float[] profile = { 0.025f, 0.10f, 0.17f, 0.24f, 0.30f, 0.34f, 0.35f, 0.34f, 0.31f, 0.27f, 0.22f, 0.17f, 0.12f, 0.075f, 0.025f };
        const int rings = 29, sides = 16;
        for (int i = 0; i < rings; i++)
        {
            float u = (float)i / (rings - 1);
            float x = -1.28f + u * 2.58f;
            float ry = RadiusAt(x, profile);
            float rz = ry * 0.58f;
            for (int j = 0; j < sides; j++)
            {
                float theta = 2 * Pi * j / sides;
                float cosine = (float)Math.Cos(theta), sine = (float)Math.Sin(theta);
                float top = Clamp(cosine, 0, 1);
                float belly = Clamp(-cosine, 0, 1);
                float r = 0.49f + top * 0.16f + belly * 0.18f;
                float g = 0.73f + top * 0.13f + belly * 0.13f;
                float b = 0.77f + top * 0.10f + belly * 0.12f;
                body.Vertices.Add(MakeVertex(x, cosine * ry, sine * rz, cosine / Math.Max(ry, .02f), sine / Math.Max(rz, .02f), -0.12f * (u - .5f), r, g, b, true));
            }
        }
        for (int i = 0; i < rings - 1; i++)
        {
            for (int j = 0; j < sides; j++)
            {
                ushort a = (ushort)(i * sides + j);
                ushort b = (ushort)(i * sides + (j + 1) % sides);
                ushort c = (ushort)((i + 1) * sides + j);
                ushort d = (ushort)((i + 1) * sides + (j + 1) % sides);
                body.Indices.Add(a); body.Indices.Add(b); body.Indices.Add(c);
                body.Indices.Add(b); body.Indices.Add(d); body.Indices.Add(c);
            }
        }
        return body;
    }

    private static Geometry BuildTail()
    {
        var g = new Geometry { Name = "Forked caudal fin", Material = 1 };
        float[] blue = { .04f, .35f, .90f }, light = { .10f, .66f, .98f };
        float z = .012f;
        float[] root = { -.06f, 0, z }, notch = { -.44f, 0, z };
        float[] upperIn = { -.57f, .21f, z }, upperTip = { -.88f, .55f, z }, upperEdge = { -.69f, .20f, z };
        float[] lowerIn = { -.57f, -.21f, z }, lowerTip = { -.88f, -.55f, z }, lowerEdge = { -.69f, -.20f, z };
        float[] n = { 0, 0, 1 };
        AddTriangle(g, FlatVertex(root, blue, n), FlatVertex(upperIn, light, n), FlatVertex(notch, blue, n));
        AddTriangle(g, FlatVertex(upperIn, light, n), FlatVertex(upperTip, blue, n), FlatVertex(upperEdge, light, n));
        AddTriangle(g, FlatVertex(upperIn, light, n), FlatVertex(upperEdge, light, n), FlatVertex(notch, blue, n));
        AddTriangle(g, FlatVertex(root, blue, n), FlatVertex(notch, blue, n), FlatVertex(lowerIn, light, n));
        AddTriangle(g, FlatVertex(lowerIn, light, n), FlatVertex(lowerEdge, light, n), FlatVertex(lowerTip, blue, n));
        AddTriangle(g, FlatVertex(lowerIn, light, n), FlatVertex(notch, blue, n), FlatVertex(lowerEdge, light, n));
        return g;
    }

    private static Geometry BuildFin(string name, int material, float[][] outline, float z, float[] color)
    {
        var g = new Geometry { Name = name, Material = material };
        float[] n = { 0, 0, z >= 0 ? 1 : -1 };
        for (int i = 1; i < outline.Length - 1; i++)
        {
            var a = new[] { outline[0][0], outline[0][1], z };
            var b = new[] { outline[i][0], outline[i][1], z };
            var c = new[] { outline[i + 1][0], outline[i + 1][1], z };
            AddTriangle(g, FlatVertex(a, color, n), FlatVertex(b, color, n), FlatVertex(c, color, n));
        }
        return g;
    }

    private static Geometry BuildSpots()
    {
        var g = new Geometry { Name = "Iridescent scale flecks", Material = 3 };
        float[] profile = { 0.025f, 0.10f, 0.17f, 0.24f, 0.30f, 0.34f, 0.35f, 0.34f, 0.31f, 0.27f, 0.22f, 0.17f, 0.12f, 0.075f, 0.025f };
        for (int i = 0; i < 96; i++)
        {
            float x = -0.90f + ((i * 37) % 170) / 100f;
            float y = -0.19f + ((i * 61) % 380) / 1000f;
            float ry = RadiusAt(x, profile);
            float rz = ry * 0.58f;
            float side = (i % 5 == 0) ? -1 : 1;
            float surface = rz * (float)Math.Sqrt(Math.Max(.08, 1 - y * y / (ry * ry))) + side * .008f;
            float radius = .007f + (i % 4) * .0015f;
            float[][] palette =
            {
                new[] { .04f, .23f, .43f }, new[] { .10f, .39f, .66f },
                new[] { .02f, .12f, .23f }, new[] { .42f, .73f, .77f }
            };
            float[] color = palette[i % palette.Length];
            var center = new[] { x, y, surface };
            const int points = 5;
            for (int p = 0; p < points; p++)
            {
                float a0 = 2 * Pi * p / points;
                float a1 = 2 * Pi * (p + 1) / points;
                var a = new[] { x + (float)Math.Cos(a0) * radius, y + (float)Math.Sin(a0) * radius, surface };
                var b = new[] { x + (float)Math.Cos(a1) * radius, y + (float)Math.Sin(a1) * radius, surface };
                AddTriangle(g, FlatVertex(center, color, new[] { 0, 0, side }), FlatVertex(a, color, new[] { 0, 0, side }), FlatVertex(b, color, new[] { 0, 0, side }));
            }
        }
        return g;
    }

    private static Geometry BuildEye(float cx, float cy, float cz, float radius, float[] color, string name)
    {
        var g = new Geometry { Name = name, Material = 4 };
        const int rings = 7, sides = 12;
        for (int i = 0; i <= rings; i++)
        {
            float phi = Pi * i / rings;
            for (int j = 0; j <= sides; j++)
            {
                float theta = 2 * Pi * j / sides;
                float nx = (float)(Math.Sin(phi) * Math.Cos(theta));
                float ny = (float)(Math.Cos(phi));
                float nz = (float)(Math.Sin(phi) * Math.Sin(theta));
                g.Vertices.Add(MakeVertex(cx + nx * radius, cy + ny * radius, cz + nz * radius, nx, ny, nz, color[0], color[1], color[2], false));
            }
        }
        for (int i = 0; i < rings; i++)
            for (int j = 0; j < sides; j++)
            {
                ushort a = (ushort)(i * (sides + 1) + j);
                ushort b = (ushort)(a + 1);
                ushort c = (ushort)(a + sides + 1);
                ushort d = (ushort)(c + 1);
                g.Indices.Add(a); g.Indices.Add(b); g.Indices.Add(c);
                g.Indices.Add(b); g.Indices.Add(d); g.Indices.Add(c);
            }
        return g;
    }

    private static Geometry BuildGill()
    {
        var g = new Geometry { Name = "Segmented gill plate", Material = 2 };
        float[] color = { .18f, .45f, .54f };
        for (int line = 0; line < 2; line++)
        {
            for (int i = 0; i < 10; i++)
            {
                float u0 = i / 10f, u1 = (i + 1) / 10f;
                float x0 = .65f + line * .09f + u0 * .08f;
                float x1 = .65f + line * .09f + u1 * .08f;
                float y0 = .22f - (float)Math.Sin(u0 * Pi) * .34f;
                float y1 = .22f - (float)Math.Sin(u1 * Pi) * .34f;
                var a = new[] { x0, y0, .185f }; var b = new[] { x1, y1, .185f };
                var c = new[] { x0 + .009f, y0, .185f }; var d = new[] { x1 + .009f, y1, .185f };
                AddTriangle(g, FlatVertex(a, color, new[] { 0f, 0f, 1f }), FlatVertex(c, color, new[] { 0f, 0f, 1f }), FlatVertex(b, color, new[] { 0f, 0f, 1f }));
                AddTriangle(g, FlatVertex(c, color, new[] { 0f, 0f, 1f }), FlatVertex(d, color, new[] { 0f, 0f, 1f }), FlatVertex(b, color, new[] { 0f, 0f, 1f }));
            }
        }
        return g;
    }

    private static int AddGeometry(Geometry geometry)
    {
        int count = geometry.Vertices.Count;
        var positions = new float[count * 3];
        var normals = new float[count * 3];
        var colors = new float[count * 3];
        var joints = new ushort[count * 4];
        var weights = new float[count * 4];
        float[] min = { float.MaxValue, float.MaxValue, float.MaxValue };
        float[] max = { float.MinValue, float.MinValue, float.MinValue };
        for (int i = 0; i < count; i++)
        {
            Vertex v = geometry.Vertices[i];
            for (int c = 0; c < 3; c++)
            {
                positions[i * 3 + c] = v.Position[c];
                normals[i * 3 + c] = v.Normal[c];
                colors[i * 3 + c] = v.Color[c];
                min[c] = Math.Min(min[c], v.Position[c]);
                max[c] = Math.Max(max[c], v.Position[c]);
            }
            for (int c = 0; c < 4; c++)
            {
                joints[i * 4 + c] = v.Joints[c];
                weights[i * 4 + c] = v.Weights[c];
            }
        }
        int pos = AddAccessor(positions, count, "VEC3", 34962, min, max);
        int normal = AddAccessor(normals, count, "VEC3", 34962, null, null);
        int color = AddAccessor(colors, count, "VEC3", 34962, null, null);
        var attributes = Dict("POSITION", pos, "NORMAL", normal, "COLOR_0", color);
        if (geometry.Skinned)
        {
            attributes["JOINTS_0"] = AddUShortAccessor(joints, count, "VEC4", 34962);
            attributes["WEIGHTS_0"] = AddAccessor(weights, count, "VEC4", 34962, null, null);
        }
        int index = AddUShortAccessor(geometry.Indices.ToArray(), geometry.Indices.Count, "SCALAR", 34963);
        int meshIndex = Meshes.Count;
        Meshes.Add(Dict("name", geometry.Name, "primitives", new object[]
        {
            Dict("attributes", attributes, "indices", index, "material", geometry.Material, "mode", 4)
        }));
        Geometries.Add(geometry.Name);
        return meshIndex;
    }

    private static Dictionary<string, object> Node(string name, int? mesh, int[] children, float[] translation)
    {
        var node = Dict("name", name);
        if (mesh.HasValue) node["mesh"] = mesh.Value;
        if (children != null && children.Length > 0) node["children"] = children;
        if (translation != null) node["translation"] = translation;
        return node;
    }

    public static Dictionary<string, object> Generate()
    {
        Binary.Clear(); BufferViews.Clear(); Accessors.Clear(); Meshes.Clear(); Geometries.Clear();
        int body = AddGeometry(BuildBody());
        int tail = AddGeometry(BuildTail());
        int dorsal = AddGeometry(BuildFin("Dorsal fin", 1, new[]
        {
            new[] { -.38f, .28f }, new[] { .52f, .29f }, new[] { -.03f, .66f },
            new[] { -.20f, .38f }
        }, 0, new[] { .10f, .51f, .79f }));
        int nearPectoral = AddGeometry(BuildFin("Near pectoral fin", 1, new[]
        {
            new[] { .46f, -.05f }, new[] { .97f, -.46f }, new[] { .80f, -.06f }, new[] { .52f, .08f }
        }, .205f, new[] { .13f, .56f, .73f }));
        int farPectoral = AddGeometry(BuildFin("Far pectoral fin", 1, new[]
        {
            new[] { .44f, -.04f }, new[] { .92f, -.40f }, new[] { .78f, -.02f }, new[] { .50f, .09f }
        }, -.19f, new[] { .08f, .39f, .62f }));
        int pelvic = AddGeometry(BuildFin("Pelvic fins", 1, new[]
        {
            new[] { -.36f, -.25f }, new[] { -.10f, -.49f }, new[] { .10f, -.22f }
        }, .03f, new[] { .10f, .44f, .72f }));
        int anal = AddGeometry(BuildFin("Anal fin", 1, new[]
        {
            new[] { -.82f, -.15f }, new[] { -.34f, -.31f }, new[] { -.65f, -.47f }
        }, 0, new[] { .08f, .43f, .73f }));
        int gill = AddGeometry(BuildGill());
        int spots = AddGeometry(BuildSpots());
        int eye = AddGeometry(BuildEye(1.01f, .09f, .185f, .075f, new[] { .98f, .69f, .12f }, "Amber glass eye"));
        int pupil = AddGeometry(BuildEye(1.035f, .095f, .238f, .036f, new[] { .035f, .07f, .09f }, "Eye pupil"));
        int farEye = AddGeometry(BuildEye(1.01f, .09f, -.183f, .071f, new[] { .98f, .69f, .12f }, "Far amber eye"));

        var materials = new object[]
        {
            Dict("name", "Iridescent blue silver scales", "pbrMetallicRoughness", Dict("baseColorFactor", new[] { 1f, 1f, 1f, 1f }, "metallicFactor", .22f, "roughnessFactor", .34f), "doubleSided", true),
            Dict("name", "Electric blue translucent fins", "pbrMetallicRoughness", Dict("baseColorFactor", new[] { .23f, .58f, .88f, 1f }, "metallicFactor", .12f, "roughnessFactor", .4f), "doubleSided", true),
            Dict("name", "Gill grooves", "pbrMetallicRoughness", Dict("baseColorFactor", new[] { .42f, .65f, .68f, 1f }, "metallicFactor", .08f, "roughnessFactor", .48f), "doubleSided", true),
            Dict("name", "Blue and charcoal scale spots", "pbrMetallicRoughness", Dict("baseColorFactor", new[] { .16f, .34f, .45f, 1f }, "metallicFactor", .18f, "roughnessFactor", .45f), "doubleSided", true),
            Dict("name", "Amber eye and dark pupil", "pbrMetallicRoughness", Dict("baseColorFactor", new[] { 1f, .8f, .24f, 1f }, "metallicFactor", .2f, "roughnessFactor", .22f), "doubleSided", true)
        };

        var nodes = new List<object>
        {
            Node("Fiji Trevally - root", null, new[] { 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13 }, null),
            Node("Skin - body", body, null, null),
            Node("Spine root joint", null, new[] { 3 }, null),
            Node("Tail hinge joint", null, new[] { 4 }, new[] { -1.12f, 0f, 0f }),
            Node("Animated forked tail fin", tail, null, null),
            Node("Dorsal fin", dorsal, null, null),
            Node("Near pectoral fin", nearPectoral, null, null),
            Node("Far pectoral fin", farPectoral, null, null),
            Node("Pelvic fins", pelvic, null, null),
            Node("Anal fin", anal, null, null),
            Node("Gill plate segments", gill, null, null),
            Node("Blue scale flecks", spots, null, null),
            Node("Near amber eye", eye, null, null),
            Node("Eye pupil", pupil, null, null),
            Node("Far amber eye", farEye, null, null)
        };
        ((Dictionary<string, object>)nodes[0])["children"] = new[] { 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 };
        ((Dictionary<string, object>)nodes[1])["skin"] = 0;

        int inverseBind = AddAccessor(new[]
        {
            1f,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1,
            1f,0,0,0, 0,1,0,0, 0,0,1,0, 1.12f,0,0,1
        }, 2, "MAT4", 0, null, null);
        var skins = new object[]
        {
            Dict("name", "Body and articulated tail rig", "inverseBindMatrices", inverseBind, "skeleton", 2, "joints", new[] { 2, 3 })
        };
        var times = new[] { 0f, .25f, .5f, .75f, 1f };
        int timeAccessor = AddFloatScalarAccessor(times);
        var rotations = new List<float>();
        float[] swing = { 0f, .16f, 0f, -.16f, 0f };
        for (int i = 0; i < swing.Length; i++)
        {
            rotations.Add(0); rotations.Add(0);
            rotations.Add((float)Math.Sin(swing[i] / 2));
            rotations.Add((float)Math.Cos(swing[i] / 2));
        }
        int rotationAccessor = AddAccessor(rotations.ToArray(), times.Length, "VEC4", 0, null, null);
        var animations = new object[]
        {
            Dict("name", "Gentle tail swimming", "samplers", new object[]
            {
                Dict("input", timeAccessor, "output", rotationAccessor, "interpolation", "LINEAR")
            }, "channels", new object[]
            {
                Dict("sampler", 0, "target", Dict("node", 3, "path", "rotation"))
            })
        };

        return Dict(
            "asset", Dict("version", "2.0", "generator", "Fiji Pig Fishing procedural fish model", "copyright", "Model inspired by the user-provided blue trevally reference image."),
            "scene", 0,
            "scenes", new object[] { Dict("name", "Fiji fishing aquarium", "nodes", new[] { 0 }) },
            "nodes", nodes,
            "meshes", Meshes,
            "materials", materials,
            "skins", skins,
            "animations", animations,
            "accessors", Accessors,
            "bufferViews", BufferViews,
            "buffers", new object[] { Dict("byteLength", Binary.Count) },
            "extras", Dict("species", "Bluefin trevally (Caranx melampygus)", "segments", Geometries)
        );
    }

    public static byte[] GetBinary()
    {
        return Binary.ToArray();
    }
}
